(function initFreemixEvents() {
  let isBound = false;
  let playerPanel = null;
  let arrangementDragSource = null;
  const boundVideoElements = new WeakSet();

  const CONTROL_SELECTOR = "[data-track-control]";
  const RESULT_SELECTOR = ".track-result-button[data-track-id][data-source-id]";
  const DEBUG_ACTION_SELECTOR = "[data-debug-action]";
  const ARRANGEMENT_CLEAR_MENU_SELECTOR = "#arrangementClearMenu";
  const LAUNCH_ACTION_SELECTOR = "[data-launch-action]";
  const TRACK_NAME_LABEL_SELECTOR = "[data-track-name-label][data-track-control]";
  const TRACK_NAME_INPUT_SELECTOR = ".track-row-name-input[data-track-control][data-control='name']";
  const FILE_MENU_SELECTOR = "#fileMenu";
  const FILE_MENU_PANEL_SELECTOR = "#fileMenuPanel";
  const SESSION_FILE_INPUT_SELECTOR = "#sessionFileInput";

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

  function handleArrangementLengthInput(event) {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) {
      return;
    }

    event.target.value = String(Math.min(Math.max(Math.round(value), 1), 64));
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
      if (!transport?.active && arrangement?.enabled && typeof window.freemixSelectArrangementStart === "function") {
        window.freemixSelectArrangementStart();
        return true;
      }

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


    if (id === "arrangementCaptureButton") {
      window.freemixCaptureSelectedArrangementSlots?.();
      return true;
    }

    if (id === "arrangementCopyButton") {
      window.freemixCopySelectedArrangementScene?.();
      return true;
    }

    if (id === "arrangementPasteButton") {
      window.freemixPasteArrangementClipboardToSelectedScene?.();
      return true;
    }

    if (id === "arrangementDeleteButton") {
      window.freemixDeleteSelectedArrangementScene?.();
      return true;
    }

    if (id === "arrangementCopyAllButton") {
      if (typeof window.copyCurrentArrangementSectionToAll === "function") {
        window.copyCurrentArrangementSectionToAll();
      }
      return true;
    }

    if (id === "arrangementControlsButton") {
      window.toggleArrangementControlsMenu?.();
      return true;
    }

    if (id === "arrangementControlsClose") {
      window.closeArrangementControlsMenu?.();
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

  function setFileMenuOpen(isOpen) {
    const menu = document.querySelector(FILE_MENU_SELECTOR);
    const panel = document.querySelector(FILE_MENU_PANEL_SELECTOR);
    const button = document.querySelector("#fileMenuButton");
    if (!menu || !panel || !button) {
      return;
    }

    panel.hidden = !isOpen;
    menu.setAttribute("data-open", String(isOpen));
    button.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      window.freemixRenderRecentSessionMenu?.();
    }
  }

  function handleFileMenuAction(action) {
    setFileMenuOpen(false);
    if (action === "new") {
      window.freemixNewBlankSession?.();
      return true;
    }

    if (action === "save") {
      window.freemixSaveSession?.();
      return true;
    }

    if (action === "save-as") {
      window.freemixSaveSessionAs?.();
      return true;
    }

    if (action === "load") {
      const input = document.querySelector(SESSION_FILE_INPUT_SELECTOR);
      if (input) {
        input.value = "";
        input.click();
      }
      return true;
    }

    return false;
  }

  function handleDocumentFileClick(event) {
    const target = event.target;
    if (!target) {
      return false;
    }

    const menuButton = target.closest("#fileMenuButton");
    if (menuButton) {
      const menu = document.querySelector(FILE_MENU_SELECTOR);
      const isOpen = menu?.getAttribute("data-open") === "true";
      setFileMenuOpen(!isOpen);
      event.preventDefault();
      return true;
    }

    const fileAction = target.closest("[data-file-action]");
    if (fileAction) {
      event.preventDefault();
      return handleFileMenuAction(fileAction.getAttribute("data-file-action"));
    }

    const recentAction = target.closest("[data-file-recent]");
    if (recentAction) {
      event.preventDefault();
      setFileMenuOpen(false);
      window.freemixLoadRecentSession?.(recentAction.getAttribute("data-file-recent"));
      return true;
    }

    const menu = document.querySelector(FILE_MENU_SELECTOR);
    if (menu && !menu.contains(target)) {
      setFileMenuOpen(false);
    }

    return false;
  }

  function onSessionFileChange(event) {
    const file = event.target?.files?.[0];
    if (file) {
      window.freemixLoadSessionFile?.(file);
    }
    event.target.value = "";
  }

  function handleArrangementCellClick(target, event = null) {
    const sceneColorButton = target.closest("[data-arrangement-scene-color]");
    if (sceneColorButton) {
      const colorIndex = Number(sceneColorButton.getAttribute("data-arrangement-scene-color"));
      if (typeof window.setArrangementSceneColor === "function") {
        window.setArrangementSceneColor(arrangement.step, colorIndex);
      }
      return;
    }

    const arrangementCell = target.closest(".arrangement-cell");
    if (arrangementCell) {
      if (arrangementCell.matches("[data-arr-text='true']")) {
        handleArrangementTextCell({
          currentTarget: arrangementCell,
          ctrlKey: !!event?.ctrlKey,
          metaKey: !!event?.metaKey,
        });
        return;
      }

      if (arrangementCell.matches("[data-arr-drums='true']")) {
        handleArrangementDrumCell({
          currentTarget: arrangementCell,
          ctrlKey: !!event?.ctrlKey,
          metaKey: !!event?.metaKey,
        });
        return;
      }

      handleArrangementCell({
        currentTarget: arrangementCell,
        ctrlKey: !!event?.ctrlKey,
        metaKey: !!event?.metaKey,
      });
      return;
    }

    const stepButton = target.closest("[data-arr-step]");
    if (stepButton) {
      handleArrangementStepLabel({ currentTarget: stepButton });
    }
  }

  function getArrangementCellDragTarget(target) {
    const element = target?.closest?.(".arrangement-cell");
    if (!element) {
      return null;
    }

    const trackId = element.matches("[data-arr-text='true']")
      ? "__text"
      : element.matches("[data-arr-drums='true']")
        ? "__drums"
        : element.getAttribute("data-arr-track");
    const step = Number(element.getAttribute("data-arr-step"));
    return trackId && Number.isInteger(step) ? { trackId, step } : null;
  }

  function onArrangementDragStart(event) {
    const source = getArrangementCellDragTarget(event.target);
    if (!source || typeof window.freemixBeginArrangementClipDragCopy !== "function") {
      event.preventDefault();
      return;
    }

    if (!window.freemixBeginArrangementClipDragCopy(source.trackId, source.step)) {
      event.preventDefault();
      return;
    }

    arrangementDragSource = source;
    const payload = JSON.stringify(source);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", payload);
    event.dataTransfer.setData("application/x-freemix-arrangement-clip", payload);
  }

  function onArrangementDragOver(event) {
    const target = getArrangementCellDragTarget(event.target);
    if (!target || typeof window.freemixHoverArrangementClipDragTarget !== "function") {
      return;
    }

    const rawSource =
      event.dataTransfer.getData("application/x-freemix-arrangement-clip") ||
      event.dataTransfer.getData("text/plain");
    let source = arrangementDragSource;
    try {
      source = rawSource ? JSON.parse(rawSource) : source;
    } catch {
      source = arrangementDragSource;
    }

    if (!window.freemixHoverArrangementClipDragTarget(target.trackId, target.step, source?.trackId, source?.step)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onArrangementDrop(event) {
    const target = getArrangementCellDragTarget(event.target);
    const rawSourceStep =
      event.dataTransfer.getData("application/x-freemix-arrangement-clip") ||
      event.dataTransfer.getData("text/plain");
    let source = null;
    try {
      source = rawSourceStep ? JSON.parse(rawSourceStep) : null;
    } catch {
      source = null;
    }

    if (!source?.trackId || !Number.isInteger(Number(source.step)) || !target) {
      arrangementDragSource = null;
      window.freemixClearArrangementDragState?.();
      return;
    }

    event.preventDefault();
    window.freemixDropArrangementClipDragCopy?.(source.trackId, Number(source.step), target.trackId, target.step);
    arrangementDragSource = null;
  }

  function onArrangementDragEnd() {
    arrangementDragSource = null;
    window.freemixClearArrangementDragState?.();
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

    const textAction = target.closest("[data-text-action]");
    if (textAction) {
      handleTextAction(textAction.getAttribute("data-text-action"));
      return;
    }

    const textButton = target.closest("[data-text-control]");
    if (textButton && textButton.matches("button")) {
      handleTextControl({ type: "change", currentTarget: textButton, target: textButton });
      return;
    }

    const drumAction = target.closest("[data-drum-action]");
    if (drumAction) {
      handleDrumAction(drumAction.getAttribute("data-drum-action"));
      return;
    }

    const drumButton = target.closest("[data-drum-control]");
    if (drumButton && drumButton.matches("button")) {
      handleDrumControl({ type: "change", currentTarget: drumButton, target: drumButton });
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

      handleArrangementCellClick(transportButton, event);
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

    const textControl = control.closest("[data-text-control]");
    if (textControl) {
      handleTextControl({ type: event.type, target: textControl, currentTarget: textControl });
      return;
    }

    const drumControl = control.closest("[data-drum-control]");
    if (drumControl) {
      handleDrumControl({ type: event.type, target: drumControl, currentTarget: drumControl });
      return;
    }

    if (control.id === "bpmInput") {
      handleBpmInput(event);
      window.freemixRender?.updateTransportRow?.();
      return;
    }

    if (control.id === "arrangementStepsSelect") {
      handleArrangementLengthInput(event);
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
      return;
    }

    const textControl = control.closest("[data-text-control]");
    if (textControl) {
      handleTextControl({ type: event.type, target: textControl, currentTarget: textControl });
      return;
    }

    const drumControl = control.closest("[data-drum-control]");
    if (drumControl) {
      handleDrumControl({ type: event.type, target: drumControl, currentTarget: drumControl });
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
      video.addEventListener("loadedmetadata", () => {
        updateTrackDuration(video);
        const trackId = video.id.replace("video-", "");
        window.freemixSetTrackMediaStatus?.(trackId, "ready", {
          statusMessage: `${window.freemixGetTrackById?.(trackId)?.name || "Track"}: ready`,
        });
      });
      video.addEventListener("error", (event) => {
        const sourceError = event?.target?.error;
        const code = Number(sourceError?.code);
        const message = sourceError?.message || (Number.isFinite(code) ? `code ${code}` : "unknown");
        const trackId = video.id.replace("video-", "");
        if (window.freemixRecoverMediaPlaybackError?.(trackId, video)) {
          return;
        }
        window.freemixSetTrackMediaStatus?.(trackId, "failed");
        setStatus(`Media error: ${message}`, true);
      });
      video.muted = false;
      video.volume = 1;
    });
  }

  function onKeydown(event) {
    const editableTarget = event.target.closest("input, textarea, select, [contenteditable='true']");
    const textEditorTarget = event.target.closest?.("[data-text-editor='true'], [data-drum-editor='true']");
    const isClipboardShortcut = (event.ctrlKey || event.metaKey)
      && (event.key.toLowerCase() === "c" || event.key.toLowerCase() === "v");
    const shouldHandleClipClipboard = !editableTarget || (textEditorTarget && isClipboardShortcut);

    if (!editableTarget && event.code === "Space") {
      event.preventDefault();
      if (transport?.active) {
        stopTransport();
      } else {
        startTransport();
      }
      return;
    }

    if (!editableTarget && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      window.freemixSelectAdjacentArrangementStep?.(event.key === "ArrowRight" ? 1 : -1);
      return;
    }

    if (!editableTarget && (event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault();
      window.freemixDeleteSelectedArrangementScene?.();
      return;
    }

    if (shouldHandleClipClipboard && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      const handled = window.freemixCopySelectedArrangementScene?.();
      if (handled || !editableTarget) {
        event.preventDefault();
      }
      return;
    }

    if (shouldHandleClipClipboard && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
      const handled = window.freemixPasteArrangementClipboardToSelectedScene?.();
      if (handled || !editableTarget) {
        event.preventDefault();
      }
      return;
    }

    if (!editableTarget && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        window.freemixRedoArrangementEdit?.();
      } else {
        window.freemixUndoArrangementEdit?.();
      }
      return;
    }

    if (!editableTarget && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      window.freemixRedoArrangementEdit?.();
      return;
    }

    if (!editableTarget && event.ctrlKey && event.altKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      window.freemixToggleDebugPanel?.();
      return;
    }

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

  function onDocumentKeydown(event) {
    if (event.defaultPrevented) {
      return;
    }

    const editableTarget = event.target.closest?.("input, textarea, select, [contenteditable='true']");
    const textEditorTarget = event.target.closest?.("[data-text-editor='true'], [data-drum-editor='true']");
    if (textEditorTarget && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      const handled = window.freemixCopySelectedArrangementScene?.();
      if (handled || !editableTarget) {
        event.preventDefault();
      }
      return;
    }

    if (textEditorTarget && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
      const handled = window.freemixPasteArrangementClipboardToSelectedScene?.();
      if (handled || !editableTarget) {
        event.preventDefault();
      }
      return;
    }

    if (!editableTarget && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      window.freemixCopySelectedArrangementScene?.();
      return;
    }

    if (!editableTarget && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
      event.preventDefault();
      window.freemixPasteArrangementClipboardToSelectedScene?.();
      return;
    }

    if (!editableTarget && event.ctrlKey && event.altKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      window.freemixToggleDebugPanel?.();
    }
  }

  function onDocumentKeydownCapture(event) {
    const editableTarget = event.target.closest?.("input, textarea, select, [contenteditable='true']");
    const textEditorTarget = event.target.closest?.("[data-text-editor='true'], [data-drum-editor='true']");
    if (!textEditorTarget || !(event.ctrlKey || event.metaKey)) {
      return;
    }

    if (event.key.toLowerCase() === "c") {
      const handled = window.freemixCopySelectedArrangementScene?.();
      if (handled || !editableTarget) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (event.key.toLowerCase() === "v") {
      const handled = window.freemixPasteArrangementClipboardToSelectedScene?.();
      if (handled || !editableTarget) {
        event.preventDefault();
        event.stopPropagation();
      }
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
      playerPanel.addEventListener("dragstart", onArrangementDragStart);
      playerPanel.addEventListener("dragover", onArrangementDragOver);
      playerPanel.addEventListener("drop", onArrangementDrop);
      playerPanel.addEventListener("dragend", onArrangementDragEnd);

      document.addEventListener("click", (event) => {
        if (handleDocumentFileClick(event)) {
          return;
        }

        if (!event.target.closest(".track-source")) {
          clearResults();
        }
      });
      document.addEventListener("keydown", onDocumentKeydownCapture, true);
      document.addEventListener("keydown", onDocumentKeydown);

      document.querySelector(SESSION_FILE_INPUT_SELECTOR)?.addEventListener("change", onSessionFileChange);

      isBound = true;
    }

    bindTrackVideos();
  }

  window.freemixBindWorkstationControls = bind;

  bind();
})();


