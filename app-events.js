(function initFreemixEvents() {
  let isBound = false;
  let playerPanel = null;

  const CONTROL_SELECTOR = "[data-track-control]";
  const RESULT_SELECTOR = ".track-result-button[data-track-id][data-source-id]";
  const DEBUG_ACTION_SELECTOR = "[data-debug-action]";
  const ARRANGEMENT_CLEAR_MENU_SELECTOR = "#arrangementClearMenu";

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
    tracks.forEach((track) => renderTrackResults(track, []));
  }

  function handleBpmInput(event) {
    const nextBpm = clamp(Number(event.target.value), 40, 220);
    appState.preferredBpm = Number.isFinite(nextBpm) ? nextBpm : resolvePreferredBpm();
    window.freemixRender?.updateTransportRow?.();

    if (!transport) {
      return;
    }

    transport.bpm = resolvePreferredBpm();
    const now = performance.now();
    transport.nextBeatAt = now;
    transport.beatIndex = 0;
    if (arrangement.enabled && hasArrangementClips()) {
      updateArrangementStep(arrangement.step, now, true);
    } else {
      updateTrackTriggerGrid(now);
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
      masterMuted = !masterMuted;
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

    if (id === "arrangementCopyAllButton") {
      if (typeof window.copyCurrentArrangementSectionToAll === "function") {
        window.copyCurrentArrangementSectionToAll();
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

    const trackControl = control.closest(CONTROL_SELECTOR);
    if (trackControl) {
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

    if (control.id === "arrangementStepsSelect") {
      handleArrangementLengthChange(event);
      return;
    }

    const trackControl = control.closest(CONTROL_SELECTOR);
    if (trackControl) {
      if (typeof window.freemixQueueTrackControlUpdate === "function") {
        window.freemixQueueTrackControlUpdate(trackControl, event.type);
        return;
      }

      handleTrackControl({ type: event.type, target: trackControl, currentTarget: trackControl });
    }
  }

  function onKeydown(event) {
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

  function bind() {
    if (isBound) {
      return;
    }

    playerPanel = document.querySelector("#playerPanel");
    if (!playerPanel) {
      return;
    }

    playerPanel.addEventListener("click", onClick);
    playerPanel.addEventListener("input", onInput);
    playerPanel.addEventListener("change", onChange);
    playerPanel.addEventListener("keydown", onKeydown);

    playerPanel.querySelectorAll(".track-video").forEach((video) => {
      if (video.dataset.binding === "true") {
        return;
      }

      video.dataset.binding = "true";
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

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".track-source")) {
        clearResults();
      }
    });

    isBound = true;
  }

  window.freemixBindWorkstationControls = bind;

  bind();
})();
