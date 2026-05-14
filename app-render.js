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
    const layoutSelect = player.querySelector("#layoutSelect");
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

    if (typeof window.applyTrackControlVisibility === "function") {
      window.applyTrackControlVisibility(track);
    }
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

    const renderStrip = typeof window.renderTrackArrangementStrip === "function" ? window.renderTrackArrangementStrip : null;
    const fallbackTrackRow = typeof window.renderArrangementRow === "function" ? window.renderArrangementRow : null;

    tracks.forEach((track) => {
      const trackStrip = document.querySelector(`.track-arrangement-strip[data-track-arrangement="${track.id}"]`);
      if (!trackStrip || !track?.id) {
        return;
      }

      const nextStrip = renderStrip
        ? renderStrip(track)
        : fallbackTrackRow
          ? `<div class="track-arrangement-strip" style="--arrangement-steps: ${arrangementStepCount}" data-track-arrangement="${track.id}">
              ${fallbackTrackRow(track)}
            </div>`
          : "";

      if (nextStrip) {
        trackStrip.outerHTML = nextStrip;
      }
    });

    const allStrips = document.querySelectorAll(".track-arrangement-strip");
    if (!allStrips.length) {
      renderWorkstation();
    }
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
    updateSourceStrip,
    updateArrangementPlayhead: renderArrangementPlayhead,
  };
})();
