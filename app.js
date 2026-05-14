const playerPanel = document.querySelector("#playerPanel");
const statusPill = document.querySelector("#statusPill");

const IA_SEARCH_URL = "https://archive.org/advancedsearch.php";
const IA_METADATA_URL = "https://archive.org/metadata";
const IA_DOWNLOAD_URL = "https://archive.org/download";
const SEARCH_DELAY_MS = 280;
const SEARCH_QUERY_MIN_LENGTH = 2;
const SEARCH_RESULT_FIELDS = Object.freeze([
  "identifier",
  "title",
  "creator",
  "description",
  "subject",
  "year",
  "runtime",
  "downloads",
]);
const SEARCHABLE_TEXT_FIELDS = Object.freeze(["title", "creator", "description", "subject", "identifier", "collection"]);
const SEARCH_QUERY_VARIANT_TARGET = 24;
const SEARCH_RESULT_CACHE_TTL_MS = 180_000;
const SEARCH_RESULT_CACHE_MAX_SIZE = 32;
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
    "startTime",
    "startNumber",
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
const REVERB_BUFFER_CACHE = new WeakMap();
const TUBE_CURVE_CACHE = new Map();
let metronomeGain = null;
const TRACK_LOOKUP = new Map();
const UI_NODE_CACHE = {
  beatLights: null,
};
const SEARCH_ROWS_PER_REQUEST = 24;
const SEARCH_RESULTS_LIMIT = 8;
const SEARCH_RESULT_MAX_CONTRIBUTIONS_PER_CREATOR = 2;
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
  "arrangementStepCount",
  "arrangementCopyMode",
  "arrangementCopySourceStep",
  "tracks",
  "arrangement",
  "trackSearchRequestCounter",
  "userOnboarding",
]);
const APP_STATE_PROXY_DIRTY_KEYS = new Set(["arrangementStepCount", "masterMuted", "userOnboarding"]);
const DEFAULT_BPM = 92;
const DEFAULT_ARRANGEMENT_STEPS = 8;
const ARRANGEMENT_STEP_OPTIONS = [4, 8, 16];
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
        max: "120",
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

function normalizeArrangementState(targetArrangement, targetStepCount) {
  const arrangementState = targetArrangement;
  if (!arrangementState || typeof arrangementState !== "object") {
    return;
  }

  const stepCount = Math.max(
    1,
    Number.isFinite(Number(targetStepCount)) ? Math.max(1, Math.floor(Number(targetStepCount))) : DEFAULT_ARRANGEMENT_STEPS,
  );
  const existingClips = Array.isArray(arrangementState.clips) ? arrangementState.clips : [];
  arrangementState.clips = existingClips
    .slice(0, stepCount)
    .map((clip) => (clip && typeof clip === "object" && !Array.isArray(clip) ? clip : {}));
  while (arrangementState.clips.length < stepCount) {
    arrangementState.clips.push({});
  }

  arrangementState.step = Number.isFinite(Number(arrangementState.step))
    ? clamp(Math.floor(Number(arrangementState.step)), 0, arrangementState.clips.length - 1)
    : 0;
  arrangementState.enabled = !!arrangementState.enabled;
  arrangementState.steps = arrangementState.clips.length;
}

if (!Array.isArray(appState.tracks) || appState.tracks.length === 0) {
  appState.tracks = createInitialTracks(DEFAULT_TRACK_COUNT);
} else if (appState.tracks.length > MAX_TRACK_COUNT) {
  appState.tracks = appState.tracks.slice(0, MAX_TRACK_COUNT);
}

if (typeof appStateManager.hydrateTracks === "function") {
  appStateManager.hydrateTracks(appState.tracks);
}

if (!appState.arrangement) {
  appState.arrangement = createInitialArrangement(appState.arrangementStepCount || DEFAULT_ARRANGEMENT_STEPS);
} else if (typeof appStateManager.hydrateArrangement === "function") {
  appStateManager.hydrateArrangement(appState.arrangement);
}
normalizeArrangementState(appState.arrangement, appState.arrangementStepCount || DEFAULT_ARRANGEMENT_STEPS);
refreshArrangementHasClipsState(appState.arrangement);

if (!appState.userOnboarding || !appState.userOnboarding.phase) {
  appState.userOnboarding = { phase: "seed", needsHint: true };
}

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
}

tracks.forEach(normalizeTrackPreferences);

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

const searchResultCache = new Map();
const searchRequestInflight = new Map();
const liveControlSchedulers = new Map();
let arrangementPlayheadStep = -1;
let activeBeatLightIndex = -1;
let liveControlPersistTimer = null;
let arrangementPlayheadUpdateFrame = null;
let searchResultCachePersistTimer = null;
let sourceMetadataCachePersistTimer = null;
let arrangementHasClips = false;

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

function hasSoloTracksEnabled() {
  return tracks.some((track) => !!track?.solo);
}

function hasNonDefaultFx(track) {
  if (track?.blendMode !== TRACK_BLEND_DEFAULTS[0]) {
    return true;
  }
  if (Number(track?.opacity) !== 1) {
    return true;
  }
  if (Number(track?.pitch) !== 0 || Number(track?.speed) !== 1) {
    return true;
  }
  return Object.values(track?.fx || {}).some((value) => Number(value) !== 0);
}

function isTrackAudibleInMix(track) {
  if (!track || track.muted) {
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

  if (activeChip) {
    activeChip.classList.toggle("is-on", !track.muted);
  }
  if (mutedChip) {
    mutedChip.classList.toggle("is-on", !!track.muted);
  }
  if (fxChip) {
    fxChip.classList.toggle("is-on", hasNonDefaultFx(track) || !!track.showAdvanced);
  }
  if (soloChip) {
    soloChip.classList.toggle("is-on", !!track.solo);
    soloChip.setAttribute("aria-pressed", String(!!track.solo));
  }
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

async function primeTrackForTransport(track) {
  if (!track?.source) {
    return;
  }

  const video = getTrackVideo(track);
  if (!video) {
    return;
  }

  if (track.source?.mediaUrl && video.src !== track.source.mediaUrl) {
    video.src = track.source.mediaUrl;
    video.load();
  }

  if (video.networkState !== 0) {
    video.load();
  }

  await waitForTrackReady(video);
  safeSetCurrentTime(video, track);
  setupTrackAudio(track, video);
  applyTrackVolume(track, track);
  applyTrackPitchAndSpeed(track, track);
}

function resyncTrackTiming(track) {
  if (!track || !transport?.active) {
    return;
  }

  const beatMs = transport?.beatMs || 60000 / transport.bpm;
  const barMs = beatMs * 4;
  track.stepMs = barMs / normalizeRetriggersPerBar(track.retriggersPerBar);
  track.nextTriggerAt = Math.max(performance.now(), transport.nextBeatAt || performance.now());
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
      description: textListValue(doc.description),
      subject: textListValue(doc.subject),
      year: textValue(doc.year),
      runtime: textValue(doc.runtime),
      downloads: Number(textValue(doc.downloads)) || 0,
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

function tokenizeSearchQuery(value) {
  const normalized = normalizeSearchInput(value);
  if (!normalized) {
    return [];
  }

  const stopWords = new Set(["the", "and", "for", "with", "from", "that", "this", "your", "just", "have", "not"]);
  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= SEARCH_QUERY_MIN_LENGTH && !stopWords.has(token));
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
  const titleCreatorClause = (value) => `(title:(${value}) OR creator:(${value}))`;
  const mediaScoped = (query) => `mediatype:(movies) AND (${query})`;
  const wildcardValue = safeQuery.includes(" ") ? "" : `${safeQuery}*`;

  addQuery(
    mediaScoped(`${toFieldClause(`"${safeQuery}"`)}${wildcardValue ? ` OR ${toFieldClause(wildcardValue)}` : ""}`),
  );

  if (uniqueTokens.length > 0) {
    const tokenClause = uniqueTokens.map((token) => toFieldClause(`"${token}"`)).join(" OR ");
    addQuery(mediaScoped(tokenClause));

    if (uniqueTokens.length > 1) {
      const titleCreatorTokens = uniqueTokens.slice(0, 4).map((token) => titleCreatorClause(`"${token}*"`)).join(" AND ");
      addQuery(mediaScoped(`(${titleCreatorTokens})`));
    }
  }

  if (safeQuery !== rawQuery.trim()) {
    addQuery(mediaScoped(toFieldClause(`"${safeQuery}"`)));
  }

  addQuery(mediaScoped(`"${safeQuery}"`));
  addQuery(mediaScoped(safeQuery));
  addQuery(toFieldClause(`"${safeQuery}*"`));
  addQuery(toFieldClause(`"${safeQuery}"`));

  return Array.from(queries).slice(0, 7);
}

function searchRelevance(result, rawQuery) {
  const normalizedQuery = normalizeSearchInput(rawQuery);
  const tokens = tokenizeSearchQuery(normalizedQuery);
  const title = String(result.title || "").toLowerCase();
  const creator = String(result.creator || "").toLowerCase();
  const identifier = String(result.identifier || "").toLowerCase();
  const description = String(result.description || "").toLowerCase();
  const subject = String(result.subject || "").toLowerCase();

  let score = 0;
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

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    if (title.startsWith(token)) {
      score += 22;
    }
    if (title.includes(token)) {
      score += 12;
    }
    if (creator.includes(token)) {
      score += 9;
    }
    if (identifier.includes(token)) {
      score += 8;
    }
    if (description.includes(token)) {
      score += 7;
    }
    if (subject.includes(token)) {
      score += 6;
    }
  }

  if (Number.isFinite(result.durationSeconds) && result.durationSeconds > 0) {
    score += Math.min(40, Math.log10(result.durationSeconds));
  }

  if (Number.isFinite(result.downloads) && result.downloads > 0) {
    score += Math.min(20, Math.round(Math.log10(result.downloads + 1) * 4));
  }

  return score;
}

function diversifyRankedSearchResults(results, limit) {
  const selected = [];
  const seen = new Set();
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

    seen.add(result.identifier);
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
    <section class="workstation" aria-label="Track video looper">
      ${
        appState.userOnboarding?.needsHint
          ? `
        <section class="launch-pad">
          <span class="panel-label">Quick launch</span>
          <div class="launch-pad-actions">
            <button class="launch-button" type="button" data-launch-action="load-sample">Load sample</button>
            <button class="launch-button" type="button" data-launch-action="place-bar">Seed bar</button>
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
        <button class="transport-button metronome-button active" id="metroButton" type="button">
          Click
        </button>
        <div class="meter" aria-label="Bar position">
          <span class="beat-light" data-beat="0"></span>
          <span class="beat-light" data-beat="1"></span>
          <span class="beat-light" data-beat="2"></span>
          <span class="beat-light" data-beat="3"></span>
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
    </section>
  `;

  invalidateUiNodeCache();
  bindWorkstationControls();
  tracks.forEach(applyTrackControlVisibility);
  tracks.forEach(updateTrackModeChips);
  syncArrangementTrackHeights();
  window.freemixRender?.updateTransportRow?.();
  window.freemixRender?.updateSourceStrip?.();
  if (appState.userOnboarding?.needsHint) {
    showGuidance("Quick launch: load sample, seed bar, then press Play");
  }
}

function applyTrackControlVisibility(track) {
  const trackRow = getTrackRowElement(track);
  if (!trackRow) {
    return;
  }

  trackRow.classList.toggle("is-advanced", !!track.showAdvanced);
  trackRow.querySelectorAll(".control-advanced").forEach((control) => {
    control.classList.toggle("is-hidden", !track.showAdvanced);
  });
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
        <div class="arrangement-step-labels" style="--arrangement-steps: ${arrangementStepCount}" aria-label="Arrangement steps">
          ${renderArrangementStepLabels()}
        </div>
        ${renderArrangementGrid()}
        ${renderDebugPanel()}
      </aside>
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
  return `
    <div class="video-cell ${track.color} blend-${track.blendMode} ${track.source ? "has-source" : "no-source"}" data-track-id="${track.id}" style="--layer-index: ${index + 1}">
      ${
        track.source
        ? `<video
              class="track-video"
              id="video-${track.id}"
              src="${track.source.mediaUrl}"
              preload="auto"
              playsinline
            ></video>`
          : `<div class="track-empty-video" aria-hidden="true"></div>`
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
  const timingControls = renderTrackControls(track, TRACK_CONTROL_SECTIONS.timing);
  const densityControls = renderTrackControls(track, TRACK_CONTROL_SECTIONS.density);
  const levelControls = renderTrackControls(track, TRACK_CONTROL_SECTIONS.performance);
  const advancedControls = TRACK_CONTROL_SECTIONS.advanced
    .map((control) => renderTrackControlField(track, control))
    .join("");
  const activeChip = track.muted ? "" : " is-on";

  return `
    <article class="track-row ${track.color}" data-track-row-id="${track.id}">
      <div class="track-row-label">
        <div class="track-row-title">
          <strong>${escapeHtml(track.name)}</strong>
          <span>${escapeHtml(track.role)}</span>
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
          aria-pressed="${track.muted}"
          title="${track.muted ? "Unmute this channel" : "Mute this channel"}"
        >
          ${track.muted ? "Mute" : "On"}
        </button>
      </div>
      <div class="track-channel-row track-channel-row--bottom">
        ${timingControls}
        ${levelControls}
        <button
          class="track-advanced-toggle"
          type="button"
          data-track-control="${track.id}"
          data-control="advanced"
          aria-pressed="${!!track.showAdvanced}"
          title="Reveal advanced controls"
        >
          ${track.showAdvanced ? "Less" : "More"}
        </button>
      </div>
      ${advancedControls}
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
  const isAdvanced = control.visibility === "advanced";
  const className = `control-field ${control.fieldClass || ""}`.trim();
  const trackAttributes = `data-track-control="${track.id}" data-control="${control.control}"`;
  const visibilityClass = isAdvanced ? "control-advanced" : "";
  const resolvedValue = control.control === "startNumber" ? track.startTime : track[control.control];

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
        ${renderTrackControlLabel(control)}
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

  if (control.type === "fx-chain") {
    const speedValue = Number.isFinite(track.speed) ? track.speed : 1;
    const pitchValue = Number.isFinite(track.pitch) ? track.pitch : 0;

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
                  (option) => `<option value="${option.value}" ${String(option.value) === String(track.blendMode) ? "selected" : ""}>${option.label}</option>`,
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
                value="${Number.isFinite(track.opacity) ? track.opacity : 1}"
                data-track-control="${track.id}"
                data-control="opacity"
                aria-label="${escapeHtml(`${track.name} Opacity`)}"
              >
            </label>
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

  if (controlName === "sourceSearch") {
    queueTrackSearch(track, control.value.trim());
    return;
  }

  if (controlName === "durationFilter") {
    track.durationFilter = control.value;
    const [sourceSearch] = getTrackControls(track, "sourceSearch");
    queueTrackSearch(track, sourceSearch?.value.trim() ?? "");
    return;
  }

  if (controlName === "blendMode") {
    track.blendMode = control.value;
    applyArrangementClipControlValue(track, "blendMode", track.blendMode);
    applyTrackBlend(track);
    updateTrackModeChips(track);
    return;
  }

  if (controlName === "opacity") {
    track.opacity = clamp(Number(control.value), 0, 1);
    applyArrangementClipControlValue(track, "opacity", track.opacity);
    applyTrackOpacity(track);
    updateTrackModeChips(track);
    return;
  }

  if (controlName === "speed") {
    track.speed = clamp(Number(control.value), 0.5, 2);
    applyArrangementClipControlValue(track, "speed", track.speed);
    const valueEl = control.parentElement?.querySelector(".fx-mini-value");
    if (valueEl) {
      valueEl.textContent = `${Number(track.speed).toFixed(2)}x`;
    }
    applyTrackPitchAndSpeed(track);
    return;
  }

  if (controlName === "pitch") {
    track.pitch = clamp(Number(control.value), -12, 12);
    applyArrangementClipControlValue(track, "pitch", track.pitch);
    const valueEl = control.parentElement?.querySelector(".fx-mini-value");
    if (valueEl) {
      const displayPitch = Number(track.pitch);
      valueEl.textContent = `${displayPitch > 0 ? "+" : ""}${displayPitch}`;
    }
    applyTrackPitchAndSpeed(track);
    updateTrackModeChips(track);
    return;
  }

  if (controlName === "startTime" || controlName === "startNumber") {
    const video = getTrackVideo(track);
    const nextStartTime = normalizeStartTimeInput(control.value, track, video);
    if (!Number.isFinite(nextStartTime)) {
      return;
    }

    track.startTime = nextStartTime;
    applyArrangementClipControlValue(track, "startTime", nextStartTime);

    syncStartControls(track);
    if (video && (!transport?.active || event?.type !== "input")) {
      safeSetCurrentTime(video, track.arrangementClip ?? track);
    }

    if (!transport?.active && event?.type !== "input") {
      previewTrack(track);
    }

    markAppStateDirty();
    return;
  }

  if (controlName === "retriggersPerBar") {
    track.retriggersPerBar = normalizeRetriggersPerBar(control.value);
    applyArrangementClipControlValue(track, "retriggersPerBar", track.retriggersPerBar);
    track.lastStep = -1;
    resyncTrackTiming(track);
    previewTrack(track);
  }

  if (controlName === "volume") {
    track.volume = Number(control.value);
    applyArrangementClipControlValue(track, "volume", track.volume);
    applyTrackVolume(track);
  }

  if (controlName in track.fx) {
    track.fx[controlName] = Number(control.value);
    applyArrangementClipControlValue(track, controlName, track.fx[controlName]);
    const valueEl = control.parentElement?.querySelector(".fx-value");
    const fxDefinition = FX_CONTROL_INDEX[controlName];
    if (valueEl && fxDefinition) {
      const value =
        Number.isInteger(fxDefinition.step) || fxDefinition.step >= 1
          ? Math.round(track.fx[controlName])
          : track.fx[controlName].toFixed(2).replace(/\.?0+$/, "");
      valueEl.textContent = String(value);
    }
    applyTrackFx(track, track.arrangementClip ?? track);
    applyVideoFx(track, track.arrangementClip ?? track);
    updateTrackModeChips(track);
  }

  if (controlName === "muted") {
    track.muted = !track.muted;
    applyArrangementClipControlValue(track, "muted", track.muted);
    control.textContent = track.muted ? "Muted" : "On";
    control.setAttribute("aria-pressed", String(track.muted));
    updateTrackModeChips(track);
    applyTrackVolume(track);
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

  if (controlName !== "sourceSearch") {
    if (event?.type === "input") {
      queueControlStatePersist();
    } else {
      markAppStateDirty();
    }
  }
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

  if (!tracks.some((track) => track.source)) {
    setStatus("Load a source", true);
    return;
  }

  const bootToken = (startTransport.bootToken ?? 0) + 1;
  startTransport.bootToken = bootToken;

  stopTransport(false, false);
  const startToken = bootToken;
  startTransport.runningPromise = (async () => {
    try {
      if (typeof ensureAudioContext === "function") {
        await ensureAudioContext();
      }

      await Promise.all(
        tracks
          .filter((track) => track.source)
          .map((track) =>
            primeTrackForTransport(track).catch((error) => {
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

      startTransportWithState();
    } catch (error) {
      webAudioDisabled = true;
      console.warn(error);
      setStatus("Audio unavailable, trying again natively", true);
    } finally {
      if (startTransport.bootToken === startToken) {
        startTransport.runningPromise = null;
      }
    }
  })();
}

const pendingAnchorSeeks = new Set();

function normalizeStartTimeInput(rawValue, track, video) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return Number.isFinite(track?.startTime) ? track.startTime : 0;
  }

  const clampedMinimum = Math.max(0, parsed);
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
    return clampedMinimum;
  }

  return Math.min(clampedMinimum, Math.max(video.duration - 0.2, 0));
}

function queueStartTimeSeek(video, track) {
  const trackId = track?.id;
  if (!video || !trackId) {
    return;
  }

  if (pendingAnchorSeeks.has(trackId)) {
    return;
  }

  pendingAnchorSeeks.add(trackId);
  const clearPending = () => {
    pendingAnchorSeeks.delete(trackId);
  };

  const applySeek = () => {
    clearPending();
    const currentTrack = getTrackById(trackId);
    if (!currentTrack) {
      return;
    }

    safeSetCurrentTime(video, currentTrack.arrangementClip ?? currentTrack);
  };

  video.addEventListener("loadedmetadata", applySeek, { once: true });
  video.addEventListener("error", clearPending, { once: true });
  if (video.networkState !== 0) {
    video.load();
  }
}

function safeSetCurrentTime(video, track) {
  if (!video || !track) {
    return;
  }

  const nextTime = safeStartTime(track, video);
  if (!Number.isFinite(nextTime)) {
    return;
  }

  if (video.readyState < 1) {
    queueStartTimeSeek(video, track);
    return;
  }

  try {
    if (almostEqual(video.currentTime, nextTime, 0.001)) {
      return;
    }

    video.currentTime = nextTime;
    return;
  } catch (error) {
    queueStartTimeSeek(video, track);
  }
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

function attemptVideoPlay(video, track, clipState) {
  const shouldBeMuted = !!clipState?.muted || !!track.muted;
  const targetVolume = Number.isFinite(clipState?.volume) ? clipState.volume : Number(track.volume) || 1;
  const clip = clipState || track;
  const clipVolume = clamp(targetVolume, 0, 1);

  if (clip?.source?.mediaUrl && clip.source.mediaUrl !== video.src) {
    video.src = clip.source.mediaUrl;
    video.load();
  }

  if (audioContext && audioContext.state !== "running" && track.audio) {
    disposeTrackAudio(track);
  }

  const playWithState = async (muted) => {
    const hasLiveAudioGraph =
      !!track.audio && !webAudioDisabled && audioContext?.state === "running" && track.audio.mediaElement;
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

    await waitForTrackReady(video);
    await video.play();

    return muted;
  };

  return playWithState(shouldBeMuted)
    .catch(async (error) => {
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
        await video.play();
        return shouldBeMuted;
      };

      try {
        const wasMuted = await playWithState(true);
        if (wasMuted) {
          video.muted = false;
          applyTrackVolume(track, clipState);

          try {
            await waitForTrackReady(video);
            await video.play();
            return false;
          } catch {
            // Fall through to native retry path.
          }
        }

        return wasMuted;
      } catch (fallbackError) {
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
      if (wasMuted && !shouldBeMuted) {
        video.muted = false;
        applyTrackVolume(track, clipState);
      } else {
        applyTrackVolume(track, clipState);
      }

      return true;
    })
    .catch((error) => {
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

function startTransportWithState() {
  if (!tracks.some((track) => track.source)) {
    return;
  }

  tracks.forEach((track) => {
    track.lastStep = -1;
    track.nextTriggerAt = 0;
    track.stepMs = 0;
  });

  tracks.forEach((track) => {
    const video = getTrackVideo(track);
    if (!video || !track.source) {
      return;
    }

    if (track.source?.mediaUrl && video.src !== track.source.mediaUrl) {
      video.src = track.source.mediaUrl;
      video.load();
    }
    safeSetCurrentTime(video, track);
    setupTrackAudio(track, video);
    applyTrackVolume(track, track);
  });

  const now = performance.now();
  const startAt = now;
  const beatMs = 60000 / resolvePreferredBpm();
  const barMs = beatMs * 4;
  transport = {
    active: true,
    bpm: resolvePreferredBpm(),
    beatMs,
    barMs,
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

function stopTransport(resetVideos = true, bumpToken = true) {
  if (bumpToken && Number.isFinite(startTransport.bootToken)) {
    startTransport.bootToken += 1;
  }
  startTransport.runningPromise = null;
  const shouldResetVideos = !!resetVideos;

  if (arrangementPlayheadUpdateFrame !== null) {
    window.cancelAnimationFrame(arrangementPlayheadUpdateFrame);
    arrangementPlayheadUpdateFrame = null;
  }

  if (transport?.frameId) {
    cancelAnimationFrame(transport.frameId);
    transport.frameId = null;
  }

  if (transport && shouldResetVideos) {
    tracks.forEach((track) => {
      const video = getTrackVideo(track);
      if (!video) {
        return;
      }

      if (!video.pause || typeof video.pause !== "function") {
        return;
      }

      video.pause();
      safeSetCurrentTime(video, track);
    });
  }

  if (Number.isFinite(arrangementPlayheadStep)) {
    getArrangementCellsByStep(arrangementPlayheadStep).forEach((cell) => {
      cell.classList.remove("playing");
    });
  }
  transport = null;
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
  const beatMs = transport.beatMs || 60000 / transport.bpm;
  const barMs = transport.barMs || beatMs * 4;

  const beatCatchupLimit = Math.max(
    0,
    Math.floor((now - transport.nextBeatAt) / beatMs) + 1,
  );
  for (let beatCatchupCount = 0; beatCatchupCount < beatCatchupLimit; beatCatchupCount += 1) {
    if (beatCatchupCount >= MAX_BEAT_CATCHUP_PER_FRAME) {
      break;
    }

    const beat = transport.beatIndex % 4;
    renderBeat(beat);
    playMetronome(beat);
    transport.beatIndex += 1;
    transport.nextBeatAt += beatMs;
  }

  if (transport.nextBeatAt <= now) {
    const missedBeats = Math.floor((now - transport.nextBeatAt) / beatMs) + 1;
    if (missedBeats > 0) {
      transport.nextBeatAt += missedBeats * beatMs;
    }
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
    const canPlay = isTrackAudibleInMix(track);
    let triggerBudget = MAX_TRACK_TRIGGER_BURST_PER_FRAME;

    while (now >= track.nextTriggerAt) {
      if (triggerBudget <= 0) {
        break;
      }

      triggerBudget -= 1;
      if (!canPlay) {
        track.nextTriggerAt += track.stepMs;
        continue;
      }

      triggerTrack(track, track.arrangementClip ?? track);
      track.nextTriggerAt += track.stepMs;
    }

    if (track.nextTriggerAt <= now) {
      const missedTriggers = Math.floor((now - track.nextTriggerAt) / track.stepMs) + 1;
      if (missedTriggers > 0) {
        track.nextTriggerAt += missedTriggers * track.stepMs;
      }
    }
  });

  transport.frameId = requestAnimationFrame(tickTransport);
}

function triggerTrack(track, clip = track) {
  const video = getTrackVideo(track);
  const cell = getTrackCell(track);
  if (!video || !cell) {
    return;
  }

  if (clip.source?.mediaUrl && video.src !== clip.source.mediaUrl) {
    video.src = clip.source.mediaUrl;
    video.load();
  }

  safeSetCurrentTime(video, clip);
  setupTrackAudio(track, video);
  applyTrackVolume(track, clip);
  applyTrackFx(track, clip);
  applyVideoFx(track, clip);
  applyTrackBlend(track, clip);
  applyTrackOpacity(track, clip);
  applyTrackPitchAndSpeed(track, clip);
  void attemptVideoPlay(video, track, clip);

  cell.classList.remove("triggered");
  window.requestAnimationFrame(() => cell.classList.add("triggered"));
}

function previewTrack(track) {
  if (!track.source || transport?.active) {
    return;
  }
  if (!isTrackAudibleInMix(track)) {
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
  const beatIndex = Number.isFinite(Number(beat)) ? Math.floor(Number(beat)) : 0;
  const nextBeatIndex = ((beatIndex % 4) + 4) % 4;
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

function playMetronome(beat) {
  if (masterMuted || !audioContext) {
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
  oscillator.frequency.value = beat === 0 ? 1320 : 880;
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
  const maxDurationValue = String(Math.max(1, video.duration - 1));
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

  const safeStart = safeStartTime(track, video);
  if (!Number.isFinite(safeStart)) {
    return;
  }

  if (track.startTime !== safeStart) {
    track.startTime = safeStart;
    if (track.arrangementClip) {
      track.arrangementClip.startTime = safeStart;
    }
    syncStartControls(track);
  }

  safeSetCurrentTime(video, track.arrangementClip ?? track);
}

function syncStartControls(track) {
  getTrackControls(track, "startTime").forEach((range) => {
    range.value = String(track.startTime);
  });

  getTrackControls(track, "startNumber").forEach((number) => {
    number.value = track.startTime.toFixed(1);
  });
}

function applyArrangementClipControlValue(track, controlName, value) {
  const clip = track?.arrangementClip;
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

function applyTrackVolume(track, state = track) {
  const isMuted = !!state.muted;
  const volume = clamp(Number(state.volume), 0, 1);
  const hasLiveAudioGraph =
    !!track.audio && !webAudioDisabled && audioContext?.state === "running" && track.audio.mediaElement;

  if (!hasLiveAudioGraph && track.audio) {
    disposeTrackAudio(track);
  }

  const video = getTrackVideo(track);
  if (track.audio?.output && hasLiveAudioGraph && !almostEqual(track.audio.output.gain.value, isMuted ? 0 : volume)) {
    track.audio.output.gain.value = isMuted ? 0 : volume;
  }

  if (video) {
    if (video.muted !== isMuted) {
      video.muted = isMuted;
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

  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return Math.max(0, track.startTime);
  }

  return Math.min(track.startTime, Math.max(video.duration - 0.2, 0));
}

function updateTrackTriggerGrid(startAt = performance.now()) {
  if (!transport) {
    return;
  }

  const beatMs = transport?.beatMs || 60000 / transport.bpm;
  const barMs = transport?.barMs || beatMs * 4;
  tracks.forEach((track) => {
    track.arrangementClip = null;
    track.stepMs = barMs / normalizeRetriggersPerBar(track.retriggersPerBar);
    track.nextTriggerAt = startAt;
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

  if (!track.source) {
    selectArrangementStep(stepIndex);
    setStatus(`Bar ${stepIndex + 1} selected`);
    return;
  }

  arrangement.clips[stepIndex][track.id] = captureTrackClip(track);
  refreshArrangementHasClipsState();
  selectArrangementStep(stepIndex);
  setStatus(`${track.name}: placed in ${stepIndex + 1}`);
  if (window.freemixRender?.updateArrangementGrid) {
    if (typeof window.freemixRender.updateArrangementCell === "function") {
      window.freemixRender.updateArrangementCell(track, stepIndex);
    } else {
      window.freemixRender.updateArrangementGrid();
    }
    window.freemixRender.updateArrangementPlayhead?.();
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
    if (window.freemixRender?.updateArrangementStepLabels) {
      window.freemixRender.updateArrangementStepLabels();
    } else {
      window.freemixRender.updateArrangementGrid();
    }
    window.freemixRender?.updateTransportRow?.();
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
  refreshArrangementHasClipsState();

  if (
    transport?.active &&
    arrangement.enabled &&
    hasArrangementClips() &&
    transport.arrangementStep === targetStep
  ) {
    updateArrangementStep(targetStep, performance.now(), true);
  }

  tracks.forEach((track) => {
    if (window.freemixRender?.updateArrangementCell) {
      window.freemixRender.updateArrangementCell(track, targetStep);
    }
  });
  setStatus(`Section ${arrangementCopySourceStep + 1} pasted to ${targetStep + 1}`);

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementPlayhead?.();
    markAppStateDirty();
    return;
  }

  renderWorkstation();
  markAppStateDirty();
}

function copyCurrentArrangementSectionToAll() {
  const sourceStepIndex = arrangement.step;
  const sourceStep = arrangement.clips?.[sourceStepIndex];
  if (!sourceStep || Object.keys(sourceStep).length === 0) {
    setStatus("Choose a source section first");
    return;
  }

  const destinationSteps = [];
  for (let index = 0; index < arrangement.clips.length; index += 1) {
    if (index === sourceStepIndex) {
      continue;
    }

    const step = arrangement.clips[index];
    if (!step || Object.keys(step).length > 0) {
      continue;
    }

    arrangement.clips[index] = cloneArrangementStep(sourceStep);
    destinationSteps.push(index);
  }

  if (!destinationSteps.length) {
    setStatus("No empty sections to fill");
    return;
  }

  refreshArrangementHasClipsState();

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
  arrangementCopyMode = false;
  arrangementCopySourceStep = null;
  arrangement = createInitialArrangement();
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
window.copyCurrentArrangementSectionToAll = copyCurrentArrangementSectionToAll;
window.freemixSyncArrangementTrackHeights = syncArrangementTrackHeights;

function updateArrangementStepCount(event) {
  const nextLength = Number(event.target.value);
  if (!Number.isInteger(nextLength) || !ARRANGEMENT_STEP_OPTIONS.includes(nextLength)) {
    return;
  }

  const previousArrangement = arrangement;
  const wasTransportActive = !!transport?.active;
  if (wasTransportActive) {
    stopTransport(false);
  }
  arrangementCopyMode = false;
  arrangementCopySourceStep = null;
  arrangementStepCount = nextLength;
  arrangement = createInitialArrangement(nextLength);
  if (previousArrangement?.clips) {
    for (let index = 0; index < Math.min(previousArrangement.clips.length, arrangement.clips.length); index += 1) {
      arrangement.clips[index] = previousArrangement.clips[index] || {};
    }
  }
  refreshArrangementHasClipsState();

  const previousStep = Number(previousArrangement?.step) || 0;
  arrangement.step = Math.min(previousStep, nextLength - 1);

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
    window.freemixRender.updateSourceStrip?.();
    window.freemixRender.updateTransportRow?.();
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
  const beatMs = transport?.beatMs || 60000 / transport.bpm;
  const barMs = beatMs * 4;
  const step = arrangement.clips[stepIndex];

  tracks.forEach((track) => {
    const clip = step[track.id] ?? null;
    track.arrangementClip = clip;
    track.stepMs = clip ? barMs / normalizeRetriggersPerBar(clip.retriggersPerBar) : 0;
    track.nextTriggerAt = barStartAt;
    track.lastStep = -1;
  });

  scheduleArrangementPlayheadUpdate();
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
  const currentStep = Number.isFinite(Number(arrangement.step)) ? Number(arrangement.step) : 0;
  if (!playerPanel) {
    arrangementPlayheadStep = currentStep;
    return;
  }

  if (arrangementPlayheadStep === currentStep) {
    return;
  }

  if (Number.isFinite(arrangementPlayheadStep)) {
    getArrangementCellsByStep(arrangementPlayheadStep).forEach((cell) => {
      cell.classList.remove("playing");
    });
  }

  getArrangementCellsByStep(currentStep).forEach((cell) => {
    cell.classList.add("playing");
  });
  arrangementPlayheadStep = currentStep;
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

function captureTrackClip(track) {
  return {
    source: track.source,
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

  if (normalizedQuery.length < SEARCH_QUERY_MIN_LENGTH) {
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

    const results = rankAndFilterResults(docs, track.durationFilter, query);
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

  const sorted = results
    .map((result) => ({
      ...result,
      _searchScore: searchRelevance(result, query),
    }))
    .filter((result) => {
      if (filterKey === "any") {
        return true;
      }

      return result.durationSeconds >= filter.min && result.durationSeconds < filter.max;
    })
    .sort((a, b) => {
      if (b._searchScore !== a._searchScore) {
        return b._searchScore - a._searchScore;
      }

      if (b.downloads !== a.downloads) {
        return b.downloads - a.downloads;
      }

      return a.durationSeconds - b.durationSeconds || a.title.localeCompare(b.title);
    })
    .map(({ _searchScore, ...result }) => result);

  return diversifyRankedSearchResults(sorted, SEARCH_RESULTS_LIMIT);
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
  setStatus(`${track.name}: loading`);
  renderTrackResultsMessage(track, "Loading media...");

  try {
    const source = await fetchPlayableSource(result);
    track.source = source;
    track.startTime = 0;
    track.lastStep = -1;
    selectedSource = getFirstLoadedTrackSource() || source;
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
    role: "Track",
    color: TRACK_COLORS[paletteIndex % TRACK_COLORS.length],
    id: `track-${paletteIndex + 1}`,
    showAdvanced: false,
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
