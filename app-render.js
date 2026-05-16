(function initFreemixRender() {
  function updateStatus(message, isError = false) {
    const statusNode = document.querySelector("#statusPill");
    if (!statusNode) {
      return;
    }

    statusNode.textContent = message;
    statusNode.classList.toggle("error", isError);
  }

  function updateTransportRow() {
    const player = document.querySelector("#playerPanel");
    if (!player) {
      return;
    }

    const playButton = player.querySelector("#playButton");
    const metroButton = player.querySelector("#metroButton");
    const arrangementToggle = player.querySelector("#arrangementToggle");
    const arrangementDeleteButton = player.querySelector("#arrangementDeleteButton");
    const arrangementLengthSelect = player.querySelector("#arrangementStepsSelect");
    const selectedTargetLabel = player.querySelector("#selectedTargetLabel");
    const timeSignatureSelect = player.querySelector("#timeSignatureSelect");
    const bpmInput = player.querySelector("#bpmInput");
    const meter = player.querySelector(".meter");
    const exportClipButton = player.querySelector("#exportClipButton");
    const exportArrangementButton = player.querySelector("#exportArrangementButton");
    const isExporting = typeof window.freemixIsExportingVideo === "function" ? window.freemixIsExportingVideo() : false;
    const hasSources = tracks.some((track) => track?.source);

    if (playButton) {
      playButton.classList.toggle("active", !!transport?.active);
      playButton.disabled = isExporting;
      playButton.title = "Start transport";
    }

    if (metroButton) {
      metroButton.classList.toggle("active", !!metronomeEnabled);
      metroButton.disabled = isExporting;
    }

    if (arrangementToggle) {
      arrangementToggle.textContent = arrangement.enabled ? "On" : "Off";
      arrangementToggle.classList.toggle("active", arrangement.enabled);
      arrangementToggle.setAttribute("aria-pressed", String(arrangement.enabled));
    }

    if (arrangementDeleteButton) {
      arrangementDeleteButton.textContent = arrangementDeleteMode ? "Deleting" : "Delete";
      arrangementDeleteButton.classList.toggle("active", !!arrangementDeleteMode);
      arrangementDeleteButton.setAttribute("aria-pressed", String(!!arrangementDeleteMode));
      arrangementDeleteButton.title = arrangementDeleteMode
        ? "Delete mode; click filled cells or scenes to remove them"
        : "Delete scene clips";
    }

    if (arrangementLengthSelect) {
      arrangementLengthSelect.value = String(arrangementStepCount);
    }
    if (selectedTargetLabel) {
      selectedTargetLabel.textContent =
        typeof window.freemixGetSelectedEditTargetLabel === "function"
          ? window.freemixGetSelectedEditTargetLabel()
          : "Editing live tracks";
    }
    if (timeSignatureSelect) {
      timeSignatureSelect.value = resolvePreferredTimeSignature().value;
    }

    if (exportClipButton) {
      exportClipButton.disabled = isExporting || !hasSources;
      exportClipButton.textContent = isExporting ? "Exporting..." : "Export Clip";
      exportClipButton.title = hasSources ? "Export one bar as video" : "Load a source before exporting";
    }

    if (exportArrangementButton) {
      const canExportArrangement = isExporting ? false : hasArrangementClips();
      exportArrangementButton.disabled = !canExportArrangement;
      exportArrangementButton.textContent = isExporting ? "Exporting..." : "Export Arrangement";
      exportArrangementButton.title = canExportArrangement
        ? "Export full arrangement as video"
        : "Add clips to arrangement before exporting";
    }

    if (bpmInput && transport?.bpm) {
      bpmInput.value = String(transport.bpm);
    }

    if (meter) {
      const beats = getTransportBeatsPerBar(transport);
      const targetCount = Math.max(1, Math.floor(Number(beats) || 1));
      meter.style.setProperty("--beat-count", String(targetCount));
      const currentLights = meter.querySelectorAll(".beat-light");
      if (currentLights.length !== targetCount) {
        meter.innerHTML = Array.from({ length: targetCount }, (_, index) => `<span class="beat-light" data-beat="${index}"></span>`).join(
          "",
        );
        if (typeof window.freemixInvalidateUiNodeCache === "function") {
          window.freemixInvalidateUiNodeCache();
        }
      }
    }
  }

  function updateTrackRow(track) {
    const player = document.querySelector("#playerPanel");
    if (!player || !track?.id) {
      return;
    }

    const trackIndex = tracks.findIndex((item) => item.id === track.id);
    const trackRow = player.querySelector(`article.track-row[data-track-row-id="${track.id}"]`);
    if (trackRow) {
      trackRow.outerHTML = renderTrackControlRow(track);
    }

    const trackCell = player.querySelector(`.video-cell[data-track-id="${track.id}"]`);
    if (trackCell) {
      trackCell.outerHTML = renderVideoCell(track, Math.max(trackIndex, 0));
    }

    if (typeof window.applyTrackControlVisibility === "function") {
      window.applyTrackControlVisibility(track);
    }

    window.freemixSyncArrangementTrackHeights?.();
  }

  function updateArrangementCell(track, stepIndex) {
    if (!track?.id || !Number.isInteger(stepIndex)) {
      return;
    }

    const player = document.querySelector("#playerPanel");
    if (!player) {
      return;
    }

    const cell = player.querySelector(
      `.arrangement-cell[data-arr-track="${track.id}"][data-arr-step="${stepIndex}"]`,
    );
    if (!cell) {
      return;
    }

    const clip = arrangement.clips?.[stepIndex]?.[track.id];
    const isFilled = !!clip;
    const densityCount =
      isFilled && typeof normalizeRetriggersPerBar === "function"
        ? normalizeRetriggersPerBar(clip.retriggersPerBar)
        : 1;
    const sceneColor = typeof window.freemixGetArrangementSceneColor === "function"
      ? window.freemixGetArrangementSceneColor(stepIndex, clip)
      : "";
    if (sceneColor) {
      cell.style.setProperty("--scene-track-color", sceneColor);
    } else {
      cell.style.removeProperty("--scene-track-color");
    }
    if (isFilled && densityCount > 1) {
      cell.style.setProperty("--clip-density-count", String(densityCount));
    } else {
      cell.style.removeProperty("--clip-density-count");
    }
    cell.classList.toggle("filled", isFilled);
    cell.classList.toggle("has-density-bars", isFilled && densityCount > 1);
    cell.classList.toggle(
      "selected",
      typeof isArrangementClipSelected === "function" && isArrangementClipSelected(track.id, stepIndex),
    );
    cell.textContent = isFilled ? "x" : "";
    const canDragCopy = isFilled;
    cell.draggable = canDragCopy;
    cell.title = arrangementDeleteMode
      ? isFilled
        ? `Delete ${track.name || "Track"} from scene ${stepIndex + 1}`
        : `Scene ${stepIndex + 1} has no ${track.name || "track"} clip`
      : isFilled
        ? `${track.name || "Track"} scene ${stepIndex + 1}; click to edit, drag to copy`
        : `Capture ${track.name || "track"} into scene ${stepIndex + 1}`;
    cell.classList.toggle("playing", !!transport?.active && arrangement.step === stepIndex);
  }

  function updateArrangementGrid() {
    if (typeof window.freemixInvalidateUiNodeCache === "function") {
      window.freemixInvalidateUiNodeCache();
    }

    const labels = document.querySelector(".arrangement-step-labels");
    if (labels) {
      labels.style.setProperty("--arrangement-steps", arrangementStepCount);
      labels.innerHTML = typeof window.renderArrangementStepLabels === "function"
        ? window.renderArrangementStepLabels()
        : "";
    }
    updateArrangementSceneColorSelector();

    const arrangementGrid = document.querySelector(".arrangement-grid");
    if (arrangementGrid) {
      const rows = typeof window.renderArrangementGridRows === "function" ? window.renderArrangementGridRows() : null;
      arrangementGrid.style.setProperty("--arrangement-steps", arrangementStepCount);
      if (rows !== null) {
        arrangementGrid.innerHTML = rows;
        window.freemixSyncArrangementTrackHeights?.();
        return;
      }

      if (typeof window.renderArrangementGrid === "function") {
        const renderGrid = window.renderArrangementGrid();
        if (renderGrid) {
          arrangementGrid.outerHTML = renderGrid;
          window.freemixSyncArrangementTrackHeights?.();
          return;
        }
      }
    }

    if (typeof renderWorkstation === "function") {
      renderWorkstation();
      window.freemixSyncArrangementTrackHeights?.();
    }
  }

  function updateArrangementStepLabels() {
    if (typeof window.renderArrangementStepLabels !== "function") {
      return;
    }

    const labels = document.querySelector(".arrangement-step-labels");
    if (!labels) {
      return;
    }

    labels.style.setProperty("--arrangement-steps", arrangementStepCount);
    labels.innerHTML = typeof window.renderArrangementStepLabels === "function" ? window.renderArrangementStepLabels() : "";
  }

  function updateArrangementSceneColorSelector() {
    if (typeof window.renderArrangementSceneColorSelector !== "function") {
      return;
    }

    const selector = document.querySelector(".arrangement-scene-colors");
    if (!selector) {
      return;
    }

    selector.outerHTML = window.renderArrangementSceneColorSelector();
  }

  function updateSourceStrip() {
    const sourceStrip = document.querySelector(".source-strip");
    if (!sourceStrip) {
      return;
    }

    const loadedTracks = tracks.filter((track) => track.source);
    const allSameSource =
      loadedTracks.length > 0 &&
      loadedTracks.every((track) => track.source.identifier === loadedTracks[0].source.identifier);
    const sourceLabel = allSameSource
      ? loadedTracks[0].source.title
      : `${loadedTracks.length} of ${tracks.length} sources loaded`;
    const sourceMeta = allSameSource
      ? [loadedTracks[0].source.creator, loadedTracks[0].source.year].filter(Boolean).join(" - ")
      : "Search inside any track to swap its video";
    const archiveLink = allSameSource
      ? `<a class="archive-link" href="${loadedTracks[0].source.archiveUrl}" target="_blank" rel="noreferrer">Archive</a>`
      : "";

    sourceStrip.innerHTML = `
      <div class="source-copy">
        <span class="panel-label">Sources</span>
        <h2>${escapeHtml(sourceLabel)}</h2>
        <p>${escapeHtml(sourceMeta || `${tracks.length} track slot${tracks.length === 1 ? "" : "s"} open`)}</p>
      </div>
      ${archiveLink}
    `;
  }

  window.freemixRender = {
    updateStatus,
    updateTransportRow,
    updateTrackRow,
    updateArrangementGrid,
    updateArrangementCell,
    updateArrangementStepLabels,
    updateArrangementSceneColorSelector,
    updateSourceStrip,
    updateArrangementPlayhead: renderArrangementPlayhead,
  };
})();


