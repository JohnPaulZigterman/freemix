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
    const simpleButton = player.querySelector("#simpleModeButton");
    const metroButton = player.querySelector("#metroButton");
    const arrangementToggle = player.querySelector("#arrangementToggle");
    const layoutSelect = player.querySelector("#layoutSelect");
    const arrangementLengthSelect = player.querySelector("#arrangementStepsSelect");
    const bpmInput = player.querySelector("#bpmInput");

    if (playButton) {
      playButton.classList.toggle("active", !!transport?.active);
    }

    if (simpleButton) {
      simpleButton.textContent = simpleMode ? "Simple" : "Advanced";
      simpleButton.classList.toggle("active", simpleMode);
      simpleButton.setAttribute("aria-pressed", String(simpleMode));
    }

    if (metroButton) {
      metroButton.classList.toggle("active", !masterMuted);
    }

    if (arrangementToggle) {
      arrangementToggle.textContent = arrangement.enabled ? "On" : "Off";
      arrangementToggle.classList.toggle("active", arrangement.enabled);
      arrangementToggle.setAttribute("aria-pressed", String(arrangement.enabled));
    }

    if (layoutSelect) {
      layoutSelect.value = videoLayout;
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
  }

  function buildArrangementGridMarkup() {
    return `
      ${tracks.map((track) => renderArrangementRow(track)).join("")}
    `;
  }

  function updateArrangementGrid() {
    const grid = document.querySelector(".arrangement-grid");
    if (!grid) {
      return;
    }

    const stepLabels = Array.from({ length: arrangementStepCount }, (_, index) =>
      renderArrangementStepLabel(index),
    ).join("");

    grid.outerHTML = `
      <div class="arrangement-grid" style="--arrangement-steps: ${arrangementStepCount}">
        <div class="arrangement-corner">Trk</div>
        ${stepLabels}
        ${buildArrangementGridMarkup()}
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
        <p>${escapeHtml(sourceMeta || "Four independent Internet Archive tracks")}</p>
      </div>
      ${archiveLink}
    `;
  }

  window.freemixRender = {
    updateStatus,
    updateTransportRow,
    updateTrackRow,
    updateArrangementGrid,
    updateSourceStrip,
    updateArrangementPlayhead: renderArrangementPlayhead,
  };
})();
