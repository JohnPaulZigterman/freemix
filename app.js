const playerPanel = document.querySelector("#playerPanel");
const statusPill = document.querySelector("#statusPill");

const IA_SEARCH_URL = "https://archive.org/advancedsearch.php";
const IA_METADATA_URL = "https://archive.org/metadata";
const IA_DOWNLOAD_URL = "https://archive.org/download";
const SEARCH_DELAY_MS = 280;
const SEARCH_QUERY_MIN_LENGTH = 1;
const SEARCH_QUERY_TOKEN_MIN_LENGTH = 2;
const SEARCH_RESULT_FIELDS = Object.freeze([
  "identifier",
  "title",
  "creator",
  "description",
  "subject",
  "collection",
  "year",
  "runtime",
  "downloads",
]);
const SEARCHABLE_TEXT_FIELDS = Object.freeze(["title", "creator", "description", "subject", "identifier", "collection"]);
const SEARCH_QUERY_VARIANT_TARGET = 90;
const SEARCH_RESULT_CACHE_TTL_MS = 180_000;
const SEARCH_RESULT_CACHE_MAX_SIZE = 32;
const SESSION_LIBRARY_STORAGE_KEY = "freemix.sessions.v1";
const SESSION_RECENT_LIMIT = 8;
const EXPLICIT_SEARCH_RESULT_PATTERNS = Object.freeze([
  /(^|[^a-z0-9])hentai([^a-z0-9]|$)/,
  /(^|[^a-z0-9])porn([^a-z0-9]|$)/,
  /(^|[^a-z0-9])porno([^a-z0-9]|$)/,
  /(^|[^a-z0-9])pornography([^a-z0-9]|$)/,
  /(^|[^a-z0-9])pornographic([^a-z0-9]|$)/,
  /(^|[^a-z0-9])xxx([^a-z0-9]|$)/,
  /(^|[^a-z0-9])x[- ]rated([^a-z0-9]|$)/,
  /(^|[^a-z0-9])hardcore[ -]+porn([^a-z0-9]|$)/,
  /(^|[^a-z0-9])hardcore[ -]+sex([^a-z0-9]|$)/,
  /(^|[^a-z0-9])sex[ -]+tape([^a-z0-9]|$)/,
  /(^|[^a-z0-9])(pornhub|xvideos|xnxx|xhamster|redtube|youporn|brazzers|bangbros)([^a-z0-9]|$)/,
]);
const SOURCE_METADATA_CACHE_TTL_MS = 20 * 60 * 1000;
const SOURCE_METADATA_CACHE_MAX_SIZE = 48;
const SEARCH_REQUEST_IN_FLIGHT_TTL_MS = 8_000;
const MAX_BEAT_CATCHUP_PER_FRAME = 8;
const MAX_TRACK_TRIGGER_BURST_PER_FRAME = 8;
const SOURCE_METADATA_REQUEST_TTL_MS = 60_000;
const LIVE_CONTROL_UPDATE_DEBOUNCE_MS = 45;
const LIVE_CONTROL_STATE_PERSIST_DEBOUNCE_MS = 220;
const LIVE_CONTROL_DEBOUNCE_CONTROLS = Object.freeze(
  new Set([
    "volume",
    "speed",
    "pitch",
    "eqLow",
    "eqMid",
    "eqHigh",
    "tube",
    "delay",
    "reverb",
    "opacity",
  ]),
);
const SCENE_EDITABLE_CONTROLS = Object.freeze(
  new Set([
    "durationFilter",
    "blendMode",
    "opacity",
    "speed",
    "pitch",
    "startTime",
    "startNumber",
    "retriggersPerBar",
    "volume",
    "muted",
    "eqLow",
    "eqMid",
    "eqHigh",
    "tube",
    "delay",
    "reverb",
  ]),
);
const REVERB_BUFFER_CACHE = new WeakMap();
const TUBE_CURVE_CACHE = new Map();
let metronomeGain = null;
const EXPORT_FRAME_RATE = 30;
const EXPORT_CANVAS_MAX_WIDTH = 1280;
const EXPORT_CANVAS_MAX_HEIGHT = 720;
const EXPORT_BLEND_MODE_MAP = Object.freeze({
  normal: "source-over",
  screen: "screen",
  multiply: "multiply",
  add: "lighter",
  difference: "difference",
  exclusion: "exclusion",
  dodge: "color-dodge",
  hard: "hard-light",
});
const EXPORT_MEDIA_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const TRACK_LOOKUP = new Map();
const UI_NODE_CACHE = {
  beatLights: null,
};
const SEARCH_ROWS_PER_REQUEST = 75;
const SEARCH_RESULTS_LIMIT = 18;
const SEARCH_RESULT_MAX_CONTRIBUTIONS_PER_CREATOR = 4;
const SEARCH_RESULT_CACHE_STORAGE_KEY = "freemix.searchResultCache.v1";
const SEARCH_RESULT_CACHE_PERSIST_TTL_MS = 6 * 60 * 60 * 1000;
const SOURCE_METADATA_CACHE_STORAGE_KEY = "freemix.sourceMetadataCache.v1";
const SOURCE_METADATA_CACHE_PERSIST_TTL_MS = 8 * 60 * 60 * 1000;
const SOURCE_METADATA_CACHE_PERSIST_MAX_ENTRIES = 40;
const SEARCH_NETWORK_TIMEOUT_MS = 9000;
const APP_STATE_PROXY_KEYS = Object.freeze([
  "selectedSource",
  "transport",
  "audioContext",
  "webAudioDisabled",
  "masterMuted",
  "metronomeEnabled",
  "arrangementStepCount",
  "arrangementCopyMode",
  "arrangementCopySourceStep",
  "tracks",
  "arrangement",
  "trackSearchRequestCounter",
  "userOnboarding",
]);
const APP_STATE_PROXY_DIRTY_KEYS = new Set([
  "arrangementStepCount",
  "masterMuted",
  "metronomeEnabled",
  "userOnboarding",
]);
const DEFAULT_BPM = 92;
const DEFAULT_ARRANGEMENT_STEPS = 8;
const MIN_ARRANGEMENT_STEPS = 1;
const MAX_ARRANGEMENT_STEPS = 64;
const ARRANGEMENT_STEP_OPTIONS = Array.from(
  { length: MAX_ARRANGEMENT_STEPS - MIN_ARRANGEMENT_STEPS + 1 },
  (_, index) => MIN_ARRANGEMENT_STEPS + index,
);
const DEFAULT_TIME_SIGNATURE = "4/4";
const TIME_SIGNATURE_OPTIONS = Object.freeze([
  { value: "2/4", label: "2/4", numerator: 2, denominator: 4, beatsPerBar: 2, noteValue: 4 },
  { value: "3/4", label: "3/4", numerator: 3, denominator: 4, beatsPerBar: 3, noteValue: 4 },
  { value: "4/4", label: "4/4", numerator: 4, denominator: 4, beatsPerBar: 4, noteValue: 4 },
  { value: "5/4", label: "5/4", numerator: 5, denominator: 4, beatsPerBar: 5, noteValue: 4 },
  { value: "6/8", label: "6/8", numerator: 6, denominator: 8, beatsPerBar: 6, noteValue: 8 },
  { value: "7/8", label: "7/8", numerator: 7, denominator: 8, beatsPerBar: 7, noteValue: 8 },
]);
const TIME_SIGNATURE_LOOKUP = Object.freeze(
  Object.fromEntries(TIME_SIGNATURE_OPTIONS.map((signature) => [signature.value, signature])),
);
const TRACK_NAME_MAX_LENGTH = 40;
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
const BLEND_MODE_OPTIONS = Object.entries(BLEND_MODES).map(([value, label]) => ({ value, label }));
const MAX_TRACK_COUNT = 4;
const DEFAULT_TRACK_COUNT = 1;
const TRACK_COLORS = ["green", "amber", "blue", "red"];
const TRACK_BLEND_DEFAULTS = ["normal", "screen", "difference", "add"];
const TRACK_RETRIGGER_DEFAULTS = [1, 2, 4, 8];
const RETRIGGER_LABELS = {
  1: "Whole",
  2: "Half",
  3: "Triplet",
  4: "Quarter",
  5: "Quintuplet",
  6: "Sextuplet",
  7: "Septuplet",
  8: "Eighth",
};
const DURATION_FILTERS = {
  any: { label: "Any", min: 0, max: Infinity },
  quick: { label: "< 5m", min: 0, max: 5 * 60 },
  short: { label: "< 15m", min: 0, max: 15 * 60 },
  medium: { label: "15-30m", min: 15 * 60, max: 30 * 60 },
  long: { label: "30m+", min: 30 * 60, max: Infinity },
};
const QUICKSTART_SAMPLE_QUERY = "lo-fi loop";
const AV_READY_TIMEOUT_MS = 1200;
const FX_CONTROLS = [
  { key: "eqLow", label: "EQ Low", min: -12, max: 12, step: 1 },
  { key: "eqMid", label: "EQ Mid", min: -12, max: 12, step: 1 },
  { key: "eqHigh", label: "EQ High", min: -12, max: 12, step: 1 },
  { key: "tube", label: "Tube", min: 0, max: 1, step: 0.01 },
  { key: "delay", label: "Delay", min: 0, max: 1, step: 0.01 },
  { key: "reverb", label: "Reverb", min: 0, max: 1, step: 0.01 },
];
const FX_CONTROL_INDEX = Object.freeze(Object.fromEntries(FX_CONTROLS.map((entry) => [entry.key, entry])));
const sourceMetadataCache = new Map();
const sourceMetadataInflight = new Map();

const TRACK_CONTROL_SECTIONS = {
  source: [
    {
      control: "sourceSearch",
      type: "search",
      label: "Find",
      icon: "◉",
      tooltip: "Search for a source clip",
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
      icon: "⏱",
      tooltip: "Filter clips by length",
      fieldClass: "duration-filter",
      options: Object.entries(DURATION_FILTERS).map(([value, filter]) => ({
        value,
        label: filter.label,
      })),
    },
  ],
  timing: [
    {
      control: "startTime",
      type: "range",
      label: "Anchor",
      icon: "⎋",
      tooltip: "Anchor start point in seconds",
      fieldClass: "start-field",
      inputProps: {
        min: "0",
        max: "",
        step: "0.1",
      },
    },
    {
      control: "startNumber",
      type: "number",
      label: "Sec",
      icon: "#",
      tooltip: "Anchor offset override",
      fieldClass: "compact-number",
      inputProps: {
        min: "0",
        step: "0.1",
      },
    },
  ],
  density: [
    {
      control: "retriggersPerBar",
      type: "select",
      label: "Density",
      icon: "♫",
      tooltip: "How often this track retriggers each bar",
      fieldClass: "density-field",
      options: Object.entries(RETRIGGER_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
  ],
  performance: [
    {
      control: "volume",
      type: "range",
      label: "Level",
      icon: "∥",
      tooltip: "Track output level",
      fieldClass: "volume-field",
      inputProps: {
        min: "0",
        max: "1",
        step: "0.01",
      },
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
let arrangementHasClips = false;
let arrangementDeleteMode = false;
let isExportingVideo = false;
const ARRANGEMENT_SCENE_COLORS = Object.freeze([
  { id: "emerald", label: "Emerald", value: "#16c784" },
  { id: "amber", label: "Amber", value: "#f0b43c" },
  { id: "blue", label: "Blue", value: "#55a8ff" },
  { id: "red", label: "Red", value: "#ff625a" },
  { id: "violet", label: "Violet", value: "#b678ff" },
  { id: "teal", label: "Teal", value: "#36d6d0" },
]);
const DEFAULT_SCENE_COLOR_INDEX = 0;

function normalizeArrangementState(targetArrangement, targetStepCount) {
  const arrangementState = targetArrangement;
  if (!arrangementState || typeof arrangementState !== "object") {
    return;
  }

  const stepCount = clamp(
    Number.isFinite(Number(targetStepCount)) ? Math.floor(Number(targetStepCount)) : DEFAULT_ARRANGEMENT_STEPS,
    MIN_ARRANGEMENT_STEPS,
    MAX_ARRANGEMENT_STEPS,
  );
  const existingClips = Array.isArray(arrangementState.clips) ? arrangementState.clips : [];
  arrangementState.clips = existingClips
    .slice(0, stepCount)
    .map((clip) => (clip && typeof clip === "object" && !Array.isArray(clip) ? clip : {}));
  while (arrangementState.clips.length < stepCount) {
    arrangementState.clips.push({});
  }

  const existingSceneColors = Array.isArray(arrangementState.sceneColors) ? arrangementState.sceneColors : [];
  arrangementState.sceneColors = existingSceneColors
    .slice(0, stepCount)
    .map((colorIndex) => normalizeSceneColorIndex(colorIndex));
  while (arrangementState.sceneColors.length < stepCount) {
    arrangementState.sceneColors.push(DEFAULT_SCENE_COLOR_INDEX);
  }

  arrangementState.step = Number.isFinite(Number(arrangementState.step))
    ? clamp(Math.floor(Number(arrangementState.step)), 0, arrangementState.clips.length - 1)
    : 0;
  arrangementState.enabled = !!arrangementState.enabled;
  arrangementState.steps = arrangementState.clips.length;
}

const preferredStartupTrackCount =
  typeof appStateManager.getPreferredTrackCount === "function"
    ? appStateManager.getPreferredTrackCount()
    : DEFAULT_TRACK_COUNT;

if (!Array.isArray(appState.tracks) || appState.tracks.length === 0) {
  appState.tracks = createInitialTracks(preferredStartupTrackCount || DEFAULT_TRACK_COUNT);
} else if (appState.tracks.length > MAX_TRACK_COUNT) {
  appState.tracks = appState.tracks.slice(0, MAX_TRACK_COUNT);
}

if (typeof appStateManager.hydrateTracks === "function") {
  appStateManager.hydrateTracks(appState.tracks);
}

if (!appState.arrangement) {
  appState.arrangement = createInitialArrangement(appState.arrangementStepCount || DEFAULT_ARRANGEMENT_STEPS);
}
if (typeof appStateManager.hydrateArrangement === "function") {
  appStateManager.hydrateArrangement(appState.arrangement);
}
normalizeArrangementState(appState.arrangement, appState.arrangementStepCount || DEFAULT_ARRANGEMENT_STEPS);
refreshArrangementHasClipsState(appState.arrangement);

if (!appState.userOnboarding || !appState.userOnboarding.phase) {
  appState.userOnboarding = { phase: "seed", needsHint: true };
}

const tracks = appState.tracks;
let arrangement = appState.arrangement;
if (appState.transport && typeof appState.transport === "object") {
  if (appState.transport.active || appState.transport.frameId) {
    appState.transport = null;
  } else {
    appState.transport.active = false;
    appState.transport.frameId = null;
  }
}
let transport = appState.transport || null;

appState.tracks = tracks;
appState.arrangement = arrangement;
appState.transport = transport;

refreshTrackLookup();
tracks.forEach((track) => {
  if (typeof track.solo !== "boolean") {
    track.solo = false;
  }
});

function normalizeTrackPreferences(track) {
  if (!track || typeof track !== "object") {
    return;
  }

  track.showAdvanced = !!track.showAdvanced;
  track.collapsed = !!track.collapsed;
  track.solo = !!track.solo;
  track.muted = !!track.muted;

  track.startTime = Number.isFinite(Number(track.startTime)) ? Number(track.startTime) : 0;
  track.volume = Number.isFinite(Number(track.volume)) ? Number(track.volume) : 0.55;
  track.opacity = Number.isFinite(Number(track.opacity)) ? clamp(track.opacity, 0, 1) : 1;
  track.speed = Number.isFinite(Number(track.speed)) ? clamp(track.speed, 0.5, 2) : 1;
  track.pitch = Number.isFinite(Number(track.pitch)) ? clamp(track.pitch, -12, 12) : 0;

  track.retriggersPerBar = normalizeRetriggersPerBar(track.retriggersPerBar);
  track.blendMode = TRACK_BLEND_DEFAULTS.includes(track.blendMode)
    ? track.blendMode
    : TRACK_BLEND_DEFAULTS[0];
  track.durationFilter = DURATION_FILTERS[track.durationFilter] ? track.durationFilter : "quick";

  track.fx = track.fx || {};
  FX_CONTROLS.forEach((control) => {
    const currentValue = track.fx[control.key];
    track.fx[control.key] = Number.isFinite(Number(currentValue)) ? Number(currentValue) : control.min;
  });

  track.searchTimer = null;
  track.searchRequestId = Number.isFinite(Number(track.searchRequestId)) ? Number(track.searchRequestId) : 0;
  track.mediaStatus = typeof track.mediaStatus === "string" ? track.mediaStatus : (track.source ? "ready" : "empty");
}

tracks.forEach(normalizeTrackPreferences);
function syncArrangementState(nextArrangement) {
  arrangement = nextArrangement;
  appState.arrangement = nextArrangement;
}

function syncTransportState(nextTransport) {
  transport = nextTransport;
  appState.transport = nextTransport;
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

function resolvePreferredBpm() {
  return clamp(Number(appState.preferredBpm), 40, 220);
}

function resolvePreferredTimeSignature(rawValue = appState.preferredTimeSignature) {
  return TIME_SIGNATURE_LOOKUP[String(rawValue || "").trim()] || TIME_SIGNATURE_LOOKUP[DEFAULT_TIME_SIGNATURE];
}

function getTransportBeatsPerBar(targetTransport = transport) {
  const transportBeats = Number(targetTransport?.beatsPerBar);
  if (Number.isFinite(transportBeats)) {
    return Math.max(1, Math.floor(transportBeats));
  }

  return Number(resolvePreferredTimeSignature().beatsPerBar);
}

function getTransportBeatMs(targetTransport = transport) {
  const transportBeatMs = Number(targetTransport?.beatMs);
  if (Number.isFinite(transportBeatMs)) {
    return transportBeatMs;
  }

  const beatBpm = Number.isFinite(Number(targetTransport?.bpm)) ? Number(targetTransport.bpm) : resolvePreferredBpm();
  const noteValue = Number.isFinite(Number(targetTransport?.timeSignatureNoteValue))
    ? Number(targetTransport.timeSignatureNoteValue)
    : resolvePreferredTimeSignature().noteValue;
  return (60000 / beatBpm) * (4 / noteValue);
}

function getTransportTimingFromState(nextBpm = resolvePreferredBpm(), nextTimeSignature = resolvePreferredTimeSignature()) {
  const safeBpm = clamp(Number(nextBpm), 40, 220);
  const timeSignature = resolvePreferredTimeSignature(nextTimeSignature?.value || nextTimeSignature);
  const beatMs = (60000 / safeBpm) * (4 / timeSignature.noteValue);
  return {
    bpm: safeBpm,
    beatsPerBar: timeSignature.beatsPerBar,
    noteValue: timeSignature.noteValue,
    timeSignature: timeSignature.value,
    numerator: timeSignature.numerator,
    denominator: timeSignature.denominator,
    beatMs,
    barMs: beatMs * timeSignature.beatsPerBar,
  };
}

function syncTransportTiming(nextState = {}) {
  if (!transport) {
    return;
  }

  const timing = getTransportTimingFromState(nextState?.bpm, nextState?.timeSignature || appState.preferredTimeSignature);
  transport.bpm = timing.bpm;
  transport.beatMs = timing.beatMs;
  transport.barMs = timing.barMs;
  transport.beatsPerBar = timing.beatsPerBar;
  transport.timeSignature = timing.timeSignature;
  transport.timeSignatureNumerator = timing.numerator;
  transport.timeSignatureDenominator = timing.denominator;
  transport.timeSignatureNoteValue = timing.noteValue;

  const now = performance.now();
  transport.nextBeatAt = now;
  transport.beatIndex = 0;
  if (arrangement.enabled && hasArrangementClips()) {
    updateArrangementStep(arrangement.step, now, true);
  } else {
    updateTrackTriggerGrid(now);
  }

  window.freemixRender?.updateTransportRow?.();
  markAppStateDirty();
}

const searchResultCache = new Map();
const searchRequestInflight = new Map();
const liveControlSchedulers = new Map();
const startTimeControlTrackers = new Map();
let arrangementPlayheadStep = -1;
let activeBeatLightIndex = -1;
let liveControlPersistTimer = null;
let arrangementPlayheadUpdateFrame = null;
let searchResultCachePersistTimer = null;
let sourceMetadataCachePersistTimer = null;
let arrangementClipboardStep = null;
let arrangementClipboardClips = [];
let selectedArrangementClipKeys = new Set();
let arrangementUndoStack = [];
let arrangementRedoStack = [];
let debugPanelVisible = false;
let debugPanelFrame = null;
const ARRANGEMENT_HISTORY_LIMIT = 50;

function cloneArrangementHistoryPayload(payload) {
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return null;
  }
}

function captureArrangementEdit(label = "Arrangement edit") {
  if (!arrangement?.clips) {
    return;
  }

  const snapshot = cloneArrangementHistoryPayload({
    label,
    arrangementStepCount,
    arrangement,
  });
  if (!snapshot) {
    return;
  }

  arrangementUndoStack.push(snapshot);
  if (arrangementUndoStack.length > ARRANGEMENT_HISTORY_LIMIT) {
    arrangementUndoStack.shift();
  }
  arrangementRedoStack = [];
}

function restoreArrangementHistorySnapshot(snapshot) {
  if (!snapshot?.arrangement) {
    return false;
  }

  const nextStepCount = clamp(
    Number(snapshot.arrangementStepCount) || DEFAULT_ARRANGEMENT_STEPS,
    MIN_ARRANGEMENT_STEPS,
    MAX_ARRANGEMENT_STEPS,
  );
  const nextArrangement = cloneArrangementHistoryPayload(snapshot.arrangement);
  if (!nextArrangement) {
    return false;
  }

  if (transport?.active) {
    stopTransport(false);
  }

  arrangementStepCount = nextStepCount;
  syncArrangementState(nextArrangement);
  normalizeArrangementState(arrangement, arrangementStepCount);
  refreshArrangementHasClipsState();
  bindTracksToArrangementStep(arrangement.step);
  renderWorkstation();
  markAppStateDirty(true);
  return true;
}

function undoArrangementEdit() {
  const snapshot = arrangementUndoStack.pop();
  if (!snapshot) {
    setStatus("Nothing to undo");
    return false;
  }

  const current = cloneArrangementHistoryPayload({
    label: "Redo arrangement edit",
    arrangementStepCount,
    arrangement,
  });
  if (current) {
    arrangementRedoStack.push(current);
  }

  if (!restoreArrangementHistorySnapshot(snapshot)) {
    setStatus("Could not undo arrangement edit", true);
    return false;
  }

  setStatus(`${snapshot.label || "Arrangement edit"} undone`);
  return true;
}

function redoArrangementEdit() {
  const snapshot = arrangementRedoStack.pop();
  if (!snapshot) {
    setStatus("Nothing to redo");
    return false;
  }

  const current = cloneArrangementHistoryPayload({
    label: "Undo arrangement edit",
    arrangementStepCount,
    arrangement,
  });
  if (current) {
    arrangementUndoStack.push(current);
  }

  if (!restoreArrangementHistorySnapshot(snapshot)) {
    setStatus("Could not redo arrangement edit", true);
    return false;
  }

  setStatus("Arrangement edit redone");
  return true;
}

function readJsonFromStorage(storageKey, fallback) {
  if (typeof localStorage === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonToStorage(storageKey, payload) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Storage may be blocked or full.
  }
}

function sanitizeSearchResultCachePayload(rawPayload) {
  const now = Date.now();
  const payloadAge = Number(rawPayload?.at);
  if (Number.isFinite(payloadAge) && now - payloadAge > SEARCH_RESULT_CACHE_PERSIST_TTL_MS) {
    return;
  }

  const input = rawPayload && typeof rawPayload === "object" ? rawPayload : null;
  const rawEntries = Array.isArray(input?.entries) ? input.entries : [];

  rawEntries.forEach((entry) => {
    const key = entry?.[0];
    const value = entry?.[1];
    if (typeof key !== "string" || !value || typeof value !== "object") {
      return;
    }

    const fetchedAt = Number(value.fetchedAt);
    const docs = Array.isArray(value.docs) ? value.docs : [];
    if (!Number.isFinite(fetchedAt) || now - fetchedAt > SEARCH_RESULT_CACHE_TTL_MS) {
      return;
    }

    searchResultCache.set(key, { fetchedAt, docs });
  });
}

function sanitizeSourceMetadataCachePayload(rawPayload) {
  const now = Date.now();
  const payloadAge = Number(rawPayload?.at);
  if (Number.isFinite(payloadAge) && now - payloadAge > SOURCE_METADATA_CACHE_PERSIST_TTL_MS) {
    return;
  }

  const input = rawPayload && typeof rawPayload === "object" ? rawPayload : null;
  const rawEntries = Array.isArray(input?.entries) ? input.entries : [];

  rawEntries.forEach((entry) => {
    const key = entry?.[0];
    const value = entry?.[1];
    if (typeof key !== "string" || !value || typeof value !== "object") {
      return;
    }

    const fetchedAt = Number(value.fetchedAt);
    const source = value.source;
    if (!Number.isFinite(fetchedAt) || !source || now - fetchedAt > SOURCE_METADATA_CACHE_TTL_MS) {
      return;
    }

    sourceMetadataCache.set(key, { fetchedAt, source });
  });
}

function queueSearchResultCachePersist() {
  if (searchResultCachePersistTimer !== null) {
    clearTimeout(searchResultCachePersistTimer);
  }

  searchResultCachePersistTimer = window.setTimeout(() => {
    searchResultCachePersistTimer = null;
    const entries = Array.from(searchResultCache.entries()).slice(-SEARCH_RESULT_CACHE_MAX_SIZE);
    const payload = {
      v: 1,
      at: Date.now(),
      entries,
    };
    writeJsonToStorage(SEARCH_RESULT_CACHE_STORAGE_KEY, payload);
  }, 150);
}

function queueSourceMetadataCachePersist() {
  if (sourceMetadataCachePersistTimer !== null) {
    clearTimeout(sourceMetadataCachePersistTimer);
  }

  sourceMetadataCachePersistTimer = window.setTimeout(() => {
    sourceMetadataCachePersistTimer = null;
    const persistLimit = Math.min(SOURCE_METADATA_CACHE_MAX_SIZE, SOURCE_METADATA_CACHE_PERSIST_MAX_ENTRIES);
    const entries = Array.from(sourceMetadataCache.entries())
      .slice(-persistLimit)
      .map(([identifier, item]) => [identifier, item]);
    const payload = {
      v: 1,
      at: Date.now(),
      entries,
    };
    writeJsonToStorage(SOURCE_METADATA_CACHE_STORAGE_KEY, payload);
  }, 250);
}

function hydrateSearchCacheFromStorage() {
  const payload = readJsonFromStorage(SEARCH_RESULT_CACHE_STORAGE_KEY, null);
  if (!payload || typeof payload !== "object") {
    return;
  }

  sanitizeSearchResultCachePayload(payload);
  pruneSearchResultCache();

  if (searchResultCache.size > SEARCH_RESULT_CACHE_MAX_SIZE) {
    pruneSearchResultCache();
  }
}

function hydrateSourceMetadataCacheFromStorage() {
  const payload = readJsonFromStorage(SOURCE_METADATA_CACHE_STORAGE_KEY, null);
  if (!payload || typeof payload !== "object") {
    return;
  }

  sanitizeSourceMetadataCachePayload(payload);
  if (sourceMetadataCache.size > SOURCE_METADATA_CACHE_MAX_SIZE) {
    pruneSourceMetadataCache();
  }
}

function trimPersistentCachesIfStale() {
  const now = Date.now();
  const resultEntries = Array.from(searchResultCache.entries()).filter(([, value]) => {
    if (!value || !Number.isFinite(value.fetchedAt)) {
      return false;
    }
    if (now - value.fetchedAt > SEARCH_RESULT_CACHE_TTL_MS) {
      return false;
    }
    return true;
  });
  searchResultCache.clear();
  resultEntries.forEach(([key, value]) => searchResultCache.set(key, value));

  const sourceEntries = Array.from(sourceMetadataCache.entries()).filter(([, value]) => {
    if (!value || !Number.isFinite(value.fetchedAt)) {
      return false;
    }
    if (now - value.fetchedAt > SOURCE_METADATA_CACHE_TTL_MS) {
      return false;
    }
    return true;
  });
  sourceMetadataCache.clear();
  sourceEntries.forEach(([key, value]) => sourceMetadataCache.set(key, value));
}

function prunePersistentCaches() {
  trimPersistentCachesIfStale();
  if (searchResultCache.size > SEARCH_RESULT_CACHE_MAX_SIZE) {
    pruneSearchResultCache();
  }
  if (sourceMetadataCache.size > SOURCE_METADATA_CACHE_MAX_SIZE) {
    pruneSourceMetadataCache();
  }
  queueSearchResultCachePersist();
  queueSourceMetadataCachePersist();
}

hydrateSearchCacheFromStorage();
hydrateSourceMetadataCacheFromStorage();
trimPersistentCachesIfStale();

function getTrackById(trackId) {
  if (!trackId) {
    return null;
  }

  return TRACK_LOOKUP.get(trackId) || null;
}

window.freemixGetTrackById = getTrackById;
window.freemixGetArrangementSceneColor = getArrangementSceneColor;

function hasSoloTracksEnabled() {
  return tracks.some((track) => !!track?.solo);
}

function hasNonDefaultFx(track) {
  const targetState = track && typeof track === "object" ? track : {};

  if (targetState.blendMode !== TRACK_BLEND_DEFAULTS[0]) {
    return true;
  }
  if (Number(targetState?.opacity) !== 1) {
    return true;
  }
  if (Number(targetState?.pitch) !== 0 || Number(targetState?.speed) !== 1) {
    return true;
  }
  return Object.values(targetState?.fx || {}).some((value) => Number(value) !== 0);
}

function isTrackAudibleInMix(track, playbackState) {
  if (!track) {
    return false;
  }

  const activeClip = getTrackPlaybackState(track, playbackState) || track;
  if (activeClip?.muted) {
    return false;
  }

  const activeVolume = Number.isFinite(Number(activeClip?.volume))
    ? Number(activeClip.volume)
    : Number.isFinite(Number(track?.volume))
      ? Number(track.volume)
      : 0;
  if (activeVolume <= 0) {
    return false;
  }

  if (!hasSoloTracksEnabled()) {
    return true;
  }

  return !!track.solo;
}

function updateTrackModeChips(track) {
  const trackRow = getTrackRowElement(track);
  if (!trackRow) {
    return;
  }

  const activeChip = trackRow.querySelector('[data-state="active"]');
  const mutedChip = trackRow.querySelector('[data-state="muted"]');
  const fxChip = trackRow.querySelector('[data-state="fx"]');
  const soloChip = trackRow.querySelector('[data-control="solo"]');
  const activeState = getTrackActiveControlState(track);

  if (activeChip) {
    activeChip.classList.toggle("is-on", !activeState?.muted);
  }
  if (mutedChip) {
    mutedChip.classList.toggle("is-on", !!activeState?.muted);
  }
  if (fxChip) {
    fxChip.classList.toggle("is-on", hasNonDefaultFx(activeState) || !!track.showAdvanced);
  }
  if (soloChip) {
    soloChip.classList.toggle("is-on", !!track.solo);
    soloChip.setAttribute("aria-pressed", String(!!track.solo));
  }
}

function getTrackCollapseGlyph(isCollapsed) {
  return isCollapsed ? "▶" : "▼";
}

function normalizeTrackName(nameValue, fallback = "Track") {
  const raw = String(nameValue ?? "").trim();
  if (!raw) {
    return fallback;
  }

  return raw.length <= TRACK_NAME_MAX_LENGTH ? raw : raw.slice(0, TRACK_NAME_MAX_LENGTH).trimEnd();
}

function syncTrackNameUi(track) {
  if (!track?.id || !playerPanel) {
    return;
  }

  const trackName = normalizeTrackName(track.name, `Track ${track.id}`);
  if (track.name !== trackName) {
    track.name = trackName;
  }

  const trackRow = playerPanel.querySelector(`article.track-row[data-track-row-id="${track.id}"]`);
  if (trackRow) {
    const trackNameDisplay = trackRow.querySelector(`.track-row-name[data-track-control="${track.id}"]`);
    const trackNameInput = trackRow.querySelector(`.track-row-name-input[data-track-control="${track.id}"]`);
    if (trackNameDisplay) {
      trackNameDisplay.textContent = trackName;
      trackNameDisplay.setAttribute("title", trackName);
    }

    if (trackNameInput instanceof HTMLInputElement) {
      trackNameInput.value = trackName;
      trackNameInput.setAttribute("aria-label", `Rename ${trackName}`);
      trackNameInput.setAttribute("title", trackName);
    }
  }

  const arrangementRow = playerPanel.querySelector(`.arrangement-track-row[data-track-id="${track.id}"]`);
  if (arrangementRow) {
    const arrangementLabel = arrangementRow.querySelector(".arrangement-track-label");
    if (arrangementLabel) {
      arrangementLabel.textContent = trackName;
      arrangementLabel.setAttribute("title", trackName);
    }
  }

  const arrangementCells = Array.from(playerPanel.querySelectorAll(`.arrangement-cell[data-arr-track="${track.id}"]`));
  arrangementCells.forEach((cell) => {
    const step = Number(cell.dataset.arrStep);
    if (!Number.isInteger(step) || step < 0) {
      return;
    }

    const hasClip = cell.classList.contains("filled");
    cell.title = hasClip ? `${trackName} bar ${step + 1}` : `Capture ${trackName}`;
  });
}

function renameTrack(trackId, rawName) {
  const track = getTrackById(trackId);
  if (!track) {
    return false;
  }

  const fallback = String(track.name || `Track ${track.id}`);
  const nextName = normalizeTrackName(rawName, fallback);
  if (track.name === nextName) {
    syncTrackNameUi(track);
    return false;
  }

  track.name = nextName;
  syncTrackNameUi(track);
  markAppStateDirty(true);
  return true;
}

function applyTrackModeChipsToAll() {
  tracks.forEach(updateTrackModeChips);
}

function refreshTrackLookup() {
  TRACK_LOOKUP.clear();
  tracks.forEach((track) => {
    if (track?.id) {
      TRACK_LOOKUP.set(track.id, track);
    }
  });
}

function getTrackRowElement(track) {
  const trackId = track?.id;
  if (!trackId) {
    return null;
  }

  return playerPanel?.querySelector(`article.track-row[data-track-row-id="${trackId}"]`) || null;
}

function syncArrangementTrackHeights() {
  if (!playerPanel) {
    return;
  }

  const compactHeightCap = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--arr-track-height-cap"),
  );
  const maxTrackHeight = Number.isFinite(compactHeightCap) && compactHeightCap > 0 ? compactHeightCap : Number.POSITIVE_INFINITY;

  tracks.forEach((track) => {
    const trackRow = getTrackRowElement(track);
    const arrangementRow = playerPanel.querySelector(`.arrangement-track-row[data-track-id="${track.id}"]`);
    if (!trackRow || !arrangementRow) {
      return;
    }

    const nextHeight = Math.round(trackRow.getBoundingClientRect().height);
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
      return;
    }

    const syncedHeight = Math.max(16, Math.min(nextHeight, maxTrackHeight));
    arrangementRow.style.setProperty("--arr-track-height", `${syncedHeight}px`);
  });
}

let arrangementTrackHeightSyncFrame = null;
function queueArrangementTrackHeightSync() {
  if (arrangementTrackHeightSyncFrame !== null) {
    return;
  }

  arrangementTrackHeightSyncFrame = window.requestAnimationFrame(() => {
    arrangementTrackHeightSyncFrame = null;
    syncArrangementTrackHeights();
  });
}

function getTrackControls(track, controlName) {
  const trackId = track?.id;
  if (!trackId || !controlName) {
    return [];
  }

  return playerPanel
    ? Array.from(playerPanel.querySelectorAll(`[data-track-control="${trackId}"][data-control="${controlName}"]`))
    : [];
}

function getTrackCell(track) {
  const trackId = track?.id;
  if (!trackId) {
    return null;
  }

  if (track.__cacheVideoCell?.isConnected && track.__cacheVideoCell.dataset?.trackId === trackId) {
    return track.__cacheVideoCell;
  }

  const cell = playerPanel?.querySelector(`.video-cell[data-track-id="${trackId}"]`) || null;
  if (cell) {
    track.__cacheVideoCell = cell;
  }
  return cell;
}

function setTrackBlackout(track, isBlackout) {
  const cell = getTrackCell(track);
  if (!cell) {
    return;
  }

  cell.classList.toggle("scene-blackout", !!isBlackout);
}

function getTrackVideo(track) {
  const trackId = track?.id;
  if (!trackId) {
    return null;
  }

  if (track.__cacheVideoElement?.isConnected) {
    return track.__cacheVideoElement;
  }

  const video = playerPanel?.querySelector(`#video-${trackId}`) || null;
  if (video) {
    track.__cacheVideoElement = video;
  }
  return video;
}

function ensureTrackVideoElementForPlayback(track, playbackState = null) {
  const state = playbackState || getTrackPlaybackState(track) || track;
  const sourceUrl = state?.source?.mediaUrl || track?.source?.mediaUrl;
  let video = getTrackVideo(track);
  if (video || !sourceUrl) {
    return video;
  }

  if (window.freemixRender?.updateTrackRow) {
    window.freemixRender.updateTrackRow(track);
    video = getTrackVideo(track);
  }

  return video;
}

function getArrangementStepIndex(stepIndex = arrangement?.step) {
  if (!arrangement?.clips || !Number.isFinite(Number(stepIndex))) {
    return null;
  }

  if (arrangement.clips.length === 0) {
    return null;
  }

  const safeIndex = Math.floor(Number(stepIndex));
  return clamp(safeIndex, 0, arrangement.clips.length - 1);
}

function getArrangementStepClip(track, stepIndex = arrangement?.step) {
  if (!track?.id || !arrangement?.clips) {
    return null;
  }

  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return null;
  }

  const step = arrangement.clips[resolvedStep];
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    return null;
  }

  const clip = step[track.id];
  if (!clip || typeof clip !== "object" || Array.isArray(clip)) {
    return null;
  }

  return clip;
}

function getArrangementStepClipForTrack(track, options = {}) {
  if (!track?.id || !arrangement?.clips) {
    return null;
  }

  const resolvedStep = getArrangementStepIndex(Object.prototype.hasOwnProperty.call(options, "stepIndex") ? options.stepIndex : arrangement.step);
  if (resolvedStep === null) {
    return null;
  }

  const step = arrangement.clips[resolvedStep];
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    return null;
  }

  const clip = step[track.id];
  if (clip && typeof clip === "object" && !Array.isArray(clip)) {
    track.arrangementClip = clip;
    return clip;
  }

  if (options.create === false) {
    return null;
  }

  const nextClip = captureTrackClip(track);
  step[track.id] = nextClip;
  track.arrangementClip = nextClip;
  refreshArrangementHasClipsState();
  if (window.freemixRender?.updateArrangementCell) {
    window.freemixRender.updateArrangementCell(track, resolvedStep);
  }

  return nextClip;
}

function normalizeSceneColorIndex(colorIndex) {
  const parsed = Math.floor(Number(colorIndex));
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SCENE_COLOR_INDEX;
  }

  return clamp(parsed, 0, ARRANGEMENT_SCENE_COLORS.length - 1);
}

function getArrangementStepPrimaryClip(stepIndex = arrangement?.step) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return null;
  }

  const step = arrangement?.clips?.[resolvedStep];
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    return null;
  }

  const activeTrack = tracks.find((track) => step[track.id]);
  return activeTrack ? step[activeTrack.id] : null;
}

function getArrangementClipColorIndex(clip, stepIndex = arrangement?.step) {
  if (clip && Number.isFinite(Number(clip.colorIndex))) {
    return normalizeSceneColorIndex(clip.colorIndex);
  }

  const fallbackStep = getArrangementStepIndex(stepIndex);
  if (fallbackStep !== null) {
    return normalizeSceneColorIndex(arrangement?.sceneColors?.[fallbackStep]);
  }

  return DEFAULT_SCENE_COLOR_INDEX;
}

function getArrangementSceneColorIndex(stepIndex = arrangement?.step) {
  const selectedTarget = getSelectedArrangementClipTargets()[0];
  if (selectedTarget) {
    const selectedClip = arrangement?.clips?.[selectedTarget.stepIndex]?.[selectedTarget.track.id];
    if (selectedClip) {
      return getArrangementClipColorIndex(selectedClip, selectedTarget.stepIndex);
    }
  }

  const primaryClip = getArrangementStepPrimaryClip(stepIndex);
  return getArrangementClipColorIndex(primaryClip, stepIndex);
}

function getArrangementSceneColor(stepIndex = arrangement?.step, clip = null) {
  return ARRANGEMENT_SCENE_COLORS[getArrangementClipColorIndex(clip, stepIndex)]?.value || "";
}

function arrangementStepHasClips(stepIndex) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return false;
  }

  const step = arrangement?.clips?.[resolvedStep];
  return !!step && typeof step === "object" && !Array.isArray(step) && Object.keys(step).length > 0;
}

function getSelectedEditTargetLabel() {
  const selectedTargets = getSelectedArrangementClipTargets();
  if (selectedTargets.length === 1) {
    const [{ track, stepIndex }] = selectedTargets;
    const hasClip = !!arrangement?.clips?.[stepIndex]?.[track.id];
    return `Editing ${track.name} / scene ${stepIndex + 1}${hasClip ? "" : " (blank)"}`;
  }

  if (selectedTargets.length > 1) {
    return `Editing ${selectedTargets.length} selected clips`;
  }

  const resolvedStep = getArrangementStepIndex(arrangement?.step);
  if (resolvedStep === null) {
    return "Editing live tracks";
  }

  const hasSceneClips = arrangementStepHasClips(resolvedStep);
  return `Editing scene ${resolvedStep + 1}${hasSceneClips ? "" : " (empty)"}`;
}

function setArrangementSceneColor(stepIndex, colorIndex) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return false;
  }

  const nextColorIndex = normalizeSceneColorIndex(colorIndex);
  const step = arrangement?.clips?.[resolvedStep];
  const selectedTargets = getSelectedArrangementClipTargets();
  const selectedClips = selectedTargets
    .map(({ track, stepIndex: targetStep }) => arrangement?.clips?.[targetStep]?.[track.id])
    .filter(Boolean);
  const clips = selectedClips.length
    ? selectedClips
    : step && typeof step === "object" && !Array.isArray(step)
      ? Object.values(step)
      : [];
  if (!clips.length) {
    if (!Array.isArray(arrangement.sceneColors)) {
      arrangement.sceneColors = Array.from({ length: arrangement.clips?.length || arrangementStepCount }, () => DEFAULT_SCENE_COLOR_INDEX);
    }
    if (getArrangementSceneColorIndex(resolvedStep) === nextColorIndex) {
      return true;
    }
    captureArrangementEdit(`Changed scene ${resolvedStep + 1} color`);
    arrangement.sceneColors[resolvedStep] = nextColorIndex;
  } else if (clips.every((clip) => getArrangementClipColorIndex(clip, resolvedStep) === nextColorIndex)) {
    return true;
  } else {
    captureArrangementEdit(`Changed scene ${resolvedStep + 1} clip color`);
    clips.forEach((clip) => {
      if (clip && typeof clip === "object") {
        clip.colorIndex = nextColorIndex;
      }
    });
  }

  if (window.freemixRender?.updateArrangementGrid) {
    refreshArrangementStepCells(resolvedStep);
    window.freemixRender.updateArrangementSceneColorSelector?.();
  } else {
    renderWorkstation();
  }
  setStatus(`Scene ${resolvedStep + 1}: color set`);
  markAppStateDirty(true);
  return true;
}

function bindTracksToArrangementStep(stepIndex, options = {}) {
  const shouldSyncTiming = !!options.syncTriggerTiming;
  const targetStep = getArrangementStepIndex(stepIndex);
  if (targetStep === null || !arrangement?.clips) {
    return;
  }

  const target = arrangement.clips[targetStep];
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return;
  }

  const beatMs = transport ? getTransportBeatMs(transport) : null;
  const barMs = Number.isFinite(beatMs) ? beatMs * getTransportBeatsPerBar(transport) : null;
  const nextTriggerAt = Number.isFinite(transport?.nextBeatAt) ? transport.nextBeatAt : performance.now();

  tracks.forEach((track) => {
    const clip = target[track.id] ?? null;
    track.arrangementClip = clip;
    track.stepMs = clip && Number.isFinite(barMs)
      ? barMs / normalizeRetriggersPerBar(clip.retriggersPerBar)
      : 0;
    if (shouldSyncTiming && Number.isFinite(track.stepMs) && track.stepMs > 0) {
      resetTrackPulseCursor(track, nextTriggerAt, { fireAtReference: true });
    }
    track.lastStep = -1;
  });
}

function getTrackActiveControlState(track) {
  if (!track || typeof track !== "object") {
    return track;
  }

  const clip = getArrangementStepClip(track, arrangement.step);
  if (clip) {
    track.arrangementClip = clip;
    return clip;
  } else {
    track.arrangementClip = null;
  }

  return track;
}

function getTrackRenderState(track) {
  const arrangementClip = getArrangementStepClip(track, arrangement?.step);
  if (arrangementClip) {
    return arrangementClip;
  }

  if (arrangement?.clips && Number.isFinite(Number(arrangement?.step))) {
    return getArrangementStepClipForTrack(track, { stepIndex: arrangement.step, create: false }) || getTrackActiveControlState(track) || track;
  }

  return getTrackActiveControlState(track) || track;
}

function getTrackSceneEditableState(track, controlName) {
  const sceneEditable = SCENE_EDITABLE_CONTROLS.has(controlName);
  if (!track || !controlName || !sceneEditable) {
    return getTrackActiveControlState(track);
  }

  if (!arrangement?.clips) {
    return getTrackActiveControlState(track);
  }

  const stepIndex = getArrangementStepIndex(arrangement?.step);
  const safeStepIndex = stepIndex === null ? 0 : stepIndex;
  return getArrangementStepClipForTrack(track, { stepIndex: safeStepIndex, create: true }) || getTrackActiveControlState(track);
}

function getTrackPlaybackState(track, overrideState) {
  const baseTrack = getTrackById(track?.id) || track;
  if (!baseTrack || typeof baseTrack !== "object") {
    return null;
  }

  const activeState = overrideState || getTrackActiveControlState(baseTrack);
  if (activeState && typeof activeState === "object") {
    return activeState;
  }

  return baseTrack;
}

function isBaseTrackPlaybackState(track, playbackState) {
  const baseTrack = getTrackById(track?.id) || track;
  return !playbackState || playbackState === track || playbackState === baseTrack;
}

function getTrackPlaybackSourceUrl(track, overrideState) {
  const playbackState = getTrackPlaybackState(track, overrideState);
  if (playbackState?.source?.mediaUrl) {
    return playbackState.source.mediaUrl;
  }

  return isBaseTrackPlaybackState(track, playbackState) ? track?.source?.mediaUrl || null : null;
}

function playbackSignatureNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(4)) : fallback;
}

function getPlaybackStateSignature(playbackState, sourceUrl = "") {
  const fx = playbackState?.fx && typeof playbackState.fx === "object" ? playbackState.fx : {};
  return JSON.stringify({
    sourceUrl,
    startTime: playbackSignatureNumber(playbackState?.startTime),
    retriggersPerBar: normalizeRetriggersPerBar(playbackState?.retriggersPerBar),
    muted: !!playbackState?.muted,
    volume: playbackSignatureNumber(playbackState?.volume, 0.55),
    blendMode: playbackState?.blendMode || "normal",
    opacity: playbackSignatureNumber(playbackState?.opacity, 1),
    speed: playbackSignatureNumber(playbackState?.speed, 1),
    pitch: playbackSignatureNumber(playbackState?.pitch, 0),
    fx: FX_CONTROLS.map((control) => [control.key, playbackSignatureNumber(fx[control.key], control.min)]),
  });
}

function isVideoParkedAtAnchor(video, clipState, tolerance = 0.05) {
  if (!video || !clipState || video.readyState < 1) {
    return false;
  }

  const anchorTime = safeStartTime(clipState, video);
  return Number.isFinite(anchorTime) && almostEqual(video.currentTime, anchorTime, tolerance);
}

function flashTrackTrigger(track) {
  const cell = getTrackCell(track);
  if (!cell) {
    return;
  }

  cell.classList.remove("triggered");
  window.requestAnimationFrame(() => cell.classList.add("triggered"));
}

function launchParkedVideo(video, track, playbackState, playbackToken) {
  if (!video || !track) {
    return false;
  }

  if (!video.paused || video.ended || video.readyState < 2) {
    return false;
  }

  const tokenAtStart = Number.isFinite(playbackToken) ? playbackToken : track.__playbackToken;
  void video.play()
    .then(() => {
      if (Number.isFinite(tokenAtStart) && track.__playbackToken !== tokenAtStart) {
        try {
          video.pause();
        } catch {
          // Best effort: a newer trigger superseded this parked launch.
        }
        return;
      }

      applyTrackVolume(track, playbackState);
    })
    .catch((error) => {
      if (error instanceof DOMException) {
        setStatus(`Playback failed: ${error.name}`, true);
      } else {
        setStatus("Playback failed", true);
      }
    });

  return true;
}

function shouldDisableWebAudioForSource(sourceUrl) {
  if (!sourceUrl) {
    return true;
  }

  const isUnknownOrigin = window.location?.origin === "null" || !window.location?.origin;
  if (window.location?.protocol === "file:" || isUnknownOrigin) {
    return true;
  }

  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    if (!mediaUrl.protocol.startsWith("http")) {
      return false;
    }

    return mediaUrl.origin !== window.location.origin;
  } catch {
    return true;
  }
}

function setVideoCorsPolicy(video, sourceUrl) {
  if (!video || !sourceUrl) {
    return;
  }

  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    if (shouldDisableWebAudioForSource(sourceUrl)) {
      if (video.removeAttribute) {
        video.removeAttribute("crossorigin");
      }
      return;
    }

    if (mediaUrl.protocol.startsWith("http")) {
      video.crossOrigin = "anonymous";
      return;
    }
  } catch {
    // Best effort.
  }

  if (video.removeAttribute) {
    video.removeAttribute("crossorigin");
  }
}

function shouldIgnoreLifecycleAutoStop() {
  return window.location?.protocol === "file:" || window.location?.origin === "null" || !window.location?.origin;
}

function getTrackStartControlValue(track) {
  const activeState = getTrackActiveControlState(track) || track;
  const parsedStartTime = Number(activeState?.startTime);
  if (Number.isFinite(parsedStartTime)) {
    return parsedStartTime;
  }

  const trackStartTime = Number(track?.startTime);
  return Number.isFinite(trackStartTime) ? trackStartTime : 0;
}

function createAnchorSeekState(targetTrack, overrideState) {
  const track = targetTrack?.id ? getTrackById(targetTrack.id) || targetTrack : targetTrack;
  if (!track || typeof track !== "object") {
    return null;
  }

  const playbackState = getTrackPlaybackState(track, overrideState);
  if (!playbackState || typeof playbackState !== "object") {
    return null;
  }

  const rawSourceUrl = playbackState.source?.mediaUrl || track.source?.mediaUrl;
  const sourceUrl = typeof rawSourceUrl === "string" && rawSourceUrl.length > 0 ? rawSourceUrl : null;
  const rawStart = Number(playbackState.startTime);
  const startTime = Number.isFinite(rawStart)
    ? rawStart
    : Number.isFinite(Number(track.startTime))
      ? Number(track.startTime)
      : 0;

  return {
    trackId: track.id,
    sourceUrl,
    startTime,
    sourceState: playbackState,
  };
}

window.addEventListener("resize", queueArrangementTrackHeightSync, { passive: true });

function getBeatLights() {
  if (UI_NODE_CACHE.beatLights !== null) {
    return UI_NODE_CACHE.beatLights;
  }

  UI_NODE_CACHE.beatLights = playerPanel ? Array.from(playerPanel.querySelectorAll(".beat-light")) : [];
  return UI_NODE_CACHE.beatLights;
}

function getArrangementCellsByStep(stepIndex) {
  if (!playerPanel || !Number.isFinite(stepIndex)) {
    return [];
  }

  return Array.from(
    playerPanel.querySelectorAll(`.arrangement-cell[data-arr-step="${String(stepIndex)}"]`),
  );
}

function getArrangementClipSelectionKey(trackId, stepIndex) {
  return `${trackId}:${Number(stepIndex)}`;
}

function parseArrangementClipSelectionKey(key) {
  const [trackId, rawStep] = String(key || "").split(":");
  const stepIndex = Number(rawStep);
  if (!trackId || !Number.isInteger(stepIndex)) {
    return null;
  }

  return { trackId, stepIndex };
}

function isArrangementClipSelected(trackId, stepIndex) {
  return selectedArrangementClipKeys.has(getArrangementClipSelectionKey(trackId, stepIndex));
}

function setArrangementClipSelectedClass(trackId, stepIndex, isSelected) {
  const cell = playerPanel?.querySelector(
    `.arrangement-cell[data-arr-track="${trackId}"][data-arr-step="${stepIndex}"]`,
  );
  cell?.classList.toggle("selected", !!isSelected);
}

function renderArrangementClipSelection() {
  playerPanel?.querySelectorAll(".arrangement-cell.selected").forEach((cell) => {
    cell.classList.remove("selected");
  });
  selectedArrangementClipKeys.forEach((key) => {
    const selection = parseArrangementClipSelectionKey(key);
    if (selection) {
      setArrangementClipSelectedClass(selection.trackId, selection.stepIndex, true);
    }
  });
}

function selectArrangementClip(trackId, stepIndex, options = {}) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (!trackId || resolvedStep === null) {
    return false;
  }

  playerPanel?.querySelectorAll(".arrangement-cell.selected").forEach((cell) => {
    cell.classList.remove("selected");
  });
  const key = getArrangementClipSelectionKey(trackId, resolvedStep);
  if (options.additive) {
    if (selectedArrangementClipKeys.has(key)) {
      selectedArrangementClipKeys.delete(key);
    } else {
      selectedArrangementClipKeys.add(key);
    }
  } else {
    selectedArrangementClipKeys = new Set([key]);
  }

  if (selectedArrangementClipKeys.size === 0) {
    selectedArrangementClipKeys.add(key);
  }
  renderArrangementClipSelection();
  return true;
}

function getSelectedArrangementClipTargets() {
  const targets = [];
  selectedArrangementClipKeys.forEach((key) => {
    const selection = parseArrangementClipSelectionKey(key);
    if (!selection) {
      return;
    }

    const track = getTrackById(selection.trackId);
    const stepIndex = getArrangementStepIndex(selection.stepIndex);
    if (!track || stepIndex === null) {
      return;
    }

    targets.push({ track, stepIndex });
  });
  return targets;
}

function selectArrangementSceneClips(stepIndex) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return false;
  }

  selectedArrangementClipKeys = new Set(
    tracks.map((track) => getArrangementClipSelectionKey(track.id, resolvedStep)),
  );
  renderArrangementClipSelection();
  return true;
}

function getFirstLoadedTrackSource() {
  const firstLoaded = tracks.find((track) => track.source);
  return firstLoaded?.source || null;
}

function getArrangementClearMenu() {
  return playerPanel?.querySelector("#arrangementClearMenu") || null;
}

function invalidateUiNodeCache() {
  UI_NODE_CACHE.beatLights = null;
  tracks.forEach((track) => {
    if (track) {
      track.__cacheVideoCell = null;
      track.__cacheVideoElement = null;
    }
  });
  activeBeatLightIndex = -1;
}

window.freemixInvalidateUiNodeCache = invalidateUiNodeCache;
window.freemixSyncTransportTiming = syncTransportTiming;

function normalizeRetriggersPerBar(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.floor(Math.abs(parsed)) || 1);
}

APP_STATE_PROXY_KEYS.forEach((key) => {
  Object.defineProperty(window, key, {
    configurable: true,
    get() {
      return appState[key];
    },
    set(value) {
      appState[key] = value;
      if (APP_STATE_PROXY_DIRTY_KEYS.has(key)) {
        markAppStateDirty(true);
      }
    },
  });
});

function isDebouncedLiveControl(controlName) {
  if (!transport?.active) {
    return false;
  }

  return LIVE_CONTROL_DEBOUNCE_CONTROLS.has(controlName);
}

function queueLiveTrackControlUpdate(control, eventType = "change") {
  if (!control) {
    return;
  }

  const controlName = control.dataset?.control;
  const trackId = control.dataset?.trackControl;
  if (!controlName || !trackId) {
    handleTrackControl({ type: eventType, target: control, currentTarget: control });
    return;
  }

  if (controlName === "startTime" || controlName === "startNumber") {
    const schedulerKey = `${trackId}:${controlName}:high-priority`;
    const existing = startTimeControlTrackers.get(schedulerKey);
    if (existing) {
      window.cancelAnimationFrame(existing);
    }

    startTimeControlTrackers.set(
      schedulerKey,
      window.requestAnimationFrame(() => {
        startTimeControlTrackers.delete(schedulerKey);
        handleTrackControl({ type: eventType, target: control, currentTarget: control });
      }),
    );
    return;
  }

  if (!isDebouncedLiveControl(controlName) || eventType !== "input") {
    handleTrackControl({ type: eventType, target: control, currentTarget: control });
    return;
  }

  const schedulerKey = `${trackId}:${controlName}`;
  const existing = liveControlSchedulers.get(schedulerKey);
  if (existing) {
    clearTimeout(existing);
  }

  liveControlSchedulers.set(
    schedulerKey,
    setTimeout(() => {
      liveControlSchedulers.delete(schedulerKey);
      handleTrackControl({ type: eventType, target: control, currentTarget: control });
    }, LIVE_CONTROL_UPDATE_DEBOUNCE_MS),
  );
}

function queueControlStatePersist(delayMs = LIVE_CONTROL_STATE_PERSIST_DEBOUNCE_MS) {
  if (liveControlPersistTimer !== null) {
    window.clearTimeout(liveControlPersistTimer);
  }

  liveControlPersistTimer = window.setTimeout(() => {
    liveControlPersistTimer = null;
    markAppStateDirty();
  }, delayMs);
}

async function primeTrackForTransport(track, sessionToken = startTransport.bootToken) {
  if (!track) {
    return;
  }

  const playbackState = getTrackPlaybackState(track) || track;
  const sourceUrl = getTrackPlaybackSourceUrl(track, playbackState);
  if (!sourceUrl) {
    return;
  }

  const video = ensureTrackVideoElementForPlayback(track, playbackState);
  if (!video) {
    return;
  }

  setVideoCorsPolicy(video, sourceUrl);
  if (video.src !== sourceUrl) {
    video.src = sourceUrl;
    video.load();
  }

  if (video.networkState !== 0) {
    video.load();
  }

  await waitForTrackReady(video);
  if (startTransport.bootToken !== sessionToken) {
    return;
  }

  const primingState = getTrackPlaybackState(track) || track;
  const primingSourceUrl = getTrackPlaybackSourceUrl(track, primingState);
  const parkedAtAnchor = await parkVideoAtAnchor(video, primingState, track);
  if (startTransport.bootToken !== sessionToken) {
    return;
  }
  track.__transportPrimedFor = parkedAtAnchor ? sessionToken : null;
  track.__parkedAtAnchorFor = parkedAtAnchor ? sessionToken : null;
  track.__parkedPlaybackSignature = parkedAtAnchor ? getPlaybackStateSignature(primingState, primingSourceUrl) : null;
  setupTrackAudio(track, video);
  applyTrackVolume(track, primingState);
  applyTrackPitchAndSpeed(track, primingState);
}

function ensureTransportTrackPrimed(track, sessionToken = transport?.sessionToken) {
  if (!track || !sessionToken || !getTrackPlaybackSourceUrl(track)) {
    return;
  }

  if (track.__transportPrimedFor === sessionToken) {
    return;
  }

  if (track.__transportPrimeAttempt === sessionToken) {
    return;
  }

  track.__transportPrimeAttempt = sessionToken;
  primeTrackForTransport(track, sessionToken)
    .catch((error) => {
      if (error?.name !== "AbortError") {
        console.warn(error);
      }
    })
    .finally(() => {
      if (track.__transportPrimeAttempt === sessionToken) {
        delete track.__transportPrimeAttempt;
      }
    });
}

function resyncTrackTiming(track) {
  if (!track || !transport?.active) {
    return;
  }

  const timingState = getTrackActiveControlState(track) || track;
  const beatMs = getTransportBeatMs(transport);
  const barMs = beatMs * getTransportBeatsPerBar(transport);
  track.stepMs = barMs / normalizeRetriggersPerBar(timingState?.retriggersPerBar);
  const rearmAt = Number.isFinite(transport?.nextBeatAt) ? transport.nextBeatAt : performance.now();
  resetTrackPulseCursor(track, rearmAt, { fireAtReference: false });
  track.lastStep = -1;
}

window.freemixQueueTrackControlUpdate = queueLiveTrackControlUpdate;

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

window.showGuidance = showGuidance;
window.clearGuidanceHint = clearGuidanceHint;

function getLaunchPadTrack() {
  return tracks[0] || null;
}

function normalizeLaunchActionQuery(rawQuery) {
  return String(rawQuery || "").trim() || QUICKSTART_SAMPLE_QUERY;
}

async function seedStarterSample(track, rawQuery = QUICKSTART_SAMPLE_QUERY) {
  const targetTrack = track || getLaunchPadTrack();
  if (!targetTrack) {
    setStatus("Track missing", true);
    return false;
  }

  const query = normalizeLaunchActionQuery(rawQuery);
  clearGuidanceHint();
  setStatus(`${targetTrack.name}: loading starter`);
  renderTrackResultsMessage(targetTrack, "Loading starter...");

  try {
    const docs = await runArchiveSearchQueries(query);
    const ranked = rankAndFilterResults(docs, targetTrack.durationFilter, query);
    const best = ranked[0];
    if (!best) {
      renderTrackResultsMessage(targetTrack, "No samples found");
      setStatus("No starter sample found", true);
      return false;
    }

    await loadTrackSource(targetTrack, best);
    return true;
  } catch (error) {
    renderTrackResultsMessage(targetTrack, "No playable file");
    setStatus("Starter sample failed", true);
    console.warn(error);
    return false;
  }
}

function placeLaunchPadTrackInActiveSection(track = getLaunchPadTrack()) {
  if (!track) {
    setStatus("Track missing", true);
    return false;
  }

  if (!track.source) {
    setStatus("Load a source first", true);
    return false;
  }

  const activeStep = Number.isFinite(arrangement?.step) ? arrangement.step : 0;
  const safeStep = Math.max(0, Math.min(activeStep, arrangementStepCount - 1));
  arrangement.clips[safeStep] = arrangement.clips[safeStep] || {};
  arrangement.clips[safeStep][track.id] = captureTrackClip(track);
  refreshArrangementHasClipsState();

  if (window.freemixRender?.updateArrangementCell) {
    window.freemixRender.updateArrangementCell(track, safeStep);
    window.freemixRender.updateArrangementPlayhead?.();
    markAppStateDirty();
    setStatus(`${track.name}: placed in bar ${safeStep + 1}`);
    return true;
  }

  renderWorkstation();
  markAppStateDirty();
  setStatus(`${track.name}: placed in bar ${safeStep + 1}`);
  return true;
}

async function handleLaunchPadAction(action) {
  clearGuidanceHint();

  if (action === "load-sample") {
    await seedStarterSample(getLaunchPadTrack(), QUICKSTART_SAMPLE_QUERY);
    return;
  }

  if (action === "place-bar") {
    placeLaunchPadTrackInActiveSection();
    return;
  }

  if (action === "add-track") {
    addTrack();
    return;
  }

  if (action === "play") {
    startTransport();
    return;
  }
}

window.freemixHandleLaunchPadAction = handleLaunchPadAction;
window.freemixNewBlankSession = newBlankSession;
window.freemixSaveSession = saveCurrentSession;
window.freemixSaveSessionAs = saveSessionAs;
window.freemixLoadRecentSession = loadRecentSession;
window.freemixLoadSessionFile = loadSessionFile;
window.freemixRenderRecentSessionMenu = renderRecentSessionMenu;

if (!shouldIgnoreLifecycleAutoStop()) {
  window.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hardStopPlayback("tab hidden");
    }
  });
  window.addEventListener("beforeunload", () => {
    hardStopPlayback("unloading");
  });
  window.addEventListener("pagehide", () => {
    hardStopPlayback("page hidden");
  });
}

let restoredStartupSession = null;
try {
  restoredStartupSession = restoreCurrentSessionOnStartup();
} catch (error) {
  console.warn("Freemix session restore skipped", error);
}
renderWorkstation();
renderRecentSessionMenu();
setStatus(restoredStartupSession ? `${normalizeSessionName(restoredStartupSession.name || "Session")}: restored` : "Ready");

function normalizeResults(docs) {
  return docs
    .filter((doc) => doc.identifier)
    .map((doc) => ({
      identifier: doc.identifier,
      title: textValue(doc.title) || doc.identifier,
      creator: textValue(doc.creator),
      description: textListValue(doc.description),
      subject: textListValue(doc.subject),
      collection: textListValue(doc.collection),
      year: textValue(doc.year),
      runtime: textValue(doc.runtime),
      downloads: Number(textValue(doc.downloads)) || 0,
      durationSeconds: parseRuntime(textValue(doc.runtime)),
      thumbnail: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
      archiveUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
    }))
    .filter((result) => !isExplicitSearchResult(result));
}

function textValue(value) {
  if (Array.isArray(value)) {
    return value.find(Boolean) ?? "";
  }

  return value ?? "";
}

function textListValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean).join(" ");
  }

  return textValue(value);
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

function normalizeSearchInput(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .toLowerCase();
}

function getSearchModerationText(result) {
  return normalizeSearchInput(
    [
      result?.identifier,
      result?.title,
      result?.creator,
      result?.description,
      result?.subject,
      result?.collection,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function isExplicitSearchResult(result) {
  const moderationText = getSearchModerationText(result);
  if (!moderationText) {
    return false;
  }

  return EXPLICIT_SEARCH_RESULT_PATTERNS.some((pattern) => pattern.test(moderationText));
}

function tokenizeSearchQuery(value) {
  const normalized = normalizeSearchInput(value);
  if (!normalized) {
    return [];
  }

  const stopWords = new Set(["the", "and", "for", "with", "from", "that", "this", "your", "just", "have", "not"]);
  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= SEARCH_QUERY_TOKEN_MIN_LENGTH && !stopWords.has(token));
}

function escapeArchiveQueryValue(value) {
  return String(value || "")
    .trim()
    .replace(/["*?()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[:]/g, "\\:")
    .replace(/[\\]/g, "\\\\");
}

function getSearchExpansionTerms(rawQuery) {
  const tokens = tokenizeSearchQuery(rawQuery);
  const expansionMap = {
    bass: ["bass guitar", "bass player", "double bass", "music", "performance"],
    beach: ["surf", "ocean", "shore", "seaside", "vacation"],
    bongo: ["bongos", "percussion", "drum", "music", "performance"],
    cheese: ["food", "cooking", "kitchen", "dairy", "recipe"],
    comedy: ["skit", "sketch", "funny", "humor", "comedian"],
    drum: ["drums", "drummer", "percussion", "music", "performance"],
    grape: ["grapes", "vineyard", "wine", "fruit", "food"],
    guitar: ["guitarist", "electric guitar", "acoustic guitar", "music", "performance"],
    mario: ["super mario", "nintendo", "gameplay", "animation", "cartoon"],
    nerd: ["geek", "computer", "science", "technology", "school"],
    skit: ["sketch", "comedy", "funny", "humor", "performance"],
    sonic: ["sonic hedgehog", "sega", "gameplay", "animation", "cartoon"],
    table: ["tables", "furniture", "dining", "kitchen", "workshop"],
  };
  const expansions = new Set();

  tokens.forEach((token) => {
    (expansionMap[token] || []).forEach((term) => expansions.add(term));
  });

  return Array.from(expansions)
    .map((term) => escapeArchiveQueryValue(term))
    .filter(Boolean);
}

function buildArchiveSearchQuery(rawQuery) {
  const variants = buildArchiveSearchQueryVariants(rawQuery);
  return variants[0] || "";
}

function buildArchiveSearchQueryVariants(rawQuery) {
  const normalized = normalizeSearchInput(rawQuery);
  if (!normalized) {
    return [];
  }

  const safeQuery = escapeArchiveQueryValue(rawQuery.trim());
  const safeTokens = tokenizeSearchQuery(normalized)
    .map((token) => escapeArchiveQueryValue(token))
    .filter(Boolean);
  const uniqueTokens = Array.from(new Set(safeTokens));
  const expansionTerms = getSearchExpansionTerms(normalized);

  if (!safeQuery) {
    return [];
  }

  const queries = new Set();
  const addQuery = (query) => {
    const clean = String(query || "").trim();
    if (clean) {
      queries.add(clean);
    }
  };

  const toFieldClause = (value) =>
    `(${SEARCHABLE_TEXT_FIELDS.map((field) => `${field}:(${value})`).join(" OR ")})`;
  const toIdentifierClause = (value) => `identifier:(${value})`;
  const titleCreatorClause = (value) => `(title:(${value}) OR creator:(${value}))`;
  const mediaScoped = (query) => `mediatype:(movies) AND (${query})`;
  const identifierFallback = (query) => `(title:(${query}) OR creator:(${query}) OR description:(${query}) OR subject:(${query}) OR ${toIdentifierClause(query)})`;
  const wildcardValue = safeQuery.includes(" ") ? "" : `${safeQuery}*`;
  const relaxedWildcard = wildcardValue || safeQuery;

  addQuery(
    mediaScoped(`${toFieldClause(`"${safeQuery}"`)}${wildcardValue ? ` OR ${toFieldClause(wildcardValue)}` : ""}`),
  );
  addQuery(mediaScoped(identifierFallback(`"${safeQuery}"`)));
  addQuery(mediaScoped(identifierFallback(relaxedWildcard)));

  if (uniqueTokens.length > 0) {
    const tokenClause = uniqueTokens.map((token) => toFieldClause(`"${token}"`)).join(" OR ");
    addQuery(mediaScoped(tokenClause));
    addQuery(mediaScoped(uniqueTokens.map((token) => toFieldClause(token)).join(" OR ")));
    uniqueTokens.forEach((token) => {
      if (token.length >= 3) {
        addQuery(mediaScoped(`${toFieldClause(`${token}*`)}`));
        addQuery(mediaScoped(`${titleCreatorClause(`${token}*`)}`));
      }
    });

    if (uniqueTokens.length > 1) {
      const titleCreatorTokens = uniqueTokens.slice(0, 4).map((token) => titleCreatorClause(`"${token}*"`)).join(" AND ");
      addQuery(mediaScoped(`(${titleCreatorTokens})`));
      addQuery(mediaScoped(uniqueTokens.slice(0, 3).map((token) => titleCreatorClause(token)).join(" AND ")));
    }
  }

  if (expansionTerms.length > 0) {
    const broadExpansionClause = expansionTerms
      .slice(0, 8)
      .map((term) => (term.includes(" ") ? toFieldClause(`"${term}"`) : toFieldClause(`${term}*`)))
      .join(" OR ");
    const titleSubjectExpansionClause = expansionTerms
      .slice(0, 6)
      .map((term) => {
        const value = term.includes(" ") ? `"${term}"` : `${term}*`;
        return `(title:(${value}) OR subject:(${value}) OR description:(${value}))`;
      })
      .join(" OR ");

    addQuery(mediaScoped(`(${toFieldClause(`"${safeQuery}"`)} OR ${broadExpansionClause})`));
    addQuery(mediaScoped(`(${titleSubjectExpansionClause})`));
  }

  if (safeQuery !== rawQuery.trim()) {
    addQuery(mediaScoped(toFieldClause(`"${safeQuery}"`)));
  }

  addQuery(mediaScoped(`"${safeQuery}"`));
  addQuery(mediaScoped(safeQuery));
  if (!safeQuery.includes(" ")) {
    addQuery(mediaScoped(`${safeQuery}*`));
  }
  addQuery(mediaScoped(`(${toFieldClause(`"${safeQuery}"`)})`));
  if (!safeQuery.includes(" ")) {
    addQuery(toFieldClause(`"${safeQuery}*"`));
  }
  addQuery(toFieldClause(`"${safeQuery}"`));
  if (!safeQuery.includes(" ")) {
    addQuery(mediaScoped(toFieldClause(`${safeQuery}*`)));
  }
  addQuery(identifierFallback(`${safeQuery}*`));
  addQuery(identifierFallback(safeQuery));
  if (safeQuery.includes(" ")) {
    addQuery(mediaScoped(`(${safeQuery})`));
    addQuery(mediaScoped(`(${toFieldClause(safeQuery)})`));
  } else {
    addQuery(mediaScoped(`(${safeQuery} OR ${identifierFallback(safeQuery)})`));
    addQuery(mediaScoped(`title:(${safeQuery}*)`));
    addQuery(mediaScoped(`description:(${safeQuery}*)`));
    addQuery(mediaScoped(`subject:(${safeQuery}*)`));
    addQuery(`(${safeQuery}*)`);
    addQuery(`title:(${safeQuery}*)`);
  }
  if (!safeQuery.includes(" ")) {
    addQuery(`${toFieldClause(`${safeQuery}*`)}`);
  }

  return Array.from(queries).slice(0, 18);
}

function searchRelevance(result, rawQuery) {
  const normalizedQuery = normalizeSearchInput(rawQuery);
  const tokens = tokenizeSearchQuery(normalizedQuery);
  const title = String(result.title || "").toLowerCase();
  const creator = String(result.creator || "").toLowerCase();
  const identifier = String(result.identifier || "").toLowerCase();
  const description = String(result.description || "").toLowerCase();
  const subject = String(result.subject || "").toLowerCase();
  const collection = String(result.collection || "").toLowerCase();
  const haystack = `${title} ${creator} ${identifier} ${description} ${subject} ${collection}`;
  const isGameQuery = tokens.some((token) => ["mario", "sonic", "game", "gameplay", "nintendo", "sega"].includes(token));
  const isMusicQuery = tokens.some((token) => ["drum", "drums", "guitar", "bass", "bongo", "bongos"].includes(token));
  const isComedyQuery = tokens.some((token) => ["skit", "sketch", "comedy", "funny"].includes(token));

  let score = 0;
  let boundaryTokenMatches = 0;
  if (!normalizedQuery) {
    return score;
  }

  if (title === normalizedQuery) {
    score += 140;
  } else if (title.includes(normalizedQuery)) {
    score += 95;
  }

  if (identifier === normalizedQuery) {
    score += 85;
  }

  if (creator.includes(normalizedQuery)) {
    score += 45;
  }

  if (description.includes(normalizedQuery)) {
    score += 34;
  }

  if (subject.includes(normalizedQuery)) {
    score += 32;
  }

  if (collection.includes(normalizedQuery)) {
    score += 16;
  }

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    const tokenBoundaryPattern = new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
    const wordMatch = tokenBoundaryPattern.test(haystack);
    const titleWordMatch = tokenBoundaryPattern.test(title);
    if (wordMatch) {
      boundaryTokenMatches += 1;
      score += 18;
    }

    if (title.startsWith(token)) {
      score += titleWordMatch ? 22 : 5;
    }
    if (title.includes(token)) {
      score += titleWordMatch ? 12 : 3;
    }
    if (creator.includes(token)) {
      score += 9;
    }
    if (identifier.includes(token)) {
      score += wordMatch ? 8 : 2;
    }
    if (description.includes(token)) {
      score += 7;
    }
    if (subject.includes(token)) {
      score += 6;
    }
    if (collection.includes(token)) {
      score += 4;
    }
  }

  const compactSubstringOnly = tokens.length > 0
    && boundaryTokenMatches === 0
    && tokens.some((token) => title.includes(token) || identifier.includes(token));
  if (compactSubstringOnly) {
    score -= 36;
  }

  if (isMusicQuery && /(music|musician|performance|concert|band|instrument|percussion|drummer|guitarist|bass)/.test(haystack)) {
    score += 28;
  }

  if (isComedyQuery && /(comedy|comedian|sketch|skit|funny|humor|parody|spoof)/.test(haystack)) {
    score += 28;
  }

  if (isGameQuery && /(gameplay|nintendo|sega|mario|sonic|animation|cartoon|speedrun|game)/.test(haystack)) {
    score += 28;
  }

  if (!isGameQuery && /(speedrun|longplay|gameplay|walkthrough)/.test(haystack)) {
    score -= 22;
  }

  if (Number.isFinite(result.durationSeconds) && result.durationSeconds > 0) {
    const idealDurationDistance = Math.abs(Math.log10(result.durationSeconds) - Math.log10(240));
    score += Math.max(0, 24 - idealDurationDistance * 10);
  } else {
    score -= 12;
  }

  if (Number.isFinite(result.downloads) && result.downloads > 0) {
    score += Math.min(20, Math.round(Math.log10(result.downloads + 1) * 4));
  }

  return score;
}

function diversifyRankedSearchResults(results, limit) {
  const selected = [];
  const seen = new Set();
  const seenTitles = new Set();
  const creatorBuckets = new Map();

  const remaining = [...results];

  for (const result of remaining) {
    if (selected.length >= limit) {
      break;
    }

    const creatorKey = (result.creator || result.identifier || "unknown").trim().toLowerCase();
    const currentCount = creatorBuckets.get(creatorKey) || 0;
    if (currentCount >= SEARCH_RESULT_MAX_CONTRIBUTIONS_PER_CREATOR) {
      continue;
    }

    const titleKey = normalizeSearchInput(result.title);
    if (titleKey && seenTitles.has(titleKey)) {
      continue;
    }

    seen.add(result.identifier);
    if (titleKey) {
      seenTitles.add(titleKey);
    }
    creatorBuckets.set(creatorKey, currentCount + 1);
    selected.push(result);
  }

  if (selected.length >= limit) {
    return selected;
  }

  for (const result of remaining) {
    if (selected.length >= limit) {
      break;
    }

    if (seen.has(result.identifier)) {
      continue;
    }

    const titleKey = normalizeSearchInput(result.title);
    if (titleKey && seenTitles.has(titleKey)) {
      continue;
    }

    if (titleKey) {
      seenTitles.add(titleKey);
    }
    selected.push(result);
  }

  return selected;
}

function isAbortError(error) {
  const name = error?.name;
  return name === "AbortError" || name === "TimeoutError";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = SEARCH_NETWORK_TIMEOUT_MS) {
  const externalSignal = options.signal;
  const controller = new AbortController();
  const onAbort = () => {
    controller.abort(externalSignal?.reason || new DOMException("Request aborted", "AbortError"));
  };

  if (externalSignal?.aborted) {
    onAbort();
  } else if (externalSignal) {
    externalSignal.addEventListener("abort", onAbort, { once: true });
  }

  const timeoutId = window.setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onAbort);
    }
  }
}

async function awaitWithAbort(promise, signal) {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    throw signal.reason || new DOMException("Request aborted", "AbortError");
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason || new DOMException("Request aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
    promise
      .then((value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      })
      .catch((error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      });
  });
}

async function performArchiveSearch(params, signal) {
  const response = await fetchWithTimeout(`${IA_SEARCH_URL}?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  const payload = signal ? await awaitWithAbort(response.json(), signal) : await response.json();
  return payload.response?.docs ?? [];
}

async function fetchPlayableSource(result, signal) {
  const identifier = String(result?.identifier || "").trim();
  const normalizedIdentifier = identifier.toLowerCase();
  const now = Date.now();
  if (normalizedIdentifier) {
    const cached = sourceMetadataCache.get(normalizedIdentifier);
    if (cached && now - cached.fetchedAt < SOURCE_METADATA_CACHE_TTL_MS) {
      return { ...result, ...cached.source };
    }
  }

  if (normalizedIdentifier) {
    const inFlight = sourceMetadataInflight.get(normalizedIdentifier);
    if (inFlight && now - inFlight.startedAt < SOURCE_METADATA_REQUEST_TTL_MS) {
      return await awaitWithAbort(inFlight.promise, signal);
    }
  }

  const request = (async () => {
    const response = await fetchWithTimeout(`${IA_METADATA_URL}/${encodeURIComponent(result.identifier)}`, { signal });
    if (!response.ok) {
      throw new Error(`Metadata failed with status ${response.status}`);
    }

    const metadata = signal ? await awaitWithAbort(response.json(), signal) : await response.json();
    const file = choosePlayableFile(metadata.files ?? []);
    if (!file) {
      throw new Error("No playable video file found.");
    }

    return {
      ...result,
      duration: Number(metadata.metadata?.runtime) || 0,
      mediaUrl: `${IA_DOWNLOAD_URL}/${encodeURIComponent(result.identifier)}/${encodePath(file.name)}`,
      mediaName: file.name,
      mediaFormat: file.format ?? "video",
    };
  })();

  if (normalizedIdentifier) {
    sourceMetadataInflight.set(normalizedIdentifier, {
      startedAt: now,
      promise: request,
    });
  }

  try {
    const playableSource = signal ? await awaitWithAbort(request, signal) : await request;
    if (normalizedIdentifier) {
      sourceMetadataCache.set(normalizedIdentifier, {
        fetchedAt: Date.now(),
        source: playableSource,
      });
      pruneSourceMetadataCache();
      queueSourceMetadataCachePersist();
    }

    return playableSource;
  } finally {
    if (normalizedIdentifier) {
      sourceMetadataInflight.delete(normalizedIdentifier);
    }
  }
}

function pruneSourceMetadataCache() {
  if (sourceMetadataCache.size <= SOURCE_METADATA_CACHE_MAX_SIZE) {
    return;
  }

  const oldest = [...sourceMetadataCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
  const excess = sourceMetadataCache.size - SOURCE_METADATA_CACHE_MAX_SIZE;
  for (let index = 0; index < excess; index += 1) {
    const keyToDelete = oldest[index]?.[0];
    if (keyToDelete) {
      sourceMetadataCache.delete(keyToDelete);
    }
  }
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

function renderTimeSignatureOptions(selectedTimeSignature = resolvePreferredTimeSignature().value) {
  return TIME_SIGNATURE_OPTIONS.map(
    (signature) => `<option value="${signature.value}" ${signature.value === selectedTimeSignature ? "selected" : ""}>${signature.label}</option>`,
  ).join("");
}

function renderTransportMeter(beatsPerBar = getTransportBeatsPerBar()) {
  return Array.from({ length: beatsPerBar }, (_, index) => `<span class="beat-light" data-beat="${index}"></span>`).join("");
}

function getDebugSnapshot() {
  const selectedClips = getSelectedArrangementClipTargets().map(({ track, stepIndex }) => `${track.id}@${stepIndex + 1}`);
  return {
    transport: transport
      ? {
          active: !!transport.active,
          scene: Number.isFinite(Number(transport.arrangementStep)) ? Number(transport.arrangementStep) + 1 : null,
          bpm: transport.bpm,
          beatMs: Number(transport.beatMs?.toFixed?.(2) || transport.beatMs),
          nextBeatInMs: Number.isFinite(Number(transport.nextBeatAt)) ? Math.round(transport.nextBeatAt - performance.now()) : null,
        }
      : null,
    arrangement: {
      enabled: !!arrangement?.enabled,
      step: Number.isFinite(Number(arrangement?.step)) ? Number(arrangement.step) + 1 : null,
      clips: arrangement?.clips?.length || 0,
      selectedClips,
    },
    tracks: tracks.map((track) => {
      const video = getTrackVideo(track);
      const state = getTrackPlaybackState(track) || track;
      return {
        id: track.id,
        name: track.name,
        mediaStatus: getTrackMediaStatus(track, state?.source || track.source),
        source: getTrackPlaybackSourceUrl(track, state),
        anchor: Number(state?.startTime || 0),
        density: normalizeRetriggersPerBar(state?.retriggersPerBar),
        muted: !!state?.muted,
        volume: Number(state?.volume ?? track.volume),
        video: video
          ? {
              currentTime: Number(video.currentTime.toFixed(3)),
              paused: !!video.paused,
              readyState: video.readyState,
              muted: !!video.muted,
              volume: Number(video.volume.toFixed(3)),
            }
          : null,
        timing: {
          stepMs: Number.isFinite(Number(track.stepMs)) ? Number(track.stepMs.toFixed(2)) : null,
          nextTriggerInMs: Number.isFinite(Number(track.nextTriggerAt)) ? Math.round(track.nextTriggerAt - performance.now()) : null,
          primed: track.__transportPrimedFor === transport?.sessionToken,
        },
        audio: {
          graph: hasLiveTrackAudioGraph(track, video),
          webAudioDisabled: !!webAudioDisabled,
          context: audioContext?.state || null,
        },
      };
    }),
  };
}

function updateDebugPanel() {
  const panel = playerPanel?.querySelector("#debugPanel");
  if (!panel) {
    return;
  }

  panel.hidden = !debugPanelVisible;
  if (!debugPanelVisible) {
    return;
  }

  panel.textContent = JSON.stringify(getDebugSnapshot(), null, 2);
  if (debugPanelFrame === null) {
    debugPanelFrame = window.requestAnimationFrame(() => {
      debugPanelFrame = null;
      updateDebugPanel();
    });
  }
}

function toggleDebugPanel(force = null) {
  debugPanelVisible = typeof force === "boolean" ? force : !debugPanelVisible;
  updateDebugPanel();
  setStatus(debugPanelVisible ? "Debug panel on" : "Debug panel off");
  return debugPanelVisible;
}

window.freemixToggleDebugPanel = toggleDebugPanel;
window.freemixGetDebugSnapshot = getDebugSnapshot;

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
  const showQuickStart = appState.userOnboarding?.needsHint && loadedTracks.length === 0;

  playerPanel.innerHTML = `
    <section class="workstation" aria-label="Track video looper">
      ${
        showQuickStart
          ? `
        <section class="launch-pad quick-launch">
          <span class="panel-label">Quick start</span>
          <div class="launch-pad-actions">
            <button class="launch-button" type="button" data-launch-action="load-sample">Load sample</button>
            <button class="launch-button" type="button" data-launch-action="add-track">Add layer</button>
            <button class="launch-button launch-button-primary" type="button" data-launch-action="play">Play</button>
          </div>
        </section>
      `
          : ""
      }

      <div class="source-strip">
        <div class="source-copy">
          <span class="panel-label">Sources</span>
          <h2>${escapeHtml(sourceLabel)}</h2>
          <p>${escapeHtml(sourceMeta || `${tracks.length} track slot${tracks.length === 1 ? "" : "s"} open`)}</p>
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
          <input id="bpmInput" type="number" min="40" max="220" step="1" value="${resolvePreferredBpm()}">
        </label>
        <label class="control-field">
          <span>Sig</span>
          <select id="timeSignatureSelect">
            ${renderTimeSignatureOptions()}
          </select>
        </label>
        <button class="transport-button metronome-button active" id="metroButton" type="button">
          Click
        </button>
        <button class="transport-button export-button" id="exportClipButton" type="button">Export Clip</button>
        <button class="transport-button export-button" id="exportArrangementButton" type="button">Export Arrangement</button>
        <div class="meter" aria-label="Bar position" style="--beat-count: ${getTransportBeatsPerBar()}">
          ${renderTransportMeter()}
        </div>
      </div>

      <div class="performance-grid">
        <div class="video-matrix layout-stack ${loadedTracks.length ? "has-sources" : "no-sources"}" aria-label="Video sources">
          ${tracks.map((track, index) => renderVideoCell(track, index)).join("")}
        </div>

      <div class="arrangement-track-inline">
          <section class="arrangement-column" aria-label="Arrangement panel">
            ${renderArrangementPanel()}
          </section>
          <div class="control-column">
            <div class="control-bank" aria-label="Track controls">
            <div class="track-add-row">
              <button
                id="addTrackButton"
                class="track-add-button"
                type="button"
                ${tracks.length >= MAX_TRACK_COUNT ? "disabled" : ""}
              >
                Add Track (${tracks.length}/${MAX_TRACK_COUNT})
              </button>
            </div>
            ${tracks.map((track) => renderTrackControlRow(track)).join("")}
          </div>
          </div>
        </div>
      </div>
      <pre class="debug-panel" id="debugPanel" hidden></pre>
    </section>
  `;

  invalidateUiNodeCache();
  bindWorkstationControls();
  tracks.forEach(applyTrackControlVisibility);
  tracks.forEach(updateTrackModeChips);
  syncArrangementTrackHeights();
  window.freemixRender?.updateTransportRow?.();
  window.freemixRender?.updateSourceStrip?.();
  updateDebugPanel();
  if (appState.userOnboarding?.needsHint) {
    showGuidance("Quick launch: load sample, seed bar, then press Play");
  }
}

function applyTrackControlVisibility(track) {
  const trackRow = getTrackRowElement(track);
  if (!trackRow) {
    return;
  }

  const isCollapsed = !!track.collapsed;

  trackRow.classList.toggle("is-advanced", !!track.showAdvanced);
  trackRow.classList.toggle("is-collapsed", isCollapsed);
  trackRow.querySelectorAll(".control-advanced").forEach((control) => {
    control.classList.toggle("is-hidden", !track.showAdvanced);
  });

  const collapseControl = trackRow.querySelector('[data-control="collapsed"]');
  if (collapseControl) {
    collapseControl.textContent = isCollapsed ? "Show" : "Hide";
    collapseControl.setAttribute("aria-expanded", String(!isCollapsed));
    collapseControl.setAttribute("title", isCollapsed ? "Expand track" : "Collapse track");
  }

  updateTrackModeChips(track);
  syncArrangementTrackHeights();
}

function renderArrangementPanel() {
  return `
      <aside class="arrangement-panel" aria-label="Arrangement">
        <div class="arrangement-header">
          <span>Arr</span>
          <label class="control-field arrangement-length-field">
            <span>Bars</span>
            <input
              id="arrangementStepsSelect"
              type="number"
              min="${MIN_ARRANGEMENT_STEPS}"
              max="${MAX_ARRANGEMENT_STEPS}"
              step="1"
              value="${arrangementStepCount}"
              inputmode="numeric"
              aria-label="Arrangement bars"
            >
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
            class="arrangement-delete ${arrangementDeleteMode ? "active" : ""}"
            type="button"
            id="arrangementDeleteButton"
            aria-pressed="${arrangementDeleteMode}"
          >
            ${arrangementDeleteMode ? "Deleting" : "Delete"}
          </button>
          <button
            class="arrangement-action"
            type="button"
            id="arrangementCopyAllButton"
            title="Copy current section into all empty sections"
          >
            Fill
          </button>
          <button class="arrangement-clear" type="button" id="arrangementClear">Clear</button>
        </div>
        <div class="arrangement-clear-group">
          <div class="arrangement-clear-menu" id="arrangementClearMenu" data-open="false" hidden>
            <small>Clear all sections?</small>
            <button class="arrangement-clear-action" type="button" data-arrangement-clear="confirm">
              Yes
            </button>
            <button class="arrangement-clear-action" type="button" data-arrangement-clear="cancel">
              No
            </button>
          </div>
        </div>
        <div class="selected-target-label" id="selectedTargetLabel">${escapeHtml(getSelectedEditTargetLabel())}</div>
        ${renderArrangementSceneColorSelector()}
        <div class="arrangement-step-labels" style="--arrangement-steps: ${arrangementStepCount}" aria-label="Arrangement steps">
          ${renderArrangementStepLabels()}
        </div>
        ${renderArrangementGrid()}
        ${renderDebugPanel()}
      </aside>
  `;
}

function renderArrangementSceneColorSelector() {
  const activeColor = getArrangementSceneColorIndex(arrangement?.step);
  return `
    <div class="arrangement-scene-colors" aria-label="Scene color">
      ${ARRANGEMENT_SCENE_COLORS.map(
        (color, index) => `
          <button
            class="arrangement-scene-color ${index === activeColor ? "active" : ""}"
            type="button"
            data-arrangement-scene-color="${index}"
            aria-pressed="${index === activeColor}"
            aria-label="Set scene color ${escapeHtml(color.label)}"
            title="${escapeHtml(color.label)}"
            style="--scene-swatch-color: ${color.value};"
          ></button>
        `,
      ).join("")}
    </div>
  `;
}

function renderArrangementStepLabels() {
  return `
    <span class="arrangement-corner" aria-hidden="true"></span>
    ${Array.from({ length: arrangementStepCount }, (_, index) => renderArrangementStepLabel(index)).join("")}
  `;
}

function renderDebugPanel() {
  if (typeof window.freemixRenderDebugPanel !== "function") {
    return "";
  }

  return window.freemixRenderDebugPanel();
}

function renderArrangementStepLabel(stepIndex) {
  const isCopySource = false;
  return `
    <button
      class="arrangement-step-label ${isCopySource ? "copy-source" : ""}"
      type="button"
      data-arr-step="${stepIndex}"
      draggable="false"
      title="${isCopySource ? "Copy source selected" : "Select or paste section here"}"
    >
      ${stepIndex + 1}
    </button>
  `;
}

function renderArrangementRow(track) {
  return `
    ${arrangement.clips
      .map((step, index) => {
        const clip = step[track.id];
        const canDragCopy = !!clip;
        const sceneColor = getArrangementSceneColor(index, clip);
        const densityCount = clip ? normalizeRetriggersPerBar(clip.retriggersPerBar) : 1;
        const densityClass = clip && densityCount > 1 ? "has-density-bars" : "";
        const sceneStyles = [
          sceneColor ? `--scene-track-color: ${sceneColor}` : "",
          clip && densityCount > 1 ? `--clip-density-count: ${densityCount}` : "",
        ].filter(Boolean);
        const sceneStyle = sceneStyles.length ? ` style="${sceneStyles.join("; ")};"` : "";
        const title = arrangementDeleteMode
          ? clip
            ? `Delete ${track.name} from scene ${index + 1}`
            : `Scene ${index + 1} has no ${track.name} clip`
          : clip
            ? `${track.name} scene ${index + 1}; ${RETRIGGER_LABELS[densityCount] || densityCount} density; click to edit, drag to copy`
            : `Capture ${track.name} into scene ${index + 1}`;
        return `
          <button
            class="arrangement-cell ${track.color} ${clip ? "filled" : ""} ${densityClass} ${isArrangementClipSelected(track.id, index) ? "selected" : ""} ${transport?.active && arrangement.step === index ? "playing" : ""}"
            type="button"
            data-arr-track="${track.id}"
            data-arr-step="${index}"
            draggable="${canDragCopy ? "true" : "false"}"
            title="${escapeHtml(title)}"
            ${sceneStyle}
          >
            ${clip ? "x" : ""}
          </button>
        `;
      })
      .join("")}
  `;
}

function renderArrangementGridRows() {
  return tracks
    .map(
      (track) => `
        <div class="arrangement-track-row" data-track-id="${track.id}">
          <div class="arrangement-track-label ${track.color}" title="${escapeHtml(track.name)}">
            ${escapeHtml(track.name)}
          </div>
          ${renderArrangementRow(track)}
        </div>
      `,
    )
    .join("");
}

function renderArrangementGrid() {
  return `
    <div class="arrangement-grid" style="--arrangement-steps: ${arrangementStepCount}" aria-label="Arrangement lanes">
      ${renderArrangementGridRows()}
    </div>
  `;
}

function renderVideoCell(track, index) {
  const renderState = getTrackRenderState(track);
  const renderSource = renderState.source || track.source;
  const mediaStatus = getTrackMediaStatus(track, renderSource);
  const mediaStatusLabel = getTrackMediaStatusLabel(mediaStatus);
  return `
    <div class="video-cell ${track.color} blend-${renderState.blendMode || TRACK_BLEND_DEFAULTS[0]} ${renderSource ? "has-source" : "no-source"}" data-track-id="${track.id}" data-media-status="${escapeHtml(mediaStatus)}" style="--layer-index: ${index + 1}">
      ${
        renderSource
        ? `<video
              class="track-video"
              id="video-${track.id}"
              src="${renderSource.mediaUrl}"
              preload="auto"
               playsinline
             ></video>`
          : `<div class="track-empty-video" aria-hidden="true"></div>`
      }
      <div class="track-badge">
        <strong>${escapeHtml(track.name)}</strong>
        ${track.role ? `<span>${escapeHtml(track.role)}</span>` : ""}
      </div>
      <div class="media-status-badge">${escapeHtml(mediaStatusLabel)}</div>
      <div class="trigger-flash" aria-hidden="true"></div>
    </div>
  `;
}

function getTrackMediaStatus(track, renderSource = null) {
  const status = typeof track?.mediaStatus === "string" ? track.mediaStatus : "";
  if (status === "loading" || status === "failed" || status === "cors-limited" || status === "audio-only" || status === "video-only") {
    return status;
  }

  return renderSource ? "ready" : "empty";
}

function getTrackMediaStatusLabel(status) {
  return {
    "audio-only": "Audio only",
    "cors-limited": "CORS limited",
    empty: "Empty",
    failed: "Failed",
    loading: "Loading",
    ready: "Ready",
    "video-only": "Video only",
  }[status] || "Unknown";
}

function setTrackMediaStatus(trackOrId, status, options = {}) {
  const track = typeof trackOrId === "string" ? getTrackById(trackOrId) : trackOrId;
  if (!track) {
    return;
  }

  track.mediaStatus = status;
  const cell = getTrackCell(track);
  if (cell) {
    const renderState = getTrackRenderState(track);
    const normalizedStatus = getTrackMediaStatus(track, renderState?.source || track.source);
    cell.dataset.mediaStatus = normalizedStatus;
    const badge = cell.querySelector(".media-status-badge");
    if (badge) {
      badge.textContent = getTrackMediaStatusLabel(normalizedStatus);
    }
  }

  if (options.statusMessage) {
    setStatus(options.statusMessage, !!options.isError);
  }
}

window.freemixSetTrackMediaStatus = setTrackMediaStatus;

function renderTrackControlRow(track) {
  const renderState = getTrackRenderState(track);
  const renderSource = renderState.source || track.source;
  const sourceTitle = renderSource?.title ?? "Empty slot";
  const sourceMeta = renderSource
    ? [renderSource.creator, renderSource.year].filter(Boolean).join(" - ") || renderSource.mediaFormat
    : "Search to load video";
  const sourceControls = renderTrackControls(track, TRACK_CONTROL_SECTIONS.source);
  const timingControls = renderTrackControls(track, TRACK_CONTROL_SECTIONS.timing);
  const densityControls = renderTrackControls(track, TRACK_CONTROL_SECTIONS.density);
  const levelControls = renderTrackControls(track, TRACK_CONTROL_SECTIONS.performance);
  const advancedControls = TRACK_CONTROL_SECTIONS.advanced
    .map((control) => renderTrackControlField(track, control))
    .join("");
  const activeChip = renderState.muted ? "" : " is-on";

  return `
    <article class="track-row ${track.color}${track.collapsed ? " is-collapsed" : ""}" data-track-row-id="${track.id}">
      <div class="track-row-label">
        <div class="track-row-title">
          <button
            class="track-state-chip track-title-action track-collapse-toggle"
            type="button"
            data-track-control="${track.id}"
            data-control="collapsed"
            aria-pressed="${!track.collapsed}"
            aria-expanded="${!track.collapsed}"
            aria-label="${track.collapsed ? "Expand track" : "Collapse track"}"
            title="${track.collapsed ? "Expand track" : "Collapse track"}"
          >
            ${getTrackCollapseGlyph(track.collapsed)}
          </button>
          <span
            class="track-row-name"
            data-track-control="${track.id}"
            data-track-name-label="true"
            tabindex="0"
            role="button"
            aria-label="Rename ${escapeHtml(track.name)}"
            title="${escapeHtml(track.name)}"
          >
            ${escapeHtml(track.name)}
          </span>
          <input
            class="track-row-name-input"
            type="text"
            data-track-control="${track.id}"
            data-control="name"
            data-track-name-input="true"
            value="${escapeHtml(track.name)}"
            maxlength="${TRACK_NAME_MAX_LENGTH}"
            autocomplete="off"
            spellcheck="false"
            hidden
          />
        </div>
        <div class="track-state-chips" aria-label="Track states">
          <span class="track-state-chip${activeChip}" data-state="active">Active</span>
          <span class="track-state-chip" data-state="muted">Muted</span>
          <span class="track-state-chip" data-state="fx">FX</span>
          <button
            class="track-state-chip"
            type="button"
            data-track-control="${track.id}"
            data-control="solo"
            data-state="solo"
            aria-pressed="${!!track.solo}"
            title="Solo this channel"
          >
            Solo
          </button>
        </div>
      </div>
      <div class="track-row-body">
        <div class="track-channel-row track-channel-row--top">
          <div class="track-source">
            ${sourceControls}
            <div class="track-source-name" title="${escapeHtml(sourceTitle)}">
              <strong>${escapeHtml(sourceTitle)}</strong>
              <span>${escapeHtml(sourceMeta)}</span>
            </div>
            <div class="track-results" id="results-${track.id}" hidden></div>
          </div>
          ${densityControls}
          <button
            class="track-toggle"
            type="button"
            data-track-control="${track.id}"
            data-control="muted"
            aria-pressed="${renderState.muted}"
            title="${renderState.muted ? "Unmute this channel" : "Mute this channel"}"
          >
            ${renderState.muted ? "Muted" : "On"}
          </button>
        </div>
        <div class="track-channel-row track-channel-row--bottom">
          ${timingControls}
          ${levelControls}
        </div>
        ${advancedControls}
      </div>
    </article>
  `;
}

function renderTrackControls(track, controls) {
  return controls
    .map((control) => renderTrackControlField(track, control))
    .join("");
}

function renderTrackControlLabel(control) {
  const label = control.label ? escapeHtml(control.label) : "";
  const tooltip = control.tooltip || control.label || "";
  const icon = control.icon ? `<span class="control-field-icon" aria-hidden="true">${escapeHtml(control.icon)}</span>` : "";
  return `<span class="control-field-label" title="${escapeHtml(tooltip)}">${icon}${label}</span>`;
}

function renderTrackControlField(track, control) {
  const renderState = getTrackRenderState(track);
  const isAdvanced = control.visibility === "advanced";
  const className = `control-field ${control.fieldClass || ""}`.trim();
  const trackAttributes = `data-track-control="${track.id}" data-control="${control.control}"`;
  const visibilityClass = isAdvanced ? "control-advanced" : "";
  const sourceDuration = Number(renderState?.source?.durationSeconds ?? track?.source?.durationSeconds);
  const resolvedMax =
    control.control === "startTime" || control.control === "startNumber"
      ? Number.isFinite(sourceDuration) && sourceDuration > 0
        ? String(sourceDuration)
        : control.inputProps?.max || ""
      : control.inputProps?.max || "";
  const resolvedValue =
    control.control === "startTime" || control.control === "startNumber"
      ? getTrackStartControlValue(track)
      : control.control === "durationFilter"
        ? renderState.durationFilter ?? track.durationFilter
        : renderState?.[control.control];

  if (control.type === "search") {
    return `
      <label class="control-field ${control.fieldClass}">
        ${renderTrackControlLabel(control)}
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
        ${renderTrackControlLabel(control)}
        <select class="${visibilityClass}" ${trackAttributes}>
          ${control.options
                .map(
                  (option) =>
                `<option value="${option.value}" ${String(option.value) === String(resolvedValue) ? "selected" : ""}>${option.label}</option>`,
                )
                .join("")}
        </select>
      </label>
    `;
  }

  if (control.type === "range" || control.type === "number") {
    return `
      <label class="${className}">
        ${renderTrackControlLabel(control)}
        <input
          type="${control.type}"
          min="${control.inputProps.min}"
          max="${resolvedMax}"
          step="${control.inputProps.step}"
          value="${resolvedValue}"
          class="${visibilityClass}"
          ${trackAttributes}
        >
      </label>
    `;
  }

  if (control.type === "fx-chain") {
    const speedValue = Number.isFinite(renderState.speed) ? renderState.speed : 1;
    const pitchValue = Number.isFinite(renderState.pitch) ? renderState.pitch : 0;

    return `
      <div class="fx-chain" aria-label="${escapeHtml(track.name)} effects chain">
        <div class="fx-header">
          <span class="fx-title">FX</span>
          <div class="fx-top-controls">
            <label class="control-field fx-blend">
              <span>Blend</span>
              <select
                class="track-blend-select"
                data-track-control="${track.id}"
                data-control="blendMode"
              >
                ${BLEND_MODE_OPTIONS.map(
                  (option) => `<option value="${option.value}" ${String(option.value) === String(renderState.blendMode) ? "selected" : ""}>${option.label}</option>`,
                ).join("")}
              </select>
            </label>
            <label class="control-field fx-opacity">
              <span>Opacity</span>
              <input
                id="opacity-${track.id}"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value="${Number.isFinite(renderState.opacity) ? renderState.opacity : 1}"
                data-track-control="${track.id}"
                data-control="opacity"
                aria-label="${escapeHtml(`${track.name} Opacity`)}"
              >
            </label>
            <button
              class="track-advanced-toggle track-fx-toggle"
              type="button"
              data-track-control="${track.id}"
              data-control="advanced"
              aria-pressed="${!!track.showAdvanced}"
              title="Reveal advanced controls"
            >
              ${track.showAdvanced ? "Less" : "More"}
            </button>
            <button
              class="fx-bypass-button control-advanced"
              type="button"
              data-track-control="${track.id}"
              data-control="fxBypass"
              title="Reset all FX controls to neutral"
            >
              Bypass
            </button>
            <label class="control-field fx-top-control control-advanced">
              <span>Pitch</span>
              <output class="fx-mini-value" for="pitch-${track.id}" aria-hidden="true">${pitchValue > 0 ? "+" : ""}${pitchValue}</output>
              <input
                id="pitch-${track.id}"
                type="range"
                min="-12"
                max="12"
                step="1"
                value="${pitchValue}"
                data-track-control="${track.id}"
                data-control="pitch"
                aria-label="${escapeHtml(`${track.name} Pitch`)}"
              >
            </label>
            <label class="control-field fx-top-control control-advanced">
              <span>Speed</span>
              <output class="fx-mini-value" for="speed-${track.id}" aria-hidden="true">${speedValue.toFixed(2)}x</output>
              <input
                id="speed-${track.id}"
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value="${speedValue}"
                data-track-control="${track.id}"
                data-control="speed"
                aria-label="${escapeHtml(`${track.name} Speed`)}"
              >
            </label>
          </div>
        </div>
        ${FX_CONTROLS.map((fxControl) => renderFxControl(track, fxControl)).join("")}
      </div>
    `;
  }

  return "";
}

function renderFxControl(track, fxControl) {
  const renderState = getTrackRenderState(track);
  const fxValue = Number(renderState.fx?.[fxControl.key] ?? 0);
  const fxDisplay = Number.isInteger(fxControl.step)
    ? Math.round(fxValue)
    : fxValue.toFixed(2).replace(/\.?0+$/, "");

  return `
    <div class="control-field fx-field control-advanced">
      <label for="${fxControl.key}-${track.id}">${fxControl.label}</label>
      <output class="fx-value" for="${fxControl.key}-${track.id}" aria-hidden="true">${escapeHtml(fxDisplay)}</output>
      <button
        class="fx-reset-button"
        type="button"
        data-track-control="${track.id}"
        data-control="fxReset"
        data-fx-reset="${fxControl.key}"
        title="Reset ${escapeHtml(fxControl.label)} to neutral"
      >
        0
      </button>
      <input
        id="${fxControl.key}-${track.id}"
        type="range"
        min="${fxControl.min}"
        max="${fxControl.max}"
        step="${fxControl.step}"
        value="${fxValue}"
        data-track-control="${track.id}"
        data-control="${fxControl.key}"
        aria-label="${escapeHtml(`${track.name} ${fxControl.label}`)}"
      >
    </div>
  `;
}

function bindWorkstationControls() {
  if (typeof window.freemixBindWorkstationControls === "function") {
    window.freemixBindWorkstationControls();
    tracks.forEach((track) => {
      applyVideoFx(track);
      applyTrackBlend(track);
      applyTrackOpacity(track);
      applyTrackPitchAndSpeed(track);
    });
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
  const track = getTrackById(control.dataset.trackControl);
  if (!track) {
    return;
  }

  const controlName = control.dataset.control;
  const safeStepIndex = getArrangementStepIndex(arrangement?.step);
  const shouldCreateSceneClipOnEdit =
    SCENE_EDITABLE_CONTROLS.has(controlName) &&
    safeStepIndex !== null &&
    !getArrangementStepClip(track, safeStepIndex) &&
    controlName !== "sourceSearch";
  let editableState = shouldCreateSceneClipOnEdit
    ? getArrangementStepClipForTrack(track, { stepIndex: safeStepIndex, create: true })
    : getTrackSceneEditableState(track, controlName);
  const isInputEvent = event?.type === "input";
  const commitControlEdit = () => {
    if (SCENE_EDITABLE_CONTROLS.has(controlName) && editableState !== track && arrangement?.clips) {
      const stepToRefresh = safeStepIndex === null ? 0 : safeStepIndex;
      refreshArrangementStepCells(stepToRefresh);
    }

    if (controlName === "sourceSearch") {
      return;
    }

    if (isInputEvent) {
      queueControlStatePersist();
    } else {
      markAppStateDirty(true);
    }
  };

  if (controlName === "sourceSearch") {
    queueTrackSearch(track, control.value.trim());
    return;
  }

  if (controlName === "fxReset") {
    const fxKey = control.dataset.fxReset;
    if (!fxKey || !FX_CONTROL_INDEX[fxKey] || !editableState.fx) {
      return;
    }

    if (editableState !== track && arrangement?.clips) {
      captureArrangementEdit(`Reset ${fxKey} in scene ${(safeStepIndex ?? 0) + 1}`);
    }
    editableState.fx[fxKey] = 0;
    applyArrangementClipControlValue(track, fxKey, 0, editableState);
    syncFxControl(track, fxKey);
    applyTrackFx(track, editableState);
    applyVideoFx(track, editableState);
    updateTrackModeChips(track);
    markAppStateDirty(true);
    return;
  }

  if (controlName === "fxBypass") {
    if (!editableState.fx) {
      return;
    }

    if (editableState !== track && arrangement?.clips) {
      captureArrangementEdit(`Bypassed FX in scene ${(safeStepIndex ?? 0) + 1}`);
    }
    FX_CONTROLS.forEach((fxControl) => {
      editableState.fx[fxControl.key] = 0;
      applyArrangementClipControlValue(track, fxControl.key, 0, editableState);
      syncFxControl(track, fxControl.key);
    });
    applyTrackFx(track, editableState);
    applyVideoFx(track, editableState);
    updateTrackModeChips(track);
    markAppStateDirty(true);
    setStatus(`${track.name}: FX bypassed`);
    return;
  }

  if (!isInputEvent && SCENE_EDITABLE_CONTROLS.has(controlName) && editableState !== track && arrangement?.clips) {
    captureArrangementEdit(`Changed ${controlName} in scene ${(safeStepIndex ?? 0) + 1}`);
  }

  if (controlName === "durationFilter") {
    editableState.durationFilter = control.value;
    applyArrangementClipControlValue(track, "durationFilter", editableState.durationFilter, editableState);
    const [sourceSearch] = getTrackControls(track, "sourceSearch");
    queueTrackSearch(track, sourceSearch?.value.trim() ?? "");
    commitControlEdit();
    return;
  }

  if (controlName === "blendMode") {
    editableState.blendMode = control.value;
    applyArrangementClipControlValue(track, "blendMode", editableState.blendMode, editableState);
    applyTrackBlend(track, editableState);
    updateTrackModeChips(track);
    commitControlEdit();
    return;
  }

  if (controlName === "opacity") {
    editableState.opacity = clamp(Number(control.value), 0, 1);
    applyArrangementClipControlValue(track, "opacity", editableState.opacity, editableState);
    applyTrackOpacity(track, editableState);
    updateTrackModeChips(track);
    commitControlEdit();
    return;
  }

  if (controlName === "speed") {
    editableState.speed = clamp(Number(control.value), 0.5, 2);
    applyArrangementClipControlValue(track, "speed", editableState.speed, editableState);
    const valueEl = control.parentElement?.querySelector(".fx-mini-value");
    if (valueEl) {
      valueEl.textContent = `${Number(editableState.speed).toFixed(2)}x`;
    }
    applyTrackPitchAndSpeed(track, editableState);
    commitControlEdit();
    return;
  }

  if (controlName === "pitch") {
    editableState.pitch = clamp(Number(control.value), -12, 12);
    applyArrangementClipControlValue(track, "pitch", editableState.pitch, editableState);
    const valueEl = control.parentElement?.querySelector(".fx-mini-value");
    if (valueEl) {
      const displayPitch = Number(editableState.pitch);
      valueEl.textContent = `${displayPitch > 0 ? "+" : ""}${displayPitch}`;
    }
    applyTrackPitchAndSpeed(track, editableState);
    updateTrackModeChips(track);
    commitControlEdit();
    return;
  }

  if (controlName === "startTime" || controlName === "startNumber") {
    const video = getTrackVideo(track);
    const nextStartTime = normalizeStartTimeInput(control.value, editableState, video);
    if (!Number.isFinite(nextStartTime)) {
      return;
    }

    editableState.startTime = nextStartTime;

    applyArrangementClipControlValue(track, "startTime", nextStartTime, editableState);

    syncStartControls(track);
    if (video && transport?.active) {
      const rearmAt = Number.isFinite(transport?.nextBeatAt) ? transport.nextBeatAt : performance.now();
      resetTrackPulseCursor(track, rearmAt, { fireAtReference: false });
    }

    if (video) {
      const activeClipState = editableState || getTrackPlaybackState(track) || track;
      safeSetCurrentTime(video, activeClipState, track, { force: true });
      applyTrackPitchAndSpeed(track, activeClipState);
      applyTrackVolume(track, activeClipState);

      if (!isInputEvent && transport?.active && isTrackAudibleInMix(track, activeClipState) && Number.isFinite(track.stepMs) && track.stepMs > 0) {
        const scheduleFrom = Number.isFinite(track.nextTriggerAt) ? track.nextTriggerAt : performance.now();
        resetTrackPulseCursor(track, scheduleFrom, { fireAtReference: false });
      }
    }

    if (!transport?.active && event?.type !== "input") {
      previewTrack(track);
    }

    commitControlEdit();
    return;
  }

  if (controlName === "retriggersPerBar") {
    editableState.retriggersPerBar = normalizeRetriggersPerBar(control.value);
    applyArrangementClipControlValue(track, "retriggersPerBar", editableState.retriggersPerBar, editableState);
    track.lastStep = -1;
    resyncTrackTiming(track);
    previewTrack(track);
  }

  if (controlName === "volume") {
    editableState.volume = Number(control.value);
    applyArrangementClipControlValue(track, "volume", editableState.volume, editableState);
    applyTrackVolume(track, editableState);
  }

  if (editableState.fx && Object.prototype.hasOwnProperty.call(editableState.fx, controlName)) {
    editableState.fx[controlName] = Number(control.value);
    applyArrangementClipControlValue(track, controlName, editableState.fx[controlName], editableState);
    const valueEl = control.parentElement?.querySelector(".fx-value");
    const fxDefinition = FX_CONTROL_INDEX[controlName];
    if (valueEl && fxDefinition) {
      const value =
        Number.isInteger(fxDefinition.step) || fxDefinition.step >= 1
          ? Math.round(editableState.fx[controlName])
          : editableState.fx[controlName].toFixed(2).replace(/\.?0+$/, "");
      valueEl.textContent = String(value);
    }
    applyTrackFx(track, editableState);
    applyVideoFx(track, editableState);
    updateTrackModeChips(track);
  }

  if (controlName === "muted") {
    editableState.muted = !editableState.muted;
    applyArrangementClipControlValue(track, "muted", editableState.muted, editableState);
    control.textContent = editableState.muted ? "Muted" : "On";
    control.setAttribute("aria-pressed", String(editableState.muted));
    updateTrackModeChips(track);
    applyTrackVolume(track, editableState);
  }

  if (controlName === "solo") {
    track.solo = !track.solo;
    control.setAttribute("aria-pressed", String(track.solo));
    updateTrackModeChips(track);
  }

  if (controlName === "advanced") {
    track.showAdvanced = !track.showAdvanced;
    control.textContent = track.showAdvanced ? "Less" : "More";
    control.setAttribute("aria-pressed", String(track.showAdvanced));
    applyTrackControlVisibility(track);
    updateTrackModeChips(track);
  }

  if (controlName === "collapsed") {
    track.collapsed = !track.collapsed;
    control.setAttribute("aria-pressed", String(!track.collapsed));
    control.textContent = getTrackCollapseGlyph(track.collapsed);
    applyTrackControlVisibility(track);
    markAppStateDirty();
  }

  if (controlName === "name") {
    track.name = normalizeTrackName(control.value, track.name);
    syncTrackNameUi(track);
    markAppStateDirty(true);
  }

  commitControlEdit();
}

async function startTransport() {
  if (typeof clearGuidanceHint === "function") {
    clearGuidanceHint();
  }

  if (startTransport.runningPromise) {
    if (transport?.active) {
      return;
    }

    return startTransport.runningPromise;
  }

  const bootToken = (startTransport.bootToken ?? 0) + 1;
  startTransport.bootToken = bootToken;
  masterMuted = false;

  stopTransport(false, false);
  const startToken = bootToken;
  tracks.forEach((track) => {
    if (track.__transportPrimedFor === startToken) {
      return;
    }

    if (track.__transportPrimedFor) {
      delete track.__transportPrimedFor;
    }
  });
  startTransport.runningPromise = (async () => {
    try {
      if (typeof ensureAudioContext === "function") {
        try {
          await ensureAudioContext();
        } catch (error) {
          webAudioDisabled = true;
          console.warn(error);
          setStatus("Audio context failed, using native playback", true);
        }
      }

      await Promise.all(
        tracks
          .filter((track) => {
            if (arrangement.enabled && hasArrangementClips()) {
              const arrangementClip = getArrangementStepClip(track, arrangement.step);
              return !!arrangementClip && !!getTrackPlaybackSourceUrl(track, arrangementClip);
            }

            return !!getTrackPlaybackSourceUrl(track);
          })
          .map((track) =>
            primeTrackForTransport(track, startToken).catch((error) => {
              console.warn(error);
            }),
          ),
      );

      if (startTransport.bootToken !== startToken) {
        return;
      }

      // Start transport scheduling in the click stack to keep browser autoplay context
      // aligned with the user gesture that initiated playback.
      if (startTransport.bootToken !== bootToken) {
        return;
      }

      startTransportWithState(startToken);
    } catch (error) {
      console.warn(error);
      setStatus("Playback start failed", true);
    } finally {
      if (startTransport.bootToken === startToken) {
        startTransport.runningPromise = null;
      }
    }
  })();

  return startTransport.runningPromise;
}

const pendingAnchorSeeks = new Map();

function normalizeStartTimeInput(rawValue, track, video) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return Number.isFinite(track?.startTime) ? track.startTime : 0;
  }

  const clampedMinimum = Math.max(0, parsed);
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
    return clampedMinimum;
  }

  return Math.min(clampedMinimum, Math.max(video.duration, 0));
}

function playableStartTime(rawStartTime, video) {
  const parsed = Number(rawStartTime);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const clampedStart = Math.max(0, parsed);
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
    return clampedStart;
  }

  return Math.min(clampedStart, Math.max(video.duration - 0.2, 0));
}

function queueStartTimeSeek(video, track, ownerTrack = null) {
  const owner = ownerTrack || track;
  const trackId = owner?.id;
  if (!video || !trackId) {
    return;
  }

  const seekState = createAnchorSeekState(owner, track);
  if (!seekState) {
    return;
  }

  const existing = pendingAnchorSeeks.get(trackId);
  if (existing) {
    if (existing.frameId) {
      window.cancelAnimationFrame(existing.frameId);
    }

    if (existing.onLoadedMetadata) {
      video.removeEventListener("loadedmetadata", existing.onLoadedMetadata);
    }
    if (existing.onError) {
      video.removeEventListener("error", existing.onError);
    }
  }

  const requestId = (existing?.requestId ?? 0) + 1;
  const context = {
    requestId,
    trackId,
    seekState,
    frameId: null,
    onLoadedMetadata: null,
    onError: null,
  };

  context.onLoadedMetadata = () => {
    const latest = pendingAnchorSeeks.get(trackId);
    if (!latest || latest.requestId !== requestId) {
      return;
    }

    pendingAnchorSeeks.delete(trackId);
    const currentTrack = getTrackById(trackId);
    if (!currentTrack) {
      return;
    }

    if (latest.seekState?.sourceUrl) {
      setVideoCorsPolicy(video, latest.seekState.sourceUrl);
    }
    if (latest.seekState?.sourceUrl && video.src !== latest.seekState.sourceUrl) {
      video.src = latest.seekState.sourceUrl;
      video.load();
    }

    const seekPlaybackState = getTrackPlaybackState(currentTrack, latest.seekState?.sourceState) || currentTrack;
    safeSetCurrentTime(video, seekPlaybackState, currentTrack, { force: true });
  };

  context.onError = () => {
    const latest = pendingAnchorSeeks.get(trackId);
    if (!latest || latest.requestId !== requestId) {
      return;
    }

    pendingAnchorSeeks.delete(trackId);
  };

  if (video.readyState >= 1) {
    context.frameId = window.requestAnimationFrame(context.onLoadedMetadata);
    pendingAnchorSeeks.set(trackId, context);
    return;
  }

  video.addEventListener("loadedmetadata", context.onLoadedMetadata, { once: true });
  video.addEventListener("error", context.onError, { once: true });
  pendingAnchorSeeks.set(trackId, context);
  if (video.networkState !== 0) {
    video.load();
  }
}

function safeSetCurrentTime(video, track, ownerTrack = null, options = {}) {
  if (!video || !track) {
    return;
  }

  const force = !!options.force;
  const nextTime = safeStartTime(track, video);
  if (!Number.isFinite(nextTime)) {
    return;
  }

  if (video.readyState < 1) {
    queueStartTimeSeek(video, track, ownerTrack || track);
    return;
  }

  try {
    if (!force && almostEqual(video.currentTime, nextTime, 0.001)) {
      return;
    }

    video.currentTime = nextTime;
    return;
  } catch (error) {
    queueStartTimeSeek(video, track, ownerTrack || track);
  }
}

async function parkVideoAtAnchor(video, clipState, ownerTrack = null, options = {}) {
  if (!video || !clipState) {
    return false;
  }

  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : AV_READY_TIMEOUT_MS;
  await waitForTrackMetadata(video, timeoutMs);
  const anchorTime = safeStartTime(clipState, video);
  if (!Number.isFinite(anchorTime)) {
    return false;
  }

  safeSetCurrentTime(video, clipState, ownerTrack || clipState, { force: true });
  await awaitVideoSeek(video, anchorTime, timeoutMs);

  if (!almostEqual(video.currentTime, anchorTime, 0.01)) {
    safeSetCurrentTime(video, clipState, ownerTrack || clipState, { force: true });
    await awaitVideoSeek(video, anchorTime, timeoutMs);
  }

  return almostEqual(video.currentTime, anchorTime, 0.05);
}

function waitForTrackReady(video, timeoutMs = AV_READY_TIMEOUT_MS) {
  if (video.readyState >= 2) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("canplay", done);
      video.removeEventListener("error", done);
      resolve();
    };

    video.addEventListener("canplay", done, { once: true });
    video.addEventListener("error", done, { once: true });
    window.setTimeout(() => {
      video.removeEventListener("canplay", done);
      video.removeEventListener("error", done);
      resolve();
    }, timeoutMs);
  });
}

function waitForTrackMetadata(video, timeoutMs = AV_READY_TIMEOUT_MS) {
  if (!video || video.readyState >= 1) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("loadedmetadata", done);
      video.removeEventListener("error", done);
      window.clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = window.setTimeout(done, timeoutMs);
    video.addEventListener("loadedmetadata", done, { once: true });
    video.addEventListener("error", done, { once: true });
  });
}

function awaitVideoSeek(video, targetTime, timeoutMs = AV_READY_TIMEOUT_MS) {
  if (!video || !Number.isFinite(targetTime)) {
    return Promise.resolve();
  }

  if (!video.seeking && almostEqual(video.currentTime, targetTime, 0.001)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", done);
      window.clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = window.setTimeout(done, timeoutMs);
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", done, { once: true });
  });
}

function retriggerVideoAtAnchor(video, clip) {
  if (!video || !clip) {
    return;
  }

  const clipStartTime = safeStartTime(clip, video);
  if (!Number.isFinite(clipStartTime)) {
    return;
  }

  try {
    if (!almostEqual(video.currentTime, clipStartTime, 0.001)) {
      video.currentTime = clipStartTime;
    }
  } catch (error) {
    console.warn(error);
  }
}

function attemptVideoPlay(video, track, clipState, playbackToken = track?.__playbackToken, options = {}) {
  const shouldBeMuted = !!clipState?.muted || !!track.muted;
  const targetVolume = Number.isFinite(clipState?.volume) ? clipState.volume : Number(track.volume) || 1;
  const clip = clipState || track;
  const clipVolume = clamp(targetVolume, 0, 1);
  const clipSourceUrl = getTrackPlaybackSourceUrl(track, clip);
  const tokenAtStart = Number.isFinite(playbackToken) ? playbackToken : 0;
  const shouldSeekToAnchor = options.seekToAnchor !== false;
  const isCurrentPlaybackAttempt = () => track?.__playbackToken === tokenAtStart;

  if (!isCurrentPlaybackAttempt()) {
    return Promise.resolve(false);
  }

  if (clipSourceUrl && clipSourceUrl !== video.src) {
    setVideoCorsPolicy(video, clipSourceUrl);
    video.src = clipSourceUrl;
    video.load();
  }

  if (audioContext && audioContext.state !== "running" && track.audio) {
    disposeTrackAudio(track);
  }

  const playWithState = async (muted) => {
    if (!isCurrentPlaybackAttempt()) {
      return muted;
    }
    if (track.audio && !webAudioDisabled && audioContext && audioContext.state !== "running") {
      try {
        await ensureAudioContext();
      } catch (error) {
        console.warn(error);
      }
    }
    if (!webAudioDisabled && audioContext?.state === "running") {
      setupTrackAudio(track, video);
    }
    if (!isCurrentPlaybackAttempt()) {
      return muted;
    }

    const hasLiveAudioGraph = hasLiveTrackAudioGraph(track, video);
    if (video.muted !== muted) {
      video.muted = muted;
    }

    if (hasLiveAudioGraph && track.audio?.output?.gain) {
      const targetGain = muted ? 0 : clipVolume;
      if (!almostEqual(track.audio.output.gain.value, targetGain)) {
        track.audio.output.gain.value = targetGain;
      }
      if (!almostEqual(video.volume, 1)) {
        video.volume = 1;
      }
    } else {
      const targetVideoVolume = muted ? 0 : clipVolume;
      if (!almostEqual(video.volume, targetVideoVolume)) {
        video.volume = targetVideoVolume;
      }
    }

    if (video.readyState < 2 && video.networkState !== 0) {
      video.load();
    }

    if (shouldSeekToAnchor) {
      await parkVideoAtAnchor(video, clip, track);
    }

    await waitForTrackReady(video);
    if (!isCurrentPlaybackAttempt()) {
      return muted;
    }

    if (shouldSeekToAnchor) {
      await parkVideoAtAnchor(video, clip, track);
    }

    if (video.paused) {
      await video.play();
      if (!isCurrentPlaybackAttempt()) {
        return muted;
      }
    }

    return muted;
  };

  return playWithState(shouldBeMuted)
    .catch(async (error) => {
      if (!isCurrentPlaybackAttempt()) {
        return false;
      }
      if (shouldBeMuted || !(error instanceof DOMException)) {
        if (error instanceof DOMException) {
          setStatus(`Playback blocked: ${error.name}`, true);
        }
        throw error;
      }

      if (error.name !== "NotAllowedError") {
        throw error;
      }

      const nativeRetry = async () => {
        if (!isCurrentPlaybackAttempt()) {
          return false;
        }
        if (track.audio) {
          disposeTrackAudio(track);
        }
        if (video.muted !== shouldBeMuted) {
          video.muted = shouldBeMuted;
        }
        const fallbackVolume = shouldBeMuted ? 0 : clipVolume;
        if (!almostEqual(video.volume, fallbackVolume)) {
          video.volume = fallbackVolume;
        }
        await waitForTrackReady(video);
        if (!isCurrentPlaybackAttempt()) {
          return false;
        }
        await video.play();
        if (!isCurrentPlaybackAttempt()) {
          return false;
        }
        return shouldBeMuted;
      };

      try {
        const wasMuted = await playWithState(true);
        if (!isCurrentPlaybackAttempt()) {
          return false;
        }
        if (wasMuted) {
          video.muted = false;
          applyTrackVolume(track, clipState);

          try {
            await waitForTrackReady(video);
            if (!isCurrentPlaybackAttempt()) {
              return false;
            }
            await video.play();
            if (!isCurrentPlaybackAttempt()) {
              return false;
            }
            return false;
          } catch {
            // Fall through to native retry path.
          }
        }

        return wasMuted;
      } catch (fallbackError) {
        if (!isCurrentPlaybackAttempt()) {
          return false;
        }
        if (fallbackError instanceof DOMException) {
          setStatus(`Playback blocked: ${fallbackError.name}`, true);
        } else {
          setStatus("Playback failed", true);
        }

        try {
          const recovered = await nativeRetry();
          if (!shouldBeMuted && recovered) {
            video.muted = false;
            applyTrackVolume(track, clipState);
          }
          return recovered;
        } catch (nativeError) {
          throw nativeError;
        }
      }
    })
  .then((wasMuted) => {
      if (!isCurrentPlaybackAttempt()) {
        return false;
      }
      if (wasMuted && !shouldBeMuted) {
        video.muted = false;
        applyTrackVolume(track, clipState);
      } else {
        applyTrackVolume(track, clipState);
      }

      const nativeVolume = shouldBeMuted ? 0 : clipVolume;
      const hasLiveAudioGraph = hasLiveTrackAudioGraph(track, video);
      const finalVideoMuted = hasLiveAudioGraph ? false : shouldBeMuted;
      const finalVideoVolume = hasLiveAudioGraph ? 1 : nativeVolume;
      if (video.muted !== finalVideoMuted) {
        video.muted = finalVideoMuted;
      }
      if (!almostEqual(video.volume, finalVideoVolume)) {
        video.volume = finalVideoVolume;
      }
      if (!shouldBeMuted && track.audio?.output?.gain) {
        const targetGain = nativeVolume;
        if (!almostEqual(track.audio.output.gain.value, targetGain)) {
          track.audio.output.gain.value = targetGain;
        }
      }

      return true;
    })
    .catch((error) => {
      if (!isCurrentPlaybackAttempt()) {
        return false;
      }
      const hasName = error instanceof DOMException ? error.name : "";
      if (error instanceof DOMException) {
        setStatus(`Playback failed: ${error.name}`, true);
        if (error.name === "NotSupportedError") {
          setStatus("Media codec unsupported in this browser. Try another clip.", true);
        }
      } else {
        setStatus("Playback failed", true);
      }

      if (!shouldBeMuted && hasName === "NotAllowedError") {
        setStatus("Tap play again", true);
      }
      return false;
    });
}

function startTransportWithState(sessionToken = startTransport.bootToken) {
  if (startTransport.bootToken !== sessionToken) {
    return;
  }

  tracks.forEach((track) => {
    track.lastStep = -1;
    track.nextTriggerAt = 0;
    track.stepMs = 0;
  });

  tracks.forEach((track) => {
    const video = getTrackVideo(track);
    const playbackState =
      arrangement.enabled && hasArrangementClips()
        ? getArrangementStepClip(track, arrangement.step)
        : getTrackPlaybackState(track) || track;
    const sourceUrl = getTrackPlaybackSourceUrl(track, playbackState);

    if (!video || !sourceUrl) {
      return;
    }

    setVideoCorsPolicy(video, sourceUrl);
    if (sourceUrl && video.src !== sourceUrl) {
      video.src = sourceUrl;
      video.load();
    }
    safeSetCurrentTime(video, playbackState);
    setupTrackAudio(track, video);
    applyTrackVolume(track, playbackState);
  });

  const now = performance.now();
  const startAt = now;
  const timing = getTransportTimingFromState();
  syncTransportState({
    active: true,
    sessionToken,
    bpm: timing.bpm,
    beatMs: timing.beatMs,
    barMs: timing.barMs,
    beatsPerBar: timing.beatsPerBar,
    timeSignature: timing.timeSignature,
    timeSignatureNumerator: timing.numerator,
    timeSignatureDenominator: timing.denominator,
    timeSignatureNoteValue: timing.noteValue,
    startedAt: startAt,
    nextBeatAt: startAt,
    beatIndex: 0,
    arrangementStartStep: arrangement.step,
    arrangementStep: -1,
    frameId: null,
  });

  if (arrangement.enabled && hasArrangementClips()) {
    updateArrangementStep(arrangement.step, startAt, true);
  } else {
    updateTrackTriggerGrid(startAt);
  }

  window.freemixRender?.updateTransportRow?.();
  setStatus(arrangement.enabled && hasArrangementClips() ? `Arrangement playing: scene ${arrangement.step + 1}` : "Live mode playing");
  tickTransport();
}

function stopTransport(resetVideos = true, bumpToken = true) {
  if (bumpToken && Number.isFinite(startTransport.bootToken)) {
    startTransport.bootToken += 1;
  }
  startTransport.runningPromise = null;

  if (startTimeControlTrackers.size > 0) {
    startTimeControlTrackers.forEach((frameId) => {
      window.cancelAnimationFrame(frameId);
    });
    startTimeControlTrackers.clear();
  }

  if (pendingAnchorSeeks.size > 0) {
    pendingAnchorSeeks.forEach((entry, trackId) => {
      const video = getTrackVideo({ id: trackId });
      if (!video) {
        return;
      }

      if (entry?.onLoadedMetadata) {
        video.removeEventListener("loadedmetadata", entry.onLoadedMetadata);
      }
      if (entry?.onError) {
        video.removeEventListener("error", entry.onError);
      }
      if (entry?.frameId) {
        window.cancelAnimationFrame(entry.frameId);
      }
    });
    pendingAnchorSeeks.clear();
  }

  const shouldResetVideos = !!resetVideos;

  if (arrangementPlayheadUpdateFrame !== null) {
    window.cancelAnimationFrame(arrangementPlayheadUpdateFrame);
    arrangementPlayheadUpdateFrame = null;
  }

  if (transport?.frameId) {
    cancelAnimationFrame(transport.frameId);
    transport.frameId = null;
  }

  if (shouldResetVideos) {
    tracks.forEach((track) => {
      track.__playbackToken = Number.isFinite(track.__playbackToken) ? track.__playbackToken + 1 : 1;
      track.nextTriggerAt = Number.POSITIVE_INFINITY;
      track.lastStep = -1;
      track.__lastPlaybackSignature = null;
      track.__parkedAtAnchorFor = null;
      track.__parkedPlaybackSignature = null;
      delete track.__transportPrimedFor;
      delete track.__transportPrimeAttempt;
      if (track.__pendingPlaybackFrame) {
        window.cancelAnimationFrame(track.__pendingPlaybackFrame);
        track.__pendingPlaybackFrame = null;
      }
      disposeTrackAudio(track);
      const video = getTrackVideo(track);
      if (!video) {
        return;
      }

      if (video.pause && typeof video.pause === "function") {
        try {
          video.pause();
        } catch {
          // Best effort: keep resetting internal playback even if the browser refuses pause.
        }
      }
      setTrackBlackout(track, false);
      const selectedClip = getArrangementStepClip(track, arrangement?.step);
      safeSetCurrentTime(video, selectedClip || track);
    });

    playerPanel?.querySelectorAll("video, audio").forEach((media) => {
      if (media.pause && typeof media.pause === "function") {
        try {
          media.pause();
        } catch {
          // Best effort hard stop for any media element not tied to a track row.
        }
      }
    });
  }

  if (Number.isFinite(arrangementPlayheadStep)) {
    getArrangementCellsByStep(arrangementPlayheadStep).forEach((cell) => {
      cell.classList.remove("playing");
    });
  }
  syncTransportState(null);
  arrangementPlayheadStep = -1;

  window.freemixRender?.updateTransportRow?.();
  const beatLights = getBeatLights();
  if (activeBeatLightIndex >= 0 && activeBeatLightIndex < beatLights.length) {
    const activeBeatLight = beatLights[activeBeatLightIndex];
    if (activeBeatLight) {
      activeBeatLight.classList.remove("active");
    }
  }
  activeBeatLightIndex = -1;

  if (tracks.some((track) => track.source)) {
    setStatus(arrangement.enabled ? `Stopped at scene ${arrangement.step + 1}` : "Stopped");
  } else {
    setStatus("Stopped");
  }
}

function hardStopPlayback(reason = "stopped") {
  if (reason && typeof reason === "string") {
    console.info(`audio stop: ${reason}`);
  }

  window.freemixRender?.updateTransportRow?.();

  stopTransport(true);
  tracks.forEach((track) => {
    const video = getTrackVideo(track);
    if (video) {
      video.muted = true;
      video.pause();
    }
  });

  setStatus("Audio stopped");
}

function isWebmTypeSupported(candidateTypes = EXPORT_MEDIA_TYPES) {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "video/webm";
}

function computeExportBars(mode = "clip") {
  if (mode === "arrangement" && hasArrangementClips() && arrangement?.clips) {
    return Math.max(1, arrangement.clips.length);
  }

  return 1;
}

function computeExportDurationMs(mode = "clip") {
  const bars = computeExportBars(mode);
  return Math.max(1, bars) * getTransportBeatMs() * getTransportBeatsPerBar();
}

function getExportPreflightIssue(mode = "clip") {
  const exportMode = mode === "arrangement" ? "arrangement" : "clip";
  if (exportMode === "arrangement") {
    if (!hasArrangementClips()) {
      return "No arrangement clips to export";
    }

    const hasPlayableArrangementClip = arrangement?.clips?.some((step) =>
      Object.values(step || {}).some((clip) => !!clip?.source?.mediaUrl),
    );
    return hasPlayableArrangementClip ? "" : "Arrangement has no playable media";
  }

  const hasPlayableTrack = tracks.some((track) => !!getTrackPlaybackSourceUrl(track, getTrackPlaybackState(track) || track));
  return hasPlayableTrack ? "" : "Load a source before exporting";
}

function getExportBlendMode(track) {
  const trackState = getTrackActiveControlState(track) || track;
  return EXPORT_BLEND_MODE_MAP[trackState?.blendMode] || "source-over";
}

function getTrackExportOpacity(track) {
  const cell = getTrackCell(track);
  if (!cell) {
    return 1;
  }

  const styleOpacity = Number.parseFloat(cell.style.opacity);
  if (!Number.isFinite(styleOpacity)) {
    return 1;
  }

  return clamp(styleOpacity, 0, 1);
}

function getTrackExportFilter(track) {
  const cell = getTrackCell(track);
  if (!cell) {
    return "none";
  }

  const cellFilter = window.getComputedStyle(cell).getPropertyValue("--video-filter");
  return cellFilter ? cellFilter.trim() || "none" : "none";
}

function getExportCanvasDimensions(targetRect = null) {
  const width = Number.isFinite(targetRect?.width)
    ? Math.max(1, Math.floor(targetRect.width))
    : EXPORT_CANVAS_MAX_WIDTH;
  const height = Number.isFinite(targetRect?.height)
    ? Math.max(1, Math.floor(targetRect.height))
    : EXPORT_CANVAS_MAX_HEIGHT;
  if (width >= height) {
    const scale = Math.min(1, EXPORT_CANVAS_MAX_WIDTH / width, EXPORT_CANVAS_MAX_HEIGHT / height);
    return [Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale))];
  }

  return [Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height))];
}

function drawTrackFrame(context, track, width, height) {
  const video = getTrackVideo(track);
  if (!video || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
    return;
  }

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  context.globalAlpha = getTrackExportOpacity(track);
  context.globalCompositeOperation = getExportBlendMode(track);
  context.filter = getTrackExportFilter(track);
  context.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
}

function createExportCanvasSession() {
  const matrix = playerPanel?.querySelector(".video-matrix");
  const bounds = matrix?.getBoundingClientRect();
  const [width, height] = getExportCanvasDimensions(bounds);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  canvas.width = width;
  canvas.height = height;
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.opacity = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "-1";
  document.body?.appendChild(canvas);

  const drawFrame = () => {
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.filter = "none";
    context.clearRect(0, 0, width, height);
    context.fillStyle = "black";
    context.fillRect(0, 0, width, height);

    tracks.forEach((track) => {
      drawTrackFrame(context, track, width, height);
    });

    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.filter = "none";
  };

  return { canvas, context, width, height, drawFrame };
}

function createExportAudioTap() {
  const fallbackAudioTracks = [];

  if (audioContext && !webAudioDisabled && audioContext.state === "running") {
    const destination = audioContext.createMediaStreamDestination();
    const disconnects = [];
    let connectedAny = false;

    tracks.forEach((track) => {
      const video = getTrackVideo(track);
      if (!video) {
        return;
      }

      setupTrackAudio(track, video);
      const output = track.audio?.output;
      if (!output) {
        return;
      }

      try {
        output.connect(destination);
        connectedAny = true;
        disconnects.push(() => {
          try {
            output.disconnect(destination);
          } catch {
            // Already disconnected.
          }
        });
      } catch (error) {
        console.warn("Failed to connect export audio tap", error);
      }
    });

    if (connectedAny) {
      return { destination, disconnects, fallbackAudioTracks };
    }
  }

  tracks.forEach((track) => {
    const video = getTrackVideo(track);
    if (!video || typeof video.captureStream !== "function") {
      return;
    }

    try {
      const videoStream = video.captureStream();
      videoStream.getAudioTracks().forEach((audioTrack) => {
        if (audioTrack) {
          fallbackAudioTracks.push(audioTrack);
        }
      });
    } catch (error) {
      console.warn("Failed to capture export fallback audio", error);
    }
  });

  if (!fallbackAudioTracks.length) {
    return null;
  }

  return { destination: null, disconnects: [], fallbackAudioTracks };
}

function releaseExportAudioTap(tap) {
  if (!tap) {
    return;
  }

  tap.disconnects?.forEach((disconnect) => {
    if (typeof disconnect === "function") {
      disconnect();
    }
  });

  if (tap.destination?.stream) {
    tap.destination.stream.getTracks().forEach((audioTrack) => audioTrack.stop());
  }

  if (Array.isArray(tap.fallbackAudioTracks)) {
    tap.fallbackAudioTracks.forEach((audioTrack) => {
      if (audioTrack?.stop) {
        audioTrack.stop();
      }
    });
  }
}

function trackHasArrangementExportSource(track) {
  if (!track?.id || !Array.isArray(arrangement?.clips)) {
    return false;
  }

  return arrangement.clips.some((step) => !!step?.[track.id]?.source?.mediaUrl);
}

async function exportComposition(mode = "clip") {
  const preflightIssue = getExportPreflightIssue(mode);
  if (preflightIssue) {
    setStatus(preflightIssue, true);
    return false;
  }

  if (isExportingVideo) {
    setStatus("Export already running", true);
    return false;
  }

  if (!window.MediaRecorder) {
    setStatus("MediaRecorder not available in this browser", true);
    return false;
  }

  if (!window.HTMLCanvasElement || !HTMLCanvasElement.prototype.captureStream) {
    setStatus("Canvas capture not supported", true);
    return false;
  }

  const requestedExportMode = mode === "arrangement" ? "arrangement" : "clip";
  const renderTracks = tracks.filter((track) => {
    if (requestedExportMode === "arrangement") {
      return trackHasArrangementExportSource(track);
    }

    const renderState = getTrackRenderState(track);
    return track.source || renderState?.source;
  });
  if (renderTracks.length === 0) {
    setStatus("Load at least one source before exporting", true);
    return;
  }

  if (mode === "arrangement" && !hasArrangementClips()) {
    setStatus("No arrangement clips to export", true);
    return;
  }

  if (transport?.active) {
    setStatus("Stop playback before exporting", true);
    return;
  }

  isExportingVideo = true;
  window.freemixRender?.updateTransportRow?.();

  let canvasSession = null;
  let audioTap = null;
  let timerId = null;
  let recorder = null;
  let frameId = null;
  let mediaStream = null;
  const chunks = [];
  const exportMode = mode === "arrangement" ? "arrangement" : "clip";
  const restoreArrangementEnabled = exportMode === "arrangement" && hasArrangementClips() && !arrangement.enabled;
  let exportError = null;
  let exportCompleted = false;
  let timeoutId = null;
  let recorderFinished;
  const recorderStopped = new Promise((resolve, reject) => {
    recorderFinished = { resolve, reject };
  });
  if (restoreArrangementEnabled) {
    arrangement.enabled = true;
    updateArrangementStep(arrangement.step, performance.now(), true);
  }

  try {
    canvasSession = createExportCanvasSession();
    mediaStream = canvasSession.canvas.captureStream(EXPORT_FRAME_RATE);
    audioTap = createExportAudioTap();
    if (audioTap?.destination?.stream) {
      audioTap.destination.stream.getAudioTracks().forEach((audioTrack) => {
        if (audioTrack) {
          mediaStream.addTrack(audioTrack);
        }
      });
    } else if (Array.isArray(audioTap?.fallbackAudioTracks)) {
      audioTap.fallbackAudioTracks.forEach((audioTrack) => {
        if (audioTrack) {
          mediaStream.addTrack(audioTrack);
        }
      });
    }

    const mimeType = isWebmTypeSupported();
    recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onstop = () => {
      if (recorderFinished?.resolve) {
        recorderFinished.resolve();
        recorderFinished = null;
      }
    };
    recorder.onerror = (error) => {
      if (recorderFinished?.reject) {
        recorderFinished.reject(error?.error || error || new Error("Export recorder error"));
        recorderFinished = null;
      }
    };

    const durationMs = computeExportDurationMs(exportMode);
    recorder.start(200);

    const renderLoop = () => {
      if (!canvasSession) {
        return;
      }
      canvasSession.drawFrame();
      frameId = requestAnimationFrame(renderLoop);
    };

    frameId = requestAnimationFrame(renderLoop);
    const startResult = startTransport();
    if (startResult && typeof startResult.then === "function") {
      await startResult;
    }

    if (!transport?.active) {
      throw new Error("Playback failed to start");
    }

    const exportLabel = exportMode === "arrangement" ? "arrangement" : "clip";
    setStatus(`Exporting ${exportLabel}...`);

    timerId = window.setTimeout(() => {
      if (!isExportingVideo) {
        return;
      }

      stopTransport(false);
      if (recorder && recorder.state === "recording") {
        recorder.stop();
      }
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    }, durationMs + 300);

    await Promise.race([
      recorderStopped,
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error("Export timed out"));
        }, durationMs + 12000);
      }),
    ]);
  } catch (error) {
    exportError = error;
    console.warn(error);
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    if (frameId) {
      cancelAnimationFrame(frameId);
    }
    setStatus("Export failed", true);
  } finally {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }

    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((streamTrack) => {
        if (streamTrack?.stop) {
          streamTrack.stop();
        }
      });
    }
    if (canvasSession?.canvas) {
      canvasSession.canvas.remove();
    }
    if (audioTap) {
      releaseExportAudioTap(audioTap);
    }

    if (isExportingVideo) {
      if (recorder && chunks.length > 0) {
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d+Z$/g, "")
          .replace("T", "-");
        const exportName = `freemix-${exportMode}-${timestamp || "export"}.webm`;
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const download = document.createElement("a");
        download.href = url;
        download.download = exportName;
        download.style.display = "none";
        document.body.appendChild(download);
        download.click();
        window.setTimeout(() => {
          URL.revokeObjectURL(url);
          download.remove();
        }, 0);
        exportCompleted = true;
      } else {
        exportCompleted = false;
      }
    }

    isExportingVideo = false;
    if (restoreArrangementEnabled) {
      arrangement.enabled = false;
      window.freemixRender?.updateTransportRow?.();
    }
    window.freemixRender?.updateTransportRow?.();
    if (exportError) {
      setStatus("Export failed", true);
    } else if (exportCompleted) {
      setStatus("Export complete");
    } else {
      setStatus("No export data received", true);
    }
    if (transport?.active) {
      stopTransport(true);
    }
  }
}

window.freemixIsExportingVideo = () => isExportingVideo;
window.freemixExportClip = () => exportComposition("clip");
window.freemixExportArrangement = () => exportComposition("arrangement");

function tickTransport() {
  if (!transport?.active) {
    return;
  }

  if (transport.sessionToken !== startTransport.bootToken) {
    if (transport.frameId) {
      cancelAnimationFrame(transport.frameId);
      transport.frameId = null;
    }
    return;
  }

  const now = performance.now();
  const beatMs = getTransportBeatMs(transport);
  const beatsPerBar = getTransportBeatsPerBar(transport);
  const barMs = beatMs * beatsPerBar;

  if (arrangement.enabled && hasArrangementClips()) {
    const elapsedBars = Math.floor(Math.max(0, now - transport.startedAt) / barMs);
    const arrangementLength = arrangement.clips.length || 1;
    const currentStep = (transport.arrangementStartStep + elapsedBars) % arrangementLength;
    updateArrangementStep(currentStep, transport.startedAt + elapsedBars * barMs);
    reconcileArrangementPlaybackConfidence("transport");
  }

  tracks.forEach((track) => {
    const playbackState = getTrackPlaybackState(track) || track;
    const sourceUrl = getTrackPlaybackSourceUrl(track, playbackState);

    if (!sourceUrl || !track.stepMs) {
      return;
    }

    if (track.__transportPrimedFor !== transport.sessionToken) {
      ensureTransportTrackPrimed(track, transport.sessionToken);
      return;
    }

    const video = getTrackVideo(track);
    if (!video || video.readyState < 1 || video.networkState === 0) {
      return;
    }

    const activePlaybackState = playbackState;
    const pulseIndex = getTrackPulseIndex(track, now);
    if (pulseIndex === null) {
      return;
    }

    if (!Number.isFinite(track.__lastRetriggerPulse)) {
      track.__lastRetriggerPulse = pulseIndex - 1;
    }

    if (pulseIndex > track.__lastRetriggerPulse) {
      track.__lastRetriggerPulse = pulseIndex;
      track.nextTriggerAt = transport.startedAt + (pulseIndex + 1) * track.stepMs;
      if (!isTrackAudibleInMix(track, activePlaybackState)) {
        return;
      }
      triggerTrack(track, activePlaybackState, transport.sessionToken);
    }
  });

  const beatCatchupLimit = Math.max(
    0,
    Math.floor((now - transport.nextBeatAt) / beatMs) + 1,
  );
  for (let beatCatchupCount = 0; beatCatchupCount < beatCatchupLimit; beatCatchupCount += 1) {
    if (beatCatchupCount >= MAX_BEAT_CATCHUP_PER_FRAME) {
      break;
    }

    const beat = transport.beatIndex % beatsPerBar;
    renderBeat(beat);
    playMetronome(beat, beatsPerBar);
    transport.beatIndex += 1;
    transport.nextBeatAt += beatMs;
  }

  if (transport.nextBeatAt <= now) {
    const missedBeats = Math.floor((now - transport.nextBeatAt) / beatMs) + 1;
    if (missedBeats > 0) {
      transport.nextBeatAt += missedBeats * beatMs;
    }
  }

  transport.frameId = requestAnimationFrame(tickTransport);
}

function triggerTrack(track, clip = track, transportSessionToken = transport?.sessionToken) {
  if (transport?.active && transportSessionToken && track.__transportPrimedFor !== transportSessionToken) {
    return;
  }

  const playbackState = getTrackPlaybackState(track, clip) || track;
  const sourceUrl = getTrackPlaybackSourceUrl(track, playbackState);
  if (!sourceUrl) {
    return;
  }

  const video = ensureTrackVideoElementForPlayback(track, playbackState);
  if (!video) {
    return;
  }

  setTrackBlackout(track, false);
  setVideoCorsPolicy(video, sourceUrl);
  const sourceChanged = !!sourceUrl && video.src !== sourceUrl;
  if (sourceChanged) {
    track.__parkedAtAnchorFor = null;
    track.__parkedPlaybackSignature = null;
    video.src = sourceUrl;
    video.load();
  }

  const playbackSignature = getPlaybackStateSignature(playbackState, sourceUrl);
  const canFastRetrigger =
    !!transport?.active &&
    !sourceChanged &&
    video.readyState >= 1 &&
    !video.paused &&
    !video.ended;
  const hasStableAudioRoute =
    webAudioDisabled ||
    !audioContext ||
    audioContext.state !== "running" ||
    hasLiveTrackAudioGraph(track, video);
  if (canFastRetrigger && hasStableAudioRoute && track.__lastPlaybackSignature === playbackSignature) {
    safeSetCurrentTime(video, playbackState, track, { force: true });
    flashTrackTrigger(track);
    return;
  }

  track.__playbackToken = Number.isFinite(track.__playbackToken) ? track.__playbackToken + 1 : 1;
  const playbackToken = track.__playbackToken;
  if (track.__pendingPlaybackFrame) {
    window.cancelAnimationFrame(track.__pendingPlaybackFrame);
    track.__pendingPlaybackFrame = null;
  }

  setupTrackAudio(track, video);
  applyTrackVolume(track, playbackState);
  applyTrackFx(track, playbackState);
  applyVideoFx(track, playbackState);
  applyTrackBlend(track, playbackState);
  applyTrackOpacity(track, playbackState);
  applyTrackPitchAndSpeed(track, playbackState);

  const canLaunchFromParkedAnchor =
    !!transport?.active &&
    !sourceChanged &&
    track.__parkedAtAnchorFor === transportSessionToken &&
    track.__parkedPlaybackSignature === playbackSignature &&
    isVideoParkedAtAnchor(video, playbackState, 0.035);
  if (canLaunchFromParkedAnchor && launchParkedVideo(video, track, playbackState, playbackToken)) {
    track.__lastPlaybackSignature = playbackSignature;
    track.__parkedAtAnchorFor = null;
    track.__parkedPlaybackSignature = null;
    flashTrackTrigger(track);
    return;
  }

  safeSetCurrentTime(video, playbackState, track, { force: true });
  track.__lastPlaybackSignature = playbackSignature;

  if (canFastRetrigger) {
    flashTrackTrigger(track);
    return;
  }

  if (typeof video.pause === "function") {
    video.pause();
  }
  void attemptVideoPlay(video, track, playbackState, playbackToken);

  flashTrackTrigger(track);
}

function previewTrack(track) {
  if (transport?.active) {
    return;
  }

  const playbackState = getTrackPlaybackState(track) || track;
  if (!getTrackPlaybackSourceUrl(track, playbackState)) {
    return;
  }

  if (!isTrackAudibleInMix(track, playbackState)) {
    return;
  }

  triggerTrack(track, playbackState);
  window.setTimeout(() => {
    const video = getTrackVideo(track);
    if (video && !transport?.active) {
      video.pause();
    }
  }, 650);
}

function renderBeat(beat) {
  const beatIndex = Number.isFinite(Number(beat)) ? Math.floor(Number(beat)) : 0;
  const beatsPerBar = getTransportBeatsPerBar(transport);
  const nextBeatIndex = ((beatIndex % beatsPerBar) + beatsPerBar) % beatsPerBar;
  const lights = getBeatLights();
  if (!lights.length) {
    return;
  }

  if (activeBeatLightIndex >= 0 && activeBeatLightIndex < lights.length) {
    const prevLight = lights[activeBeatLightIndex];
    if (prevLight) {
      prevLight.classList.remove("active");
    }
  }

  if (nextBeatIndex < lights.length) {
    lights[nextBeatIndex].classList.add("active");
    activeBeatLightIndex = nextBeatIndex;
  } else {
    activeBeatLightIndex = -1;
  }
}

function playMetronome(beat, beatsPerBar = getTransportBeatsPerBar(transport)) {
  if (!metronomeEnabled || masterMuted || !audioContext) {
    return;
  }

  const metronomeOutput = getMetronomeGainNode();
  if (!metronomeOutput) {
    return;
  }

  const now = audioContext.currentTime;
  const envelope = audioContext.createGain();
  const oscillator = audioContext.createOscillator();
  oscillator.type = "square";
  const downbeat = Number.isFinite(beat) ? Math.round(beat) % beatsPerBar === 0 : beat === 0;
  oscillator.frequency.value = downbeat ? 1320 : 880;
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(0.08, now + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  oscillator.connect(envelope).connect(metronomeOutput);
  oscillator.start(now);
  oscillator.stop(now + 0.055);
}

function getMetronomeGainNode() {
  if (!audioContext) {
    return null;
  }

  if (!metronomeGain || metronomeGain.context !== audioContext) {
    if (metronomeGain) {
      try {
        metronomeGain.disconnect();
      } catch {
        // Already disconnected.
      }
    }

    metronomeGain = audioContext.createGain();
    metronomeGain.gain.value = 1;
    metronomeGain.connect(audioContext.destination);
  }

  return metronomeGain;
}

function ensureAudioContext() {
  if (webAudioDisabled) {
    return Promise.resolve();
  }

  if (typeof window.AudioContext !== "function") {
    webAudioDisabled = true;
    return Promise.resolve();
  }

  if (!audioContext || audioContext.state === "closed") {
    try {
      audioContext = new AudioContext();
    } catch (error) {
      console.warn(error);
      webAudioDisabled = true;
      return Promise.resolve();
    }
  }

  if (audioContext.state === "suspended" || audioContext.state === "interrupted") {
    return audioContext
      .resume()
      .catch((error) => {
        console.warn(error);
        webAudioDisabled = true;
      });
  }

  return Promise.resolve();
}

function updateTrackDuration(video) {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return;
  }

  const trackId = video.id.replace("video-", "");
  const track = getTrackById(trackId);
  const maxDurationValue = String(Math.max(0, video.duration));
  getTrackControls({ id: trackId }, "startTime").forEach((range) => {
    if (range.max !== maxDurationValue) {
      range.max = maxDurationValue;
    }
  });

  getTrackControls({ id: trackId }, "startNumber").forEach((number) => {
    if (number.max !== maxDurationValue) {
      number.max = maxDurationValue;
    }
  });

  if (!track) {
    return;
  }

  const activeState = getTrackPlaybackState(track) || track;
  const safeStart = safeStartTime(activeState, video);
  if (!Number.isFinite(safeStart)) {
    return;
  }

  if (activeState.startTime !== safeStart) {
    activeState.startTime = safeStart;
  }

  if (activeState === track) {
    track.startTime = safeStart;
  }

  syncStartControls(track);
  safeSetCurrentTime(video, activeState, track);
}

function syncStartControls(track) {
  const startTime = getTrackStartControlValue(track);

  getTrackControls(track, "startTime").forEach((range) => {
    range.value = String(startTime);
  });

  getTrackControls(track, "startNumber").forEach((number) => {
    number.value = startTime.toFixed(1);
  });
}

function syncFxControl(track, fxKey) {
  const fxDefinition = FX_CONTROL_INDEX[fxKey];
  if (!track?.id || !fxDefinition) {
    return;
  }

  const activeState = getTrackRenderState(track);
  const nextValue = Number(activeState.fx?.[fxKey] ?? 0);
  const displayValue =
    Number.isInteger(fxDefinition.step) || fxDefinition.step >= 1
      ? String(Math.round(nextValue))
      : nextValue.toFixed(2).replace(/\.?0+$/, "");

  getTrackControls(track, fxKey).forEach((input) => {
    input.value = String(nextValue);
    const field = input.closest(".fx-field");
    const valueEl = field?.querySelector(".fx-value");
    if (valueEl) {
      valueEl.textContent = displayValue;
    }
  });
}

function applyArrangementClipControlValue(track, controlName, value, clipState = null) {
  const isSceneControl = SCENE_EDITABLE_CONTROLS.has(controlName);
  const resolvedStep = getArrangementStepIndex(arrangement?.step);
  const effectiveStep = resolvedStep === null ? 0 : resolvedStep;
  const clip =
    clipState
      ? clipState
      : isSceneControl
        ? getArrangementStepClipForTrack(track, { stepIndex: effectiveStep, create: false }) || track
        : arrangement?.enabled
          ? getArrangementStepClipForTrack(track, { stepIndex: effectiveStep, create: true })
          : track;
  if (!clip || !tracks.includes(track)) {
    return;
  }

  if (controlName === "speed") {
    clip.speed = clamp(Number(value), 0.5, 2);
    return;
  }

  if (controlName === "pitch") {
    clip.pitch = clamp(Number(value), -12, 12);
    return;
  }

  if (controlName === "startTime") {
    clip.startTime = Number.isFinite(Number(value)) ? Number(value) : 0;
    if (!transport?.active) {
      const video = getTrackVideo(track);
      if (video) {
        safeSetCurrentTime(video, clip);
      }
    }
    return;
  }

  if (controlName === "volume") {
    clip.volume = clamp(Number(value), 0, 1);
    return;
  }

  if (controlName === "opacity") {
    clip.opacity = clamp(Number(value), 0, 1);
    return;
  }

  if (controlName === "durationFilter") {
    clip.durationFilter = DURATION_FILTERS[value] ? value : "quick";
    return;
  }

  if (controlName === "blendMode") {
    clip.blendMode = typeof value === "string" && BLEND_MODE_OPTIONS.some(({ value: mode }) => mode === value)
      ? value
      : TRACK_BLEND_DEFAULTS[0];
    return;
  }

  if (controlName === "retriggersPerBar") {
    clip.retriggersPerBar = normalizeRetriggersPerBar(value);
    return;
  }

  if (controlName === "muted") {
    clip.muted = !!value;
    return;
  }

  if (clip.fx && controlName in clip.fx) {
    const nextValue = Number(value);
    if (Number.isFinite(nextValue)) {
      clip.fx[controlName] = nextValue;
    }
  }
}

function hasLiveTrackAudioGraph(track, video = null) {
  return (
    !!track?.audio &&
    !webAudioDisabled &&
    audioContext?.state === "running" &&
    track.audio.mediaElement &&
    (!video || track.audio.mediaElement === video) &&
    track.audio.source?.context === audioContext
  );
}

function applyTrackVolume(track, state = track) {
  const effectiveState = state || track;
  const isMuted = !!(effectiveState?.muted);
  const stateVolume = Number.isFinite(Number(effectiveState.volume))
    ? Number(effectiveState.volume)
    : Number.isFinite(Number(track.volume))
      ? Number(track.volume)
      : 0;
  const volume = clamp(stateVolume, 0, 1);
  const video = getTrackVideo(track);
  const hasLiveAudioGraph = hasLiveTrackAudioGraph(track, video);

  if (!hasLiveAudioGraph && track.audio) {
    disposeTrackAudio(track);
  }

  if (track.audio?.output && hasLiveAudioGraph && !almostEqual(track.audio.output.gain.value, isMuted ? 0 : volume)) {
    track.audio.output.gain.value = isMuted ? 0 : volume;
  }

  if (video) {
    const nextMuted = hasLiveAudioGraph ? false : isMuted;
    if (video.muted !== nextMuted) {
      video.muted = nextMuted;
    }

    const nextVolume = hasLiveAudioGraph ? 1 : isMuted ? 0 : volume;
    if (!almostEqual(video.volume, nextVolume)) {
      video.volume = nextVolume;
    }
  }
}

function setupTrackAudio(track, video) {
  if (webAudioDisabled || !audioContext || audioContext.state !== "running" || !video) {
    if (track.audio) {
      disposeTrackAudio(track);
    }
    return false;
  }

  if (shouldDisableWebAudioForSource(getTrackPlaybackSourceUrl(track))) {
    if (track.audio) {
      disposeTrackAudio(track);
    }
    return false;
  }

  if (track.audio && track.audio.mediaElement !== video) {
    disposeTrackAudio(track);
  }

  if (track.audio && track.audio.source && track.audio.source.context !== audioContext) {
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
    reverb.buffer = getReverbImpulse(audioContext);

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
    if (track?.audio) {
      disposeTrackAudio(track);
    }
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

  const fxState = state?.fx || {};
  const eqLow = clamp(Number(fxState.eqLow), -12, 12);
  const eqMid = clamp(Number(fxState.eqMid), -12, 12);
  const eqHigh = clamp(Number(fxState.eqHigh), -12, 12);
  const tube = clamp(Number(fxState.tube), 0, 1);
  const delay = clamp(Number(fxState.delay), 0, 1);
  const reverb = clamp(Number(fxState.reverb), 0, 1);

  audio.low.gain.value = eqLow;
  audio.mid.gain.value = eqMid;
  audio.high.gain.value = eqHigh;
  audio.drive.curve = getTubeCurve(tube);
  audio.drive.oversample = "4x";
  audio.delay.delayTime.value = 0.12 + delay * 0.5;
  audio.delayGain.gain.value = delay * 0.42;
  audio.reverbGain.gain.value = reverb * 0.45;
}

function applyVideoFx(track, state = track) {
  const cell = getTrackCell(track);
  if (!cell) {
    return;
  }

  const fxState = state?.fx || {};
  const lowLift = Math.max(clamp(Number(fxState.eqLow), -12, 12), 0) / 12;
  const midCut = Math.max(-clamp(Number(fxState.eqMid), -12, 12), 0) / 12;
  const highLift = Math.max(clamp(Number(fxState.eqHigh), -12, 12), 0) / 12;
  const highCut = Math.max(-clamp(Number(fxState.eqHigh), -12, 12), 0) / 12;
  const tube = clamp(Number(fxState.tube), 0, 1);
  const delay = clamp(Number(fxState.delay), 0, 1);
  const reverb = clamp(Number(fxState.reverb), 0, 1);

  const brightness = 0.86 + highLift * 0.3 - highCut * 0.22 + lowLift * 0.06;
  const contrast = 1 + tube * 0.45 + Math.max(clamp(Number(fxState.eqMid), -12, 12), 0) * 0.018;
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

function applyTrackOpacity(track, state = track) {
  const cell = getTrackCell(track);
  if (!cell) {
    return;
  }

  const rawOpacity = state.opacity;
  const opacity = Number.isFinite(Number(rawOpacity)) ? Number(rawOpacity) : 1;
  const nextOpacity = clamp(opacity, 0, 1);
  const styleOpacity = Number(cell.style.opacity);
  if (!Number.isFinite(styleOpacity) || !almostEqual(styleOpacity, nextOpacity)) {
    cell.style.opacity = `${nextOpacity}`;
  }
}

function applyTrackPitchAndSpeed(track, state = track) {
  const video = getTrackVideo(track);
  if (!video) {
    return;
  }

  const speed = Number.isFinite(Number(state.speed)) ? Number(state.speed) : 1;
  const pitch = Number.isFinite(Number(state.pitch)) ? Number(state.pitch) : 0;
  const nextPlaybackRate = clamp(speed * 2 ** (pitch / 12), 0.25, 4);
  if (!almostEqual(video.playbackRate, nextPlaybackRate, 0.0005)) {
    video.playbackRate = nextPlaybackRate;
  }
}

function applyTrackBlend(track, state = track) {
  const cell = getTrackCell(track);
  if (!cell) {
    return;
  }

  const requestedBlend = Object.prototype.hasOwnProperty.call(BLEND_MODES, state.blendMode) ? state.blendMode : TRACK_BLEND_DEFAULTS[0];
  Object.keys(BLEND_MODES).forEach((mode) => cell.classList.remove(`blend-${mode}`));
  cell.classList.add(`blend-${requestedBlend}`);
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

function getTubeCurve(amount) {
  const normalized = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const key = normalized.toFixed(3);
  const cached = TUBE_CURVE_CACHE.get(key);
  if (cached) {
    return cached;
  }

  const nextCurve = createTubeCurve(clamp(normalized, 0, 1));
  TUBE_CURVE_CACHE.set(key, nextCurve);
  return nextCurve;
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

function getReverbImpulse(context) {
  if (!context) {
    return null;
  }

  const cached = REVERB_BUFFER_CACHE.get(context);
  if (cached) {
    return cached;
  }

  const impulse = createReverbImpulse(context);
  REVERB_BUFFER_CACHE.set(context, impulse);
  return impulse;
}

function safeStartTime(track, video) {
  if (!Number.isFinite(track.startTime)) {
    return 0;
  }

  return playableStartTime(track.startTime, video);
}

function getAlignedTrackTriggerTime(track, referenceTime = performance.now(), options = {}) {
  const alignAfterReference = !!options.alignAfterReference;
  if (!track || !transport) {
    return Number.isFinite(referenceTime) ? referenceTime : performance.now();
  }

  const stepMs = Number(track.stepMs);
  if (!Number.isFinite(stepMs) || stepMs <= 0) {
    return Number.isFinite(referenceTime) ? referenceTime : performance.now();
  }

  const transportStart = Number.isFinite(transport.startedAt) ? transport.startedAt : performance.now();
  const delta = referenceTime - transportStart;
  if (!Number.isFinite(delta)) {
    return transportStart;
  }

  const stepOffset = delta / stepMs;
  const epsilon = 1e-6;
  const computedStepIndex = alignAfterReference
    ? Math.floor(stepOffset + epsilon) + 1
    : Math.ceil(stepOffset - epsilon);
  const alignedStepIndex = Math.max(computedStepIndex, 0);
  return transportStart + alignedStepIndex * stepMs;
}

function getTrackPulseIndex(track, referenceTime = performance.now()) {
  if (!track || !transport?.active) {
    return null;
  }

  const stepMs = Number(track.stepMs);
  if (!Number.isFinite(stepMs) || stepMs <= 0) {
    return null;
  }

  const transportStart = Number.isFinite(transport.startedAt) ? transport.startedAt : performance.now();
  const delta = Math.max(0, referenceTime - transportStart);
  return Math.floor(delta / stepMs + 1e-6);
}

function resetTrackPulseCursor(track, referenceTime = performance.now(), options = {}) {
  if (!track || !transport?.active) {
    return;
  }

  const pulseIndex = getTrackPulseIndex(track, referenceTime);
  if (pulseIndex === null) {
    track.__lastRetriggerPulse = null;
    track.nextTriggerAt = Number.POSITIVE_INFINITY;
    return;
  }

  track.__lastRetriggerPulse = options.fireAtReference ? pulseIndex - 1 : pulseIndex;
  track.nextTriggerAt = transport.startedAt + (track.__lastRetriggerPulse + 1) * track.stepMs;
}

function updateTrackTriggerGrid(startAt = performance.now()) {
  if (!transport) {
    return;
  }

  const beatMs = getTransportBeatMs(transport);
  const barMs = beatMs * getTransportBeatsPerBar(transport);
  tracks.forEach((track) => {
    const timingState = getTrackActiveControlState(track) || track;
    track.arrangementClip = null;
    track.stepMs = barMs / normalizeRetriggersPerBar(timingState?.retriggersPerBar);
    resetTrackPulseCursor(track, startAt, { fireAtReference: true });
  });
}

function handleArrangementCell(event) {
  const cell = event.currentTarget;
  if (typeof clearGuidanceHint === "function") {
    clearGuidanceHint();
  }

  const track = getTrackById(cell.dataset.arrTrack);
  const stepIndex = Number(cell.dataset.arrStep);
  if (!track || !Number.isInteger(stepIndex)) {
    return;
  }
  const step = arrangement.clips?.[stepIndex];
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    return;
  }
  const hasTrackClip = Object.prototype.hasOwnProperty.call(step, track.id);
  const isMultiSelect = !!(event.ctrlKey || event.metaKey);
  selectArrangementClip(track.id, stepIndex, { additive: isMultiSelect });

  if (arrangementDeleteMode) {
    if (!hasTrackClip) {
      setStatus(`No clip to delete in scene ${stepIndex + 1} for ${track.name}`);
      selectArrangementStep(stepIndex);
      return;
    }

    captureArrangementEdit(`Deleted ${track.name} from scene ${stepIndex + 1}`);
    delete step[track.id];
    if (!Object.keys(step).length) {
      arrangement.clips[stepIndex] = {};
    }

    refreshArrangementHasClipsState();
    selectArrangementStep(stepIndex);
    if (transport?.active && arrangement.enabled && hasArrangementClips()) {
      rebindArrangementClipsForActiveTransport();
    }

    if (window.freemixRender?.updateArrangementGrid) {
      if (typeof window.freemixRender.updateArrangementCell === "function") {
        refreshArrangementStepCells(stepIndex);
      } else {
        window.freemixRender.updateArrangementGrid();
      }
      window.freemixRender.updateArrangementPlayhead?.();
      markAppStateDirty();
      return;
    }

    renderWorkstation();
    setStatus(`Deleted ${track.name} from scene ${stepIndex + 1}`);
    markAppStateDirty();
    return;
  }

  if (!track.source) {
    selectArrangementStep(stepIndex);
    setStatus(`Bar ${stepIndex + 1} selected`);
    return;
  }

  if (!hasTrackClip && !arrangement.enabled) {
    selectArrangementStep(stepIndex);
    track.arrangementClip = null;
    setStatus(`Scene ${stepIndex + 1}: blank clip selected`);
    window.freemixRender?.updateTrackRow?.(track);
    window.freemixRender?.updateArrangementGrid?.();
    window.freemixRender?.updateTransportRow?.();
    window.freemixRender?.updateArrangementPlayhead?.();
    window.freemixRender?.updateArrangementSceneColorSelector?.();
    return;
  }

  if (!hasTrackClip) {
    captureArrangementEdit(`Captured ${track.name} in scene ${stepIndex + 1}`);
    step[track.id] = captureTrackClip(track);
    refreshArrangementHasClipsState();
    setStatus(`${track.name}: placed in ${stepIndex + 1}`);
    markAppStateDirty(true);
  } else {
    setStatus(`Bar ${stepIndex + 1} selected`);
  }

  selectArrangementStep(stepIndex);
  if (window.freemixRender?.updateArrangementGrid) {
    if (typeof window.freemixRender.updateArrangementCell === "function") {
      refreshArrangementStepCells(stepIndex);
    } else {
      window.freemixRender.updateArrangementGrid();
    }
    window.freemixRender.updateArrangementPlayhead?.();
    window.freemixRender.updateArrangementSceneColorSelector?.();
    return;
  }

  renderWorkstation();
}

function handleArrangementStepLabel(event) {
  if (typeof clearGuidanceHint === "function") {
    clearGuidanceHint();
  }

  const stepIndex = Number(event.currentTarget.dataset.arrStep);
  if (!Number.isInteger(stepIndex)) {
    return;
  }

  if (arrangementDeleteMode) {
    if (!arrangement?.clips?.[stepIndex] || !Object.keys(arrangement.clips[stepIndex]).length) {
      setStatus(`Scene ${stepIndex + 1} is already empty`);
      return;
    }

    captureArrangementEdit(`Deleted scene ${stepIndex + 1}`);
    arrangement.clips[stepIndex] = {};
    refreshArrangementHasClipsState();

    if (transport?.active && arrangement.enabled && hasArrangementClips()) {
      rebindArrangementClipsForActiveTransport();
    }

    tracks.forEach((stepTrack) => {
      if (window.freemixRender?.updateArrangementCell) {
        window.freemixRender.updateArrangementCell(stepTrack, stepIndex);
      }
    });
    setStatus(`Deleted scene ${stepIndex + 1}`);
    selectArrangementStep(stepIndex);
    if (window.freemixRender?.updateArrangementGrid) {
      window.freemixRender.updateArrangementPlayhead?.();
      markAppStateDirty();
      return;
    }

    renderWorkstation();
    markAppStateDirty();
    return;
  }

  selectArrangementSceneClips(stepIndex);
  selectArrangementStep(stepIndex);
}

function toggleArrangementCopyMode() {
  arrangementCopyMode = false;
  arrangementCopySourceStep = null;
  setStatus("Drag filled clip blocks to copy them");
  window.freemixRender?.updateArrangementGrid?.();
  window.freemixRender?.updateTransportRow?.();
}

function toggleArrangementDeleteMode() {
  arrangementDeleteMode = !arrangementDeleteMode;
  if (arrangementDeleteMode) {
    if (arrangementCopyMode) {
      arrangementCopyMode = false;
      arrangementCopySourceStep = null;
    }
    setStatus("Delete mode on; click clips/scenes to remove them");
  } else {
    setStatus("Delete mode off");
  }

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender?.updateTransportRow?.();
    markAppStateDirty();
    return;
  }

  renderWorkstation();
  markAppStateDirty();
}

function copyArrangementSection(sourceStepIndex, targetStepIndex) {
  const sourceStep = getArrangementStepIndex(sourceStepIndex);
  const targetStep = getArrangementStepIndex(targetStepIndex);
  if (sourceStep === null || targetStep === null) {
    setStatus("Choose a valid source and destination");
    return false;
  }

  if (!arrangementStepHasClips(sourceStep)) {
    setStatus("Pick a source section first");
    return false;
  }

  if (sourceStep === targetStep) {
    setStatus("Choose a different destination section");
    return false;
  }

  const sourceClips = arrangement.clips[sourceStep];
  captureArrangementEdit(`Pasted scene ${sourceStep + 1} to ${targetStep + 1}`);
  arrangement.clips[targetStep] = cloneArrangementStep(sourceClips);
  if (Array.isArray(arrangement.sceneColors)) {
    arrangement.sceneColors[targetStep] = getArrangementSceneColorIndex(sourceStep);
  }
  arrangement.step = targetStep;
  refreshArrangementHasClipsState();

  if (transport?.active && arrangement.enabled && hasArrangementClips()) {
    rebindArrangementClipsForActiveTransport();
  }

  tracks.forEach((track) => {
    if (window.freemixRender?.updateArrangementCell) {
      window.freemixRender.updateArrangementCell(track, targetStep);
    }
  });
  setStatus(`Section ${sourceStep + 1} pasted to ${targetStep + 1}`);

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementStepLabels?.();
    window.freemixRender.updateArrangementPlayhead?.();
    markAppStateDirty();
    return true;
  }

  renderWorkstation();
  markAppStateDirty();
  return true;
}

function copySelectedArrangementScene() {
  const selectedClips = getSelectedArrangementClipTargets()
    .map(({ track, stepIndex }) => ({
      trackId: track.id,
      trackName: track.name,
      stepIndex,
      clip: arrangement?.clips?.[stepIndex]?.[track.id] || null,
    }))
    .filter((entry) => entry.clip);

  if (!selectedClips.length) {
    setStatus("No selected clip to copy", true);
    return false;
  }

  arrangementClipboardClips = selectedClips.map((entry) => ({
    trackId: entry.trackId,
    trackName: entry.trackName,
    stepIndex: entry.stepIndex,
    clip: cloneArrangementClip(entry.clip),
  }));
  arrangementClipboardStep = null;
  setStatus(`${arrangementClipboardClips.length} clip${arrangementClipboardClips.length === 1 ? "" : "s"} copied`);
  return true;
}

function pasteArrangementClipboardToSelectedScene() {
  const targets = getSelectedArrangementClipTargets();
  if (!targets.length) {
    setStatus("Choose a clip slot first", true);
    return false;
  }

  if (!arrangementClipboardClips.length) {
    setStatus("No copied clip", true);
    return false;
  }

  captureArrangementEdit("Pasted copied clip");
  if (arrangementClipboardClips.length === 1) {
    const source = arrangementClipboardClips[0];
    targets.forEach(({ track, stepIndex }) => {
      arrangement.clips[stepIndex] = arrangement.clips[stepIndex] || {};
      arrangement.clips[stepIndex][track.id] = cloneArrangementClip(source.clip);
    });
  } else if (targets.length === arrangementClipboardClips.length) {
    targets.forEach(({ track, stepIndex }, index) => {
      const source = arrangementClipboardClips[index];
      arrangement.clips[stepIndex] = arrangement.clips[stepIndex] || {};
      arrangement.clips[stepIndex][track.id] = cloneArrangementClip(source.clip);
    });
  } else {
    const targetStep = targets[0].stepIndex;
    arrangementClipboardClips.forEach((source) => {
      arrangement.clips[targetStep] = arrangement.clips[targetStep] || {};
      arrangement.clips[targetStep][source.trackId] = cloneArrangementClip(source.clip);
    });
  }
  refreshArrangementHasClipsState();
  selectArrangementStep(targets[0].stepIndex);
  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
  } else {
    renderWorkstation();
  }
  markAppStateDirty(true);
  setStatus("Clip pasted");
  return true;
}

function deleteSelectedArrangementScene() {
  const targets = getSelectedArrangementClipTargets();
  if (!targets.length) {
    setStatus("Choose a clip first", true);
    return false;
  }

  const filledTargets = targets.filter(({ track, stepIndex }) => arrangement?.clips?.[stepIndex]?.[track.id]);
  if (!filledTargets.length) {
    setStatus("Selected clip slot is already empty");
    return false;
  }

  captureArrangementEdit("Deleted selected clip");
  filledTargets.forEach(({ track, stepIndex }) => {
    delete arrangement.clips[stepIndex][track.id];
    if (!Object.keys(arrangement.clips[stepIndex]).length) {
      arrangement.clips[stepIndex] = {};
    }
  });
  refreshArrangementHasClipsState();
  selectArrangementStep(filledTargets[0].stepIndex);
  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
  } else {
    renderWorkstation();
  }
  markAppStateDirty(true);
  setStatus(`${filledTargets.length} clip${filledTargets.length === 1 ? "" : "s"} deleted`);
  return true;
}

function selectAdjacentArrangementStep(direction) {
  const delta = Number(direction);
  if (!Number.isFinite(delta) || !arrangement?.clips?.length) {
    return false;
  }

  const nextStep = clamp((Number(arrangement.step) || 0) + Math.sign(delta), 0, arrangement.clips.length - 1);
  selectArrangementStep(nextStep);
  return true;
}

function selectArrangementStart() {
  if (!arrangement?.enabled) {
    return false;
  }

  selectArrangementStep(0);
  setStatus("Returned to scene 1");
  return true;
}

function pasteArrangementSection(targetStep) {
  if (arrangementCopySourceStep === null) {
    setStatus("Pick a source section first");
    return;
  }

  copyArrangementSection(arrangementCopySourceStep, targetStep);
}

function clearArrangementDragState() {
  if (!playerPanel) {
    return;
  }

  playerPanel.querySelectorAll(".copy-drag-source, .copy-drop-target").forEach((element) => {
    element.classList.remove("copy-drag-source", "copy-drop-target");
  });
}

function highlightArrangementDragStep(stepIndex, className) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null || !playerPanel) {
    return;
  }

  playerPanel.querySelectorAll(`[data-arr-step="${resolvedStep}"]`).forEach((element) => {
    element.classList.add(className);
  });
}

function canDragCopyArrangementStep(stepIndex) {
  return arrangementStepHasClips(stepIndex);
}

function getArrangementClipDragTarget(trackId, stepIndex) {
  const track = getTrackById(trackId);
  const sourceStep = getArrangementStepIndex(stepIndex);
  if (!track || sourceStep === null) {
    return null;
  }

  return {
    track,
    stepIndex: sourceStep,
    clip: arrangement?.clips?.[sourceStep]?.[track.id] || null,
  };
}

function beginArrangementClipDragCopy(trackId, stepIndex) {
  const source = getArrangementClipDragTarget(trackId, stepIndex);
  if (!source?.clip) {
    return false;
  }

  clearArrangementDragState();
  const sourceCell = playerPanel?.querySelector(
    `.arrangement-cell[data-arr-track="${source.track.id}"][data-arr-step="${source.stepIndex}"]`,
  );
  sourceCell?.classList.add("copy-drag-source");
  window.freemixRender?.updateArrangementStepLabels?.();
  setStatus(`Dragging ${source.track.name} clip; drop on a clip slot`);
  return true;
}

function hoverArrangementClipDragTarget(trackId, stepIndex, sourceTrackId = null, sourceStepIndex = null) {
  const target = getArrangementClipDragTarget(trackId, stepIndex);
  if (!target) {
    clearArrangementDragState();
    return false;
  }

  clearArrangementDragState();
  if (sourceTrackId && Number.isFinite(Number(sourceStepIndex))) {
    const source = getArrangementClipDragTarget(sourceTrackId, Number(sourceStepIndex));
    const sourceCell = source
      ? playerPanel?.querySelector(`.arrangement-cell[data-arr-track="${source.track.id}"][data-arr-step="${source.stepIndex}"]`)
      : null;
    sourceCell?.classList.add("copy-drag-source");
  }

  const targetCell = playerPanel?.querySelector(
    `.arrangement-cell[data-arr-track="${target.track.id}"][data-arr-step="${target.stepIndex}"]`,
  );
  targetCell?.classList.add("copy-drop-target");
  return true;
}

function dropArrangementClipDragCopy(sourceTrackId, sourceStepIndex, targetTrackId, targetStepIndex) {
  const source = getArrangementClipDragTarget(sourceTrackId, sourceStepIndex);
  const target = getArrangementClipDragTarget(targetTrackId, targetStepIndex);
  clearArrangementDragState();
  if (!source?.clip || !target) {
    return false;
  }

  if (source.track.id === target.track.id && source.stepIndex === target.stepIndex) {
    setStatus("Choose a different clip slot");
    return false;
  }

  captureArrangementEdit(`Copied ${source.track.name} clip to scene ${target.stepIndex + 1}`);
  arrangement.clips[target.stepIndex] = arrangement.clips[target.stepIndex] || {};
  arrangement.clips[target.stepIndex][target.track.id] = cloneArrangementClip(source.clip);
  refreshArrangementHasClipsState();
  selectArrangementStep(target.stepIndex);

  if (transport?.active && arrangement.enabled && hasArrangementClips()) {
    rebindArrangementClipsForActiveTransport();
  }

  if (window.freemixRender?.updateArrangementCell) {
    window.freemixRender.updateArrangementCell(target.track, target.stepIndex);
    window.freemixRender.updateArrangementPlayhead?.();
    window.freemixRender.updateArrangementSceneColorSelector?.();
  } else {
    renderWorkstation();
  }

  if (target.stepIndex === arrangement.step && window.freemixRender?.updateTrackRow) {
    window.freemixRender.updateTrackRow(target.track);
  }

  setStatus(`${source.track.name} clip copied to ${target.track.name} scene ${target.stepIndex + 1}`);
  markAppStateDirty();
  return true;
}

function copyCurrentArrangementSectionToAll() {
  const sourceStepIndex = arrangement.step;
  const sourceStep = arrangement.clips?.[sourceStepIndex];
  if (!sourceStep || Object.keys(sourceStep).length === 0) {
    setStatus("Choose a source section first");
    return;
  }

  const destinationSteps = [];
  captureArrangementEdit(`Filled arrangement from scene ${sourceStepIndex + 1}`);
  for (let index = 0; index < arrangement.clips.length; index += 1) {
    if (index === sourceStepIndex) {
      continue;
    }

    const step = arrangement.clips[index];
    if (!step || Object.keys(step).length > 0) {
      continue;
    }

    arrangement.clips[index] = cloneArrangementStep(sourceStep);
    if (Array.isArray(arrangement.sceneColors)) {
      arrangement.sceneColors[index] = getArrangementSceneColorIndex(sourceStepIndex);
    }
    destinationSteps.push(index);
  }

  if (!destinationSteps.length) {
    setStatus("No empty sections to fill");
    return;
  }

  refreshArrangementHasClipsState();

  if (transport?.active && arrangement.enabled && hasArrangementClips()) {
    rebindArrangementClipsForActiveTransport();
  }

  if (window.freemixRender?.updateArrangementGrid) {
    if (typeof window.freemixRender.updateArrangementCell === "function") {
      destinationSteps.forEach((stepIndex) => {
        tracks.forEach((track) => {
          window.freemixRender.updateArrangementCell(track, stepIndex);
        });
      });
    } else {
      window.freemixRender.updateArrangementGrid();
    }
    window.freemixRender.updateArrangementPlayhead?.();
  } else {
    renderWorkstation();
  }

  if (
    transport?.active &&
    arrangement.enabled &&
    hasArrangementClips() &&
    transport.arrangementStep !== sourceStepIndex &&
    destinationSteps.includes(transport.arrangementStep)
  ) {
    updateArrangementStep(transport.arrangementStep, performance.now(), true);
  }

  setStatus(`Filled ${destinationSteps.length} empty sections`);
  markAppStateDirty();
}

function rebindArrangementClipsForActiveTransport() {
  if (!transport?.active || !arrangement?.clips) {
    return;
  }

  const activeStep = getArrangementStepIndex(
    Number.isFinite(Number(transport.arrangementStep)) ? transport.arrangementStep : arrangement.step,
  );
  if (activeStep === null) {
    return;
  }

  bindTracksToArrangementStep(activeStep, { syncTriggerTiming: true });
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

  if (!transport?.active) {
    if (arrangement.enabled) {
      bindTracksToArrangementStep(arrangement.step);
    } else {
      tracks.forEach((track) => {
        track.arrangementClip = null;
      });
    }

    if (window.freemixRender?.updateTrackRow) {
      tracks.forEach((track) => {
        window.freemixRender.updateTrackRow(track);
      });
    }
  }

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateTransportRow();
    window.freemixRender.updateArrangementPlayhead?.();
    markAppStateDirty();
  } else {
    renderWorkstation();
  }
  setStatus(arrangement.enabled ? "Arrangement on" : "Arrangement off");
  markAppStateDirty();
}

function clearArrangement() {
  captureArrangementEdit("Cleared arrangement");
  arrangementCopyMode = false;
  arrangementCopySourceStep = null;
  arrangementDeleteMode = false;
  syncArrangementState(createInitialArrangement());
  refreshArrangementHasClipsState();
  closeArrangementClearMenu();
  if (transport?.active) {
    updateTrackTriggerGrid(performance.now());
  }

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
    window.freemixRender?.updateTransportRow?.();
  } else {
    renderWorkstation();
  }
  setStatus("Arrangement cleared");
  markAppStateDirty();
}

function openArrangementClearMenu() {
  const clearMenu = getArrangementClearMenu();
  if (!clearMenu) {
    return;
  }

  if (clearMenu.hidden === false && clearMenu.getAttribute("data-open") === "true") {
    return;
  }

  clearMenu.hidden = false;
  clearMenu.setAttribute("data-open", "true");
}

function closeArrangementClearMenu() {
  const clearMenu = getArrangementClearMenu();
  if (!clearMenu) {
    return;
  }

  clearMenu.hidden = true;
  clearMenu.setAttribute("data-open", "false");
}

function confirmClearArrangement() {
  closeArrangementClearMenu();
  clearArrangement();
}

function isArrangementClearMenuOpen() {
  const clearMenu = getArrangementClearMenu();
  return clearMenu?.getAttribute("data-open") === "true" && clearMenu?.hidden === false;
}

window.confirmClearArrangement = confirmClearArrangement;
window.closeArrangementClearMenu = closeArrangementClearMenu;
window.openArrangementClearMenu = openArrangementClearMenu;
window.isArrangementClearMenuOpen = isArrangementClearMenuOpen;
window.renderArrangementGrid = renderArrangementGrid;
window.renderArrangementGridRows = renderArrangementGridRows;
window.renderArrangementStepLabels = renderArrangementStepLabels;
window.renderArrangementSceneColorSelector = renderArrangementSceneColorSelector;
window.setArrangementSceneColor = setArrangementSceneColor;
window.copyCurrentArrangementSectionToAll = copyCurrentArrangementSectionToAll;
window.freemixSyncArrangementTrackHeights = syncArrangementTrackHeights;
window.freemixGetSelectedEditTargetLabel = getSelectedEditTargetLabel;
window.freemixIsArrangementCopyMode = () => false;
window.freemixArrangementStepHasClips = arrangementStepHasClips;
window.freemixCanDragCopyArrangementStep = canDragCopyArrangementStep;
window.freemixBeginArrangementClipDragCopy = beginArrangementClipDragCopy;
window.freemixHoverArrangementClipDragTarget = hoverArrangementClipDragTarget;
window.freemixDropArrangementClipDragCopy = dropArrangementClipDragCopy;
window.freemixClearArrangementDragState = clearArrangementDragState;
window.freemixCopySelectedArrangementScene = copySelectedArrangementScene;
window.freemixPasteArrangementClipboardToSelectedScene = pasteArrangementClipboardToSelectedScene;
window.freemixDeleteSelectedArrangementScene = deleteSelectedArrangementScene;
window.freemixSelectAdjacentArrangementStep = selectAdjacentArrangementStep;
window.freemixSelectArrangementStart = selectArrangementStart;
window.freemixUndoArrangementEdit = undoArrangementEdit;
window.freemixRedoArrangementEdit = redoArrangementEdit;
window.freemixReconcileArrangementPlaybackConfidence = reconcileArrangementPlaybackConfidence;

function updateArrangementStepCount(event) {
  const nextLength = clamp(
    Math.round(Number(event.target.value)),
    MIN_ARRANGEMENT_STEPS,
    MAX_ARRANGEMENT_STEPS,
  );
  if (!Number.isInteger(nextLength)) {
    event.target.value = String(arrangementStepCount);
    return;
  }
  event.target.value = String(nextLength);
  if (nextLength === arrangementStepCount) {
    return;
  }

  const previousArrangement = arrangement;
  const wasTransportActive = !!transport?.active;
  if (wasTransportActive) {
    stopTransport(false);
  }
  captureArrangementEdit(`Changed arrangement length to ${nextLength} bars`);
  arrangementCopyMode = false;
  arrangementCopySourceStep = null;
  arrangementDeleteMode = false;
  arrangementStepCount = nextLength;
  syncArrangementState(createInitialArrangement(nextLength));
  if (previousArrangement?.clips) {
    for (let index = 0; index < Math.min(previousArrangement.clips.length, arrangement.clips.length); index += 1) {
      arrangement.clips[index] = previousArrangement.clips[index] || {};
    }
  }
  if (Array.isArray(previousArrangement?.sceneColors)) {
    for (let index = 0; index < Math.min(previousArrangement.sceneColors.length, arrangement.sceneColors.length); index += 1) {
      arrangement.sceneColors[index] = normalizeSceneColorIndex(previousArrangement.sceneColors[index]);
    }
  }
  refreshArrangementHasClipsState();

  const previousStep = Number(previousArrangement?.step) || 0;
  arrangement.step = Math.min(previousStep, nextLength - 1);
  if (!transport?.active && arrangement.enabled) {
    bindTracksToArrangementStep(arrangement.step);
  }

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
    if (window.freemixRender?.updateTrackRow) {
      tracks.forEach((track) => {
        window.freemixRender.updateTrackRow(track);
      });
    }
    window.freemixRender.updateSourceStrip?.();
    window.freemixRender.updateTransportRow?.();
  } else {
    renderWorkstation();
  }
  setStatus(`Arrangement: ${nextLength} bars`);
  markAppStateDirty();
}

function updateArrangementStep(stepIndex, barStartAt, force = false) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return;
  }

  if (!transport || (!force && transport.arrangementStep === resolvedStep)) {
    return;
  }

  transport.arrangementStep = resolvedStep;
  if (force) {
    transport.arrangementStartStep = resolvedStep;
    transport.startedAt = barStartAt;
    transport.nextBeatAt = barStartAt;
    transport.beatIndex = 0;
  }
  arrangement.step = resolvedStep;
  bindTracksToArrangementStep(resolvedStep);
  let activeClipCount = 0;
  tracks.forEach((track) => {
    const clip = getArrangementStepClip(track, resolvedStep);
    if (!clip || !clip.source) {
      const video = getTrackVideo(track);
      if (video && typeof video.pause === "function") {
        video.pause();
      }
      setTrackBlackout(track, true);
      track.lastStep = -1;
      track.nextTriggerAt = Number.POSITIVE_INFINITY;
      return;
    }

    activeClipCount += 1;
    setTrackBlackout(track, false);
    const shouldRetriggerNow = !!force && !!transport?.active && Number.isFinite(Number(track.stepMs)) && track.stepMs > 0;
    resetTrackPulseCursor(track, barStartAt, { fireAtReference: !shouldRetriggerNow });
    if (shouldRetriggerNow) {
      track.__lastRetriggerPulse = 0;
      track.nextTriggerAt = barStartAt + track.stepMs;
      triggerTrack(track, clip, transport.sessionToken);
    }
  });

  scheduleArrangementPlayheadUpdate();
  reconcileArrangementPlaybackConfidence("step");
  if (force && transport?.active) {
    setStatus(activeClipCount > 0 ? `Arrangement playing: scene ${resolvedStep + 1}` : `Scene ${resolvedStep + 1}: silence / black`);
  }
}

function reconcileArrangementPlaybackConfidence(source = "playhead") {
  const resolvedStep = getArrangementStepIndex(
    transport?.active && Number.isFinite(Number(transport.arrangementStep))
      ? transport.arrangementStep
      : arrangement?.step,
  );
  if (resolvedStep === null || !arrangement?.clips) {
    return true;
  }

  let corrected = false;
  if (arrangement.step !== resolvedStep) {
    arrangement.step = resolvedStep;
    corrected = true;
  }

  if (transport?.active && arrangement.enabled && transport.arrangementStep !== resolvedStep) {
    transport.arrangementStep = resolvedStep;
    corrected = true;
  }

  tracks.forEach((track) => {
    const clip = getArrangementStepClip(track, resolvedStep);
    const hasPlayableClip = !!clip?.source;
    if (track.arrangementClip !== (clip || null)) {
      track.arrangementClip = clip || null;
      corrected = true;
    }

    const cell = getTrackCell(track);
    const isBlackout = !!cell?.classList.contains("scene-blackout");
    const video = getTrackVideo(track);
    if (!hasPlayableClip) {
      if (!isBlackout) {
        setTrackBlackout(track, true);
        corrected = true;
      }
      if (video && !video.paused && typeof video.pause === "function") {
        video.pause();
        corrected = true;
      }
      if (track.nextTriggerAt !== Number.POSITIVE_INFINITY) {
        track.nextTriggerAt = Number.POSITIVE_INFINITY;
        corrected = true;
      }
      return;
    }

    if (isBlackout) {
      setTrackBlackout(track, false);
      corrected = true;
    }
  });

  if (corrected && window.freemixDebugEnabled) {
    console.info(`Arrangement confidence corrected from ${source}`);
  }
  return !corrected;
}

function scheduleArrangementPlayheadUpdate() {
  if (arrangementPlayheadUpdateFrame !== null) {
    return;
  }

  arrangementPlayheadUpdateFrame = window.requestAnimationFrame(() => {
    arrangementPlayheadUpdateFrame = null;
    renderArrangementPlayhead();
  });
}

function selectArrangementStep(stepIndex) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return;
  }

  arrangement.step = resolvedStep;
  markAppStateDirty(true);
  bindTracksToArrangementStep(resolvedStep);
  tracks.forEach((track) => {
    if (window.freemixRender?.updateTrackRow) {
      window.freemixRender.updateTrackRow(track);
    }
  });

  if (transport?.active && arrangement.enabled && hasArrangementClips()) {
    const now = performance.now();
    transport.startedAt = now;
    transport.nextBeatAt = now;
    transport.beatIndex = 0;
    transport.arrangementStartStep = resolvedStep;
    updateArrangementStep(resolvedStep, now, true);
    window.freemixRender?.updateTransportRow?.();
    window.freemixRender?.updateArrangementSceneColorSelector?.();
    return;
  }

  if (transport?.active && !arrangement.enabled) {
    const now = performance.now();
    transport.startedAt = now;
    transport.nextBeatAt = now;
    transport.beatIndex = 0;
    transport.arrangementStartStep = resolvedStep;
    updateArrangementStep(resolvedStep, now, true);
    window.freemixRender?.updateTransportRow?.();
    window.freemixRender?.updateArrangementSceneColorSelector?.();
    return;
  }

  renderArrangementPlayhead();
  window.freemixRender?.updateTransportRow?.();
  window.freemixRender?.updateArrangementSceneColorSelector?.();
  setStatus(`Editing scene ${resolvedStep + 1}`);
}

function renderArrangementPlayhead() {
  reconcileArrangementPlaybackConfidence("render");
  const currentStep = Number.isFinite(Number(arrangement.step)) ? Number(arrangement.step) : 0;
  if (!playerPanel) {
    arrangementPlayheadStep = currentStep;
    return;
  }

  if (Number.isFinite(arrangementPlayheadStep)) {
    getArrangementCellsByStep(arrangementPlayheadStep).forEach((cell) => {
      cell.classList.remove("playing");
    });
  }

  if (transport?.active && arrangement.enabled) {
    getArrangementCellsByStep(currentStep).forEach((cell) => {
      cell.classList.add("playing");
    });
  }
  arrangementPlayheadStep = currentStep;
  renderArrangementClipSelection();
  window.freemixRender?.updateArrangementSceneColorSelector?.();
}

function hasArrangementClips() {
  return !!arrangementHasClips;
}

function refreshArrangementHasClipsState(targetArrangement = arrangement) {
  if (!targetArrangement || !Array.isArray(targetArrangement.clips)) {
    arrangementHasClips = false;
    return false;
  }

  arrangementHasClips = targetArrangement.clips.some((step) => {
    if (!step || typeof step !== "object" || Array.isArray(step)) {
      return false;
    }
    return Object.keys(step).length > 0;
  });

  return arrangementHasClips;
}

function refreshArrangementStepCells(stepIndex) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return;
  }

  if (!window.freemixRender?.updateArrangementCell) {
    return;
  }

  tracks.forEach((stepTrack) => {
    window.freemixRender.updateArrangementCell(stepTrack, resolvedStep);
  });
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `session-${crypto.randomUUID()}`;
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSessionName(name, fallback = "Untitled Session") {
  const clean = String(name || "").trim().replace(/\s+/g, " ");
  return clean ? clean.slice(0, 64) : fallback;
}

function slugifySessionName(name) {
  const slug = normalizeSessionName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "freemix-session";
}

function readSessionLibrary() {
  const payload = readJsonFromStorage(SESSION_LIBRARY_STORAGE_KEY, null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { currentSessionId: null, recentIds: [], sessions: {} };
  }

  const sessions = payload.sessions && typeof payload.sessions === "object" && !Array.isArray(payload.sessions)
    ? payload.sessions
    : {};
  const recentIds = Array.isArray(payload.recentIds)
    ? payload.recentIds.filter((id) => typeof id === "string" && sessions[id]).slice(0, SESSION_RECENT_LIMIT)
    : [];
  const currentSessionId = typeof payload.currentSessionId === "string" && sessions[payload.currentSessionId]
    ? payload.currentSessionId
    : recentIds[0] || null;

  return { currentSessionId, recentIds, sessions };
}

function writeSessionLibrary(library) {
  writeJsonToStorage(SESSION_LIBRARY_STORAGE_KEY, {
    version: 1,
    currentSessionId: library.currentSessionId || null,
    recentIds: Array.isArray(library.recentIds) ? library.recentIds.slice(0, SESSION_RECENT_LIMIT) : [],
    sessions: library.sessions || {},
  });
}

function touchRecentSession(library, sessionId) {
  library.recentIds = [
    sessionId,
    ...(Array.isArray(library.recentIds) ? library.recentIds.filter((id) => id !== sessionId) : []),
  ].filter((id) => library.sessions?.[id]).slice(0, SESSION_RECENT_LIMIT);
  library.currentSessionId = sessionId;
}

function captureTrackSessionSnapshot(track) {
  return {
    name: track.name,
    role: track.role,
    color: track.color,
    id: track.id,
    showAdvanced: !!track.showAdvanced,
    collapsed: !!track.collapsed,
    startTime: Number(track.startTime) || 0,
    retriggersPerBar: normalizeRetriggersPerBar(track.retriggersPerBar),
    volume: clamp(Number(track.volume), 0, 1),
    muted: !!track.muted,
    solo: !!track.solo,
    blendMode: track.blendMode,
    opacity: clamp(Number(track.opacity), 0, 1),
    speed: clamp(Number(track.speed), 0.5, 2),
    pitch: clamp(Number(track.pitch), -12, 12),
    fx: { ...track.fx },
    source: track.source ? JSON.parse(JSON.stringify(track.source)) : null,
    durationFilter: track.durationFilter,
  };
}

function captureSessionSnapshot(name = "") {
  return {
    version: 1,
    app: "freemix-vm-420",
    name: normalizeSessionName(name || getCurrentSessionName() || "Untitled Session"),
    savedAt: new Date().toISOString(),
    state: {
      preferredBpm: resolvePreferredBpm(),
      preferredTimeSignature: resolvePreferredTimeSignature().value,
      metronomeEnabled: !!metronomeEnabled,
      masterMuted: !!masterMuted,
      arrangementStepCount,
    },
    tracks: tracks.map(captureTrackSessionSnapshot),
    arrangement: {
      ...JSON.parse(JSON.stringify(arrangement || createInitialArrangement(arrangementStepCount))),
      clips: JSON.parse(JSON.stringify(arrangement?.clips || [])),
      sceneColors: Array.isArray(arrangement?.sceneColors) ? arrangement.sceneColors.slice() : [],
    },
  };
}

function getCurrentSessionRecord() {
  const library = readSessionLibrary();
  return library.currentSessionId ? library.sessions[library.currentSessionId] || null : null;
}

function getCurrentSessionName() {
  return getCurrentSessionRecord()?.name || "";
}

function restoreCurrentSessionOnStartup() {
  const current = getCurrentSessionRecord();
  if (!current?.snapshot) {
    return null;
  }

  const hydrated = hydrateSessionSnapshot(current.snapshot, {
    stopPlayback: false,
    disposeAudio: false,
    resetHistory: false,
  });

  if (!hydrated) {
    return null;
  }

  return current;
}

function saveSessionRecord(name, options = {}) {
  const library = readSessionLibrary();
  const currentRecord = !options.newSession && library.currentSessionId ? library.sessions[library.currentSessionId] : null;
  const sessionId = currentRecord?.id || createSessionId();
  const sessionName = normalizeSessionName(name || currentRecord?.name || window.prompt?.("Session name", "Untitled Session") || "");
  const snapshot = captureSessionSnapshot(sessionName);
  const record = {
    id: sessionId,
    name: sessionName,
    savedAt: snapshot.savedAt,
    snapshot,
  };

  library.sessions[sessionId] = record;
  touchRecentSession(library, sessionId);
  writeSessionLibrary(library);
  renderRecentSessionMenu();

  if (options.download) {
    downloadSessionSnapshot(snapshot);
  }

  setStatus(`${sessionName}: saved`);
  markAppStateDirty(true);
  return record;
}

function downloadSessionSnapshot(snapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const download = document.createElement("a");
  download.href = url;
  download.download = `${slugifySessionName(snapshot.name)}.freemix-session.json`;
  download.style.display = "none";
  document.body.appendChild(download);
  download.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    download.remove();
  }, 0);
}

function normalizeSessionTrack(rawTrack, index) {
  const fallback = createTrackTemplate(index);
  const track = {
    ...fallback,
    ...(rawTrack && typeof rawTrack === "object" && !Array.isArray(rawTrack) ? rawTrack : {}),
    id: typeof rawTrack?.id === "string" && rawTrack.id.trim() ? rawTrack.id : fallback.id,
    color: TRACK_COLORS.includes(rawTrack?.color) ? rawTrack.color : fallback.color,
    source: rawTrack?.source && typeof rawTrack.source === "object" ? JSON.parse(JSON.stringify(rawTrack.source)) : null,
    audio: null,
    searchTimer: null,
    searchRequestId: 0,
    arrangementClip: null,
    lastStep: -1,
    nextTriggerAt: 0,
    stepMs: 0,
  };
  normalizeTrackPreferences(track);
  return track;
}

function resolveSessionSnapshotPayload(rawSnapshot) {
  const snapshot = rawSnapshot?.snapshot || rawSnapshot;
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : null;
}

function hydrateSessionSnapshot(rawSnapshot, options = {}) {
  const snapshot = resolveSessionSnapshotPayload(rawSnapshot);
  if (!snapshot) {
    return null;
  }

  if (options.stopPlayback !== false) {
    stopTransport(false);
  }

  if (options.disposeAudio !== false) {
    tracks.forEach(disposeTrackAudio);
  }

  const nextTracks = Array.isArray(snapshot.tracks) && snapshot.tracks.length
    ? snapshot.tracks.slice(0, MAX_TRACK_COUNT).map((track, index) => normalizeSessionTrack(track, index))
    : createInitialTracks(DEFAULT_TRACK_COUNT);
  tracks.splice(0, tracks.length, ...nextTracks);
  appState.tracks = tracks;
  refreshTrackLookup();

  appState.preferredBpm = clamp(Number(snapshot.state?.preferredBpm), 40, 220) || DEFAULT_BPM;
  appState.preferredTimeSignature = TIME_SIGNATURE_LOOKUP[snapshot.state?.preferredTimeSignature]
    ? snapshot.state.preferredTimeSignature
    : DEFAULT_TIME_SIGNATURE;
  metronomeEnabled = typeof snapshot.state?.metronomeEnabled === "boolean" ? snapshot.state.metronomeEnabled : true;
  masterMuted = !!snapshot.state?.masterMuted;

  const savedStepCount = Number(snapshot.state?.arrangementStepCount);
  const clipStepCount = Array.isArray(snapshot.arrangement?.clips) ? snapshot.arrangement.clips.length : null;
  const nextStepCount = clamp(
    Number.isInteger(savedStepCount)
      ? savedStepCount
      : Number.isInteger(clipStepCount)
        ? clipStepCount
        : DEFAULT_ARRANGEMENT_STEPS,
    MIN_ARRANGEMENT_STEPS,
    MAX_ARRANGEMENT_STEPS,
  );
  arrangementStepCount = nextStepCount;
  const nextArrangement = {
    ...createInitialArrangement(nextStepCount),
    ...(snapshot.arrangement && typeof snapshot.arrangement === "object" && !Array.isArray(snapshot.arrangement) ? snapshot.arrangement : {}),
  };
  syncArrangementState(nextArrangement);
  normalizeArrangementState(arrangement, nextStepCount);
  refreshArrangementHasClipsState();
  arrangementCopyMode = false;
  arrangementCopySourceStep = null;
  arrangementDeleteMode = false;

  if (options.resetHistory !== false) {
    arrangementUndoStack = [];
    arrangementRedoStack = [];
  }

  return snapshot;
}

function applySessionSnapshot(rawSnapshot, options = {}) {
  const snapshot = resolveSessionSnapshotPayload(rawSnapshot);
  if (!snapshot) {
    setStatus("Session file not recognized", true);
    return false;
  }

  hydrateSessionSnapshot(snapshot);

  if (options.sessionId) {
    const library = readSessionLibrary();
    if (library.sessions[options.sessionId]) {
      touchRecentSession(library, options.sessionId);
      writeSessionLibrary(library);
    }
  }

  if (!options.skipRender) {
    renderWorkstation();
    renderRecentSessionMenu();
  }
  markAppStateDirty(true);
  if (!options.silent) {
    setStatus(`${normalizeSessionName(snapshot.name || "Session")}: loaded`);
  }
  return true;
}

function saveCurrentSession() {
  const current = getCurrentSessionRecord();
  if (!current) {
    return saveSessionAs();
  }

  return saveSessionRecord(current.name);
}

function saveSessionAs() {
  const defaultName = getCurrentSessionName() || `Session ${new Date().toLocaleString()}`;
  const name = window.prompt?.("Save session as", defaultName);
  if (name === null) {
    setStatus("Save cancelled");
    return null;
  }

  return saveSessionRecord(name, { newSession: true, download: true });
}

function newBlankSession() {
  const hasWork = tracks.some((track) => track.source) || hasArrangementClips();
  if (hasWork && !window.confirm?.("Start a new blank session? Unsaved changes will remain only if saved first.")) {
    setStatus("New session cancelled");
    return false;
  }

  stopTransport(false);
  tracks.forEach(disposeTrackAudio);
  tracks.splice(0, tracks.length, ...createInitialTracks(DEFAULT_TRACK_COUNT));
  appState.tracks = tracks;
  refreshTrackLookup();
  appState.preferredBpm = DEFAULT_BPM;
  appState.preferredTimeSignature = DEFAULT_TIME_SIGNATURE;
  metronomeEnabled = true;
  masterMuted = false;
  arrangementStepCount = DEFAULT_ARRANGEMENT_STEPS;
  arrangementCopyMode = false;
  arrangementCopySourceStep = null;
  arrangementDeleteMode = false;
  arrangementUndoStack = [];
  arrangementRedoStack = [];
  syncArrangementState(createInitialArrangement(DEFAULT_ARRANGEMENT_STEPS));
  refreshArrangementHasClipsState();

  const library = readSessionLibrary();
  library.currentSessionId = null;
  writeSessionLibrary(library);

  renderWorkstation();
  renderRecentSessionMenu();
  markAppStateDirty(true);
  setStatus("New blank session");
  return true;
}

function loadRecentSession(sessionId) {
  const library = readSessionLibrary();
  const record = library.sessions?.[sessionId];
  if (!record?.snapshot) {
    setStatus("Recent session missing", true);
    renderRecentSessionMenu();
    return false;
  }

  return applySessionSnapshot(record.snapshot, { sessionId });
}

async function loadSessionFile(file) {
  if (!file) {
    return false;
  }

  try {
    const text = await file.text();
    const snapshot = JSON.parse(text);
    const loaded = applySessionSnapshot(snapshot);
    if (loaded) {
      saveSessionRecord(snapshot.name || file.name.replace(/\.json$/i, ""), { newSession: true });
    }
    return loaded;
  } catch (error) {
    console.warn(error);
    setStatus("Could not load session file", true);
    return false;
  }
}

function renderRecentSessionMenu() {
  const list = document.querySelector("#fileRecentList");
  if (!list) {
    return;
  }

  const library = readSessionLibrary();
  const records = library.recentIds.map((id) => library.sessions[id]).filter(Boolean);
  if (!records.length) {
    list.innerHTML = `<button type="button" disabled>No recent sessions</button>`;
    return;
  }

  list.innerHTML = records
    .map((record) => {
      const date = record.savedAt ? new Date(record.savedAt) : null;
      const dateLabel = date && !Number.isNaN(date.valueOf()) ? date.toLocaleDateString() : "Saved";
      return `<button type="button" data-file-recent="${escapeHtml(record.id)}"><strong>${escapeHtml(record.name)}</strong><small>${escapeHtml(dateLabel)}</small></button>`;
    })
    .join("");
}

function captureTrackClip(track) {
  return {
    source: track.source,
    colorIndex: getArrangementSceneColorIndex(arrangement?.step),
    durationFilter: track.durationFilter,
    startTime: track.startTime,
    retriggersPerBar: track.retriggersPerBar,
    volume: track.volume,
    muted: track.muted,
    blendMode: track.blendMode,
    opacity: track.opacity,
    speed: track.speed,
    pitch: track.pitch,
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
  const normalizedQuery = normalizeSearchInput(query);

  if (track.searchAbortController) {
    try {
      track.searchAbortController.abort(new DOMException("Search superseded", "AbortError"));
    } catch {
      // best effort.
    }
  }

  if (!normalizedQuery.length) {
    renderTrackResults(track, []);
    track.searchRequestId = (track.searchRequestId ?? 0) + 1;
    return;
  }

  track.searchTimer = window.setTimeout(() => {
    searchTrackSource(track, normalizedQuery);
  }, SEARCH_DELAY_MS);
}

function buildTrackSearchParams(rawQuery) {
  const params = new URLSearchParams({
    q: rawQuery,
    sort: "downloads desc",
    rows: String(SEARCH_ROWS_PER_REQUEST),
    page: "1",
    output: "json",
  });

  SEARCH_RESULT_FIELDS.forEach((field) => {
    params.append("fl[]", field);
  });

  return params;
}

function makeSearchCacheKey(rawQuery) {
  return normalizeSearchInput(rawQuery) || rawQuery;
}

function pruneSearchResultCache() {
  if (searchResultCache.size <= SEARCH_RESULT_CACHE_MAX_SIZE) {
    return;
  }

  const oldest = [...searchResultCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
  const excess = searchResultCache.size - SEARCH_RESULT_CACHE_MAX_SIZE;
  for (let index = 0; index < excess; index += 1) {
    const keyToDelete = oldest[index]?.[0];
    if (keyToDelete) {
      searchResultCache.delete(keyToDelete);
    }
  }
}

async function fetchSearchResults(rawQuery, signal) {
  const key = makeSearchCacheKey(rawQuery);
  const now = Date.now();
  const cached = searchResultCache.get(key);
  if (cached && now - cached.fetchedAt < SEARCH_RESULT_CACHE_TTL_MS) {
    return cached.docs;
  }

  const inFlight = searchRequestInflight.get(key);
  if (inFlight && now - inFlight.startedAt < SEARCH_REQUEST_IN_FLIGHT_TTL_MS) {
    return signal ? await awaitWithAbort(inFlight.promise, signal) : inFlight.promise;
  }

  const request = (async () => {
    const docs = await performArchiveSearch(buildTrackSearchParams(rawQuery), signal);
    return Array.isArray(docs) ? docs : [];
  })();

  searchRequestInflight.set(key, {
    startedAt: now,
    promise: request,
  });

  try {
    const docs = signal ? await awaitWithAbort(request, signal) : await request;
    searchResultCache.set(key, {
      fetchedAt: Date.now(),
      docs,
    });
    queueSearchResultCachePersist();
    pruneSearchResultCache();
    return docs;
  } finally {
    searchRequestInflight.delete(key);
  }
}

async function runArchiveSearchQueries(query, options = {}) {
  const { signal, maxResults = SEARCH_QUERY_VARIANT_TARGET } = options;
  const normalizedQuery = normalizeSearchInput(query);
  if (!normalizedQuery) {
    return [];
  }

  const queryVariants = buildArchiveSearchQueryVariants(normalizedQuery);
  if (!queryVariants.length) {
    return [];
  }

  const seenIdentifiers = new Set();
  const merged = [];
  let lastError = null;
  for (const searchQuery of queryVariants) {
    if (signal?.aborted) {
      throw signal.reason || new DOMException("Request aborted", "AbortError");
    }

    try {
      const docs = await fetchSearchResults(searchQuery, signal);
      const normalizedDocs = normalizeResults(docs);
      for (const result of normalizedDocs) {
        if (!result.identifier || seenIdentifiers.has(result.identifier)) {
          continue;
        }

        seenIdentifiers.add(result.identifier);
        merged.push(result);
      }

      if (merged.length >= maxResults) {
        break;
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  if (!merged.length && lastError) {
    throw lastError;
  }

  return merged;
}

async function searchTrackSource(track, query) {
  const signal = (() => {
    const controller = new AbortController();
    track.searchAbortController = controller;
    return controller.signal;
  })();
  const requestId = ++trackSearchRequestCounter;
  track.searchRequestId = requestId;
  renderTrackResultsMessage(track, "Searching...");

  try {
    const docs = await runArchiveSearchQueries(query, {
      signal,
      maxResults: SEARCH_QUERY_VARIANT_TARGET,
    });
    if (track.searchRequestId !== requestId) {
      return;
    }

    const renderTrackState = getTrackRenderState(track);
    const filterKey = DURATION_FILTERS[renderTrackState?.durationFilter] ? renderTrackState.durationFilter : track.durationFilter;
    const results = rankAndFilterResults(docs, filterKey, query);
    if (results.length) {
      renderTrackResults(track, results);
      return;
    }

    renderTrackResultsMessage(track, "No matches");
  } catch (error) {
    if (track.searchRequestId !== requestId) {
      return;
    }

    if (isAbortError(error)) {
      return;
    }

    renderTrackResultsMessage(track, "Search failed");
    console.error(error);
  } finally {
    if (track.searchAbortController?.aborted || track.searchAbortController?.signal) {
      if (track.searchAbortController?.signal === signal && track.searchRequestId === requestId) {
        track.searchAbortController = null;
      }
    }
  }
}

function rankAndFilterResults(results, filterKey = "any", query = "") {
  const filter = DURATION_FILTERS[filterKey] ?? DURATION_FILTERS.any;
  const filterDuration = filterKey !== "any";

  const sorted = results
    .map((result) => ({
      ...result,
      _searchScore: searchRelevance(result, query),
    }))
    .sort((a, b) => {
      if (b._searchScore !== a._searchScore) {
        return b._searchScore - a._searchScore;
      }

      if (b.downloads !== a.downloads) {
        return b.downloads - a.downloads;
      }

      const durationA = Number.isFinite(a.durationSeconds) ? a.durationSeconds : Number.MAX_SAFE_INTEGER;
      const durationB = Number.isFinite(b.durationSeconds) ? b.durationSeconds : Number.MAX_SAFE_INTEGER;
      return durationA - durationB || a.title.localeCompare(b.title);
    })
    .map(({ _searchScore, ...result }) => result);

  const durationFiltered = filterDuration
    ? sorted.filter((result) => !Number.isFinite(result.durationSeconds) || (result.durationSeconds >= filter.min && result.durationSeconds < filter.max))
    : sorted;

  if (!filterDuration || durationFiltered.length >= SEARCH_RESULTS_LIMIT) {
    return diversifyRankedSearchResults(durationFiltered, SEARCH_RESULTS_LIMIT);
  }

  const durationFilteredIds = new Set(durationFiltered.map((result) => result.identifier));
  const relaxed = [
    ...durationFiltered,
    ...sorted.filter((result) => !durationFilteredIds.has(result.identifier)),
  ];

  return diversifyRankedSearchResults(relaxed, SEARCH_RESULTS_LIMIT);
}

function renderTrackResults(track, results) {
  const resultsEl = playerPanel?.querySelector(`#results-${track.id}`);
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
  const resultsEl = playerPanel?.querySelector(`#results-${track.id}`);
  if (!resultsEl) {
    return;
  }

  resultsEl.hidden = false;
  resultsEl.innerHTML = `<div class="track-result-message">${escapeHtml(message)}</div>`;
}

async function loadTrackSource(track, result) {
  stopTransport(false);
  disposeTrackAudio(track);
  track.mediaStatus = "loading";
  setStatus(`${track.name}: loading`);
  renderTrackResultsMessage(track, "Loading media...");

  try {
    const source = await fetchPlayableSource(result);
    const selectedClip = getArrangementStepClip(track, arrangement?.step);
    const activeClip = selectedClip || (arrangement?.enabled ? getArrangementStepClipForTrack(track, { create: true }) : null);
    const targetState = activeClip && activeClip !== track ? activeClip : track;

    targetState.source = source;
    targetState.startTime = 0;
    targetState.lastStep = -1;
    selectedSource = getFirstLoadedTrackSource() || source;
    if (targetState !== track) {
      track.startTime = 0;
      track.lastStep = -1;
      refreshArrangementHasClipsState();
      refreshArrangementStepCells(arrangement.step);
    }
    setTrackMediaStatus(track, "loading");
    if (window.freemixRender?.updateTrackRow) {
      window.freemixRender.updateTrackRow(track);
      window.freemixRender.updateSourceStrip?.();
    } else {
      renderWorkstation();
    }
    markAppStateDirty(true);
    setStatus(`${track.name}: loading media`);
  } catch (error) {
    setTrackMediaStatus(track, "failed");
    renderTrackResultsMessage(track, "No playable file");
    setStatus(`${track.name}: no file`, true);
    console.warn(error);
  }
}

function handleTrackSearchKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  const track = getTrackById(event.currentTarget.dataset.trackControl);
  if (track) {
    renderTrackResults(track, []);
  }
}

function createInitialTracks(count = DEFAULT_TRACK_COUNT) {
  const desired = Number.isFinite(count) ? Math.floor(count) : DEFAULT_TRACK_COUNT;
  const trackCount = Math.max(1, Math.min(desired, MAX_TRACK_COUNT));
  return Array.from({ length: trackCount }, (_, index) => createTrackTemplate(index));
}

function createTrackTemplate(index) {
  const paletteIndex = Math.max(0, Math.floor(index || 0));
  return {
    name: `Track ${paletteIndex + 1}`,
    role: "",
    color: TRACK_COLORS[paletteIndex % TRACK_COLORS.length],
    id: `track-${paletteIndex + 1}`,
    showAdvanced: false,
    collapsed: false,
    startTime: 0,
    retriggersPerBar: TRACK_RETRIGGER_DEFAULTS[paletteIndex % TRACK_RETRIGGER_DEFAULTS.length],
    volume: 0.55,
    muted: false,
    solo: false,
    blendMode: TRACK_BLEND_DEFAULTS[paletteIndex % TRACK_BLEND_DEFAULTS.length],
    opacity: 1,
    speed: 1,
    pitch: 0,
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
    mediaStatus: "empty",
    durationFilter: "quick",
    searchTimer: null,
    searchRequestId: 0,
  };
}

function canAddTrack() {
  return tracks.length < MAX_TRACK_COUNT;
}

function addTrack() {
  if (typeof clearGuidanceHint === "function") {
    clearGuidanceHint();
  }

  if (!canAddTrack()) {
    setStatus("Max 4 tracks reached", true);
    return false;
  }

  if (transport?.active) {
    stopTransport(false);
  }

  const nextTrack = createTrackTemplate(tracks.length);
  tracks.push(nextTrack);
  refreshTrackLookup();
  if (window.freemixTrackSourceCache && nextTrack.id) {
    window.freemixTrackSourceCache[nextTrack.id] = {};
  }

  renderWorkstation();
  markAppStateDirty(true);
  setStatus(`${nextTrack.name} added`);
  return true;
}

window.addTrack = addTrack;
window.canAddTrack = canAddTrack;
window.freemixRenameTrack = renameTrack;

function createInitialArrangement(steps = arrangementStepCount) {
  return {
    enabled: false,
    step: 0,
    steps,
    sceneColors: Array.from({ length: steps }, () => DEFAULT_SCENE_COLOR_INDEX),
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
  const next = Number(value);
  if (!Number.isFinite(next)) {
    return min;
  }
  return Math.min(Math.max(next, min), max);
}

function almostEqual(a, b, epsilon = 0.0005) {
  return Math.abs(a - b) <= epsilon;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.freemixRenderDebugPanel = window.freemixRenderDebugPanel || null;



