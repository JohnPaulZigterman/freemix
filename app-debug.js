(function initFreemixRuntimeUX() {
  if (window.freemixDebugRuntimeReady) {
    return;
  }

  const DEMO_VIDEO_SOURCE = {
    identifier: "post_grape-nuts_flakes",
    title: "Debug IA sample loop",
    creator: "Internet Archive",
    year: "2008",
    runtime: "0:16",
    mediaUrl: "https://archive.org/download/post_grape-nuts_flakes/post_grape-nuts_flakes_512kb.mp4",
    mediaName: "post_grape-nuts_flakes_512kb.mp4",
    mediaFormat: "video/mp4",
    archiveUrl: "https://archive.org/details/post_grape-nuts_flakes",
  };

  function markOnboardingProgress(nextPhase, hintMessage) {
    appState.userOnboarding.phase = nextPhase;
    if (!appState.userOnboarding.needsHint) {
      return;
    }

    if (hintMessage) {
      showGuidance(hintMessage);
    }

    if (nextPhase === "done") {
      clearGuidanceHint();
    }
  }

  const baseStartTransport = window.startTransport;
  if (typeof baseStartTransport === "function") {
    window.startTransport = function patchedStartTransport() {
      const result = baseStartTransport.apply(this, arguments);
      markOnboardingProgress("done", "What now: Fine-tune track controls while it cycles");
      return result;
    };
  }

  const baseHandleTrackControl = window.handleTrackControl;
  if (typeof baseHandleTrackControl === "function") {
    window.handleTrackControl = function patchedHandleTrackControl(event) {
      const control = event?.currentTarget;
      const controlName = control?.dataset?.control;
      const needsPersist =
        controlName &&
        [
          "muted",
          "startTime",
          "startNumber",
          "retriggersPerBar",
          "volume",
          "blendMode",
          "opacity",
          "speed",
          "pitch",
          "durationFilter",
          "advanced",
          "fx",
        ].includes(controlName);

      const result = baseHandleTrackControl.apply(this, arguments);
      if (needsPersist) {
        markAppStateDirty();
      }

      if (appState.userOnboarding?.needsHint) {
        if (controlName === "sourceSearch") {
          markOnboardingProgress("armed", "What now: set start and energy, then press Play");
        } else {
          markOnboardingProgress("armed", "What now: tune controls and press Play");
        }
      }

      return result;
    };
  }

  const baseLoadTrackSource = window.loadTrackSource;
  if (typeof baseLoadTrackSource === "function") {
    window.loadTrackSource = async function patchedLoadTrackSource(track, result) {
      const loaded = await baseLoadTrackSource.apply(this, arguments);
      markOnboardingProgress("armed", "What now: adjust Moment and Energy, then press Play");
      markAppStateDirty();
      return loaded;
    };
  }

  const baseHandleArrangementCell = window.handleArrangementCell;
  if (typeof baseHandleArrangementCell === "function") {
    window.handleArrangementCell = function patchedHandleArrangementCell(event) {
      const arrangementCell = event.currentTarget;
      const result = baseHandleArrangementCell.apply(this, arguments);
      const trackId = arrangementCell?.dataset?.arrTrack;
      const stepIndex = Number(arrangementCell?.dataset?.arrStep);
      if (trackId && Number.isInteger(stepIndex)) {
        markAppStateDirty();
      }

      if (appState.userOnboarding?.needsHint && arrangement.clips[stepIndex]?.[trackId]) {
        markOnboardingProgress("arrange", "What now: use arrangement copy to fill other sections");
      }

      return result;
    };
  }

  window.copyCurrentArrangementSectionToAll = function copyCurrentArrangementSectionToAll() {
    const sourceIndex = arrangement.step;
    const sourceStep = arrangement.clips[sourceIndex];
    if (!sourceStep || !Object.keys(sourceStep).length) {
      setStatus("Capture a section first", true);
      return;
    }

    for (let stepIndex = 0; stepIndex < arrangementStepCount; stepIndex += 1) {
      if (stepIndex === sourceIndex) {
        continue;
      }

      if (Object.keys(arrangement.clips[stepIndex]).length === 0) {
        arrangement.clips[stepIndex] = cloneArrangementStep(sourceStep);
      }
    }

    if (window.freemixRender?.updateArrangementGrid) {
      window.freemixRender.updateArrangementGrid();
    }

    setStatus("Current section copied into empty sections");
    markAppStateDirty();
  };

  window.seedArrangement = function seedArrangement() {
    const baseStep = {};
    tracks.forEach((track) => {
      if (track.source) {
        baseStep[track.id] = captureTrackClip(track);
      }
    });

    if (!Object.keys(baseStep).length) {
      setStatus("Load a source first", true);
      return;
    }

    arrangement.clips.forEach((step, index) => {
      arrangement.clips[index] = cloneArrangementStep(baseStep);
    });
    arrangement.enabled = true;
    if (window.freemixRender?.updateArrangementGrid) {
      window.freemixRender.updateArrangementGrid();
    }

    setStatus("Arrangement seeded from current states");
    markAppStateDirty();
  };

  window.dumpState = function dumpState() {
    if (typeof navigator !== "undefined" && typeof window !== "undefined") {
      const payload = {
        selectedSource,
        arrangementStepCount,
        arrangementEnabled: arrangement.enabled,
        arrangementStep: arrangement.step,
        arrangementCopyMode,
        transportActive: !!transport?.active,
        transportBpm: transport?.bpm,
        tracks: tracks.map((track) => ({
          id: track.id,
          muted: track.muted,
          volume: track.volume,
          startTime: track.startTime,
          retriggersPerBar: track.retriggersPerBar,
          showAdvanced: track.showAdvanced,
          blendMode: track.blendMode,
          durationFilter: track.durationFilter,
          hasSource: !!track.source,
          sourceIdentifier: track.source?.identifier,
        })),
      };

      console.table(payload.tracks);
      console.log("[freemix-state]", payload);
      setStatus("State dumped to console");
    }
  };

  window.loadMockSource = function loadMockSource() {
    tracks.forEach((track) => {
      stopTransport(false);
      disposeTrackAudio(track);
      track.source = { ...DEMO_VIDEO_SOURCE };
      track.startTime = 0;
      track.lastStep = -1;
      track.durationFilter = track.durationFilter || "quick";
      if (window.freemixRender?.updateTrackRow) {
        window.freemixRender.updateTrackRow(track);
      }
    });
    selectedSource = tracks[0]?.source ?? selectedSource;
    if (window.freemixRender?.updateSourceStrip) {
      window.freemixRender.updateSourceStrip();
    }

    setStatus("Debug: loaded demo source on all tracks");
    markAppStateDirty();
  };

  window.simulateTransportSweep = function simulateTransportSweep() {
    const sweepBars = Math.min(arrangementStepCount, 8);
    if (transport?.active) {
      setStatus("Transport is already active");
      return;
    }

    if (!hasArrangementClips()) {
      seedArrangement();
    }

    if (!arrangement.enabled) {
      toggleArrangement();
    }

    startTransport();
    const beatMs = 60000 / (transport?.bpm || DEFAULT_BPM);
    const barMs = beatMs * 4;
    window.setTimeout(() => {
      if (transport?.active) {
        stopTransport();
      }

      setStatus("8-bar debug transport sweep complete");
      clearGuidanceHint();
    }, barMs * sweepBars + 250);
  };

  window.performDebugAction = function performDebugAction(action) {
    if (action === "loadMockSource") {
      loadMockSource();
      return;
    }

    if (action === "seedArrangement") {
      seedArrangement();
      return;
    }

    if (action === "dumpState") {
      dumpState();
      return;
    }

    if (action === "simulateTransport") {
      simulateTransportSweep();
      return;
    }

    setStatus("Unknown debug action");
  };

  function formatDiagnosticValue(value) {
    if (typeof value === "boolean") {
      return value ? "yes" : "no";
    }

    if (value === null || typeof value === "undefined" || value === "") {
      return "none";
    }

    return String(value);
  }

  function renderDiagnosticRows(rows) {
    return rows
      .map(
        ([label, value]) => `
          <div class="debug-diagnostic-row">
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(formatDiagnosticValue(value))}</dd>
          </div>
        `,
      )
      .join("");
  }

  function getMediaDiagnosticSummary() {
    const trackCount = tracks.length;
    const readiness = tracks.map((track) =>
      typeof window.freemixGetTrackMediaReadiness === "function"
        ? window.freemixGetTrackMediaReadiness(track).readiness
        : track.mediaStatus || "empty",
    );
    const loadedCount = tracks.filter((track) => !!track.source).length;
    const readyCount = readiness.filter((state) => ["ready", "fx-ready", "playing", "stopped"].includes(state)).length;
    const failedCount = readiness.filter((state) => ["failed", "unsupported"].includes(state)).length;
    const limitedCount = readiness.filter((state) => ["limited", "audio-only", "video-only"].includes(state)).length;
    return `${loadedCount}/${trackCount} loaded, ${readyCount} ready, ${failedCount} failed, ${limitedCount} limited`;
  }

  function getAudioDiagnosticSummary() {
    const routeStates = tracks.map((track) =>
      typeof window.freemixGetTrackAudioRouteState === "function"
        ? window.freemixGetTrackAudioRouteState(track)
        : { readiness: track.audio?.output ? "fx-ready" : "empty" },
    );
    const fxReadyCount = routeStates.filter((route) => route.readiness === "fx-ready").length;
    const limitedCount = routeStates.filter((route) => route.readiness === "limited").length;
    const failedCount = routeStates.filter((route) => route.readiness === "failed").length;
    const mutedCount = tracks.filter((track) => track.muted).length;
    return `${fxReadyCount}/${tracks.length} FX-ready, ${limitedCount} limited, ${failedCount} failed, ${mutedCount} muted`;
  }

  function getDrumDiagnosticSummary() {
    const drumDiagnostics = typeof window.freemixGetDrumBufferDiagnostics === "function"
      ? window.freemixGetDrumBufferDiagnostics()
      : null;
    if (!drumDiagnostics) {
      return "unavailable";
    }

    const rendered = Number(drumDiagnostics.rendered) || 0;
    const expected = Number(drumDiagnostics.expected) || 0;
    const pending = drumDiagnostics.pending ? ", rendering" : "";
    return `${rendered}/${expected} buffers${pending}`;
  }

  function getPlaybackFailureDiagnosticSummary() {
    const failure = typeof window.freemixGetLastPlaybackFailureDiagnostics === "function"
      ? window.freemixGetLastPlaybackFailureDiagnostics()
      : null;
    if (!failure) {
      return "none";
    }

    const scene = failure.diagnostics?.arrangement?.step || "none";
    return `${failure.reason || "playback failure"} at scene ${scene}`;
  }

  function renderDiagnosticsPanel() {
    const selectedTarget = typeof window.freemixGetSelectedEditTargetLabel === "function"
      ? window.freemixGetSelectedEditTargetLabel()
      : "Editing live tracks";
    const transportRows = [
      ["Transport", transport?.active ? "playing" : "stopped"],
      ["Mode", arrangement.enabled ? "arrangement" : "live"],
      ["Scene", Number.isFinite(Number(arrangement.step)) ? Number(arrangement.step) + 1 : "none"],
      ["BPM", transport?.bpm || appState.preferredBpm || DEFAULT_BPM],
      ["Beat ms", Number.isFinite(Number(transport?.beatMs)) ? Math.round(Number(transport.beatMs)) : "none"],
      ["Selected", selectedTarget],
    ];
    const systemRows = [
      ["Media", getMediaDiagnosticSummary()],
      ["Audio", getAudioDiagnosticSummary()],
      ["Drums", getDrumDiagnosticSummary()],
      ["Last failure", getPlaybackFailureDiagnosticSummary()],
      ["Exporting", typeof window.freemixIsExportingVideo === "function" ? window.freemixIsExportingVideo() : false],
      ["Arrangement clips", typeof hasArrangementClips === "function" ? hasArrangementClips() : false],
    ];
    const trackRows = tracks.map((track, index) => [
      `T${index + 1}`,
      `${typeof window.freemixGetTrackMediaReadiness === "function" ? window.freemixGetTrackMediaReadiness(track).label : track.mediaStatus || (track.source ? "ready" : "empty")} / ${
        typeof window.freemixGetTrackAudioRouteState === "function"
          ? window.freemixGetTrackAudioRouteState(track).label
          : track.audio?.output
            ? "Audio routed"
            : "Native/none"
      }`,
    ]);

    return `
      <section class="debug-diagnostics" aria-label="Runtime diagnostics">
        <div class="debug-diagnostics-group">
          <h4>Transport</h4>
          <dl>${renderDiagnosticRows(transportRows)}</dl>
        </div>
        <div class="debug-diagnostics-group">
          <h4>Systems</h4>
          <dl>${renderDiagnosticRows(systemRows)}</dl>
        </div>
        <div class="debug-diagnostics-group debug-diagnostics-group--tracks">
          <h4>Tracks</h4>
          <dl>${renderDiagnosticRows(trackRows)}</dl>
        </div>
      </section>
    `;
  }

  window.freemixRenderDebugPanel = function renderDebugPanel() {
    return `
      <div class="debug-actions" role="group" aria-label="Debug actions">
        <button class="debug-action-button" type="button" data-debug-action="loadMockSource">Load mock source</button>
        <button class="debug-action-button" type="button" data-debug-action="seedArrangement">Seed arrangement</button>
        <button class="debug-action-button" type="button" data-debug-action="dumpState">Dump state</button>
        <button class="debug-action-button" type="button" data-debug-action="simulateTransport">8-bar sweep</button>
      </div>
      ${renderDiagnosticsPanel()}
    `;
  };

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
    window.freemixRender.updateTransportRow?.();
  }

  window.freemixDebugRuntimeReady = true;
})();
