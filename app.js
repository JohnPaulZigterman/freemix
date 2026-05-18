const playerPanel = document.querySelector("#playerPanel");
const statusPill = document.querySelector("#statusPill");

const IA_SEARCH_URL = "https://archive.org/advancedsearch.php";
const IA_METADATA_URL = "https://archive.org/metadata";
const IA_DOWNLOAD_URL = "https://archive.org/download";
const LOCAL_MEDIA_PROXY_ORIGIN = "http://localhost:4200";
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
const ARRANGEMENT_START_PREROLL_MS = 900;
const ARRANGEMENT_PREROLL_REVEAL_ADVANCE_MS = 0;
const ARRANGEMENT_PREROLL_REVEAL_TIMER_LEAD_MS = 0;
const ARRANGEMENT_PREROLL_ADVANCE_CONFIRM_MS = 260;
const ARRANGEMENT_FINAL_PREROLL_LEAD_MS = 720;
const ARRANGEMENT_COLD_START_BURN_IN_MS = 1600;
const ARRANGEMENT_COLD_START_BURN_IN_MIN_FRAMES = 8;
const ARRANGEMENT_STEP_LOOKAHEAD_MS = 8000;
const ARRANGEMENT_STEP_LOOKAHEAD_MIN_MS = 220;
const ARRANGEMENT_LOOKAHEAD_RETRY_DELAY_MS = 90;
const ARRANGEMENT_LOOKAHEAD_MAX_RETRIES = 2;
const TRANSPORT_CLOCK_CORRECTION_MAX_WINDOW_MS = 220;
const TRANSPORT_CLOCK_CORRECTION_MIN_WINDOW_MS = 42;
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
    "timingMode",
    "pianoSnap",
    "pianoRoot",
    "pianoNote",
    "pianoVelocity",
    "pianoDuration",
    "pianoDeleteNote",
    "pianoDuplicateNote",
    "pianoQuantizeNotes",
    "automation",
    "automationTarget",
    "automationEnable",
    "automationInterpolation",
    "automationPoint",
    "automationReset",
    "automationDeletePoint",
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
const CLIP_TIMING_MODES = Object.freeze({
  retrigger: "retrigger",
  pianoRoll: "pianoRoll",
});
const CLIP_TIMING_MODE_LABELS = Object.freeze({
  [CLIP_TIMING_MODES.retrigger]: "Retrigger",
  [CLIP_TIMING_MODES.pianoRoll]: "Piano Roll",
});
const CLIP_TIMING_MODE_OPTIONS = Object.freeze(
  Object.entries(CLIP_TIMING_MODE_LABELS).map(([value, label]) => ({ value, label })),
);
const DEFAULT_CLIP_TIMING_MODE = CLIP_TIMING_MODES.retrigger;
const PIANO_ROLL_MIN_PITCH_SEMITONES = -12;
const PIANO_ROLL_MAX_PITCH_SEMITONES = 12;
const PIANO_ROLL_MIN_NOTE_BEATS = 0.0625;
const PIANO_ROLL_MAX_NOTE_BEATS = 64;
const PIANO_ROLL_MAX_START_BEAT = 512;
const PIANO_ROLL_MIN_ANCHOR_OFFSET = -120;
const PIANO_ROLL_MAX_ANCHOR_OFFSET = 120;
const DEFAULT_PIANO_ROLL_SNAP = "1/16";
const PIANO_ROLL_SNAP_OPTIONS = Object.freeze([
  { value: "1/4", label: "1/4", stepsPerBeat: 1 },
  { value: "1/8", label: "1/8", stepsPerBeat: 2 },
  { value: "1/16", label: "1/16", stepsPerBeat: 4 },
  { value: "triplet", label: "Triplet", stepsPerBeat: 3 },
]);
const DEFAULT_PIANO_ROOT_NOTE = "C";
const PIANO_ROOT_NOTE_OPTIONS = Object.freeze([
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
].map((note, index) => ({ value: note, label: note, index })));
const CLIP_AUTOMATION_POINT_MAX_BEAT = 512;
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
const SOURCE_METADATA_CACHE_STORAGE_KEY = "freemix.sourceMetadataCache.v2";
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
  "textTrackVisible",
  "drumTrackVisible",
  "textTrackMuted",
  "textTrackSolo",
  "drumTrackMuted",
  "drumTrackSolo",
  "tracks",
  "arrangement",
  "trackSearchRequestCounter",
  "userOnboarding",
]);
const APP_STATE_PROXY_DIRTY_KEYS = new Set([
  "arrangementStepCount",
  "textTrackVisible",
  "drumTrackVisible",
  "textTrackMuted",
  "textTrackSolo",
  "drumTrackMuted",
  "drumTrackSolo",
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
const TRACK_COLOR_LABELS = Object.freeze({
  green: "Green",
  amber: "Amber",
  blue: "Blue",
  red: "Red",
});
const TRACK_HEIGHT_MODES = Object.freeze({
  normal: "Normal",
  compact: "Compact",
  tall: "Tall",
});
const TRACK_CAPTURE_PRESETS = Object.freeze({
  current: "Current",
  dry: "Dry FX",
  muted: "Muted",
  performance: "Performance",
});
const TRACK_MANAGEMENT_CONTROLS = Object.freeze(
  new Set([
    "advanced",
    "capturePreset",
    "clearTrackLane",
    "collapsed",
    "duplicateTrack",
    "freezeTrack",
    "heightMode",
    "lockTrack",
    "moveTrackDown",
    "moveTrackUp",
    "muted",
    "removeTrack",
    "solo",
    "timingNudgeMs",
    "trackColor",
  ]),
);
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
const CLEAN_VISUAL_REVEAL_TIMEOUT_MS = 320;
const MEDIA_SLICE_DEFAULT_DURATION_SECONDS = 24;
const MEDIA_SLICE_MIN_DURATION_SECONDS = 8;
const MEDIA_SLICE_MAX_DURATION_SECONDS = 180;
const FX_CONTROLS = [
  { key: "eqLow", label: "EQ Low", min: -12, max: 12, step: 1 },
  { key: "eqMid", label: "EQ Mid", min: -12, max: 12, step: 1 },
  { key: "eqHigh", label: "EQ High", min: -12, max: 12, step: 1 },
  { key: "tube", label: "Tube", min: 0, max: 1, step: 0.01 },
  { key: "delay", label: "Delay", min: 0, max: 1, step: 0.01 },
  { key: "reverb", label: "Reverb", min: 0, max: 1, step: 0.01 },
];
const FX_CONTROL_INDEX = Object.freeze(Object.fromEntries(FX_CONTROLS.map((entry) => [entry.key, entry])));
const CLIP_AUTOMATION_TARGETS = Object.freeze({
  volume: { type: "number", min: 0, max: 1, defaultValue: 0.55, path: ["volume"] },
  opacity: { type: "number", min: 0, max: 1, defaultValue: 1, path: ["opacity"] },
  speed: { type: "number", min: 0.5, max: 2, defaultValue: 1, path: ["speed"] },
  pitch: { type: "number", min: -12, max: 12, defaultValue: 0, path: ["pitch"] },
  startTime: { type: "number", min: 0, max: 36_000, defaultValue: 0, path: ["startTime"] },
  blendMode: {
    type: "enum",
    values: Object.keys(BLEND_MODES),
    defaultValue: TRACK_BLEND_DEFAULTS[0],
    interpolation: "hold",
    path: ["blendMode"],
  },
  "fx.eqLow": { type: "number", min: -12, max: 12, defaultValue: 0, path: ["fx", "eqLow"] },
  "fx.eqMid": { type: "number", min: -12, max: 12, defaultValue: 0, path: ["fx", "eqMid"] },
  "fx.eqHigh": { type: "number", min: -12, max: 12, defaultValue: 0, path: ["fx", "eqHigh"] },
  "fx.tube": { type: "number", min: 0, max: 1, defaultValue: 0, path: ["fx", "tube"] },
  "fx.delay": { type: "number", min: 0, max: 1, defaultValue: 0, path: ["fx", "delay"] },
  "fx.reverb": { type: "number", min: 0, max: 1, defaultValue: 0, path: ["fx", "reverb"] },
});
const CLIP_AUTOMATION_TARGET_OPTIONS = Object.freeze(
  Object.keys(CLIP_AUTOMATION_TARGETS).map((value) => ({
    value,
    label: value.startsWith("fx.") ? `FX ${value.slice(3)}` : value,
  })),
);
const DEFAULT_CLIP_AUTOMATION_TARGET = CLIP_AUTOMATION_TARGET_OPTIONS[0]?.value || "volume";
const TRACK_MEDIA_STATUS_LABELS = Object.freeze({
  "audio-only": "Audio only",
  "clean-frame-ready": "Clean frame",
  "cors-limited": "CORS limited",
  empty: "Empty",
  failed: "Failed",
  bounced: "Bounced",
  "fx-routed": "FX routed",
  "fx-unavailable": "FX unavailable",
  loading: "Loading",
  playing: "Playing",
  prerolling: "Prerolling",
  ready: "Ready",
  stopped: "Stopped",
  unsupported: "Unsupported",
  "video-only": "Video only",
});
const TRACK_MEDIA_STATUSES = Object.freeze(new Set(Object.keys(TRACK_MEDIA_STATUS_LABELS)));
const TRACK_MEDIA_READINESS_LABELS = Object.freeze({
  "audio-only": "Audio only",
  empty: "No media",
  failed: "Media failed",
  bounced: "Bounced render",
  "fx-ready": "FX ready",
  limited: "Limited route",
  loading: "Loading media",
  playing: "Playing",
  ready: "Ready",
  stopped: "Stopped",
  unsupported: "Unsupported media",
  "video-only": "Video only",
});
const TRACK_AUDIO_ROUTE_LABELS = Object.freeze({
  "capture-failed": "Capture failed",
  "capture-fx": "Capture FX",
  empty: "No audio",
  failed: "Audio failed",
  "fx-unavailable": "FX unavailable",
  "native-audio": "Native audio",
  unrouted: "Unrouted",
  waiting: "Preparing FX",
  webaudio: "WebAudio FX",
});
const TRACK_AUDIO_ROUTE_READINESS = Object.freeze({
  "capture-failed": "failed",
  "capture-fx": "fx-ready",
  empty: "empty",
  failed: "failed",
  "fx-unavailable": "limited",
  "native-audio": "limited",
  unrouted: "limited",
  waiting: "loading",
  webaudio: "fx-ready",
});
const TRACK_MEDIA_STATUS_READINESS = Object.freeze({
  "audio-only": "audio-only",
  "clean-frame-ready": "ready",
  "cors-limited": "limited",
  empty: "empty",
  failed: "failed",
  bounced: "ready",
  "fx-routed": "fx-ready",
  "fx-unavailable": "limited",
  loading: "loading",
  playing: "playing",
  prerolling: "loading",
  ready: "ready",
  stopped: "stopped",
  unsupported: "unsupported",
  "video-only": "video-only",
});
const PLAYBACK_PHASES = Object.freeze({
  idle: "idle",
  loading: "loading",
  cueing: "cueing",
  prerolling: "prerolling",
  ready: "ready",
  playing: "playing",
  stopped: "stopped",
  failed: "failed",
});
const CLIP_STATE_SCHEMA_VERSION = 3;
const CLIP_CONTRACT_VERSION = 1;
const ARRANGEMENT_CLIP_KINDS = Object.freeze({
  av: "av",
  text: "text",
  drum: "drum",
});
const ARRANGEMENT_CLIP_KIND_LABELS = Object.freeze({
  [ARRANGEMENT_CLIP_KINDS.av]: "A/V",
  [ARRANGEMENT_CLIP_KINDS.text]: "TEXT",
  [ARRANGEMENT_CLIP_KINDS.drum]: "DRUM",
});
const ARRANGEMENT_CLIP_READINESS = Object.freeze({
  empty: { status: "empty", label: "Empty", detail: "No clip data" },
  ready: { status: "ready", label: "Ready", detail: "Clip has playable data" },
  "missing-source": { status: "missing-source", label: "Missing source", detail: "Clip has no media source" },
  bounced: { status: "bounced", label: "Bounced", detail: "Track is using rendered media" },
  stale: { status: "stale", label: "Needs rebounce", detail: "Live settings changed after bounce" },
});
const sourceMetadataCache = new Map();
const sourceMetadataInflight = new Map();
const mediaElementSourceNodes = new WeakMap();
const mediaSliceReadyCache = new Set();
const mediaSliceFailedCache = new Set();
const mediaSliceWarmRequests = new Map();

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
      control: "timingMode",
      type: "select",
      label: "Mode",
      icon: "M",
      tooltip: "Choose retrigger or piano-roll timing for this clip",
      fieldClass: "timing-mode-field",
      options: CLIP_TIMING_MODE_OPTIONS,
    },
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
const SESSION_SCHEMA_VERSION = 2;
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
const TEXT_TRACK_ID = "__text";
const TEXT_TRACK_LABEL = "TEXT";
const DRUM_TRACK_ID = "__drums";
const DRUM_TRACK_LABEL = "DRUM";
const TEXT_FONT_OPTIONS = Object.freeze([
  { value: "Impact, Haettenschweiler, 'Arial Black', sans-serif", label: "Impact" },
  { value: "Georgia, 'Times New Roman', serif", label: "Serif" },
  { value: "'Trebuchet MS', Verdana, sans-serif", label: "Groove" },
  { value: "'Courier New', Courier, monospace", label: "Mono" },
  { value: "'Arial Black', Arial, sans-serif", label: "Block" },
  { value: "'Brush Script MT', cursive", label: "Script" },
  { value: "'Press Start 2P', 'Pixel Emulator', 'Small Fonts', 'Courier New', monospace", label: "8 Bit" },
  { value: "'VT323', 'Perfect DOS VGA 437', 'Px437 IBM VGA8', 'Courier New', monospace", label: "16 Bit" },
  { value: "'Akbar', 'Simpsonfont', 'Comic Sans MS', 'Cooper Black', 'Arial Black', cursive", label: "Springfield Bootleg" },
  { value: "'Playbill', 'Rockwell Extra Bold', 'Cooper Black', 'Georgia', serif", label: "Space Cowboy Bootleg" },
  { value: "'Algerian', 'Wide Latin', 'Rockwell Extra Bold', 'Arial Black', serif", label: "Bootleg Poster" },
]);
const TEXT_ALIGN_OPTIONS = Object.freeze(["left", "center", "right"]);
const TEXT_DEFAULT_COLOR = "#f4f1df";
const TEXT_DEFAULT_STROKE_COLOR = "#050607";
const TEXT_DEFAULT_SHADOW_COLOR = "#000000";
const DRUM_KITS = Object.freeze(["808", "909", "707"]);
const DRUM_DEFAULT_KIT = "808";
const DRUM_DEFAULT_VELOCITY = 0.85;
const DRUM_VOICES = Object.freeze([
  { id: "cowbell", label: "Cowbell" },
  { id: "crashRide", label: "Crash Ride" },
  { id: "openHat", label: "Open Hat" },
  { id: "closedHat", label: "Closed Hat" },
  { id: "hiTom", label: "Hi Tom" },
  { id: "loTom", label: "Lo Tom" },
  { id: "clap", label: "Clap" },
  { id: "snare", label: "Snare" },
  { id: "sidestick", label: "Sidestick" },
  { id: "kick", label: "Kick" },
]);
const DRUM_VOICE_ALIASES = Object.freeze({
  closedHat: ["hat"],
  loTom: ["tom"],
});

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
  const existingSceneColors = Array.isArray(arrangementState.sceneColors) ? arrangementState.sceneColors : [];
  arrangementState.clips = existingClips
    .slice(0, stepCount)
    .map((step, stepIndex) => {
      if (!step || typeof step !== "object" || Array.isArray(step)) {
        return {};
      }

      return Object.fromEntries(
        Object.entries(step)
          .filter(([, clip]) => clip && typeof clip === "object" && !Array.isArray(clip))
          .map(([trackId, clip]) => [
            trackId,
            normalizeClipState(clip, { colorIndex: existingSceneColors[stepIndex] }),
          ]),
      );
    });
  while (arrangementState.clips.length < stepCount) {
    arrangementState.clips.push({});
  }

  const existingTextClips = Array.isArray(arrangementState.textClips) ? arrangementState.textClips : [];
  arrangementState.textClips = existingTextClips.slice(0, stepCount).map(normalizeTextClip);
  while (arrangementState.textClips.length < stepCount) {
    arrangementState.textClips.push(null);
  }

  const existingDrumClips = Array.isArray(arrangementState.drumClips) ? arrangementState.drumClips : [];
  const drumPatternStepCount = Math.max(1, Math.floor(Number(resolvePreferredTimeSignature().beatsPerBar) || 4) * 4);
  arrangementState.drumClips = existingDrumClips
    .slice(0, stepCount)
    .map((clip) => normalizeDrumClip(clip, drumPatternStepCount));
  while (arrangementState.drumClips.length < stepCount) {
    arrangementState.drumClips.push(null);
  }

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
appState.textTrackVisible = appState.textTrackVisible !== false;
appState.drumTrackVisible = appState.drumTrackVisible !== false;
appState.textTrackMuted = !!appState.textTrackMuted;
appState.textTrackSolo = !!appState.textTrackSolo;
appState.drumTrackMuted = !!appState.drumTrackMuted;
appState.drumTrackSolo = !!appState.drumTrackSolo;

const tracks = appState.tracks;
let arrangement = appState.arrangement;
let arrangementPrerollRevealTimer = null;
let arrangementLookaheadRevealTimer = null;
let arrangementLookaheadPrepareKey = null;
let arrangementLookaheadPreparePromise = null;
const arrangementLookaheadRevealTimers = new Map();
const arrangementLookaheadPrepareKeys = new Set();
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
  track.locked = !!track.locked;
  track.frozen = !!track.frozen && !!track.frozenBounce?.url;
  track.color = TRACK_COLORS.includes(track.color) ? track.color : TRACK_COLORS[0];
  track.heightMode = Object.prototype.hasOwnProperty.call(TRACK_HEIGHT_MODES, track.heightMode) ? track.heightMode : "normal";
  track.capturePreset = Object.prototype.hasOwnProperty.call(TRACK_CAPTURE_PRESETS, track.capturePreset) ? track.capturePreset : "current";
  const timingNudge = Number(track.timingNudgeMs);
  track.timingNudgeMs = Number.isFinite(timingNudge) ? clamp(timingNudge, -250, 250) : 0;
  track.solo = !!track.solo;
  track.muted = !!track.muted;

  track.startTime = Number.isFinite(Number(track.startTime)) ? Number(track.startTime) : 0;
  track.volume = Number.isFinite(Number(track.volume)) ? Number(track.volume) : 0.55;
  track.opacity = Number.isFinite(Number(track.opacity)) ? clamp(track.opacity, 0, 1) : 1;
  track.speed = Number.isFinite(Number(track.speed)) ? clamp(track.speed, 0.5, 2) : 1;
  track.pitch = Number.isFinite(Number(track.pitch)) ? clamp(track.pitch, -12, 12) : 0;

  track.timingMode = normalizeClipTimingMode(track.timingMode);
  track.pianoSnap = normalizePianoRollSnap(track.pianoSnap);
  track.pianoRoot = normalizePianoRootNote(track.pianoRoot);
  track.retriggersPerBar = normalizeRetriggersPerBar(track.retriggersPerBar);
  track.notes = normalizePianoRollNotes(track.notes);
  track.automation = normalizeClipAutomation(track.automation);
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

function createTextField(overrides = {}) {
  const fieldId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `text-${crypto.randomUUID()}`
      : `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return normalizeTextField({
    id: fieldId,
    text: "TEXT",
    font: TEXT_FONT_OPTIONS[0].value,
    size: 28,
    color: TEXT_DEFAULT_COLOR,
    bold: true,
    italic: false,
    underline: false,
    stroke: true,
    strokeWidth: 2,
    strokeColor: TEXT_DEFAULT_STROKE_COLOR,
    shadow: true,
    shadowColor: TEXT_DEFAULT_SHADOW_COLOR,
    shadowBlur: 8,
    shadowX: 3,
    shadowY: 3,
    align: "center",
    x: 50,
    y: 50,
    opacity: 1,
    ...overrides,
  });
}

function normalizeTextField(field, index = 0) {
  const source = field && typeof field === "object" && !Array.isArray(field) ? field : {};
  const font = TEXT_FONT_OPTIONS.some((option) => option.value === source.font)
    ? source.font
    : TEXT_FONT_OPTIONS[0].value;
  const align = TEXT_ALIGN_OPTIONS.includes(source.align) ? source.align : "center";
  return {
    id: typeof source.id === "string" && source.id ? source.id : `text-field-${index + 1}`,
    text: typeof source.text === "string" ? source.text.slice(0, 240) : "",
    font,
    size: clamp(Number(source.size), 10, 72),
    color: typeof source.color === "string" && source.color ? source.color : TEXT_DEFAULT_COLOR,
    bold: typeof source.bold === "boolean" ? source.bold : true,
    italic: !!source.italic,
    underline: !!source.underline,
    stroke: typeof source.stroke === "boolean" ? source.stroke : true,
    strokeWidth: clamp(Number(source.strokeWidth), 0, 8),
    strokeColor: typeof source.strokeColor === "string" && source.strokeColor ? source.strokeColor : TEXT_DEFAULT_STROKE_COLOR,
    shadow: typeof source.shadow === "boolean" ? source.shadow : true,
    shadowColor: typeof source.shadowColor === "string" && source.shadowColor ? source.shadowColor : TEXT_DEFAULT_SHADOW_COLOR,
    shadowBlur: clamp(Number(source.shadowBlur), 0, 24),
    shadowX: clamp(Number(source.shadowX), -24, 24),
    shadowY: clamp(Number(source.shadowY), -24, 24),
    align,
    x: clamp(Number(source.x), 0, 100),
    y: clamp(Number(source.y), 0, 100),
    opacity: clamp(Number(source.opacity), 0, 1),
  };
}

function normalizeTextClip(clip) {
  if (!clip || typeof clip !== "object" || Array.isArray(clip)) {
    return null;
  }

  const rawFields = Array.isArray(clip.fields)
    ? clip.fields
    : typeof clip.text === "string"
      ? [{ ...clip, id: "text-field-1" }]
      : [];
  const fields = rawFields.map(normalizeTextField).filter((field) => field.text || rawFields.length === 1);
  if (!fields.length) {
    return null;
  }

  const selectedFieldId = fields.some((field) => field.id === clip.selectedFieldId)
    ? clip.selectedFieldId
    : fields[0].id;
  return {
    fields,
    selectedFieldId,
  };
}

function createTextClip(overrides = {}) {
  const field = createTextField(overrides.field || {});
  return normalizeTextClip({
    fields: [field],
    selectedFieldId: field.id,
    ...overrides,
  });
}

function getArrangementTextClip(stepIndex = arrangement?.step) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null || !arrangement?.textClips) {
    return null;
  }

  return normalizeTextClip(arrangement.textClips[resolvedStep]);
}

function setArrangementTextClip(stepIndex, textClip) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return false;
  }

  if (!Array.isArray(arrangement.textClips)) {
    arrangement.textClips = Array.from({ length: arrangement.clips?.length || arrangementStepCount }, () => null);
  }

  arrangement.textClips[resolvedStep] = normalizeTextClip(textClip);
  return true;
}

function ensureArrangementTextClip(stepIndex = arrangement?.step) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return null;
  }

  let clip = getArrangementTextClip(resolvedStep);
  if (!clip) {
    clip = createTextClip();
    setArrangementTextClip(resolvedStep, clip);
  }

  return clip;
}

function getSelectedTextField(stepIndex = arrangement?.step) {
  const clip = getArrangementTextClip(stepIndex);
  if (!clip?.fields?.length) {
    return null;
  }

  return clip.fields.find((field) => field.id === clip.selectedFieldId) || clip.fields[0];
}

function getDrumStepCount(targetTransport = null) {
  const beatsPerBar = targetTransport
    ? getTransportBeatsPerBar(targetTransport)
    : Number(resolvePreferredTimeSignature().beatsPerBar);
  return Math.max(1, Math.floor(Number(beatsPerBar) || 4) * 4);
}

function createDefaultDrumPattern(stepCount = getDrumStepCount()) {
  const steps = Math.max(1, Math.floor(Number(stepCount) || 16));
  const pattern = Object.fromEntries(DRUM_VOICES.map((voice) => [voice.id, Array.from({ length: steps }, () => 0)]));
  pattern.kick[0] = DRUM_DEFAULT_VELOCITY;
  if (steps > 8) {
    pattern.kick[Math.floor(steps / 2)] = DRUM_DEFAULT_VELOCITY;
  }
  if (steps > 4) {
    pattern.snare[Math.floor(steps / 4)] = DRUM_DEFAULT_VELOCITY;
  }
  if (steps > 2) {
    pattern.snare[Math.floor((steps * 3) / 4)] = DRUM_DEFAULT_VELOCITY;
  }
  pattern.closedHat = pattern.closedHat.map((_, index) => (index % 2 === 0 ? 0.72 : 0));
  return pattern;
}

function normalizeDrumVelocity(value) {
  if (value === true) {
    return 1;
  }
  if (value === false || value === null || typeof value === "undefined") {
    return 0;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? clamp(numericValue, 0, 1) : 0;
}

function normalizeDrumPattern(pattern, stepCount = getDrumStepCount()) {
  const steps = Math.max(1, Math.floor(Number(stepCount) || 16));
  const defaults = createDefaultDrumPattern(steps);
  const source = pattern && typeof pattern === "object" && !Array.isArray(pattern) ? pattern : {};
  return Object.fromEntries(
    DRUM_VOICES.map((voice) => {
      const aliasSteps = (DRUM_VOICE_ALIASES[voice.id] || [])
        .map((alias) => source[alias])
        .find((steps) => Array.isArray(steps));
      const rawSteps = Array.isArray(source[voice.id]) ? source[voice.id] : aliasSteps || defaults[voice.id];
      const normalizedSteps = Array.from({ length: steps }, (_, index) => normalizeDrumVelocity(rawSteps[index]));
      return [voice.id, normalizedSteps];
    }),
  );
}

function normalizeDrumClip(clip, stepCount = getDrumStepCount()) {
  if (!clip || typeof clip !== "object" || Array.isArray(clip)) {
    return null;
  }

  const volume = Number.isFinite(Number(clip.volume)) ? clamp(Number(clip.volume), 0, 1) : 0.8;
  return {
    kit: DRUM_KITS.includes(clip.kit) ? clip.kit : DRUM_DEFAULT_KIT,
    volume,
    pattern: normalizeDrumPattern(clip.pattern, stepCount),
  };
}

function createDrumClip(overrides = {}) {
  return normalizeDrumClip({
    kit: DRUM_DEFAULT_KIT,
    volume: 0.8,
    pattern: createDefaultDrumPattern(),
    ...overrides,
  });
}

function getArrangementDrumClip(stepIndex = arrangement?.step) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null || !arrangement?.drumClips) {
    return null;
  }

  return normalizeDrumClip(arrangement.drumClips[resolvedStep]);
}

function setArrangementDrumClip(stepIndex, drumClip) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return false;
  }

  if (!Array.isArray(arrangement.drumClips)) {
    arrangement.drumClips = Array.from({ length: arrangement.clips?.length || arrangementStepCount }, () => null);
  }

  arrangement.drumClips[resolvedStep] = normalizeDrumClip(drumClip);
  return true;
}

function ensureArrangementDrumClip(stepIndex = arrangement?.step) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return null;
  }

  let clip = getArrangementDrumClip(resolvedStep);
  if (!clip) {
    clip = createDrumClip();
    setArrangementDrumClip(resolvedStep, clip);
  }

  return clip;
}

function drumClipHasNotes(clip) {
  const drumClip = normalizeDrumClip(clip);
  return !!drumClip?.pattern && Object.values(drumClip.pattern).some((steps) => steps.some((velocity) => normalizeDrumVelocity(velocity) > 0));
}

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
let localMediaProxyAvailable = window.location?.protocol === "http:" || window.location?.protocol === "https:";
let localMediaProxyCheckPromise = null;
let arrangementPlayheadStep = -1;
let activeBeatLightIndex = -1;
let liveControlPersistTimer = null;
let arrangementPlayheadUpdateFrame = null;
let searchResultCachePersistTimer = null;
let sourceMetadataCachePersistTimer = null;
let arrangementClipboardStep = null;
let arrangementClipboardKind = null;
let arrangementClipboardClips = [];
let arrangementClipboardTextClip = null;
let arrangementClipboardTextClips = [];
let arrangementClipboardDrumClip = null;
let arrangementClipboardDrumClips = [];
let selectedArrangementClipKeys = new Set();
let selectedTextClipStep = null;
let selectedTextClipSteps = new Set();
let selectedDrumClipStep = null;
let selectedDrumClipSteps = new Set();
let selectedArrangementSceneStep = null;
let textToolbarCollapsed = false;
let drumToolbarCollapsed = false;
let textTrackVisible = appState.textTrackVisible !== false;
let drumTrackVisible = appState.drumTrackVisible !== false;
let textTrackMuted = !!appState.textTrackMuted;
let textTrackSolo = !!appState.textTrackSolo;
let drumTrackMuted = !!appState.drumTrackMuted;
let drumTrackSolo = !!appState.drumTrackSolo;
let drumMasterGain = null;
let drumLimiter = null;
let drumBusDrive = null;
let drumBusTone = null;
let drumBusAir = null;
let drumRenderedBuffers = new Map();
let drumRenderPromise = null;
let drumRenderedSampleRate = null;
let openHatTail = null;
let activeExportAudioDestination = null;
let drumTransportState = {
  stepIndex: null,
  lastPulse: -1,
  barStartAt: 0,
};
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
  return tracks.some((track) => !!track?.solo) ||
    (textTrackVisible && textTrackSolo) ||
    (drumTrackVisible && drumTrackSolo);
}

function isTextTrackActiveInMix() {
  if (!textTrackVisible || textTrackMuted) {
    return false;
  }

  return !hasSoloTracksEnabled() || textTrackSolo;
}

function isDrumTrackActiveInMix() {
  if (!drumTrackVisible || drumTrackMuted) {
    return false;
  }

  return !hasSoloTracksEnabled() || drumTrackSolo;
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
  if (!isBlackout) {
    track.__awaitingCleanVisualFrame = false;
  }
}

function holdTrackVisualUntilCleanFrame(track) {
  if (!track) {
    return;
  }

  track.__awaitingCleanVisualFrame = true;
  setTrackPlaybackPhase(track, PLAYBACK_PHASES.cueing, { mediaStatus: "prerolling" });
  setTrackBlackout(track, true);
}

function revealTrackCleanVisual(track) {
  if (!track) {
    return;
  }

  track.__awaitingCleanVisualFrame = false;
  setTrackPlaybackPhase(track, PLAYBACK_PHASES.ready, { mediaStatus: "clean-frame-ready" });
  setTrackBlackout(track, false);
}

function revealTrackAfterPresentedFrame(track, video, playbackToken = track?.__playbackToken) {
  if (!track || !video) {
    return Promise.resolve(false);
  }

  const tokenAtStart = Number.isFinite(playbackToken) ? playbackToken : track.__playbackToken;
  const currentTime = Number(video.currentTime);
  const minMediaTime = Number.isFinite(currentTime) ? Math.max(0, currentTime - 0.002) : null;
  return waitForPresentedVideoFrame(video, {
    minMediaTime,
    timeoutMs: CLEAN_VISUAL_REVEAL_TIMEOUT_MS,
  })
    .catch(() => null)
    .then(() => {
      if (Number.isFinite(tokenAtStart) && track.__playbackToken !== tokenAtStart) {
        return false;
      }

      revealTrackCleanVisual(track);
      if (!video.paused && !video.ended) {
        setTrackPlaybackPhase(track, PLAYBACK_PHASES.playing, { mediaStatus: "playing" });
      }
      return true;
    });
}

function cloneClipSource(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(source));
  } catch {
    return { ...source };
  }
}

function normalizeDurationFilterValue(value, fallback = "quick") {
  return DURATION_FILTERS[value] ? value : DURATION_FILTERS[fallback] ? fallback : "quick";
}

function normalizeBlendModeValue(value, fallback = TRACK_BLEND_DEFAULTS[0]) {
  return BLEND_MODE_OPTIONS.some(({ value: mode }) => mode === value)
    ? value
    : BLEND_MODE_OPTIONS.some(({ value: mode }) => mode === fallback)
      ? fallback
      : TRACK_BLEND_DEFAULTS[0];
}

function normalizeClipFx(rawFx = {}, fallbackFx = {}) {
  const sourceFx = rawFx && typeof rawFx === "object" && !Array.isArray(rawFx) ? rawFx : {};
  const fallback = fallbackFx && typeof fallbackFx === "object" && !Array.isArray(fallbackFx) ? fallbackFx : {};
  return Object.fromEntries(
    FX_CONTROLS.map((control) => {
      const rawValue = Number(sourceFx[control.key]);
      const fallbackValue = Number(fallback[control.key]);
      const nextValue = Number.isFinite(rawValue)
        ? rawValue
        : Number.isFinite(fallbackValue)
          ? fallbackValue
          : 0;
      return [control.key, clamp(nextValue, control.min, control.max)];
    }),
  );
}

function normalizeClipTimingMode(value, fallback = DEFAULT_CLIP_TIMING_MODE) {
  if (Object.values(CLIP_TIMING_MODES).includes(value)) {
    return value;
  }

  return Object.values(CLIP_TIMING_MODES).includes(fallback) ? fallback : DEFAULT_CLIP_TIMING_MODE;
}

function normalizePianoRollSnap(value, fallback = DEFAULT_PIANO_ROLL_SNAP) {
  const rawValue = String(value || "");
  if (PIANO_ROLL_SNAP_OPTIONS.some((option) => option.value === rawValue)) {
    return rawValue;
  }

  return PIANO_ROLL_SNAP_OPTIONS.some((option) => option.value === fallback)
    ? fallback
    : DEFAULT_PIANO_ROLL_SNAP;
}

function getPianoRollSnapDefinition(value = DEFAULT_PIANO_ROLL_SNAP) {
  const snapValue = normalizePianoRollSnap(value);
  return PIANO_ROLL_SNAP_OPTIONS.find((option) => option.value === snapValue) || PIANO_ROLL_SNAP_OPTIONS[2];
}

function normalizePianoRootNote(value, fallback = DEFAULT_PIANO_ROOT_NOTE) {
  const rawValue = String(value || "").trim().toUpperCase();
  const normalizedValue = rawValue.replace("♯", "#").replace("SHARP", "#");
  if (PIANO_ROOT_NOTE_OPTIONS.some((option) => option.value === normalizedValue)) {
    return normalizedValue;
  }

  return PIANO_ROOT_NOTE_OPTIONS.some((option) => option.value === fallback)
    ? fallback
    : DEFAULT_PIANO_ROOT_NOTE;
}

function getPianoRootNoteIndex(value = DEFAULT_PIANO_ROOT_NOTE) {
  const rootValue = normalizePianoRootNote(value);
  return PIANO_ROOT_NOTE_OPTIONS.find((option) => option.value === rootValue)?.index ?? 0;
}

function getPianoRollPitchLabel(rootNote = DEFAULT_PIANO_ROOT_NOTE, pitchSemitones = 0) {
  const rootIndex = getPianoRootNoteIndex(rootNote);
  const semitone = Number(pitchSemitones) || 0;
  const noteIndex = ((rootIndex + semitone) % 12 + 12) % 12;
  const octaveShift = Math.floor((rootIndex + semitone) / 12);
  const noteName = PIANO_ROOT_NOTE_OPTIONS[noteIndex]?.label || DEFAULT_PIANO_ROOT_NOTE;
  const offsetLabel = semitone > 0 ? `+${semitone}` : String(semitone);
  return `${noteName}${octaveShift === 0 ? "" : octaveShift > 0 ? `+${octaveShift}` : octaveShift} ${offsetLabel}`;
}

function normalizePianoRollNote(rawNote = {}, index = 0) {
  const note = rawNote && typeof rawNote === "object" && !Array.isArray(rawNote) ? rawNote : {};
  const rawStartBeat = Number(note.startBeat);
  const rawDurationBeats = Number(note.durationBeats);
  const rawPitchSemitones = Number(note.pitchSemitones);
  const rawVelocity = Number(note.velocity);
  const rawAnchorOffset = Number(note.anchorOffset);
  return {
    id: String(note.id || `note-${index + 1}`),
    startBeat: clamp(Number.isFinite(rawStartBeat) ? rawStartBeat : 0, 0, PIANO_ROLL_MAX_START_BEAT),
    durationBeats: clamp(
      Number.isFinite(rawDurationBeats) ? rawDurationBeats : 0.25,
      PIANO_ROLL_MIN_NOTE_BEATS,
      PIANO_ROLL_MAX_NOTE_BEATS,
    ),
    pitchSemitones: clamp(
      Number.isFinite(rawPitchSemitones) ? rawPitchSemitones : 0,
      PIANO_ROLL_MIN_PITCH_SEMITONES,
      PIANO_ROLL_MAX_PITCH_SEMITONES,
    ),
    velocity: clamp(Number.isFinite(rawVelocity) ? rawVelocity : 1, 0, 1),
    anchorOffset: clamp(
      Number.isFinite(rawAnchorOffset) ? rawAnchorOffset : 0,
      PIANO_ROLL_MIN_ANCHOR_OFFSET,
      PIANO_ROLL_MAX_ANCHOR_OFFSET,
    ),
  };
}

function normalizePianoRollNotes(rawNotes, fallbackNotes = []) {
  const sourceNotes = Array.isArray(rawNotes)
    ? rawNotes
    : Array.isArray(fallbackNotes)
      ? fallbackNotes
      : [];
  return sourceNotes
    .map(normalizePianoRollNote)
    .sort((a, b) => a.startBeat - b.startBeat || a.pitchSemitones - b.pitchSemitones);
}

function createPianoRollNote(overrides = {}) {
  return normalizePianoRollNote({
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `note-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    startBeat: 0,
    durationBeats: 0.25,
    pitchSemitones: 0,
    velocity: 1,
    anchorOffset: 0,
    ...overrides,
  });
}

function normalizeAutomationPointValue(targetDefinition, rawValue) {
  if (!targetDefinition) {
    return rawValue;
  }

  if (targetDefinition.type === "enum") {
    return targetDefinition.values.includes(rawValue) ? rawValue : targetDefinition.defaultValue;
  }

  const numericValue = Number(rawValue);
  return clamp(
    Number.isFinite(numericValue) ? numericValue : targetDefinition.defaultValue,
    targetDefinition.min,
    targetDefinition.max,
  );
}

function normalizeAutomationPoint(targetKey, rawPoint = {}, index = 0) {
  const targetDefinition = CLIP_AUTOMATION_TARGETS[targetKey];
  const point = rawPoint && typeof rawPoint === "object" && !Array.isArray(rawPoint) ? rawPoint : {};
  const rawBeat = Number(point.beat);
  return {
    id: String(point.id || `${targetKey}-point-${index + 1}`),
    beat: clamp(Number.isFinite(rawBeat) ? rawBeat : 0, 0, CLIP_AUTOMATION_POINT_MAX_BEAT),
    value: normalizeAutomationPointValue(targetDefinition, point.value),
  };
}

function normalizeAutomationEnvelope(targetKey, rawEnvelope, fallbackEnvelope = {}) {
  const targetDefinition = CLIP_AUTOMATION_TARGETS[targetKey];
  if (!targetDefinition) {
    return null;
  }

  const sourceEnvelope = rawEnvelope && typeof rawEnvelope === "object" && !Array.isArray(rawEnvelope)
    ? rawEnvelope
    : null;
  const fallback = fallbackEnvelope && typeof fallbackEnvelope === "object" && !Array.isArray(fallbackEnvelope)
    ? fallbackEnvelope
    : null;
  const envelope = sourceEnvelope || fallback || {};
  const interpolation = targetDefinition.type === "enum"
    ? "hold"
    : envelope.interpolation === "hold"
      ? "hold"
      : "linear";
  const points = Array.isArray(envelope.points) ? envelope.points : [];
  return {
    enabled: envelope.enabled !== false,
    interpolation,
    points: points
      .map((point, index) => normalizeAutomationPoint(targetKey, point, index))
      .sort((a, b) => a.beat - b.beat),
  };
}

function createAutomationPoint(targetKey, overrides = {}) {
  return normalizeAutomationPoint(
    targetKey,
    {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${targetKey}-point-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      beat: 0,
      value: CLIP_AUTOMATION_TARGETS[targetKey]?.defaultValue,
      ...overrides,
    },
  );
}

function createAutomationEnvelope(targetKey, overrides = {}) {
  const targetDefinition = CLIP_AUTOMATION_TARGETS[targetKey];
  if (!targetDefinition) {
    return null;
  }

  return normalizeAutomationEnvelope(
    targetKey,
    {
      enabled: true,
      interpolation: targetDefinition.type === "enum" ? "hold" : "linear",
      points: [],
      ...overrides,
    },
  );
}

function normalizeClipAutomation(rawAutomation = {}, fallbackAutomation = {}) {
  const sourceAutomation = rawAutomation && typeof rawAutomation === "object" && !Array.isArray(rawAutomation)
    ? rawAutomation
    : {};
  const fallback = fallbackAutomation && typeof fallbackAutomation === "object" && !Array.isArray(fallbackAutomation)
    ? fallbackAutomation
    : {};
  return Object.keys(CLIP_AUTOMATION_TARGETS).reduce((normalized, targetKey) => {
    const hasEnvelope = Object.prototype.hasOwnProperty.call(sourceAutomation, targetKey);
    const hasFallbackEnvelope = Object.prototype.hasOwnProperty.call(fallback, targetKey);
    if (!hasEnvelope && !hasFallbackEnvelope) {
      return normalized;
    }

    const envelope = normalizeAutomationEnvelope(targetKey, sourceAutomation[targetKey], fallback[targetKey]);
    if (envelope) {
      normalized[targetKey] = envelope;
    }
    return normalized;
  }, {});
}

function normalizeClipState(rawClip = {}, fallbackState = {}) {
  const clip = rawClip && typeof rawClip === "object" && !Array.isArray(rawClip) ? rawClip : {};
  const fallback = fallbackState && typeof fallbackState === "object" && !Array.isArray(fallbackState) ? fallbackState : {};
  const rawStart = Number(clip.startTime);
  const fallbackStart = Number(fallback.startTime);
  const rawVolume = Number(clip.volume);
  const fallbackVolume = Number(fallback.volume);
  const rawOpacity = Number(clip.opacity);
  const fallbackOpacity = Number(fallback.opacity);
  const rawSpeed = Number(clip.speed);
  const fallbackSpeed = Number(fallback.speed);
  const rawPitch = Number(clip.pitch);
  const fallbackPitch = Number(fallback.pitch);

  return {
    ...clip,
    schemaVersion: CLIP_STATE_SCHEMA_VERSION,
    source: cloneClipSource(Object.prototype.hasOwnProperty.call(clip, "source") ? clip.source : fallback.source),
    colorIndex: normalizeSceneColorIndex(
      Object.prototype.hasOwnProperty.call(clip, "colorIndex") ? clip.colorIndex : fallback.colorIndex,
    ),
    durationFilter: normalizeDurationFilterValue(clip.durationFilter, fallback.durationFilter),
    startTime: Math.max(0, Number.isFinite(rawStart) ? rawStart : Number.isFinite(fallbackStart) ? fallbackStart : 0),
    timingMode: normalizeClipTimingMode(clip.timingMode, fallback.timingMode),
    pianoSnap: normalizePianoRollSnap(clip.pianoSnap, fallback.pianoSnap),
    pianoRoot: normalizePianoRootNote(clip.pianoRoot, fallback.pianoRoot),
    retriggersPerBar: normalizeRetriggersPerBar(clip.retriggersPerBar ?? fallback.retriggersPerBar),
    notes: normalizePianoRollNotes(clip.notes, fallback.notes),
    automation: normalizeClipAutomation(clip.automation, fallback.automation),
    volume: clamp(Number.isFinite(rawVolume) ? rawVolume : Number.isFinite(fallbackVolume) ? fallbackVolume : 0.55, 0, 1),
    muted: typeof clip.muted === "boolean" ? clip.muted : !!fallback.muted,
    blendMode: normalizeBlendModeValue(clip.blendMode, fallback.blendMode),
    opacity: clamp(Number.isFinite(rawOpacity) ? rawOpacity : Number.isFinite(fallbackOpacity) ? fallbackOpacity : 1, 0, 1),
    speed: clamp(Number.isFinite(rawSpeed) ? rawSpeed : Number.isFinite(fallbackSpeed) ? fallbackSpeed : 1, 0.5, 2),
    pitch: clamp(Number.isFinite(rawPitch) ? rawPitch : Number.isFinite(fallbackPitch) ? fallbackPitch : 0, -12, 12),
    fx: normalizeClipFx(clip.fx, fallback.fx),
  };
}

function getAutomationTargetValue(state, targetDefinition) {
  if (!state || !targetDefinition?.path?.length) {
    return targetDefinition?.defaultValue;
  }

  let value = state;
  targetDefinition.path.forEach((key) => {
    value = value && typeof value === "object" ? value[key] : undefined;
  });
  return typeof value === "undefined" ? targetDefinition.defaultValue : value;
}

function setAutomationTargetValue(state, targetDefinition, value) {
  if (!state || !targetDefinition?.path?.length) {
    return;
  }

  let target = state;
  targetDefinition.path.slice(0, -1).forEach((key) => {
    if (!target[key] || typeof target[key] !== "object") {
      target[key] = {};
    }
    target = target[key];
  });
  target[targetDefinition.path.at(-1)] = normalizeAutomationPointValue(targetDefinition, value);
}

function evaluateAutomationEnvelope(envelope, beat = 0, baseValue = null, targetDefinition = null) {
  if (!envelope?.enabled || !Array.isArray(envelope.points) || !envelope.points.length || !targetDefinition) {
    return baseValue;
  }

  const localBeat = Math.max(0, Number(beat) || 0);
  const points = envelope.points;
  if (localBeat < points[0].beat) {
    return baseValue;
  }

  if (points.length === 1 || localBeat >= points.at(-1).beat) {
    return points.at(-1).value;
  }

  const nextPointIndex = points.findIndex((point) => point.beat > localBeat);
  const nextPoint = points[nextPointIndex];
  const previousPoint = points[Math.max(0, nextPointIndex - 1)];
  if (!nextPoint || !previousPoint) {
    return baseValue;
  }

  if (envelope.interpolation === "hold" || targetDefinition.type === "enum") {
    return previousPoint.value;
  }

  const span = nextPoint.beat - previousPoint.beat;
  if (!Number.isFinite(span) || span <= 0) {
    return nextPoint.value;
  }

  const progress = clamp((localBeat - previousPoint.beat) / span, 0, 1);
  const startValue = Number(previousPoint.value);
  const endValue = Number(nextPoint.value);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) {
    return previousPoint.value;
  }

  return startValue + (endValue - startValue) * progress;
}

function applyAutomationAtBeat(baseState = {}, automation = baseState?.automation, localBeat = 0) {
  const automatedState = normalizeClipState(baseState);
  const envelopes = normalizeClipAutomation(automation);
  Object.entries(envelopes).forEach(([targetKey, envelope]) => {
    const targetDefinition = CLIP_AUTOMATION_TARGETS[targetKey];
    const baseValue = getAutomationTargetValue(automatedState, targetDefinition);
    const nextValue = evaluateAutomationEnvelope(envelope, localBeat, baseValue, targetDefinition);
    setAutomationTargetValue(automatedState, targetDefinition, nextValue);
  });
  return automatedState;
}

function syncTrackVideoElementSource(track, video, state = null) {
  const playbackState = state || getTrackRenderState(track) || getTrackPlaybackState(track) || track;
  const sourceUrl = getTrackPlaybackSourceUrl(track, playbackState);
  if (!video || !sourceUrl) {
    return;
  }

  if (mediaElementHasSource(video, sourceUrl)) {
    return;
  }

  disposeTrackAudio(track);
  setMediaElementSource(video, sourceUrl);
}

function getTrackVideo(track) {
  const trackId = track?.id;
  if (!trackId) {
    return null;
  }

  if (track.__activeVideoElement?.isConnected) {
    return track.__activeVideoElement;
  }

  if (track.__cacheVideoElement?.isConnected) {
    track.__activeVideoElement = track.__cacheVideoElement;
    return track.__cacheVideoElement;
  }

  const video = playerPanel?.querySelector(`#video-${trackId}`) || null;
  if (video) {
    video.dataset.playbackRole = "active";
    video.classList.add("is-active");
    video.classList.remove("is-standby");
    track.__cacheVideoElement = video;
    track.__activeVideoElement = video;
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

function arrangementStepHasText(stepIndex) {
  const clip = getArrangementTextClip(stepIndex);
  return !!clip?.fields?.some((field) => String(field.text || "").trim());
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
  const hasVideoClips = !!step &&
    typeof step === "object" &&
    !Array.isArray(step) &&
    Object.values(step).some((clip) => isArrangementClipFilledForKind(ARRANGEMENT_CLIP_KINDS.av, clip));
  return hasVideoClips || arrangementStepHasText(resolvedStep) || drumClipHasNotes(getArrangementDrumClip(resolvedStep));
}

function createSelectedClipTargetDescriptor(kind, stepIndex, options = {}) {
  const normalizedKind = normalizeArrangementClipKind(kind);
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return null;
  }

  const track = options.track || null;
  const trackId = normalizedKind === ARRANGEMENT_CLIP_KINDS.text
    ? TEXT_TRACK_ID
    : normalizedKind === ARRANGEMENT_CLIP_KINDS.drum
      ? DRUM_TRACK_ID
      : track?.id || options.trackId || null;
  const clip = Object.prototype.hasOwnProperty.call(options, "clip")
    ? options.clip
    : trackId
      ? getArrangementClipAtTarget(trackId, resolvedStep)
      : null;
  const contract = getArrangementClipContract(normalizedKind, clip, {
    track,
    trackId,
    stepIndex: resolvedStep,
  });
  const trackLabel = normalizedKind === ARRANGEMENT_CLIP_KINDS.av
    ? track?.name || trackId || "A/V"
    : getArrangementClipKindLabel(normalizedKind);

  return {
    type: "clip",
    kind: normalizedKind,
    track,
    trackId,
    trackLabel,
    stepIndex: resolvedStep,
    clip: contract.clip,
    contract,
    hasClips: contract.filled,
    labelPrefix: `Editing ${trackLabel} / scene ${resolvedStep + 1}`,
  };
}

function getSelectedClipTargetDescriptors() {
  const descriptors = [];

  getSelectedArrangementClipTargets().forEach(({ track, stepIndex }) => {
    const descriptor = createSelectedClipTargetDescriptor(ARRANGEMENT_CLIP_KINDS.av, stepIndex, { track });
    if (descriptor) {
      descriptors.push(descriptor);
    }
  });

  getSelectedTextClipSteps().forEach((stepIndex) => {
    const descriptor = createSelectedClipTargetDescriptor(ARRANGEMENT_CLIP_KINDS.text, stepIndex);
    if (descriptor) {
      descriptors.push(descriptor);
    }
  });

  getSelectedDrumClipSteps().forEach((stepIndex) => {
    const descriptor = createSelectedClipTargetDescriptor(ARRANGEMENT_CLIP_KINDS.drum, stepIndex);
    if (descriptor) {
      descriptors.push(descriptor);
    }
  });

  return descriptors.sort((a, b) => {
    if (a.stepIndex !== b.stepIndex) {
      return a.stepIndex - b.stepIndex;
    }

    const order = {
      [ARRANGEMENT_CLIP_KINDS.av]: 0,
      [ARRANGEMENT_CLIP_KINDS.text]: 1,
      [ARRANGEMENT_CLIP_KINDS.drum]: 2,
    };
    return (order[a.kind] ?? 99) - (order[b.kind] ?? 99);
  });
}

function getSelectedEditTargetModel() {
  const sceneStep = getSelectedArrangementSceneStep();
  if (sceneStep !== null) {
    const sceneTargets = [
      ...tracks.map((track) => createSelectedClipTargetDescriptor(ARRANGEMENT_CLIP_KINDS.av, sceneStep, { track })),
      createSelectedClipTargetDescriptor(ARRANGEMENT_CLIP_KINDS.text, sceneStep),
      createSelectedClipTargetDescriptor(ARRANGEMENT_CLIP_KINDS.drum, sceneStep),
    ].filter(Boolean);

    return {
      mode: "scene",
      type: "scene-selection",
      stepIndex: sceneStep,
      label: `Editing scene ${sceneStep + 1}`,
      labelPrefix: `Editing scene ${sceneStep + 1}`,
      targetCount: sceneTargets.length,
      targets: sceneTargets,
      hasClips: arrangementStepHasClips(sceneStep),
    };
  }

  const selectedTargets = getSelectedClipTargetDescriptors();
  if (selectedTargets.length === 1) {
    const target = selectedTargets[0];
    return {
      mode: "clip",
      type: `${target.kind}-clip-selection`,
      stepIndex: target.stepIndex,
      label: `${target.labelPrefix}${target.hasClips ? "" : " (empty)"}`,
      labelPrefix: target.labelPrefix,
      targetCount: 1,
      targets: selectedTargets,
      primaryTarget: target,
      hasClips: target.hasClips,
    };
  }

  if (selectedTargets.length > 1) {
    const filledCount = selectedTargets.filter((target) => target.hasClips).length;
    return {
      mode: "multi",
      type: "multi-clip-selection",
      stepIndex: selectedTargets[0]?.stepIndex ?? null,
      label: `Editing ${selectedTargets.length} selected clips${filledCount ? "" : " (empty)"}`,
      labelPrefix: `Editing ${selectedTargets.length} selected clips`,
      targetCount: selectedTargets.length,
      targets: selectedTargets,
      primaryTarget: selectedTargets[0],
      hasClips: filledCount > 0,
    };
  }

  return {
    mode: "live",
    type: "live-track-selection",
    stepIndex: getArrangementStepIndex(arrangement?.step),
    label: "Editing live tracks",
    labelPrefix: "Editing live tracks",
    targetCount: tracks.length,
    targets: tracks.map((track) => ({
      type: "live-track",
      kind: ARRANGEMENT_CLIP_KINDS.av,
      track,
      trackId: track.id,
      trackLabel: track.name,
      stepIndex: null,
      clip: track,
      contract: null,
      hasClips: !!track.source,
      labelPrefix: `Editing ${track.name}`,
    })),
    primaryTarget: null,
    hasClips: tracks.some((track) => !!track.source),
  };
}

function getArrangementCommandTargetsFromSelection(options = {}) {
  const targetModel = getSelectedEditTargetModel();
  const includeSceneTargets = options.includeSceneTargets !== false;
  if (targetModel.mode === "scene" && includeSceneTargets) {
    return targetModel.targets;
  }

  if (targetModel.mode === "clip" || targetModel.mode === "multi") {
    return targetModel.targets;
  }

  return [];
}

function getArrangementCommandTargetId(target) {
  if (!target) {
    return "";
  }

  return target.trackId || (
    target.kind === ARRANGEMENT_CLIP_KINDS.text
      ? TEXT_TRACK_ID
      : target.kind === ARRANGEMENT_CLIP_KINDS.drum
        ? DRUM_TRACK_ID
        : ""
  );
}

function arrangementCommandTargetIsLocked(target) {
  return target?.kind === ARRANGEMENT_CLIP_KINDS.av && (!!target.track?.locked || !!target.track?.frozen);
}

function arrangementCommandTargetCanCapture(target) {
  if (!target || arrangementCommandTargetIsLocked(target)) {
    return false;
  }

  if (target.kind === ARRANGEMENT_CLIP_KINDS.text || target.kind === ARRANGEMENT_CLIP_KINDS.drum) {
    return true;
  }

  return !!target.track?.source;
}

function captureArrangementCommandTarget(target) {
  if (!arrangementCommandTargetCanCapture(target)) {
    return false;
  }

  if (target.kind === ARRANGEMENT_CLIP_KINDS.text) {
    ensureArrangementTextClip(target.stepIndex);
    return true;
  }

  if (target.kind === ARRANGEMENT_CLIP_KINDS.drum) {
    ensureArrangementDrumClip(target.stepIndex);
    return true;
  }

  if (!target.track) {
    return false;
  }

  return setArrangementClipAtTarget(target.track.id, target.stepIndex, captureTrackClip(target.track));
}

function deleteArrangementCommandTarget(target) {
  if (!target || arrangementCommandTargetIsLocked(target)) {
    return false;
  }

  if (!target.hasClips) {
    return false;
  }

  return clearArrangementClipAtTarget(getArrangementCommandTargetId(target), target.stepIndex);
}

function createArrangementClipboardEntry(target) {
  if (!target?.hasClips) {
    return null;
  }

  return {
    kind: target.kind,
    trackId: getArrangementCommandTargetId(target),
    trackName: target.trackLabel,
    stepIndex: target.stepIndex,
    clip: cloneArrangementClipForKind(target.kind, target.clip),
  };
}

function getClipboardEntriesForKind(kind) {
  const normalizedKind = normalizeArrangementClipKind(kind);
  if (arrangementClipboardKind === "scene") {
    if (normalizedKind === ARRANGEMENT_CLIP_KINDS.text) {
      return arrangementClipboardTextClip ? [{ kind: normalizedKind, trackId: TEXT_TRACK_ID, clip: arrangementClipboardTextClip }] : [];
    }

    if (normalizedKind === ARRANGEMENT_CLIP_KINDS.drum) {
      return arrangementClipboardDrumClip ? [{ kind: normalizedKind, trackId: DRUM_TRACK_ID, clip: arrangementClipboardDrumClip }] : [];
    }

    return arrangementClipboardClips.map((entry) => ({ ...entry, kind: normalizedKind }));
  }

  if (normalizedKind === ARRANGEMENT_CLIP_KINDS.text) {
    return arrangementClipboardTextClips.length
      ? arrangementClipboardTextClips.map((entry) => ({ ...entry, kind: normalizedKind, trackId: TEXT_TRACK_ID }))
      : arrangementClipboardTextClip
        ? [{ kind: normalizedKind, trackId: TEXT_TRACK_ID, clip: arrangementClipboardTextClip }]
        : [];
  }

  if (normalizedKind === ARRANGEMENT_CLIP_KINDS.drum) {
    return arrangementClipboardDrumClips.length
      ? arrangementClipboardDrumClips.map((entry) => ({ ...entry, kind: normalizedKind, trackId: DRUM_TRACK_ID }))
      : arrangementClipboardDrumClip
        ? [{ kind: normalizedKind, trackId: DRUM_TRACK_ID, clip: arrangementClipboardDrumClip }]
        : [];
  }

  return arrangementClipboardClips.map((entry) => ({ ...entry, kind: normalizedKind }));
}

function pasteClipboardEntryToTarget(entry, target) {
  if (!entry?.clip || !target || arrangementCommandTargetIsLocked(target) || entry.kind !== target.kind) {
    return false;
  }

  return setArrangementClipAtTarget(getArrangementCommandTargetId(target), target.stepIndex, entry.clip);
}

function getActiveEditTarget() {
  const selectedTargetModel = getSelectedEditTargetModel();
  if (selectedTargetModel.mode === "clip" && selectedTargetModel.primaryTarget) {
    return selectedTargetModel.primaryTarget;
  }

  if (selectedTargetModel.mode === "multi") {
    return {
      type: selectedTargetModel.type,
      stepIndex: selectedTargetModel.stepIndex,
      targets: selectedTargetModel.targets,
      hasClips: selectedTargetModel.hasClips,
      labelPrefix: selectedTargetModel.labelPrefix,
    };
  }

  if (selectedArrangementSceneStep !== null) {
    const resolvedScene = getArrangementStepIndex(selectedArrangementSceneStep);
    if (resolvedScene !== null) {
      return {
        type: "scene-selection",
        stepIndex: resolvedScene,
        targets: tracks.map((track) => ({ track, stepIndex: resolvedScene })),
        textClip: getArrangementTextClip(resolvedScene),
        drumClip: getArrangementDrumClip(resolvedScene),
        hasClips: arrangementStepHasClips(resolvedScene),
        labelPrefix: `Editing scene ${resolvedScene + 1}`,
      };
    }
  }

  if (selectedTextClipStep !== null) {
    return {
      type: "text",
      stepIndex: selectedTextClipStep,
      clip: getArrangementTextClip(selectedTextClipStep),
      labelPrefix: "Editing TEXT",
    };
  }

  if (selectedDrumClipStep !== null) {
    return {
      type: "drum",
      stepIndex: selectedDrumClipStep,
      clip: getArrangementDrumClip(selectedDrumClipStep),
      labelPrefix: "Editing DRUM",
    };
  }

  const selectedTargets = getSelectedArrangementClipTargets();
  if (selectedTargets.length === 1) {
    const [{ track, stepIndex }] = selectedTargets;
    return {
      type: "clip",
      track,
      stepIndex,
      clip: arrangement?.clips?.[stepIndex]?.[track.id] || null,
      labelPrefix: `Editing ${track.name}`,
    };
  }

  if (selectedTargets.length > 1) {
    return {
      type: "multi-clip",
      targets: selectedTargets,
      labelPrefix: `Editing ${selectedTargets.length} selected clips`,
    };
  }

  const resolvedStep = getArrangementStepIndex(arrangement?.step);
  if (resolvedStep === null) {
    return { type: "live", stepIndex: null, labelPrefix: "Editing live tracks" };
  }

  return {
    type: "scene",
    stepIndex: resolvedStep,
    hasClips: arrangementStepHasClips(resolvedStep),
    labelPrefix: `Editing scene ${resolvedStep + 1}`,
  };
}

function getSelectedEditTargetLabel() {
  const targetModel = getSelectedEditTargetModel();
  if (targetModel?.label) {
    return targetModel.label;
  }

  const target = getActiveEditTarget();
  if (!target) {
    return "Editing live tracks";
  }

  if (target.type === "text") {
    return `${target.labelPrefix} / scene ${target.stepIndex + 1}${target.clip ? "" : " (blank)"}`;
  }

  if (target.type === "clip") {
    return `${target.labelPrefix} / scene ${target.stepIndex + 1}${target.clip ? "" : " (blank)"}`;
  }

  if (target.type === "multi-clip" || target.type === "live") {
    return target.labelPrefix;
  }

  return `${target.labelPrefix}${target.hasClips ? "" : " (empty)"}`;
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
    const timingClip = getTrackFrozenBounceState(track, clip) || clip;
    track.arrangementClip = clip;
    track.stepMs = isPianoRollTimingState(timingClip) ? 0 : getClipRetriggerStepMs(timingClip, barMs);
    if (shouldSyncTiming && Number.isFinite(track.stepMs) && track.stepMs > 0) {
      resetTrackPulseCursor(track, nextTriggerAt, { fireAtReference: true });
    }
    track.lastStep = -1;
  });
}

function getClipRetriggerStepMs(clip, barMs) {
  if (!clip || !Number.isFinite(Number(barMs)) || Number(barMs) <= 0) {
    return 0;
  }

  return Number(barMs) / normalizeRetriggersPerBar(clip.retriggersPerBar);
}

function getTrackTimingNudgeMs(track) {
  const timingNudge = Number(track?.timingNudgeMs);
  return Number.isFinite(timingNudge) ? clamp(timingNudge, -250, 250) : 0;
}

function getTrackFrozenBounceState(track, fallbackState = null) {
  if (!track?.frozen || track.__bounceInProgress || !track.frozenBounce?.url) {
    return null;
  }

  if (track.__frozenBounceState?.source?.mediaUrl === track.frozenBounce.url) {
    return track.__frozenBounceState;
  }

  const fallback = fallbackState && typeof fallbackState === "object" ? fallbackState : track;
  const bounceSource = {
    ...(fallback?.source && typeof fallback.source === "object" ? fallback.source : {}),
    identifier: `${track.id}-bounce`,
    title: `${track.name || "Track"} bounce`,
    creator: "Freemix bounce",
    mediaFormat: "video/webm",
    mediaUrl: track.frozenBounce.url,
    durationSeconds: Math.max(0.1, Number(track.frozenBounce.durationMs || 0) / 1000),
  };
  track.__frozenBounceState = normalizeClipState({
    source: bounceSource,
    colorIndex: getArrangementClipColorIndex(fallback, arrangement?.step),
    durationFilter: fallback?.durationFilter || track.durationFilter,
    startTime: 0,
    timingMode: CLIP_TIMING_MODES.retrigger,
    pianoSnap: normalizePianoRollSnap(track.pianoSnap),
    pianoRoot: normalizePianoRootNote(track.pianoRoot),
    retriggersPerBar: 1,
    notes: [],
    automation: {},
    volume: 1,
    muted: false,
    blendMode: normalizeBlendModeValue(fallback?.blendMode, track.blendMode),
    opacity: Number.isFinite(Number(fallback?.opacity)) ? clamp(Number(fallback.opacity), 0, 1) : 1,
    speed: 1,
    pitch: 0,
    fx: normalizeClipFx({}),
  }, track);

  return track.__frozenBounceState;
}

function getClipRetriggerStepBeats(clip, beatsPerBar = getTransportBeatsPerBar()) {
  const resolvedBeatsPerBar = Number(beatsPerBar);
  if (!clip || !Number.isFinite(resolvedBeatsPerBar) || resolvedBeatsPerBar <= 0) {
    return 0;
  }

  return resolvedBeatsPerBar / normalizeRetriggersPerBar(clip.retriggersPerBar);
}

function getClipPlaybackSourceUrlForEvent(clip, track = null) {
  if (track) {
    return getTrackPlaybackSourceUrl(track, clip);
  }

  return clip?.source?.mediaUrl || clip?.source?.url || "";
}

function getPitchAdjustedPlaybackRate(baseSpeed = 1, pitchSemitones = 0) {
  const speed = Number(baseSpeed);
  const pitch = Number(pitchSemitones);
  const safeSpeed = Number.isFinite(speed) ? speed : 1;
  const safePitch = Number.isFinite(pitch) ? pitch : 0;
  return safeSpeed * Math.pow(2, safePitch / 12);
}

const PIANO_ROLL_TRIGGER_LOOKAHEAD_MS = 45;

function isPianoRollTimingState(state) {
  return normalizeClipTimingMode(state?.timingMode) === CLIP_TIMING_MODES.pianoRoll;
}

function resetPianoRollEventCursor(track, contextKey) {
  if (!track) {
    return null;
  }

  if (track.__pianoRollEventContext !== contextKey) {
    track.__pianoRollEventContext = contextKey;
    track.__playedPianoRollEvents = new Set();
  }

  if (!(track.__playedPianoRollEvents instanceof Set)) {
    track.__playedPianoRollEvents = new Set();
  }

  return track.__playedPianoRollEvents;
}

function clearPianoRollGate(track) {
  if (!track) {
    return;
  }

  if (track.__pianoRollGateTimer) {
    window.clearTimeout(track.__pianoRollGateTimer);
  }
  track.__pianoRollGateTimer = null;
  track.__pianoRollGateToken = null;
}

function clearPianoRollAudition(track) {
  if (!track) {
    return;
  }

  if (track.__pianoRollAuditionTimer) {
    window.clearTimeout(track.__pianoRollAuditionTimer);
  }
  track.__pianoRollAuditionTimer = null;
  track.__pianoRollAuditionToken = null;
}

function getPianoRollEventKey(event, index) {
  const noteId = String(event?.noteId || event?.id || `note-${index}`);
  const localBeat = Number.isFinite(Number(event?.localBeat)) ? Number(event.localBeat).toFixed(4) : "0.0000";
  return `${noteId}:${localBeat}`;
}

function createClipEventPlaybackState(baseState, event) {
  const automatedState = applyAutomationAtBeat(baseState, baseState?.automation, event?.localBeat || 0);
  const velocity = clamp(Number(event?.velocity) || 0, 0, 1);
  const baseVolume = clamp(Number(automatedState?.volume ?? baseState?.volume ?? 0.55), 0, 1);
  const pitch = clamp(
    Number(event?.pitchSemitones) || 0,
    PIANO_ROLL_MIN_PITCH_SEMITONES,
    PIANO_ROLL_MAX_PITCH_SEMITONES,
  );
  const startTime = Number.isFinite(Number(event?.startTime)) ? Number(event.startTime) : safeStartTime(automatedState);

  return normalizeClipState(
    {
      ...automatedState,
      startTime,
      pitch,
      volume: baseVolume * velocity,
    },
    automatedState,
  );
}

function createPianoRollEventPlaybackState(baseState, event) {
  return createClipEventPlaybackState(baseState, event);
}

function getRetriggerPlaybackEventForPulse(track, playbackState, pulseIndex, beatsPerBar, beatMs) {
  if (!track || !playbackState || isPianoRollTimingState(playbackState)) {
    return null;
  }

  const events = getClipPlaybackEvents(playbackState, 0, beatsPerBar, {
    track,
    trackId: track.id,
    beatMs,
  });
  if (!events.length) {
    return null;
  }

  const safePulseIndex = Math.max(0, Number(pulseIndex) || 0);
  return events[safePulseIndex % events.length] || events[0];
}

function getRetriggerPlaybackStateForPulse(track, playbackState, pulseIndex, beatsPerBar, beatMs) {
  const event = getRetriggerPlaybackEventForPulse(track, playbackState, pulseIndex, beatsPerBar, beatMs);
  return event
    ? createClipEventPlaybackState(playbackState, event)
    : applyAutomationAtBeat(playbackState, playbackState?.automation, 0);
}

function schedulePianoRollNoteGate(track, event, eventKey, beatMs, contextKey, sessionToken) {
  if (!track || !event || !Number.isFinite(Number(beatMs)) || Number(beatMs) <= 0) {
    return;
  }

  const durationBeats = Math.max(0.0625, Number(event.durationBeats) || 0.25);
  const durationMs = Math.max(30, durationBeats * Number(beatMs));
  const gateToken = `${contextKey}:${eventKey}`;
  clearPianoRollGate(track);
  track.__pianoRollGateToken = gateToken;
  track.__pianoRollGateTimer = window.setTimeout(() => {
    if (
      !transport?.active ||
      transport.sessionToken !== sessionToken ||
      track.__pianoRollGateToken !== gateToken
    ) {
      return;
    }

    const video = getTrackVideo(track);
    if (video && typeof video.pause === "function") {
      video.pause();
    }
    setTrackBlackout(track, true);
    setTrackPlaybackPhase(track, PLAYBACK_PHASES.stopped, { mediaStatus: "ready" });
    clearPianoRollGate(track);
  }, durationMs);
}

function triggerPianoRollEventForTrack(track, playbackState, event, eventKey, beatMs, contextKey, sessionToken) {
  if (
    !track ||
    !transport?.active ||
    transport.sessionToken !== sessionToken ||
    track.__pianoRollEventContext !== contextKey
  ) {
    return;
  }

  if (!isTrackAudibleInMix(track, playbackState)) {
    return;
  }

  const eventPlaybackState = createPianoRollEventPlaybackState(playbackState, event);
  track.__transportClockCorrectionPulse = null;
  track.__transportClockCorrectionUntil = null;
  triggerTrack(track, eventPlaybackState, sessionToken);
  schedulePianoRollNoteGate(track, event, eventKey, beatMs, contextKey, sessionToken);
}

function playPianoRollEventsForTrack(track, playbackState, now, barStartAt, barMs, beatsPerBar, contextKey) {
  if (!track || !playbackState || !transport?.active || !Number.isFinite(Number(barStartAt))) {
    return;
  }

  const playedEvents = resetPianoRollEventCursor(track, contextKey);
  if (!playedEvents) {
    return;
  }

  const beatMs = Number(barMs) / Number(beatsPerBar || getTransportBeatsPerBar(transport));
  if (!Number.isFinite(beatMs) || beatMs <= 0) {
    return;
  }

  const events = getPianoRollPlaybackEvents(playbackState, 0, beatsPerBar, {
    track,
    trackId: track.id,
    beatMs,
  });

  events.forEach((event, index) => {
    const scheduledAt = Number(barStartAt) + Number(event.localBeat || 0) * beatMs;
    if (!Number.isFinite(scheduledAt) || scheduledAt > now + PIANO_ROLL_TRIGGER_LOOKAHEAD_MS) {
      return;
    }

    const eventKey = getPianoRollEventKey(event, index);
    if (playedEvents.has(eventKey)) {
      return;
    }

    playedEvents.add(eventKey);
    const delayMs = Math.max(0, scheduledAt - performance.now());
    const sessionToken = transport.sessionToken;
    if (delayMs > 2) {
      window.setTimeout(() => {
        triggerPianoRollEventForTrack(track, playbackState, event, eventKey, beatMs, contextKey, sessionToken);
      }, delayMs);
      return;
    }

    triggerPianoRollEventForTrack(track, playbackState, event, eventKey, beatMs, contextKey, sessionToken);
  });
}

function createClipPlaybackEvent(clip, localBeat, sceneStartBeat = 0, options = {}) {
  const normalizedClip = normalizeClipState(clip);
  const note = options.note || null;
  const notePitch = Number(note?.pitchSemitones);
  const noteVelocity = Number(note?.velocity);
  const noteAnchorOffset = Number(note?.anchorOffset);
  const durationBeats = Number(options.durationBeats);
  const beatMs = Number(options.beatMs);
  const absoluteBeat = Number(sceneStartBeat) + Number(localBeat || 0);
  const playbackPitch = normalizedClip.pitch + (Number.isFinite(notePitch) ? notePitch : 0);
  const playbackRate = getPitchAdjustedPlaybackRate(normalizedClip.speed, playbackPitch);
  return {
    beat: absoluteBeat,
    localBeat: Number(localBeat) || 0,
    timeMs: Number.isFinite(beatMs) ? absoluteBeat * beatMs : null,
    trackId: options.trackId || null,
    clip: normalizedClip,
    sourceUrl: getClipPlaybackSourceUrlForEvent(normalizedClip, options.track || null),
    startTime: Math.max(0, normalizedClip.startTime + (Number.isFinite(noteAnchorOffset) ? noteAnchorOffset : 0)),
    durationBeats: Number.isFinite(durationBeats) ? durationBeats : null,
    durationMs: Number.isFinite(durationBeats) && Number.isFinite(beatMs) ? durationBeats * beatMs : null,
    pitchSemitones: playbackPitch,
    speed: playbackRate,
    velocity: clamp(Number.isFinite(noteVelocity) ? noteVelocity : 1, 0, 1),
    noteId: note?.id || null,
    timingMode: normalizedClip.timingMode,
  };
}

function getRetriggerPlaybackEvents(clip, sceneStartBeat = 0, sceneLengthBeats = getTransportBeatsPerBar(), options = {}) {
  const normalizedClip = normalizeClipState(clip);
  const beatsPerBar = Number(options.beatsPerBar ?? getTransportBeatsPerBar());
  const stepBeats = getClipRetriggerStepBeats(normalizedClip, beatsPerBar);
  const resolvedLength = Number(sceneLengthBeats);
  if (!Number.isFinite(stepBeats) || stepBeats <= 0 || !Number.isFinite(resolvedLength) || resolvedLength <= 0) {
    return [];
  }

  const events = [];
  for (let localBeat = 0; localBeat < resolvedLength - 1e-6; localBeat += stepBeats) {
    events.push(createClipPlaybackEvent(normalizedClip, localBeat, sceneStartBeat, {
      ...options,
      durationBeats: Math.min(stepBeats, resolvedLength - localBeat),
    }));
  }
  return events;
}

function getPianoRollPlaybackEvents(clip, sceneStartBeat = 0, sceneLengthBeats = getTransportBeatsPerBar(), options = {}) {
  const normalizedClip = normalizeClipState(clip);
  const resolvedLength = Number(sceneLengthBeats);
  if (!Number.isFinite(resolvedLength) || resolvedLength <= 0) {
    return [];
  }

  return normalizedClip.notes
    .filter((note) => note.startBeat < resolvedLength)
    .map((note) => createClipPlaybackEvent(normalizedClip, note.startBeat, sceneStartBeat, {
      ...options,
      note,
      durationBeats: Math.min(note.durationBeats, Math.max(PIANO_ROLL_MIN_NOTE_BEATS, resolvedLength - note.startBeat)),
    }));
}

function getClipPlaybackEvents(clip, sceneStartBeat = 0, sceneLengthBeats = getTransportBeatsPerBar(), options = {}) {
  const normalizedClip = normalizeClipState(clip);
  if (normalizedClip.timingMode === CLIP_TIMING_MODES.pianoRoll) {
    return getPianoRollPlaybackEvents(normalizedClip, sceneStartBeat, sceneLengthBeats, options);
  }

  return getRetriggerPlaybackEvents(normalizedClip, sceneStartBeat, sceneLengthBeats, options);
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
  const frozenState = getTrackFrozenBounceState(track, arrangementClip || track);
  if (frozenState) {
    return frozenState;
  }

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

  const frozenState = getTrackFrozenBounceState(baseTrack, overrideState || baseTrack.arrangementClip || baseTrack);
  if (frozenState) {
    return frozenState;
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

function isRemoteHttpMediaUrl(sourceUrl) {
  if (!sourceUrl) {
    return false;
  }

  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    return mediaUrl.protocol === "http:" || mediaUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function isRunningFromLocalMediaProxyOrigin() {
  const host = window.location?.hostname;
  return (
    (window.location?.protocol === "http:" || window.location?.protocol === "https:") &&
    (host === "localhost" || host === "127.0.0.1") &&
    String(window.location?.port || "") === "4200"
  );
}

function canUseLocalMediaProxy() {
  return !!localMediaProxyAvailable || isRunningFromLocalMediaProxyOrigin();
}

function checkLocalMediaProxy() {
  if (localMediaProxyAvailable) {
    return Promise.resolve(true);
  }

  if (localMediaProxyCheckPromise) {
    return localMediaProxyCheckPromise;
  }

  localMediaProxyCheckPromise = fetch(`${LOCAL_MEDIA_PROXY_ORIGIN}/proxy-health`, {
    cache: "no-store",
    mode: "cors",
  })
    .then((response) => {
      localMediaProxyAvailable = response.ok;
      if (localMediaProxyAvailable) {
        refreshMediaPlaybackRoutes();
      }
      return localMediaProxyAvailable;
    })
    .catch(() => {
      localMediaProxyAvailable = false;
      return false;
    })
    .finally(() => {
      localMediaProxyCheckPromise = null;
    });

  return localMediaProxyCheckPromise;
}

function enterLocalProxyShellIfAvailable() {
  if (window.location?.protocol !== "file:") {
    return;
  }

  checkLocalMediaProxy().then((isAvailable) => {
    if (!isAvailable || window.location?.protocol !== "file:") {
      return;
    }

    window.location.href = `${LOCAL_MEDIA_PROXY_ORIGIN}/${window.location.search || ""}${window.location.hash || ""}`;
  });
}

function isLocalMediaProxyUrl(sourceUrl) {
  if (!sourceUrl) {
    return false;
  }

  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    const localProxyUrl = new URL(LOCAL_MEDIA_PROXY_ORIGIN);
    const isLocalhostProxy =
      mediaUrl.origin === localProxyUrl.origin ||
      mediaUrl.hostname === "localhost" ||
      mediaUrl.hostname === "127.0.0.1";
    return (
      isLocalhostProxy &&
      (mediaUrl.pathname === "/media-proxy" ||
        mediaUrl.pathname === "/media-live" ||
        mediaUrl.pathname === "/media-cache" ||
        mediaUrl.pathname === "/media-slice")
    );
  } catch {
    return false;
  }
}

function getLocalMediaProxyOrigin() {
  try {
    const configuredProxyUrl = new URL(LOCAL_MEDIA_PROXY_ORIGIN);
    const currentUrl = new URL(window.location.href);
    return currentUrl.origin === configuredProxyUrl.origin ? currentUrl.origin : configuredProxyUrl.origin;
  } catch {
    return LOCAL_MEDIA_PROXY_ORIGIN;
  }
}

function getOriginalMediaUrlFromProxyUrl(sourceUrl) {
  if (!isLocalMediaProxyUrl(sourceUrl)) {
    return null;
  }

  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    return mediaUrl.searchParams.get("url");
  } catch {
    return null;
  }
}

function resolveMediaElementSourceUrl(sourceUrl) {
  if (!sourceUrl) {
    return "";
  }

  try {
    return new URL(sourceUrl, window.location.href).href;
  } catch {
    return String(sourceUrl || "");
  }
}

window.resolveMediaElementSourceUrl = resolveMediaElementSourceUrl;

function mediaElementHasSource(video, sourceUrl) {
  const targetUrl = resolveMediaElementSourceUrl(sourceUrl);
  if (!video || !targetUrl) {
    return false;
  }

  return [video.currentSrc, video.src, video.getAttribute?.("src")]
    .map(resolveMediaElementSourceUrl)
    .some((candidate) => candidate === targetUrl);
}

function setMediaElementSource(video, sourceUrl, options = {}) {
  if (!video || !sourceUrl) {
    return false;
  }

  if (mediaElementHasSource(video, sourceUrl)) {
    return false;
  }

  setVideoCorsPolicy(video, sourceUrl);
  video.setAttribute("src", sourceUrl);
  if (options.load !== false) {
    video.load();
  }
  return true;
}

function loadMediaElementOnlyIfEmpty(video) {
  if (!video || typeof video.load !== "function") {
    return;
  }

  if (video.networkState === video.NETWORK_EMPTY || video.networkState === video.NETWORK_NO_SOURCE) {
    video.load();
  }
}

function getLocalMediaProxyUrl(sourceUrl) {
  const proxyOrigin = getLocalMediaProxyOrigin();
  return `${proxyOrigin}/media-cache?url=${encodeURIComponent(sourceUrl)}`;
}

function getLocalMediaStreamUrl(sourceUrl) {
  const proxyOrigin = getLocalMediaProxyOrigin();
  return `${proxyOrigin}/media-proxy?url=${encodeURIComponent(sourceUrl)}`;
}

function getLocalMediaLiveUrl(sourceUrl, state = null) {
  const proxyOrigin = getLocalMediaProxyOrigin();
  const anchor = Math.max(0, Number(state?.startTime) || 0);
  return `${proxyOrigin}/media-live?url=${encodeURIComponent(sourceUrl)}&start=${encodeURIComponent(anchor.toFixed(3))}`;
}

function getSceneDurationSecondsForSlice(state = null) {
  const timing = getTransportTimingFromState?.();
  const barMs = Number(timing?.barMs);
  const bars = Number(state?.bars || state?.barCount || 1);
  const sceneSeconds = Number.isFinite(barMs) && barMs > 0 ? (barMs / 1000) * Math.max(1, bars || 1) : 0;
  return clamp(
    Math.max(MEDIA_SLICE_DEFAULT_DURATION_SECONDS, sceneSeconds + 4),
    MEDIA_SLICE_MIN_DURATION_SECONDS,
    MEDIA_SLICE_MAX_DURATION_SECONDS,
  );
}

function getMediaSlicePlaybackUrl(sourceUrl, state = null) {
  const anchor = Number(state?.startTime);
  if (!Number.isFinite(anchor) || anchor < 0) {
    return getLocalMediaProxyUrl(sourceUrl);
  }

  const proxyOrigin = getLocalMediaProxyOrigin();
  const duration = getSceneDurationSecondsForSlice(state);
  return `${proxyOrigin}/media-slice?url=${encodeURIComponent(sourceUrl)}&start=${encodeURIComponent(anchor.toFixed(3))}&duration=${encodeURIComponent(duration.toFixed(3))}`;
}

function getMediaSliceControlUrl(sourceUrl, state = null, action = "warm") {
  const sliceUrl = getMediaSlicePlaybackUrl(sourceUrl, state);
  if (!isMediaSlicePlaybackUrl(sliceUrl)) {
    return null;
  }

  try {
    const url = new URL(sliceUrl, window.location.href);
    url.pathname = action === "status" ? "/media-slice-status" : "/media-slice-warm";
    return url.href;
  } catch {
    return null;
  }
}

function markMediaSliceReady(sliceUrl) {
  if (!sliceUrl) {
    return;
  }

  try {
    const normalizedUrl = new URL(sliceUrl, window.location.href).href;
    mediaSliceReadyCache.add(normalizedUrl);
    mediaSliceFailedCache.delete(normalizedUrl);
  } catch {
    mediaSliceReadyCache.add(sliceUrl);
    mediaSliceFailedCache.delete(sliceUrl);
  }
}

function unmarkMediaSliceReady(sliceUrl) {
  if (!sliceUrl) {
    return;
  }

  try {
    mediaSliceReadyCache.delete(new URL(sliceUrl, window.location.href).href);
  } catch {
    mediaSliceReadyCache.delete(sliceUrl);
  }
}

function isMediaSliceReady(sliceUrl) {
  if (!sliceUrl) {
    return false;
  }

  try {
    return mediaSliceReadyCache.has(new URL(sliceUrl, window.location.href).href);
  } catch {
    return mediaSliceReadyCache.has(sliceUrl);
  }
}

function markMediaSliceFailed(sliceUrl) {
  if (!sliceUrl) {
    return;
  }

  try {
    const normalizedUrl = new URL(sliceUrl, window.location.href).href;
    mediaSliceFailedCache.add(normalizedUrl);
    mediaSliceReadyCache.delete(normalizedUrl);
  } catch {
    mediaSliceFailedCache.add(sliceUrl);
    mediaSliceReadyCache.delete(sliceUrl);
  }
}

function isMediaSliceFailed(sliceUrl) {
  if (!sliceUrl) {
    return false;
  }

  try {
    return mediaSliceFailedCache.has(new URL(sliceUrl, window.location.href).href);
  } catch {
    return mediaSliceFailedCache.has(sliceUrl);
  }
}

function requestMediaSliceWarm(sourceUrl, state = null, sliceUrl = null) {
  const playbackSliceUrl = sliceUrl || getMediaSlicePlaybackUrl(sourceUrl, state);
  if (!playbackSliceUrl || isMediaSliceReady(playbackSliceUrl) || isMediaSliceFailed(playbackSliceUrl)) {
    return;
  }

  const warmUrl = getMediaSliceControlUrl(sourceUrl, state, "warm");
  if (!warmUrl || mediaSliceWarmRequests.has(warmUrl)) {
    return;
  }

  const warmRequest = fetch(warmUrl, { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`Slice warm failed: ${response.status}`))))
    .then((payload) => {
      if (payload?.ready) {
        markMediaSliceReady(playbackSliceUrl);
        if (window.freemixRender?.updateSourceStrip) {
          window.freemixRender.updateSourceStrip();
        }
        matchingTracks.forEach((track) => window.freemixRender?.updateTrackRow?.(track));
        if (!transport?.active) {
          refreshMediaPlaybackRoutes();
        }
      }
    })
    .catch((error) => {
      console.warn(error);
    })
    .finally(() => {
      mediaSliceWarmRequests.delete(warmUrl);
      matchingTracks.forEach((track) => window.freemixRender?.updateTrackRow?.(track));
    });

  mediaSliceWarmRequests.set(warmUrl, warmRequest);
  const matchingTracks = tracks.filter((track) => {
    const renderState = getTrackRenderState(track);
    const renderSourceUrl = renderState?.source?.mediaUrl || track?.source?.mediaUrl || "";
    return renderSourceUrl === sourceUrl;
  });
  matchingTracks.forEach((track) => window.freemixRender?.updateTrackRow?.(track));
}

function isMediaSlicePlaybackUrl(sourceUrl) {
  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    return isLocalMediaProxyUrl(mediaUrl.href) && mediaUrl.pathname === "/media-slice";
  } catch {
    return false;
  }
}

function isMediaLivePlaybackUrl(sourceUrl) {
  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    return isLocalMediaProxyUrl(mediaUrl.href) && mediaUrl.pathname === "/media-live";
  } catch {
    return false;
  }
}

function getMediaSliceOriginalStart(sourceUrl) {
  if (!isMediaSlicePlaybackUrl(sourceUrl)) {
    return 0;
  }

  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    const parsed = Number(mediaUrl.searchParams.get("start"));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  } catch {
    return 0;
  }
}

function getMediaLiveOriginalStart(sourceUrl) {
  if (!isMediaLivePlaybackUrl(sourceUrl)) {
    return 0;
  }

  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    const parsed = Number(mediaUrl.searchParams.get("start"));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  } catch {
    return 0;
  }
}

function getMediaPlaybackUrl(sourceUrl, state = null) {
  if (!sourceUrl || !isRemoteHttpMediaUrl(sourceUrl) || !canUseLocalMediaProxy()) {
    if (sourceUrl && isRemoteHttpMediaUrl(sourceUrl) && !localMediaProxyAvailable) {
      checkLocalMediaProxy().then((isAvailable) => {
        if (isAvailable && window.freemixRender?.updateSourceStrip) {
          window.freemixRender.updateSourceStrip();
        }
      });
    }
    return sourceUrl || null;
  }

  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    if (isLocalMediaProxyUrl(mediaUrl.href) || mediaUrl.origin === window.location.origin) {
      return mediaUrl.href;
    }
  } catch {
    return sourceUrl;
  }

  return getLocalMediaStreamUrl(sourceUrl);
}

function getTrackPlaybackSourceUrl(track, overrideState) {
  const playbackState = getTrackPlaybackState(track, overrideState);
  if (playbackState?.source?.mediaUrl) {
    return getMediaPlaybackUrl(playbackState.source.mediaUrl, playbackState);
  }

  return isBaseTrackPlaybackState(track, playbackState) ? getMediaPlaybackUrl(track?.source?.mediaUrl, playbackState) : null;
}

function refreshMediaPlaybackRoutes() {
  if (!Array.isArray(tracks)) {
    return;
  }

  tracks.forEach((track) => {
    const video = getTrackVideo(track);
    const playbackState = getTrackPlaybackState(track) || track;
    const nextSourceUrl = getTrackPlaybackSourceUrl(track, playbackState);
    if (!video || !nextSourceUrl) {
      return;
    }

    if (mediaElementHasSource(video, nextSourceUrl)) {
      return;
    }

    disposeTrackAudio(track);
    setMediaElementSource(video, nextSourceUrl);
    setupTrackAudio(track, video, playbackState);
    applyTrackVolume(track, playbackState);
    applyTrackFx(track, playbackState);
  });
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
  applyTrackVolume(track, playbackState);
  applyTrackPitchAndSpeed(track, playbackState);
  void video.play()
    .then(async () => {
      if (Number.isFinite(tokenAtStart) && track.__playbackToken !== tokenAtStart) {
        try {
          video.pause();
        } catch {
          // Best effort: a newer trigger superseded this parked launch.
        }
        return;
      }

      applyTrackVolume(track, playbackState);
      applyTrackPitchAndSpeed(track, playbackState);
      await revealTrackAfterPresentedFrame(track, video, tokenAtStart);
    })
    .catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      if (error instanceof DOMException) {
        setStatus(`Playback failed: ${error.name}`, true);
      } else {
        setStatus("Playback failed", true);
      }
    });

  return true;
}

async function warmLaunchVideoForTransport(video, track, playbackState, sessionToken) {
  if (!video || !track || !playbackState || video.readyState < 2 || !Number.isFinite(sessionToken)) {
    return false;
  }

  try {
    video.muted = true;
    video.volume = 0;
    await video.play();
    if (startTransport.bootToken !== sessionToken) {
      return false;
    }

    safeSetCurrentTime(video, playbackState, track, { force: true });
    video.muted = true;
    video.volume = 0;
    track.__warmLaunchFor = sessionToken;
    return true;
  } catch {
    track.__warmLaunchFor = null;
    return false;
  }
}

function silenceTrackForPreroll(track, video) {
  if (video) {
    video.muted = true;
    video.volume = 0;
  }

  if (track?.audio?.output?.gain) {
    track.audio.output.gain.value = 0;
  }
}

function getClipVolumeState(track, state = track) {
  const effectiveState = state || track;
  const isMuted = !!effectiveState?.muted;
  const stateVolume = Number.isFinite(Number(effectiveState?.volume))
    ? Number(effectiveState.volume)
    : Number.isFinite(Number(track?.volume))
      ? Number(track.volume)
      : 0;
  return {
    muted: isMuted,
    volume: clamp(stateVolume, 0, 1),
  };
}

function armTrackForPrerollReveal(track, video) {
  if (video) {
    video.muted = false;
    video.volume = 0;
  }

  if (track?.audio?.output?.gain) {
    track.audio.output.gain.value = 0;
  }
}

function applyPrerollStandbyRevealVolume(track, video, state = track) {
  if (!video) {
    return;
  }

  const { muted, volume } = getClipVolumeState(track, state);
  const hasLiveAudioGraph = hasLiveTrackAudioGraph(track, video);
  if (hasLiveAudioGraph) {
    video.muted = false;
    video.volume = 1;
    if (track.audio?.output?.gain) {
      track.audio.output.gain.value = muted ? 0 : volume;
    }
    return;
  }

  video.muted = muted;
  video.volume = muted ? 0 : volume;
}

function setPlaybackVideoRole(video, role) {
  if (!video) {
    return;
  }

  const isActive = role === "active";
  video.dataset.playbackRole = isActive ? "active" : "standby";
  video.classList.toggle("is-active", isActive);
  video.classList.toggle("is-standby", !isActive);
  video.style.pointerEvents = "none";
  if (!isActive) {
    video.muted = true;
    video.volume = 0;
  }
}

function getTrackPlaybackPool(track) {
  const active = getTrackVideo(track);
  const cell = getTrackCell(track);
  if (!track || !active || !cell) {
    return { active, standby: null };
  }

  setPlaybackVideoRole(active, "active");
  let standby = track.__standbyVideoElement;
  if (!standby?.isConnected || standby.parentElement !== cell) {
    standby = cell.querySelector(`.track-video[data-playback-role="standby"][data-track-id="${track.id}"]`);
  }

  if (!standby) {
    standby = active.cloneNode(false);
    standby.removeAttribute("id");
    standby.removeAttribute("src");
    standby.className = active.className;
    standby.classList.remove("is-active");
    standby.classList.add("is-standby");
    standby.dataset.trackId = track.id;
    standby.dataset.playbackRole = "standby";
    standby.preload = "auto";
    standby.playsInline = true;
    standby.autoplay = false;
    standby.controls = false;
    standby.muted = true;
    standby.volume = 0;
    cell.insertBefore(standby, cell.querySelector(".track-badge") || null);
  }

  setPlaybackVideoRole(standby, "standby");
  track.__standbyVideoElement = standby;
  return { active, standby };
}

function getTrackStandbyVideo(track) {
  return getTrackPlaybackPool(track).standby;
}

function silenceInactivePlaybackVideo(video) {
  if (!video) {
    return;
  }

  video.muted = true;
  video.volume = 0;
  try {
    video.pause();
  } catch {
    // Best effort: inactive media must not contribute audio.
  }
}

function activateTrackPlaybackVideo(track, nextVideo, state = track) {
  const currentVideo = getTrackVideo(track);
  if (!track || !nextVideo || currentVideo === nextVideo) {
    if (nextVideo) {
      setPlaybackVideoRole(nextVideo, "active");
      track.__activeVideoElement = nextVideo;
      track.__cacheVideoElement = nextVideo;
      applyPrerollStandbyRevealVolume(track, nextVideo, state);
    }
    return nextVideo || currentVideo || null;
  }

  if (currentVideo) {
    const currentId = currentVideo.id;
    silenceInactivePlaybackVideo(currentVideo);
    if (currentId) {
      currentVideo.removeAttribute("id");
      nextVideo.id = currentId;
    }
    setPlaybackVideoRole(currentVideo, "standby");
    track.__standbyVideoElement = currentVideo;
    if (track.audio?.mediaElement === currentVideo) {
      disposeTrackAudio(track);
    }
  }

  setPlaybackVideoRole(nextVideo, "active");
  nextVideo.dataset.trackId = track.id;
  track.__activeVideoElement = nextVideo;
  track.__cacheVideoElement = nextVideo;
  if (track.__standbyVideoElement === nextVideo) {
    track.__standbyVideoElement = currentVideo || null;
  }
  setupTrackAudio(track, nextVideo, state);
  applyPrerollStandbyRevealVolume(track, nextVideo, state);
  applyTrackFx(track, state);
  applyVideoFx(track, state);
  applyTrackBlend(track, state);
  applyTrackOpacity(track, state);
  applyTrackPitchAndSpeed(track, state);
  return nextVideo;
}

function removeTrackPrerollStandby(track) {
  const standby = track?.__prerollStandbyVideo;
  const pooledStandby = track?.__standbyVideoElement;

  [standby, pooledStandby].forEach((video) => {
    if (!video) {
      return;
    }

    try {
      video.pause();
    } catch {
      // Best effort cleanup.
    }

    setPlaybackVideoRole(video, "standby");
  });

  track.__preparedPlaybackVideo = null;
  track.__preparedPlaybackSignature = null;
  track.__prerollStandbyVideo = null;
}

function waitForVideoPlaybackAdvance(video, referenceTime, minAdvanceSeconds = 0.018, timeoutMs = ARRANGEMENT_PREROLL_ADVANCE_CONFIRM_MS) {
  if (!video || !Number.isFinite(referenceTime)) {
    return Promise.resolve(false);
  }

  if (!video.paused && video.currentTime >= referenceTime + minAdvanceSeconds) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const startedAt = performance.now();
    const check = () => {
      if (!video.paused && !video.ended && video.currentTime >= referenceTime + minAdvanceSeconds) {
        resolve(true);
        return;
      }

      if (performance.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }

      window.requestAnimationFrame(check);
    };

    check();
  });
}

function waitForPresentedVideoFrame(video, options = {}) {
  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : ARRANGEMENT_PREROLL_ADVANCE_CONFIRM_MS;
  const minMediaTime = Number.isFinite(Number(options.minMediaTime)) ? Number(options.minMediaTime) : null;

  if (!video || typeof video.requestVideoFrameCallback !== "function") {
    return Promise.resolve({
      mediaTime: Number.isFinite(Number(video?.currentTime)) ? Number(video.currentTime) : 0,
      presentedFrames: Number(video?.webkitDecodedFrameCount || 0),
      fallback: true,
    });
  }

  return new Promise((resolve) => {
    let resolved = false;
    const timeoutId = window.setTimeout(() => {
      if (resolved) {
        return;
      }

      resolved = true;
      resolve({
        mediaTime: Number.isFinite(Number(video.currentTime)) ? Number(video.currentTime) : 0,
        presentedFrames: Number(video.webkitDecodedFrameCount || 0),
        timeout: true,
      });
    }, timeoutMs);

    const onFrame = (_now, metadata) => {
      if (resolved) {
        return;
      }

      const mediaTime = Number(metadata?.mediaTime);
      if (minMediaTime !== null && Number.isFinite(mediaTime) && mediaTime < minMediaTime) {
        video.requestVideoFrameCallback(onFrame);
        return;
      }

      resolved = true;
      window.clearTimeout(timeoutId);
      resolve({
        mediaTime: Number.isFinite(mediaTime) ? mediaTime : Number(video.currentTime) || 0,
        presentedFrames: Number(metadata?.presentedFrames || video.webkitDecodedFrameCount || 0),
      });
    };

    video.requestVideoFrameCallback(onFrame);
  });
}

async function burnInArrangementPrerollTargets(preparedTargets, sessionToken, durationMs = ARRANGEMENT_COLD_START_BURN_IN_MS) {
  if (!Array.isArray(preparedTargets) || preparedTargets.length === 0 || startTransport.bootToken !== sessionToken) {
    return false;
  }

  preparedTargets.forEach(({ track, video, clip }) => {
    setTrackBlackout(track, true);
    silenceTrackForPreroll(track, video);
    safeSetCurrentTime(video, clip, track, { force: true });
  });

  await Promise.all(
    preparedTargets.map(({ video, clip }) => awaitVideoSeek(video, safeStartTime(clip, video))),
  );

  if (startTransport.bootToken !== sessionToken) {
    return false;
  }

  await Promise.all(
    preparedTargets.map(async ({ track, video }) => {
      silenceTrackForPreroll(track, video);
      try {
        await video.play();
      } catch {
        return false;
      }

      return waitForPresentedVideoFrame(video, {
        timeoutMs: ARRANGEMENT_PREROLL_ADVANCE_CONFIRM_MS,
      });
    }),
  );

  if (startTransport.bootToken !== sessionToken) {
    return false;
  }

  const startedAt = performance.now();
  await Promise.all(
    preparedTargets.map(
      ({ video }) =>
        new Promise((resolve) => {
          const hasDecodedFrameCounter = "webkitDecodedFrameCount" in video;
          const startFrames = Number(video.webkitDecodedFrameCount || 0);
          const check = () => {
            const elapsed = performance.now() - startedAt;
            const decodedFrames = Number(video.webkitDecodedFrameCount || 0) - startFrames;
            if (
              (elapsed >= durationMs && (!hasDecodedFrameCounter || decodedFrames >= ARRANGEMENT_COLD_START_BURN_IN_MIN_FRAMES)) ||
              startTransport.bootToken !== sessionToken
            ) {
              resolve(true);
              return;
            }

            window.requestAnimationFrame(check);
          };
          check();
        }),
    ),
  );

  preparedTargets.forEach(({ track, video }) => {
    silenceTrackForPreroll(track, video);
  });

  return startTransport.bootToken === sessionToken;
}

function getArrangementPrerollClipTargets(stepIndex = arrangement?.step) {
  if (!arrangement.enabled || !hasArrangementClips()) {
    return [];
  }

  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return [];
  }

  return tracks
    .map((track) => {
      const clip = getArrangementStepClip(track, resolvedStep);
      const sourceUrl = getTrackPlaybackSourceUrl(track, clip);
      return clip && sourceUrl ? { track, clip, sourceUrl } : null;
    })
    .filter(Boolean);
}

function getPrerollStartState(clip, video, leadMs = ARRANGEMENT_START_PREROLL_MS) {
  const anchorTime = safeStartTime(clip, video);
  if (!Number.isFinite(anchorTime)) {
    return null;
  }

  const speed = Math.max(0.1, Math.abs(Number(clip?.speed) || 1));
  const mediaLeadSeconds = (Math.max(0, leadMs) / 1000) * speed;
  const startTime = Math.max(0, anchorTime - mediaLeadSeconds);

  return {
    state: {
      ...clip,
      startTime,
    },
    anchorTime,
    exact: anchorTime - startTime >= Math.min(mediaLeadSeconds, 0.025),
  };
}

function getPrerollStateForLead(clip, video, leadMs) {
  const anchorTime = safeStartTime(clip, video);
  if (!Number.isFinite(anchorTime)) {
    return null;
  }

  const speed = Math.max(0.1, Math.abs(Number(clip?.speed) || 1));
  const mediaLeadSeconds = (Math.max(0, leadMs) / 1000) * speed;
  const startTime = Math.max(0, anchorTime - mediaLeadSeconds);

  return {
    state: {
      ...clip,
      startTime,
    },
    anchorTime,
    exact: anchorTime - startTime >= Math.min(mediaLeadSeconds, 0.025),
  };
}

async function prepareArrangementStartPreroll(sessionToken, leadMs = ARRANGEMENT_START_PREROLL_MS) {
  const targets = getArrangementPrerollClipTargets(arrangement.step);
  if (!Number.isFinite(sessionToken) || targets.length === 0) {
    return null;
  }

  const preparedTargets = (
    await Promise.all(
      targets.map(async ({ track, clip, sourceUrl }) => {
        const video = ensureTrackVideoElementForPlayback(track, clip);
        if (!video) {
          return null;
        }

        removeTrackPrerollStandby(track);
        track.__preparedPlaybackVideo = null;
        track.__preparedPlaybackSignature = null;
        track.__warmLaunchFor = null;
        track.__prerollRevealFor = null;
        track.__prerollPlaybackSignature = null;
        track.__prerollRevealCanSkipSeek = false;
        if (!mediaElementHasSource(video, sourceUrl)) {
          track.__parkedAtAnchorFor = null;
          track.__parkedPlaybackSignature = null;
          setMediaElementSource(video, sourceUrl);
        }

        loadMediaElementOnlyIfEmpty(video);

        await waitForTrackReady(video);
        if (startTransport.bootToken !== sessionToken) {
          return null;
        }

        const anchorTime = safeStartTime(clip, video);
        if (!Number.isFinite(anchorTime)) {
          return null;
        }

        setupTrackAudio(track, video, clip);
        applyTrackFx(track, clip);
        applyVideoFx(track, clip);
        applyTrackBlend(track, clip);
        applyTrackOpacity(track, clip);
        applyTrackPitchAndSpeed(track, clip);
        applyVideoPitchAndSpeed(video, clip);

        armTrackForPrerollReveal(track, video);
        return {
          track,
          clip,
          video,
          sourceUrl,
          anchorTime,
          exact: true,
        };
      }),
    )
  ).filter(Boolean);

  if (startTransport.bootToken !== sessionToken || preparedTargets.length === 0) {
    return null;
  }

  setStatus("Arming clips...");
  await burnInArrangementPrerollTargets(preparedTargets, sessionToken);
  if (startTransport.bootToken !== sessionToken) {
    return null;
  }

  const requestedLeadMs = Math.max(ARRANGEMENT_PREROLL_REVEAL_ADVANCE_MS + 16, Math.min(leadMs, ARRANGEMENT_FINAL_PREROLL_LEAD_MS));
  const startLeadMs = preparedTargets.reduce((lead, { clip, anchorTime }) => {
    const speed = Math.max(0.1, Math.abs(Number(clip?.speed) || 1));
    const maxLeadForAnchor = (Math.max(0, anchorTime) / speed) * 1000;
    return Math.min(lead, maxLeadForAnchor);
  }, requestedLeadMs);

  preparedTargets.forEach((target) => {
    if (!Number.isFinite(target.anchorTime)) {
      return;
    }

    const speed = Math.max(0.1, Math.abs(Number(target.clip?.speed) || 1));
    const startTime = Math.max(0, target.anchorTime - (startLeadMs / 1000) * speed);
    target.prerollState = {
      ...target.clip,
      startTime,
    };
    armTrackForPrerollReveal(target.track, target.video);
    applyVideoPitchAndSpeed(target.video, target.clip);
    safeSetCurrentTime(target.video, target.prerollState, target.track, { force: true });
  });

  await Promise.all(
    preparedTargets.map(({ video, prerollState }) => awaitVideoSeek(video, safeStartTime(prerollState, video))),
  );

  if (startTransport.bootToken !== sessionToken) {
    return null;
  }

  await Promise.all(
    preparedTargets.map(async ({ track, video, prerollState }) => {
      const prerollStartTime = safeStartTime(prerollState, video);
      try {
        await video.play();
      } catch {
        return false;
      }

      armTrackForPrerollReveal(track, video);
      await waitForVideoPlaybackAdvance(video, prerollStartTime, 0.012, ARRANGEMENT_PREROLL_ADVANCE_CONFIRM_MS);
      return waitForPresentedVideoFrame(video, {
        minMediaTime: prerollStartTime + 0.006,
        timeoutMs: ARRANGEMENT_PREROLL_ADVANCE_CONFIRM_MS,
      });
    }),
  );

  if (startTransport.bootToken !== sessionToken) {
    return null;
  }

  preparedTargets.forEach(({ track, video, prerollState }) => {
    armTrackForPrerollReveal(track, video);
    safeSetCurrentTime(video, prerollState, track, { force: true });
  });

  await Promise.all(
    preparedTargets.map(({ video, prerollState }) => awaitVideoSeek(video, safeStartTime(prerollState, video))),
  );

  if (startTransport.bootToken !== sessionToken) {
    return null;
  }

  await Promise.all(
    preparedTargets.map(async ({ track, video }) => {
      try {
        await video.play();
      } catch {
        return false;
      }

      armTrackForPrerollReveal(track, video);
      return true;
    }),
  );

  if (startTransport.bootToken !== sessionToken) {
    return null;
  }

  preparedTargets.forEach(({ track, video, clip, sourceUrl }) => {
    armTrackForPrerollReveal(track, video);
    track.__warmLaunchFor = sessionToken;
    track.__prerollRevealFor = sessionToken;
    track.__prerollPlaybackSignature = getPlaybackStateSignature(clip, sourceUrl);
    track.__prerollRevealCanSkipSeek = true;
    track.__preparedPlaybackVideo = video;
    track.__preparedPlaybackSignature = getPlaybackStateSignature(clip, sourceUrl);
  });

  return performance.now() + Math.max(ARRANGEMENT_PREROLL_REVEAL_ADVANCE_MS + 8, startLeadMs);
}

function clearArrangementPrerollRevealTimer() {
  if (arrangementPrerollRevealTimer !== null) {
    window.clearTimeout(arrangementPrerollRevealTimer);
    arrangementPrerollRevealTimer = null;
  }
}

function revealArrangementPreroll(sessionToken) {
  if (!transport?.active || transport.sessionToken !== sessionToken || startTransport.bootToken !== sessionToken) {
    return;
  }

  const resolvedStep = getArrangementStepIndex(arrangement.step);
  if (resolvedStep === null) {
    return;
  }

  tracks.forEach((track) => {
    if (track.__prerollRevealFor !== sessionToken) {
      return;
    }

    const clip = getArrangementStepClip(track, resolvedStep);
    const sourceUrl = getTrackPlaybackSourceUrl(track, clip);
    if (!clip || !sourceUrl) {
      return;
    }

    const video = getTrackVideo(track);
    const playbackSignature = getPlaybackStateSignature(clip, sourceUrl);
    const canOpenPreparedVideo =
      video &&
      video.readyState >= 1 &&
      !video.paused &&
      !video.ended &&
      mediaElementHasSource(video, sourceUrl) &&
      track.__prerollPlaybackSignature === playbackSignature &&
      track.__prerollRevealCanSkipSeek;

    const revealState = isPianoRollTimingState(clip)
      ? clip
      : getRetriggerPlaybackStateForPulse(track, clip, 0, getTransportBeatsPerBar(transport), getTransportBeatMs(transport));

    if (canOpenPreparedVideo && !isPianoRollTimingState(clip)) {
      applyTrackVolume(track, revealState);
      applyTrackFx(track, revealState);
      applyVideoFx(track, revealState);
      applyTrackBlend(track, revealState);
      applyTrackOpacity(track, revealState);
      applyTrackPitchAndSpeed(track, revealState);
      void revealTrackAfterPresentedFrame(track, video, track.__playbackToken);
      track.__lastPlaybackSignature = playbackSignature;
      track.__warmLaunchFor = null;
      track.__prerollRevealFor = null;
      track.__prerollPlaybackSignature = null;
      track.__prerollRevealCanSkipSeek = false;
      track.__parkedAtAnchorFor = null;
      track.__parkedPlaybackSignature = null;
      flashTrackTrigger(track);
    } else {
      if (!isPianoRollTimingState(clip)) {
        triggerTrack(track, revealState, sessionToken);
      }
    }

    track.__lastRetriggerPulse = 0;
    track.__lastTransportClockCorrectionAt = 0;
    track.__lastTransportClockCorrectionPulse = null;
    if (Number.isFinite(Number(track.stepMs)) && track.stepMs > 0 && Number.isFinite(Number(transport.startedAt))) {
      track.__transportClockCorrectionPulse = 0;
      track.__transportClockCorrectionUntil = transport.startedAt + TRANSPORT_CLOCK_CORRECTION_MAX_WINDOW_MS;
      track.nextTriggerAt = transport.startedAt + track.stepMs;
    }
  });
}

function scheduleArrangementPrerollReveal(sessionToken, startAt) {
  clearArrangementPrerollRevealTimer();
  if (!Number.isFinite(sessionToken) || !Number.isFinite(startAt)) {
    return;
  }

  const revealAt = startAt - ARRANGEMENT_PREROLL_REVEAL_ADVANCE_MS;
  const delayMs = Math.max(0, revealAt - ARRANGEMENT_PREROLL_REVEAL_TIMER_LEAD_MS - performance.now());
  arrangementPrerollRevealTimer = window.setTimeout(() => {
    arrangementPrerollRevealTimer = null;
    if (!transport?.active || transport.sessionToken !== sessionToken || startTransport.bootToken !== sessionToken) {
      return;
    }

    revealArrangementPreroll(sessionToken);
  }, delayMs);
}

function clearTrackArrangementLookahead(track) {
  if (!track) {
    return;
  }

  track.__lookaheadPrerollFor = null;
  track.__lookaheadPrerollStep = null;
  track.__lookaheadPrerollBarStartAt = null;
  track.__lookaheadPrerollSignature = null;
  track.__lookaheadPrerollKey = null;
  track.__lookaheadRevealedFor = null;
  track.__lookaheadRevealedStep = null;
  track.__lookaheadRevealedBarStartAt = null;
  track.__lookaheadRevealedPulse = null;
  track.__lookaheadRetryCount = 0;
}

function clearArrangementLookaheadPreroll(clearTracks = false) {
  if (arrangementLookaheadRevealTimer !== null) {
    window.clearTimeout(arrangementLookaheadRevealTimer);
    arrangementLookaheadRevealTimer = null;
  }
  arrangementLookaheadRevealTimers.forEach((timerId) => {
    window.clearTimeout(timerId);
  });
  arrangementLookaheadRevealTimers.clear();
  arrangementLookaheadPrepareKeys.clear();
  arrangementLookaheadPrepareKey = null;
  arrangementLookaheadPreparePromise = null;
  if (clearTracks) {
    tracks.forEach(clearTrackArrangementLookahead);
  }
}

function setTrackLookaheadStatus(track, status, details = {}) {
  if (!track) {
    return;
  }

  track.__lookaheadStatus = {
    status,
    at: performance.now(),
    ...details,
  };
}

function getNextArrangementStepStart(currentElapsedBars, barMs) {
  if (!transport?.active || !Number.isFinite(Number(barMs)) || barMs <= 0) {
    return null;
  }

  const arrangementLength = arrangement?.clips?.length || 0;
  if (!arrangementLength) {
    return null;
  }

  const nextElapsedBars = Math.max(0, Math.floor(Number(currentElapsedBars)) + 1);
  return {
    elapsedBars: nextElapsedBars,
    step: (transport.arrangementStartStep + nextElapsedBars) % arrangementLength,
    startAt: transport.startedAt + nextElapsedBars * barMs,
  };
}

function getArrangementLookaheadKey(stepIndex, barStartAt, sessionToken) {
  return `${sessionToken}:${stepIndex}:${Math.round(barStartAt)}`;
}

function scheduleArrangementLookaheadReveal(stepIndex, barStartAt, sessionToken) {
  if (!Number.isFinite(sessionToken) || !Number.isFinite(barStartAt)) {
    return;
  }

  const timerKey = getArrangementLookaheadKey(stepIndex, barStartAt, sessionToken);
  const existingTimer = arrangementLookaheadRevealTimers.get(timerKey);
  if (existingTimer !== undefined) {
    window.clearTimeout(existingTimer);
  }

  const delayMs = Math.max(0, barStartAt - performance.now());
  const nextTimer = window.setTimeout(() => {
    arrangementLookaheadRevealTimers.delete(timerKey);
    if (arrangementLookaheadRevealTimer === nextTimer) {
      arrangementLookaheadRevealTimer = null;
    }
    revealArrangementLookaheadPreroll(stepIndex, barStartAt, sessionToken);
  }, delayMs);
  arrangementLookaheadRevealTimers.set(timerKey, nextTimer);
  arrangementLookaheadRevealTimer = nextTimer;
}

function revealArrangementLookaheadPreroll(stepIndex, barStartAt, sessionToken) {
  if (!transport?.active || transport.sessionToken !== sessionToken || startTransport.bootToken !== sessionToken) {
    return false;
  }

  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return false;
  }

  let revealedAny = false;
  tracks.forEach((track) => {
    if (
      track.__lookaheadPrerollFor !== sessionToken ||
      track.__lookaheadPrerollStep !== resolvedStep ||
      !almostEqual(Number(track.__lookaheadPrerollBarStartAt), barStartAt, 2)
    ) {
      return;
    }

    const clip = getArrangementStepClip(track, resolvedStep);
    const sourceUrl = getTrackPlaybackSourceUrl(track, clip);
    const video = getTrackVideo(track);
    const playbackSignature = getPlaybackStateSignature(clip, sourceUrl);
    const revealAt = performance.now();
    const canRevealPreparedVideo =
      clip &&
      sourceUrl &&
      video &&
      video.readyState >= 1 &&
      !video.paused &&
      !video.ended &&
      mediaElementHasSource(video, sourceUrl) &&
      track.__lookaheadPrerollSignature === playbackSignature;

    if (!canRevealPreparedVideo) {
      setTrackLookaheadStatus(track, "fallback", {
        scene: resolvedStep + 1,
        targetInMs: Math.round(barStartAt - revealAt),
        reason: "not-ready-at-reveal",
      });
      clearTrackArrangementLookahead(track);
      if (clip && sourceUrl && !isPianoRollTimingState(clip)) {
        const revealState = getRetriggerPlaybackStateForPulse(
          track,
          clip,
          0,
          getTransportBeatsPerBar(transport),
          getTransportBeatMs(transport),
        );
        triggerTrack(track, revealState, sessionToken);
      }
      return;
    }

    const revealState = isPianoRollTimingState(clip)
      ? clip
      : getRetriggerPlaybackStateForPulse(track, clip, 0, getTransportBeatsPerBar(transport), getTransportBeatMs(transport));
    setupTrackAudio(track, video, revealState);
    applyTrackVolume(track, revealState);
    applyTrackFx(track, revealState);
    applyVideoFx(track, revealState);
    applyTrackBlend(track, revealState);
    applyTrackOpacity(track, revealState);
    applyTrackPitchAndSpeed(track, revealState);
    applyVideoPitchAndSpeed(video, revealState);
    if (!isPianoRollTimingState(clip)) {
      void revealTrackAfterPresentedFrame(track, video, track.__playbackToken);
    }

    const pulseIndex = getTrackPulseIndex(track, barStartAt);
    track.__lastPlaybackSignature = playbackSignature;
    track.__transportPrimedFor = sessionToken;
    track.__lastRetriggerPulse = Number.isFinite(Number(pulseIndex)) ? pulseIndex : track.__lastRetriggerPulse;
    if (Number.isFinite(Number(track.stepMs)) && track.stepMs > 0) {
      track.nextTriggerAt = barStartAt + track.stepMs;
      track.__transportClockCorrectionPulse = Number.isFinite(Number(pulseIndex)) ? pulseIndex : null;
      track.__transportClockCorrectionUntil = barStartAt + TRANSPORT_CLOCK_CORRECTION_MAX_WINDOW_MS;
    }

    track.__lookaheadRevealedFor = sessionToken;
    track.__lookaheadRevealedStep = resolvedStep;
    track.__lookaheadRevealedBarStartAt = barStartAt;
    track.__lookaheadRevealedPulse = pulseIndex;
    setTrackLookaheadStatus(track, "revealed", {
      scene: resolvedStep + 1,
      targetInMs: Math.round(barStartAt - revealAt),
      currentTime: Number(video.currentTime.toFixed(3)),
      anchor: Number((clip?.startTime || 0).toFixed?.(3) || clip?.startTime || 0),
    });
    track.__lookaheadPrerollFor = null;
    track.__lookaheadPrerollStep = null;
    track.__lookaheadPrerollBarStartAt = null;
    track.__lookaheadPrerollSignature = null;
    track.__lookaheadPrerollKey = null;
    flashTrackTrigger(track);
    revealedAny = true;
  });

  return revealedAny;
}

async function prepareArrangementLookaheadTarget(track, clip, sourceUrl, stepIndex, barStartAt, sessionToken, lookaheadKey) {
  const video = ensureTrackVideoElementForPlayback(track, clip);
  if (!video) {
    return false;
  }

  const failLookahead = (reason = "failed") => {
    const retryCount = Number(track.__lookaheadRetryCount) || 0;
    const remainingMs = barStartAt - performance.now();
    setTrackLookaheadStatus(track, "failed", {
      scene: stepIndex + 1,
      targetInMs: Math.round(remainingMs),
      reason,
      retries: retryCount,
    });
    clearTrackArrangementLookahead(track);
    if (
      startTransport.bootToken === sessionToken &&
      transport?.active &&
      transport.sessionToken === sessionToken &&
      remainingMs > ARRANGEMENT_STEP_LOOKAHEAD_MIN_MS + ARRANGEMENT_LOOKAHEAD_RETRY_DELAY_MS &&
      retryCount < ARRANGEMENT_LOOKAHEAD_MAX_RETRIES
    ) {
      track.__lookaheadRetryCount = retryCount + 1;
      setTrackLookaheadStatus(track, "retrying", {
        scene: stepIndex + 1,
        targetInMs: Math.round(remainingMs),
        reason,
        retries: retryCount + 1,
      });
      window.setTimeout(() => {
        if (
          startTransport.bootToken !== sessionToken ||
          !transport?.active ||
          transport.sessionToken !== sessionToken ||
          performance.now() >= barStartAt
        ) {
          return;
        }

        void prepareArrangementLookaheadTarget(track, clip, sourceUrl, stepIndex, barStartAt, sessionToken, lookaheadKey)
          .then((prepared) => {
            if (prepared) {
              scheduleArrangementLookaheadReveal(stepIndex, barStartAt, sessionToken);
            }
          })
          .catch((error) => {
            console.warn(error);
          });
      }, ARRANGEMENT_LOOKAHEAD_RETRY_DELAY_MS);
    }
    return false;
  };
  setTrackLookaheadStatus(track, "loading", {
    scene: stepIndex + 1,
    targetInMs: Math.round(barStartAt - performance.now()),
    source: sourceUrl,
  });
  track.__lookaheadPrerollFor = sessionToken;
  track.__lookaheadPrerollStep = stepIndex;
  track.__lookaheadPrerollBarStartAt = barStartAt;
  track.__lookaheadPrerollSignature = null;
  track.__lookaheadPrerollKey = lookaheadKey;

  setTrackBlackout(track, true);
  if (!mediaElementHasSource(video, sourceUrl)) {
    track.__parkedAtAnchorFor = null;
    track.__parkedPlaybackSignature = null;
    setMediaElementSource(video, sourceUrl);
  }

  loadMediaElementOnlyIfEmpty(video);

  await waitForTrackReady(video);
  if (startTransport.bootToken !== sessionToken || performance.now() >= barStartAt) {
    return failLookahead("ready-timeout");
  }

  setupTrackAudio(track, video, clip);
  applyTrackFx(track, clip);
  applyVideoFx(track, clip);
  applyTrackBlend(track, clip);
  applyTrackOpacity(track, clip);
  applyTrackPitchAndSpeed(track, clip);
  applyVideoPitchAndSpeed(video, clip);
  silenceTrackForPreroll(track, video);
  setTrackLookaheadStatus(track, "seeking", {
    scene: stepIndex + 1,
    targetInMs: Math.round(barStartAt - performance.now()),
    anchor: Number(clip?.startTime || 0),
  });
  safeSetCurrentTime(video, clip, track, { force: true });
  await awaitVideoSeek(video, safeStartTime(clip, video), Math.max(ARRANGEMENT_STEP_LOOKAHEAD_MIN_MS, Math.min(AV_READY_TIMEOUT_MS, barStartAt - performance.now())));

  if (startTransport.bootToken !== sessionToken || performance.now() >= barStartAt) {
    return failLookahead("initial-seek-late");
  }

  try {
    await video.play();
  } catch {
    return failLookahead("warm-play-failed");
  }

  setTrackLookaheadStatus(track, "decoding", {
    scene: stepIndex + 1,
    targetInMs: Math.round(barStartAt - performance.now()),
    currentTime: Number(video.currentTime.toFixed(3)),
  });
  silenceTrackForPreroll(track, video);
  await Promise.race([
    waitForPresentedVideoFrame(video, { timeoutMs: ARRANGEMENT_PREROLL_ADVANCE_CONFIRM_MS }),
    waitForVideoPlaybackAdvance(video, video.currentTime, 0.008, ARRANGEMENT_PREROLL_ADVANCE_CONFIRM_MS),
  ]);

  if (startTransport.bootToken !== sessionToken || performance.now() >= barStartAt) {
    return failLookahead("decode-late");
  }

  try {
    video.pause();
  } catch {
    // Best effort: the final timed preroll below will restore playback.
  }

  const anchorTime = safeStartTime(clip, video);
  if (!Number.isFinite(anchorTime)) {
    return failLookahead("bad-anchor");
  }

  const speed = Math.max(0.1, Math.abs(Number(clip?.speed) || 1));
  const remainingMs = Math.max(0, barStartAt - performance.now());
  const maxLeadForAnchorMs = (Math.max(0, anchorTime) / speed) * 1000;
  const noPreAnchorRoom = maxLeadForAnchorMs <= 1;
  const finalLeadMs = Math.max(
    0,
    Math.min(
      remainingMs - 24,
      noPreAnchorRoom ? 72 : ARRANGEMENT_FINAL_PREROLL_LEAD_MS,
      noPreAnchorRoom ? 72 : maxLeadForAnchorMs,
    ),
  );
  const finalStartTime = Math.max(0, anchorTime - (finalLeadMs / 1000) * speed);
  const finalPrerollState = {
    ...clip,
    startTime: finalStartTime,
  };
  setTrackLookaheadStatus(track, "arming", {
    scene: stepIndex + 1,
    targetInMs: Math.round(barStartAt - performance.now()),
    anchor: Number(anchorTime.toFixed(3)),
    finalLeadMs: Math.round(finalLeadMs),
    finalStartTime: Number(finalStartTime.toFixed(3)),
  });
  silenceTrackForPreroll(track, video);
  safeSetCurrentTime(video, finalPrerollState, track, { force: true });
  await awaitVideoSeek(video, finalStartTime, Math.max(ARRANGEMENT_STEP_LOOKAHEAD_MIN_MS, Math.min(AV_READY_TIMEOUT_MS, barStartAt - performance.now() + 120)));

  if (startTransport.bootToken !== sessionToken || performance.now() >= barStartAt + 16) {
    return failLookahead("final-seek-late");
  }

  const launchAt = barStartAt - finalLeadMs;
  const waitMs = Math.max(0, launchAt - performance.now());
  if (waitMs > 0) {
    await new Promise((resolve) => {
      window.setTimeout(resolve, waitMs);
    });
  }

  if (startTransport.bootToken !== sessionToken || performance.now() >= barStartAt + 16) {
    return failLookahead("launch-late");
  }

  silenceTrackForPreroll(track, video);
  try {
    await video.play();
  } catch {
    return failLookahead("timed-play-failed");
  }

  silenceTrackForPreroll(track, video);
  track.__transportPrimedFor = sessionToken;
  track.__lookaheadPrerollFor = sessionToken;
  track.__lookaheadPrerollStep = stepIndex;
  track.__lookaheadPrerollBarStartAt = barStartAt;
  track.__lookaheadPrerollSignature = getPlaybackStateSignature(clip, sourceUrl);
  track.__lookaheadPrerollKey = lookaheadKey;
  setTrackLookaheadStatus(track, "armed", {
    scene: stepIndex + 1,
    targetInMs: Math.round(barStartAt - performance.now()),
    anchor: Number(anchorTime.toFixed(3)),
    finalLeadMs: Math.round(finalLeadMs),
    currentTime: Number(video.currentTime.toFixed(3)),
    retries: Number(track.__lookaheadRetryCount) || 0,
  });
  return true;
}

function prepareUpcomingArrangementStepPreroll(stepIndex, barStartAt, sessionToken, options = {}) {
  if (!transport?.active || transport.sessionToken !== sessionToken || startTransport.bootToken !== sessionToken) {
    return;
  }

  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null || !Number.isFinite(Number(barStartAt))) {
    return;
  }

  const timeUntilStepMs = barStartAt - performance.now();
  const allowEarly = !!options.allowEarly;
  if (timeUntilStepMs < ARRANGEMENT_STEP_LOOKAHEAD_MIN_MS || (!allowEarly && timeUntilStepMs > ARRANGEMENT_STEP_LOOKAHEAD_MS)) {
    return;
  }

  const lookaheadKey = getArrangementLookaheadKey(resolvedStep, barStartAt, sessionToken);
  if (arrangementLookaheadPrepareKeys.has(lookaheadKey)) {
    return;
  }

  const currentStep = getArrangementStepIndex(transport.arrangementStep);
  const targets = tracks
    .map((track) => {
      const currentClip = currentStep === null ? null : getArrangementStepClip(track, currentStep);
      const currentSourceUrl = currentClip?.source?.mediaUrl || null;
      const nextClip = getArrangementStepClip(track, resolvedStep);
      const nextSourceUrl = nextClip?.source?.mediaUrl || getTrackPlaybackSourceUrl(track, nextClip);
      if (
        !nextClip ||
        !nextSourceUrl ||
        currentSourceUrl ||
        track.__lookaheadPrerollFor === sessionToken ||
        track.__lookaheadPrerollKey === lookaheadKey
      ) {
        return null;
      }

      return { track, clip: nextClip, sourceUrl: nextSourceUrl };
    })
    .filter(Boolean);

  if (!targets.length) {
    return;
  }

  arrangementLookaheadPrepareKey = lookaheadKey;
  arrangementLookaheadPrepareKeys.add(lookaheadKey);
  arrangementLookaheadPreparePromise = Promise.all(
    targets.map(({ track, clip, sourceUrl }) =>
      prepareArrangementLookaheadTarget(track, clip, sourceUrl, resolvedStep, barStartAt, sessionToken, lookaheadKey),
    ),
  )
    .then((results) => {
      if (
        startTransport.bootToken === sessionToken &&
        transport?.active &&
        transport.sessionToken === sessionToken &&
        results.some(Boolean)
      ) {
        scheduleArrangementLookaheadReveal(resolvedStep, barStartAt, sessionToken);
      }
    })
    .catch((error) => {
      console.warn(error);
    })
    .finally(() => {
      arrangementLookaheadPrepareKeys.delete(lookaheadKey);
      if (arrangementLookaheadPrepareKey === lookaheadKey) {
        arrangementLookaheadPrepareKey = null;
        arrangementLookaheadPreparePromise = null;
      }
    });
}

function prepareInitialFutureArrangementEntrances(sessionToken, startAt, barMs) {
  if (
    !arrangement.enabled ||
    !hasArrangementClips() ||
    !transport?.active ||
    transport.sessionToken !== sessionToken ||
    !Number.isFinite(Number(startAt)) ||
    !Number.isFinite(Number(barMs)) ||
    barMs <= 0
  ) {
    return;
  }

  const arrangementLength = arrangement?.clips?.length || 0;
  const startStep = getArrangementStepIndex(arrangement.step);
  if (!arrangementLength || startStep === null) {
    return;
  }

  tracks.forEach((track) => {
    const startingClip = getArrangementStepClip(track, startStep);
    const startingSourceUrl = startingClip?.source?.mediaUrl || null;
    if (startingSourceUrl) {
      return;
    }

    for (let offset = 1; offset <= arrangementLength; offset += 1) {
      const futureStep = (startStep + offset) % arrangementLength;
      const futureClip = getArrangementStepClip(track, futureStep);
      const futureSourceUrl = futureClip?.source?.mediaUrl || null;
      if (!futureSourceUrl) {
        continue;
      }

      const futureStartAt = startAt + offset * barMs;
      setTrackLookaheadStatus(track, "queued", {
        scene: futureStep + 1,
        targetInMs: Math.round(futureStartAt - performance.now()),
        source: futureSourceUrl,
      });
      prepareUpcomingArrangementStepPreroll(futureStep, futureStartAt, sessionToken, { allowEarly: true });
      break;
    }
  });
}

function shouldDisableWebAudioForSource(sourceUrl) {
  if (!sourceUrl) {
    return true;
  }

  try {
    const mediaUrl = new URL(sourceUrl, window.location.href);
    if (isLocalMediaProxyUrl(mediaUrl.href)) {
      return false;
    }

    if (mediaUrl.protocol === "blob:" || mediaUrl.protocol === "data:" || mediaUrl.protocol === "file:") {
      return false;
    }

    if (!mediaUrl.protocol.startsWith("http")) {
      return false;
    }

    const isUnknownOrigin = window.location?.origin === "null" || !window.location?.origin;
    if (window.location?.protocol === "file:" || isUnknownOrigin) {
      return true;
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

  const rawSourceUrl = getTrackPlaybackSourceUrl(track, playbackState);
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

function isArrangementTextClipSelected(stepIndex) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  return resolvedStep !== null && (
    selectedTextClipStep === resolvedStep ||
    selectedTextClipSteps.has(resolvedStep) ||
    selectedArrangementSceneStep === resolvedStep
  );
}

function isArrangementDrumClipSelected(stepIndex) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  return resolvedStep !== null && (
    selectedDrumClipStep === resolvedStep ||
    selectedDrumClipSteps.has(resolvedStep) ||
    selectedArrangementSceneStep === resolvedStep
  );
}

function isArrangementSceneSelected(stepIndex) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  return resolvedStep !== null && selectedArrangementSceneStep === resolvedStep;
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
  playerPanel?.querySelectorAll(".arrangement-step-label.selected").forEach((stepLabel) => {
    stepLabel.classList.remove("selected");
  });
  selectedArrangementClipKeys.forEach((key) => {
    const selection = parseArrangementClipSelectionKey(key);
    if (selection) {
      setArrangementClipSelectedClass(selection.trackId, selection.stepIndex, true);
    }
  });
  selectedTextClipSteps.forEach((stepIndex) => {
    playerPanel
      ?.querySelector(`.arrangement-text-cell[data-arr-step="${stepIndex}"]`)
      ?.classList.add("selected");
  });
  selectedDrumClipSteps.forEach((stepIndex) => {
    playerPanel
      ?.querySelector(`.arrangement-drum-cell[data-arr-step="${stepIndex}"]`)
      ?.classList.add("selected");
  });
  if (selectedTextClipStep !== null) {
    playerPanel
      ?.querySelector(`.arrangement-text-cell[data-arr-step="${selectedTextClipStep}"]`)
      ?.classList.add("selected");
  }
  if (selectedDrumClipStep !== null) {
    playerPanel
      ?.querySelector(`.arrangement-drum-cell[data-arr-step="${selectedDrumClipStep}"]`)
      ?.classList.add("selected");
  }
  if (selectedArrangementSceneStep !== null) {
    playerPanel
      ?.querySelector(`.arrangement-step-label[data-arr-step="${selectedArrangementSceneStep}"]`)
      ?.classList.add("selected");
    playerPanel
      ?.querySelectorAll(`.arrangement-cell[data-arr-step="${selectedArrangementSceneStep}"]`)
      ?.forEach((cell) => cell.classList.add("selected"));
  }
  window.freemixRender?.updateTransportRow?.();
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
  selectedTextClipStep = null;
  selectedTextClipSteps = new Set();
  selectedDrumClipStep = null;
  selectedDrumClipSteps = new Set();
  selectedArrangementSceneStep = null;
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

function selectArrangementTextClip(stepIndex, options = {}) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return false;
  }

  selectedArrangementSceneStep = null;
  if (!options.additive) {
    selectedDrumClipStep = null;
    selectedDrumClipSteps = new Set();
  }
  if (options.additive) {
    if (selectedTextClipSteps.has(resolvedStep)) {
      selectedTextClipSteps.delete(resolvedStep);
    } else {
      selectedTextClipSteps.add(resolvedStep);
      selectedTextClipStep = resolvedStep;
    }
  } else {
    selectedArrangementClipKeys = new Set();
    selectedTextClipSteps = new Set([resolvedStep]);
    selectedTextClipStep = resolvedStep;
  }

  if (!selectedTextClipSteps.size && !selectedArrangementClipKeys.size) {
    selectedTextClipSteps.add(resolvedStep);
    selectedTextClipStep = resolvedStep;
  } else if (!selectedTextClipSteps.size) {
    selectedTextClipStep = null;
  } else if (!selectedTextClipSteps.has(selectedTextClipStep)) {
    selectedTextClipStep = Array.from(selectedTextClipSteps).at(-1) ?? null;
  }
  selectedArrangementSceneStep = null;
  renderArrangementClipSelection();
  return true;
}

function selectArrangementDrumClip(stepIndex, options = {}) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return false;
  }

  selectedArrangementSceneStep = null;
  if (!options.additive) {
    selectedArrangementClipKeys = new Set();
    selectedTextClipStep = null;
    selectedTextClipSteps = new Set();
  }
  if (options.additive) {
    if (selectedDrumClipSteps.has(resolvedStep)) {
      selectedDrumClipSteps.delete(resolvedStep);
    } else {
      selectedDrumClipSteps.add(resolvedStep);
      selectedDrumClipStep = resolvedStep;
    }
  } else {
    selectedDrumClipSteps = new Set([resolvedStep]);
    selectedDrumClipStep = resolvedStep;
  }

  if (!selectedDrumClipSteps.size && !selectedArrangementClipKeys.size && !selectedTextClipSteps.size) {
    selectedDrumClipSteps.add(resolvedStep);
    selectedDrumClipStep = resolvedStep;
  } else if (!selectedDrumClipSteps.size) {
    selectedDrumClipStep = null;
  } else if (!selectedDrumClipSteps.has(selectedDrumClipStep)) {
    selectedDrumClipStep = Array.from(selectedDrumClipSteps).at(-1) ?? null;
  }
  selectedArrangementSceneStep = null;
  renderArrangementClipSelection();
  return true;
}

function getSelectedTextClipSteps() {
  const steps = new Set();
  selectedTextClipSteps.forEach((stepIndex) => {
    const resolvedStep = getArrangementStepIndex(stepIndex);
    if (resolvedStep !== null) {
      steps.add(resolvedStep);
    }
  });
  if (selectedTextClipStep !== null && typeof selectedTextClipStep !== "undefined") {
    const activeTextStep = getArrangementStepIndex(selectedTextClipStep);
    if (activeTextStep !== null) {
      steps.add(activeTextStep);
    }
  }
  return Array.from(steps).sort((a, b) => a - b);
}

function getSelectedDrumClipSteps() {
  const steps = new Set();
  selectedDrumClipSteps.forEach((stepIndex) => {
    const resolvedStep = getArrangementStepIndex(stepIndex);
    if (resolvedStep !== null) {
      steps.add(resolvedStep);
    }
  });
  if (selectedDrumClipStep !== null && typeof selectedDrumClipStep !== "undefined") {
    const activeDrumStep = getArrangementStepIndex(selectedDrumClipStep);
    if (activeDrumStep !== null) {
      steps.add(activeDrumStep);
    }
  }
  return Array.from(steps).sort((a, b) => a - b);
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
  selectedTextClipStep = null;
  selectedTextClipSteps = new Set([resolvedStep]);
  selectedDrumClipStep = null;
  selectedDrumClipSteps = new Set([resolvedStep]);
  selectedArrangementSceneStep = resolvedStep;
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

function getArrangementControlsMenu() {
  return playerPanel?.querySelector("#arrangementControlsMenu") || null;
}

function getArrangementControlsButton() {
  return playerPanel?.querySelector("#arrangementControlsButton") || null;
}

function invalidateUiNodeCache() {
  UI_NODE_CACHE.beatLights = null;
  tracks.forEach((track) => {
    if (track) {
      track.__cacheVideoCell = null;
      track.__cacheVideoElement = null;
      track.__activeVideoElement = null;
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

  setMediaElementSource(video, sourceUrl);

  loadMediaElementOnlyIfEmpty(video);

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
  setupTrackAudio(track, video, primingState);
  applyTrackVolume(track, primingState);
  applyTrackPitchAndSpeed(track, primingState);
  if (parkedAtAnchor && startTransport.bootToken === sessionToken && !(arrangement.enabled && hasArrangementClips())) {
    await warmLaunchVideoForTransport(video, track, primingState, sessionToken);
  }
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
  const isPianoRoll = isPianoRollTimingState(timingState);
  track.stepMs = isPianoRoll ? 0 : getClipRetriggerStepMs(timingState, barMs);
  if (isPianoRoll) {
    clearPianoRollGate(track);
    track.nextTriggerAt = Number.POSITIVE_INFINITY;
    track.__lastRetriggerPulse = null;
    track.__pianoRollEventContext = null;
    track.__playedPianoRollEvents = new Set();
    track.lastStep = -1;
    return;
  }
  clearPianoRollGate(track);
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
enterLocalProxyShellIfAvailable();

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
    const playableFiles = choosePlayableFiles(metadata.files ?? []);
    const file = playableFiles[0];
    if (!file) {
      throw new Error("No playable video file found.");
    }
    const mediaSource = createInternetArchiveMediaSource(result, file);

    return {
      ...result,
      duration: Number(metadata.metadata?.runtime) || 0,
      ...mediaSource,
      mediaAlternates: playableFiles.slice(1).map((alternateFile) => createInternetArchiveMediaSource(result, alternateFile)),
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
  return choosePlayableFiles(files)[0];
}

function choosePlayableFiles(files) {
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

  return candidates;
}

function createInternetArchiveMediaSource(result, file) {
  return {
    mediaUrl: `${IA_DOWNLOAD_URL}/${encodeURIComponent(result.identifier)}/${encodePath(file.name)}`,
    mediaName: file.name,
    mediaFormat: file.format ?? "video",
    mediaCodecScore: file.score,
  };
}

function scorePlayableFile(file) {
  const name = (file.name ?? "").toLowerCase();
  const format = (file.format ?? "").toLowerCase();
  const combined = `${name} ${format}`;
  const isMp4 = /\.(mp4|m4v)$/i.test(name);
  const isWebm = /\.webm$/i.test(name);
  const isOgv = /\.ogv$/i.test(name);
  const mentionsModernMp4Codec =
    combined.includes("h.264") ||
    combined.includes("h264") ||
    combined.includes("x264") ||
    combined.includes("avc") ||
    combined.includes("aac");
  const mentionsBrowserWebmCodec =
    combined.includes("webm") ||
    combined.includes("vp8") ||
    combined.includes("vp9") ||
    combined.includes("vorbis") ||
    combined.includes("opus");
  const mentionsLegacyMpeg4 =
    combined.includes("512kb mpeg4") ||
    combined.includes("512kb mpeg-4") ||
    (combined.includes("mpeg4") && !mentionsModernMp4Codec) ||
    (combined.includes("mpeg-4") && !mentionsModernMp4Codec) ||
    combined.includes("divx") ||
    combined.includes("xvid");
  let score = 1000;

  if (isWebm) score -= 260;
  if (isMp4) score -= 220;
  if (mentionsModernMp4Codec) score -= 210;
  if (mentionsBrowserWebmCodec) score -= 140;
  if (name.includes("360") || name.includes("480")) score -= 40;
  if (name.includes("720")) score += 30;
  if (name.includes("1080")) score += 80;
  if (name.includes("512kb")) score += isMp4 ? 80 : 20;
  if (mentionsLegacyMpeg4) score += 280;
  if (isOgv) score += 420;

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
  const editTarget = getActiveEditTarget();
  return {
    editing: editTarget
      ? {
          type: editTarget.type,
          step: Number.isFinite(Number(editTarget.stepIndex)) ? Number(editTarget.stepIndex) + 1 : null,
          track: editTarget.track?.id || null,
        }
      : null,
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
        playbackPhase: track.playbackPhase || PLAYBACK_PHASES.idle,
        mediaStatus: getTrackMediaStatus(track, state?.source || track.source),
        audioFxStatus: track.audioFxStatus || "empty",
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
          awaitingCleanVisualFrame: !!track.__awaitingCleanVisualFrame,
          lookahead: {
            status: track.__lookaheadStatus?.status || null,
            scene: track.__lookaheadStatus?.scene || (Number.isFinite(Number(track.__lookaheadPrerollStep)) ? Number(track.__lookaheadPrerollStep) + 1 : null),
            targetInMs: Number.isFinite(Number(track.__lookaheadPrerollBarStartAt))
              ? Math.round(Number(track.__lookaheadPrerollBarStartAt) - performance.now())
              : track.__lookaheadStatus?.targetInMs ?? null,
            anchor: track.__lookaheadStatus?.anchor ?? null,
            finalLeadMs: track.__lookaheadStatus?.finalLeadMs ?? null,
            retries: track.__lookaheadStatus?.retries ?? (Number(track.__lookaheadRetryCount) || 0),
            reason: track.__lookaheadStatus?.reason || null,
            ageMs: Number.isFinite(Number(track.__lookaheadStatus?.at)) ? Math.round(performance.now() - track.__lookaheadStatus.at) : null,
          },
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
          ${renderTextOverlay()}
        </div>

      <div class="arrangement-track-inline">
          <section class="arrangement-column" aria-label="Arrangement panel">
            ${renderArrangementPanel()}
          </section>
          <div class="control-column">
            <div class="control-bank" aria-label="Track controls">
            ${renderTrackManagementRow()}
            ${tracks.map((track) => renderTrackControlRow(track)).join("")}
            ${textTrackVisible ? renderTextControlPanel() : ""}
            ${drumTrackVisible ? renderDrumControlPanel() : ""}
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

function renderTrackManagementRow() {
  return `
    <div class="track-add-row track-management-row" aria-label="Track management">
      <button
        id="addTrackButton"
        class="track-add-button track-management-button"
        type="button"
        ${tracks.length >= MAX_TRACK_COUNT ? "disabled" : ""}
      >
        Add A/V (${tracks.length}/${MAX_TRACK_COUNT})
      </button>
      <button
        id="toggleTextTrackButton"
        class="track-add-button track-management-button track-special-toggle ${textTrackVisible ? "active" : ""}"
        type="button"
        aria-pressed="${textTrackVisible}"
        title="${textTrackVisible ? "Hide TEXT track" : "Show TEXT track"}"
      >
        TEXT ${textTrackVisible ? "Shown" : "Hidden"}
      </button>
      <button
        id="toggleDrumTrackButton"
        class="track-add-button track-management-button track-special-toggle ${drumTrackVisible ? "active" : ""}"
        type="button"
        aria-pressed="${drumTrackVisible}"
        title="${drumTrackVisible ? "Hide DRUM track" : "Show DRUM track"}"
      >
        DRUM ${drumTrackVisible ? "Shown" : "Hidden"}
      </button>
    </div>
  `;
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
            class="arrangement-action arrangement-capture"
            type="button"
            id="arrangementCaptureButton"
            title="Capture current track settings into selected clip slot"
          >
            Capture
          </button>
          <button
            class="arrangement-action"
            type="button"
            id="arrangementCopyButton"
            title="Copy selected clip, text, or scene"
          >
            Copy
          </button>
          <button
            class="arrangement-action"
            type="button"
            id="arrangementPasteButton"
            title="Paste copied clip, text, or scene to the selected target"
          >
            Paste
          </button>
          <button
            class="arrangement-action arrangement-delete"
            type="button"
            id="arrangementDeleteButton"
            title="Delete selected clip, text, or scene"
          >
            Delete
          </button>
          <button
            class="arrangement-action"
            type="button"
            id="arrangementCopyAllButton"
            title="Fill empty scenes with the current scene"
          >
            Fill
          </button>
          <button
            class="arrangement-action arrangement-controls"
            type="button"
            id="arrangementControlsButton"
            aria-expanded="false"
            aria-controls="arrangementControlsMenu"
            title="Show arrangement controls guide"
          >
            Controls
          </button>
          <button class="arrangement-clear" type="button" id="arrangementClear">Clear</button>
        </div>
        <div
          class="arrangement-controls-menu"
          id="arrangementControlsMenu"
          data-open="false"
          hidden
        >
          <div class="arrangement-controls-menu__header">
            <span>Arrangement controls</span>
            <button
              class="arrangement-controls-menu__close"
              type="button"
              id="arrangementControlsClose"
              title="Close arrangement controls guide"
            >
              Close
            </button>
          </div>
          <dl class="arrangement-controls-list">
            <div>
              <dt>Clip click</dt>
              <dd>Selects exactly one clip slot for editing.</dd>
            </div>
            <div>
              <dt>Ctrl + click</dt>
              <dd>Adds or removes individual clips from the selection.</dd>
            </div>
            <div>
              <dt>Scene number</dt>
              <dd>Selects the whole scene across all tracks.</dd>
            </div>
            <div>
              <dt>Capture</dt>
              <dd>Writes the current controls into the selected slot or scene.</dd>
            </div>
            <div>
              <dt>Copy / Paste</dt>
              <dd>Copies and pastes the selected clip, text clip, or full scene.</dd>
            </div>
            <div>
              <dt>Delete</dt>
              <dd>Removes only the selected clip, text clip, or selected scene.</dd>
            </div>
            <div>
              <dt>Fill</dt>
              <dd>Copies the selected source scene into empty scenes.</dd>
            </div>
          </dl>
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
  const isSelected = isArrangementSceneSelected(stepIndex);
  return `
    <button
      class="arrangement-step-label ${isSelected ? "selected" : ""}"
      type="button"
      data-arr-step="${stepIndex}"
      draggable="false"
      title="${isSelected ? "Scene selected" : "Click to select the whole scene"}"
    >
      ${stepIndex + 1}
    </button>
  `;
}

function clipHasEnabledAutomation(clip) {
  const automation = normalizeClipAutomation(clip?.automation);
  return Object.values(automation).some((envelope) => !!envelope?.enabled && Array.isArray(envelope.points) && envelope.points.length > 0);
}

function renderArrangementClipBadges(clip) {
  if (!clip) {
    return "";
  }

  const isPianoClip = isPianoRollTimingState(clip);
  const badges = [
    `<span class="arrangement-cell-badge" title="${isPianoClip ? "Piano Roll timing" : "Retrigger timing"}">${isPianoClip ? "P" : "R"}</span>`,
  ];
  if (clipHasEnabledAutomation(clip)) {
    badges.push(`<span class="arrangement-cell-badge automation" title="Clip automation">A</span>`);
  }

  return `<span class="arrangement-cell-badges" aria-hidden="true">${badges.join("")}</span>`;
}

function renderArrangementRow(track) {
  return `
    ${arrangement.clips
      .map((step, index) => {
        const clip = step[track.id];
        const contract = getArrangementClipContract(ARRANGEMENT_CLIP_KINDS.av, clip, { track, stepIndex: index });
        const canDragCopy = contract.filled;
        const sceneColor = getArrangementSceneColor(index, clip);
        const densityCount = clip ? normalizeRetriggersPerBar(clip.retriggersPerBar) : 1;
        const isPianoClip = isPianoRollTimingState(clip);
        const hasAutomation = clipHasEnabledAutomation(clip);
        const densityClass = clip && !isPianoClip && densityCount > 1 ? "has-density-bars" : "";
        const timingClass = isPianoClip ? "has-piano-roll" : "";
        const automationClass = hasAutomation ? "has-automation" : "";
        const readinessClass = `clip-readiness-${contract.readiness.status}`;
        const sceneStyles = [
          sceneColor ? `--scene-track-color: ${sceneColor}` : "",
          clip && !isPianoClip && densityCount > 1 ? `--clip-density-count: ${densityCount}` : "",
        ].filter(Boolean);
        const sceneStyle = sceneStyles.length ? ` style="${sceneStyles.join("; ")};"` : "";
        const isSelected = isArrangementSceneSelected(index) || isArrangementClipSelected(track.id, index);
        const title = clip
          ? `${track.name} scene ${index + 1}; ${isPianoClip ? "Piano Roll" : `${RETRIGGER_LABELS[densityCount] || densityCount} density`}${hasAutomation ? "; automation" : ""}; click to edit, drag to copy`
          : `Blank ${track.name} slot in scene ${index + 1}; click to select, then Capture to create`;
        return `
          <button
            class="arrangement-cell ${track.color} ${clip ? "filled" : ""} ${densityClass} ${timingClass} ${automationClass} ${readinessClass} ${isSelected ? "selected" : ""} ${transport?.active && arrangement.step === index ? "playing" : ""}"
            type="button"
            data-arr-track="${track.id}"
            data-arr-step="${index}"
            data-clip-kind="${ARRANGEMENT_CLIP_KINDS.av}"
            data-clip-readiness="${escapeHtml(contract.readiness.status)}"
            draggable="${canDragCopy ? "true" : "false"}"
            title="${escapeHtml(`${title}; ${contract.readiness.label}`)}"
            ${sceneStyle}
          >
            ${renderArrangementClipBadges(clip)}
          </button>
        `;
      })
      .join("")}
  `;
}

function renderArrangementTextRow() {
  return `
    ${arrangement.textClips
      .map((clip, index) => {
        const textClip = normalizeTextClip(clip);
        const contract = getArrangementClipContract(ARRANGEMENT_CLIP_KINDS.text, textClip, { stepIndex: index });
        const isFilled = contract.filled;
        const canDragCopy = isFilled;
        const title = isFilled
          ? `TEXT scene ${index + 1}; click to edit, drag to copy`
          : `Blank TEXT slot in scene ${index + 1}; click to select, then Capture to create`;
        return `
          <button
            class="arrangement-cell arrangement-text-cell ${isFilled ? "filled" : ""} clip-readiness-${contract.readiness.status} ${isArrangementTextClipSelected(index) ? "selected" : ""} ${transport?.active && arrangement.step === index ? "playing" : ""}"
            type="button"
            data-arr-text="true"
            data-arr-step="${index}"
            data-clip-kind="${ARRANGEMENT_CLIP_KINDS.text}"
            data-clip-readiness="${escapeHtml(contract.readiness.status)}"
            draggable="${canDragCopy ? "true" : "false"}"
            title="${escapeHtml(`${title}; ${contract.readiness.label}`)}"
          >
            ${isFilled ? "T" : ""}
          </button>
        `;
      })
      .join("")}
  `;
}

function renderArrangementDrumRow() {
  const drumClips = Array.isArray(arrangement.drumClips)
    ? arrangement.drumClips
    : Array.from({ length: arrangementStepCount }, () => null);
  return `
    ${drumClips
      .map((clip, index) => {
        const drumClip = normalizeDrumClip(clip);
        const contract = getArrangementClipContract(ARRANGEMENT_CLIP_KINDS.drum, drumClip, { stepIndex: index });
        const isFilled = contract.filled;
        const canDragCopy = isFilled;
        const title = isFilled
          ? `DRUM scene ${index + 1}; click to edit, drag to copy`
          : `Blank DRUM slot in scene ${index + 1}; click to select, then Capture to create`;
        return `
          <button
            class="arrangement-cell arrangement-drum-cell ${isFilled ? "filled" : ""} clip-readiness-${contract.readiness.status} ${isArrangementDrumClipSelected(index) ? "selected" : ""} ${transport?.active && arrangement.step === index ? "playing" : ""}"
            type="button"
            data-arr-drums="true"
            data-arr-step="${index}"
            data-clip-kind="${ARRANGEMENT_CLIP_KINDS.drum}"
            data-clip-readiness="${escapeHtml(contract.readiness.status)}"
            draggable="${canDragCopy ? "true" : "false"}"
            title="${escapeHtml(`${title}; ${contract.readiness.label}`)}"
          >
            ${isFilled ? "D" : ""}
          </button>
        `;
      })
      .join("")}
  `;
}

function renderArrangementGridRows() {
  const videoRows = tracks
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
  const textRow = textTrackVisible
    ? `<div class="arrangement-track-row arrangement-text-row" data-track-id="${TEXT_TRACK_ID}">
      <div class="arrangement-track-label text-track-label" title="Text overlay">
        ${TEXT_TRACK_LABEL}
      </div>
      ${renderArrangementTextRow()}
    </div>`
    : "";
  const drumRow = drumTrackVisible
    ? `<div class="arrangement-track-row arrangement-drum-row" data-track-id="${DRUM_TRACK_ID}">
      <div class="arrangement-track-label drum-track-label" title="Drum machine">
        ${DRUM_TRACK_LABEL}
      </div>
      ${renderArrangementDrumRow()}
    </div>`
    : "";
  return `${videoRows}${textRow}${drumRow}`;
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
  const mediaReadiness = getTrackMediaReadiness(track, renderState);
  const playbackUrl = renderSource ? getMediaPlaybackUrl(renderSource.mediaUrl, renderState) : "";
  const corsAttribute = playbackUrl && !shouldDisableWebAudioForSource(playbackUrl) ? `crossorigin="anonymous"` : "";
  return `
    <div class="video-cell ${track.color} blend-${renderState.blendMode || TRACK_BLEND_DEFAULTS[0]} ${renderSource ? "has-source" : "no-source"}" data-track-id="${track.id}" data-media-status="${escapeHtml(mediaStatus)}" data-media-readiness="${escapeHtml(mediaReadiness.readiness)}" style="--layer-index: ${index + 1}">
      ${
        renderSource
        ? `<video
              class="track-video"
              id="video-${track.id}"
              src="${escapeHtml(playbackUrl || "")}"
              ${corsAttribute}
              preload="auto"
               playsinline
             ></video>`
          : `<div class="track-empty-video" aria-hidden="true"></div>`
      }
      <div class="track-badge">
        <strong>${escapeHtml(track.name)}</strong>
        ${track.role ? `<span>${escapeHtml(track.role)}</span>` : ""}
      </div>
      <div class="media-status-badge" title="${escapeHtml(`${mediaReadiness.label}: ${mediaReadiness.detail}`)}">${escapeHtml(mediaStatusLabel)}</div>
      <div class="trigger-flash" aria-hidden="true"></div>
    </div>
  `;
}

function getActiveTextClipForDisplay() {
  const stepIndex =
    transport?.active && arrangement.enabled && Number.isFinite(Number(transport.arrangementStep))
      ? transport.arrangementStep
      : arrangement?.step;
  return {
    stepIndex: getArrangementStepIndex(stepIndex),
    clip: getArrangementTextClip(stepIndex),
  };
}

function renderTextOverlay() {
  const { clip } = isTextTrackActiveInMix() ? getActiveTextClipForDisplay() : { clip: null };
  const fields = clip?.fields || [];
  return `
    <div class="text-overlay-layer" id="textOverlayLayer" aria-hidden="true">
      ${fields.map(renderTextOverlayField).join("")}
    </div>
  `;
}

function renderTextOverlayField(field) {
  const text = String(field?.text || "").trim();
  if (!text) {
    return "";
  }

  const xPosition = clamp(Number(field.x), 0, 100);
  const anchorX = xPosition >= 66 ? "-100%" : xPosition <= 34 ? "0" : "-50%";
  const style = [
    `left: ${xPosition}%`,
    `top: ${clamp(Number(field.y), 0, 100)}%`,
    `--text-anchor-x: ${anchorX}`,
    `font-family: ${field.font}`,
    `font-size: clamp(12px, ${clamp(Number(field.size), 10, 72) / 8}vw, ${clamp(Number(field.size), 10, 72)}px)`,
    `font-weight: ${field.bold ? "900" : "500"}`,
    `font-style: ${field.italic ? "italic" : "normal"}`,
    `text-decoration: ${field.underline ? "underline" : "none"}`,
    `color: ${field.color}`,
    `opacity: ${clamp(Number(field.opacity), 0, 1)}`,
    `text-align: ${field.align}`,
    `-webkit-text-stroke: ${field.stroke ? `${clamp(Number(field.strokeWidth), 0, 8)}px ${field.strokeColor}` : "0 transparent"}`,
    `text-shadow: ${field.shadow ? `${clamp(Number(field.shadowX), -24, 24)}px ${clamp(Number(field.shadowY), -24, 24)}px ${clamp(Number(field.shadowBlur), 0, 24)}px ${field.shadowColor}` : "none"}`,
  ].join("; ");
  return `<div class="text-overlay-field" style="${escapeHtml(style)}">${escapeHtml(text).replaceAll("\n", "<br>")}</div>`;
}

function getTrackMediaStatus(track, renderSource = null) {
  const status = typeof track?.mediaStatus === "string" ? track.mediaStatus : "";
  if (TRACK_MEDIA_STATUSES.has(status)) {
    return status;
  }

  return renderSource ? "ready" : "empty";
}

function getTrackMediaStatusLabel(status) {
  return TRACK_MEDIA_STATUS_LABELS[status] || "Unknown";
}

function setTrackMediaStatus(trackOrId, status, options = {}) {
  const track = typeof trackOrId === "string" ? getTrackById(trackOrId) : trackOrId;
  if (!track) {
    return;
  }

  const normalizedStatus = TRACK_MEDIA_STATUSES.has(status) ? status : "ready";
  track.mediaStatus = normalizedStatus;
  track.mediaStatusUpdatedAt = performance.now();
  if (options.details && typeof options.details === "object") {
    track.mediaStatusDetails = { ...options.details };
  }
  const cell = getTrackCell(track);
  if (cell) {
    const renderState = getTrackRenderState(track);
    const displayStatus = getTrackMediaStatus(track, renderState?.source || track.source);
    cell.dataset.mediaStatus = displayStatus;
    cell.dataset.mediaReadiness = getTrackMediaReadiness(track, renderState).readiness;
    const badge = cell.querySelector(".media-status-badge");
    if (badge) {
      const readiness = getTrackMediaReadiness(track, renderState);
      badge.textContent = getTrackMediaStatusLabel(displayStatus);
      badge.title = `${readiness.label}: ${readiness.detail}`;
    }
  }

  if (options.statusMessage) {
    setStatus(options.statusMessage, !!options.isError);
  }
}

function setTrackPlaybackPhase(trackOrId, phase, options = {}) {
  const track = typeof trackOrId === "string" ? getTrackById(trackOrId) : trackOrId;
  if (!track) {
    return;
  }

  const normalizedPhase = Object.prototype.hasOwnProperty.call(PLAYBACK_PHASES, phase) ? PLAYBACK_PHASES[phase] : phase;
  track.playbackPhase = normalizedPhase || PLAYBACK_PHASES.idle;
  track.playbackPhaseUpdatedAt = performance.now();
  if (options.sessionToken !== undefined) {
    track.playbackSessionToken = options.sessionToken;
  }
  if (options.clipSignature !== undefined) {
    track.playbackClipSignature = options.clipSignature;
  }
  if (options.mediaStatus) {
    setTrackMediaStatus(track, options.mediaStatus, { details: options.details });
  }
}

window.freemixSetTrackMediaStatus = setTrackMediaStatus;

function recoverMediaPlaybackError(trackOrId, video) {
  const track = typeof trackOrId === "string" ? getTrackById(trackOrId) : trackOrId;
  const currentSource = video?.currentSrc || video?.src || "";
  try {
    const currentUrl = new URL(currentSource, window.location.href);
    if (currentUrl.pathname === "/media-slice") {
      unmarkMediaSliceReady(currentUrl.href);
      const originalSource = getOriginalMediaUrlFromProxyUrl(currentSource);
      if (!track || !video || !originalSource) {
        setStatus(`${track?.name || "Track"}: slice playback failed`, true);
        return false;
      }

      disposeTrackAudio(track);
      video.removeAttribute("src");
      video.load();
      track.audioFxStatus = "waiting";
      setTrackMediaStatus(track, "loading");
      setStatus(`${track.name}: rebuilding FX media slice`);

      const rebuildUrl = new URL(currentUrl.href);
      rebuildUrl.pathname = "/media-slice-warm";
      rebuildUrl.searchParams.set("force", "1");
      fetch(rebuildUrl.href, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`Slice rebuild failed: ${response.status}`))))
        .then((payload) => {
          if (!payload?.ready) {
            throw new Error("Slice rebuild did not produce ready media.");
          }
          markMediaSliceReady(currentUrl.href);
          const retryUrl = new URL(currentUrl.href);
          retryUrl.searchParams.set("retry", String(Date.now()));
          setMediaElementSource(video, retryUrl.href);
          setTrackMediaStatus(track, "loading");
          window.freemixRender?.updateTrackRow?.(track);
          setStatus(`${track.name}: FX media rebuilt`);
        })
        .catch((error) => {
          console.warn(error);
          setTrackMediaStatus(track, "failed");
          setStatus(`${track.name}: FX media rebuild failed`, true);
      });
      return true;
    }

    if (currentUrl.pathname === "/media-proxy") {
      setTrackMediaStatus(track, "failed");
      setStatus(`${track?.name || "Track"}: proxied media playback failed`, true);
      return false;
    }

    if (currentUrl.pathname === "/media-live") {
      const originalSource = getOriginalMediaUrlFromProxyUrl(currentSource);
      if (!track || !video || !originalSource) {
        setStatus(`${track?.name || "Track"}: live media stream failed`, true);
        return false;
      }

      const playbackState = getTrackPlaybackState(track) || track;
      const sliceUrl = getMediaSlicePlaybackUrl(originalSource, playbackState);
      const warmUrl = getMediaSliceControlUrl(originalSource, playbackState, "warm");
      if (!sliceUrl || !warmUrl) {
        setStatus(`${track.name}: no FX-safe fallback route available`, true);
        return false;
      }

      disposeTrackAudio(track);
      video.removeAttribute("src");
      video.load();
      track.audioFxStatus = "waiting";
      setTrackMediaStatus(track, "loading");
      setStatus(`${track.name}: live stream failed, building FX-safe media`);

      fetch(warmUrl, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`Slice warm failed: ${response.status}`))))
        .then((payload) => {
          if (!payload?.ready) {
            throw new Error("FX-safe media did not become ready.");
          }
          markMediaSliceReady(sliceUrl);
          setMediaElementSource(video, sliceUrl);
          setTrackMediaStatus(track, "loading");
          window.freemixRender?.updateTrackRow?.(track);
          setStatus(`${track.name}: FX-safe media ready`);
        })
        .catch((error) => {
          console.warn(error);
          setTrackMediaStatus(track, "failed");
          setStatus(`${track.name}: FX-safe media build failed`, true);
        });
      return true;
    }

    if (currentUrl.pathname === "/media-cache") {
      setTrackMediaStatus(track, "failed");
      setStatus(`${track?.name || "Track"}: full-cache media failed`, true);
      return false;
    }
  } catch {
    // Continue with best-effort recovery.
  }

  if (track && video) {
    const playbackState = getTrackPlaybackState(track) || track;
    const source = playbackState?.source || track.source;
    const alternates = Array.isArray(source?.mediaAlternates) ? source.mediaAlternates : [];
    if (alternates.length) {
      const [alternate, ...remainingAlternates] = alternates;
      const nextSource = {
        ...source,
        mediaUrl: alternate.mediaUrl,
        mediaName: alternate.mediaName,
        mediaFormat: alternate.mediaFormat,
        mediaCodecScore: alternate.mediaCodecScore,
        mediaAlternates: remainingAlternates,
      };
      playbackState.source = nextSource;
      if (playbackState === track) {
        track.source = nextSource;
      }
      selectedSource = getFirstLoadedTrackSource() || nextSource;
      disposeTrackAudio(track);
      const nextPlaybackUrl = getMediaPlaybackUrl(nextSource.mediaUrl, { ...playbackState, source: nextSource });
      setMediaElementSource(video, nextPlaybackUrl);
      setTrackMediaStatus(track, "loading");
      if (window.freemixRender?.updateTrackRow) {
        window.freemixRender.updateTrackRow(track);
        window.freemixRender.updateSourceStrip?.();
      }
      setStatus(`${track.name}: trying alternate media file`);
      return true;
    }

    if (source?.identifier && !source?.__refreshingMediaAlternates) {
      source.__refreshingMediaAlternates = true;
      setStatus(`${track.name}: checking alternate media files`);
      fetchPlayableSource(source)
        .then((freshSource) => {
          const currentOriginalSource = getOriginalMediaUrlFromProxyUrl(currentSource) || source.mediaUrl;
          const refreshedAlternates = [freshSource, ...(freshSource.mediaAlternates || [])].filter(
            (candidate) => candidate?.mediaUrl && candidate.mediaUrl !== currentOriginalSource,
          );
          if (!refreshedAlternates.length) {
            source.__refreshingMediaAlternates = false;
            setTrackMediaStatus(track, "failed");
            setStatus(`${track.name}: no browser-decodable alternate found`, true);
            return;
          }

          const [alternate, ...remainingAlternates] = refreshedAlternates;
          const nextSource = {
            ...source,
            mediaUrl: alternate.mediaUrl,
            mediaName: alternate.mediaName,
            mediaFormat: alternate.mediaFormat,
            mediaCodecScore: alternate.mediaCodecScore,
            mediaAlternates: remainingAlternates,
            __refreshingMediaAlternates: false,
          };
          playbackState.source = nextSource;
          if (playbackState === track) {
            track.source = nextSource;
          }
          selectedSource = getFirstLoadedTrackSource() || nextSource;
          disposeTrackAudio(track);
          const nextPlaybackUrl = getMediaPlaybackUrl(nextSource.mediaUrl, { ...playbackState, source: nextSource });
          setMediaElementSource(video, nextPlaybackUrl);
          setTrackMediaStatus(track, "loading");
          if (window.freemixRender?.updateTrackRow) {
            window.freemixRender.updateTrackRow(track);
            window.freemixRender.updateSourceStrip?.();
          }
          setStatus(`${track.name}: trying alternate media file`);
        })
        .catch((error) => {
          source.__refreshingMediaAlternates = false;
          setTrackMediaStatus(track, "failed");
          setStatus(`${track.name}: alternate media check failed`, true);
          console.warn(error);
        });
      return true;
    }
  }

  const originalSource = getOriginalMediaUrlFromProxyUrl(currentSource);
  if (!track || !video || !originalSource) {
    return false;
  }

  if (isRemoteHttpMediaUrl(originalSource)) {
    const playbackSource = getMediaPlaybackUrl(originalSource);
    if (!playbackSource || playbackSource === originalSource || !isLocalMediaProxyUrl(playbackSource)) {
      track.audioFxStatus = "waiting";
      setStatus(`${track.name}: audio FX waiting for local media cache`, true);
      return false;
    }

    disposeTrackAudio(track);
    setMediaElementSource(video, playbackSource);
    track.audioFxStatus = "waiting";
    setTrackMediaStatus(track, "loading");
    setStatus(`${track.name}: retrying through FX media cache`);
    return true;
  }

  disposeTrackAudio(track);
  setMediaElementSource(video, originalSource);
  track.audioFxStatus = "waiting";
  setTrackMediaStatus(track, "loading");
  setStatus(`${track.name}: retrying media playback`);
  return true;
}

window.freemixRecoverMediaPlaybackError = recoverMediaPlaybackError;

function getTrackAudioRouteState(track) {
  if (!track?.source) {
    return {
      status: "empty",
      route: "empty",
      readiness: TRACK_AUDIO_ROUTE_READINESS.empty,
      label: TRACK_AUDIO_ROUTE_LABELS.empty,
      detail: "Search to load",
      hasFx: false,
    };
  }

  let status = typeof track.audioFxStatus === "string" ? track.audioFxStatus : "waiting";
  let route = track.audio?.route || status;
  if (track.audio?.route === "capture-stream") {
    status = "capture-fx";
    route = "capture-stream";
  } else if (track.audio?.route === "media-element") {
    status = "webaudio";
    route = "media-element";
  }

  const normalizedStatus = Object.prototype.hasOwnProperty.call(TRACK_AUDIO_ROUTE_LABELS, status)
    ? status
    : "unrouted";
  const readiness = TRACK_AUDIO_ROUTE_READINESS[normalizedStatus] || "limited";
  const label = TRACK_AUDIO_ROUTE_LABELS[normalizedStatus] || TRACK_AUDIO_ROUTE_LABELS.unrouted;
  const details = {
    "capture-failed": "Capture stream could not provide audio",
    "capture-fx": "Capture FX graph",
    empty: "Search to load",
    failed: "Audio route failed",
    "fx-unavailable": "FX route unavailable",
    "native-audio": "Native audio fallback",
    unrouted: "FX route unavailable",
    waiting: "Preparing FX route",
    webaudio: "WebAudio FX graph",
  };

  return {
    status: normalizedStatus,
    route,
    readiness,
    label,
    detail: details[normalizedStatus] || "Route pending",
    hasFx: readiness === "fx-ready",
  };
}

function getTrackAudioRouteDetail(track) {
  return getTrackAudioRouteState(track).detail;
}

function getTrackMediaReadiness(track, renderState = getTrackRenderState(track)) {
  const sourceUrl = renderState?.source?.mediaUrl || track?.source?.mediaUrl || "";
  if (!sourceUrl) {
    return {
      readiness: "empty",
      status: "empty",
      label: TRACK_MEDIA_READINESS_LABELS.empty,
      detail: "Search to load",
    };
  }

  const mediaStatus = getTrackMediaStatus(track, renderState?.source || track.source);
  const readiness = TRACK_MEDIA_STATUS_READINESS[mediaStatus] || "ready";
  const sourceIsRemote = sourceUrl && isRemoteHttpMediaUrl(sourceUrl);
  const audioRoute = getTrackAudioRouteState(track);
  const routeDetail = audioRoute.detail;

  if (mediaStatus === "failed" || mediaStatus === "unsupported" || audioRoute.readiness === "failed") {
    const failedReadiness = mediaStatus === "unsupported" ? "unsupported" : "failed";
    return {
      readiness: failedReadiness,
      status: failedReadiness,
      label: TRACK_MEDIA_READINESS_LABELS[failedReadiness],
      detail: track?.mediaStatusDetails?.reason || "Try another source",
    };
  }

  if (mediaStatus === "loading" || mediaStatus === "prerolling" || audioRoute.readiness === "loading") {
    return {
      readiness: "loading",
      status: "loading",
      label: mediaStatus === "prerolling" ? "Cueing media" : "Loading media",
      detail: mediaStatus === "prerolling" ? "Waiting for clean frame" : routeDetail,
    };
  }

  if (mediaStatus === "playing" || mediaStatus === "clean-frame-ready") {
    return {
      readiness: mediaStatus === "playing" ? "playing" : "ready",
      status: mediaStatus === "playing" ? "playing" : "ready",
      label: mediaStatus === "playing" ? "Playing" : "Clean frame ready",
      detail: `${routeDetail}; anchor ${Number(renderState?.startTime || 0).toFixed(1)}s`,
    };
  }

  if (mediaStatus === "fx-routed") {
    return {
      readiness: "fx-ready",
      status: "fx-ready",
      label: TRACK_MEDIA_READINESS_LABELS["fx-ready"],
      detail: routeDetail,
    };
  }

  if (mediaStatus === "fx-unavailable" || mediaStatus === "cors-limited" || audioRoute.readiness === "limited") {
    return {
      readiness: "limited",
      status: "limited",
      label: mediaStatus === "cors-limited" ? "CORS limited" : TRACK_MEDIA_READINESS_LABELS.limited,
      detail: mediaStatus === "cors-limited" ? "FX may need proxy route" : routeDetail,
    };
  }

  if (mediaStatus === "audio-only" || mediaStatus === "video-only") {
    return {
      readiness,
      status: readiness,
      label: TRACK_MEDIA_READINESS_LABELS[readiness],
      detail: mediaStatus === "audio-only" ? "No visible video route" : "No audible audio route",
    };
  }

  if (sourceIsRemote && canUseLocalMediaProxy()) {
    return {
      readiness: "fx-ready",
      status: "fx-ready",
      label: "Proxy ready",
      detail: "FX-ready stream",
    };
  }

  if (sourceIsRemote) {
    return {
      readiness: "loading",
      status: "loading",
      label: "Proxy offline",
      detail: "Start local server",
    };
  }

  return {
    readiness,
    status: readiness === "stopped" ? "ready" : readiness,
    label: TRACK_MEDIA_READINESS_LABELS[readiness] || "Ready",
    detail: readiness === "stopped" ? `Parked at anchor ${Number(renderState?.startTime || 0).toFixed(1)}s` : routeDetail,
  };
}

function getTrackMediaPrepState(track, renderState = getTrackRenderState(track)) {
  return getTrackMediaReadiness(track, renderState);
}

window.freemixGetTrackAudioRouteState = getTrackAudioRouteState;
window.freemixGetTrackMediaReadiness = getTrackMediaReadiness;

function renderTrackMediaPrep(track, renderState = getTrackRenderState(track)) {
  const prep = getTrackMediaPrepState(track, renderState);
  return `
    <div class="track-media-prep" data-media-prep="${escapeHtml(prep.status)}" data-media-readiness="${escapeHtml(prep.readiness)}" aria-live="polite" title="${escapeHtml(`${prep.label}: ${prep.detail}`)}">
      <div class="track-media-prep-copy">
        <span>${escapeHtml(prep.label)}</span>
        <small>${escapeHtml(prep.detail)}</small>
      </div>
      <div class="track-media-prep-bar" aria-hidden="true"><span></span></div>
    </div>
  `;
}

const PIANO_ROLL_EDITOR_STEPS_PER_BEAT = 4;

function getPianoRollEditorGrid(snapValue = DEFAULT_PIANO_ROLL_SNAP, beatsPerBar = getTransportBeatsPerBar()) {
  if (typeof snapValue === "number" && arguments.length === 1) {
    beatsPerBar = snapValue;
    snapValue = DEFAULT_PIANO_ROLL_SNAP;
  }

  const resolvedBeatsPerBar = Math.max(1, Number(beatsPerBar) || 4);
  const snapDefinition = getPianoRollSnapDefinition(snapValue);
  const stepsPerBeat = Math.max(1, Number(snapDefinition?.stepsPerBeat) || PIANO_ROLL_EDITOR_STEPS_PER_BEAT);
  const stepCount = Math.max(1, Math.round(resolvedBeatsPerBar * stepsPerBeat));
  return {
    beatsPerBar: resolvedBeatsPerBar,
    snap: snapDefinition.value,
    snapLabel: snapDefinition.label,
    stepsPerBeat,
    stepCount,
    stepBeat: resolvedBeatsPerBar / stepCount,
  };
}

function getSelectedPianoRollNoteId(track, notes = []) {
  const selectedId = String(track?.__selectedPianoRollNoteId || "");
  if (selectedId && notes.some((note) => note.id === selectedId)) {
    return selectedId;
  }

  track.__selectedPianoRollNoteId = null;
  return "";
}

function getPianoRollNoteEnd(note) {
  return Number(note.startBeat || 0) + Math.max(PIANO_ROLL_MIN_NOTE_BEATS, Number(note.durationBeats) || 0.25);
}

function findPianoRollNoteAtCell(notes, beat, pitch, stepBeat) {
  const cellStart = Number(beat);
  const cellEnd = cellStart + Number(stepBeat);
  return notes.find((note) => {
    if (Number(note.pitchSemitones) !== Number(pitch)) {
      return false;
    }

    const noteStart = Number(note.startBeat || 0);
    const noteEnd = getPianoRollNoteEnd(note);
    return noteStart < cellEnd - 0.0001 && noteEnd > cellStart + 0.0001;
  }) || null;
}

function findPianoRollNoteStartingAtCell(notes, beat, pitch) {
  return notes.find((note) => (
    Number(note.pitchSemitones) === Number(pitch) &&
    Math.abs(Number(note.startBeat || 0) - Number(beat)) < 0.0001
  )) || null;
}

function renderPianoRollEditor(track, renderState = getTrackRenderState(track)) {
  const timingMode = normalizeClipTimingMode(renderState?.timingMode);
  const isPianoMode = timingMode === CLIP_TIMING_MODES.pianoRoll;
  if (!isPianoMode) {
    return "";
  }

  const notes = normalizePianoRollNotes(renderState?.notes);
  const pianoSnap = normalizePianoRollSnap(renderState?.pianoSnap);
  const pianoRoot = normalizePianoRootNote(renderState?.pianoRoot);
  const grid = getPianoRollEditorGrid(pianoSnap);
  const pitchRows = [];
  for (let pitch = PIANO_ROLL_MAX_PITCH_SEMITONES; pitch >= PIANO_ROLL_MIN_PITCH_SEMITONES; pitch -= 1) {
    pitchRows.push(pitch);
  }

  const selectedNoteId = getSelectedPianoRollNoteId(track, notes) || renderState?.selectedNoteId || "";
  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;
  const canPreviewNote = !!selectedNote && !!getTrackPlaybackSourceUrl(track, renderState);
  const selectedVelocity = selectedNote ? Math.round(clamp(Number(selectedNote.velocity) || 0, 0, 1) * 100) : 80;
  const selectedDurationSteps = selectedNote
    ? Math.max(1, Math.round((Number(selectedNote.durationBeats) || grid.stepBeat) / grid.stepBeat))
    : 1;

  return `
    <div
      class="piano-roll-editor"
      data-piano-roll-editor="${track.id}"
      style="--piano-roll-steps: ${grid.stepCount}; --piano-roll-rows: ${pitchRows.length};"
      onkeydown="window.freemixPianoRollKeyDown(event)"
      tabindex="0"
    >
      <div class="piano-roll-head">
        <span>Piano Roll</span>
        <small>${notes.length} note${notes.length === 1 ? "" : "s"} / ${grid.stepCount} steps</small>
        <label class="piano-roll-snap">
          <span>Snap</span>
          <select data-track-control="${track.id}" data-control="pianoSnap">
            ${PIANO_ROLL_SNAP_OPTIONS.map((option) => (
              `<option value="${escapeHtml(option.value)}" ${option.value === pianoSnap ? "selected" : ""}>${escapeHtml(option.label)}</option>`
            )).join("")}
          </select>
        </label>
        <label class="piano-roll-snap piano-roll-root">
          <span>Root</span>
          <select data-track-control="${track.id}" data-control="pianoRoot">
            ${PIANO_ROOT_NOTE_OPTIONS.map((option) => (
              `<option value="${escapeHtml(option.value)}" ${option.value === pianoRoot ? "selected" : ""}>${escapeHtml(option.label)}</option>`
            )).join("")}
          </select>
        </label>
        <button
          class="piano-roll-tool"
          type="button"
          data-track-control="${track.id}"
          data-control="pianoPreviewNote"
          onclick="window.freemixPreviewSelectedPianoRollNote(event)"
          ${canPreviewNote ? "" : "disabled"}
        >Preview</button>
        <button
          class="piano-roll-tool"
          type="button"
          data-track-control="${track.id}"
          data-control="pianoDuplicateNote"
          onclick="window.freemixDuplicateSelectedPianoRollNote(event)"
          ${selectedNote ? "" : "disabled"}
        >Duplicate</button>
        <button
          class="piano-roll-tool"
          type="button"
          data-track-control="${track.id}"
          data-control="pianoQuantizeNotes"
          onclick="window.freemixQuantizePianoRollNotes(event)"
          ${notes.length ? "" : "disabled"}
        >Quantize</button>
        <button
          class="piano-roll-tool"
          type="button"
          data-track-control="${track.id}"
          data-control="pianoDeleteNote"
          onclick="window.freemixDeleteSelectedPianoRollNote(event)"
          ${selectedNote ? "" : "disabled"}
        >Delete note</button>
      </div>
      <div class="piano-roll-grid" role="grid" aria-label="${escapeHtml(`${track.name} piano roll`)}">
        ${pitchRows
          .map((pitch) => `
            <div class="piano-roll-row" role="row">
              <span class="piano-roll-pitch" title="${pitch > 0 ? "+" : ""}${pitch} semitones">${escapeHtml(getPianoRollPitchLabel(pianoRoot, pitch))}</span>
              ${Array.from({ length: grid.stepCount }, (_, stepIndex) => {
                const startBeat = stepIndex * grid.stepBeat;
                const note = findPianoRollNoteAtCell(notes, startBeat, pitch, grid.stepBeat);
                const isSelected = note && note.id === selectedNoteId;
                const isStart = !!note && Math.abs(Number(note.startBeat || 0) - startBeat) < 0.0001;
                const isEnd = !!note && getPianoRollNoteEnd(note) <= startBeat + grid.stepBeat + 0.0001;
                return `
                  <button
                    class="piano-roll-cell${note ? " has-note" : ""}${isStart ? " note-start" : ""}${note && !isStart ? " note-body" : ""}${isEnd ? " note-end" : ""}${isSelected ? " selected" : ""}"
                    type="button"
                    data-piano-cell="true"
                    data-track-control="${track.id}"
                    data-control="pianoNote"
                    data-note-beat="${startBeat.toFixed(4)}"
                    data-note-step="${stepIndex}"
                    data-note-pitch="${pitch}"
                    data-note-id="${escapeHtml(note?.id || "")}"
                    data-note-edge="${isEnd ? "end" : "body"}"
                    aria-pressed="${note ? "true" : "false"}"
                    title="${note ? "Drag to move; drag edge/Shift-drag to resize" : "Drag to paint note"} at beat ${startBeat + 1}, pitch ${pitch > 0 ? "+" : ""}${pitch}"
                    onpointerdown="window.freemixPianoRollPointerDown(event)"
                  ></button>
                `;
              }).join("")}
            </div>
          `)
          .join("")}
      </div>
      <div class="piano-roll-edit-row">
        <label class="piano-roll-velocity">
          <span>Velocity</span>
          <input
            type="range"
            min="1"
            max="100"
            value="${selectedVelocity}"
            data-track-control="${track.id}"
            data-control="pianoVelocity"
            oninput="window.freemixPianoRollVelocityInput(event)"
            ${selectedNote ? "" : "disabled"}
          >
        </label>
        <label class="piano-roll-velocity piano-roll-duration">
          <span>Length</span>
          <input
            type="range"
            min="1"
            max="${grid.stepCount}"
            value="${selectedDurationSteps}"
            data-track-control="${track.id}"
            data-control="pianoDuration"
            oninput="window.freemixPianoRollDurationInput(event)"
            ${selectedNote ? "" : "disabled"}
          >
        </label>
        <span class="piano-roll-hint">Drag empty cells to paint. Drag notes to move. Drag note edges or Shift-drag to resize.</span>
      </div>
    </div>
  `;
}

function normalizeAutomationTargetKey(value, fallback = DEFAULT_CLIP_AUTOMATION_TARGET) {
  return CLIP_AUTOMATION_TARGETS[value] ? value : CLIP_AUTOMATION_TARGETS[fallback] ? fallback : DEFAULT_CLIP_AUTOMATION_TARGET;
}

function getSelectedAutomationTarget(track) {
  return normalizeAutomationTargetKey(track?.__selectedAutomationTarget);
}

function getSelectedAutomationPointId(track, envelope) {
  const selectedId = String(track?.__selectedAutomationPointId || "");
  if (selectedId && envelope?.points?.some((point) => point.id === selectedId)) {
    return selectedId;
  }

  if (track) {
    track.__selectedAutomationPointId = null;
  }
  return "";
}

function getAutomationTargetLabel(targetKey) {
  return CLIP_AUTOMATION_TARGET_OPTIONS.find((option) => option.value === targetKey)?.label || targetKey;
}

function getAutomationValuePercent(targetKey, value) {
  const targetDefinition = CLIP_AUTOMATION_TARGETS[targetKey];
  if (!targetDefinition) {
    return 0;
  }

  if (targetDefinition.type === "enum") {
    const values = targetDefinition.values || [];
    const index = Math.max(0, values.indexOf(value));
    return values.length > 1 ? index / (values.length - 1) : 0;
  }

  const min = Number(targetDefinition.min);
  const max = Number(targetDefinition.max);
  const numericValue = Number(value);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || !Number.isFinite(numericValue)) {
    return 0;
  }

  return clamp((numericValue - min) / (max - min), 0, 1);
}

function getAutomationPointLabel(targetKey, point) {
  const targetDefinition = CLIP_AUTOMATION_TARGETS[targetKey];
  const beat = Number(point?.beat || 0).toFixed(2).replace(/\.?0+$/, "");
  const value = targetDefinition?.type === "enum"
    ? String(point?.value || targetDefinition.defaultValue)
    : Number(point?.value ?? targetDefinition?.defaultValue ?? 0).toFixed(2).replace(/\.?0+$/, "");
  return `Beat ${beat}: ${value}`;
}

function renderAutomationEditor(track, renderState = getTrackRenderState(track)) {
  const targetKey = getSelectedAutomationTarget(track);
  const targetDefinition = CLIP_AUTOMATION_TARGETS[targetKey];
  if (!targetDefinition) {
    return "";
  }

  const beatsPerBar = getTransportBeatsPerBar();
  const automation = normalizeClipAutomation(renderState?.automation);
  const envelope = automation[targetKey] || createAutomationEnvelope(targetKey, { enabled: false });
  const selectedPointId = getSelectedAutomationPointId(track, envelope);
  const hasPoints = envelope.points.length > 0;
  const targetOptions = CLIP_AUTOMATION_TARGET_OPTIONS.map((option) => (
    `<option value="${escapeHtml(option.value)}" ${option.value === targetKey ? "selected" : ""}>${escapeHtml(option.label)}</option>`
  )).join("");
  const interpolationDisabled = targetDefinition.type === "enum" ? "disabled" : "";
  const pointsMarkup = envelope.points
    .map((point) => {
      const left = clamp(Number(point.beat || 0) / beatsPerBar, 0, 1) * 100;
      const bottom = getAutomationValuePercent(targetKey, point.value) * 100;
      const isSelected = point.id === selectedPointId;
      return `
        <button
          class="automation-point${isSelected ? " selected" : ""}"
          type="button"
          data-track-control="${track.id}"
          data-control="automationPoint"
          data-automation-target="${escapeHtml(targetKey)}"
          data-automation-point-id="${escapeHtml(point.id)}"
          style="left: ${left.toFixed(3)}%; bottom: ${bottom.toFixed(3)}%;"
          title="${escapeHtml(getAutomationPointLabel(targetKey, point))}"
          onpointerdown="window.freemixAutomationPointPointerDown(event)"
        ></button>
      `;
    })
    .join("");

  return `
    <section class="automation-editor" data-automation-editor="${track.id}">
      <div class="automation-head">
        <span>Automation</span>
        <select
          data-track-control="${track.id}"
          data-control="automationTarget"
          onchange="window.freemixAutomationTargetChange(event)"
          aria-label="${escapeHtml(`${track.name} automation target`)}"
        >
          ${targetOptions}
        </select>
        <button
          class="automation-tool${envelope.enabled ? " active" : ""}"
          type="button"
          data-track-control="${track.id}"
          data-control="automationEnable"
          onclick="window.freemixAutomationToggle(event)"
          aria-pressed="${!!envelope.enabled}"
        >${envelope.enabled ? "On" : "Off"}</button>
        <button
          class="automation-tool"
          type="button"
          data-track-control="${track.id}"
          data-control="automationReset"
          onclick="window.freemixAutomationReset(event)"
          ${hasPoints || renderState?.automation?.[targetKey] ? "" : "disabled"}
        >Reset</button>
      </div>
      <div
        class="automation-lane${envelope.enabled ? " enabled" : ""}"
        data-track-control="${track.id}"
        data-control="automation"
        data-automation-target="${escapeHtml(targetKey)}"
        style="--automation-beats: ${beatsPerBar};"
        onpointerdown="window.freemixAutomationLanePointerDown(event)"
        role="presentation"
      >
        <div class="automation-line" aria-hidden="true"></div>
        ${pointsMarkup}
      </div>
      <div class="automation-footer">
        <label>
          <span>Curve</span>
          <select
            data-track-control="${track.id}"
            data-control="automationInterpolation"
            onchange="window.freemixAutomationInterpolationChange(event)"
            ${interpolationDisabled}
          >
            <option value="linear" ${envelope.interpolation === "linear" ? "selected" : ""}>Linear</option>
            <option value="hold" ${envelope.interpolation === "hold" ? "selected" : ""}>Hold</option>
          </select>
        </label>
        <button
          class="automation-tool"
          type="button"
          data-track-control="${track.id}"
          data-control="automationDeletePoint"
          onclick="window.freemixDeleteSelectedAutomationPoint(event)"
          ${selectedPointId ? "" : "disabled"}
        >Delete point</button>
        <span>${escapeHtml(getAutomationTargetLabel(targetKey))}${hasPoints ? `: ${envelope.points.length} point${envelope.points.length === 1 ? "" : "s"}` : ": no points"}</span>
      </div>
    </section>
  `;
}

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
  const pianoRollEditor = renderPianoRollEditor(track, renderState);
  const automationEditor = renderAutomationEditor(track, renderState);
  const levelControls = renderTrackControls(track, TRACK_CONTROL_SECTIONS.performance);
  const advancedControls = TRACK_CONTROL_SECTIONS.advanced
    .map((control) => renderTrackControlField(track, control))
    .join("");
  const activeChip = renderState.muted ? "" : " is-on";
  const canRemove = tracks.length > 1;
  const trackIndex = tracks.findIndex((item) => item.id === track.id);
  const heightMode = Object.prototype.hasOwnProperty.call(TRACK_HEIGHT_MODES, track.heightMode) ? track.heightMode : "normal";
  const trackStateClasses = [
    track.color,
    track.collapsed ? "is-collapsed" : "",
    track.locked ? "is-locked" : "",
    track.frozen ? "is-frozen" : "",
    track.__bounceInProgress ? "is-bouncing" : "",
    heightMode !== "normal" ? `is-height-${heightMode}` : "",
  ].filter(Boolean).join(" ");

  return `
    <article class="track-row ${trackStateClasses}" data-track-row-id="${track.id}">
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
            class="track-state-chip ${track.locked ? "is-on" : ""}"
            type="button"
            data-track-control="${track.id}"
            data-control="lockTrack"
            aria-pressed="${!!track.locked}"
            title="${track.locked ? "Unlock editing" : "Lock against accidental edits"}"
          >
            Lock
          </button>
          <button
            class="track-state-chip ${track.frozen ? "is-on" : ""}"
            type="button"
            data-track-control="${track.id}"
            data-control="freezeTrack"
            aria-pressed="${!!track.frozen}"
            ${track.__bounceInProgress ? "disabled" : ""}
            title="${track.frozen ? "Unfreeze rendered bounce" : "Bounce this track to rendered media"}"
          >
            ${track.__bounceInProgress ? "Bouncing" : track.frozen ? "Unfreeze" : "Bounce"}
          </button>
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
          <button
            class="track-state-chip track-remove-chip"
            type="button"
            data-track-control="${track.id}"
            data-control="removeTrack"
            ${canRemove ? "" : "disabled"}
            title="${canRemove ? `Remove ${escapeHtml(track.name)}` : "Keep at least one A/V track"}"
          >
            Remove
          </button>
        </div>
      </div>
      <div class="track-row-body">
        ${renderTrackUtilityRow(track, trackIndex)}
        ${renderTrackMediaPrep(track, renderState)}
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
        ${pianoRollEditor}
        ${automationEditor}
        ${advancedControls}
      </div>
    </article>
  `;
}

function renderTextControlPanel() {
  const stepIndex = selectedTextClipStep !== null ? selectedTextClipStep : getArrangementStepIndex(arrangement?.step);
  const textClip = stepIndex === null ? null : getArrangementTextClip(stepIndex);
  const selectedField = stepIndex === null ? null : getSelectedTextField(stepIndex);
  const fieldOptions = textClip?.fields?.length
    ? textClip.fields
        .map((field, index) => `<option value="${escapeHtml(field.id)}" ${field.id === textClip.selectedFieldId ? "selected" : ""}>Field ${index + 1}</option>`)
        .join("")
    : `<option value="">No fields</option>`;
  const canCreateTextHere = stepIndex !== null;
  const textDisabled = canCreateTextHere ? "" : "disabled";
  const disabled = selectedField ? "" : "disabled";
  const fontOptions = TEXT_FONT_OPTIONS.map(
    (option) => `<option value="${escapeHtml(option.value)}" ${selectedField?.font === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`,
  ).join("");
  return `
    <article class="track-row text-editor-row${selectedTextClipStep !== null ? " selected" : ""}${textToolbarCollapsed ? " is-collapsed" : ""}" data-text-editor="true">
      <div class="track-row-label">
        <div class="track-row-title">
          <button
            class="track-state-chip track-title-action track-collapse-toggle"
            type="button"
            data-text-action="toggle-toolbar"
            aria-pressed="${!textToolbarCollapsed}"
            aria-expanded="${!textToolbarCollapsed}"
            aria-label="${textToolbarCollapsed ? "Expand text toolbar" : "Collapse text toolbar"}"
            title="${textToolbarCollapsed ? "Expand text toolbar" : "Collapse text toolbar"}"
          >
            ${textToolbarCollapsed ? "Show" : "Hide"}
          </button>
          <span class="track-row-name text-row-name">TEXT</span>
        </div>
        <div class="track-state-chips" aria-label="Text layer states">
          <span class="track-state-chip${textClip ? " is-on" : ""}">Overlay</span>
          <span class="track-state-chip">Top Layer</span>
          <button
            class="track-state-chip ${textTrackMuted ? "is-on" : ""}"
            type="button"
            data-text-action="toggle-mute"
            aria-pressed="${textTrackMuted}"
            title="${textTrackMuted ? "Unmute TEXT layer" : "Mute TEXT layer"}"
          >
            ${textTrackMuted ? "Muted" : "On"}
          </button>
          <button
            class="track-state-chip ${textTrackSolo ? "is-on" : ""}"
            type="button"
            data-text-action="toggle-solo"
            aria-pressed="${textTrackSolo}"
            title="Solo TEXT layer"
          >
            Solo
          </button>
        </div>
      </div>
      <div class="track-row-body text-editor-body">
        <label class="control-field text-body-field">
          <span>Words</span>
          <textarea
            data-text-control="text"
            rows="3"
            maxlength="240"
            ${textDisabled}
            placeholder="${canCreateTextHere ? "Type to create/edit text for this scene" : "Click a TEXT cell, then write here"}"
          >${escapeHtml(selectedField?.text || "")}</textarea>
        </label>
        <div class="text-tool-row">
          <label class="control-field">
            <span>Field</span>
            <select data-text-control="selectedFieldId" ${textClip ? "" : "disabled"}>
              ${fieldOptions}
            </select>
          </label>
          <button class="text-tool-button" type="button" data-text-action="add-field" ${canCreateTextHere ? "" : "disabled"}>Add Field</button>
          <button class="text-tool-button" type="button" data-text-action="delete-field" ${disabled}>Delete Field</button>
        </div>
        <div class="text-tool-row text-tool-row--format">
          <label class="control-field">
            <span>Font</span>
            <select data-text-control="font" ${disabled}>
              ${fontOptions}
            </select>
          </label>
          <button class="text-style-toggle${selectedField?.bold ? " active" : ""}" type="button" data-text-control="bold" ${disabled}>B</button>
          <button class="text-style-toggle${selectedField?.italic ? " active" : ""}" type="button" data-text-control="italic" ${disabled}>I</button>
          <button class="text-style-toggle${selectedField?.underline ? " active" : ""}" type="button" data-text-control="underline" ${disabled}>U</button>
        </div>
        <div class="text-tool-row text-tool-row--sliders">
          <label class="control-field">
            <span>Size</span>
            <input type="range" min="10" max="72" step="1" value="${selectedField?.size ?? 28}" data-text-control="size" ${disabled}>
          </label>
          <label class="control-field">
            <span>X</span>
            <input type="range" min="0" max="100" step="1" value="${selectedField?.x ?? 50}" data-text-control="x" ${disabled}>
          </label>
          <button class="text-tool-button text-tool-button--mini" type="button" data-text-action="center-x" ${disabled}>Center</button>
          <label class="control-field">
            <span>Y</span>
            <input type="range" min="0" max="100" step="1" value="${selectedField?.y ?? 50}" data-text-control="y" ${disabled}>
          </label>
          <button class="text-tool-button text-tool-button--mini" type="button" data-text-action="center-y" ${disabled}>Center</button>
          <label class="control-field">
            <span>Opacity</span>
            <input type="range" min="0" max="1" step="0.01" value="${selectedField?.opacity ?? 1}" data-text-control="opacity" ${disabled}>
          </label>
        </div>
        <div class="text-tool-row text-tool-row--color">
          <label class="control-field">
            <span>Fill</span>
            <input type="color" value="${escapeHtml(selectedField?.color || TEXT_DEFAULT_COLOR)}" data-text-control="color" ${disabled}>
          </label>
          <label class="control-field">
            <span>Align</span>
            <select data-text-control="align" ${disabled}>
              ${TEXT_ALIGN_OPTIONS.map((align) => `<option value="${align}" ${selectedField?.align === align ? "selected" : ""}>${align}</option>`).join("")}
            </select>
          </label>
          <button class="text-style-toggle${selectedField?.stroke ? " active" : ""}" type="button" data-text-control="stroke" ${disabled}>Stroke</button>
          <button class="text-style-toggle${selectedField?.shadow ? " active" : ""}" type="button" data-text-control="shadow" ${disabled}>Shadow</button>
        </div>
        <div class="text-tool-row text-tool-row--color">
          <label class="control-field">
            <span>Stroke</span>
            <input type="color" value="${escapeHtml(selectedField?.strokeColor || TEXT_DEFAULT_STROKE_COLOR)}" data-text-control="strokeColor" ${disabled}>
          </label>
          <label class="control-field">
            <span>Stroke Size</span>
            <input type="range" min="0" max="8" step="0.5" value="${selectedField?.strokeWidth ?? 2}" data-text-control="strokeWidth" ${disabled}>
          </label>
          <label class="control-field">
            <span>Drop</span>
            <input type="color" value="${escapeHtml(selectedField?.shadowColor || TEXT_DEFAULT_SHADOW_COLOR)}" data-text-control="shadowColor" ${disabled}>
          </label>
          <label class="control-field">
            <span>Blur</span>
            <input type="range" min="0" max="24" step="1" value="${selectedField?.shadowBlur ?? 8}" data-text-control="shadowBlur" ${disabled}>
          </label>
        </div>
        <div class="text-tool-row text-tool-row--shadow">
          <label class="control-field">
            <span>Shadow X</span>
            <input type="range" min="-24" max="24" step="1" value="${selectedField?.shadowX ?? 3}" data-text-control="shadowX" ${disabled}>
          </label>
          <label class="control-field">
            <span>Shadow Y</span>
            <input type="range" min="-24" max="24" step="1" value="${selectedField?.shadowY ?? 3}" data-text-control="shadowY" ${disabled}>
          </label>
        </div>
      </div>
    </article>
  `;
}

function renderDrumControlPanel() {
  const stepIndex = selectedDrumClipStep !== null ? selectedDrumClipStep : getArrangementStepIndex(arrangement?.step);
  const drumClip = stepIndex === null ? null : getArrangementDrumClip(stepIndex);
  const stepCount = getDrumStepCount();
  const pattern = normalizeDrumPattern(drumClip?.pattern, stepCount);
  const disabled = drumClip ? "" : "disabled";
  const kitOptions = DRUM_KITS.map(
    (kit) => `<option value="${kit}" ${drumClip?.kit === kit ? "selected" : ""}>${kit}</option>`,
  ).join("");
  const grid = DRUM_VOICES.map((voice) => `
    <div class="drum-grid-row" role="row">
      <div class="drum-row-name">${escapeHtml(voice.label)}</div>
      ${Array.from({ length: stepCount }, (_, index) => {
        const velocity = normalizeDrumVelocity(pattern[voice.id]?.[index]);
        const velocityPercent = Math.round(velocity * 100);
        const isActive = velocity > 0;
        const beatClass = index % 4 === 0 ? " is-beat" : "";
        return `
          <button
            class="drum-step-button${isActive ? " active" : ""}${beatClass}"
            type="button"
            data-drum-control="step"
            data-drum-voice="${voice.id}"
            data-drum-step="${index}"
            data-drum-velocity="${velocity.toFixed(2)}"
            aria-pressed="${isActive}"
            aria-label="${escapeHtml(`${voice.label} step ${index + 1} velocity ${velocityPercent}%`)}"
            style="--drum-velocity-percent: ${velocityPercent}%"
            ${disabled}
            title="${escapeHtml(`${voice.label} step ${index + 1}: ${velocityPercent}% velocity`)}"
          ></button>
        `;
      }).join("")}
    </div>
  `).join("");

  return `
    <article class="track-row drum-editor-row${selectedDrumClipStep !== null ? " selected" : ""}${drumToolbarCollapsed ? " is-collapsed" : ""}" data-drum-editor="true">
      <div class="track-row-label">
        <div class="track-row-title">
          <button
            class="track-state-chip track-title-action track-collapse-toggle"
            type="button"
            data-drum-action="toggle-toolbar"
            aria-pressed="${!drumToolbarCollapsed}"
            aria-expanded="${!drumToolbarCollapsed}"
            aria-label="${drumToolbarCollapsed ? "Expand drum toolbar" : "Collapse drum toolbar"}"
            title="${drumToolbarCollapsed ? "Expand drum toolbar" : "Collapse drum toolbar"}"
          >
            ${drumToolbarCollapsed ? "Show" : "Hide"}
          </button>
          <span class="track-row-name drum-row-title">DRUM</span>
        </div>
        <div class="track-state-chips" aria-label="Drum machine states">
          <span class="track-state-chip${drumClip ? " is-on" : ""}">Machine</span>
          <span class="track-state-chip">${stepCount} steps</span>
          <button
            class="track-state-chip ${drumTrackMuted ? "is-on" : ""}"
            type="button"
            data-drum-action="toggle-mute"
            aria-pressed="${drumTrackMuted}"
            title="${drumTrackMuted ? "Unmute DRUM track" : "Mute DRUM track"}"
          >
            ${drumTrackMuted ? "Muted" : "On"}
          </button>
          <button
            class="track-state-chip ${drumTrackSolo ? "is-on" : ""}"
            type="button"
            data-drum-action="toggle-solo"
            aria-pressed="${drumTrackSolo}"
            title="Solo DRUM track"
          >
            Solo
          </button>
        </div>
      </div>
      <div class="track-row-body drum-editor-body">
        <div class="drum-tool-row">
          <label class="control-field">
            <span>Kit</span>
            <select data-drum-control="kit" ${disabled}>
              ${kitOptions}
            </select>
          </label>
          <label class="control-field">
            <span>Volume</span>
            <input type="range" min="0" max="1" step="0.01" value="${drumClip?.volume ?? 0.8}" data-drum-control="volume" ${disabled}>
          </label>
          <button class="drum-tool-button" type="button" data-drum-action="create">${drumClip ? "Refresh" : "Create"}</button>
          <button class="drum-tool-button" type="button" data-drum-action="clear" ${disabled}>Clear</button>
        </div>
        <div class="drum-grid" style="--drum-steps: ${stepCount}" role="grid" aria-label="Drum pattern editor">
          ${grid}
        </div>
      </div>
    </article>
  `;
}

function renderTrackUtilityRow(track, trackIndex = -1) {
  const heightMode = Object.prototype.hasOwnProperty.call(TRACK_HEIGHT_MODES, track.heightMode) ? track.heightMode : "normal";
  const capturePreset = Object.prototype.hasOwnProperty.call(TRACK_CAPTURE_PRESETS, track.capturePreset) ? track.capturePreset : "current";
  const timingNudge = getTrackTimingNudgeMs(track);
  return `
    <div class="track-tool-row" aria-label="${escapeHtml(track.name)} track tools">
      <label class="control-field track-color-field">
        <span>Color</span>
        <select data-track-control="${track.id}" data-control="trackColor">
          ${TRACK_COLORS.map((color) => `<option value="${color}" ${track.color === color ? "selected" : ""}>${TRACK_COLOR_LABELS[color] || color}</option>`).join("")}
        </select>
      </label>
      <label class="control-field track-height-field">
        <span>View</span>
        <select data-track-control="${track.id}" data-control="heightMode">
          ${Object.entries(TRACK_HEIGHT_MODES).map(([value, label]) => `<option value="${value}" ${heightMode === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
      <label class="control-field track-capture-field">
        <span>Capture</span>
        <select data-track-control="${track.id}" data-control="capturePreset">
          ${Object.entries(TRACK_CAPTURE_PRESETS).map(([value, label]) => `<option value="${value}" ${capturePreset === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
      <label class="control-field compact-number track-nudge-field">
        <span>Nudge ms</span>
        <input type="number" min="-250" max="250" step="1" value="${timingNudge}" data-track-control="${track.id}" data-control="timingNudgeMs">
      </label>
      <button class="track-tool-button" type="button" data-track-control="${track.id}" data-control="moveTrackUp" ${trackIndex <= 0 ? "disabled" : ""}>Up</button>
      <button class="track-tool-button" type="button" data-track-control="${track.id}" data-control="moveTrackDown" ${trackIndex < 0 || trackIndex >= tracks.length - 1 ? "disabled" : ""}>Down</button>
      <button class="track-tool-button" type="button" data-track-control="${track.id}" data-control="duplicateTrack" ${tracks.length >= MAX_TRACK_COUNT ? "disabled" : ""}>Duplicate</button>
      <button class="track-tool-button danger" type="button" data-track-control="${track.id}" data-control="clearTrackLane">Clear Lane</button>
    </div>
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

let pianoRollDragState = null;
let pianoRollSuppressClickUntil = 0;

function updatePianoRollEditorForTrack(track) {
  if (window.freemixRender?.updateTrackRow) {
    window.freemixRender.updateTrackRow(track);
  } else {
    renderWorkstation();
  }
}

function getPianoRollEditableContext(track, controlName = "pianoNote") {
  if (!track) {
    return null;
  }

  const safeStepIndex = getArrangementStepIndex(arrangement?.step);
  const shouldCreateSceneClipOnEdit =
    SCENE_EDITABLE_CONTROLS.has(controlName) &&
    safeStepIndex !== null &&
    !getArrangementStepClip(track, safeStepIndex);
  const editableState = shouldCreateSceneClipOnEdit
    ? getArrangementStepClipForTrack(track, { stepIndex: safeStepIndex, create: true })
    : getTrackSceneEditableState(track, controlName);

  return {
    editableState: editableState || track,
    safeStepIndex,
  };
}

function getPianoRollCellInfo(control) {
  const cell = control?.closest?.("[data-piano-cell='true']");
  if (!cell) {
    return null;
  }

  const track = getTrackById(cell.dataset.trackControl);
  const startBeat = Number(cell.dataset.noteBeat);
  const pitchSemitones = Number(cell.dataset.notePitch);
  if (!track || !Number.isFinite(startBeat) || !Number.isFinite(pitchSemitones)) {
    return null;
  }

  return {
    cell,
    track,
    startBeat,
    pitchSemitones,
    edge: cell.dataset.noteEdge || "body",
    key: `${track.id}:${startBeat.toFixed(4)}:${pitchSemitones}`,
    grid: getPianoRollEditorGrid(),
  };
}

function getPianoRollCellFromPointer(event) {
  const target = document.elementFromPoint(event.clientX, event.clientY);
  return target?.closest?.("[data-piano-cell='true']") || null;
}

function capturePianoRollEditIfNeeded(track, context, label, dragState = null) {
  if (!track || !context?.editableState || context.editableState === track || !arrangement?.clips) {
    return false;
  }

  if (dragState) {
    if (dragState.didCapture) {
      return false;
    }
    dragState.didCapture = true;
  }

  captureArrangementEdit(label || `Changed piano roll in scene ${(context.safeStepIndex ?? 0) + 1}`);
  return true;
}

function commitPianoRollNotes(track, context, notes, selectedNoteId = "", options = {}) {
  if (!track || !context?.editableState) {
    return false;
  }

  if (options.capture) {
    capturePianoRollEditIfNeeded(track, context, options.captureLabel, options.dragState || null);
  }

  const editableState = context.editableState;
  const normalizedNotes = normalizePianoRollNotes(notes);
  const resolvedSelectedId = selectedNoteId && normalizedNotes.some((note) => note.id === selectedNoteId)
    ? selectedNoteId
    : "";

  editableState.timingMode = CLIP_TIMING_MODES.pianoRoll;
  editableState.notes = normalizedNotes;
  editableState.selectedNoteId = resolvedSelectedId;
  track.__selectedPianoRollNoteId = resolvedSelectedId;
  applyArrangementClipControlValue(track, "timingMode", editableState.timingMode, editableState);
  applyArrangementClipControlValue(track, "notes", editableState.notes, editableState);

  if (editableState !== track && arrangement?.clips) {
    refreshArrangementStepCells(context.safeStepIndex ?? 0);
  }

  if (options.render !== false) {
    updatePianoRollEditorForTrack(track);
  }

  markAppStateDirty(true);
  if (options.status !== false) {
    setStatus(`${track.name}: piano roll ${normalizedNotes.length} note${normalizedNotes.length === 1 ? "" : "s"}`);
  }
  return true;
}

function selectPianoRollNote(track, context, noteId) {
  if (!track || !context?.editableState) {
    return false;
  }

  const notes = normalizePianoRollNotes(context.editableState.notes);
  const selectedId = noteId && notes.some((note) => note.id === noteId) ? noteId : "";
  context.editableState.selectedNoteId = selectedId;
  track.__selectedPianoRollNoteId = selectedId;
  updatePianoRollEditorForTrack(track);
  return true;
}

function addPianoRollNoteAtCell(track, context, cellInfo, dragState = null) {
  const notes = normalizePianoRollNotes(context.editableState.notes);
  const existingNote = findPianoRollNoteStartingAtCell(notes, cellInfo.startBeat, cellInfo.pitchSemitones);
  if (existingNote) {
    selectPianoRollNote(track, context, existingNote.id);
    return existingNote.id;
  }

  const nextNote = createPianoRollNote({
    startBeat: cellInfo.startBeat,
    pitchSemitones: cellInfo.pitchSemitones,
    durationBeats: cellInfo.grid.stepBeat,
    velocity: dragState?.velocity ?? 1,
  });
  notes.push(nextNote);
  commitPianoRollNotes(track, context, notes, nextNote.id, {
    capture: true,
    captureLabel: `Changed piano roll in scene ${(context.safeStepIndex ?? 0) + 1}`,
    dragState,
  });
  return nextNote.id;
}

function movePianoRollNoteToCell(track, context, cellInfo, dragState) {
  const notes = normalizePianoRollNotes(context.editableState.notes);
  const noteIndex = notes.findIndex((note) => note.id === dragState.noteId);
  if (noteIndex < 0) {
    return false;
  }

  const note = notes[noteIndex];
  const durationBeats = Math.max(PIANO_ROLL_MIN_NOTE_BEATS, Number(note.durationBeats) || cellInfo.grid.stepBeat);
  const maxStart = Math.max(0, cellInfo.grid.beatsPerBar - durationBeats);
  const nextStartBeat = clamp(cellInfo.startBeat, 0, maxStart);
  const nextPitch = clamp(
    cellInfo.pitchSemitones,
    PIANO_ROLL_MIN_PITCH_SEMITONES,
    PIANO_ROLL_MAX_PITCH_SEMITONES,
  );
  if (
    Math.abs(Number(note.startBeat || 0) - nextStartBeat) < 0.0001 &&
    Number(note.pitchSemitones) === nextPitch
  ) {
    return false;
  }

  notes[noteIndex] = {
    ...note,
    startBeat: nextStartBeat,
    pitchSemitones: nextPitch,
  };
  commitPianoRollNotes(track, context, notes, note.id, {
    capture: true,
    captureLabel: `Moved piano roll note in scene ${(context.safeStepIndex ?? 0) + 1}`,
    dragState,
  });
  return true;
}

function resizePianoRollNoteToCell(track, context, cellInfo, dragState) {
  const notes = normalizePianoRollNotes(context.editableState.notes);
  const noteIndex = notes.findIndex((note) => note.id === dragState.noteId);
  if (noteIndex < 0) {
    return false;
  }

  const note = notes[noteIndex];
  const noteStart = Number(note.startBeat) || 0;
  const requestedEnd = cellInfo.startBeat + cellInfo.grid.stepBeat;
  const nextDuration = clamp(
    requestedEnd - noteStart,
    cellInfo.grid.stepBeat,
    Math.max(cellInfo.grid.stepBeat, cellInfo.grid.beatsPerBar - noteStart),
  );
  if (Math.abs(Number(note.durationBeats || 0) - nextDuration) < 0.0001) {
    return false;
  }

  notes[noteIndex] = {
    ...note,
    durationBeats: nextDuration,
  };
  commitPianoRollNotes(track, context, notes, note.id, {
    capture: true,
    captureLabel: `Resized piano roll note in scene ${(context.safeStepIndex ?? 0) + 1}`,
    dragState,
  });
  return true;
}

function editPianoRollCellFromPointer(event, cellInfo, dragState) {
  if (!cellInfo || !dragState || cellInfo.track.id !== dragState.trackId || cellInfo.key === dragState.lastCellKey) {
    return false;
  }

  const context = getPianoRollEditableContext(cellInfo.track, "pianoNote");
  if (!context) {
    return false;
  }

  dragState.lastCellKey = cellInfo.key;
  if (dragState.mode === "paint") {
    addPianoRollNoteAtCell(cellInfo.track, context, cellInfo, dragState);
    return true;
  }

  if (dragState.mode === "resize") {
    return resizePianoRollNoteToCell(cellInfo.track, context, cellInfo, dragState);
  }

  return movePianoRollNoteToCell(cellInfo.track, context, cellInfo, dragState);
}

window.freemixPianoRollPointerDown = (event) => {
  const cellInfo = getPianoRollCellInfo(event.currentTarget);
  if (!cellInfo) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  pianoRollSuppressClickUntil = performance.now() + 250;
  cellInfo.cell.closest(".piano-roll-editor")?.focus?.({ preventScroll: true });

  const context = getPianoRollEditableContext(cellInfo.track, "pianoNote");
  if (!context) {
    return;
  }

  context.editableState.timingMode = CLIP_TIMING_MODES.pianoRoll;
  context.editableState.notes = normalizePianoRollNotes(context.editableState.notes);
  const note = findPianoRollNoteAtCell(
    context.editableState.notes,
    cellInfo.startBeat,
    cellInfo.pitchSemitones,
    cellInfo.grid.stepBeat,
  );
  const mode = note
    ? event.shiftKey || cellInfo.edge === "end"
      ? "resize"
      : "move"
    : "paint";

  pianoRollDragState = {
    mode,
    trackId: cellInfo.track.id,
    noteId: note?.id || "",
    velocity: note?.velocity ?? 1,
    lastCellKey: "",
    didCapture: false,
  };

  if (note) {
    selectPianoRollNote(cellInfo.track, context, note.id);
    pianoRollDragState.noteId = note.id;
    pianoRollDragState.lastCellKey = cellInfo.key;
  } else {
    pianoRollDragState.noteId = addPianoRollNoteAtCell(cellInfo.track, context, cellInfo, pianoRollDragState);
    pianoRollDragState.lastCellKey = cellInfo.key;
  }

  document.addEventListener("pointermove", window.freemixPianoRollPointerMove, { passive: false });
  document.addEventListener("pointerup", window.freemixPianoRollPointerUp, { once: true });
  document.addEventListener("pointercancel", window.freemixPianoRollPointerUp, { once: true });
};

window.freemixPianoRollPointerMove = (event) => {
  if (!pianoRollDragState) {
    return;
  }

  event.preventDefault();
  const cell = getPianoRollCellFromPointer(event);
  const cellInfo = getPianoRollCellInfo(cell);
  editPianoRollCellFromPointer(event, cellInfo, pianoRollDragState);
};

window.freemixPianoRollPointerUp = () => {
  document.removeEventListener("pointermove", window.freemixPianoRollPointerMove);
  document.removeEventListener("pointercancel", window.freemixPianoRollPointerUp);
  pianoRollDragState = null;
};

window.freemixPianoRollVelocityInput = (event) => {
  const control = event.currentTarget;
  const track = getTrackById(control.dataset.trackControl);
  const context = getPianoRollEditableContext(track, "pianoVelocity");
  if (!track || !context) {
    return;
  }

  const notes = normalizePianoRollNotes(context.editableState.notes);
  const selectedNoteId = getSelectedPianoRollNoteId(track, notes) || context.editableState.selectedNoteId || "";
  const selectedIndex = notes.findIndex((note) => note.id === selectedNoteId);
  if (selectedIndex < 0) {
    return;
  }

  notes[selectedIndex] = {
    ...notes[selectedIndex],
    velocity: clamp(Number(control.value) / 100, 0, 1),
  };
  commitPianoRollNotes(track, context, notes, notes[selectedIndex].id, {
    capture: false,
    status: false,
    render: false,
  });
};

window.freemixPianoRollDurationInput = (event) => {
  const control = event.currentTarget;
  const track = getTrackById(control.dataset.trackControl);
  const context = getPianoRollEditableContext(track, "pianoNote");
  if (!track || !context) {
    return;
  }

  const notes = normalizePianoRollNotes(context.editableState.notes);
  const selectedNoteId = getSelectedPianoRollNoteId(track, notes) || context.editableState.selectedNoteId || "";
  const selectedIndex = notes.findIndex((note) => note.id === selectedNoteId);
  if (selectedIndex < 0) {
    return;
  }

  const grid = getPianoRollEditorGrid();
  const requestedSteps = Math.max(1, Number(control.value) || 1);
  const maxDuration = Math.max(grid.stepBeat, grid.beatsPerBar - Number(notes[selectedIndex].startBeat || 0));
  notes[selectedIndex] = {
    ...notes[selectedIndex],
    durationBeats: clamp(requestedSteps * grid.stepBeat, grid.stepBeat, maxDuration),
  };
  commitPianoRollNotes(track, context, notes, notes[selectedIndex].id, {
    capture: false,
    status: false,
  });
};

window.freemixDeleteSelectedPianoRollNote = (event) => {
  event?.preventDefault?.();
  const track = getTrackById(event?.currentTarget?.dataset?.trackControl);
  const context = getPianoRollEditableContext(track, "pianoNote");
  if (!track || !context) {
    return;
  }

  const notes = normalizePianoRollNotes(context.editableState.notes);
  const selectedNoteId = getSelectedPianoRollNoteId(track, notes) || context.editableState.selectedNoteId || "";
  if (!selectedNoteId) {
    return;
  }

  const nextNotes = notes.filter((note) => note.id !== selectedNoteId);
  commitPianoRollNotes(track, context, nextNotes, "", {
    capture: true,
    captureLabel: `Deleted piano roll note in scene ${(context.safeStepIndex ?? 0) + 1}`,
  });
};

window.freemixPreviewSelectedPianoRollNote = async (event) => {
  event?.preventDefault?.();
  event.__freemixHandledPianoRoll = true;
  event.stopImmediatePropagation?.();
  const track = getTrackById(event?.currentTarget?.dataset?.trackControl);
  const context = getPianoRollEditableContext(track, "pianoNote");
  if (!track || !context) {
    return;
  }

  if (transport?.active) {
    setStatus("Stop playback to preview piano-roll notes", true);
    return;
  }

  const notes = normalizePianoRollNotes(context.editableState.notes);
  const selectedNoteId = getSelectedPianoRollNoteId(track, notes) || context.editableState.selectedNoteId || "";
  const selectedNote = notes.find((note) => note.id === selectedNoteId);
  if (!selectedNote) {
    setStatus(`${track.name}: select a piano-roll note to preview`, true);
    return;
  }

  if (!getTrackPlaybackSourceUrl(track, context.editableState)) {
    setStatus(`${track.name}: load a source before previewing notes`, true);
    return;
  }

  if (typeof ensureAudioContext === "function" && !webAudioDisabled) {
    try {
      await ensureAudioContext();
    } catch (error) {
      console.warn("Piano-roll preview audio context unavailable", error);
    }
  }

  const beatMs = getTransportBeatMs();
  const beatsPerBar = getTransportBeatsPerBar();
  const previewClip = normalizeClipState(
    {
      ...context.editableState,
      timingMode: CLIP_TIMING_MODES.pianoRoll,
      notes: [selectedNote],
    },
    context.editableState,
  );
  const [noteEvent] = getPianoRollPlaybackEvents(previewClip, 0, beatsPerBar, {
    track,
    trackId: track.id,
    beatMs,
  });
  if (!noteEvent) {
    setStatus(`${track.name}: note preview unavailable`, true);
    return;
  }

  clearPianoRollAudition(track);
  const previewToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  track.__pianoRollAuditionToken = previewToken;
  const eventPlaybackState = createPianoRollEventPlaybackState(previewClip, noteEvent);
  triggerTrack(track, eventPlaybackState, transport?.sessionToken);

  const durationMs = Math.max(
    90,
    (Number(noteEvent.durationBeats) || Number(selectedNote.durationBeats) || 0.25) * beatMs,
  );
  track.__pianoRollAuditionTimer = window.setTimeout(() => {
    if (transport?.active || track.__pianoRollAuditionToken !== previewToken) {
      return;
    }

    const video = getTrackVideo(track);
    if (video && typeof video.pause === "function") {
      video.pause();
    }
    setTrackBlackout(track, true);
    setTrackPlaybackPhase(track, PLAYBACK_PHASES.stopped, { mediaStatus: "ready" });
    clearPianoRollAudition(track);
  }, durationMs);

  setStatus(`${track.name}: preview ${getPianoRollPitchLabel(previewClip.pianoRoot, selectedNote.pitchSemitones)}`);
};

function quantizePianoRollValue(value, stepBeat) {
  const step = Math.max(PIANO_ROLL_MIN_NOTE_BEATS, Number(stepBeat) || PIANO_ROLL_MIN_NOTE_BEATS);
  return Math.round((Number(value) || 0) / step) * step;
}

function getSelectedPianoRollNoteForEdit(track, context) {
  const notes = normalizePianoRollNotes(context?.editableState?.notes);
  const selectedNoteId = getSelectedPianoRollNoteId(track, notes) || context?.editableState?.selectedNoteId || "";
  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;
  return { notes, selectedNote, selectedNoteId };
}

window.freemixDuplicateSelectedPianoRollNote = (event) => {
  event?.preventDefault?.();
  event.__freemixHandledPianoRoll = true;
  event.stopImmediatePropagation?.();
  const track = getTrackById(event?.currentTarget?.dataset?.trackControl);
  const context = getPianoRollEditableContext(track, "pianoDuplicateNote");
  if (!track || !context) {
    return;
  }

  const { notes, selectedNote } = getSelectedPianoRollNoteForEdit(track, context);
  if (!selectedNote) {
    setStatus(`${track.name}: select a piano-roll note to duplicate`, true);
    return;
  }

  const grid = getPianoRollEditorGrid(context.editableState.pianoSnap);
  const durationBeats = clamp(
    Number(selectedNote.durationBeats) || grid.stepBeat,
    grid.stepBeat,
    Math.max(grid.stepBeat, grid.beatsPerBar),
  );
  const maxStartBeat = Math.max(0, grid.beatsPerBar - durationBeats);
  let nextStartBeat = quantizePianoRollValue(Number(selectedNote.startBeat || 0) + grid.stepBeat, grid.stepBeat);
  if (nextStartBeat > maxStartBeat + 0.0001) {
    nextStartBeat = quantizePianoRollValue(Math.max(0, Number(selectedNote.startBeat || 0) - grid.stepBeat), grid.stepBeat);
  }
  nextStartBeat = clamp(nextStartBeat, 0, maxStartBeat);

  const duplicateNote = createPianoRollNote({
    startBeat: nextStartBeat,
    durationBeats,
    pitchSemitones: selectedNote.pitchSemitones,
    velocity: selectedNote.velocity,
    anchorOffset: selectedNote.anchorOffset,
  });
  commitPianoRollNotes(track, context, [...notes, duplicateNote], duplicateNote.id, {
    capture: true,
    captureLabel: `Duplicated piano roll note in scene ${(context.safeStepIndex ?? 0) + 1}`,
  });
  setStatus(`${track.name}: note duplicated`);
};

window.freemixQuantizePianoRollNotes = (event) => {
  event?.preventDefault?.();
  event.__freemixHandledPianoRoll = true;
  event.stopImmediatePropagation?.();
  const track = getTrackById(event?.currentTarget?.dataset?.trackControl);
  const context = getPianoRollEditableContext(track, "pianoQuantizeNotes");
  if (!track || !context) {
    return;
  }

  const notes = normalizePianoRollNotes(context.editableState.notes);
  if (!notes.length) {
    setStatus(`${track.name}: no piano-roll notes to quantize`, true);
    return;
  }

  const grid = getPianoRollEditorGrid(context.editableState.pianoSnap);
  const quantizedNotes = notes.map((note) => {
    const durationBeats = clamp(
      quantizePianoRollValue(Number(note.durationBeats) || grid.stepBeat, grid.stepBeat),
      grid.stepBeat,
      Math.max(grid.stepBeat, grid.beatsPerBar),
    );
    const maxStartBeat = Math.max(0, grid.beatsPerBar - durationBeats);
    const startBeat = clamp(
      quantizePianoRollValue(Number(note.startBeat) || 0, grid.stepBeat),
      0,
      maxStartBeat,
    );
    return {
      ...note,
      startBeat,
      durationBeats,
    };
  });
  const selectedNoteId = getSelectedPianoRollNoteId(track, notes) || context.editableState.selectedNoteId || "";
  commitPianoRollNotes(track, context, quantizedNotes, selectedNoteId, {
    capture: true,
    captureLabel: `Quantized piano roll in scene ${(context.safeStepIndex ?? 0) + 1}`,
  });
  setStatus(`${track.name}: notes quantized to ${getPianoRollSnapDefinition(context.editableState.pianoSnap).label}`);
};

window.freemixPianoRollKeyDown = (event) => {
  if (!event || !["Delete", "Backspace"].includes(event.key)) {
    return;
  }

  const editor = event.currentTarget?.closest?.("[data-piano-roll-editor]");
  const track = getTrackById(editor?.dataset?.pianoRollEditor);
  if (!track) {
    return;
  }

  event.preventDefault();
  window.freemixDeleteSelectedPianoRollNote({
    preventDefault() {},
    currentTarget: { dataset: { trackControl: track.id } },
  });
};

function handlePianoRollNoteControl(track, editableState, control, safeStepIndex, isInputEvent) {
  if (pianoRollSuppressClickUntil > performance.now()) {
    return true;
  }

  if (!track || !editableState || !control) {
    return false;
  }

  const cellInfo = getPianoRollCellInfo(control);
  if (!cellInfo) {
    return false;
  }

  const context = { editableState, safeStepIndex };
  editableState.timingMode = CLIP_TIMING_MODES.pianoRoll;
  editableState.notes = normalizePianoRollNotes(editableState.notes);
  const note = findPianoRollNoteAtCell(
    editableState.notes,
    cellInfo.startBeat,
    cellInfo.pitchSemitones,
    cellInfo.grid.stepBeat,
  );

  if (note) {
    selectPianoRollNote(track, context, note.id);
    return true;
  }

  addPianoRollNoteAtCell(track, context, cellInfo, null);
  return true;
}

function handlePianoRollVelocityControl(track, editableState, control, safeStepIndex, isInputEvent) {
  if (!track || !editableState || !control) {
    return false;
  }

  editableState.notes = normalizePianoRollNotes(editableState.notes);
  const selectedNoteId = getSelectedPianoRollNoteId(track, editableState.notes) || editableState.selectedNoteId || "";
  const selectedIndex = editableState.notes.findIndex((note) => note.id === selectedNoteId);
  if (selectedIndex < 0) {
    return false;
  }

  if (editableState !== track && arrangement?.clips && !isInputEvent) {
    captureArrangementEdit(`Changed piano roll velocity in scene ${(safeStepIndex ?? 0) + 1}`);
  }

  const rawValue = Number(control.value);
  editableState.notes[selectedIndex] = {
    ...editableState.notes[selectedIndex],
    velocity: clamp(rawValue > 1 ? rawValue / 100 : rawValue, 0, 1),
  };
  editableState.selectedNoteId = editableState.notes[selectedIndex].id;
  track.__selectedPianoRollNoteId = editableState.selectedNoteId;
  applyArrangementClipControlValue(track, "notes", editableState.notes, editableState);
  if (!isInputEvent) {
    updatePianoRollEditorForTrack(track);
  }
  markAppStateDirty(true);
  return true;
}

let automationDragState = null;

function getAutomationEditableContext(track, controlName = "automation") {
  return getPianoRollEditableContext(track, controlName);
}

function getAutomationEnvelopeForEdit(automation, targetKey, enabledFallback = true) {
  const normalizedAutomation = normalizeClipAutomation(automation);
  return normalizedAutomation[targetKey] || createAutomationEnvelope(targetKey, { enabled: enabledFallback });
}

function captureAutomationEditIfNeeded(track, context, label, dragState = null) {
  if (!track || !context?.editableState || context.editableState === track || !arrangement?.clips) {
    return false;
  }

  if (dragState) {
    if (dragState.didCapture) {
      return false;
    }
    dragState.didCapture = true;
  }

  captureArrangementEdit(label || `Changed automation in scene ${(context.safeStepIndex ?? 0) + 1}`);
  return true;
}

function applyAutomationPreview(track, clipState) {
  if (!track || !clipState || transport?.active) {
    return;
  }

  const previewState = applyAutomationAtBeat(clipState, clipState.automation, 0);
  applyTrackVolume(track, previewState);
  applyTrackPitchAndSpeed(track, previewState);
  applyTrackOpacity(track, previewState);
  applyTrackBlend(track, previewState);
  applyTrackFx(track, previewState);
  applyVideoFx(track, previewState);
  updateTrackModeChips(track);
}

function commitAutomation(track, context, automation, selectedPointId = "", options = {}) {
  if (!track || !context?.editableState) {
    return false;
  }

  if (options.capture) {
    captureAutomationEditIfNeeded(track, context, options.captureLabel, options.dragState || null);
  }

  const normalizedAutomation = normalizeClipAutomation(automation);
  const targetKey = normalizeAutomationTargetKey(options.targetKey || getSelectedAutomationTarget(track));
  const selectedExists = selectedPointId && normalizedAutomation[targetKey]?.points?.some((point) => point.id === selectedPointId);
  context.editableState.automation = normalizedAutomation;
  track.__selectedAutomationTarget = targetKey;
  track.__selectedAutomationPointId = selectedExists ? selectedPointId : null;
  applyArrangementClipControlValue(track, "automation", normalizedAutomation, context.editableState);

  if (context.editableState !== track && arrangement?.clips) {
    refreshArrangementStepCells(context.safeStepIndex ?? 0);
  }

  applyAutomationPreview(track, context.editableState);
  if (options.render !== false) {
    updatePianoRollEditorForTrack(track);
  }

  markAppStateDirty(true);
  if (options.status !== false) {
    setStatus(`${track.name}: automation updated`);
  }
  return true;
}

function getAutomationLaneInfo(element) {
  const lane = element?.closest?.(".automation-lane");
  if (!lane) {
    return null;
  }

  const track = getTrackById(lane.dataset.trackControl);
  const targetKey = normalizeAutomationTargetKey(lane.dataset.automationTarget);
  if (!track || !CLIP_AUTOMATION_TARGETS[targetKey]) {
    return null;
  }

  return {
    lane,
    track,
    targetKey,
    targetDefinition: CLIP_AUTOMATION_TARGETS[targetKey],
  };
}

function getAutomationValueFromLanePointer(laneInfo, event) {
  const rect = laneInfo.lane.getBoundingClientRect();
  const xPercent = rect.width > 0 ? clamp((event.clientX - rect.left) / rect.width, 0, 1) : 0;
  const yPercent = rect.height > 0 ? clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1) : 0;
  const beatsPerBar = getTransportBeatsPerBar();
  const grid = getPianoRollEditorGrid(beatsPerBar);
  const rawBeat = xPercent * beatsPerBar;
  const beat = clamp(Math.round(rawBeat / grid.stepBeat) * grid.stepBeat, 0, beatsPerBar);
  const targetDefinition = laneInfo.targetDefinition;
  let value = targetDefinition.defaultValue;

  if (targetDefinition.type === "enum") {
    const values = targetDefinition.values || [];
    const index = clamp(Math.round(yPercent * Math.max(0, values.length - 1)), 0, Math.max(0, values.length - 1));
    value = values[index] || targetDefinition.defaultValue;
  } else {
    value = targetDefinition.min + yPercent * (targetDefinition.max - targetDefinition.min);
  }

  return {
    beat,
    value: normalizeAutomationPointValue(targetDefinition, value),
  };
}

function upsertAutomationPoint(track, context, targetKey, point, selectedPointId = point?.id, options = {}) {
  const automation = normalizeClipAutomation(context.editableState.automation);
  const envelope = getAutomationEnvelopeForEdit(automation, targetKey, true);
  const nextPoint = normalizeAutomationPoint(targetKey, point);
  const pointIndex = envelope.points.findIndex((existingPoint) => existingPoint.id === nextPoint.id);
  if (pointIndex >= 0) {
    envelope.points[pointIndex] = nextPoint;
  } else {
    envelope.points.push(nextPoint);
  }
  envelope.points.sort((a, b) => a.beat - b.beat);
  automation[targetKey] = normalizeAutomationEnvelope(targetKey, envelope);
  return commitAutomation(track, context, automation, selectedPointId || nextPoint.id, {
    ...options,
    targetKey,
  });
}

function selectAutomationPoint(track, targetKey, pointId) {
  if (!track) {
    return false;
  }

  const context = getAutomationEditableContext(track, "automationPoint");
  if (!context) {
    return false;
  }

  const automation = normalizeClipAutomation(context.editableState.automation);
  const envelope = automation[targetKey];
  if (!envelope?.points?.some((point) => point.id === pointId)) {
    return false;
  }

  track.__selectedAutomationTarget = targetKey;
  track.__selectedAutomationPointId = pointId;
  updatePianoRollEditorForTrack(track);
  return true;
}

window.freemixAutomationTargetChange = (event) => {
  event.__freemixHandledAutomation = true;
  event.stopImmediatePropagation?.();
  const track = getTrackById(event.currentTarget?.dataset?.trackControl);
  if (!track) {
    return;
  }

  track.__selectedAutomationTarget = normalizeAutomationTargetKey(event.currentTarget.value);
  track.__selectedAutomationPointId = null;
  updatePianoRollEditorForTrack(track);
};

window.freemixAutomationToggle = (event) => {
  event?.preventDefault?.();
  event.__freemixHandledAutomation = true;
  event.stopImmediatePropagation?.();
  const track = getTrackById(event.currentTarget?.dataset?.trackControl);
  const targetKey = getSelectedAutomationTarget(track);
  const context = getAutomationEditableContext(track, "automationEnable");
  if (!track || !context) {
    return;
  }

  const automation = normalizeClipAutomation(context.editableState.automation);
  const envelope = getAutomationEnvelopeForEdit(automation, targetKey, false);
  envelope.enabled = !envelope.enabled;
  automation[targetKey] = normalizeAutomationEnvelope(targetKey, envelope);
  commitAutomation(track, context, automation, track.__selectedAutomationPointId || "", {
    capture: true,
    captureLabel: `Toggled automation in scene ${(context.safeStepIndex ?? 0) + 1}`,
    targetKey,
  });
};

window.freemixAutomationInterpolationChange = (event) => {
  event.__freemixHandledAutomation = true;
  event.stopImmediatePropagation?.();
  const track = getTrackById(event.currentTarget?.dataset?.trackControl);
  const targetKey = getSelectedAutomationTarget(track);
  const context = getAutomationEditableContext(track, "automationInterpolation");
  if (!track || !context || CLIP_AUTOMATION_TARGETS[targetKey]?.type === "enum") {
    return;
  }

  const automation = normalizeClipAutomation(context.editableState.automation);
  const envelope = getAutomationEnvelopeForEdit(automation, targetKey, true);
  envelope.interpolation = event.currentTarget.value === "hold" ? "hold" : "linear";
  automation[targetKey] = normalizeAutomationEnvelope(targetKey, envelope);
  commitAutomation(track, context, automation, track.__selectedAutomationPointId || "", {
    capture: true,
    captureLabel: `Changed automation curve in scene ${(context.safeStepIndex ?? 0) + 1}`,
    targetKey,
  });
};

window.freemixAutomationReset = (event) => {
  event?.preventDefault?.();
  event.__freemixHandledAutomation = true;
  event.stopImmediatePropagation?.();
  const track = getTrackById(event.currentTarget?.dataset?.trackControl);
  const targetKey = getSelectedAutomationTarget(track);
  const context = getAutomationEditableContext(track, "automationReset");
  if (!track || !context) {
    return;
  }

  const automation = normalizeClipAutomation(context.editableState.automation);
  delete automation[targetKey];
  commitAutomation(track, context, automation, "", {
    capture: true,
    captureLabel: `Reset automation in scene ${(context.safeStepIndex ?? 0) + 1}`,
    targetKey,
  });
};

window.freemixAutomationLanePointerDown = (event) => {
  if (event.target?.closest?.(".automation-point")) {
    return;
  }

  event.preventDefault();
  event.__freemixHandledAutomation = true;
  event.stopImmediatePropagation?.();
  const laneInfo = getAutomationLaneInfo(event.currentTarget);
  const context = getAutomationEditableContext(laneInfo?.track, "automationPoint");
  if (!laneInfo || !context) {
    return;
  }

  const pointValue = getAutomationValueFromLanePointer(laneInfo, event);
  const point = createAutomationPoint(laneInfo.targetKey, pointValue);
  upsertAutomationPoint(laneInfo.track, context, laneInfo.targetKey, point, point.id, {
    capture: true,
    captureLabel: `Added automation point in scene ${(context.safeStepIndex ?? 0) + 1}`,
    targetKey: laneInfo.targetKey,
  });
};

window.freemixAutomationPointPointerDown = (event) => {
  event.preventDefault();
  event.__freemixHandledAutomation = true;
  event.stopImmediatePropagation?.();
  const pointEl = event.currentTarget;
  const laneInfo = getAutomationLaneInfo(pointEl);
  const pointId = pointEl.dataset.automationPointId || "";
  const context = getAutomationEditableContext(laneInfo?.track, "automationPoint");
  if (!laneInfo || !context || !pointId) {
    return;
  }

  selectAutomationPoint(laneInfo.track, laneInfo.targetKey, pointId);
  automationDragState = {
    trackId: laneInfo.track.id,
    targetKey: laneInfo.targetKey,
    pointId,
    didCapture: false,
  };

  document.addEventListener("pointermove", window.freemixAutomationPointPointerMove, { passive: false });
  document.addEventListener("pointerup", window.freemixAutomationPointPointerUp, { once: true });
  document.addEventListener("pointercancel", window.freemixAutomationPointPointerUp, { once: true });
};

window.freemixAutomationPointPointerMove = (event) => {
  if (!automationDragState) {
    return;
  }

  event.preventDefault();
  const track = getTrackById(automationDragState.trackId);
  const editor = track ? document.querySelector(`[data-automation-editor="${CSS.escape(track.id)}"]`) : null;
  const lane = editor?.querySelector(`.automation-lane[data-automation-target="${CSS.escape(automationDragState.targetKey)}"]`);
  const laneInfo = getAutomationLaneInfo(lane);
  const context = getAutomationEditableContext(track, "automationPoint");
  if (!track || !laneInfo || !context) {
    return;
  }

  const automation = normalizeClipAutomation(context.editableState.automation);
  const envelope = getAutomationEnvelopeForEdit(automation, automationDragState.targetKey, true);
  const point = envelope.points.find((existingPoint) => existingPoint.id === automationDragState.pointId);
  if (!point) {
    return;
  }

  const pointValue = getAutomationValueFromLanePointer(laneInfo, event);
  upsertAutomationPoint(track, context, automationDragState.targetKey, { ...point, ...pointValue }, point.id, {
    capture: true,
    captureLabel: `Moved automation point in scene ${(context.safeStepIndex ?? 0) + 1}`,
    dragState: automationDragState,
    targetKey: automationDragState.targetKey,
  });
};

window.freemixAutomationPointPointerUp = () => {
  document.removeEventListener("pointermove", window.freemixAutomationPointPointerMove);
  document.removeEventListener("pointercancel", window.freemixAutomationPointPointerUp);
  automationDragState = null;
};

window.freemixDeleteSelectedAutomationPoint = (event) => {
  event?.preventDefault?.();
  event.__freemixHandledAutomation = true;
  event.stopImmediatePropagation?.();
  const track = getTrackById(event.currentTarget?.dataset?.trackControl);
  const targetKey = getSelectedAutomationTarget(track);
  const context = getAutomationEditableContext(track, "automationDeletePoint");
  if (!track || !context) {
    return;
  }

  const selectedPointId = track.__selectedAutomationPointId || "";
  if (!selectedPointId) {
    return;
  }

  const automation = normalizeClipAutomation(context.editableState.automation);
  const envelope = getAutomationEnvelopeForEdit(automation, targetKey, true);
  envelope.points = envelope.points.filter((point) => point.id !== selectedPointId);
  automation[targetKey] = normalizeAutomationEnvelope(targetKey, envelope);
  commitAutomation(track, context, automation, "", {
    capture: true,
    captureLabel: `Deleted automation point in scene ${(context.safeStepIndex ?? 0) + 1}`,
    targetKey,
  });
};

function handleTrackControl(event) {
  const control = event.currentTarget;
  const track = getTrackById(control.dataset.trackControl);
  if (!track) {
    return;
  }

  const controlName = control.dataset.control;
  if (controlName === "removeTrack") {
    removeTrack(track.id);
    return;
  }

  if (controlName === "duplicateTrack") {
    duplicateTrack(track.id);
    return;
  }

  if (controlName === "moveTrackUp") {
    moveTrack(track.id, -1);
    return;
  }

  if (controlName === "moveTrackDown") {
    moveTrack(track.id, 1);
    return;
  }

  if (controlName === "clearTrackLane") {
    clearTrackLane(track.id);
    return;
  }

  if (controlName === "lockTrack") {
    track.locked = !track.locked;
    updateTrackModeChips(track);
    window.freemixRender?.updateTrackRow?.(track);
    markAppStateDirty(true);
    setStatus(`${track.name}: ${track.locked ? "locked" : "unlocked"}`);
    return;
  }

  if (controlName === "freezeTrack") {
    toggleTrackFreezeBounce(track);
    return;
  }

  if (controlName === "trackColor") {
    track.color = TRACK_COLORS.includes(control.value) ? control.value : track.color;
    renderWorkstation();
    markAppStateDirty(true);
    setStatus(`${track.name}: color ${TRACK_COLOR_LABELS[track.color] || track.color}`);
    return;
  }

  if (controlName === "heightMode") {
    track.heightMode = Object.prototype.hasOwnProperty.call(TRACK_HEIGHT_MODES, control.value) ? control.value : "normal";
    window.freemixRender?.updateTrackRow?.(track);
    markAppStateDirty(true);
    setStatus(`${track.name}: ${TRACK_HEIGHT_MODES[track.heightMode]} view`);
    return;
  }

  if (controlName === "capturePreset") {
    track.capturePreset = Object.prototype.hasOwnProperty.call(TRACK_CAPTURE_PRESETS, control.value) ? control.value : "current";
    markAppStateDirty(true);
    setStatus(`${track.name}: ${TRACK_CAPTURE_PRESETS[track.capturePreset]} capture`);
    return;
  }

  if (controlName === "timingNudgeMs") {
    const timingNudge = Number(control.value);
    track.timingNudgeMs = Number.isFinite(timingNudge) ? clamp(timingNudge, -250, 250) : 0;
    if (transport?.active) {
      resetTrackPulseCursor(track, performance.now(), { fireAtReference: false });
    }
    markAppStateDirty();
    return;
  }

  if ((track.locked || track.frozen) && !TRACK_MANAGEMENT_CONTROLS.has(controlName)) {
    setStatus(`${track.name}: ${track.locked ? "locked" : "frozen"}`, true);
    window.freemixRender?.updateTrackRow?.(track);
    return;
  }

  if (event.__freemixHandledAutomation) {
    return;
  }

  if (event.__freemixHandledPianoRoll) {
    return;
  }
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

  if (controlName === "timingMode") {
    editableState.timingMode = normalizeClipTimingMode(control.value);
    applyArrangementClipControlValue(track, "timingMode", editableState.timingMode, editableState);
    if (editableState.timingMode === CLIP_TIMING_MODES.pianoRoll) {
      editableState.notes = normalizePianoRollNotes(editableState.notes);
      applyArrangementClipControlValue(track, "notes", editableState.notes, editableState);
    }
    track.lastStep = -1;
    resyncTrackTiming(track);
    updatePianoRollEditorForTrack(track);
    commitControlEdit();
    setStatus(`${track.name}: ${CLIP_TIMING_MODE_LABELS[editableState.timingMode]} mode`);
    return;
  }

  if (controlName === "pianoSnap") {
    editableState.pianoSnap = normalizePianoRollSnap(control.value);
    applyArrangementClipControlValue(track, "pianoSnap", editableState.pianoSnap, editableState);
    updatePianoRollEditorForTrack(track);
    commitControlEdit();
    setStatus(`${track.name}: piano roll snap ${getPianoRollSnapDefinition(editableState.pianoSnap).label}`);
    return;
  }

  if (controlName === "pianoRoot") {
    editableState.pianoRoot = normalizePianoRootNote(control.value);
    applyArrangementClipControlValue(track, "pianoRoot", editableState.pianoRoot, editableState);
    updatePianoRollEditorForTrack(track);
    commitControlEdit();
    setStatus(`${track.name}: piano roll root ${editableState.pianoRoot}`);
    return;
  }

  if (controlName === "pianoNote") {
    handlePianoRollNoteControl(track, editableState, control, safeStepIndex, isInputEvent);
    return;
  }

  if (controlName === "pianoVelocity") {
    handlePianoRollVelocityControl(track, editableState, control, safeStepIndex, isInputEvent);
    return;
  }

  if (controlName === "pianoDuration") {
    window.freemixPianoRollDurationInput(event);
    return;
  }

  if (controlName === "pianoPreviewNote") {
    window.freemixPreviewSelectedPianoRollNote(event);
    return;
  }

  if (controlName === "pianoDuplicateNote") {
    window.freemixDuplicateSelectedPianoRollNote(event);
    return;
  }

  if (controlName === "pianoQuantizeNotes") {
    window.freemixQuantizePianoRollNotes(event);
    return;
  }

  if (controlName === "pianoDeleteNote") {
    window.freemixDeleteSelectedPianoRollNote(event);
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
    requestTrackAudioFxRoute(track, editableState);
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
    tracks.forEach((item) => applyTrackVolume(item, getTrackPlaybackState(item) || item));
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

function handleTextControl(event) {
  const control = event.currentTarget || event.target;
  const controlName = control?.dataset?.textControl;
  if (!controlName) {
    return;
  }

  const stepIndex = selectedTextClipStep !== null ? selectedTextClipStep : getArrangementStepIndex(arrangement?.step);
  if (stepIndex === null) {
    return;
  }

  const textClip = ensureArrangementTextClip(stepIndex);
  if (!textClip) {
    return;
  }

  if (controlName === "selectedFieldId") {
    if (textClip.fields.some((field) => field.id === control.value)) {
      textClip.selectedFieldId = control.value;
      setArrangementTextClip(stepIndex, textClip);
      window.freemixRender?.updateTextEditor?.();
      markAppStateDirty(true);
    }
    return;
  }

  const field = textClip.fields.find((item) => item.id === textClip.selectedFieldId) || textClip.fields[0];
  if (!field) {
    return;
  }

  if (event?.type !== "input") {
    captureArrangementEdit(`Changed TEXT ${controlName} in scene ${stepIndex + 1}`);
  }

  if (controlName === "text") {
    field.text = String(control.value || "").slice(0, 240);
  } else if (["bold", "italic", "underline", "stroke", "shadow"].includes(controlName)) {
    field[controlName] = !field[controlName];
  } else if (["size", "x", "y", "opacity", "strokeWidth", "shadowBlur", "shadowX", "shadowY"].includes(controlName)) {
    field[controlName] = Number(control.value);
  } else if (["font", "color", "strokeColor", "shadowColor", "align"].includes(controlName)) {
    field[controlName] = control.value;
  }

  setArrangementTextClip(stepIndex, textClip);
  refreshArrangementHasClipsState();
  window.freemixRender?.updateArrangementTextCell?.(stepIndex);
  window.freemixRender?.updateTextOverlay?.();
  if (event?.type !== "input" || control.tagName === "BUTTON" || controlName === "font" || controlName === "align") {
    window.freemixRender?.updateTextEditor?.();
  }

  if (event?.type === "input") {
    queueControlStatePersist();
  } else {
    markAppStateDirty(true);
  }
}

function handleTextAction(action) {
  if (action === "toggle-toolbar") {
    textToolbarCollapsed = !textToolbarCollapsed;
    window.freemixRender?.updateTextEditor?.();
    syncArrangementTrackHeights();
    return true;
  }

  if (action === "toggle-mute") {
    textTrackMuted = !textTrackMuted;
    appState.textTrackMuted = textTrackMuted;
    window.freemixRender?.updateTextOverlay?.();
    window.freemixRender?.updateTextEditor?.();
    markAppStateDirty(true);
    setStatus(`TEXT ${textTrackMuted ? "muted" : "on"}`);
    return true;
  }

  if (action === "toggle-solo") {
    textTrackSolo = !textTrackSolo;
    appState.textTrackSolo = textTrackSolo;
    window.freemixRender?.updateTextOverlay?.();
    window.freemixRender?.updateTextEditor?.();
    tracks.forEach((track) => applyTrackVolume(track, getTrackPlaybackState(track) || track));
    markAppStateDirty(true);
    setStatus(`TEXT solo ${textTrackSolo ? "on" : "off"}`);
    return true;
  }

  const stepIndex = selectedTextClipStep !== null ? selectedTextClipStep : getArrangementStepIndex(arrangement?.step);
  if (stepIndex === null) {
    return false;
  }

  const textClip = ensureArrangementTextClip(stepIndex);
  if (!textClip) {
    return false;
  }

  if (action === "add-field") {
    captureArrangementEdit(`Added TEXT field in scene ${stepIndex + 1}`);
    const field = createTextField({
      text: "NEW TEXT",
      y: clamp(50 + textClip.fields.length * 8, 0, 100),
    });
    textClip.fields.push(field);
    textClip.selectedFieldId = field.id;
  } else if (action === "delete-field") {
    if (!textClip.fields.length) {
      return false;
    }

    captureArrangementEdit(`Deleted TEXT field in scene ${stepIndex + 1}`);
    const fieldIndex = Math.max(0, textClip.fields.findIndex((field) => field.id === textClip.selectedFieldId));
    textClip.fields.splice(fieldIndex, 1);
    textClip.selectedFieldId = textClip.fields[Math.max(0, fieldIndex - 1)]?.id || textClip.fields[0]?.id || null;
  } else if (action === "center-x" || action === "center-y") {
    const field = textClip.fields.find((item) => item.id === textClip.selectedFieldId) || textClip.fields[0];
    if (!field) {
      return false;
    }

    captureArrangementEdit(`Centered TEXT ${action === "center-x" ? "X" : "Y"} in scene ${stepIndex + 1}`);
    if (action === "center-x") {
      field.x = 50;
    } else {
      field.y = 50;
    }
  } else {
    return false;
  }

  setArrangementTextClip(stepIndex, textClip.fields.length ? textClip : null);
  refreshArrangementHasClipsState();
  window.freemixRender?.updateArrangementGrid?.();
  window.freemixRender?.updateTextOverlay?.();
  window.freemixRender?.updateTextEditor?.();
  markAppStateDirty(true);
  return true;
}

function handleDrumControl(event) {
  const control = event.currentTarget || event.target;
  const controlName = control?.dataset?.drumControl;
  if (!controlName) {
    return;
  }

  const stepIndex = selectedDrumClipStep !== null ? selectedDrumClipStep : getArrangementStepIndex(arrangement?.step);
  if (stepIndex === null) {
    return;
  }

  const drumClip = ensureArrangementDrumClip(stepIndex);
  if (!drumClip) {
    return;
  }

  if (event?.type !== "input") {
    captureArrangementEdit(`Changed DRUM ${controlName} in scene ${stepIndex + 1}`);
  }

  if (controlName === "kit") {
    drumClip.kit = DRUM_KITS.includes(control.value) ? control.value : DRUM_DEFAULT_KIT;
  } else if (controlName === "volume") {
    const volume = Number(control.value);
    drumClip.volume = Number.isFinite(volume) ? clamp(volume, 0, 1) : drumClip.volume;
  } else if (controlName === "step") {
    const voiceId = control.dataset.drumVoice;
    const drumStep = Number(control.dataset.drumStep);
    if (!DRUM_VOICES.some((voice) => voice.id === voiceId) || !Number.isInteger(drumStep)) {
      return;
    }
    drumClip.pattern = normalizeDrumPattern(drumClip.pattern, getDrumStepCount());
    const currentVelocity = normalizeDrumVelocity(drumClip.pattern[voiceId][drumStep]);
    const requestedVelocity = normalizeDrumVelocity(event?.drumVelocity);
    const hasVelocityGesture = Number.isFinite(Number(event?.drumVelocity));
    drumClip.pattern[voiceId][drumStep] = hasVelocityGesture
      ? requestedVelocity
      : currentVelocity > 0
        ? 0
        : DRUM_DEFAULT_VELOCITY;
    syncDrumStepButtonVelocity(control, drumClip.pattern[voiceId][drumStep]);
  }

  setArrangementDrumClip(stepIndex, drumClip);
  refreshArrangementHasClipsState();
  window.freemixRender?.updateArrangementDrumCell?.(stepIndex);
  if ((event?.type !== "input" && controlName !== "step") || controlName === "kit") {
    window.freemixRender?.updateDrumEditor?.();
  }

  if (event?.type === "input") {
    queueControlStatePersist();
  } else {
    markAppStateDirty(true);
  }
}

function syncDrumStepButtonVelocity(button, velocity) {
  if (!button || button.dataset?.drumControl !== "step") {
    return;
  }

  const safeVelocity = normalizeDrumVelocity(velocity);
  const velocityPercent = Math.round(safeVelocity * 100);
  const isActive = safeVelocity > 0;
  button.classList.toggle("active", isActive);
  button.style.setProperty("--drum-velocity-percent", `${velocityPercent}%`);
  button.dataset.drumVelocity = safeVelocity.toFixed(2);
  button.setAttribute("aria-pressed", String(isActive));
  const voice = DRUM_VOICES.find((item) => item.id === button.dataset.drumVoice);
  const stepNumber = Number(button.dataset.drumStep) + 1;
  if (voice && Number.isFinite(stepNumber)) {
    button.setAttribute("aria-label", `${voice.label} step ${stepNumber} velocity ${velocityPercent}%`);
    button.title = `${voice.label} step ${stepNumber}: ${velocityPercent}% velocity`;
  }
}

function handleDrumAction(action) {
  if (action === "toggle-toolbar") {
    drumToolbarCollapsed = !drumToolbarCollapsed;
    window.freemixRender?.updateDrumEditor?.();
    syncArrangementTrackHeights();
    return true;
  }

  if (action === "toggle-mute") {
    drumTrackMuted = !drumTrackMuted;
    appState.drumTrackMuted = drumTrackMuted;
    window.freemixRender?.updateDrumEditor?.();
    markAppStateDirty(true);
    setStatus(`DRUM ${drumTrackMuted ? "muted" : "on"}`);
    return true;
  }

  if (action === "toggle-solo") {
    drumTrackSolo = !drumTrackSolo;
    appState.drumTrackSolo = drumTrackSolo;
    window.freemixRender?.updateDrumEditor?.();
    tracks.forEach((track) => applyTrackVolume(track, getTrackPlaybackState(track) || track));
    markAppStateDirty(true);
    setStatus(`DRUM solo ${drumTrackSolo ? "on" : "off"}`);
    return true;
  }

  const stepIndex = selectedDrumClipStep !== null ? selectedDrumClipStep : getArrangementStepIndex(arrangement?.step);
  if (stepIndex === null) {
    return false;
  }

  if (action === "create") {
    captureArrangementEdit(`Created DRUM clip in scene ${stepIndex + 1}`);
    setArrangementDrumClip(stepIndex, getArrangementDrumClip(stepIndex) || createDrumClip());
  } else if (action === "clear") {
    captureArrangementEdit(`Cleared DRUM clip in scene ${stepIndex + 1}`);
    setArrangementDrumClip(stepIndex, null);
  } else {
    return false;
  }

  refreshArrangementHasClipsState();
  window.freemixRender?.updateArrangementGrid?.();
  window.freemixRender?.updateDrumEditor?.();
  markAppStateDirty(true);
  return true;
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
          ensureDrumAudioOutput();
          await renderDrumKitBuffers();
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
            {
              setTrackPlaybackPhase(track, PLAYBACK_PHASES.loading, {
                sessionToken: startToken,
                mediaStatus: "loading",
              });
              return primeTrackForTransport(track, startToken).catch((error) => {
                setTrackPlaybackPhase(track, PLAYBACK_PHASES.failed, {
                  sessionToken: startToken,
                  mediaStatus: "failed",
                  details: { reason: "prime-failed" },
                });
                console.warn(error);
              });
            },
          ),
      );

      if (startTransport.bootToken !== startToken) {
        return;
      }

      const arrangementStartAt =
        arrangement.enabled && hasArrangementClips()
          ? await prepareArrangementStartPreroll(startToken)
          : null;

      if (startTransport.bootToken !== startToken) {
        return;
      }

      // Start transport scheduling in the click stack to keep browser autoplay context
      // aligned with the user gesture that initiated playback.
      if (startTransport.bootToken !== bootToken) {
        return;
      }

      startTransportWithState(startToken, { startAt: arrangementStartAt });
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
      setMediaElementSource(video, latest.seekState.sourceUrl);
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
  loadMediaElementOnlyIfEmpty(video);
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

  if (isMediaLivePlaybackUrl(video.currentSrc || video.src || "") && nextTime <= 0.05) {
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

  if (isMediaLivePlaybackUrl(video.currentSrc || video.src || "") && anchorTime <= 0.05) {
    return true;
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
  const requiresFxRoute = shouldRouteAudioThroughFx(track, clip);
  const tokenAtStart = Number.isFinite(playbackToken) ? playbackToken : 0;
  const shouldSeekToAnchor = options.seekToAnchor !== false;
  const isCurrentPlaybackAttempt = () => track?.__playbackToken === tokenAtStart;

  if (!isCurrentPlaybackAttempt()) {
    return Promise.resolve(false);
  }

  const sourceWasChanged = !!clipSourceUrl && setMediaElementSource(video, clipSourceUrl);
  setTrackPlaybackPhase(track, sourceWasChanged ? PLAYBACK_PHASES.loading : PLAYBACK_PHASES.cueing, {
    mediaStatus: sourceWasChanged ? "loading" : "prerolling",
  });

  if (audioContext && audioContext.state !== "running" && track.audio) {
    disposeTrackAudio(track);
  }

  const playWithState = async (muted) => {
    if (!isCurrentPlaybackAttempt()) {
      return muted;
    }
    if (requiresFxRoute && !webAudioDisabled) {
      try {
        await ensureAudioContext();
      } catch (error) {
        console.warn(error);
      }
    } else if (track.audio && !webAudioDisabled && audioContext && audioContext.state !== "running") {
      try {
        await ensureAudioContext();
      } catch (error) {
        console.warn(error);
      }
    }
    if (!webAudioDisabled && audioContext?.state === "running") {
      setupTrackAudio(track, video, clip);
    }
    if (!isCurrentPlaybackAttempt()) {
      return muted;
    }

    const hasLiveAudioGraph = hasLiveTrackAudioGraph(track, video);
    const usesCapturedAudio = hasLiveAudioGraph && track.audio?.route === "capture-stream";
    const targetVideoMuted = usesCapturedAudio || (requiresFxRoute && !hasLiveAudioGraph) ? true : muted;
    if (video.muted !== targetVideoMuted) {
      video.muted = targetVideoMuted;
    }

    if (hasLiveAudioGraph && track.audio?.output?.gain) {
      const targetGain = muted ? 0 : clipVolume;
      if (!almostEqual(track.audio.output.gain.value, targetGain)) {
        track.audio.output.gain.value = targetGain;
      }
      const targetElementVolume = usesCapturedAudio ? 0 : 1;
      if (!almostEqual(video.volume, targetElementVolume)) {
        video.volume = targetElementVolume;
      }
    } else {
      const targetVideoVolume = requiresFxRoute ? 0 : muted ? 0 : clipVolume;
      if (!almostEqual(video.volume, targetVideoVolume)) {
        video.volume = targetVideoVolume;
      }
    }

    if (video.readyState < 2 && video.networkState === video.NETWORK_NO_SOURCE) {
      video.load();
    }

    if (shouldSeekToAnchor) {
      await parkVideoAtAnchor(video, clip, track);
      setTrackPlaybackPhase(track, PLAYBACK_PHASES.cueing, { mediaStatus: "prerolling" });
    }

    await waitForTrackReady(video);
    if (!isCurrentPlaybackAttempt()) {
      return muted;
    }

    if (shouldSeekToAnchor) {
      await parkVideoAtAnchor(video, clip, track);
      setTrackPlaybackPhase(track, PLAYBACK_PHASES.ready, { mediaStatus: "ready" });
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
      if (error instanceof DOMException && error.name === "AbortError") {
        await waitForTrackReady(video, AV_READY_TIMEOUT_MS * 2);
        if (!isCurrentPlaybackAttempt()) {
          return false;
        }
        if (video.paused) {
          await video.play();
        }
        return shouldBeMuted;
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
        const retryMuted = requiresFxRoute ? true : shouldBeMuted;
        if (video.muted !== retryMuted) {
          video.muted = retryMuted;
        }
        const fallbackVolume = requiresFxRoute ? 0 : shouldBeMuted ? 0 : clipVolume;
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
        if (fallbackError instanceof DOMException && fallbackError.name === "AbortError") {
          return false;
        }
        if (fallbackError instanceof DOMException) {
          setStatus(`Playback blocked: ${fallbackError.name}`, true);
        } else {
          setStatus("Playback failed", true);
        }

        try {
          const recovered = await nativeRetry();
          if (!requiresFxRoute && !shouldBeMuted && recovered) {
            video.muted = false;
            applyTrackVolume(track, clipState);
          }
          return recovered;
        } catch (nativeError) {
          throw nativeError;
        }
      }
    })
    .then(async (wasMuted) => {
      if (!isCurrentPlaybackAttempt()) {
        return false;
      }
      prepareTrackAudioFxForPlayback(track, clipState);
      if (!requiresFxRoute && wasMuted && !shouldBeMuted) {
        video.muted = false;
        applyTrackVolume(track, clipState);
      } else {
        applyTrackVolume(track, clipState);
      }

      const nativeVolume = shouldBeMuted ? 0 : clipVolume;
      const hasLiveAudioGraph = hasLiveTrackAudioGraph(track, video);
      const usesCapturedAudio = hasLiveAudioGraph && track.audio?.route === "capture-stream";
      const finalVideoMuted = usesCapturedAudio || (requiresFxRoute && !hasLiveAudioGraph) ? true : hasLiveAudioGraph ? false : shouldBeMuted;
      const finalVideoVolume = usesCapturedAudio || (requiresFxRoute && !hasLiveAudioGraph) ? 0 : hasLiveAudioGraph ? 1 : nativeVolume;
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
      } else if (requiresFxRoute && !hasLiveAudioGraph) {
        track.audioFxStatus = "unrouted";
        setStatus(`${track.name}: audio waiting for FX route`, true);
      }

      await revealTrackAfterPresentedFrame(track, video, tokenAtStart);
      if (!isCurrentPlaybackAttempt()) {
        return false;
      }

      return true;
    })
    .catch((error) => {
      if (!isCurrentPlaybackAttempt()) {
        return false;
      }
      const hasName = error instanceof DOMException ? error.name : "";
      if (hasName === "AbortError") {
        setTrackMediaStatus(track, sourceWasChanged ? "loading" : "ready");
        return false;
      }

      setTrackPlaybackPhase(track, PLAYBACK_PHASES.failed, {
        mediaStatus: error?.name === "NotSupportedError" ? "unsupported" : "failed",
        details: { reason: hasName || "playback-failed" },
      });
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

function startTransportWithState(sessionToken = startTransport.bootToken, options = {}) {
  if (startTransport.bootToken !== sessionToken) {
    return;
  }

  clearArrangementLookaheadPreroll(true);
  tracks.forEach((track) => {
    track.lastStep = -1;
    track.nextTriggerAt = 0;
    track.stepMs = 0;
  });

  tracks.forEach((track) => {
    const video = track.__preparedPlaybackVideo?.isConnected ? track.__preparedPlaybackVideo : getTrackVideo(track);
    const playbackState =
      arrangement.enabled && hasArrangementClips()
        ? getArrangementStepClip(track, arrangement.step)
        : getTrackPlaybackState(track) || track;
    const sourceUrl = getTrackPlaybackSourceUrl(track, playbackState);

    if (!video || !sourceUrl) {
      setTrackPlaybackPhase(track, PLAYBACK_PHASES.idle, { mediaStatus: "empty" });
      return;
    }

    setTrackPlaybackPhase(track, PLAYBACK_PHASES.cueing, {
      sessionToken,
      clipSignature: getPlaybackStateSignature(playbackState, sourceUrl),
      mediaStatus: "prerolling",
    });
    setVideoCorsPolicy(video, sourceUrl);
    setMediaElementSource(video, sourceUrl);
    const playbackSignature = getPlaybackStateSignature(playbackState, sourceUrl);
    const hasActivePreroll =
      track.__prerollRevealFor === sessionToken &&
      track.__prerollPlaybackSignature === playbackSignature &&
      !video.paused &&
      !video.ended;
    if (!hasActivePreroll) {
      safeSetCurrentTime(video, playbackState);
    }
    setupTrackAudio(track, video, playbackState);
    if (hasActivePreroll) {
      setTrackPlaybackPhase(track, PLAYBACK_PHASES.prerolling, {
        sessionToken,
        clipSignature: playbackSignature,
        mediaStatus: "prerolling",
      });
      armTrackForPrerollReveal(track, video);
    } else {
      applyTrackVolume(track, playbackState);
    }
  });

  const now = performance.now();
  const requestedStartAt = Number(options?.startAt);
  const startAt = Number.isFinite(requestedStartAt) && requestedStartAt > now ? requestedStartAt : now;
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
    prepareInitialFutureArrangementEntrances(sessionToken, startAt, timing.barMs);
    tracks.forEach((track) => {
      if (track.__prerollRevealFor !== sessionToken) {
        return;
      }

      if (Number.isFinite(Number(track.stepMs)) && track.stepMs > 0) {
        track.__lastRetriggerPulse = 0;
        track.nextTriggerAt = startAt + track.stepMs;
      }
    });
    scheduleArrangementPrerollReveal(sessionToken, startAt);
  } else {
    updateTrackTriggerGrid(startAt);
  }

  window.freemixRender?.updateTransportRow?.();
  setStatus(arrangement.enabled && hasArrangementClips() ? `Arrangement playing: scene ${arrangement.step + 1}` : "Live mode playing");
  tickTransport();
}

function resetTrackPlaybackOutput(track) {
  track.__playbackToken = Number.isFinite(track.__playbackToken) ? track.__playbackToken + 1 : 1;
  track.nextTriggerAt = Number.POSITIVE_INFINITY;
  track.lastStep = -1;
  track.__lastPlaybackSignature = null;
  track.__parkedAtAnchorFor = null;
  track.__parkedPlaybackSignature = null;
  track.__warmLaunchFor = null;
  track.__prerollRevealFor = null;
  track.__prerollPlaybackSignature = null;
  track.__prerollRevealCanSkipSeek = false;
  track.__lastTransportClockCorrectionAt = 0;
  track.__lastTransportClockCorrectionPulse = null;
  track.__transportClockCorrectionPulse = null;
  track.__transportClockCorrectionUntil = null;
  track.__awaitingCleanVisualFrame = false;
  clearPianoRollGate(track);
  clearPianoRollAudition(track);
  const selectedClip = getArrangementStepClip(track, arrangement?.step);
  const resetState = selectedClip || track;
  setTrackPlaybackPhase(track, PLAYBACK_PHASES.stopped, {
    mediaStatus: getTrackPlaybackSourceUrl(track, resetState) ? "stopped" : "empty",
  });
  removeTrackPrerollStandby(track);
  const standby = track.__standbyVideoElement;
  if (standby) {
    try {
      standby.pause();
    } catch {
      // Best effort cleanup.
    }
    setPlaybackVideoRole(standby, "standby");
  }
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
  safeSetCurrentTime(video, resetState);
}

function stopAllPlaybackOutputs() {
  tracks.forEach(resetTrackPlaybackOutput);

  playerPanel?.querySelectorAll("video, audio").forEach((media) => {
    if (media.pause && typeof media.pause === "function") {
      try {
        media.pause();
      } catch {
        // Best effort hard stop for any media element not tied to a track row.
      }
    }
    media.muted = true;
    media.removeAttribute("data-export-playing");
  });
}

function stopTransport(resetVideos = true, bumpToken = true) {
  if (bumpToken && Number.isFinite(startTransport.bootToken)) {
    startTransport.bootToken += 1;
  }
  startTransport.runningPromise = null;
  clearArrangementPrerollRevealTimer();
  clearArrangementLookaheadPreroll(true);

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
    stopAllPlaybackOutputs();
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

  setStatus("Audio stopped");
}

function stopVideosAfterExport() {
  stopAllPlaybackOutputs();
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

function createExportTimelineSnapshot(mode = "clip") {
  const exportMode = mode === "arrangement" ? "arrangement" : "clip";
  const arrangementLength = Math.max(1, Number(arrangementStepCount) || arrangement?.clips?.length || 1);
  const stepCount = exportMode === "arrangement" && hasArrangementClips() && arrangement?.clips
    ? arrangementLength
    : 1;
  const startStep = exportMode === "arrangement"
    ? 0
    : getArrangementStepIndex(arrangement?.step) ?? 0;
  const beatMs = getTransportBeatMs();
  const beatsPerBar = getTransportBeatsPerBar();
  return {
    mode: exportMode,
    startStep,
    stepCount,
    stepIndexes: Array.from({ length: stepCount }, (_, offset) => (startStep + offset) % arrangementLength),
    beatMs,
    beatsPerBar,
    durationMs: Math.max(1, stepCount) * beatMs * beatsPerBar,
  };
}

function computeExportBars(mode = "clip") {
  return createExportTimelineSnapshot(mode).stepCount;
}

function computeExportDurationMs(mode = "clip") {
  return createExportTimelineSnapshot(mode).durationMs;
}

function textClipHasVisibleText(clip) {
  return !!normalizeTextClip(clip)?.fields?.some((field) => String(field.text || "").trim());
}

function getExportPreflightIssue(mode = "clip") {
  const exportTimeline = createExportTimelineSnapshot(mode);
  const exportMode = exportTimeline.mode;
  if (exportMode === "arrangement") {
    if (!hasArrangementClips()) {
      return "No arrangement clips to export";
    }

    const hasPlayableArrangementClip = exportTimeline.stepIndexes.some((stepIndex) =>
      tracks.some((track) => {
        const step = arrangement?.clips?.[stepIndex];
        const clip = step?.[track.id] ? normalizeClipState(step[track.id], track) : null;
        return !!getTrackPlaybackSourceUrl(track, clip);
      }),
    );
    return hasPlayableArrangementClip || exportTimeline.stepIndexes.some((stepIndex) => textClipHasVisibleText(getArrangementTextClip(stepIndex))) ? "" : "Arrangement has no playable media";
  }

  const hasPlayableTrack = tracks.some((track) => !!getTrackPlaybackSourceUrl(track, getTrackPlaybackState(track) || track));
  return hasPlayableTrack || textClipHasVisibleText(getArrangementTextClip(arrangement?.step)) ? "" : "Load a source before exporting";
}

function getExportBlendMode(track, state = null) {
  const trackState = state || getTrackActiveControlState(track) || track;
  return EXPORT_BLEND_MODE_MAP[trackState?.blendMode] || "source-over";
}

function getTrackExportOpacity(track, state = null) {
  if (state) {
    const opacity = Number(state.opacity);
    return clamp(Number.isFinite(opacity) ? opacity : 1, 0, 1);
  }

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

function getExportVideoFilterForState(state = {}) {
  const fxState = state?.fx || {};
  const eqMid = clamp(Number(fxState.eqMid), -12, 12);
  const lowLift = Math.max(clamp(Number(fxState.eqLow), -12, 12), 0) / 12;
  const midCut = Math.max(-eqMid, 0) / 12;
  const highValue = clamp(Number(fxState.eqHigh), -12, 12);
  const highLift = Math.max(highValue, 0) / 12;
  const highCut = Math.max(-highValue, 0) / 12;
  const tube = clamp(Number(fxState.tube), 0, 1);
  const reverb = clamp(Number(fxState.reverb), 0, 1);

  const brightness = 0.86 + highLift * 0.3 - highCut * 0.22 + lowLift * 0.06;
  const contrast = 1 + tube * 0.45 + Math.max(eqMid, 0) * 0.018;
  const saturate = 0.92 + lowLift * 0.25 + highLift * 0.18 + tube * 0.75;
  const blur = reverb * 2.2 + highCut * 1.4 + midCut * 0.6;
  const hue = eqMid * 1.6;
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) blur(${blur}px) hue-rotate(${hue}deg)`;
}

function getTrackExportFilter(track, state = null) {
  if (state) {
    return getExportVideoFilterForState(state);
  }

  const cell = getTrackCell(track);
  if (!cell) {
    return "none";
  }

  const cellFilter = window.getComputedStyle(cell).getPropertyValue("--video-filter");
  return cellFilter ? cellFilter.trim() || "none" : "none";
}

function getExportCanvasDimensions(targetRect = null) {
  return [EXPORT_CANVAS_MAX_WIDTH, EXPORT_CANVAS_MAX_HEIGHT];
}

function getExportContainRect(videoWidth, videoHeight, width, height) {
  const safeVideoWidth = Math.max(1, Number(videoWidth) || 1);
  const safeVideoHeight = Math.max(1, Number(videoHeight) || 1);
  const scale = Math.min(width / safeVideoWidth, height / safeVideoHeight);
  const drawWidth = safeVideoWidth * scale;
  const drawHeight = safeVideoHeight * scale;
  return {
    drawWidth,
    drawHeight,
    offsetX: (width - drawWidth) / 2,
    offsetY: (height - drawHeight) / 2,
  };
}

function waitForAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(resolve);
  });
}

function waitForExportVideoReady(video, timeoutMs = 900) {
  if (!video || video.readyState >= 2) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    const cleanup = () => {
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("canplay", finish);
      video.removeEventListener("seeked", finish);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(video.readyState >= 2);
    };
    const timeoutId = window.setTimeout(finish, timeoutMs);
    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("canplay", finish, { once: true });
    video.addEventListener("seeked", finish, { once: true });
  });
}

async function primeExportCanvasForRecording(renderTracks, canvasSession, canvasVideoTrack = null) {
  const activeVideos = (Array.isArray(renderTracks) ? renderTracks : [])
    .map((track) => {
      const frameState = getExportFrameTrackState(track);
      if (!frameState || !getTrackPlaybackSourceUrl(track, frameState)) {
        return null;
      }
      return getTrackVideo(track);
    })
    .filter(Boolean);

  await Promise.all(activeVideos.map((video) => waitForExportVideoReady(video)));

  for (let frameIndex = 0; frameIndex < 3; frameIndex += 1) {
    canvasSession?.drawFrame?.();
    if (typeof canvasVideoTrack?.requestFrame === "function") {
      canvasVideoTrack.requestFrame();
    }
    await waitForAnimationFrame();
  }
}

function getCurrentExportLocalBeat() {
  if (!transport?.active || !Number.isFinite(Number(transport.startedAt))) {
    return 0;
  }

  const beatMs = getTransportBeatMs(transport);
  const beatsPerBar = getTransportBeatsPerBar(transport);
  const barMs = beatMs * beatsPerBar;
  if (!Number.isFinite(beatMs) || beatMs <= 0 || !Number.isFinite(barMs) || barMs <= 0) {
    return 0;
  }

  return (Math.max(0, performance.now() - transport.startedAt) % barMs) / beatMs;
}

function getExportFrameTrackState(track) {
  if (!track) {
    return null;
  }

  const baseState =
    arrangement?.enabled && hasArrangementClips()
      ? getArrangementStepClip(track, arrangement.step)
      : getTrackPlaybackState(track) || track;
  if (!baseState) {
    return null;
  }

  return applyAutomationAtBeat(baseState, baseState.automation, getCurrentExportLocalBeat());
}

function applyExportFrameAutomation(track, state) {
  if (!track || !state) {
    return;
  }

  applyTrackVolume(track, state);
  applyTrackPitchAndSpeed(track, state);
  applyTrackFx(track, state);
}

function drawTrackFrame(context, track, width, height, state = null) {
  const video = getTrackVideo(track);
  if (!video || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
    return;
  }

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const { drawWidth, drawHeight, offsetX, offsetY } = getExportContainRect(videoWidth, videoHeight, width, height);

  context.globalAlpha = getTrackExportOpacity(track, state);
  context.globalCompositeOperation = getExportBlendMode(track, state);
  context.filter = getTrackExportFilter(track, state);
  context.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
}

function drawTextClipFrame(context, clip, width, height) {
  const textClip = normalizeTextClip(clip);
  if (!textClip?.fields?.length) {
    return;
  }

  textClip.fields.forEach((field) => {
    const text = String(field.text || "").trim();
    if (!text) {
      return;
    }

    context.save();
    const fontSize = Math.max(8, (clamp(Number(field.size), 10, 72) / 100) * height);
    context.globalAlpha = clamp(Number(field.opacity), 0, 1);
    context.font = `${field.italic ? "italic " : ""}${field.bold ? "900" : "500"} ${fontSize}px ${field.font}`;
    context.textAlign = field.align;
    context.textBaseline = "middle";
    context.fillStyle = field.color || TEXT_DEFAULT_COLOR;
    context.lineJoin = "round";
    context.lineWidth = field.stroke ? clamp(Number(field.strokeWidth), 0, 8) * Math.max(1, width / 640) : 0;
    context.strokeStyle = field.strokeColor || TEXT_DEFAULT_STROKE_COLOR;
    context.shadowColor = field.shadow ? field.shadowColor || TEXT_DEFAULT_SHADOW_COLOR : "transparent";
    context.shadowBlur = field.shadow ? clamp(Number(field.shadowBlur), 0, 24) : 0;
    context.shadowOffsetX = field.shadow ? clamp(Number(field.shadowX), -24, 24) : 0;
    context.shadowOffsetY = field.shadow ? clamp(Number(field.shadowY), -24, 24) : 0;

    const x = (clamp(Number(field.x), 0, 100) / 100) * width;
    const y = (clamp(Number(field.y), 0, 100) / 100) * height;
    const lines = text.split(/\r?\n/).slice(0, 6);
    const lineHeight = fontSize * 1.12;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      const lineY = startY + index * lineHeight;
      if (field.stroke && context.lineWidth > 0) {
        context.strokeText(line, x, lineY);
      }
      context.fillText(line, x, lineY);
      if (field.underline) {
        const metrics = context.measureText(line);
        const underlineY = lineY + fontSize * 0.42;
        const startX = field.align === "center" ? x - metrics.width / 2 : field.align === "right" ? x - metrics.width : x;
        context.beginPath();
        context.moveTo(startX, underlineY);
        context.lineTo(startX + metrics.width, underlineY);
        context.lineWidth = Math.max(1, fontSize * 0.055);
        context.strokeStyle = field.color || TEXT_DEFAULT_COLOR;
        context.stroke();
      }
    });
    context.restore();
  });
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
      try {
        const frameState = getExportFrameTrackState(track);
        if (!frameState || !getTrackPlaybackSourceUrl(track, frameState)) {
          return;
        }
        applyExportFrameAutomation(track, frameState);
        drawTrackFrame(context, track, width, height, frameState);
      } catch (error) {
        console.warn(`Export frame draw skipped for ${track?.name || "track"}`, error);
      }
    });
    if (isTextTrackActiveInMix()) {
      drawTextClipFrame(context, getArrangementTextClip(arrangement?.step), width, height);
    }

    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.filter = "none";
  };

  return { canvas, context, width, height, drawFrame };
}

function createExportVideoFramePump(exportTracks, drawFrame) {
  if (!Array.isArray(exportTracks) || typeof drawFrame !== "function") {
    return null;
  }

  let stopped = false;
  const callbacks = new Map();
  exportTracks.forEach((track) => {
    const video = getTrackVideo(track);
    if (!video || typeof video.requestVideoFrameCallback !== "function") {
      return;
    }

    const schedule = () => {
      if (stopped) {
        return;
      }

      try {
        const callbackId = video.requestVideoFrameCallback(() => {
          callbacks.delete(video);
          if (stopped) {
            return;
          }

          drawFrame();
          schedule();
        });
        callbacks.set(video, callbackId);
      } catch (error) {
        console.warn(`Export video-frame pump skipped for ${track?.name || "track"}`, error);
      }
    };

    schedule();
  });

  if (!callbacks.size) {
    return null;
  }

  return {
    stop() {
      stopped = true;
      callbacks.forEach((callbackId, video) => {
        try {
          video.cancelVideoFrameCallback?.(callbackId);
        } catch {
          // Callback already consumed or unavailable.
        }
      });
      callbacks.clear();
    },
  };
}

function drawTrackBounceFrame(context, track, state, width, height) {
  const video = getTrackVideo(track);
  if (!video || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
    return false;
  }

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const { drawWidth, drawHeight, offsetX, offsetY } = getExportContainRect(videoWidth, videoHeight, width, height);

  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.filter = getExportVideoFilterForState(state);
  context.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
  context.filter = "none";
  return true;
}

function createTrackBounceCanvasSession(track, state) {
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
    drawTrackBounceFrame(context, track, state, width, height);
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

      setupTrackAudio(track, video, getTrackPlaybackState(track) || track);
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

    ensureDrumAudioOutput();
    const drumOutput = drumLimiter || drumMasterGain;
    if (drumOutput) {
      try {
        drumOutput.connect(destination);
        connectedAny = true;
        disconnects.push(() => {
          try {
            drumOutput.disconnect(destination);
          } catch {
            // Already disconnected.
          }
        });
      } catch {
        // Drum output may already be connected to this export destination.
        connectedAny = true;
      }
    }

    if (connectedAny) {
      activeExportAudioDestination = destination;
      return { destination, disconnects, fallbackAudioTracks };
    }
    activeExportAudioDestination = null;
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

function createTrackBounceAudioTap(track, state) {
  const fallbackAudioTracks = [];

  if (audioContext && !webAudioDisabled && audioContext.state === "running") {
    const video = getTrackVideo(track);
    if (video) {
      setupTrackAudio(track, video, state);
      const output = track.audio?.output;
      if (output) {
        const destination = audioContext.createMediaStreamDestination();
        const disconnects = [];
        try {
          output.connect(destination);
          disconnects.push(() => {
            try {
              output.disconnect(destination);
            } catch {
              // Already disconnected.
            }
          });
          activeExportAudioDestination = destination;
          return { destination, disconnects, fallbackAudioTracks };
        } catch (error) {
          console.warn("Failed to connect bounce audio tap", error);
        }
      }
    }
    activeExportAudioDestination = null;
  }

  const video = getTrackVideo(track);
  if (video && typeof video.captureStream === "function") {
    try {
      const videoStream = video.captureStream();
      videoStream.getAudioTracks().forEach((audioTrack) => {
        if (audioTrack) {
          fallbackAudioTracks.push(audioTrack);
        }
      });
    } catch (error) {
      console.warn("Failed to capture bounce fallback audio", error);
    }
  }

  return fallbackAudioTracks.length
    ? { destination: null, disconnects: [], fallbackAudioTracks }
    : null;
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

  if (activeExportAudioDestination === tap.destination) {
    activeExportAudioDestination = null;
  }
}

function revokeTrackBounce(track) {
  if (!track) {
    return;
  }

  const bounceUrl = track.frozenBounce?.url;
  if (bounceUrl && String(bounceUrl).startsWith("blob:")) {
    try {
      URL.revokeObjectURL(bounceUrl);
    } catch {
      // Blob URL already released.
    }
  }

  track.frozenBounce = null;
  track.__frozenBounceState = null;
}

async function bounceTrackToRenderedMedia(track) {
  if (!track || track.__bounceInProgress) {
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

  const sourceState = normalizeClipState(getTrackRenderState(track), track);
  const sourceUrl = getTrackPlaybackSourceUrl(track, sourceState);
  if (!sourceUrl) {
    setStatus(`${track.name}: load media before bouncing`, true);
    return false;
  }

  if (transport?.active) {
    stopTransport(true);
  }

  track.__bounceInProgress = true;
  track.frozen = false;
  track.__frozenBounceState = null;
  setTrackMediaStatus(track, "loading");
  window.freemixRender?.updateTrackRow?.(track);
  setStatus(`${track.name}: bouncing one bar...`);

  let canvasSession = null;
  let audioTap = null;
  let mediaStream = null;
  let recorder = null;
  let canvasVideoTrack = null;
  let renderTimerId = null;
  let bounceFramePump = null;
  let stopTimerId = null;
  let recorderFinished;
  const chunks = [];
  const restoreArrangementStep = getArrangementStepIndex(arrangement?.step) ?? 0;
  const restoreArrangementEnabled = !!arrangement.enabled;
  const bounceStopped = new Promise((resolve, reject) => {
    recorderFinished = { resolve, reject };
  });

  try {
    const video = ensureTrackVideoElementForPlayback(track, sourceState);
    if (!video) {
      throw new Error("Track video unavailable");
    }

    setMediaElementSource(video, sourceUrl);
    setVideoCorsPolicy(video, sourceUrl);
    loadMediaElementOnlyIfEmpty(video);
    await waitForTrackReady(video, AV_READY_TIMEOUT_MS * 2);
    safeSetCurrentTime(video, sourceState, track);

    if (!webAudioDisabled) {
      await ensureAudioContext();
    }

    setupTrackAudio(track, video, sourceState);
    applyTrackFx(track, sourceState);
    applyVideoFx(track, sourceState);
    applyTrackPitchAndSpeed(track, sourceState);
    applyTrackVolume(track, sourceState);

    canvasSession = createTrackBounceCanvasSession(track, sourceState);
    mediaStream = canvasSession.canvas.captureStream(EXPORT_FRAME_RATE);
    canvasVideoTrack = mediaStream.getVideoTracks()[0] || null;
    if (canvasVideoTrack && "contentHint" in canvasVideoTrack) {
      canvasVideoTrack.contentHint = "motion";
    }

    audioTap = createTrackBounceAudioTap(track, sourceState);
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
      recorderFinished?.resolve?.();
      recorderFinished = null;
    };
    recorder.onerror = (event) => {
      recorderFinished?.reject?.(event?.error || event || new Error("Bounce recorder error"));
      recorderFinished = null;
    };

    const renderBounceFrame = () => {
      canvasSession?.drawFrame?.();
      if (typeof canvasVideoTrack?.requestFrame === "function") {
        canvasVideoTrack.requestFrame();
      }
    };
    renderBounceFrame();
    recorder.start(200);
    bounceFramePump = createExportVideoFramePump([track], renderBounceFrame);
    renderTimerId = window.setInterval(renderBounceFrame, Math.max(16, Math.round(1000 / EXPORT_FRAME_RATE)));

    const startResult = startTransport();
    if (startResult && typeof startResult.then === "function") {
      await startResult;
    }
    if (!transport?.active) {
      throw new Error("Playback failed to start for bounce");
    }

    const timing = getTransportTimingFromState();
    const durationMs = Math.max(1, timing.barMs);
    stopTimerId = window.setTimeout(() => {
      renderBounceFrame();
      if (recorder && recorder.state === "recording") {
        try {
          recorder.requestData?.();
        } catch {
          // requestData is best effort.
        }
        recorder.stop();
      }
    }, durationMs + 300);

    await Promise.race([
      bounceStopped,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("Bounce timed out")), durationMs + 10000);
      }),
    ]);

    if (!chunks.length) {
      throw new Error("No bounce data received");
    }

    revokeTrackBounce(track);
    const blob = new Blob(chunks, { type: "video/webm" });
    const bounceUrl = URL.createObjectURL(blob);
    track.frozenBounce = {
      url: bounceUrl,
      createdAt: new Date().toISOString(),
      durationMs,
      size: blob.size,
      sourceTitle: sourceState.source?.title || track.source?.title || track.name,
      signature: getPlaybackStateSignature(sourceState, sourceUrl),
    };
    track.__frozenBounceState = null;
    track.frozen = true;
    setTrackMediaStatus(track, "bounced");
    renderWorkstation();
    markAppStateDirty(true);
    setStatus(`${track.name}: bounced and frozen`);
    return true;
  } catch (error) {
    console.warn(error);
    track.frozen = false;
    revokeTrackBounce(track);
    setTrackMediaStatus(track, sourceUrl ? "ready" : "empty");
    window.freemixRender?.updateTrackRow?.(track);
    setStatus(`${track.name}: bounce failed`, true);
    return false;
  } finally {
    track.__bounceInProgress = false;
    if (stopTimerId !== null) {
      window.clearTimeout(stopTimerId);
    }
    if (renderTimerId !== null) {
      window.clearInterval(renderTimerId);
    }
    bounceFramePump?.stop?.();
    if (recorder && recorder.state === "recording") {
      try {
        recorder.stop();
      } catch {
        // Recorder already stopped.
      }
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((streamTrack) => streamTrack.stop?.());
    }
    if (canvasSession?.canvas) {
      canvasSession.canvas.remove();
    }
    if (audioTap) {
      releaseExportAudioTap(audioTap);
    }
    if (transport?.active) {
      stopTransport(true);
    } else {
      stopVideosAfterExport();
    }
    arrangement.enabled = restoreArrangementEnabled;
    updateArrangementStep(restoreArrangementStep, performance.now(), true);
    if (track.frozen && track.frozenBounce?.url) {
      setTrackMediaStatus(track, "bounced");
      setStatus(`${track.name}: bounced and frozen`);
    }
    window.freemixRender?.updateTrackRow?.(track);
  }
}

function unfreezeTrackBounce(track) {
  if (!track) {
    return false;
  }

  track.frozen = false;
  revokeTrackBounce(track);
  setTrackMediaStatus(track, getTrackPlaybackSourceUrl(track, getTrackRenderState(track)) ? "ready" : "empty");
  renderWorkstation();
  markAppStateDirty(true);
  setStatus(`${track.name}: unfrozen`);
  return true;
}

function toggleTrackFreezeBounce(track) {
  if (!track) {
    return false;
  }

  if (track.__bounceInProgress) {
    setStatus(`${track.name}: bounce already running`, true);
    return false;
  }

  if (track.frozen && track.frozenBounce?.url) {
    return unfreezeTrackBounce(track);
  }

  void bounceTrackToRenderedMedia(track);
  return true;
}

function ensureDrumAudioOutput() {
  if (!audioContext || webAudioDisabled) {
    return null;
  }

  if (!drumMasterGain || drumMasterGain.context !== audioContext || !drumLimiter || drumLimiter.context !== audioContext) {
    if (drumMasterGain) {
      try {
        drumMasterGain.disconnect();
      } catch {
        // Already disconnected.
      }
    }

    if (drumBusDrive) {
      try {
        drumBusDrive.disconnect();
      } catch {
        // Already disconnected.
      }
    }

    if (drumBusTone) {
      try {
        drumBusTone.disconnect();
      } catch {
        // Already disconnected.
      }
    }

    if (drumBusAir) {
      try {
        drumBusAir.disconnect();
      } catch {
        // Already disconnected.
      }
    }

    if (drumLimiter) {
      try {
        drumLimiter.disconnect();
      } catch {
        // Already disconnected.
      }
    }

    drumMasterGain = audioContext.createGain();
    drumMasterGain.gain.value = 0.5;
    drumBusDrive = audioContext.createWaveShaper();
    drumBusDrive.curve = createDrumSaturationCurve(1.35);
    drumBusDrive.oversample = "2x";
    drumBusTone = audioContext.createBiquadFilter();
    drumBusTone.type = "lowshelf";
    drumBusTone.frequency.value = 90;
    drumBusTone.gain.value = 1.8;
    drumBusAir = audioContext.createBiquadFilter();
    drumBusAir.type = "highshelf";
    drumBusAir.frequency.value = 7200;
    drumBusAir.gain.value = 1.4;
    drumLimiter = audioContext.createDynamicsCompressor();
    drumLimiter.threshold.setValueAtTime(-9, audioContext.currentTime);
    drumLimiter.knee.setValueAtTime(6, audioContext.currentTime);
    drumLimiter.ratio.setValueAtTime(18, audioContext.currentTime);
    drumLimiter.attack.setValueAtTime(0.002, audioContext.currentTime);
    drumLimiter.release.setValueAtTime(0.12, audioContext.currentTime);
    drumMasterGain
      .connect(drumBusDrive)
      .connect(drumBusTone)
      .connect(drumBusAir)
      .connect(drumLimiter)
      .connect(audioContext.destination);
  }

  if (activeExportAudioDestination) {
    try {
      (drumLimiter || drumMasterGain).connect(activeExportAudioDestination);
    } catch {
      // Already connected or export destination unavailable.
    }
  }

  return drumMasterGain;
}

function createDrumSaturationCurve(drive = 2) {
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let index = 0; index < samples; index += 1) {
    const x = (index * 2) / samples - 1;
    curve[index] = ((1 + drive) * x) / (1 + drive * Math.abs(x));
  }
  return curve;
}

function getDrumKitProfile(kit) {
  const kitName = DRUM_KITS.includes(kit) ? kit : DRUM_DEFAULT_KIT;
  return {
    "808": {
      air: 0.8,
      kickStart: 92,
      kickEnd: 31,
      kickDecay: 0.58,
      kickPeak: 0.88,
      snareNoise: 1850,
      hatFreq: 7600,
      tomLow: 138,
      tomHigh: 205,
      machineColor: "warm",
    },
    "909": {
      air: 1.25,
      kickStart: 146,
      kickEnd: 44,
      kickDecay: 0.24,
      kickPeak: 0.84,
      snareNoise: 2450,
      hatFreq: 9200,
      tomLow: 154,
      tomHigh: 236,
      machineColor: "punch",
    },
    "707": {
      air: 1.5,
      kickStart: 112,
      kickEnd: 52,
      kickDecay: 0.18,
      kickPeak: 0.78,
      snareNoise: 1750,
      hatFreq: 10500,
      tomLow: 178,
      tomHigh: 258,
      machineColor: "crunch",
    },
  }[kitName];
}

function createOfflineNoiseBuffer(context, duration = 0.6) {
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function renderDrumVoiceToOfflineContext(context, voiceId, kit) {
  const destination = context.destination;
  const kitName = DRUM_KITS.includes(kit) ? kit : DRUM_DEFAULT_KIT;
  const kitProfile = getDrumKitProfile(kitName);
  const noiseBuffer = createOfflineNoiseBuffer(context);
  const startAt = 0.01;
  const makeEnvelope = (peak = 0.7, duration = 0.18) => {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), startAt + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    envelope.connect(destination);
    return envelope;
  };
  const makeNoise = (filterType, frequency, peak, duration) => {
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    noise.buffer = noiseBuffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, startAt);
    noise.connect(filter).connect(makeEnvelope(peak, duration));
    noise.start(startAt);
    noise.stop(startAt + duration + 0.04);
  };

  if (voiceId === "kick") {
    const oscillator = context.createOscillator();
    oscillator.type = kitName === "909" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(kitProfile.kickStart, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(kitProfile.kickEnd, startAt + (kitName === "808" ? 0.3 : 0.12));
    oscillator.connect(makeEnvelope(kitProfile.kickPeak, kitProfile.kickDecay));
    oscillator.start(startAt);
    oscillator.stop(startAt + kitProfile.kickDecay + 0.08);
    if (kitName !== "808") {
      makeNoise("highpass", kitName === "909" ? 3400 : 2600, kitName === "909" ? 0.16 : 0.12, 0.018);
    }
    return;
  }

  if (voiceId === "loTom" || voiceId === "hiTom") {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    const isHigh = voiceId === "hiTom";
    oscillator.frequency.setValueAtTime(isHigh ? kitProfile.tomHigh : kitProfile.tomLow, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(isHigh ? (kitName === "909" ? 118 : 104) : (kitName === "909" ? 84 : 72), startAt + 0.18);
    oscillator.connect(makeEnvelope(isHigh ? 0.46 : 0.55, isHigh ? 0.22 : 0.26));
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.32);
    return;
  }

  if (voiceId === "sidestick") {
    makeNoise("bandpass", kitName === "707" ? 2100 : 1850, 0.36, 0.045);
    const click = context.createOscillator();
    click.type = "square";
    click.frequency.setValueAtTime(kitName === "808" ? 920 : 1120, startAt);
    click.connect(makeEnvelope(0.16, 0.035));
    click.start(startAt);
    click.stop(startAt + 0.045);
    return;
  }

  if (voiceId === "snare") {
    makeNoise("bandpass", kitProfile.snareNoise, kitName === "909" ? 0.68 : kitName === "707" ? 0.62 : 0.55, kitName === "909" ? 0.22 : 0.15);
    const tone = context.createOscillator();
    tone.type = "triangle";
    tone.frequency.setValueAtTime(kitName === "808" ? 190 : 235, startAt);
    tone.connect(makeEnvelope(0.18, 0.12));
    tone.start(startAt);
    tone.stop(startAt + 0.16);
    return;
  }

  if (voiceId === "clap") {
    [0, 0.012, 0.026].forEach((offset) => {
      const shiftedAt = startAt + offset;
      const noise = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const envelope = context.createGain();
      noise.buffer = noiseBuffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(kitName === "707" ? 1500 : 1250, shiftedAt);
      envelope.gain.setValueAtTime(0.0001, shiftedAt);
      envelope.gain.exponentialRampToValueAtTime(0.28, shiftedAt + 0.003);
      envelope.gain.exponentialRampToValueAtTime(0.0001, shiftedAt + 0.055);
      noise.connect(filter).connect(envelope).connect(destination);
      noise.start(shiftedAt);
      noise.stop(shiftedAt + 0.08);
    });
    makeNoise("bandpass", kitName === "909" ? 1250 : 980, kitName === "808" ? 0.16 : 0.12, kitName === "808" ? 0.24 : 0.16);
    return;
  }

  if (voiceId === "closedHat" || voiceId === "openHat") {
    const isOpen = voiceId === "openHat";
    makeNoise(
      "highpass",
      kitProfile.hatFreq,
      isOpen ? 0.28 : 0.22,
      isOpen ? (kitName === "909" ? 0.34 : 0.24) : (kitName === "909" ? 0.075 : 0.055),
    );
    return;
  }

  if (voiceId === "crashRide") {
    makeNoise("highpass", kitName === "707" ? 5200 : 6200, 0.34, kitName === "808" ? 0.55 : 0.42);
    const shimmer = context.createOscillator();
    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(kitName === "909" ? 760 : 690, startAt);
    shimmer.connect(makeEnvelope(0.08, 0.38));
    shimmer.start(startAt);
    shimmer.stop(startAt + 0.45);
    return;
  }

  if (voiceId === "cowbell") {
    const bellGain = makeEnvelope(0.26, kitName === "808" ? 0.18 : 0.13);
    [kitName === "707" ? 610 : 540, kitName === "707" ? 930 : 845].forEach((frequency) => {
      const oscillator = context.createOscillator();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(frequency, startAt);
      oscillator.connect(bellGain);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.2);
    });
  }
}

async function renderDrumKitBuffers() {
  if (!audioContext || webAudioDisabled) {
    return drumRenderedBuffers;
  }

  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (typeof OfflineContext !== "function") {
    return drumRenderedBuffers;
  }

  if (drumRenderedSampleRate !== audioContext.sampleRate) {
    drumRenderedBuffers = new Map();
    drumRenderedSampleRate = audioContext.sampleRate;
  }

  if (drumRenderPromise) {
    return drumRenderPromise;
  }

  drumRenderPromise = (async () => {
    const renderedBuffers = new Map(drumRenderedBuffers);
    const renderJobs = [];
    DRUM_KITS.forEach((kit) => {
      DRUM_VOICES.forEach((voice) => {
        const key = `${kit}:${voice.id}`;
        if (renderedBuffers.has(key)) {
          return;
        }
        renderJobs.push({ kit, voiceId: voice.id, key });
      });
    });

    for (const job of renderJobs) {
      const duration = job.voiceId === "kick" && job.kit === "808"
        ? 0.9
        : job.voiceId === "crashRide"
          ? 0.8
          : job.voiceId === "openHat"
            ? 0.55
            : 0.45;
      const context = new OfflineContext(1, Math.ceil(audioContext.sampleRate * duration), audioContext.sampleRate);
      renderDrumVoiceToOfflineContext(context, job.voiceId, job.kit);
      try {
        renderedBuffers.set(job.key, await context.startRendering());
      } catch (error) {
        console.warn(`Failed to render ${job.kit} ${job.voiceId}`, error);
      }
    }

    drumRenderedBuffers = renderedBuffers;
    return drumRenderedBuffers;
  })().finally(() => {
    drumRenderPromise = null;
  });

  return drumRenderPromise;
}

function playDrumVoice(voiceId, kit, when, volume = 0.8) {
  const output = ensureDrumAudioOutput();
  if (!output || masterMuted) {
    return;
  }

  const kitName = DRUM_KITS.includes(kit) ? kit : DRUM_DEFAULT_KIT;
  const key = `${kitName}:${voiceId}`;
  const buffer = drumRenderedBuffers.get(key);
  if (!buffer) {
    renderDrumKitBuffers();
    return;
  }

  const safeWhen = Math.max(audioContext.currentTime, Number(when) || audioContext.currentTime);
  const safeVolume = clamp(Number(volume), 0, 1);
  if (voiceId === "closedHat" && openHatTail) {
    try {
      openHatTail.gain.cancelScheduledValues(safeWhen);
      openHatTail.gain.setTargetAtTime(0.0001, safeWhen, 0.012);
    } catch {
      // Open hat already finished.
    }
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const hitTrim = voiceId === "kick" ? 0.7 : voiceId === "crashRide" || voiceId === "openHat" ? 0.52 : 0.62;
  gain.gain.setValueAtTime(Math.max(0.0001, safeVolume * hitTrim), safeWhen);
  source.buffer = buffer;
  source.connect(gain).connect(output);
  source.start(safeWhen);
  source.stop(safeWhen + buffer.duration + 0.02);
  if (voiceId === "openHat") {
    openHatTail = gain;
  }
}

function resetDrumPulseCursor(stepIndex = arrangement?.step, barStartAt = performance.now()) {
  drumTransportState = {
    stepIndex: getArrangementStepIndex(stepIndex),
    lastPulse: -1,
    barStartAt: Number.isFinite(Number(barStartAt)) ? Number(barStartAt) : performance.now(),
  };
}

function playArrangementDrums(now, currentStep, currentStepStartAt, barMs) {
  if (!transport?.active || !audioContext || webAudioDisabled || !isDrumTrackActiveInMix()) {
    return;
  }

  const stepIndex = getArrangementStepIndex(currentStep);
  const clip = stepIndex === null ? null : getArrangementDrumClip(stepIndex);
  if (!clip || !drumClipHasNotes(clip)) {
    resetDrumPulseCursor(stepIndex, currentStepStartAt);
    return;
  }

  const stepCount = getDrumStepCount(transport);
  const stepMs = Math.max(1, Number(barMs) / stepCount);
  if (drumTransportState.stepIndex !== stepIndex || !almostEqual(Number(drumTransportState.barStartAt), currentStepStartAt, 3)) {
    resetDrumPulseCursor(stepIndex, currentStepStartAt);
  }

  const elapsed = Math.max(0, Number(now) - Number(currentStepStartAt));
  const currentPulse = Math.min(stepCount - 1, Math.floor(elapsed / stepMs));
  const pattern = normalizeDrumPattern(clip.pattern, stepCount);
  for (let pulse = drumTransportState.lastPulse + 1; pulse <= currentPulse; pulse += 1) {
    if (pulse < 0 || pulse >= stepCount) {
      continue;
    }
    const pulseAt = currentStepStartAt + pulse * stepMs;
    const audioWhen = audioContext.currentTime + Math.max(0, (pulseAt - performance.now()) / 1000);
    DRUM_VOICES.forEach((voice) => {
      const stepVelocity = normalizeDrumVelocity(pattern[voice.id]?.[pulse]);
      if (stepVelocity > 0) {
        playDrumVoice(voice.id, clip.kit, audioWhen, clip.volume * stepVelocity);
      }
    });
  }
  drumTransportState.lastPulse = Math.max(drumTransportState.lastPulse, currentPulse);
}

function trackHasArrangementExportSource(track, exportTimeline = createExportTimelineSnapshot("arrangement")) {
  if (!track?.id || !Array.isArray(arrangement?.clips)) {
    return false;
  }

  return exportTimeline.stepIndexes.some((stepIndex) => {
    const step = arrangement.clips[stepIndex];
    const clip = step?.[track.id] ? normalizeClipState(step[track.id], track) : null;
    return !!getTrackPlaybackSourceUrl(track, clip);
  });
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
  const exportTimeline = createExportTimelineSnapshot(requestedExportMode);
  const renderTracks = tracks.filter((track) => {
    if (requestedExportMode === "arrangement") {
      return trackHasArrangementExportSource(track, exportTimeline);
    }

    const renderState = getTrackRenderState(track);
    return track.source || renderState?.source;
  });
  const hasExportText = requestedExportMode === "arrangement"
    ? exportTimeline.stepIndexes.some((stepIndex) => textClipHasVisibleText(getArrangementTextClip(stepIndex)))
    : textClipHasVisibleText(getArrangementTextClip(arrangement?.step));
  if (renderTracks.length === 0 && !hasExportText) {
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
  let renderTimerId = null;
  let exportFramePump = null;
  let canvasVideoTrack = null;
  let mediaStream = null;
  let renderExportFrame = null;
  let requestRecorderData = () => {};
  let stopRecorderForExport = () => {};
  let waitForFinalExportData = () => Promise.resolve();
  const chunks = [];
  const exportMode = mode === "arrangement" ? "arrangement" : "clip";
  let exportError = null;
  let exportCompleted = false;
  let timeoutId = null;
  let recorderFinished;
  const restoreArrangementStep = getArrangementStepIndex(arrangement?.step) ?? 0;
  const restoreArrangementEnabled = !!arrangement.enabled;
  const recorderStopped = new Promise((resolve, reject) => {
    recorderFinished = { resolve, reject };
  });
  if (exportMode === "arrangement") {
    arrangement.enabled = true;
    updateArrangementStep(exportTimeline.startStep, performance.now(), true);
  }

  try {
    canvasSession = createExportCanvasSession();
    mediaStream = canvasSession.canvas.captureStream(EXPORT_FRAME_RATE);
    canvasVideoTrack = mediaStream.getVideoTracks()[0] || null;
    if (canvasVideoTrack && "contentHint" in canvasVideoTrack) {
      canvasVideoTrack.contentHint = "motion";
    }
    if (!webAudioDisabled) {
      try {
        await ensureAudioContext();
        ensureDrumAudioOutput();
        await renderDrumKitBuffers();
      } catch (error) {
        console.warn("Export audio context unavailable", error);
      }
    }
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

    requestRecorderData = () => {
      try {
        renderExportFrame?.();
      } catch (error) {
        console.warn("Failed to render final export frame", error);
      }

      if (!recorder || recorder.state !== "recording" || typeof recorder.requestData !== "function") {
        return;
      }

      try {
        recorder.requestData();
      } catch (error) {
        console.warn("Failed to request final export data", error);
      }
    };
    stopRecorderForExport = () => {
      requestRecorderData();
      if (recorder && recorder.state === "recording") {
        recorder.stop();
      }
    };
    waitForFinalExportData = () => {
      if (chunks.length > 0 || !recorder || typeof recorder.addEventListener !== "function") {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        let timeoutId = null;
        const finish = () => {
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
          }
          recorder.removeEventListener("dataavailable", handleData);
          resolve();
        };
        const handleData = (event) => {
          if (event?.data && event.data.size > 0) {
            finish();
          }
        };

        recorder.addEventListener("dataavailable", handleData);
        timeoutId = window.setTimeout(finish, 900);
      });
    };

    renderExportFrame = () => {
      if (!canvasSession) {
        return;
      }
      canvasSession.drawFrame();
      if (typeof canvasVideoTrack?.requestFrame === "function") {
        canvasVideoTrack.requestFrame();
      }
    };

    const startResult = startTransport();
    if (startResult && typeof startResult.then === "function") {
      await startResult;
    }

    if (!transport?.active) {
      throw new Error("Playback failed to start");
    }

    await primeExportCanvasForRecording(renderTracks, canvasSession, canvasVideoTrack);

    const durationMs = exportTimeline.durationMs;
    recorder.start(200);
    renderExportFrame();
    exportFramePump = createExportVideoFramePump(renderTracks, renderExportFrame);
    renderTimerId = window.setInterval(
      renderExportFrame,
      Math.max(16, Math.round(1000 / EXPORT_FRAME_RATE)),
    );

    const exportLabel = exportMode === "arrangement" ? "arrangement" : "clip";
    setStatus(`Exporting ${exportLabel}...`);

    timerId = window.setTimeout(() => {
      if (!isExportingVideo) {
        return;
      }

      stopTransport(false);
      stopRecorderForExport();
      if (renderTimerId !== null) {
        window.clearInterval(renderTimerId);
        renderTimerId = null;
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
    await waitForFinalExportData();
  } catch (error) {
    exportError = error;
    console.warn(error);
    stopRecorderForExport();
    exportFramePump?.stop?.();
    exportFramePump = null;
    if (renderTimerId !== null) {
      window.clearInterval(renderTimerId);
      renderTimerId = null;
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
    stopRecorderForExport();
    exportFramePump?.stop?.();
    exportFramePump = null;

    if (renderTimerId !== null) {
      window.clearInterval(renderTimerId);
      renderTimerId = null;
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
    if (transport?.active) {
      stopTransport(true);
    }
    stopTransport(false);
    stopVideosAfterExport();
    if (exportMode === "arrangement") {
      arrangement.enabled = restoreArrangementEnabled;
      updateArrangementStep(restoreArrangementStep, performance.now(), true);
    }
    window.freemixRender?.updateTransportRow?.();
    if (exportError) {
      setStatus("Export failed", true);
    } else if (exportCompleted) {
      setStatus("Export complete");
    } else {
      setStatus("No export data received", true);
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
  const elapsedBars = Math.floor(Math.max(0, now - transport.startedAt) / barMs);
  const arrangementTransportActive = arrangement.enabled && hasArrangementClips();
  const arrangementLength = arrangement.clips?.length || 1;
  const currentStep = arrangementTransportActive
    ? (transport.arrangementStartStep + elapsedBars) % arrangementLength
    : getArrangementStepIndex(arrangement?.step) ?? 0;
  const currentStepStartAt = transport.startedAt + elapsedBars * barMs;

  if (arrangementTransportActive) {
    updateArrangementStep(currentStep, currentStepStartAt);
    reconcileArrangementPlaybackConfidence("transport");
    playArrangementDrums(now, currentStep, currentStepStartAt, barMs);
    const maxLookaheadBars = Math.max(1, Math.min(arrangementLength, Math.ceil(ARRANGEMENT_STEP_LOOKAHEAD_MS / barMs)));
    for (let lookaheadBar = 1; lookaheadBar <= maxLookaheadBars; lookaheadBar += 1) {
      const nextStep = getNextArrangementStepStart(elapsedBars + lookaheadBar - 1, barMs);
      if (!nextStep || nextStep.startAt <= now) {
        continue;
      }
      if (nextStep.startAt - now > ARRANGEMENT_STEP_LOOKAHEAD_MS) {
        break;
      }
      prepareUpcomingArrangementStepPreroll(nextStep.step, nextStep.startAt, transport.sessionToken);
    }
  } else {
    playArrangementDrums(now, currentStep, currentStepStartAt, barMs);
  }

  tracks.forEach((track) => {
    const playbackState = getTrackPlaybackState(track) || track;
    const sourceUrl = getTrackPlaybackSourceUrl(track, playbackState);
    const isPianoRoll = isPianoRollTimingState(playbackState);

    if (!sourceUrl || (!track.stepMs && !isPianoRoll)) {
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
    if (isPianoRoll) {
      const pianoContextKey = `${transport.sessionToken}:${arrangementTransportActive ? "arr" : "live"}:${currentStep}:${elapsedBars}`;
      playPianoRollEventsForTrack(
        track,
        activePlaybackState,
        now,
        currentStepStartAt,
        barMs,
        beatsPerBar,
        pianoContextKey,
      );
      return;
    }

    const pulseIndex = getTrackPulseIndex(track, now);
    if (pulseIndex === null) {
      return;
    }

    if (!Number.isFinite(track.__lastRetriggerPulse)) {
      track.__lastRetriggerPulse = pulseIndex - 1;
    }

    if (pulseIndex > track.__lastRetriggerPulse) {
      track.__lastRetriggerPulse = pulseIndex;
      track.nextTriggerAt = transport.startedAt + getTrackTimingNudgeMs(track) + (pulseIndex + 1) * track.stepMs;
      if (!isTrackAudibleInMix(track, activePlaybackState)) {
        return;
      }
      track.__lastTransportClockCorrectionAt = 0;
      track.__lastTransportClockCorrectionPulse = null;
      if (pulseIndex === 0) {
        track.__transportClockCorrectionPulse = pulseIndex;
        track.__transportClockCorrectionUntil = transport.startedAt + pulseIndex * track.stepMs + TRANSPORT_CLOCK_CORRECTION_MAX_WINDOW_MS;
      } else {
        track.__transportClockCorrectionPulse = null;
        track.__transportClockCorrectionUntil = null;
      }
      const eventPlaybackState = getRetriggerPlaybackStateForPulse(
        track,
        activePlaybackState,
        pulseIndex,
        beatsPerBar,
        beatMs,
      );
      triggerTrack(track, eventPlaybackState, transport.sessionToken);
      syncTrackVideoToTransportClock(track, eventPlaybackState, now, pulseIndex);
      return;
    }
    syncTrackVideoToTransportClock(track, activePlaybackState, now, pulseIndex);
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

  setVideoCorsPolicy(video, sourceUrl);
  const sourceChanged = !!sourceUrl && !mediaElementHasSource(video, sourceUrl);
  if (sourceChanged) {
    holdTrackVisualUntilCleanFrame(track);
    track.__parkedAtAnchorFor = null;
    track.__parkedPlaybackSignature = null;
    track.__prerollRevealFor = null;
    track.__prerollPlaybackSignature = null;
    track.__prerollRevealCanSkipSeek = false;
    setMediaElementSource(video, sourceUrl);
  }

  const playbackSignature = getPlaybackStateSignature(playbackState, sourceUrl);
  setTrackPlaybackPhase(track, PLAYBACK_PHASES.cueing, {
    sessionToken: transportSessionToken,
    clipSignature: playbackSignature,
    mediaStatus: "prerolling",
  });
  const requiresFxRoute = shouldRouteAudioThroughFx(track, playbackState);
  if (requiresFxRoute) {
    prepareTrackAudioFxForPlayback(track, playbackState);
  }

  const canFastRetrigger =
    !!transport?.active &&
    !sourceChanged &&
    video.readyState >= 1 &&
    !video.paused &&
    !video.ended;
  if (!canFastRetrigger || track.__lastPlaybackSignature !== playbackSignature) {
    holdTrackVisualUntilCleanFrame(track);
  }
  const hasStableAudioRoute =
    !requiresFxRoute ||
    (!webAudioDisabled && audioContext?.state === "running" && hasLiveTrackAudioGraph(track, video));
  if (canFastRetrigger && hasStableAudioRoute && track.__lastPlaybackSignature === playbackSignature) {
    safeSetCurrentTime(video, playbackState, track, { force: true });
    applyTrackVolume(track, playbackState);
    applyTrackFx(track, playbackState);
    applyTrackPitchAndSpeed(track, playbackState);
    track.__warmLaunchFor = null;
    track.__prerollRevealFor = null;
    track.__prerollPlaybackSignature = null;
    track.__prerollRevealCanSkipSeek = false;
    void revealTrackAfterPresentedFrame(track, video, track.__playbackToken);
    flashTrackTrigger(track);
    return;
  }

  const canRevealWarmLaunch =
    !!transport?.active &&
    !sourceChanged &&
    track.__warmLaunchFor === transportSessionToken &&
    video.readyState >= 1 &&
    !video.paused &&
    !video.ended;
  if (canRevealWarmLaunch) {
    prepareTrackAudioFxForPlayback(track, playbackState);
    const canRevealPrerollWithoutSeek =
      track.__prerollRevealFor === transportSessionToken &&
      track.__prerollPlaybackSignature === playbackSignature &&
      track.__prerollRevealCanSkipSeek;
    if (!canRevealPrerollWithoutSeek) {
      safeSetCurrentTime(video, playbackState, track, { force: true });
    }
    applyTrackVolume(track, playbackState);
    applyTrackFx(track, playbackState);
    applyVideoFx(track, playbackState);
    applyTrackBlend(track, playbackState);
    applyTrackOpacity(track, playbackState);
    applyTrackPitchAndSpeed(track, playbackState);
    track.__lastPlaybackSignature = playbackSignature;
    track.__warmLaunchFor = null;
    track.__prerollRevealFor = null;
    track.__prerollPlaybackSignature = null;
    track.__prerollRevealCanSkipSeek = false;
    track.__parkedAtAnchorFor = null;
    track.__parkedPlaybackSignature = null;
    void revealTrackAfterPresentedFrame(track, video, track.__playbackToken);
    flashTrackTrigger(track);
    return;
  }

  track.__playbackToken = Number.isFinite(track.__playbackToken) ? track.__playbackToken + 1 : 1;
  const playbackToken = track.__playbackToken;
  if (track.__pendingPlaybackFrame) {
    window.cancelAnimationFrame(track.__pendingPlaybackFrame);
    track.__pendingPlaybackFrame = null;
  }

  setupTrackAudio(track, video, playbackState);
  prepareTrackAudioFxForPlayback(track, playbackState);
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
    track.__warmLaunchFor = null;
    track.__prerollRevealFor = null;
    track.__prerollPlaybackSignature = null;
    track.__prerollRevealCanSkipSeek = false;
    flashTrackTrigger(track);
    return;
  }

  safeSetCurrentTime(video, playbackState, track, { force: true });
  track.__lastPlaybackSignature = playbackSignature;

  if (canFastRetrigger) {
    track.__warmLaunchFor = null;
    track.__prerollRevealFor = null;
    track.__prerollPlaybackSignature = null;
    track.__prerollRevealCanSkipSeek = false;
    void revealTrackAfterPresentedFrame(track, video, track.__playbackToken);
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
  const videoSource = video.currentSrc || video.src || "";
  const isSliceSource = isMediaSlicePlaybackUrl(videoSource);
  const isLiveSource = isMediaLivePlaybackUrl(videoSource);
  const activeState = track ? getTrackPlaybackState(track) || track : null;
  const sourceDuration = Number(activeState?.source?.durationSeconds ?? track?.source?.durationSeconds);
  const maxDurationValue = String(
    Math.max(0, Number.isFinite(sourceDuration) && sourceDuration > 0 ? sourceDuration : video.duration),
  );
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

  if (isSliceSource || isLiveSource) {
    syncStartControls(track);
    return;
  }

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

  if (controlName === "timingMode") {
    clip.timingMode = normalizeClipTimingMode(value);
    return;
  }

  if (controlName === "pianoSnap") {
    clip.pianoSnap = normalizePianoRollSnap(value);
    return;
  }

  if (controlName === "pianoRoot") {
    clip.pianoRoot = normalizePianoRootNote(value);
    return;
  }

  if (controlName === "notes") {
    clip.notes = normalizePianoRollNotes(value);
    return;
  }

  if (controlName === "automation") {
    clip.automation = normalizeClipAutomation(value);
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

function verifyTrackAudioFxRoute(track, state = track, video = getTrackVideo(track)) {
  if (!track) {
    return false;
  }

  const sourceUrl = getTrackPlaybackSourceUrl(track, state);
  if (!sourceUrl) {
    track.audioFxStatus = "empty";
    setTrackMediaStatus(track, "empty");
    return false;
  }

  const isRouted = hasLiveTrackAudioGraph(track, video);
  if (isRouted) {
    track.audioFxStatus = track.audio?.route === "capture-stream" ? "capture-fx" : "webaudio";
    setTrackMediaStatus(track, "fx-routed");
    return true;
  }

  track.audioFxStatus = webAudioDisabled || !audioContext ? "fx-unavailable" : "unrouted";
  setTrackMediaStatus(track, "fx-unavailable");
  return false;
}

function shouldRouteAudioThroughFx(track, state = track) {
  return !!getTrackPlaybackSourceUrl(track, state);
}

function prepareTrackAudioFxForPlayback(track, state = track) {
  if (!shouldRouteAudioThroughFx(track, state)) {
    return false;
  }

  const video = getTrackVideo(track);
  if (!webAudioDisabled && audioContext?.state === "running" && video) {
    syncTrackVideoElementSource(track, video, state);
    setupTrackAudio(track, video, state);
  } else {
    requestTrackAudioFxRoute(track, state);
  }
  if (track.audio) {
    applyAudioFxToGraph(track.audio, state);
  } else {
    applyTrackFx(track, state);
  }
  applyTrackVolume(track, state);
  return hasLiveTrackAudioGraph(track, video);
}

function applyTrackVolume(track, state = track) {
  const { muted: isMuted, volume } = getClipVolumeState(track, state);
  const video = getTrackVideo(track);
  const hasLiveAudioGraph = hasLiveTrackAudioGraph(track, video);
  const usesCapturedAudio = hasLiveAudioGraph && track.audio?.route === "capture-stream";
  const requiresFxRoute = shouldRouteAudioThroughFx(track, state);

  if (!hasLiveAudioGraph && track.audio) {
    disposeTrackAudio(track);
  }

  if (track.audio?.output && hasLiveAudioGraph && !almostEqual(track.audio.output.gain.value, isMuted ? 0 : volume)) {
    track.audio.output.gain.value = isMuted ? 0 : volume;
  }

  if (video) {
    const nextMuted = usesCapturedAudio || (requiresFxRoute && !hasLiveAudioGraph) ? true : hasLiveAudioGraph ? false : isMuted;
    if (video.muted !== nextMuted) {
      video.muted = nextMuted;
    }

    const nextVolume = usesCapturedAudio || (requiresFxRoute && !hasLiveAudioGraph) ? 0 : hasLiveAudioGraph ? 1 : isMuted ? 0 : volume;
    if (!almostEqual(video.volume, nextVolume)) {
      video.volume = nextVolume;
    }
  }
}

function createTrackAudioGraph(track, video, source, route = "media-element") {
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
  low.frequency.value = 220;
  mid.type = "peaking";
  mid.frequency.value = 1200;
  mid.Q.value = 1.35;
  high.type = "highshelf";
  high.frequency.value = 3200;
  dryGain.gain.value = 1;
  delay.delayTime.value = 0.25;
  reverb.buffer = getReverbImpulse(audioContext);
  output.gain.value = 0;

  source.connect(low).connect(mid).connect(high).connect(drive);
  drive.connect(dryGain).connect(output);
  drive.connect(delay).connect(delayGain).connect(output);
  drive.connect(reverb).connect(reverbGain).connect(output);
  output.connect(audioContext.destination);

  track.audio = {
    mediaElement: video,
    source,
    route,
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
  track.audioFxStatus = route === "capture-stream" ? "capture-fx" : "webaudio";
  setTrackMediaStatus(track, "fx-routed");
  return true;
}

function setupTrackCapturedAudio(track, video, state = track) {
  const captureStream = video?.captureStream || video?.mozCaptureStream;
  if (!captureStream || !audioContext || audioContext.state !== "running") {
    return false;
  }

  try {
    const stream = captureStream.call(video);
    if (!stream?.getAudioTracks?.().length) {
      if (!track.__captureAudioRetryBound) {
        track.__captureAudioRetryBound = true;
        const retryCapture = () => {
          track.__captureAudioRetryBound = false;
          requestTrackAudioFxRoute(track, state);
        };
        video.addEventListener("loadedmetadata", retryCapture, { once: true });
        video.addEventListener("canplay", retryCapture, { once: true });
        video.addEventListener("play", retryCapture, { once: true });
      }
      return false;
    }

    const source = audioContext.createMediaStreamSource(stream);
    createTrackAudioGraph(track, video, source, "capture-stream");
    track.audio.stream = stream;
    return true;
  } catch (error) {
    console.warn(error);
    if (track?.audio) {
      disposeTrackAudio(track);
    }
    track.audioFxStatus = "capture-failed";
    return false;
  }
}

function getMediaElementSourceNode(video) {
  if (!video || !audioContext) {
    return null;
  }

  const cached = mediaElementSourceNodes.get(video);
  if (cached?.context === audioContext && cached.source) {
    return cached.source;
  }

  const source = audioContext.createMediaElementSource(video);
  mediaElementSourceNodes.set(video, {
    context: audioContext,
    source,
  });
  return source;
}

function setupTrackAudio(track, video, state = track) {
  if (webAudioDisabled || !audioContext || audioContext.state !== "running" || !video) {
    if (track.audio) {
      disposeTrackAudio(track);
    }
    return false;
  }

  const sourceUrl = getTrackPlaybackSourceUrl(track, state);
  if (shouldDisableWebAudioForSource(sourceUrl)) {
    if (setupTrackCapturedAudio(track, video, state)) {
      verifyTrackAudioFxRoute(track, state, video);
      return true;
    }

    if (track.audio) {
      disposeTrackAudio(track);
    }
    track.audioFxStatus = sourceUrl ? "native-audio" : "empty";
    setTrackMediaStatus(track, sourceUrl ? "fx-unavailable" : "empty");
    return false;
  }

  if (track.audio && track.audio.mediaElement !== video) {
    disposeTrackAudio(track);
  }

  if (track.audio && track.audio.source && track.audio.source.context !== audioContext) {
    disposeTrackAudio(track);
  }

  if (track.audio) {
    verifyTrackAudioFxRoute(track, state, video);
    return true;
  }

  try {
    const source = getMediaElementSourceNode(video);
    const didCreate = createTrackAudioGraph(track, video, source, "media-element");
    verifyTrackAudioFxRoute(track, state, video);
    return didCreate;
  } catch (error) {
    console.warn(error);
    if (track?.audio) {
      disposeTrackAudio(track);
    }
    if (setupTrackCapturedAudio(track, video, state)) {
      verifyTrackAudioFxRoute(track, state, video);
      return true;
    }
    track.audio = null;
    track.audioFxStatus = "failed";
    setTrackMediaStatus(track, "failed");
    setStatus("Audio FX route failed");
    return false;
  }
}

function ensureTrackAudioFxRoute(track, state = track) {
  const video = getTrackVideo(track);
  if (!track || !video) {
    return null;
  }

  if (hasLiveTrackAudioGraph(track, video)) {
    verifyTrackAudioFxRoute(track, state, video);
    return track.audio;
  }

  if (track.audio) {
    disposeTrackAudio(track);
  }

  const sourceUrl = getTrackPlaybackSourceUrl(track, state);
  if (!sourceUrl || shouldDisableWebAudioForSource(sourceUrl)) {
    if (sourceUrl && setupTrackAudio(track, video, state)) {
      return verifyTrackAudioFxRoute(track, state, video) ? track.audio : null;
    }

    track.audioFxStatus = sourceUrl ? "native-audio" : "empty";
    setTrackMediaStatus(track, sourceUrl ? "fx-unavailable" : "empty");
    return null;
  }

  if (webAudioDisabled || !audioContext || audioContext.state !== "running") {
    track.audioFxStatus = "waiting";
    setTrackMediaStatus(track, "fx-unavailable");
    return null;
  }

  setupTrackAudio(track, video, state);
  return verifyTrackAudioFxRoute(track, state, video) ? track.audio : null;
}

function requestTrackAudioFxRoute(track, state = track) {
  const sourceUrl = getTrackPlaybackSourceUrl(track, state);
  if (!track || !sourceUrl || webAudioDisabled) {
    return false;
  }

  if (shouldDisableWebAudioForSource(sourceUrl)) {
    if (ensureTrackAudioFxRoute(track, state)) {
      applyTrackVolume(track, state);
      applyTrackFx(track, state);
      return true;
    }

    const rawSourceUrl = state?.source?.mediaUrl || track?.source?.mediaUrl;
    if (rawSourceUrl && isRemoteHttpMediaUrl(rawSourceUrl) && !localMediaProxyAvailable) {
      checkLocalMediaProxy().then((isAvailable) => {
        if (!isAvailable) {
          return;
        }

        const playbackSourceUrl = getTrackPlaybackSourceUrl(track, state);
        const video = getTrackVideo(track);
        if (video && playbackSourceUrl && !mediaElementHasSource(video, playbackSourceUrl)) {
          setMediaElementSource(video, playbackSourceUrl);
        }
        ensureAudioContext()
          .then(() => {
            if (!ensureTrackAudioFxRoute(track, state)) {
              return;
            }

            applyTrackVolume(track, state);
            applyTrackFx(track, state);
          })
          .catch((error) => {
            console.warn(error);
            track.audioFxStatus = "failed";
          });
      });
    }
    return false;
  }

  if (ensureTrackAudioFxRoute(track, state)) {
    applyTrackVolume(track, state);
    applyTrackFx(track, state);
    return true;
  }

  ensureAudioContext()
    .then(() => {
      if (!ensureTrackAudioFxRoute(track, state)) {
        return;
      }

      applyTrackVolume(track, state);
      applyTrackFx(track, state);
    })
    .catch((error) => {
      console.warn(error);
      track.audioFxStatus = "failed";
    });

  return true;
}

function applyAudioFxToGraph(audio, state = {}) {
  const fxState = state?.fx || {};
  const eqLow = clamp(Number(fxState.eqLow), -12, 12) * 1.75;
  const eqMid = clamp(Number(fxState.eqMid), -12, 12) * 1.75;
  const eqHigh = clamp(Number(fxState.eqHigh), -12, 12) * 1.75;
  const tube = clamp(Number(fxState.tube), 0, 1);
  const delay = clamp(Number(fxState.delay), 0, 1);
  const reverb = clamp(Number(fxState.reverb), 0, 1);

  const now = audioContext?.currentTime ?? 0;
  audio.low.gain.cancelScheduledValues(now);
  audio.mid.gain.cancelScheduledValues(now);
  audio.high.gain.cancelScheduledValues(now);
  audio.low.gain.setTargetAtTime(eqLow, now, 0.012);
  audio.mid.gain.setTargetAtTime(eqMid, now, 0.012);
  audio.high.gain.setTargetAtTime(eqHigh, now, 0.012);
  audio.drive.curve = getTubeCurve(tube);
  audio.drive.oversample = "4x";
  audio.delay.delayTime.value = 0.12 + delay * 0.5;
  audio.delayGain.gain.value = delay * 0.42;
  audio.reverbGain.gain.value = reverb * 0.45;
}

function applyTrackFx(track, state = track) {
  const audio = ensureTrackAudioFxRoute(track, state);
  if (!audio) {
    verifyTrackAudioFxRoute(track, state);
    return;
  }

  applyAudioFxToGraph(audio, state);
  verifyTrackAudioFxRoute(track, state, audio.mediaElement);
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

function applyVideoPitchAndSpeed(video, state = {}) {
  if (!video) {
    return;
  }

  const speed = Number.isFinite(Number(state?.speed)) ? Number(state.speed) : 1;
  const pitch = Number.isFinite(Number(state?.pitch)) ? Number(state.pitch) : 0;
  const nextPlaybackRate = clamp(speed * 2 ** (pitch / 12), 0.25, 4);
  if (!almostEqual(video.playbackRate, nextPlaybackRate, 0.0005)) {
    video.playbackRate = nextPlaybackRate;
  }
}

function applyTrackPitchAndSpeed(track, state = track) {
  applyVideoPitchAndSpeed(getTrackVideo(track), state);
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

  if (track.audio.stream?.getTracks) {
    track.audio.stream.getTracks().forEach((mediaTrack) => {
      try {
        mediaTrack.stop();
      } catch {
        // Already stopped.
      }
    });
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

  const mediaSource = video?.currentSrc || video?.src || "";
  const sliceStart = getMediaSliceOriginalStart(mediaSource);
  const liveStart = getMediaLiveOriginalStart(mediaSource);
  const localStartTime =
    isMediaSlicePlaybackUrl(mediaSource)
      ? Number(track.startTime) - sliceStart
      : isMediaLivePlaybackUrl(mediaSource)
        ? Number(track.startTime) - liveStart
        : Number(track.startTime);
  return playableStartTime(Math.max(0, localStartTime), video);
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

  const transportStart = (Number.isFinite(transport.startedAt) ? transport.startedAt : performance.now()) + getTrackTimingNudgeMs(track);
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

  const transportStart = (Number.isFinite(transport.startedAt) ? transport.startedAt : performance.now()) + getTrackTimingNudgeMs(track);
  if (referenceTime < transportStart - 1) {
    return null;
  }

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
  track.nextTriggerAt = transport.startedAt + getTrackTimingNudgeMs(track) + (track.__lastRetriggerPulse + 1) * track.stepMs;
}

function syncTrackVideoToTransportClock(track, playbackState, referenceTime = performance.now(), pulseIndex = null) {
  if (!track || !playbackState || !transport?.active) {
    return;
  }

  const video = getTrackVideo(track);
  if (!video || video.readyState < 1 || video.paused || video.ended || video.seeking) {
    return;
  }

  const stepMs = Number(track.stepMs);
  if (!Number.isFinite(stepMs) || stepMs <= 0 || !Number.isFinite(Number(transport.startedAt))) {
    return;
  }

  const resolvedPulseIndex = Number.isFinite(Number(pulseIndex)) ? Number(pulseIndex) : getTrackPulseIndex(track, referenceTime);
  if (!Number.isFinite(resolvedPulseIndex) || resolvedPulseIndex < 0) {
    return;
  }

  const pulseStartAt = transport.startedAt + resolvedPulseIndex * stepMs;
  const elapsedMs = referenceTime - pulseStartAt;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return;
  }

  const correctionWindowMs = clamp(
    stepMs * 0.35,
    TRANSPORT_CLOCK_CORRECTION_MIN_WINDOW_MS,
    TRANSPORT_CLOCK_CORRECTION_MAX_WINDOW_MS,
  );
  const armedPulse = Number(track.__transportClockCorrectionPulse);
  const armedUntil = Number(track.__transportClockCorrectionUntil);
  const isCorrectionArmed =
    Number.isFinite(armedPulse) &&
    armedPulse === resolvedPulseIndex &&
    Number.isFinite(armedUntil) &&
    referenceTime <= armedUntil;
  if (
    !isCorrectionArmed ||
    elapsedMs > correctionWindowMs ||
    track.__lastTransportClockCorrectionPulse === resolvedPulseIndex
  ) {
    if (Number.isFinite(armedUntil) && referenceTime > armedUntil) {
      track.__transportClockCorrectionPulse = null;
      track.__transportClockCorrectionUntil = null;
    }
    return;
  }

  const anchorTime = safeStartTime(playbackState, video);
  if (!Number.isFinite(anchorTime)) {
    return;
  }

  const speed = Math.max(0.1, Math.abs(Number(playbackState?.speed) || 1));
  let desiredTime = anchorTime + (elapsedMs / 1000) * speed;
  if (Number.isFinite(video.duration) && video.duration > 0) {
    desiredTime = clamp(desiredTime, 0, Math.max(0, video.duration - 0.025));
  }

  const driftSeconds = video.currentTime - desiredTime;
  const isBehindClock = driftSeconds < -0.01;
  const isAheadOfClock = driftSeconds > 0.14;
  if (!isBehindClock && !isAheadOfClock) {
    return;
  }

  track.__lastTransportClockCorrectionAt = performance.now();
  track.__lastTransportClockCorrectionPulse = resolvedPulseIndex;
  track.__transportClockCorrectionPulse = null;
  track.__transportClockCorrectionUntil = null;
  try {
    video.currentTime = desiredTime;
  } catch {
    // Best effort: the next retrigger or ready-state transition will re-align.
  }
}

function updateTrackTriggerGrid(startAt = performance.now()) {
  if (!transport) {
    return;
  }

  const beatMs = getTransportBeatMs(transport);
  const barMs = beatMs * getTransportBeatsPerBar(transport);
  tracks.forEach((track) => {
    const activeState = getTrackActiveControlState(track) || track;
    const timingState = getTrackFrozenBounceState(track, activeState) || activeState;
    track.arrangementClip = null;
    const isPianoRoll = isPianoRollTimingState(timingState);
    track.stepMs = isPianoRoll ? 0 : getClipRetriggerStepMs(timingState, barMs);
    if (isPianoRoll) {
      clearPianoRollGate(track);
      track.nextTriggerAt = Number.POSITIVE_INFINITY;
      track.__lastRetriggerPulse = null;
      track.__pianoRollEventContext = null;
      track.__playedPianoRollEvents = new Set();
      track.lastStep = -1;
      return;
    }
    clearPianoRollGate(track);
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

  selectArrangementStep(stepIndex);
  selectArrangementClip(track.id, stepIndex, { additive: isMultiSelect });
  setStatus(
    hasTrackClip
      ? `Editing ${track.name} / scene ${stepIndex + 1}`
      : `Blank ${track.name} slot selected; press Capture to create`,
  );
}

function handleArrangementTextCell(event) {
  const cell = event.currentTarget;
  if (typeof clearGuidanceHint === "function") {
    clearGuidanceHint();
  }

  const stepIndex = Number(cell.dataset.arrStep);
  if (!Number.isInteger(stepIndex) || getArrangementStepIndex(stepIndex) === null) {
    return;
  }

  const isMultiSelect = !!(event.ctrlKey || event.metaKey);
  selectArrangementStep(stepIndex);
  selectArrangementTextClip(stepIndex, { additive: isMultiSelect });
  window.freemixRender?.updateArrangementGrid?.();
  window.freemixRender?.updateTextOverlay?.();
  window.freemixRender?.updateTextEditor?.();
  setStatus(getArrangementTextClip(stepIndex) ? `Editing TEXT / scene ${stepIndex + 1}` : `Scene ${stepIndex + 1}: blank TEXT slot selected`);
}

function handleArrangementDrumCell(event) {
  const cell = event.currentTarget;
  if (typeof clearGuidanceHint === "function") {
    clearGuidanceHint();
  }

  const stepIndex = Number(cell.dataset.arrStep);
  if (!Number.isInteger(stepIndex) || getArrangementStepIndex(stepIndex) === null) {
    return;
  }

  const isMultiSelect = !!(event.ctrlKey || event.metaKey);
  selectArrangementStep(stepIndex);
  selectArrangementDrumClip(stepIndex, { additive: isMultiSelect });
  window.freemixRender?.updateArrangementGrid?.();
  window.freemixRender?.updateDrumEditor?.();
  setStatus(getArrangementDrumClip(stepIndex) ? `Editing DRUM / scene ${stepIndex + 1}` : `Scene ${stepIndex + 1}: blank DRUM slot selected`);
}

function handleArrangementStepLabel(event) {
  if (typeof clearGuidanceHint === "function") {
    clearGuidanceHint();
  }

  const stepIndex = Number(event.currentTarget.dataset.arrStep);
  if (!Number.isInteger(stepIndex)) {
    return;
  }

  selectArrangementSceneClips(stepIndex);
  selectArrangementStep(stepIndex);
  setStatus(`Scene ${stepIndex + 1} selected`);
}

function toggleArrangementDeleteMode() {
  arrangementDeleteMode = false;
  deleteSelectedArrangementScene();
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
  if (Array.isArray(arrangement.textClips)) {
    arrangement.textClips[targetStep] = cloneArrangementClipForKind(
      ARRANGEMENT_CLIP_KINDS.text,
      arrangement.textClips[sourceStep],
    );
  }
  if (Array.isArray(arrangement.drumClips)) {
    arrangement.drumClips[targetStep] = cloneArrangementClipForKind(
      ARRANGEMENT_CLIP_KINDS.drum,
      arrangement.drumClips[sourceStep],
    );
  }
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
  window.freemixRender?.updateArrangementTextCell?.(targetStep);
  window.freemixRender?.updateArrangementDrumCell?.(targetStep);
  window.freemixRender?.updateTextOverlay?.();
  window.freemixRender?.updateTextEditor?.();
  window.freemixRender?.updateDrumEditor?.();
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

function getSelectedArrangementSceneStep() {
  if (selectedArrangementSceneStep === null || typeof selectedArrangementSceneStep === "undefined") {
    return null;
  }

  return getArrangementStepIndex(selectedArrangementSceneStep);
}

function refreshArrangementCommandUi(stepIndex, statusMessage = "", options = {}) {
  const resolvedStep = getArrangementStepIndex(stepIndex);
  refreshArrangementHasClipsState();

  if (transport?.active && arrangement.enabled && hasArrangementClips()) {
    rebindArrangementClipsForActiveTransport();
  }

  if (resolvedStep !== null) {
    selectArrangementStep(resolvedStep);
  }

  if (window.freemixRender?.updateArrangementGrid) {
    window.freemixRender.updateArrangementGrid();
  } else {
    renderWorkstation();
  }
  window.freemixRender?.updateArrangementPlayhead?.();
  window.freemixRender?.updateArrangementSceneColorSelector?.();
  window.freemixRender?.updateTextOverlay?.();
  window.freemixRender?.updateTextEditor?.();
  window.freemixRender?.updateDrumEditor?.();
  window.freemixRender?.updateTransportRow?.();

  if (options.selectScene && resolvedStep !== null) {
    selectArrangementSceneClips(resolvedStep);
  }

  if (statusMessage) {
    setStatus(statusMessage, !!options.isError);
  }

  if (options.dirty !== false) {
    markAppStateDirty(true);
  }
}

function captureSelectedArrangementSlots() {
  const targets = getArrangementCommandTargetsFromSelection();
  if (!targets.length) {
    setStatus("Select a clip slot first", true);
    return false;
  }

  const blockedTargets = targets.filter(arrangementCommandTargetIsLocked);
  const capturableTargets = targets.filter(arrangementCommandTargetCanCapture);
  if (!capturableTargets.length) {
    setStatus(blockedTargets.length ? "Unlock or unfreeze the selected track first" : "Load a source on the selected track first", true);
    return false;
  }

  captureArrangementEdit("Captured selected arrangement slot");
  capturableTargets.forEach(captureArrangementCommandTarget);

  const targetStep = capturableTargets[0]?.stepIndex;
  const captureCount = capturableTargets.length;
  refreshArrangementCommandUi(
    targetStep,
    `${captureCount} clip${captureCount === 1 ? "" : "s"} captured`,
    { selectScene: getSelectedArrangementSceneStep() !== null },
  );
  capturableTargets.forEach((target) => {
    if (target.kind === ARRANGEMENT_CLIP_KINDS.text) {
      selectedTextClipSteps.add(target.stepIndex);
      selectedTextClipStep = target.stepIndex;
    } else if (target.kind === ARRANGEMENT_CLIP_KINDS.drum) {
      selectedDrumClipSteps.add(target.stepIndex);
      selectedDrumClipStep = target.stepIndex;
    } else if (target.trackId) {
      selectedArrangementClipKeys.add(getArrangementClipSelectionKey(target.trackId, target.stepIndex));
    }
  });
  renderArrangementClipSelection();
  return true;
}

function copySelectedArrangementScene() {
  const sceneStep = getSelectedArrangementSceneStep();
  if (sceneStep !== null) {
    const lockedSceneTracks = tracks.filter((track) => track.locked && arrangement?.clips?.[sceneStep]?.[track.id]);
    if (lockedSceneTracks.length) {
      setStatus("Unlock tracks before deleting their scene clips", true);
      return false;
    }

    if (!arrangementStepHasClips(sceneStep)) {
      setStatus("Selected scene is empty", true);
      return false;
    }

    const sourceStep = arrangement.clips?.[sceneStep] || {};
    arrangementClipboardKind = "scene";
    arrangementClipboardStep = sceneStep;
    arrangementClipboardClips = Object.entries(sourceStep)
      .filter(([, clip]) => clip)
      .map(([trackId, clip]) => ({
        trackId,
        trackName: getTrackById(trackId)?.name || trackId,
        stepIndex: sceneStep,
        clip: cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.av, clip),
      }));
    arrangementClipboardTextClip = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.text, getArrangementTextClip(sceneStep));
    arrangementClipboardTextClips = arrangementClipboardTextClip
      ? [{ stepIndex: sceneStep, clip: cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.text, arrangementClipboardTextClip) }]
      : [];
    arrangementClipboardDrumClip = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.drum, getArrangementDrumClip(sceneStep));
    arrangementClipboardDrumClips = arrangementClipboardDrumClip
      ? [{ stepIndex: sceneStep, clip: cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.drum, arrangementClipboardDrumClip) }]
      : [];
    setStatus(`Scene ${sceneStep + 1} copied`);
    return true;
  }

  const commandTargets = getArrangementCommandTargetsFromSelection({ includeSceneTargets: false });
  if (commandTargets.length) {
    const copiedEntries = commandTargets.map(createArrangementClipboardEntry).filter(Boolean);
    if (!copiedEntries.length) {
      setStatus("No selected clip to copy", true);
      return false;
    }

    const copiedKinds = new Set(copiedEntries.map((entry) => entry.kind));
    arrangementClipboardKind = copiedKinds.size === 1
      ? copiedEntries[0].kind === ARRANGEMENT_CLIP_KINDS.av
        ? "clips"
        : copiedEntries[0].kind
      : "clips";
    arrangementClipboardClips = copiedEntries
      .filter((entry) => entry.kind === ARRANGEMENT_CLIP_KINDS.av)
      .map((entry) => ({
        trackId: entry.trackId,
        trackName: entry.trackName,
        stepIndex: entry.stepIndex,
        clip: cloneArrangementClipForKind(entry.kind, entry.clip),
      }));
    arrangementClipboardTextClips = copiedEntries
      .filter((entry) => entry.kind === ARRANGEMENT_CLIP_KINDS.text)
      .map((entry) => ({
        stepIndex: entry.stepIndex,
        clip: cloneArrangementClipForKind(entry.kind, entry.clip),
      }));
    arrangementClipboardTextClip = cloneArrangementClipForKind(
      ARRANGEMENT_CLIP_KINDS.text,
      arrangementClipboardTextClips[0]?.clip,
    );
    arrangementClipboardDrumClips = copiedEntries
      .filter((entry) => entry.kind === ARRANGEMENT_CLIP_KINDS.drum)
      .map((entry) => ({
        stepIndex: entry.stepIndex,
        clip: cloneArrangementClipForKind(entry.kind, entry.clip),
      }));
    arrangementClipboardDrumClip = cloneArrangementClipForKind(
      ARRANGEMENT_CLIP_KINDS.drum,
      arrangementClipboardDrumClips[0]?.clip,
    );
    arrangementClipboardStep = null;
    setStatus(`${copiedEntries.length} clip${copiedEntries.length === 1 ? "" : "s"} copied`);
    return true;
  }

  const selectedTextClips = getSelectedTextClipSteps()
    .map((sourceStep) => ({
      stepIndex: sourceStep,
      clip: getArrangementTextClip(sourceStep),
    }))
    .filter((entry) => entry.clip);
  if (selectedTextClips.length) {
    arrangementClipboardKind = "text";
    arrangementClipboardTextClips = selectedTextClips.map((entry) => ({
      stepIndex: entry.stepIndex,
      clip: cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.text, entry.clip),
    }));
    arrangementClipboardTextClip = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.text, arrangementClipboardTextClips[0]?.clip);
    arrangementClipboardClips = [];
    arrangementClipboardDrumClip = null;
    arrangementClipboardDrumClips = [];
    arrangementClipboardStep = null;
    setStatus(`${selectedTextClips.length} TEXT clip${selectedTextClips.length === 1 ? "" : "s"} copied`);
    return true;
  }

  if (getSelectedTextClipSteps().length) {
      setStatus("No selected text clip to copy", true);
      return false;
  }

  const selectedDrumClips = getSelectedDrumClipSteps()
    .map((sourceStep) => ({
      stepIndex: sourceStep,
      clip: getArrangementDrumClip(sourceStep),
    }))
    .filter((entry) => entry.clip);
  if (selectedDrumClips.length) {
    arrangementClipboardKind = "drum";
    arrangementClipboardDrumClips = selectedDrumClips.map((entry) => ({
      stepIndex: entry.stepIndex,
      clip: cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.drum, entry.clip),
    }));
    arrangementClipboardDrumClip = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.drum, arrangementClipboardDrumClips[0]?.clip);
    arrangementClipboardClips = [];
    arrangementClipboardTextClip = null;
    arrangementClipboardTextClips = [];
    arrangementClipboardStep = null;
    setStatus(`${selectedDrumClips.length} DRUM clip${selectedDrumClips.length === 1 ? "" : "s"} copied`);
    return true;
  }

  if (getSelectedDrumClipSteps().length) {
    setStatus("No selected drum clip to copy", true);
    return false;
  }

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

  arrangementClipboardKind = "clips";
  arrangementClipboardClips = selectedClips.map((entry) => ({
    trackId: entry.trackId,
    trackName: entry.trackName,
    stepIndex: entry.stepIndex,
    clip: cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.av, entry.clip),
  }));
  arrangementClipboardTextClip = null;
  arrangementClipboardTextClips = [];
  arrangementClipboardDrumClip = null;
  arrangementClipboardDrumClips = [];
  arrangementClipboardStep = null;
  setStatus(`${arrangementClipboardClips.length} clip${arrangementClipboardClips.length === 1 ? "" : "s"} copied`);
  return true;
}

function pasteArrangementClipboardToScene(targetStep) {
  const resolvedStep = getArrangementStepIndex(targetStep);
  if (resolvedStep === null) {
    setStatus("Choose a scene first", true);
    return false;
  }

  const hasClipClipboard = arrangementClipboardClips.length > 0;
  const hasTextClipboard = !!arrangementClipboardTextClip || arrangementClipboardKind === "scene";
  const hasDrumClipboard = !!arrangementClipboardDrumClip || arrangementClipboardKind === "scene";
  if (!hasClipClipboard && !hasTextClipboard && !hasDrumClipboard) {
    setStatus("No copied clip or scene", true);
    return false;
  }

  captureArrangementEdit(`Pasted to scene ${resolvedStep + 1}`);
  if (arrangementClipboardKind === "scene") {
    arrangement.clips[resolvedStep] = {};
    arrangementClipboardClips.forEach((source) => {
      arrangement.clips[resolvedStep][source.trackId] = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.av, source.clip);
    });
    if (Array.isArray(arrangement.textClips)) {
      arrangement.textClips[resolvedStep] = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.text, arrangementClipboardTextClip);
    }
    if (Array.isArray(arrangement.drumClips)) {
      arrangement.drumClips[resolvedStep] = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.drum, arrangementClipboardDrumClip);
    }
  } else {
    arrangement.clips[resolvedStep] = arrangement.clips[resolvedStep] || {};
    arrangementClipboardClips.forEach((source) => {
      arrangement.clips[resolvedStep][source.trackId] = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.av, source.clip);
    });
    if ((arrangementClipboardKind === "text" || arrangementClipboardTextClip || arrangementClipboardTextClips.length) && Array.isArray(arrangement.textClips)) {
      arrangement.textClips[resolvedStep] = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.text, arrangementClipboardTextClip);
    }
    if ((arrangementClipboardKind === "drum" || arrangementClipboardDrumClip || arrangementClipboardDrumClips.length) && Array.isArray(arrangement.drumClips)) {
      arrangement.drumClips[resolvedStep] = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.drum, arrangementClipboardDrumClip);
    }
  }

  refreshArrangementCommandUi(resolvedStep, `Pasted to scene ${resolvedStep + 1}`, { selectScene: true });
  return true;
}

function pasteArrangementClipboardToSelectedScene() {
  const sceneStep = getSelectedArrangementSceneStep();
  if (sceneStep !== null) {
    return pasteArrangementClipboardToScene(sceneStep);
  }

  const mixedCommandTargets = getArrangementCommandTargetsFromSelection({ includeSceneTargets: false });
  const mixedKinds = new Set(mixedCommandTargets.map((target) => target.kind));
  if (mixedCommandTargets.length && mixedKinds.size > 1) {
    const unlockedTargets = mixedCommandTargets.filter((target) => !arrangementCommandTargetIsLocked(target));
    if (!unlockedTargets.length) {
      setStatus("Unlock or unfreeze the selected track first", true);
      return false;
    }

    const pastedTargets = [];
    captureArrangementEdit("Pasted copied clips");
    Array.from(mixedKinds).forEach((kind) => {
      const targetsForKind = unlockedTargets.filter((target) => target.kind === kind);
      const entriesForKind = getClipboardEntriesForKind(kind).filter((entry) => entry.clip);
      if (!targetsForKind.length || !entriesForKind.length) {
        return;
      }

      if (kind === ARRANGEMENT_CLIP_KINDS.av && targetsForKind.length === 1 && entriesForKind.length > 1) {
        const targetStep = targetsForKind[0].stepIndex;
        entriesForKind.forEach((entry) => {
          const targetTrackId = getTrackById(entry.trackId) ? entry.trackId : targetsForKind[0].trackId;
          if (setArrangementClipAtTarget(targetTrackId, targetStep, entry.clip)) {
            pastedTargets.push({ ...targetsForKind[0], trackId: targetTrackId, stepIndex: targetStep });
          }
        });
        return;
      }

      if (targetsForKind.length === 1 && entriesForKind.length > 1) {
        const startStep = targetsForKind[0].stepIndex;
        entriesForKind.forEach((entry, index) => {
          const targetStep = getArrangementStepIndex(startStep + index);
          if (targetStep === null) {
            return;
          }
          const target = { ...targetsForKind[0], stepIndex: targetStep };
          if (pasteClipboardEntryToTarget(entry, target)) {
            pastedTargets.push(target);
          }
        });
        return;
      }

      targetsForKind.forEach((target, index) => {
        const entry = entriesForKind[index] || entriesForKind[0];
        if (pasteClipboardEntryToTarget(entry, target)) {
          pastedTargets.push(target);
        }
      });
    });

    if (!pastedTargets.length) {
      arrangementUndoStack.pop();
      setStatus("No matching copied clips for the selected slots", true);
      return false;
    }

    refreshArrangementCommandUi(
      pastedTargets[0].stepIndex,
      `${pastedTargets.length} clip${pastedTargets.length === 1 ? "" : "s"} pasted`,
    );
    renderArrangementClipSelection();
    return true;
  }

  const selectedTextSteps = getSelectedTextClipSteps();
  if (selectedTextSteps.length) {
    const copiedTextClips = arrangementClipboardKind === "scene"
      ? [{ clip: arrangementClipboardTextClip }]
      : arrangementClipboardTextClips.length
        ? arrangementClipboardTextClips
        : arrangementClipboardTextClip
          ? [{ clip: arrangementClipboardTextClip }]
          : [];
    if (!copiedTextClips.length || !copiedTextClips.some((entry) => entry.clip)) {
      setStatus("No copied TEXT clip", true);
      return false;
    }

    captureArrangementEdit("Pasted TEXT clip");
    const pastedSteps = [];
    if (selectedTextSteps.length === 1 && copiedTextClips.length > 1) {
      const startStep = selectedTextSteps[0];
      copiedTextClips.forEach((entry, index) => {
        const targetStep = getArrangementStepIndex(startStep + index);
        if (targetStep === null || !entry.clip) {
          return;
        }
        setArrangementClipAtTarget(TEXT_TRACK_ID, targetStep, entry.clip);
        pastedSteps.push(targetStep);
      });
    } else {
      selectedTextSteps.forEach((targetStep, index) => {
        const entry = copiedTextClips[index] || copiedTextClips[0];
        if (!entry?.clip) {
          return;
        }
        setArrangementClipAtTarget(TEXT_TRACK_ID, targetStep, entry.clip);
        pastedSteps.push(targetStep);
      });
    }

    const firstPastedStep = pastedSteps[0] ?? selectedTextSteps[0];
    refreshArrangementCommandUi(firstPastedStep, `${pastedSteps.length} TEXT clip${pastedSteps.length === 1 ? "" : "s"} pasted`);
    selectedTextClipSteps = new Set(pastedSteps);
    selectedTextClipStep = pastedSteps.at(-1) ?? firstPastedStep;
    renderArrangementClipSelection();
    return true;
  }

  const selectedDrumSteps = getSelectedDrumClipSteps();
  if (selectedDrumSteps.length) {
    const copiedDrumClips = arrangementClipboardKind === "scene"
      ? [{ clip: arrangementClipboardDrumClip }]
      : arrangementClipboardDrumClips.length
        ? arrangementClipboardDrumClips
        : arrangementClipboardDrumClip
          ? [{ clip: arrangementClipboardDrumClip }]
          : [];
    if (!copiedDrumClips.length || !copiedDrumClips.some((entry) => entry.clip)) {
      setStatus("No copied DRUM clip", true);
      return false;
    }

    captureArrangementEdit("Pasted DRUM clip");
    const pastedSteps = [];
    if (selectedDrumSteps.length === 1 && copiedDrumClips.length > 1) {
      const startStep = selectedDrumSteps[0];
      copiedDrumClips.forEach((entry, index) => {
        const targetStep = getArrangementStepIndex(startStep + index);
        if (targetStep === null || !entry.clip) {
          return;
        }
        setArrangementClipAtTarget(DRUM_TRACK_ID, targetStep, entry.clip);
        pastedSteps.push(targetStep);
      });
    } else {
      selectedDrumSteps.forEach((targetStep, index) => {
        const entry = copiedDrumClips[index] || copiedDrumClips[0];
        if (!entry?.clip) {
          return;
        }
        setArrangementClipAtTarget(DRUM_TRACK_ID, targetStep, entry.clip);
        pastedSteps.push(targetStep);
      });
    }

    const firstPastedStep = pastedSteps[0] ?? selectedDrumSteps[0];
    refreshArrangementCommandUi(firstPastedStep, `${pastedSteps.length} DRUM clip${pastedSteps.length === 1 ? "" : "s"} pasted`);
    selectedDrumClipSteps = new Set(pastedSteps);
    selectedDrumClipStep = pastedSteps.at(-1) ?? firstPastedStep;
    renderArrangementClipSelection();
    return true;
  }

  const selectedTargets = getSelectedArrangementClipTargets();
  const targets = selectedTargets.filter(({ track }) => !track.locked && !track.frozen);
  if (!targets.length) {
    if (selectedTargets.length) {
      setStatus("Unlock or unfreeze the selected track first", true);
      return false;
    }
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
      setArrangementClipAtTarget(track.id, stepIndex, source.clip);
    });
  } else if (targets.length === arrangementClipboardClips.length) {
    targets.forEach(({ track, stepIndex }, index) => {
      const source = arrangementClipboardClips[index];
      setArrangementClipAtTarget(track.id, stepIndex, source.clip);
    });
  } else {
    const targetStep = targets[0].stepIndex;
    arrangementClipboardClips.forEach((source) => {
      setArrangementClipAtTarget(source.trackId, targetStep, source.clip);
    });
  }
  refreshArrangementCommandUi(targets[0].stepIndex, "Clip pasted");
  return true;
}

function deleteSelectedArrangementScene() {
  const sceneStep = getSelectedArrangementSceneStep();
  if (sceneStep !== null) {
    if (!arrangementStepHasClips(sceneStep)) {
      setStatus(`Scene ${sceneStep + 1} is already empty`);
      return false;
    }

    captureArrangementEdit(`Deleted scene ${sceneStep + 1}`);
    arrangement.clips[sceneStep] = {};
    if (Array.isArray(arrangement.textClips)) {
      arrangement.textClips[sceneStep] = null;
    }
    if (Array.isArray(arrangement.drumClips)) {
      arrangement.drumClips[sceneStep] = null;
    }
    refreshArrangementCommandUi(sceneStep, `Deleted scene ${sceneStep + 1}`, { selectScene: true });
    return true;
  }

  const commandTargets = getArrangementCommandTargetsFromSelection({ includeSceneTargets: false });
  if (commandTargets.length) {
    const lockedTargets = commandTargets.filter((target) => arrangementCommandTargetIsLocked(target) && target.hasClips);
    if (lockedTargets.length) {
      setStatus("Unlock or unfreeze selected tracks before deleting clips", true);
      return false;
    }

    const filledTargets = commandTargets.filter((target) => target.hasClips);
    if (!filledTargets.length) {
      setStatus("Selected clip slot is already empty");
      return false;
    }

    captureArrangementEdit("Deleted selected clip");
    filledTargets.forEach(deleteArrangementCommandTarget);
    refreshArrangementCommandUi(
      filledTargets[0].stepIndex,
      `${filledTargets.length} clip${filledTargets.length === 1 ? "" : "s"} deleted`,
    );
    renderArrangementClipSelection();
    return true;
  }

  const selectedTextSteps = getSelectedTextClipSteps();
  if (selectedTextSteps.length) {
    const filledTextSteps = selectedTextSteps.filter((stepIndex) => getArrangementTextClip(stepIndex));
    if (!filledTextSteps.length) {
      setStatus("Selected text slot is already empty");
      return false;
    }

    captureArrangementEdit("Deleted selected text");
    filledTextSteps.forEach((stepIndex) => clearArrangementClipAtTarget(TEXT_TRACK_ID, stepIndex));
    selectedTextClipStep = null;
    selectedTextClipSteps = new Set(selectedTextSteps);
    refreshArrangementCommandUi(
      filledTextSteps[0],
      `${filledTextSteps.length} TEXT clip${filledTextSteps.length === 1 ? "" : "s"} deleted`,
    );
    renderArrangementClipSelection();
    return true;
  }

  const selectedDrumSteps = getSelectedDrumClipSteps();
  if (selectedDrumSteps.length) {
    const filledDrumSteps = selectedDrumSteps.filter((stepIndex) => getArrangementDrumClip(stepIndex));
    if (!filledDrumSteps.length) {
      setStatus("Selected drum slot is already empty");
      return false;
    }

    captureArrangementEdit("Deleted selected drums");
    filledDrumSteps.forEach((stepIndex) => clearArrangementClipAtTarget(DRUM_TRACK_ID, stepIndex));
    selectedDrumClipStep = null;
    selectedDrumClipSteps = new Set(selectedDrumSteps);
    refreshArrangementCommandUi(
      filledDrumSteps[0],
      `${filledDrumSteps.length} DRUM clip${filledDrumSteps.length === 1 ? "" : "s"} deleted`,
    );
    renderArrangementClipSelection();
    return true;
  }

  const targets = getSelectedArrangementClipTargets();
  if (!targets.length) {
    setStatus("Choose a clip first", true);
    return false;
  }

  const lockedTargets = targets.filter(({ track, stepIndex }) => track.locked && arrangement?.clips?.[stepIndex]?.[track.id]);
  if (lockedTargets.length) {
    setStatus("Unlock the selected track before deleting clips", true);
    return false;
  }

  const filledTargets = targets.filter(({ track, stepIndex }) => arrangement?.clips?.[stepIndex]?.[track.id]);
  if (!filledTargets.length) {
    setStatus("Selected clip slot is already empty");
    return false;
  }

  captureArrangementEdit("Deleted selected clip");
  filledTargets.forEach(({ track, stepIndex }) => {
    clearArrangementClipAtTarget(track.id, stepIndex);
  });
  refreshArrangementCommandUi(
    filledTargets[0].stepIndex,
    `${filledTargets.length} clip${filledTargets.length === 1 ? "" : "s"} deleted`,
  );
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
  const sourceStep = getArrangementStepIndex(stepIndex);
  if (sourceStep === null) {
    return null;
  }

  if (trackId === "__text") {
    const clip = getArrangementClipAtTarget(TEXT_TRACK_ID, sourceStep);
    return {
      type: "text",
      track: null,
      stepIndex: sourceStep,
      clip,
      contract: getArrangementClipContract(ARRANGEMENT_CLIP_KINDS.text, clip, { stepIndex: sourceStep }),
    };
  }

  if (trackId === "__drums") {
    const clip = getArrangementClipAtTarget(DRUM_TRACK_ID, sourceStep);
    return {
      type: "drum",
      track: null,
      stepIndex: sourceStep,
      clip,
      contract: getArrangementClipContract(ARRANGEMENT_CLIP_KINDS.drum, clip, { stepIndex: sourceStep }),
    };
  }

  const track = getTrackById(trackId);
  if (!track) {
    return null;
  }

  return {
    type: "track",
    track,
    stepIndex: sourceStep,
    clip: getArrangementClipAtTarget(track.id, sourceStep),
    contract: getArrangementClipContract(ARRANGEMENT_CLIP_KINDS.av, getArrangementClipAtTarget(track.id, sourceStep), {
      track,
      stepIndex: sourceStep,
    }),
  };
}

function getArrangementDragCell(target) {
  if (!target) {
    return null;
  }

  if (target.type === "text") {
    return playerPanel?.querySelector(`.arrangement-text-cell[data-arr-step="${target.stepIndex}"]`) || null;
  }

  if (target.type === "drum") {
    return playerPanel?.querySelector(`.arrangement-drum-cell[data-arr-step="${target.stepIndex}"]`) || null;
  }

  return playerPanel?.querySelector(
    `.arrangement-cell[data-arr-track="${target.track.id}"][data-arr-step="${target.stepIndex}"]`,
  ) || null;
}

function beginArrangementClipDragCopy(trackId, stepIndex) {
  const source = getArrangementClipDragTarget(trackId, stepIndex);
  if (!source?.contract?.filled) {
    return false;
  }

  clearArrangementDragState();
  const sourceCell = getArrangementDragCell(source);
  sourceCell?.classList.add("copy-drag-source");
  window.freemixRender?.updateArrangementStepLabels?.();
  const sourceName = source.type === "text" ? "TEXT" : source.type === "drum" ? "DRUM" : source.track.name;
  setStatus(`Dragging ${sourceName} clip; drop on a matching clip slot`);
  return true;
}

function hoverArrangementClipDragTarget(trackId, stepIndex, sourceTrackId = null, sourceStepIndex = null) {
  const target = getArrangementClipDragTarget(trackId, stepIndex);
  if (!target) {
    clearArrangementDragState();
    return false;
  }

  if (sourceTrackId && getArrangementClipDragTarget(sourceTrackId, sourceStepIndex)?.type !== target.type) {
    clearArrangementDragState();
    return false;
  }

  clearArrangementDragState();
  if (sourceTrackId && Number.isFinite(Number(sourceStepIndex))) {
    const source = getArrangementClipDragTarget(sourceTrackId, Number(sourceStepIndex));
    const sourceCell = getArrangementDragCell(source);
    sourceCell?.classList.add("copy-drag-source");
  }

  const targetCell = getArrangementDragCell(target);
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

  if (source.type !== target.type) {
    setStatus("Drop special clips on matching special slots and A/V clips on A/V slots", true);
    return false;
  }

  if (source.type === "text") {
    if (source.stepIndex === target.stepIndex) {
      setStatus("Choose a different TEXT slot");
      return false;
    }

    captureArrangementEdit(`Copied TEXT clip to scene ${target.stepIndex + 1}`);
    setArrangementClipAtTarget(TEXT_TRACK_ID, target.stepIndex, source.clip);
    refreshArrangementHasClipsState();
    selectArrangementStep(target.stepIndex);
    selectArrangementTextClip(target.stepIndex);

    if (window.freemixRender?.updateArrangementTextCell) {
      window.freemixRender.updateArrangementTextCell(target.stepIndex);
      window.freemixRender.updateArrangementPlayhead?.();
      window.freemixRender.updateTextOverlay?.();
      window.freemixRender.updateTextEditor?.();
      window.freemixRender.updateArrangementSceneColorSelector?.();
    } else {
      renderWorkstation();
    }

    setStatus(`TEXT clip copied to scene ${target.stepIndex + 1}`);
    markAppStateDirty();
    return true;
  }

  if (source.type === "drum") {
    if (source.stepIndex === target.stepIndex) {
      setStatus("Choose a different DRUM slot");
      return false;
    }

    captureArrangementEdit(`Copied DRUM clip to scene ${target.stepIndex + 1}`);
    setArrangementClipAtTarget(DRUM_TRACK_ID, target.stepIndex, source.clip);
    refreshArrangementHasClipsState();
    selectArrangementStep(target.stepIndex);
    selectArrangementDrumClip(target.stepIndex);

    if (window.freemixRender?.updateArrangementDrumCell) {
      window.freemixRender.updateArrangementDrumCell(target.stepIndex);
      window.freemixRender.updateArrangementPlayhead?.();
      window.freemixRender.updateDrumEditor?.();
      window.freemixRender.updateArrangementSceneColorSelector?.();
    } else {
      renderWorkstation();
    }

    setStatus(`DRUM clip copied to scene ${target.stepIndex + 1}`);
    markAppStateDirty();
    return true;
  }

  if (source.track.id === target.track.id && source.stepIndex === target.stepIndex) {
    setStatus("Choose a different clip slot");
    return false;
  }

  captureArrangementEdit(`Copied ${source.track.name} clip to scene ${target.stepIndex + 1}`);
  setArrangementClipAtTarget(target.track.id, target.stepIndex, source.clip);
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
  const selectedSceneStep = getSelectedArrangementSceneStep();
  const sourceStepIndex = selectedSceneStep !== null ? selectedSceneStep : arrangement.step;
  const sourceStep = arrangement.clips?.[sourceStepIndex] || {};
  if (!arrangementStepHasClips(sourceStepIndex)) {
    setStatus("Choose a filled source scene first");
    return;
  }

  const destinationSteps = [];
  captureArrangementEdit(`Filled arrangement from scene ${sourceStepIndex + 1}`);
  for (let index = 0; index < arrangement.clips.length; index += 1) {
    if (index === sourceStepIndex) {
      continue;
    }

    const step = arrangement.clips[index];
    if (!step || arrangementStepHasClips(index)) {
      continue;
    }

    arrangement.clips[index] = cloneArrangementStep(sourceStep);
    if (Array.isArray(arrangement.textClips)) {
      arrangement.textClips[index] = cloneArrangementClipForKind(
        ARRANGEMENT_CLIP_KINDS.text,
        arrangement.textClips[sourceStepIndex],
      );
    }
    if (Array.isArray(arrangement.drumClips)) {
      arrangement.drumClips[index] = cloneArrangementClipForKind(
        ARRANGEMENT_CLIP_KINDS.drum,
        arrangement.drumClips[sourceStepIndex],
      );
    }
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
          window.freemixRender.updateArrangementTextCell?.(stepIndex);
          window.freemixRender.updateArrangementDrumCell?.(stepIndex);
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
  arrangementClipboardKind = null;
  arrangementClipboardTextClips = [];
  arrangementClipboardDrumClip = null;
  arrangementClipboardDrumClips = [];
  arrangementDeleteMode = false;
  selectedArrangementClipKeys = new Set();
  selectedTextClipStep = null;
  selectedTextClipSteps = new Set();
  selectedDrumClipStep = null;
  selectedDrumClipSteps = new Set();
  selectedArrangementSceneStep = null;
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

function setArrangementControlsMenuOpen(isOpen) {
  const controlsMenu = getArrangementControlsMenu();
  const controlsButton = getArrangementControlsButton();
  if (!controlsMenu) {
    return;
  }

  controlsMenu.hidden = !isOpen;
  controlsMenu.setAttribute("data-open", String(!!isOpen));
  if (controlsButton) {
    controlsButton.setAttribute("aria-expanded", String(!!isOpen));
    controlsButton.classList.toggle("active", !!isOpen);
  }
}

function openArrangementControlsMenu() {
  setArrangementControlsMenuOpen(true);
}

function closeArrangementControlsMenu() {
  setArrangementControlsMenuOpen(false);
}

function toggleArrangementControlsMenu() {
  const controlsMenu = getArrangementControlsMenu();
  setArrangementControlsMenuOpen(!(controlsMenu?.getAttribute("data-open") === "true" && controlsMenu?.hidden === false));
}

function isArrangementControlsMenuOpen() {
  const controlsMenu = getArrangementControlsMenu();
  return controlsMenu?.getAttribute("data-open") === "true" && controlsMenu?.hidden === false;
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
window.closeArrangementControlsMenu = closeArrangementControlsMenu;
window.openArrangementControlsMenu = openArrangementControlsMenu;
window.toggleArrangementControlsMenu = toggleArrangementControlsMenu;
window.isArrangementControlsMenuOpen = isArrangementControlsMenuOpen;
window.renderArrangementGrid = renderArrangementGrid;
window.renderArrangementGridRows = renderArrangementGridRows;
window.renderArrangementStepLabels = renderArrangementStepLabels;
window.renderArrangementSceneColorSelector = renderArrangementSceneColorSelector;
window.renderTextOverlay = renderTextOverlay;
window.renderTextControlPanel = renderTextControlPanel;
window.renderDrumControlPanel = renderDrumControlPanel;
window.setArrangementSceneColor = setArrangementSceneColor;
window.freemixGetArrangementTextClip = getArrangementTextClip;
window.freemixGetArrangementDrumClip = getArrangementDrumClip;
window.freemixGetDrumBufferDiagnostics = () => ({
  rendered: drumRenderedBuffers?.size || 0,
  expected: DRUM_KITS.length * DRUM_VOICES.length,
  pending: !!drumRenderPromise,
  sampleRate: drumRenderedSampleRate,
});
window.isArrangementTextClipSelected = isArrangementTextClipSelected;
window.isArrangementDrumClipSelected = isArrangementDrumClipSelected;
window.isArrangementSceneSelected = isArrangementSceneSelected;
window.copyCurrentArrangementSectionToAll = copyCurrentArrangementSectionToAll;
window.freemixSyncArrangementTrackHeights = syncArrangementTrackHeights;
window.freemixGetSelectedEditTargetLabel = getSelectedEditTargetLabel;
window.freemixGetSelectedEditTargetModel = getSelectedEditTargetModel;
window.freemixArrangementStepHasClips = arrangementStepHasClips;
window.freemixCanDragCopyArrangementStep = canDragCopyArrangementStep;
window.freemixBeginArrangementClipDragCopy = beginArrangementClipDragCopy;
window.freemixHoverArrangementClipDragTarget = hoverArrangementClipDragTarget;
window.freemixDropArrangementClipDragCopy = dropArrangementClipDragCopy;
window.freemixClearArrangementDragState = clearArrangementDragState;
window.freemixCopySelectedArrangementScene = copySelectedArrangementScene;
window.freemixCaptureSelectedArrangementSlots = captureSelectedArrangementSlots;
window.freemixPasteArrangementClipboardToSelectedScene = pasteArrangementClipboardToSelectedScene;
window.freemixDeleteSelectedArrangementScene = deleteSelectedArrangementScene;
window.freemixSelectAdjacentArrangementStep = selectAdjacentArrangementStep;
window.freemixSelectArrangementStart = selectArrangementStart;
window.freemixUndoArrangementEdit = undoArrangementEdit;
window.freemixRedoArrangementEdit = redoArrangementEdit;
window.freemixReconcileArrangementPlaybackConfidence = reconcileArrangementPlaybackConfidence;
window.freemixToggleSpecialTrackVisibility = toggleSpecialTrackVisibility;

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
  arrangementClipboardKind = null;
  arrangementClipboardTextClips = [];
  arrangementClipboardDrumClip = null;
  arrangementClipboardDrumClips = [];
  arrangementDeleteMode = false;
  selectedArrangementClipKeys = new Set();
  selectedTextClipStep = null;
  selectedTextClipSteps = new Set();
  selectedDrumClipStep = null;
  selectedDrumClipSteps = new Set();
  selectedArrangementSceneStep = null;
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
  if (Array.isArray(previousArrangement?.textClips)) {
    for (let index = 0; index < Math.min(previousArrangement.textClips.length, arrangement.textClips.length); index += 1) {
      arrangement.textClips[index] = cloneArrangementClipForKind(
        ARRANGEMENT_CLIP_KINDS.text,
        previousArrangement.textClips[index],
      );
    }
  }
  if (Array.isArray(previousArrangement?.drumClips)) {
    for (let index = 0; index < Math.min(previousArrangement.drumClips.length, arrangement.drumClips.length); index += 1) {
      arrangement.drumClips[index] = cloneArrangementClipForKind(
        ARRANGEMENT_CLIP_KINDS.drum,
        previousArrangement.drumClips[index],
      );
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
  resetDrumPulseCursor(resolvedStep, barStartAt);
  let activeClipCount = arrangementStepHasText(resolvedStep) ? 1 : 0;
  if (drumClipHasNotes(getArrangementDrumClip(resolvedStep))) {
    activeClipCount += 1;
  }
  tracks.forEach((track) => {
    const clip = getArrangementStepClip(track, resolvedStep);
    const playbackClip = getTrackFrozenBounceState(track, clip) || clip;
    if (!clip || !playbackClip?.source) {
      const video = getTrackVideo(track);
      if (video && typeof video.pause === "function") {
        video.pause();
      }
      setTrackBlackout(track, true);
      setTrackPlaybackPhase(track, PLAYBACK_PHASES.stopped, { mediaStatus: "empty" });
      track.lastStep = -1;
      track.nextTriggerAt = Number.POSITIVE_INFINITY;
      return;
    }

    activeClipCount += 1;
    if (
      track.__lookaheadPrerollFor === transport?.sessionToken &&
      track.__lookaheadPrerollStep === resolvedStep &&
      almostEqual(Number(track.__lookaheadPrerollBarStartAt), barStartAt, 3)
    ) {
      revealArrangementLookaheadPreroll(resolvedStep, barStartAt, transport.sessionToken);
    }
    const lookaheadRevealedPulse = Number(track.__lookaheadRevealedPulse);
    const wasLookaheadRevealed =
      track.__lookaheadRevealedFor === transport?.sessionToken &&
      track.__lookaheadRevealedStep === resolvedStep &&
      almostEqual(Number(track.__lookaheadRevealedBarStartAt), barStartAt, 3);
    const isAtOrAfterBarStart = performance.now() >= barStartAt - 1;
    const isPianoRoll = isPianoRollTimingState(playbackClip);
    const shouldRetriggerNow =
      !!force &&
      !!transport?.active &&
      isAtOrAfterBarStart &&
      !isPianoRoll &&
      Number.isFinite(Number(track.stepMs)) &&
      track.stepMs > 0;
    resetTrackPulseCursor(track, barStartAt, { fireAtReference: !(shouldRetriggerNow || wasLookaheadRevealed) });
    if (isPianoRoll) {
      clearPianoRollGate(track);
      track.nextTriggerAt = Number.POSITIVE_INFINITY;
      track.__lastRetriggerPulse = null;
      track.__pianoRollEventContext = null;
      track.__playedPianoRollEvents = new Set();
      return;
    }
    if (wasLookaheadRevealed) {
      if (Number.isFinite(lookaheadRevealedPulse)) {
        track.__lastRetriggerPulse = lookaheadRevealedPulse;
        track.nextTriggerAt = barStartAt + getTrackTimingNudgeMs(track) + track.stepMs;
      }
      track.__lookaheadRevealedFor = null;
      track.__lookaheadRevealedStep = null;
      track.__lookaheadRevealedBarStartAt = null;
      track.__lookaheadRevealedPulse = null;
      return;
    }
    if (shouldRetriggerNow) {
      track.__lastRetriggerPulse = 0;
      track.nextTriggerAt = barStartAt + getTrackTimingNudgeMs(track) + track.stepMs;
      const eventClip = getRetriggerPlaybackStateForPulse(
        track,
        playbackClip,
        0,
        getTransportBeatsPerBar(transport),
        getTransportBeatMs(transport),
      );
      triggerTrack(track, eventClip, transport.sessionToken);
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
      const hasIntentionalLookaheadPreroll =
        track.__lookaheadPrerollFor === transport?.sessionToken &&
        Number.isFinite(Number(track.__lookaheadPrerollBarStartAt)) &&
        Number(track.__lookaheadPrerollBarStartAt) > performance.now();
      if (!isBlackout) {
        setTrackBlackout(track, true);
        corrected = true;
      }
      if (video && !video.paused && typeof video.pause === "function" && !hasIntentionalLookaheadPreroll) {
        video.pause();
        corrected = true;
      }
      if (track.nextTriggerAt !== Number.POSITIVE_INFINITY) {
        track.nextTriggerAt = Number.POSITIVE_INFINITY;
        corrected = true;
      }
      return;
    }

    if (isBlackout && !track.__awaitingCleanVisualFrame) {
      revealTrackCleanVisual(track);
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
    window.freemixRender?.updateTextOverlay?.();
    window.freemixRender?.updateTextEditor?.();
    window.freemixRender?.updateDrumEditor?.();
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
    window.freemixRender?.updateTextOverlay?.();
    window.freemixRender?.updateTextEditor?.();
    window.freemixRender?.updateDrumEditor?.();
    return;
  }

  renderArrangementPlayhead();
  window.freemixRender?.updateTransportRow?.();
  window.freemixRender?.updateArrangementSceneColorSelector?.();
  window.freemixRender?.updateTextOverlay?.();
  window.freemixRender?.updateTextEditor?.();
  window.freemixRender?.updateDrumEditor?.();
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
  window.freemixRender?.updateTextOverlay?.();
  window.freemixRender?.updateDrumEditor?.();
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
    return Object.values(step).some((clip) => isArrangementClipFilledForKind(ARRANGEMENT_CLIP_KINDS.av, clip));
  }) || (Array.isArray(targetArrangement.textClips) && targetArrangement.textClips.some((clip) => {
    return isArrangementClipFilledForKind(ARRANGEMENT_CLIP_KINDS.text, clip);
  })) || (Array.isArray(targetArrangement.drumClips) && targetArrangement.drumClips.some((clip) => {
    return isArrangementClipFilledForKind(ARRANGEMENT_CLIP_KINDS.drum, clip);
  }));

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
  window.freemixRender.updateArrangementTextCell?.(resolvedStep);
  window.freemixRender.updateArrangementDrumCell?.(resolvedStep);
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
    locked: !!track.locked,
    frozen: false,
    heightMode: Object.prototype.hasOwnProperty.call(TRACK_HEIGHT_MODES, track.heightMode) ? track.heightMode : "normal",
    capturePreset: Object.prototype.hasOwnProperty.call(TRACK_CAPTURE_PRESETS, track.capturePreset) ? track.capturePreset : "current",
    timingNudgeMs: getTrackTimingNudgeMs(track),
    startTime: Number(track.startTime) || 0,
    timingMode: normalizeClipTimingMode(track.timingMode),
    pianoSnap: normalizePianoRollSnap(track.pianoSnap),
    pianoRoot: normalizePianoRootNote(track.pianoRoot),
    retriggersPerBar: normalizeRetriggersPerBar(track.retriggersPerBar),
    notes: normalizePianoRollNotes(track.notes),
    automation: normalizeClipAutomation(track.automation),
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
    version: SESSION_SCHEMA_VERSION,
    clipContractVersion: CLIP_CONTRACT_VERSION,
    app: "freemix-vm-420",
    name: normalizeSessionName(name || getCurrentSessionName() || "Untitled Session"),
    savedAt: new Date().toISOString(),
    state: {
      preferredBpm: resolvePreferredBpm(),
      preferredTimeSignature: resolvePreferredTimeSignature().value,
      metronomeEnabled: !!metronomeEnabled,
      masterMuted: !!masterMuted,
      arrangementStepCount,
      textTrackVisible,
      drumTrackVisible,
      textTrackMuted,
      textTrackSolo,
      drumTrackMuted,
      drumTrackSolo,
    },
    tracks: tracks.map(captureTrackSessionSnapshot),
    arrangement: {
      ...JSON.parse(JSON.stringify(arrangement || createInitialArrangement(arrangementStepCount))),
      clips: JSON.parse(JSON.stringify(arrangement?.clips || [])),
      textClips: JSON.parse(JSON.stringify(arrangement?.textClips || [])),
      drumClips: JSON.parse(JSON.stringify(arrangement?.drumClips || [])),
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
    playbackPhase: PLAYBACK_PHASES.idle,
    mediaStatus: rawTrack?.source ? getTrackMediaStatus(rawTrack, rawTrack.source) : "empty",
    mediaStatusDetails: null,
    audioFxStatus: rawTrack?.source ? "waiting" : "empty",
  };
  normalizeTrackPreferences(track);
  return track;
}

function resolveSessionSnapshotPayload(rawSnapshot) {
  const snapshot = rawSnapshot?.snapshot || rawSnapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  return migrateSessionSnapshot(snapshot);
}

function cloneSessionPayload(payload) {
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return null;
  }
}

function migrateSessionSnapshot(rawSnapshot) {
  const snapshot = cloneSessionPayload(rawSnapshot);
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  let version = Number.isFinite(Number(snapshot.version)) ? Math.floor(Number(snapshot.version)) : 1;
  if (version < 2) {
    migrateSessionV1ToV2(snapshot);
    version = 2;
  }

  snapshot.version = SESSION_SCHEMA_VERSION;
  return snapshot;
}

function migrateSessionV1ToV2(snapshot) {
  snapshot.state = snapshot.state && typeof snapshot.state === "object" && !Array.isArray(snapshot.state)
    ? snapshot.state
    : {};
  const arrangementSource = snapshot.arrangement && typeof snapshot.arrangement === "object" && !Array.isArray(snapshot.arrangement)
    ? snapshot.arrangement
    : {};
  const savedStepCount = Number(snapshot.state.arrangementStepCount);
  const clipStepCount = Array.isArray(arrangementSource.clips) ? arrangementSource.clips.length : null;
  const stepCount = clamp(
    Number.isInteger(savedStepCount)
      ? savedStepCount
      : Number.isInteger(clipStepCount)
        ? clipStepCount
        : DEFAULT_ARRANGEMENT_STEPS,
    MIN_ARRANGEMENT_STEPS,
    MAX_ARRANGEMENT_STEPS,
  );
  snapshot.state.arrangementStepCount = stepCount;
  snapshot.arrangement = {
    ...createInitialArrangement(stepCount),
    ...arrangementSource,
    clips: Array.isArray(arrangementSource.clips) ? arrangementSource.clips.slice(0, stepCount) : [],
    textClips: Array.isArray(arrangementSource.textClips) ? arrangementSource.textClips.slice(0, stepCount) : [],
    drumClips: Array.isArray(arrangementSource.drumClips) ? arrangementSource.drumClips.slice(0, stepCount) : [],
    sceneColors: Array.isArray(arrangementSource.sceneColors) ? arrangementSource.sceneColors.slice(0, stepCount) : [],
  };
  while (snapshot.arrangement.clips.length < stepCount) {
    snapshot.arrangement.clips.push({});
  }
  while (snapshot.arrangement.textClips.length < stepCount) {
    snapshot.arrangement.textClips.push(null);
  }
  while (snapshot.arrangement.drumClips.length < stepCount) {
    snapshot.arrangement.drumClips.push(null);
  }
  while (snapshot.arrangement.sceneColors.length < stepCount) {
    snapshot.arrangement.sceneColors.push(DEFAULT_SCENE_COLOR_INDEX);
  }
  snapshot.tracks = Array.isArray(snapshot.tracks) && snapshot.tracks.length ? snapshot.tracks : [];
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
    tracks.forEach(revokeTrackBounce);
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
  textTrackVisible = snapshot.state?.textTrackVisible !== false;
  drumTrackVisible = snapshot.state?.drumTrackVisible !== false;
  textTrackMuted = !!snapshot.state?.textTrackMuted;
  textTrackSolo = !!snapshot.state?.textTrackSolo;
  drumTrackMuted = !!snapshot.state?.drumTrackMuted;
  drumTrackSolo = !!snapshot.state?.drumTrackSolo;
  appState.textTrackVisible = textTrackVisible;
  appState.drumTrackVisible = drumTrackVisible;
  appState.textTrackMuted = textTrackMuted;
  appState.textTrackSolo = textTrackSolo;
  appState.drumTrackMuted = drumTrackMuted;
  appState.drumTrackSolo = drumTrackSolo;

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
  arrangementClipboardKind = null;
  arrangementClipboardTextClips = [];
  arrangementClipboardDrumClip = null;
  arrangementClipboardDrumClips = [];
  arrangementDeleteMode = false;
  selectedArrangementClipKeys = new Set();
  selectedTextClipStep = null;
  selectedTextClipSteps = new Set();
  selectedDrumClipStep = null;
  selectedDrumClipSteps = new Set();
  selectedArrangementSceneStep = null;

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
  tracks.forEach(revokeTrackBounce);
  tracks.splice(0, tracks.length, ...createInitialTracks(DEFAULT_TRACK_COUNT));
  appState.tracks = tracks;
  refreshTrackLookup();
  appState.preferredBpm = DEFAULT_BPM;
  appState.preferredTimeSignature = DEFAULT_TIME_SIGNATURE;
  metronomeEnabled = true;
  masterMuted = false;
  textTrackVisible = true;
  drumTrackVisible = true;
  textTrackMuted = false;
  textTrackSolo = false;
  drumTrackMuted = false;
  drumTrackSolo = false;
  appState.textTrackVisible = textTrackVisible;
  appState.drumTrackVisible = drumTrackVisible;
  appState.textTrackMuted = textTrackMuted;
  appState.textTrackSolo = textTrackSolo;
  appState.drumTrackMuted = drumTrackMuted;
  appState.drumTrackSolo = drumTrackSolo;
  arrangementStepCount = DEFAULT_ARRANGEMENT_STEPS;
  arrangementClipboardKind = null;
  arrangementClipboardTextClips = [];
  arrangementClipboardDrumClip = null;
  arrangementClipboardDrumClips = [];
  arrangementDeleteMode = false;
  selectedArrangementClipKeys = new Set();
  selectedTextClipStep = null;
  selectedTextClipSteps = new Set();
  selectedDrumClipStep = null;
  selectedDrumClipSteps = new Set();
  selectedArrangementSceneStep = null;
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
  const clip = normalizeClipState({
    source: track.source,
    colorIndex: getArrangementSceneColorIndex(arrangement?.step),
    durationFilter: track.durationFilter,
    startTime: track.startTime,
    timingMode: track.timingMode,
    pianoSnap: normalizePianoRollSnap(track.pianoSnap),
    pianoRoot: normalizePianoRootNote(track.pianoRoot),
    retriggersPerBar: track.retriggersPerBar,
    notes: track.notes,
    automation: track.automation,
    volume: track.volume,
    muted: track.muted,
    blendMode: track.blendMode,
    opacity: track.opacity,
    speed: track.speed,
    pitch: track.pitch,
    fx: { ...track.fx },
  }, track);

  if (track.capturePreset === "dry") {
    clip.fx = normalizeClipFx({});
    clip.blendMode = TRACK_BLEND_DEFAULTS[0];
    clip.opacity = 1;
    clip.speed = 1;
    clip.pitch = 0;
  } else if (track.capturePreset === "muted") {
    clip.muted = true;
  } else if (track.capturePreset === "performance") {
    clip.automation = {};
    clip.notes = [];
    clip.timingMode = CLIP_TIMING_MODES.retrigger;
  }

  return normalizeClipState(clip, track);
}

function cloneArrangementClip(clip) {
  return normalizeClipState(clip);
}

function cloneArrangementStep(step) {
  return Object.fromEntries(
    Object.entries(step).map(([trackId, clip]) => [
      trackId,
      cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.av, clip),
    ]),
  );
}

function cloneTextClip(clip) {
  return normalizeTextClip(cloneArrangementHistoryPayload(clip));
}

function cloneDrumClip(clip) {
  return normalizeDrumClip(cloneArrangementHistoryPayload(clip));
}

function normalizeArrangementClipKind(kind) {
  if (kind === ARRANGEMENT_CLIP_KINDS.text || kind === TEXT_TRACK_ID || kind === "text") {
    return ARRANGEMENT_CLIP_KINDS.text;
  }

  if (kind === ARRANGEMENT_CLIP_KINDS.drum || kind === DRUM_TRACK_ID || kind === "__drums" || kind === "drum") {
    return ARRANGEMENT_CLIP_KINDS.drum;
  }

  return ARRANGEMENT_CLIP_KINDS.av;
}

function getArrangementClipKindLabel(kind) {
  return ARRANGEMENT_CLIP_KIND_LABELS[normalizeArrangementClipKind(kind)] || ARRANGEMENT_CLIP_KIND_LABELS.av;
}

function normalizeArrangementClipForKind(kind, clip, fallback = null) {
  const normalizedKind = normalizeArrangementClipKind(kind);
  if (normalizedKind === ARRANGEMENT_CLIP_KINDS.text) {
    return normalizeTextClip(clip);
  }

  if (normalizedKind === ARRANGEMENT_CLIP_KINDS.drum) {
    return normalizeDrumClip(clip);
  }

  return clip ? normalizeClipState(clip, fallback || {}) : null;
}

function cloneArrangementClipForKind(kind, clip) {
  const normalizedKind = normalizeArrangementClipKind(kind);
  if (normalizedKind === ARRANGEMENT_CLIP_KINDS.text) {
    return cloneTextClip(clip);
  }

  if (normalizedKind === ARRANGEMENT_CLIP_KINDS.drum) {
    return cloneDrumClip(clip);
  }

  return cloneArrangementClip(clip);
}

function isArrangementClipFilledForKind(kind, clip) {
  const normalizedKind = normalizeArrangementClipKind(kind);
  if (normalizedKind === ARRANGEMENT_CLIP_KINDS.text) {
    const textClip = normalizeTextClip(clip);
    return !!textClip?.fields?.some((field) => String(field.text || "").trim());
  }

  if (normalizedKind === ARRANGEMENT_CLIP_KINDS.drum) {
    return drumClipHasNotes(clip);
  }

  const avClip = normalizeClipState(clip || {});
  return !!avClip?.source?.mediaUrl || !!avClip?.source?.url;
}

function getArrangementClipReadinessForKind(kind, clip, options = {}) {
  const normalizedKind = normalizeArrangementClipKind(kind);
  const normalizedClip = normalizeArrangementClipForKind(normalizedKind, clip, options.fallback || null);
  if (!isArrangementClipFilledForKind(normalizedKind, normalizedClip)) {
    return ARRANGEMENT_CLIP_READINESS.empty;
  }

  if (normalizedKind === ARRANGEMENT_CLIP_KINDS.av) {
    if (!normalizedClip?.source?.mediaUrl && !normalizedClip?.source?.url) {
      return ARRANGEMENT_CLIP_READINESS["missing-source"];
    }

    const track = options.track || null;
    if (track?.frozenBounce?.url && track?.frozen) {
      return ARRANGEMENT_CLIP_READINESS.bounced;
    }
  }

  return ARRANGEMENT_CLIP_READINESS.ready;
}

function getArrangementClipContract(kind, clip, options = {}) {
  const normalizedKind = normalizeArrangementClipKind(kind);
  const normalizedClip = normalizeArrangementClipForKind(normalizedKind, clip, options.fallback || null);
  const readiness = getArrangementClipReadinessForKind(normalizedKind, normalizedClip, options);
  return {
    contractVersion: CLIP_CONTRACT_VERSION,
    kind: normalizedKind,
    label: getArrangementClipKindLabel(normalizedKind),
    trackId: options.track?.id || options.trackId || null,
    stepIndex: Number.isInteger(Number(options.stepIndex)) ? Number(options.stepIndex) : null,
    clip: normalizedClip,
    filled: readiness.status !== "empty",
    readiness,
  };
}

function getArrangementClipTargetKind(trackId) {
  if (trackId === TEXT_TRACK_ID) {
    return ARRANGEMENT_CLIP_KINDS.text;
  }

  if (trackId === DRUM_TRACK_ID || trackId === "__drums") {
    return ARRANGEMENT_CLIP_KINDS.drum;
  }

  return ARRANGEMENT_CLIP_KINDS.av;
}

function getArrangementClipAtTarget(trackId, stepIndex) {
  const kind = getArrangementClipTargetKind(trackId);
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return null;
  }

  if (kind === ARRANGEMENT_CLIP_KINDS.text) {
    return getArrangementTextClip(resolvedStep);
  }

  if (kind === ARRANGEMENT_CLIP_KINDS.drum) {
    return getArrangementDrumClip(resolvedStep);
  }

  const track = getTrackById(trackId);
  return track ? getArrangementStepClip(track, resolvedStep) : null;
}

function setArrangementClipAtTarget(trackId, stepIndex, clip) {
  const kind = getArrangementClipTargetKind(trackId);
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return false;
  }

  if (kind === ARRANGEMENT_CLIP_KINDS.text) {
    return setArrangementTextClip(resolvedStep, cloneArrangementClipForKind(kind, clip));
  }

  if (kind === ARRANGEMENT_CLIP_KINDS.drum) {
    return setArrangementDrumClip(resolvedStep, cloneArrangementClipForKind(kind, clip));
  }

  const track = getTrackById(trackId);
  if (!track) {
    return false;
  }

  arrangement.clips[resolvedStep] = arrangement.clips[resolvedStep] || {};
  arrangement.clips[resolvedStep][track.id] = cloneArrangementClipForKind(kind, clip);
  return true;
}

function clearArrangementClipAtTarget(trackId, stepIndex) {
  const kind = getArrangementClipTargetKind(trackId);
  const resolvedStep = getArrangementStepIndex(stepIndex);
  if (resolvedStep === null) {
    return false;
  }

  if (kind === ARRANGEMENT_CLIP_KINDS.text) {
    return setArrangementTextClip(resolvedStep, null);
  }

  if (kind === ARRANGEMENT_CLIP_KINDS.drum) {
    return setArrangementDrumClip(resolvedStep, null);
  }

  const track = getTrackById(trackId);
  if (!track || !arrangement?.clips?.[resolvedStep]) {
    return false;
  }

  delete arrangement.clips[resolvedStep][track.id];
  if (!Object.keys(arrangement.clips[resolvedStep]).length) {
    arrangement.clips[resolvedStep] = {};
  }
  return true;
}

window.freemixClipEngine = {
  version: CLIP_CONTRACT_VERSION,
  kinds: ARRANGEMENT_CLIP_KINDS,
  getContract: getArrangementClipContract,
  getClip: getArrangementClipAtTarget,
  setClip: setArrangementClipAtTarget,
  clearClip: clearArrangementClipAtTarget,
  cloneClip: cloneArrangementClipForKind,
  isFilled: isArrangementClipFilledForKind,
  getReadiness: getArrangementClipReadinessForKind,
};

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
    locked: false,
    frozen: false,
    heightMode: "normal",
    capturePreset: "current",
    timingNudgeMs: 0,
    startTime: 0,
    retriggersPerBar: TRACK_RETRIGGER_DEFAULTS[paletteIndex % TRACK_RETRIGGER_DEFAULTS.length],
    timingMode: DEFAULT_CLIP_TIMING_MODE,
    pianoSnap: DEFAULT_PIANO_ROLL_SNAP,
    pianoRoot: DEFAULT_PIANO_ROOT_NOTE,
    notes: [],
    automation: {},
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

function getNextAvailableTrackIndex() {
  for (let index = 0; index < MAX_TRACK_COUNT; index += 1) {
    if (!TRACK_LOOKUP.has(`track-${index + 1}`)) {
      return index;
    }
  }

  return tracks.length;
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

  const nextTrack = createTrackTemplate(getNextAvailableTrackIndex());
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

function canRemoveTrack() {
  return tracks.length > 1;
}

function trackHasArrangementClips(trackId) {
  return Array.isArray(arrangement?.clips) &&
    arrangement.clips.some((step) => isArrangementClipFilledForKind(ARRANGEMENT_CLIP_KINDS.av, step?.[trackId]));
}

function duplicateTrack(trackOrId) {
  const sourceTrack = typeof trackOrId === "string" ? getTrackById(trackOrId) : trackOrId;
  if (!sourceTrack) {
    return false;
  }

  if (!canAddTrack()) {
    setStatus("Max 4 tracks reached", true);
    return false;
  }

  const nextTrack = createTrackTemplate(getNextAvailableTrackIndex());
  const snapshot = captureTrackSessionSnapshot(sourceTrack);
  Object.assign(nextTrack, JSON.parse(JSON.stringify(snapshot)), {
    id: nextTrack.id,
    name: `${sourceTrack.name || "Track"} Copy`.slice(0, TRACK_NAME_MAX_LENGTH),
    frozen: false,
    frozenBounce: null,
    audio: null,
    searchTimer: null,
    searchRequestId: 0,
    arrangementClip: null,
    lastStep: -1,
    nextTriggerAt: 0,
    stepMs: 0,
    playbackPhase: PLAYBACK_PHASES.idle,
  });
  normalizeTrackPreferences(nextTrack);
  tracks.push(nextTrack);
  refreshTrackLookup();

  if (Array.isArray(arrangement?.clips)) {
    arrangement.clips.forEach((step) => {
      if (step?.[sourceTrack.id]) {
        step[nextTrack.id] = cloneArrangementClipForKind(ARRANGEMENT_CLIP_KINDS.av, step[sourceTrack.id]);
      }
    });
  }

  if (window.freemixTrackSourceCache) {
    window.freemixTrackSourceCache[nextTrack.id] = JSON.parse(JSON.stringify(window.freemixTrackSourceCache[sourceTrack.id] || {}));
  }

  refreshArrangementHasClipsState();
  renderWorkstation();
  markAppStateDirty(true);
  setStatus(`${sourceTrack.name || "Track"} duplicated`);
  return true;
}

function moveTrack(trackOrId, direction) {
  const track = typeof trackOrId === "string" ? getTrackById(trackOrId) : trackOrId;
  const fromIndex = tracks.findIndex((item) => item.id === track?.id);
  const toIndex = fromIndex + Math.sign(Number(direction) || 0);
  if (!track || fromIndex < 0 || toIndex < 0 || toIndex >= tracks.length) {
    return false;
  }

  tracks.splice(fromIndex, 1);
  tracks.splice(toIndex, 0, track);
  refreshTrackLookup();
  renderWorkstation();
  markAppStateDirty(true);
  setStatus(`${track.name}: moved ${toIndex < fromIndex ? "up" : "down"}`);
  return true;
}

function clearTrackLane(trackOrId) {
  const track = typeof trackOrId === "string" ? getTrackById(trackOrId) : trackOrId;
  if (!track) {
    return false;
  }

  if (track.locked) {
    setStatus(`${track.name}: unlock before clearing clips`, true);
    return false;
  }

  if (!trackHasArrangementClips(track.id)) {
    setStatus(`${track.name}: no clips to clear`);
    return false;
  }

  if (window.confirm && !window.confirm(`Clear all arrangement clips on ${track.name || "this track"}?`)) {
    setStatus("Clear lane cancelled");
    return false;
  }

  captureArrangementEdit(`Cleared ${track.name} lane`);
  arrangement.clips.forEach((step) => {
    if (step && typeof step === "object") {
      delete step[track.id];
    }
  });
  selectedArrangementClipKeys = new Set(
    Array.from(selectedArrangementClipKeys).filter((key) => parseArrangementClipSelectionKey(key)?.trackId !== track.id),
  );
  refreshArrangementHasClipsState();
  renderWorkstation();
  markAppStateDirty(true);
  setStatus(`${track.name}: lane cleared`);
  return true;
}

function removeTrack(trackOrId) {
  const track = typeof trackOrId === "string" ? getTrackById(trackOrId) : trackOrId;
  if (!track) {
    return false;
  }

  if (track.locked) {
    setStatus(`${track.name}: unlock before removing`, true);
    return false;
  }

  if (!canRemoveTrack()) {
    setStatus("Keep at least 1 A/V track", true);
    return false;
  }

  const hasWork = !!track.source || trackHasArrangementClips(track.id);
  if (
    hasWork &&
    window.confirm &&
    !window.confirm(`Remove ${track.name || "this track"} and its arrangement clips?`)
  ) {
    setStatus("Track removal cancelled");
    return false;
  }

  if (transport?.active) {
    stopTransport(false);
  }

  resetTrackPlaybackOutput(track);
  disposeTrackAudio(track);
  revokeTrackBounce(track);

  const trackIndex = tracks.findIndex((item) => item.id === track.id);
  if (trackIndex < 0) {
    return false;
  }

  tracks.splice(trackIndex, 1);
  if (Array.isArray(arrangement?.clips)) {
    arrangement.clips.forEach((step) => {
      if (step && typeof step === "object") {
        delete step[track.id];
      }
    });
  }

  selectedArrangementClipKeys = new Set(
    Array.from(selectedArrangementClipKeys).filter((key) => parseArrangementClipSelectionKey(key)?.trackId !== track.id),
  );
  arrangementClipboardClips = arrangementClipboardClips.filter((clip) => clip.trackId !== track.id);
  if ((arrangementClipboardKind === "clips" || arrangementClipboardKind === "scene") && arrangementClipboardClips.length === 0) {
    arrangementClipboardKind = null;
  }
  if (window.freemixTrackSourceCache) {
    delete window.freemixTrackSourceCache[track.id];
  }

  appState.tracks = tracks;
  refreshTrackLookup();
  refreshArrangementHasClipsState();
  renderWorkstation();
  markAppStateDirty(true);
  setStatus(`${track.name || "Track"} removed`);
  return true;
}

function toggleSpecialTrackVisibility(kind) {
  const isTextTrack = kind === "text";
  const isDrumTrack = kind === "drum";
  if (!isTextTrack && !isDrumTrack) {
    return false;
  }

  if (isTextTrack) {
    textTrackVisible = !textTrackVisible;
    appState.textTrackVisible = textTrackVisible;
    if (!textTrackVisible) {
      selectedTextClipStep = null;
      selectedTextClipSteps = new Set();
    }
  }

  if (isDrumTrack) {
    drumTrackVisible = !drumTrackVisible;
    appState.drumTrackVisible = drumTrackVisible;
    if (!drumTrackVisible) {
      selectedDrumClipStep = null;
      selectedDrumClipSteps = new Set();
      resetDrumPulseCursor(arrangement?.step);
    }
  }

  renderWorkstation();
  markAppStateDirty(true);
  setStatus(`${isTextTrack ? "TEXT" : "DRUM"} track ${isTextTrack ? (textTrackVisible ? "shown" : "hidden") : (drumTrackVisible ? "shown" : "hidden")}`);
  return true;
}

window.addTrack = addTrack;
window.canAddTrack = canAddTrack;
window.removeTrack = removeTrack;
window.canRemoveTrack = canRemoveTrack;
window.duplicateTrack = duplicateTrack;
window.moveTrack = moveTrack;
window.clearTrackLane = clearTrackLane;
window.freemixRenameTrack = renameTrack;

function createInitialArrangement(steps = arrangementStepCount) {
  return {
    enabled: false,
    step: 0,
    steps,
    sceneColors: Array.from({ length: steps }, () => DEFAULT_SCENE_COLOR_INDEX),
    clips: Array.from({ length: steps }, () => ({})),
    textClips: Array.from({ length: steps }, () => null),
    drumClips: Array.from({ length: steps }, () => null),
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

window.freemixPlaybackEngine = Object.freeze({
  start: startTransport,
  stop: stopTransport,
  hardStop: hardStopPlayback,
  triggerTrack,
  getActiveEditTarget,
  getClipRetriggerStepMs,
  getClipRetriggerStepBeats,
  getClipPlaybackEvents,
  getRetriggerPlaybackEvents,
  getPianoRollPlaybackEvents,
  createClipEventPlaybackState,
  getRetriggerPlaybackEventForPulse,
  getRetriggerPlaybackStateForPulse,
  applyAutomationAtBeat,
  normalizeClipState,
  normalizeClipTimingMode,
  normalizePianoRollNotes,
  normalizeClipAutomation,
  verifyTrackAudioFxRoute,
});

window.freemixRenderDebugPanel = window.freemixRenderDebugPanel || null;



