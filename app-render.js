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
    const arrangementLengthSelect = player.querySelector("#arrangementStepsSelect");
    const bpmInput = player.querySelector("#bpmInput");

    if (playButton) {
      playButton.classList.toggle("active", !!transport?.active);
    }

    if (metroButton) {
      metroButton.classList.toggle("active", !masterMuted);
    }

    if (arrangementToggle) {
      arrangementToggle.textContent = arrangement.enabled ? "On" : "Off";
      arrangementToggle.classList.toggle("active", arrangement.enabled);
      arrangementToggle.setAttribute("aria-pressed", String(arrangement.enabled));
    }

    if (arrangementLengthSelect) {
      arrangementLengthSelect.value = String(arrangementStepCount);
    }

    if (bpmInput && transport?.bpm) {
      bpmInput.value = String(transport.bpm);
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
    cell.classList.toggle("filled", isFilled);
    cell.textContent = isFilled ? "x" : "";
    cell.title = isFilled
      ? escapeHtml(`${track.name || "Track"} bar ${stepIndex + 1}`)
      : `Capture ${track.name || "track"}`;
    cell.classList.toggle("playing", arrangement.step === stepIndex);
  }

  function updateArrangementGrid() {
    if (typeof window.freemixInvalidateUiNodeCache === "function") {
      window.freemixInvalidateUiNodeCache();
    }

    const labels = document.querySelector(".arrangement-step-labels");
    if (labels) {
      const nextLabels = typeof window.renderArrangementStepLabels === "function" ? window.renderArrangementStepLabels() : "";
      labels.outerHTML = `
        <div class="arrangement-step-labels" aria-label="Arrangement steps" style="--arrangement-steps: ${arrangementStepCount}">
          ${nextLabels}
        </div>
      `;
    }

    const arrangementGrid = document.querySelector(".arrangement-grid");
    const renderGrid = typeof window.renderArrangementGrid === "function" ? window.renderArrangementGrid() : "";
    if (arrangementGrid) {
      if (renderGrid) {
        arrangementGrid.outerHTML = renderGrid;
        return;
      }

      renderWorkstation();
      return;
    }

    if (typeof renderWorkstation === "function") {
      renderWorkstation();
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

    labels.outerHTML = `
      <div class="arrangement-step-labels" aria-label="Arrangement steps" style="--arrangement-steps: ${arrangementStepCount}">
        ${window.renderArrangementStepLabels()}
      </div>
    `;
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
    updateSourceStrip,
    updateArrangementPlayhead: renderArrangementPlayhead,
  };
})();
