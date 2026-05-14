const playerPanel = document.querySelector("#playerPanel");
const statusPill = document.querySelector("#statusPill");

const IA_SEARCH_URL = "https://archive.org/advancedsearch.php";
const IA_METADATA_URL = "https://archive.org/metadata";
const IA_DOWNLOAD_URL = "https://archive.org/download";
const SEARCH_DELAY_MS = 280;
const DEFAULT_BPM = 92;
const DEFAULT_ARRANGEMENT_STEPS = 8;
const ARRANGEMENT_STEP_OPTIONS = [4, 8, 16];
const VIDEO_LAYOUTS = {
  stack: "Stack",
  grid: "Grid",
};
const BLEND_MODES = {
  normal: "Normal",
  screen: "Screen",
  multiply: "Multiply",
  add: "Add",
  difference: "Diff",
  exclusion: "Excl",
  dodge: "Dodge",
  hard: "Hard",
};
const TRACKS = [
  { name: "Perc", role: "Impact", color: "green" },
  { name: "Bass", role: "Weight", color: "amber" },
  { name: "Rhythm", role: "Motion", color: "blue" },
  { name: "Lead", role: "Hook", color: "red" },
];
const RETRIGGER_LABELS = {
  1: "1 - anchor",
  2: "2 - stride",
  3: "3 - roll",
  4: "4 - pulse",
  5: "5 - skip",
  6: "6 - drive",
  7: "7 - spark",
  8: "8 - rush",
};
const DURATION_FILTERS = {
  any: { label: "Any", min: 0, max: Infinity },
  quick: { label: "< 5m", min: 0, max: 5 * 60 },
  short: { label: "< 15m", min: 0, max: 15 * 60 },
  medium: { label: "15-30m", min: 15 * 60, max: 30 * 60 },
  long: { label: "30m+", min: 30 * 60, max: Infinity },
};
const FX_CONTROLS = [
  { key: "eqLow", label: "EQ Low", min: -12, max: 12, step: 1 },
  { key: "eqMid", label: "EQ Mid", min: -12, max: 12, step: 1 },
  { key: "eqHigh", label: "EQ High", min: -12, max: 12, step: 1 },
  { key: "tube", label: "Tube", min: 0, max: 1, step: 0.01 },
  { key: "delay", label: "Delay", min: 0, max: 1, step: 0.01 },
  { key: "reverb", label: "Reverb", min: 0, max: 1, step: 0.01 },
];
const FX_CONTROL_INDEX = Object.freeze(Object.fromEntries(FX_CONTROLS.map((entry) => [entry.key, entry])));

const TRACK_CONTROL_SECTIONS = {
  source: [
    {
      control: "sourceSearch",
      type: "search",
      label: "Source",
      attrs: {
        type: "search",
        placeholder: "Search video",
      },
      fieldClass: "track-source-search",
    },
    {
      control: "durationFilter",
      type: "select",
      label: "Length",
      fieldClass: "duration-filter",
      options: Object.entries(DURATION_FILTERS).map(([value, filter]) => ({
        value,
        label: filter.label,
      })),
    },
  ],
  basic: [
    {
      control: "startTime",
      type: "range",
      label: "Moment",
      fieldClass: "start-field",
      inputProps: {
        min: "0",
        max: "120",
        step: "0.1",
      },
    },
    {
      control: "startNumber",
      type: "number",
      label: "Sec",
      fieldClass: "compact-number",
      inputProps: {
        min: "0",
        step: "0.1",
      },
    },
    {
      control: "retriggersPerBar",
      type: "select",
      label: "Energy",
      fieldClass: "energy-field",
      options: Object.entries(RETRIGGER_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      control: "volume",
      type: "range",
      label: "Vol",
      fieldClass: "volume-field",
      inputProps: {
        min: "0",
        max: "1",
        step: "0.01",
      },
    },
    {
      control: "blendMode",
      type: "select",
      label: "Blend",
      fieldClass: "blend-field",
      options: Object.entries(BLEND_MODES).map(([value, label]) => ({ value, label })),
    },
  ],
  advanced: [
    {
      control: "fxChain",
      type: "fx-chain",
      label: "FX",
      fieldClass: "fx-chain",
      visibility: "advanced",
    },
  ],
};

const appState = window.freemixState || {};
const appStateManager = window.freemixStateManager || {};
const persistState = appState.__persistState || appStateManager.persist || appStateManager.persistState;

if (!appState.tracks) {
  appState.tracks = createInitialTracks();
}

if (typeof appStateManager.hydrateTracks === "function") {
  appStateManager.hydrateTracks(appState.tracks);
}

if (!appState.arrangement) {
  appState.arrangement = createInitialArrangement(appState.arrangementStepCount || DEFAULT_ARRANGEMENT_STEPS);
} else if (typeof appStateManager.hydrateArrangement === "function") {
  appStateManager.hydrateArrangement(appState.arrangement);
}

if (!appState.userOnboarding || !appState.userOnboarding.phase) {
  appState.userOnboarding = { phase: "seed", needsHint: true };
}

function markAppStateDirty(force = false) {
  if (typeof appState.__markStateDirty === "function") {
    appState.__markStateDirty(appState.tracks, force);
    return;
  }

  if (typeof appStateManager.markStateDirty === "function") {
    appStateManager.markStateDirty(appState.tracks, force);
    return;
  }

  if (typeof persistState === "function") {
    persistState();
  }
}

  [
  "selectedSource",
  "transport",
  "audioContext",
  "webAudioDisabled",
  "masterMuted",
  "arrangementStepCount",
  "arrangementCopyMode",
  "arrangementCopySourceStep",
  "tracks",
  "arrangement",
  "videoLayout",
  "trackSearchRequestCounter",
  "userOnboarding",
].forEach((key) => {
  Object.defineProperty(window, key, {
    configurable: true,
    get() {
      return appState[key];
    },
    set(value) {
      appState[key] = value;
      if (["arrangementStepCount", "masterMuted", "videoLayout", "userOnboarding"].includes(key)) {
        markAppStateDirty(true);
      }
    },
  });
});

const debugMode = new URLSearchParams(window.location.search).get("mode") === "dev";

function showGuidance(message) {
  if (appState.userOnboarding?.needsHint) {
    setStatus(message);
  }
}

function clearGuidanceHint() {
  if (appState.userOnboarding?.needsHint) {
    appState.userOnboarding.needsHint = false;
    markAppStateDirty(true);
  }
}

window.addEventListener("pagehide", () => {
  hardStopPlayback("page hidden");
});
window.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hardStopPlayback("tab hidden");
  }
});
window.addEventListener("beforeunload", () => {
  hardStopPlayback("unloading");
});

renderWorkstation();
setStatus("Ready");

function normalizeResults(docs) {
  return docs
    .filter((doc) => doc.identifier)
    .map((doc) => ({
      identifier: doc.identifier,
      title: textValue(doc.title) || doc.identifier,
      creator: textValue(doc.creator),
      year: textValue(doc.year),
      description: textValue(doc.description),
      runtime: textValue(doc.runtime),
      durationSeconds: parseRuntime(textValue(doc.runtime)),
      thumbnail: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
      archiveUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
    }));
}

function textValue(value) {
  if (Array.isArray(value)) {
    return value.find(Boolean) ?? "";
  }

  return value ?? "";
}

function parseRuntime(runtime) {
  if (!runtime) {
    return Infinity;
  }

  const parts = String(runtime)
    .trim()
    .split(":")
    .map((part) => Number(part));

  if (parts.some((part) => Number.isNaN(part))) {
    return Infinity;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0];
}

async function performArchiveSearch(params) {
  const response = await fetch(`${IA_SEARCH_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload.response?.docs ?? [];
}

async function fetchPlayableSource(result) {
  const response = await fetch(`${IA_METADATA_URL}/${encodeURIComponent(result.identifier)}`);
  if (!response.ok) {
    throw new Error(`Metadata failed with status ${response.status}`);
  }

  const metadata = await response.json();
  const file = choosePlayableFile(metadata.files ?? []);
  if (!file) {
    throw new Error("No playable video file found.");
  }

  const mediaUrl = `${IA_DOWNLOAD_URL}/${encodeURIComponent(result.identifier)}/${encodePath(file.name)}`;
  return {
    ...result,
    duration: Number(metadata.metadata?.runtime) || 0,
    mediaUrl,
    mediaName: file.name,
    mediaFormat: file.format ?? "video",
  };
}

function choosePlayableFile(files) {
  const candidates = files
    .filter((file) => {
      const name = file.name ?? "";
      const format = file.format ?? "";
      const combined = `${name} ${format}`.toLowerCase();
      return (
        /\.(mp4|m4v|webm|ogv)$/i.test(name) &&
        !combined.includes("thumbnail") &&
        !combined.includes("metadata") &&
        !combined.includes("item tile") &&
        !combined.includes("spectrogram")
      );
    })
    .map((file) => ({
      ...file,
      numericSize: Number(file.size) || Number.MAX_SAFE_INTEGER,
      score: scorePlayableFile(file),
    }))
    .sort((a, b) => a.score - b.score || a.numericSize - b.numericSize);

  return candidates[0];
}

function scorePlayableFile(file) {
  const name = file.name.toLowerCase();
  const format = (file.format ?? "").toLowerCase();
  let score = 100;

  if (name.endsWith(".mp4")) score -= 50;
  if (format.includes("h.264") || format.includes("mpeg4")) score -= 30;
  if (name.includes("512kb") || name.includes("360") || name.includes("480")) score -= 10;
  if (name.includes("1080") || name.includes("720")) score += 15;
  if (name.endsWith(".ogv")) score += 20;

  return score;
}

function renderWorkstation() {
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

  playerPanel.innerHTML = `
    <section class="workstation" aria-label="Four track video looper">
      <div class="source-strip">
        <div class="source-copy">
          <span class="panel-label">Sources</span>
          <h2>${escapeHtml(sourceLabel)}</h2>
          <p>${escapeHtml(sourceMeta || "Four independent Internet Archive tracks")}</p>
        </div>
        ${
          allSameSource
            ? `<a class="archive-link" href="${loadedTracks[0].source.archiveUrl}" target="_blank" rel="noreferrer">Archive</a>`
            : ""
        }
      </div>

      <div class="transport" aria-label="Transport controls">
        <button class="transport-button play-button" id="playButton" type="button">Play</button>
        <button class="transport-button" id="stopButton" type="button">Stop</button>
        <label class="control-field bpm-field">
          <span>BPM</span>
          <input id="bpmInput" type="number" min="40" max="220" step="1" value="${DEFAULT_BPM}">
        </label>
        <button class="transport-button metronome-button active" id="metroButton" type="button">
          Click
        </button>
        <label class="control-field layout-field">
          <span>View</span>
          <select id="layoutSelect">
            ${Object.entries(VIDEO_LAYOUTS)
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${value === videoLayout ? "selected" : ""}>${label}</option>`,
              )
              .join("")}
          </select>
        </label>
        <div class="meter" aria-label="Bar position">
          <span class="beat-light" data-beat="0"></span>
          <span class="beat-light" data-beat="1"></span>
          <span class="beat-light" data-beat="2"></span>
          <span class="beat-light" data-beat="3"></span>
        </div>
      </div>

      <div class="performance-grid">
        <div class="video-matrix layout-${videoLayout} ${loadedTracks.length ? "has-sources" : "no-sources"}" aria-label="Video sources">
          ${tracks.map((track, index) => renderVideoCell(track, index)).join("")}
        </div>

        ${renderArrangementPanel()}
      </div>

  <div class="control-bank" aria-label="Track controls">
        ${tracks.map((track) => renderTrackControlRow(track)).join("")}
      </div>
    </section>
  `;

  bindWorkstationControls();
  tracks.forEach(applyTrackControlVisibility);
  window.freemixRender?.updateTransportRow?.();
  window.freemixRender?.updateSourceStrip?.();
  if (appState.userOnboarding?.needsHint) {
    showGuidance("What now: load one source per track, then press Play");
  }
}

function applyTrackControlVisibility(track) {
  const trackRow = playerPanel.querySelector(`article.track-row[data-track-row-id="${track.id}"]`);
  if (!trackRow) {
    return;
  }

  trackRow.classList.toggle("is-advanced", !!track.showAdvanced);
  trackRow.querySelectorAll(".control-advanced").forEach((control) => {
    control.classList.toggle("is-hidden", !track.showAdvanced);
  });
}

function renderArrangementPanel() {
  return `
      <aside class="arrangement-panel" aria-label="Arrangement">
        <div class="arrangement-header">
          <span>Arr</span>
          <label class="control-field arrangement-length-field">
            <span>Bars</span>
            <select id="arrangementStepsSelect">
              ${ARRANGEMENT_STEP_OPTIONS.map(
                (count) => `<option value="${count}" ${count === arrangementStepCount ? "selected" : ""}>${count}</option>`,
              ).join("")}
            </select>
          </label>
        <button
            class="arrangement-toggle ${arrangement.enabled ? "active" : ""}"
            type="button"
            id="arrangementToggle"
          aria-pressed="${arrangement.enabled}"
            >
          ${arrangement.enabled ? "On" : "Off"}
        </button>
          <button
            class="arrangement-copy ${arrangementCopyMode ? "active" : ""}"
            type="button"
            id="arrangementCopyButton"
            aria-pressed="${arrangementCopyMode}"
          >
            ${arrangementCopyMode ? "Copying" : "Copy"}
          </button>
          <button
            class="arrangement-action"
            type="button"
            id="arrangementCopyAllButton"
            title="Copy current section into all empty sections"
          >
            Fill
          </button>
      </div>
        ${renderDebugPanel()}
        <div class="arrangement-grid" style="--arrangement-steps: ${arrangementStepCount}">
          <div class="arrangement-corner">Trk</div>
          ${Array.from({ length: arrangementStepCount }, (_, index) => renderArrangementStepLabel(index)).join("")}
        ${tracks.map((track) => renderArrangementRow(track)).join("")}
      </div>
      <button class="arrangement-clear" type="button" id="arrangementClear">Clear</button>
    </aside>
  `;
}

function renderDebugPanel() {
  if (!debugMode) {
    return "";
  }

  return `
    <div class="debug-actions" role="group" aria-label="Debug actions">
      <button class="debug-action-button" type="button" data-debug-action="loadMockSource">Load mock source</button>
      <button class="debug-action-button" type="button" data-debug-action="seedArrangement">Seed arrangement</button>
      <button class="debug-action-button" type="button" data-debug-action="dumpState">Dump state</button>
      <button class="debug-action-button" type="button" data-debug-action="simulateTransport">8-bar sweep</button>
    </div>
  `;
}

function renderArrangementStepLabel(stepIndex) {
  const isCopySource = arrangementCopyMode && arrangementCopySourceStep === stepIndex;
  return `
    <button
      class="arrangement-step-label ${isCopySource ? "copy-source" : ""}"
      type="button"
      data-arr-step="${stepIndex}"
      title="${isCopySource ? "Copy source selected" : "Select or paste section here"}"
    >
      ${stepIndex + 1}
    </button>
  `;
}

function renderArrangementRow(track) {
  return `
    <div class="arrangement-track-label ${track.color}">${escapeHtml(track.name.slice(0, 1))}</div>
    ${arrangement.clips
      .map((step, index) => {
        const clip = step[track.id];
        return `
          <button
            class="arrangement-cell ${track.color} ${clip ? "filled" : ""} ${arrangement.step === index ? "playing" : ""}"
            type="button"
            data-arr-track="${track.id}"
            data-arr-step="${index}"
            title="${clip ? escapeHtml(`${track.name} bar ${index + 1}`) : `Capture ${track.name}`}"
          >
            ${clip ? "x" : ""}
          </button>
        `;
      })
      .join("")}
  `;
}

function renderVideoCell(track, index) {
  return `
    <div class="video-cell ${track.color} blend-${track.blendMode} ${track.source ? "has-source" : "no-source"}" data-track-id="${track.id}" style="--layer-index: ${index + 1}">
      ${
        track.source
        ? `<video
              class="track-video"
              id="video-${track.id}"
              src="${track.source.mediaUrl}"
              crossorigin="anonymous"
              preload="metadata"
              playsinline
            ></video>`
          : `<div class="track-empty-video">Ready</div>`
      }
      <div class="track-badge">
        <strong>${escapeHtml(track.name)}</strong>
        <span>${escapeHtml(track.role)}</span>
      </div>
      <div class="trigger-flash" aria-hidden="true"></div>
    </div>
  `;
}

function renderTrackControlRow(track) {
  const sourceTitle = track.source?.title ?? "Empty slot";
  const sourceMeta = track.source
    ? [track.source.creator, track.source.year].filter(Boolean).join(" - ") || track.source.mediaFormat
    : "Search to load video";
  const sourceControls = renderTrackControls(track, TRACK_CONTROL_SECTIONS.source);
  const basicControls = renderTrackControls(track, TRACK_CONTROL_SECTIONS.basic);
  const advancedControls = TRACK_CONTROL_SECTIONS.advanced
    .filter((control) => control.type !== "fx-chain")
    .map((control) => renderTrackControlField(track, control))
    .join("");
  const fxChain = renderTrackFxChain(track);

  return `
    <article class="track-row ${track.color}" data-track-row-id="${track.id}">
      <div class="track-row-label">
        <strong>${escapeHtml(track.name)}</strong>
        <span>${escapeHtml(track.role)}</span>
      </div>
      <div class="track-source">
        ${sourceControls}
        <div class="track-source-name" title="${escapeHtml(sourceTitle)}">
          <strong>${escapeHtml(sourceTitle)}</strong>
          <span>${escapeHtml(sourceMeta)}</span>
        </div>
        <div class="track-results" id="results-${track.id}" hidden></div>
      </div>
      ${basicControls}
      ${advancedControls}
      ${fxChain}
      <button
        class="track-advanced-toggle"
        type="button"
        data-track-control="${track.id}"
        data-control="advanced"
        aria-pressed="${!!track.showAdvanced}"
      >
        ${track.showAdvanced ? "Advanced" : "Adv"}
      </button>
      <button
        class="track-toggle"
        type="button"
        data-track-control="${track.id}"
        data-control="muted"
        aria-pressed="${track.muted}"
      >
        ${track.muted ? "Muted" : "On"}
      </button>
    </article>
  `;
}

function renderTrackControls(track, controls) {
  return controls
    .map((control) => renderTrackControlField(track, control))
    .join("");
}

function renderTrackControlField(track, control) {
  const isAdvanced = control.visibility === "advanced";
  const className = `control-field ${control.fieldClass || ""}`.trim();
  const trackAttributes = `data-track-control="${track.id}" data-control="${control.control}"`;
  const visibilityClass = isAdvanced ? "control-advanced" : "";
  const resolvedValue = control.control === "startNumber" ? track.startTime : track[control.control];

  if (control.type === "search") {
    return `
      <label class="control-field ${control.fieldClass}">
        <span>${control.label}</span>
        <input
          type="${control.attrs.type}"
          placeholder="${control.attrs.placeholder}"
          autocomplete="off"
          spellcheck="false"
          value=""
          class="${visibilityClass}"
          ${trackAttributes}
        >
      </label>
    `;
  }

  if (control.type === "select") {
    return `
      <label class="${className}">
        <span>${control.label}</span>
        <select class="${visibilityClass}" ${trackAttributes}>
          ${control.options
            .map(
              (option) =>
                `<option value="${option.value}" ${String(option.value) === String(track[control.control]) ? "selected" : ""}>${option.label}</option>`,
            )
            .join("")}
        </select>
      </label>
    `;
  }

  if (control.type === "range" || control.type === "number") {
    return `
      <label class="${className}">
        <span>${control.label}</span>
        <input
          type="${control.type}"
          min="${control.inputProps.min}"
          max="${control.inputProps.max ?? ""}"
          step="${control.inputProps.step}"
          value="${resolvedValue}"
          class="${visibilityClass}"
          ${trackAttributes}
        >
      </label>
    `;
  }

  return "";
}

function renderTrackFxChain(track) {
  return `
    <div class="fx-chain control-advanced" aria-label="${escapeHtml(track.name)} effects chain">
      <span class="fx-title">FX</span>
      ${FX_CONTROLS.map((fxControl) => renderFxControl(track, fxControl)).join("")}
    </div>
  `;
}

function renderFxControl(track, fxControl) {
  const fxValue = Number(track.fx[fxControl.key] ?? 0);
  const fxDisplay = Number.isInteger(fxControl.step)
    ? Math.round(fxValue)
    : fxValue.toFixed(2).replace(/\.?0+$/, "");

  return `
    <label class="control-field fx-field control-advanced">
      <span>${fxControl.label}</span>
      <output class="fx-value" for="${fxControl.key}-${track.id}" aria-hidden="true">${escapeHtml(fxDisplay)}</output>
      <input
        id="${fxControl.key}-${track.id}"
        type="range"
        min="${fxControl.min}"
        max="${fxControl.max}"
        step="${fxControl.step}"
        value="${track.fx[fxControl.key]}"
        data-track-control="${track.id}"
        data-control="${fxControl.key}"
        aria-label="${escapeHtml(`${track.name} ${fxControl.label}`)}"
      >
    </label>
  `;
}

function bindWorkstationControls() {
  if (typeof window.freemixBindWorkstationControls === "function") {
    window.freemixBindWorkstationControls();
    tracks.forEach((track) => applyVideoFx(track));
    renderArrangementPlayhead();
    window.freemixRender?.updateTransportRow?.();
    return;
  }

  if (bindWorkstationControls._pendingModuleBind) {
    return;
  }

  bindWorkstationControls._pendingModuleBind = true;
  window.setTimeout(() => {
    bindWorkstationControls._pendingModuleBind = false;
    bindWorkstationControls();
  }, 0);
}

function handleTrackControl(event) {
  const control = event.currentTarget;
  const track = tracks.find((item) => item.id === control.dataset.trackControl);
  if (!track) {
    return;
  }

  const controlName = control.dataset.control;

  if (controlName === "sourceSearch") {
    queueTrackSearch(track, control.value.trim());
    return;
  }

  if (controlName === "durationFilter") {
    track.durationFilter = control.value;
    const sourceSearch = document.querySelector(
      `[data-track-control="${track.id}"][data-control="sourceSearch"]`,
    );
    queueTrackSearch(track, sourceSearch?.value.trim() ?? "");
    return;
  }

  if (controlName === "blendMode") {
    track.blendMode = control.value;
    applyTrackBlend(track);
    return;
  }

  if (controlName === "startTime" || controlName === "startNumber") {
    track.startTime = Math.max(0, Number(control.value) || 0);
    syncStartControls(track);
    previewTrack(track);
  }

  if (controlName === "retriggersPerBar") {
    track.retriggersPerBar = Number(control.value);
    track.lastStep = -1;
    previewTrack(track);
  }

  if (controlName === "volume") {
    track.volume = Number(control.value);
    applyTrackVolume(track);
  }

  if (controlName in track.fx) {
    track.fx[controlName] = Number(control.value);
    const valueEl = control.parentElement?.querySelector(".fx-value");
    const fxDefinition = FX_CONTROL_INDEX[controlName];
    if (valueEl && fxDefinition) {
      const value =
        Number.isInteger(fxDefinition.step) || fxDefinition.step >= 1
          ? Math.round(track.fx[controlName])
          : track.fx[controlName].toFixed(2).replace(/\.?0+$/, "");
      valueEl.textContent = String(value);
    }
    applyTrackFx(track);
    applyVideoFx(track);
  }

  if (controlName === "muted") {
    track.muted = !track.muted;
    control.textContent = track.muted ? "Muted" : "On";
    control.setAttribute("aria-pressed", String(track.muted));
    applyTrackVolume(track);
  }

  if (controlName === "advanced") {
    track.showAdvanced = !track.showAdvanced;
    control.textContent = track.showAdvanced ? "Advanced" : "Adv";
    control.setAttribute("aria-pressed", String(track.showAdvanced));
    applyTrackControlVisibility(track);
  }
}

function startTransport() {
  if (startTransport.runningPromise) {
    return;
  }

  if (!tracks.some((track) => track.source)) {
    setStatus("Load a source", true);
    return;
  }

  stopTransport(false);
  const contextStart = ensureAudioContext();

  if (contextStart && typeof contextStart.then === "function") {
    startTransport.runningPromise = contextStart
      .catch(() => {})
      .finally(() => {
        startTransport.runningPromise = null;
        if (!document.hidden) {
          startTransportWithState();
        }
      });
    return;
  }

  startTransportWithState();
}

function startTransportWithState() {
  if (!tracks.some((track) => track.source)) {
    return;
  }

  tracks.forEach((track) => {
    track.lastStep = -1;
    track.nextTriggerAt = 0;
    track.stepMs = 0;
  });

  const now = performance.now();
  const startAt = now + 80;
  transport = {
    active: true,
    bpm: clamp(Number(document.querySelector("#bpmInput").value), 40, 220),
    startedAt: startAt,
    nextBeatAt: startAt,
    beatIndex: 0,
    arrangementStartStep: arrangement.step,
    arrangementStep: -1,
    frameId: null,
  };

  if (arrangement.enabled && hasArrangementClips()) {
    updateArrangementStep(arrangement.step, startAt, true);
  } else {
    updateTrackTriggerGrid(startAt);
  }

  window.freemixRender?.updateTransportRow?.();
  setStatus("Playing");
  tickTransport();
}

function stopTransport(resetVideos = true) {
  if (transport?.frameId) {
    cancelAnimationFrame(transport.frameId);
  }

  transport = null;
  window.freemixRender?.updateTransportRow?.();
  document.querySelectorAll(".beat-light").forEach((light) => light.classList.remove("active"));

  if (resetVideos) {
    tracks.forEach((track) => {
      const video = getTrackVideo(track);
      if (video) {
        video.pause();
        video.currentTime = safeStartTime(track, video);
      }
    });
  }

  if (tracks.some((track) => track.source)) {
    setStatus("Source ready");
  }
}

function hardStopPlayback(reason = "stopped") {
  if (reason && typeof reason === "string") {
    console.info(`audio stop: ${reason}`);
  }

  masterMuted = true;
  window.freemixRender?.updateTransportRow?.();

  stopTransport(true);
  tracks.forEach((track) => {
    const video = getTrackVideo(track);
    if (video) {
      video.muted = true;
      video.pause();
      video.currentTime = 0;
    }
  });

  setStatus("Audio stopped");
}

function tickTransport() {
  if (!transport?.active) {
    return;
  }

  const now = performance.now();
  const beatMs = 60000 / transport.bpm;
  const barMs = beatMs * 4;

  while (now >= transport.nextBeatAt) {
    const beat = transport.beatIndex % 4;
    renderBeat(beat);
    playMetronome(beat);
    transport.beatIndex += 1;
    transport.nextBeatAt += beatMs;
  }

  if (arrangement.enabled && hasArrangementClips()) {
    const elapsedBars = Math.floor(Math.max(0, now - transport.startedAt) / barMs);
    const arrangementLength = arrangement.clips.length || 1;
    const currentStep = (transport.arrangementStartStep + elapsedBars) % arrangementLength;
    updateArrangementStep(currentStep, transport.startedAt + elapsedBars * barMs);
  }

  tracks.forEach((track) => {
    if (!track.source || !track.stepMs) {
      return;
    }

    while (now >= track.nextTriggerAt) {
      triggerTrack(track, track.arrangementClip ?? track);
      track.nextTriggerAt += track.stepMs;
    }
  });

  transport.frameId = requestAnimationFrame(tickTransport);
}

function triggerTrack(track, clip = track) {
  const video = getTrackVideo(track);
  const cell = document.querySelector(`.video-cell[data-track-id="${track.id}"]`);
  if (!video || !cell) {
    return;
  }

  if (clip.source?.mediaUrl && video.src !== clip.source.mediaUrl) {
    video.src = clip.source.mediaUrl;
    video.load();
  }

  video.currentTime = safeStartTime(clip, video);
  setupTrackAudio(track, video);
  applyTrackVolume(track, clip);
  applyTrackFx(track, clip);
  applyVideoFx(track, clip);
  applyTrackBlend(track, clip);
  video.play().catch(() => {
    setStatus("Tap play again", true);
  });

  cell.classList.remove("triggered");
  window.requestAnimationFrame(() => cell.classList.add("triggered"));
}

function previewTrack(track) {
  if (!track.source || transport?.active) {
    return;
  }

  triggerTrack(track);
  window.setTimeout(() => {
    const video = getTrackVideo(track);
    if (video && !transport?.active) {
      video.pause();
    }
  }, 650);
}

function renderBeat(beat) {
  document.querySelectorAll(".beat-light").forEach((light, index) => {
    light.classList.toggle("active", index === beat);
  });
}

function playMetronome(beat) {
  if (masterMuted || !audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = beat === 0 ? 1320 : 880;
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.05);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.055);
}

function ensureAudioContext() {
  if (webAudioDisabled) {
    return Promise.resolve();
  }

  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    return audioContext.resume();
  }

  return Promise.resolve();
}

function updateTrackDuration(video) {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return;
  }

  const trackId = video.id.replace("video-", "");
  document
    .querySelectorAll(`[data-track-control="${trackId}"][data-control="startTime"]`)
    .forEach((range) => {
      range.max = String(Math.max(1, video.duration - 1));
    });

  document
    .querySelectorAll(`[data-track-control="${trackId}"][data-control="startNumber"]`)
    .forEach((number) => {
      number.max = String(Math.max(1, video.duration - 1));
    });
}

function syncStartControls(track) {
  document
    .querySelectorAll(`[data-track-control="${track.id}"][data-control="startTime"]`)
    .forEach((range) => {
      range.value = String(track.startTime);
    });

  document
    .querySelectorAll(`[data-track-control="${track.id}"][data-control="startNumber"]`)
    .forEach((number) => {
      number.value = track.startTime.toFixed(1);
    });
}

function applyTrackVolume(track, state = track) {
  const video = getTrackVideo(track);
  if (track.audio?.output) {
    track.audio.output.gain.value = state.muted ? 0 : state.volume;
  }

  if (video) {
    video.muted = false;
    video.volume = track.audio ? 1 : state.muted ? 0 : state.volume;
  }
}

function setupTrackAudio(track, video) {
  if (webAudioDisabled || !audioContext || !video) {
    return false;
  }

  if (track.audio && track.audio.mediaElement !== video) {
    disposeTrackAudio(track);
  }
  if (track.audio) {
    return true;
  }

  try {
    const source = audioContext.createMediaElementSource(video);
    const low = audioContext.createBiquadFilter();
    const mid = audioContext.createBiquadFilter();
    const high = audioContext.createBiquadFilter();
    const drive = audioContext.createWaveShaper();
    const dryGain = audioContext.createGain();
    const delay = audioContext.createDelay(1);
    const delayGain = audioContext.createGain();
    const reverb = audioContext.createConvolver();
    const reverbGain = audioContext.createGain();
    const output = audioContext.createGain();

    low.type = "lowshelf";
    low.frequency.value = 180;
    mid.type = "peaking";
    mid.frequency.value = 1100;
    mid.Q.value = 0.8;
    high.type = "highshelf";
    high.frequency.value = 3600;
    dryGain.gain.value = 1;
    delay.delayTime.value = 0.25;
    reverb.buffer = createReverbImpulse(audioContext);

    source.connect(low).connect(mid).connect(high).connect(drive);
    drive.connect(dryGain).connect(output);
    drive.connect(delay).connect(delayGain).connect(output);
    drive.connect(reverb).connect(reverbGain).connect(output);
    output.connect(audioContext.destination);

    track.audio = {
      mediaElement: video,
      source,
      low,
      mid,
      high,
      drive,
      delay,
      delayGain,
      reverb,
      reverbGain,
      output,
    };
    return true;
  } catch (error) {
    console.warn(error);
    webAudioDisabled = true;
    tracks.forEach((trackItem) => {
      disposeTrackAudio(trackItem);
    });
    track.audio = null;
    setStatus("WebAudio failed; using native clip audio");
    return false;
  }
}

function applyTrackFx(track, state = track) {
  const audio = track.audio;
  if (!audio) {
    return;
  }

  audio.low.gain.value = state.fx.eqLow;
  audio.mid.gain.value = state.fx.eqMid;
  audio.high.gain.value = state.fx.eqHigh;
  audio.drive.curve = createTubeCurve(state.fx.tube);
  audio.drive.oversample = "4x";
  audio.delay.delayTime.value = 0.12 + state.fx.delay * 0.5;
  audio.delayGain.gain.value = state.fx.delay * 0.42;
  audio.reverbGain.gain.value = state.fx.reverb * 0.45;
}

function applyVideoFx(track, state = track) {
  const cell = document.querySelector(`.video-cell[data-track-id="${track.id}"]`);
  if (!cell) {
    return;
  }

  const lowLift = Math.max(state.fx.eqLow, 0) / 12;
  const midCut = Math.max(-state.fx.eqMid, 0) / 12;
  const highLift = Math.max(state.fx.eqHigh, 0) / 12;
  const highCut = Math.max(-state.fx.eqHigh, 0) / 12;
  const tube = state.fx.tube;
  const delay = state.fx.delay;
  const reverb = state.fx.reverb;

  const brightness = 0.86 + highLift * 0.3 - highCut * 0.22 + lowLift * 0.06;
  const contrast = 1 + tube * 0.45 + Math.max(state.fx.eqMid, 0) * 0.018;
  const saturate = 0.92 + lowLift * 0.25 + highLift * 0.18 + tube * 0.75;
  const blur = reverb * 2.2 + highCut * 1.4 + midCut * 0.6;
  const hue = state.fx.eqMid * 1.6;

  cell.style.setProperty("--delay-ghost", delay.toFixed(2));
  cell.style.setProperty("--reverb-glow", reverb.toFixed(2));
  cell.style.setProperty(
    "--video-filter",
    `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) blur(${blur}px) hue-rotate(${hue}deg)`,
  );
}

function applyTrackBlend(track, state = track) {
  const cell = document.querySelector(`.video-cell[data-track-id="${track.id}"]`);
  if (!cell) {
    return;
  }

  Object.keys(BLEND_MODES).forEach((mode) => cell.classList.remove(`blend-${mode}`));
  cell.classList.add(`blend-${state.blendMode}`);
}

function disposeTrackAudio(track) {
  if (!track.audio) {
    return;
  }

  Object.values(track.audio).forEach((node) => {
    if (node?.disconnect) {
      try {
        node.disconnect();
      } catch {
        // Already disconnected.
      }
    }
  });

  track.audio = null;
}

function createTubeCurve(amount) {
  const samples = 256;
  const curve = new Float32Array(samples);
  const drive = 1 + amount * 36;

  for (let index = 0; index < samples; index += 1) {
    const x = (index * 2) / samples - 1;
    curve[index] = ((1 + drive) * x) / (1 + drive * Math.abs(x));
  }

  return curve;
}

function createReverbImpulse(context) {
  const seconds = 1.6;
  const length = context.sampleRate * seconds;
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 2.4;
    }
  }

  return impulse;
}

function safeStartTime(track, video) {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return track.startTime;
  }

  return Math.min(track.startTime, Math.max(video.duration - 0.2, 0));
}

function getTrackVideo(track) {
  return document.querySelector(`#video-${track.id}`);
}

function updateTrackTriggerGrid(startAt = performance.now()) {
  if (!transport) {
    return;
  }

  const beatMs = 60000 / transport.bpm;
  const barMs = beatMs * 4;
  tracks.forEach((track) => {
    track.arrangementClip = null;
    track.stepMs = barMs / track.retriggersPerBar;
    track.nextTriggerAt = startAt;
  });
}

function handleArrangementCell(event) {
  const cell = event.currentTarget;
  const track = tracks.find((item) => item.id === cell.dataset.arrTrack);
  const stepIndex = Number(cell.dataset.arrStep);
  if (!track || !Number.isInteger(stepIndex)) {
    return;
  }

  if (!track.source) {
    selectArrangementStep(stepIndex);
    setStatus(`Bar ${stepIndex + 1} selected`);
    return;
  }

  arrangement.clips[stepIndex][track.id] = captureTrackClip(track);
  selectArrangementStep(stepIndex);
  setStatus(`${track.name}: placed in ${stepIndex + 1}`);
  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
    window.freemixRender.updateTrackRow?.(track);
    window.freemixRender.updateArrangementPlayhead?.();
    return;
  }

  renderWorkstation();
}

function handleArrangementStepLabel(event) {
  const stepIndex = Number(event.currentTarget.dataset.arrStep);
  if (!Number.isInteger(stepIndex)) {
    return;
  }

  if (arrangementCopyMode) {
    if (stepIndex === arrangementCopySourceStep) {
      setStatus("Choose a destination section to paste");
      return;
    }

    pasteArrangementSection(stepIndex);
    return;
  }

  selectArrangementStep(stepIndex);
}

function toggleArrangementCopyMode() {
  arrangementCopyMode = !arrangementCopyMode;
  if (arrangementCopyMode) {
    arrangementCopySourceStep = arrangement.step;
    setStatus(`Copying section ${arrangementCopySourceStep + 1}; click destination sections`);
  } else {
    arrangementCopySourceStep = null;
    setStatus("Copy mode off");
  }

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
    markAppStateDirty();
    return;
  }

  renderWorkstation();
  markAppStateDirty();
}

function pasteArrangementSection(targetStep) {
  if (arrangementCopySourceStep === null) {
    setStatus("Pick a source section first");
    return;
  }

  const sourceStep = arrangement.clips[arrangementCopySourceStep];
  arrangement.clips[targetStep] = cloneArrangementStep(sourceStep);
  arrangement.step = targetStep;

  if (
    transport?.active &&
    arrangement.enabled &&
    hasArrangementClips() &&
    transport.arrangementStep === targetStep
  ) {
    updateArrangementStep(targetStep, performance.now(), true);
  }
  setStatus(`Section ${arrangementCopySourceStep + 1} pasted to ${targetStep + 1}`);

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
    markAppStateDirty();
    return;
  }

  renderWorkstation();
  markAppStateDirty();
}

function toggleArrangement() {
  arrangement.enabled = !arrangement.enabled;
  if (transport?.active) {
    const now = performance.now();
    if (arrangement.enabled && hasArrangementClips()) {
      updateArrangementStep(arrangement.step, now, true);
    } else {
      updateTrackTriggerGrid(now);
    }
  }

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
    markAppStateDirty();
  } else {
    renderWorkstation();
  }
  setStatus(arrangement.enabled ? "Arrangement on" : "Arrangement off");
  markAppStateDirty();
}

function clearArrangement() {
  arrangementCopyMode = false;
  arrangementCopySourceStep = null;
  arrangement = createInitialArrangement();
  if (transport?.active) {
    updateTrackTriggerGrid(performance.now());
  }

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
  } else {
    renderWorkstation();
  }
  setStatus("Arrangement cleared");
  markAppStateDirty();
}

function updateArrangementStepCount(event) {
  const nextLength = Number(event.target.value);
  if (!Number.isInteger(nextLength) || !ARRANGEMENT_STEP_OPTIONS.includes(nextLength)) {
    return;
  }

  const previousArrangement = arrangement;
  stopTransport(false);
  arrangementCopyMode = false;
  arrangementCopySourceStep = null;
  arrangementStepCount = nextLength;
  arrangement = createInitialArrangement(nextLength);
  if (previousArrangement?.clips) {
    for (let index = 0; index < Math.min(previousArrangement.clips.length, arrangement.clips.length); index += 1) {
      arrangement.clips[index] = previousArrangement.clips[index] || {};
    }
  }

  const previousStep = Number(previousArrangement?.step) || 0;
  arrangement.step = Math.min(previousStep, nextLength - 1);

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
    window.freemixRender.updateSourceStrip?.();
  } else {
    renderWorkstation();
  }
  setStatus(`Arrangement: ${nextLength} bars`);
  markAppStateDirty();
}

function updateArrangementStep(stepIndex, barStartAt, force = false) {
  if (!transport || (!force && transport.arrangementStep === stepIndex)) {
    return;
  }

  transport.arrangementStep = stepIndex;
  if (force) {
    transport.arrangementStartStep = stepIndex;
  }
  arrangement.step = stepIndex;
  const beatMs = 60000 / transport.bpm;
  const barMs = beatMs * 4;
  const step = arrangement.clips[stepIndex];

  tracks.forEach((track) => {
    const clip = step[track.id] ?? null;
    track.arrangementClip = clip;
    track.stepMs = clip ? barMs / clip.retriggersPerBar : 0;
    track.nextTriggerAt = barStartAt;
    track.lastStep = -1;
  });

  renderArrangementPlayhead();
}

function selectArrangementStep(stepIndex) {
  arrangement.step = stepIndex;

  if (transport?.active && arrangement.enabled && hasArrangementClips()) {
    const now = performance.now();
    transport.startedAt = now;
    transport.nextBeatAt = now;
    transport.beatIndex = 0;
    transport.arrangementStartStep = stepIndex;
    updateArrangementStep(stepIndex, now, true);
    return;
  }

  renderArrangementPlayhead();
}

function renderArrangementPlayhead() {
  document.querySelectorAll(".arrangement-cell").forEach((cell) => {
    cell.classList.toggle("playing", Number(cell.dataset.arrStep) === arrangement.step);
  });
}

function hasArrangementClips() {
  return arrangement.clips.some((step) => Object.keys(step).length > 0);
}

function captureTrackClip(track) {
  return {
    source: track.source,
    startTime: track.startTime,
    retriggersPerBar: track.retriggersPerBar,
    volume: track.volume,
    muted: track.muted,
    blendMode: track.blendMode,
    fx: { ...track.fx },
  };
}

function cloneArrangementClip(clip) {
  return {
    ...clip,
    fx: { ...clip.fx },
  };
}

function cloneArrangementStep(step) {
  return Object.fromEntries(
    Object.entries(step).map(([trackId, clip]) => [trackId, cloneArrangementClip(clip)]),
  );
}

function queueTrackSearch(track, query) {
  window.clearTimeout(track.searchTimer);

  if (query.length < 2) {
    renderTrackResults(track, []);
    return;
  }

  track.searchTimer = window.setTimeout(() => searchTrackSource(track, query), SEARCH_DELAY_MS);
}

async function searchTrackSource(track, query) {
  const requestId = ++trackSearchRequestCounter;
  track.searchRequestId = requestId;
  renderTrackResultsMessage(track, "Searching...");

  const params = new URLSearchParams({
    q: `mediatype:(movies) AND (${query})`,
    sort: "downloads desc",
    rows: "24",
    page: "1",
    output: "json",
  });

  ["identifier", "title", "creator", "year", "description", "runtime"].forEach((field) => {
    params.append("fl[]", field);
  });

  try {
    const docs = await performArchiveSearch(params);
    if (track.searchRequestId !== requestId) {
      return;
    }

    const results = rankAndFilterResults(normalizeResults(docs), track.durationFilter);
    if (results.length) {
      renderTrackResults(track, results);
    } else {
      renderTrackResultsMessage(track, "No matches");
    }
  } catch (error) {
    if (track.searchRequestId !== requestId) {
      return;
    }

    renderTrackResultsMessage(track, "Search failed");
    console.error(error);
  }
}

function rankAndFilterResults(results, filterKey = "any") {
  const filter = DURATION_FILTERS[filterKey] ?? DURATION_FILTERS.any;

  return results
    .filter((result) => {
      if (filterKey === "any") {
        return true;
      }

      return result.durationSeconds >= filter.min && result.durationSeconds < filter.max;
    })
    .sort((a, b) => a.durationSeconds - b.durationSeconds || a.title.localeCompare(b.title))
    .slice(0, 6);
}

function renderTrackResults(track, results) {
  const resultsEl = document.querySelector(`#results-${track.id}`);
  if (!resultsEl) {
    return;
  }

  window.freemixTrackSourceCache = window.freemixTrackSourceCache || {};
  window.freemixTrackSourceCache[track.id] = Object.fromEntries(
    results.map((result) => [result.identifier, result]),
  );

  if (!results.length) {
    window.freemixTrackSourceCache = window.freemixTrackSourceCache || {};
    window.freemixTrackSourceCache[track.id] = {};
    resultsEl.hidden = true;
    resultsEl.innerHTML = "";
    return;
  }

  resultsEl.hidden = false;
  resultsEl.innerHTML = results
    .map(
      (result) => `
        <button class="track-result-button" type="button" data-track-id="${track.id}" data-source-id="${result.identifier}">
          <img src="${result.thumbnail}" alt="" loading="lazy">
          <span>
            <strong>${escapeHtml(result.title)}</strong>
            <small>${escapeHtml(formatResultMeta(result))}</small>
          </span>
        </button>
      `,
    )
    .join("");
}

function formatResultMeta(result) {
  const credit = [result.creator, result.year].filter(Boolean).join(" - ") || result.identifier;
  return [result.runtime, credit].filter(Boolean).join(" | ");
}

function renderTrackResultsMessage(track, message) {
  const resultsEl = document.querySelector(`#results-${track.id}`);
  if (!resultsEl) {
    return;
  }

  resultsEl.hidden = false;
  resultsEl.innerHTML = `<div class="track-result-message">${escapeHtml(message)}</div>`;
}

async function loadTrackSource(track, result) {
  stopTransport(false);
  disposeTrackAudio(track);
  setStatus(`${track.name}: loading`);
  renderTrackResultsMessage(track, "Loading media...");

  try {
    const source = await fetchPlayableSource(result);
    track.source = source;
    track.startTime = 0;
    track.lastStep = -1;
    selectedSource = tracks.find((item) => item.source)?.source ?? source;
    if (window.freemixRender?.updateTrackRow) {
      window.freemixRender.updateTrackRow(track);
      window.freemixRender.updateSourceStrip?.();
    } else {
      renderWorkstation();
    }
    setStatus(`${track.name}: ready`);
  } catch (error) {
    renderTrackResultsMessage(track, "No playable file");
    setStatus(`${track.name}: no file`, true);
    console.warn(error);
  }
}

function handleTrackSearchKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  const track = tracks.find((item) => item.id === event.currentTarget.dataset.trackControl);
  if (track) {
    renderTrackResults(track, []);
  }
}

function createInitialTracks() {
  return TRACKS.map((track, index) => ({
    ...track,
    id: `track-${index + 1}`,
    showAdvanced: false,
    startTime: index * 2,
    retriggersPerBar: [1, 2, 4, 8][index],
    volume: 0.55,
    muted: false,
    blendMode: ["normal", "screen", "difference", "add"][index],
    fx: {
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      tube: 0,
      delay: 0,
      reverb: 0,
    },
    audio: null,
    lastStep: -1,
    nextTriggerAt: 0,
    stepMs: 0,
    arrangementClip: null,
    source: null,
    durationFilter: "quick",
    searchTimer: null,
    searchRequestId: 0,
  }));
}

function createInitialArrangement(steps = arrangementStepCount) {
  return {
    enabled: false,
    step: 0,
    steps,
    clips: Array.from({ length: steps }, () => ({})),
  };
}

function setStatus(message, isError = false) {
  if (window.freemixRender?.updateStatus) {
    window.freemixRender.updateStatus(message, isError);
    return;
  }

  statusPill.textContent = message;
  statusPill.classList.toggle("error", isError);
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value || min, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

(function initFreemixRuntimeUX() {
  if (window.appUXPatched) {
    return;
  }

  const DEMO_VIDEO_SOURCE = {
    identifier: "freemix-demo",
    title: "Debug sample loop",
    creator: "Sample",
    year: "2026",
    runtime: "0:16",
    mediaUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    mediaName: "demo.mp4",
    mediaFormat: "video/mp4",
    archiveUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
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
        controlName && ["muted", "startTime", "startNumber", "retriggersPerBar", "volume", "blendMode", "durationFilter", "advanced", "fx"].includes(
          controlName,
        );

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

  window.appUXPatched = true;
})();
