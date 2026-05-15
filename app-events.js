(function initFreemixEvents() {
  let isBound = false;
  let playerPanel = null;
  const boundVideoElements = new WeakSet();

  const CONTROL_SELECTOR = "[data-track-control]";
  const RESULT_SELECTOR = ".track-result-button[data-track-id][data-source-id]";
  const DEBUG_ACTION_SELECTOR = "[data-debug-action]";
  const ARRANGEMENT_CLEAR_MENU_SELECTOR = "#arrangementClearMenu";
  const LAUNCH_ACTION_SELECTOR = "[data-launch-action]";
  const TRACK_NAME_LABEL_SELECTOR = "[data-track-name-label][data-track-control]";
  const TRACK_NAME_INPUT_SELECTOR = ".track-row-name-input[data-track-control][data-control='name']";

  function getTrackFromControl(control) {
    if (!control) {
      return null;
    }

    return typeof window.freemixGetTrackById === "function"
      ? window.freemixGetTrackById(control.dataset.trackControl)
      : tracks.find((track) => track.id === control.dataset.trackControl);
  }

  function getResultTrack(trackId) {
    if (!trackId) {
      return null;
    }

    return typeof window.freemixGetTrackById === "function"
      ? window.freemixGetTrackById(trackId)
      : tracks.find((track) => track.id === trackId);
  }

  function findCachedResult(trackId, sourceId) {
    const trackCache = window.freemixTrackSourceCache?.[trackId];
    if (!trackCache) {
      return null;
    }

    return trackCache[sourceId] || null;
  }

  function getArrangementClearMenu() {
    return playerPanel?.querySelector(ARRANGEMENT_CLEAR_MENU_SELECTOR) || null;
  }

  function clearResults() {
    if (!playerPanel) {
      return;
    }

    const visibleResultPanels = playerPanel.querySelectorAll(".track-results:not([hidden])");
    if (visibleResultPanels.length === 0) {
      return;
    }

    visibleResultPanels.forEach((resultsEl) => {
      const trackId = resultsEl.id?.startsWith("results-") ? resultsEl.id.slice(8) : "";
      const track = trackId ? getResultTrack(trackId) : null;
      if (track) {
        renderTrackResults(track, []);
        return;
      }

      resultsEl.hidden = true;
      resultsEl.innerHTML = "";
    });
  }

  function consumeLaunchHint() {
    if (typeof window.clearGuidanceHint === "function") {
      window.clearGuidanceHint();
    }
  }

  function handleBpmInput(event) {
    const nextBpm = clamp(Number(event.target.value), 40, 220);
    appState.preferredBpm = Number.isFinite(nextBpm) ? nextBpm : resolvePreferredBpm();
    window.freemixRender?.updateTransportRow?.();
  if (typeof window.freemixSyncTransportTiming === "function") {
    window.freemixSyncTransportTiming({
      bpm: appState.preferredBpm,
    });
    return;
  }

  markAppStateDirty();

  if (!transport) {
    return;
  }

  const safeSignature =
    typeof resolvePreferredTimeSignature === "function"
      ? resolvePreferredTimeSignature(appState.preferredTimeSignature)
      : {
          value: "4/4",
          beatsPerBar: 4,
          noteValue: 4,
          numerator: 4,
          denominator: 4,
        };
  const nextTiming =
    typeof getTransportTimingFromState === "function"
      ? getTransportTimingFromState(appState.preferredBpm, appState.preferredTimeSignature)
      : {
          bpm: resolvePreferredBpm(),
          beatMs: (60000 / resolvePreferredBpm()) * (4 / safeSignature.noteValue),
          barMs: (60000 / resolvePreferredBpm()) * (4 / safeSignature.noteValue) * safeSignature.beatsPerBar,
          beatsPerBar: safeSignature.beatsPerBar,
          timeSignature: safeSignature.value,
          numerator: safeSignature.numerator,
          denominator: safeSignature.denominator,
          noteValue: safeSignature.noteValue,
        };

  transport.bpm = nextTiming.bpm;
  transport.beatMs = nextTiming.beatMs;
  transport.barMs = nextTiming.barMs;
  transport.beatsPerBar = nextTiming.beatsPerBar;
  transport.timeSignature = nextTiming.timeSignature || appState.preferredTimeSignature || DEFAULT_TIME_SIGNATURE;
  transport.timeSignatureNumerator = nextTiming.numerator || resolvePreferredTimeSignature().numerator;
  transport.timeSignatureDenominator = nextTiming.denominator || resolvePreferredTimeSignature().denominator;
  transport.timeSignatureNoteValue = nextTiming.noteValue || resolvePreferredTimeSignature().noteValue;
  const now = performance.now();
  transport.nextBeatAt = now;
  transport.beatIndex = 0;
    if (arrangement.enabled && hasArrangementClips()) {
      updateArrangementStep(arrangement.step, now, true);
    } else {
      updateTrackTriggerGrid(now);
    }
  }

  function handleTimeSignatureChange(event) {
    const nextTimeSignature = event.target.value;
    appState.preferredTimeSignature = nextTimeSignature;
    window.freemixRender?.updateTransportRow?.();
    markAppStateDirty();
    if (typeof window.freemixSyncTransportTiming === "function") {
      window.freemixSyncTransportTiming({
        timeSignature: nextTimeSignature,
      });
      return;
    }

    if (!transport) {
      return;
    }

    const nextBeatAt = performance.now();
    transport.nextBeatAt = nextBeatAt;
    transport.beatIndex = 0;
    if (arrangement.enabled && hasArrangementClips()) {
      updateArrangementStep(arrangement.step, nextBeatAt, true);
    } else {
      updateTrackTriggerGrid(nextBeatAt);
    }
  }

  function handleArrangementLengthChange(event) {
    updateArrangementStepCount(event);
  }

  function handleTransportClick(target) {
    const id = target?.getAttribute?.("id");
    if (!id) {
      return;
    }

    if (id === "playButton") {
      startTransport();
      return true;
    }

    if (id === "stopButton") {
      stopTransport();
      return true;
    }

    if (id === "metroButton") {
      metronomeEnabled = !metronomeEnabled;
      window.freemixRender?.updateTransportRow?.();
      return true;
    }

    if (id === "arrangementToggle") {
      toggleArrangement();
      return true;
    }

    if (id === "arrangementClear") {
      if (typeof window.openArrangementClearMenu === "function") {
        window.openArrangementClearMenu();
      } else {
        clearArrangement();
      }
      return true;
    }

    if (id === "arrangementCopyButton") {
      toggleArrangementCopyMode();
      return true;
    }

    if (id === "arrangementDeleteButton") {
      toggleArrangementDeleteMode();
      return true;
    }

    if (id === "arrangementCopyAllButton") {
      if (typeof window.copyCurrentArrangementSectionToAll === "function") {
        window.copyCurrentArrangementSectionToAll();
      }
      return true;
    }

    if (id === "exportClipButton") {
      if (typeof window.freemixExportClip === "function") {
        window.freemixExportClip();
      }
      return true;
    }

    if (id === "exportArrangementButton") {
      if (typeof window.freemixExportArrangement === "function") {
        window.freemixExportArrangement();
      }
      return true;
    }

    if (id === "addTrackButton") {
      if (typeof window.addTrack === "function") {
        window.addTrack();
      }
      return true;
    }

    return false;
  }

  function handleArrangementCellClick(target) {
    const arrangementCell = target.closest(".arrangement-cell");
    if (arrangementCell) {
      handleArrangementCell({ currentTarget: arrangementCell });
      return;
    }

    const stepButton = target.closest("[data-arr-step]");
    if (stepButton) {
      handleArrangementStepLabel({ currentTarget: stepButton });
    }
  }

  function handleSearchResultClick(target) {
    consumeLaunchHint();
    const trackId = target.getAttribute("data-track-id");
    const sourceId = target.getAttribute("data-source-id");

    const track = getResultTrack(trackId);
    const result = findCachedResult(trackId, sourceId);
    if (!track || !result) {
      return;
    }

    loadTrackSource(track, result);
    clearResults();
  }

  function onClick(event) {
    const target = event.target;
    if (!target) {
      return;
    }

    consumeLaunchHint();

    const trackNameLabel = target.closest(TRACK_NAME_LABEL_SELECTOR);
    if (trackNameLabel) {
      beginTrackNameEdit(trackNameLabel);
      return;
    }

    const launchAction = target.closest(LAUNCH_ACTION_SELECTOR);
    if (launchAction) {
      const action = launchAction.getAttribute("data-launch-action");
      if (action && typeof window.freemixHandleLaunchPadAction === "function") {
        window.freemixHandleLaunchPadAction(action);
      }
      return;
    }

    const debugButton = target.closest(DEBUG_ACTION_SELECTOR);
    if (debugButton && window.freemixDebugEnabled) {
      const action = debugButton.getAttribute("data-debug-action");
      if (typeof window.performDebugAction === "function") {
        window.performDebugAction(action);
      }
      return;
    }

    const control = target.closest(CONTROL_SELECTOR);
    if (control && control.matches("button")) {
      handleTrackControl({ currentTarget: control, target: control });
      return;
    }

    const clearAction = target.closest(".arrangement-clear-action");
    if (clearAction) {
      const menu = getArrangementClearMenu();
      if (!menu || !menu.contains(clearAction)) {
        return;
      }

      const mode = clearAction.getAttribute("data-arrangement-clear");

      if (mode === "confirm") {
        if (typeof window.confirmClearArrangement === "function") {
          window.confirmClearArrangement();
        } else {
          clearArrangement();
        }
      } else if (typeof window.closeArrangementClearMenu === "function") {
        window.closeArrangementClearMenu();
      }

      if (menu) {
        return;
      }
    }

    const clearMenu = getArrangementClearMenu();
    if (window.isArrangementClearMenuOpen?.() && clearMenu && !clearMenu.contains(target)) {
      window.closeArrangementClearMenu();
    }

    if (target.closest(RESULT_SELECTOR)) {
      handleSearchResultClick(target.closest(RESULT_SELECTOR));
      return;
    }

    const transportButton = target.closest("button");
    if (transportButton) {
      if (handleTransportClick(transportButton)) {
        return true;
      }

      handleArrangementCellClick(transportButton);
      return;
    }
    return false;
  }

  function onInput(event) {
    const control = event.target;
    if (!control) {
      return;
    }

    consumeLaunchHint();

    const trackControl = control.closest(CONTROL_SELECTOR);
    if (trackControl) {
      if (trackControl.dataset?.control === "name") {
        return;
      }

      if (typeof window.freemixQueueTrackControlUpdate === "function") {
        window.freemixQueueTrackControlUpdate(trackControl, event.type);
        return;
      }

      handleTrackControl({ type: event.type, target: trackControl, currentTarget: trackControl });
      return;
    }

    if (control.id === "bpmInput") {
      handleBpmInput(event);
      window.freemixRender?.updateTransportRow?.();
    }
  }

  function onChange(event) {
    const control = event.target;
    if (!control) {
      return;
    }

    consumeLaunchHint();

    if (control.id === "arrangementStepsSelect") {
      handleArrangementLengthChange(event);
      return;
    }
    if (control.id === "timeSignatureSelect") {
      handleTimeSignatureChange(event);
      return;
    }

    const trackControl = control.closest(CONTROL_SELECTOR);
    if (trackControl) {
      if (trackControl.dataset?.control === "name") {
        return;
      }

      if (typeof window.freemixQueueTrackControlUpdate === "function") {
        window.freemixQueueTrackControlUpdate(trackControl, event.type);
        return;
      }

      handleTrackControl({ type: event.type, target: trackControl, currentTarget: trackControl });
    }
  }

  function bindTrackVideos() {
    if (!playerPanel) {
      return;
    }

    playerPanel.querySelectorAll(".track-video").forEach((video) => {
      if (boundVideoElements.has(video)) {
        return;
      }

      boundVideoElements.add(video);
      video.addEventListener("loadedmetadata", () => updateTrackDuration(video));
      video.addEventListener("error", (event) => {
        const sourceError = event?.target?.error;
        const code = Number(sourceError?.code);
        const message = sourceError?.message || (Number.isFinite(code) ? `code ${code}` : "unknown");
        setStatus(`Media error: ${message}`, true);
      });
      video.muted = false;
      video.volume = 1;
    });
  }

  function onKeydown(event) {
    const activeInput = event.target.closest(TRACK_NAME_INPUT_SELECTOR);
    if (activeInput) {
      if (event.key === "Enter") {
        event.preventDefault();
        finishTrackNameEdit(activeInput, true);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        finishTrackNameEdit(activeInput, false);
        return;
      }

      return;
    }

    const trackNameLabel = event.target.closest(TRACK_NAME_LABEL_SELECTOR);
    if (trackNameLabel && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      beginTrackNameEdit(trackNameLabel);
      return;
    }

    if (event.key !== "Escape") {
      return;
    }

    const control = event.target.closest(CONTROL_SELECTOR);
    if (control) {
      const track = getTrackFromControl(control);
      if (track) {
        renderTrackResults(track, []);
      }
      return;
    }
  }

  function finishTrackNameEdit(nameInput, shouldSave) {
    if (!nameInput) {
      return;
    }

    const controlTrackId = nameInput.dataset?.trackControl;
    if (!controlTrackId) {
      return;
    }

    const track = getTrackFromControl(nameInput);
    if (!track) {
      return;
    }

    const trackRow = nameInput.closest(".track-row");
    const trackNameLabel = trackRow
      ? trackRow.querySelector(`.track-row-name[data-track-control="${controlTrackId}"]`)
      : null;
    const nameToSave = String(nameInput.value || "").trim();

    if (!nameToSave || !shouldSave) {
      if (trackNameLabel) {
        nameInput.value = track.name || trackNameLabel.textContent.trim();
      }
    } else if (typeof window.freemixRenameTrack === "function") {
      window.freemixRenameTrack(controlTrackId, nameToSave);
    }

    nameInput.hidden = true;
    if (trackNameLabel) {
      trackNameLabel.hidden = false;
      if (trackNameLabel.textContent !== track.name) {
        trackNameLabel.textContent = track.name;
      }
      trackNameLabel.setAttribute("title", track.name);
    }
  }

  function onFocusOut(event) {
    const nameInput = event.target.closest(TRACK_NAME_INPUT_SELECTOR);
    if (!nameInput) {
      return;
    }

    finishTrackNameEdit(nameInput, true);
  }

  function beginTrackNameEdit(label) {
    if (!label || !(label instanceof HTMLElement)) {
      return;
    }

    const trackId = label.getAttribute("data-track-control");
    const track = trackId ? getTrackFromControl({ dataset: { trackControl: trackId } }) : null;
    if (!track) {
      return;
    }

    const trackRow = label.closest(".track-row");
    const trackInput = trackRow
      ? trackRow.querySelector(`.track-row-name-input[data-track-control="${trackId}"]`)
      : null;

    if (!(trackInput instanceof HTMLInputElement)) {
      return;
    }

    label.hidden = true;
    trackInput.hidden = false;
    trackInput.value = track.name;
    trackInput.focus();
    trackInput.select();
  }

  function bind() {
    playerPanel = document.querySelector("#playerPanel");
    if (!playerPanel) {
      return;
    }

    if (!isBound) {
      playerPanel.addEventListener("click", onClick);
      playerPanel.addEventListener("input", onInput);
      playerPanel.addEventListener("change", onChange);
      playerPanel.addEventListener("keydown", onKeydown);
      playerPanel.addEventListener("focusout", onFocusOut);

      document.addEventListener("click", (event) => {
        if (!event.target.closest(".track-source")) {
          clearResults();
        }
      });

      isBound = true;
    }

    bindTrackVideos();
  }

  window.freemixBindWorkstationControls = bind;

  bind();
})();
