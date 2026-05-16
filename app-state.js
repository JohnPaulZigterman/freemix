(function initFreemixState() {
  const STORAGE_KEY = "freemix.preferences.v2";
  const DEFAULTS = {
    selectedSource: null,
    transport: null,
    audioContext: null,
    webAudioDisabled: false,
    preferredBpm: 92,
    preferredTimeSignature: "4/4",
    masterMuted: false,
    metronomeEnabled: true,
    arrangementStepCount: 8,
    arrangementCopyMode: false,
    arrangementCopySourceStep: null,
    trackCount: 1,
    tracks: null,
    arrangement: null,
    trackSearchRequestCounter: 0,
    userOnboarding: {
      phase: "seed",
      needsHint: true,
    },
  };
  const MIN_ARRANGEMENT_STEPS = 1;
  const MAX_ARRANGEMENT_STEPS = 64;
  const MAX_PERSISTED_TRACKS = 4;
  const PERSISTED_STATE_KEYS = new Set([
    "preferredBpm",
    "preferredTimeSignature",
    "masterMuted",
    "metronomeEnabled",
    "arrangementStepCount",
    "arrangementCopyMode",
    "trackCount",
    "userOnboarding",
  ]);
  const PERSISTED_TRACK_KEYS = new Set([
    "name",
    "showAdvanced",
    "collapsed",
    "muted",
    "volume",
    "startTime",
    "retriggersPerBar",
    "blendMode",
    "opacity",
    "durationFilter",
    "speed",
    "pitch",
  ]);
  const TRACK_PREF_VALID_DURATION_FILTERS = new Set(["any", "quick", "short", "medium", "long"]);
  const TRACK_PREF_VALID_BLEND_MODES = new Set([
    "normal",
    "screen",
    "multiply",
    "add",
    "difference",
    "exclusion",
    "dodge",
    "hard",
  ]);
  const VALID_TIME_SIGNATURES = new Set(["2/4", "3/4", "4/4", "5/4", "6/8", "7/8"]);
  const PERSISTED_STATE_PROXY_KEYS = Object.freeze([
    "preferredBpm",
    "preferredTimeSignature",
    "masterMuted",
    "metronomeEnabled",
    "arrangementStepCount",
    "arrangementCopyMode",
    "trackCount",
    "userOnboarding",
  ]);
  const PERSISTED_TRACK_FAVORITE_KEYS = Object.freeze([
    "name",
    "showAdvanced",
    "collapsed",
    "muted",
    "volume",
    "startTime",
    "retriggersPerBar",
    "blendMode",
    "opacity",
    "durationFilter",
    "speed",
    "pitch",
  ]);

  let rawSavedState = null;
  if (typeof localStorage !== "undefined") {
    try {
      rawSavedState = localStorage.getItem(STORAGE_KEY);
      rawSavedState = rawSavedState ? JSON.parse(rawSavedState) : null;
    } catch {
      rawSavedState = null;
    }
  }

  const saved = isRecord(rawSavedState) ? rawSavedState : {};
  const savedState = sanitizeRecord(saved.state);
  const savedTrackPreferenceState = sanitizeRecord(saved.trackPreferenceState);
  const savedArrangementPreferenceState = sanitizeRecord(saved.arrangementPreferenceState);

  const state = window.freemixState || {};
  const defaultsFromSaved = {
    ...DEFAULTS,
    ...filterObjectKeys(savedState, PERSISTED_STATE_KEYS),
  };

  state.selectedSource = state.selectedSource ?? defaultsFromSaved.selectedSource;
  state.transport = state.transport ?? defaultsFromSaved.transport;
  state.audioContext = state.audioContext ?? defaultsFromSaved.audioContext;
  state.webAudioDisabled = state.webAudioDisabled ?? defaultsFromSaved.webAudioDisabled;
  state.preferredBpm = Number(state.preferredBpm) || Number(defaultsFromSaved.preferredBpm) || 92;
  state.preferredTimeSignature = normalizeTimeSignature(
    state.preferredTimeSignature ?? defaultsFromSaved.preferredTimeSignature,
  );
  state.masterMuted = state.masterMuted ?? defaultsFromSaved.masterMuted;
  state.metronomeEnabled = state.metronomeEnabled ?? defaultsFromSaved.metronomeEnabled;
  state.arrangementStepCount = clamp(
    Number(state.arrangementStepCount) || Number(defaultsFromSaved.arrangementStepCount) || DEFAULTS.arrangementStepCount,
    MIN_ARRANGEMENT_STEPS,
    MAX_ARRANGEMENT_STEPS,
  );
  state.arrangementCopyMode = state.arrangementCopyMode ?? defaultsFromSaved.arrangementCopyMode;
  state.arrangementCopySourceStep = state.arrangementCopySourceStep ?? defaultsFromSaved.arrangementCopySourceStep;
  state.trackCount = clamp(
    Number(state.trackCount) ||
      Number(defaultsFromSaved.trackCount) ||
      inferSavedTrackCount(savedTrackPreferenceState, savedArrangementPreferenceState) ||
      DEFAULTS.trackCount,
    1,
    MAX_PERSISTED_TRACKS,
  );
  state.tracks = state.tracks ?? null;
  state.arrangement = state.arrangement ?? null;
  state.trackSearchRequestCounter = Number(state.trackSearchRequestCounter) || 0;
  state.userOnboarding = sanitizeUserOnboarding(state.userOnboarding ?? defaultsFromSaved.userOnboarding);
  state.trackPreferenceState = state.trackPreferenceState ?? sanitizeTrackPreferenceBuckets(savedTrackPreferenceState);
  state.arrangementPreferenceState = state.arrangementPreferenceState ?? sanitizeArrangementPreferenceState(
    savedArrangementPreferenceState,
  );
  state.trackSourceCache = state.trackSourceCache ?? {};

  const persistableScalarKeys = new Set(PERSISTED_STATE_PROXY_KEYS);
  const persistableTrackKeys = new Set(PERSISTED_TRACK_FAVORITE_KEYS);
  let persistTimer = null;

  function isRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function sanitizeRecord(value) {
    return isRecord(value) ? value : {};
  }

  function filterObjectKeys(value, allowedKeys) {
    const source = sanitizeRecord(value);
    const filtered = {};
    Object.keys(source).forEach((key) => {
      if (allowedKeys.has(key)) {
        filtered[key] = source[key];
      }
    });
    return filtered;
  }

  function sanitizeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return min;
    }
    return Math.min(Math.max(next, min), max);
  }

  function inferTrackIndex(trackId) {
    const match = String(trackId || "").match(/^track-(\d+)$/);
    if (!match) {
      return null;
    }

    const index = Number(match[1]);
    return Number.isInteger(index) && index > 0 ? index : null;
  }

  function inferSavedTrackCount(trackPrefs = {}, arrangementPrefs = {}) {
    let count = 0;

    Object.keys(sanitizeRecord(trackPrefs)).forEach((trackId) => {
      const index = inferTrackIndex(trackId);
      if (index) {
        count = Math.max(count, index);
      }
    });

    sanitizeArrangementClips(arrangementPrefs?.clips).forEach((step) => {
      Object.keys(step).forEach((trackId) => {
        const index = inferTrackIndex(trackId);
        if (index) {
          count = Math.max(count, index);
        }
      });
    });

    return clamp(count || DEFAULTS.trackCount, 1, MAX_PERSISTED_TRACKS);
  }

  function sanitizeUserOnboarding(raw = {}) {
    const base = DEFAULTS.userOnboarding;
    if (!isRecord(raw)) {
      return { ...base };
    }

    return {
      phase: typeof raw.phase === "string" ? raw.phase : base.phase,
      needsHint: typeof raw.needsHint === "boolean" ? raw.needsHint : base.needsHint,
    };
  }

  function sanitizeTrackPreferenceBuckets(raw = {}) {
    return Object.fromEntries(
      Object.entries(raw)
        .filter(([trackId]) => typeof trackId === "string" && trackId.trim().length > 0)
        .map(([trackId, rawTrackPrefs]) => [trackId, sanitizeTrackPreference(rawTrackPrefs)]),
    );
  }

  function sanitizeTrackPreference(raw = {}) {
    const input = sanitizeRecord(raw);
    const snapshot = {};
    for (const key of PERSISTED_TRACK_KEYS) {
      snapshot[key] = null;
    }

    Object.entries(input).forEach(([key, value]) => {
      if (!snapshot.hasOwnProperty(key) && !PERSISTED_TRACK_KEYS.has(key)) {
        return;
      }

      if (key === "showAdvanced" || key === "muted" || key === "collapsed") {
        snapshot[key] = !!value;
        return;
      }

      if (key === "name") {
        const nextName = typeof value === "string" ? value.trim() : "";
        snapshot[key] = nextName.length > 0 ? nextName.slice(0, 48) : null;
        return;
      }

      if (key === "volume" || key === "startTime" || key === "opacity" || key === "speed" || key === "pitch") {
        const limits = {
          volume: [-Infinity, Infinity],
          startTime: [0, Infinity],
          opacity: [0, 1],
          speed: [0.5, 2],
          pitch: [-12, 12],
        }[key];
        snapshot[key] = clamp(sanitizeNumber(value, snapshot[key]), limits[0], limits[1]);
        return;
      }

      if (key === "retriggersPerBar") {
        snapshot[key] = Math.max(1, Math.floor(sanitizeNumber(value, 1)));
        return;
      }

      if (key === "durationFilter") {
        snapshot[key] = TRACK_PREF_VALID_DURATION_FILTERS.has(String(value) || "") ? String(value) : "quick";
        return;
      }

      if (key === "blendMode") {
        snapshot[key] = TRACK_PREF_VALID_BLEND_MODES.has(String(value)) ? String(value) : "normal";
        return;
      }

      if (PERSISTED_TRACK_KEYS.has(key)) {
        snapshot[key] = value;
      }
    });

    return Object.fromEntries(Object.entries(snapshot).filter(([, value]) => value !== null));
  }

  function normalizeTimeSignature(raw) {
    const value = String(raw || "").trim();
    return VALID_TIME_SIGNATURES.has(value) ? value : "4/4";
  }

  function cloneSerializable(value, fallback = null) {
    if (value === null || typeof value === "undefined") {
      return fallback;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }

  function sanitizeArrangementClip(raw = {}) {
    const input = sanitizeRecord(raw);
    const fx = sanitizeRecord(input.fx);
    return {
      source: cloneSerializable(input.source, null),
      colorIndex: clamp(Math.floor(sanitizeNumber(input.colorIndex, 0)), 0, 5),
      durationFilter: TRACK_PREF_VALID_DURATION_FILTERS.has(input.durationFilter) ? input.durationFilter : "quick",
      startTime: Math.max(0, sanitizeNumber(input.startTime, 0)),
      retriggersPerBar: Math.max(1, Math.floor(sanitizeNumber(input.retriggersPerBar, 1))),
      volume: clamp(sanitizeNumber(input.volume, 0.55), 0, 1),
      muted: !!input.muted,
      blendMode: TRACK_PREF_VALID_BLEND_MODES.has(input.blendMode) ? input.blendMode : "normal",
      opacity: clamp(sanitizeNumber(input.opacity, 1), 0, 1),
      speed: clamp(sanitizeNumber(input.speed, 1), 0.5, 2),
      pitch: clamp(sanitizeNumber(input.pitch, 0), -12, 12),
      fx: Object.fromEntries(
        Object.entries(fx)
          .filter(([key]) => typeof key === "string" && key.trim())
          .map(([key, value]) => [key, sanitizeNumber(value, 0)]),
      ),
    };
  }

  function sanitizeArrangementClips(rawClips = []) {
    const clips = Array.isArray(rawClips) ? rawClips : [];
    return clips.map((step) => {
      const inputStep = sanitizeRecord(step);
      return Object.fromEntries(
        Object.entries(inputStep)
          .filter(([trackId, clip]) => typeof trackId === "string" && trackId.trim() && isRecord(clip))
          .map(([trackId, clip]) => [trackId, sanitizeArrangementClip(clip)]),
      );
    });
  }

  function sanitizeSceneColors(rawSceneColors = []) {
    const colors = Array.isArray(rawSceneColors) ? rawSceneColors : [];
    return colors.map((colorIndex) => clamp(Math.floor(sanitizeNumber(colorIndex, 0)), 0, 5));
  }

  function sanitizeArrangementPreferenceState(raw = {}) {
    const input = sanitizeRecord(raw);
    const rawStep = sanitizeNumber(input.step, 0);

    return {
      step: Number.isFinite(rawStep) ? Math.max(0, Math.floor(rawStep)) : 0,
      enabled: !!input.enabled,
      clips: sanitizeArrangementClips(input.clips),
      sceneColors: sanitizeSceneColors(input.sceneColors),
    };
  }

  function hydrateTracks(trackRows) {
    if (!Array.isArray(trackRows) || !state.trackPreferenceState) {
      return;
    }

    trackRows.forEach((track) => {
      const stored = state.trackPreferenceState[track.id] || {};
      if (typeof stored.muted === "boolean") {
        track.muted = stored.muted;
      }

      if (typeof stored.volume === "number") {
        track.volume = stored.volume;
      }

      if (typeof stored.startTime === "number") {
        track.startTime = stored.startTime;
      }

      if (typeof stored.retriggersPerBar === "number") {
        track.retriggersPerBar = stored.retriggersPerBar;
      }

      if (typeof stored.blendMode === "string") {
        track.blendMode = stored.blendMode;
      }

      if (typeof stored.durationFilter === "string") {
        track.durationFilter = stored.durationFilter;
      }

      if (typeof stored.opacity === "number") {
        track.opacity = stored.opacity;
      }

      if (typeof stored.showAdvanced === "boolean") {
        track.showAdvanced = stored.showAdvanced;
      }

      if (typeof stored.collapsed === "boolean") {
        track.collapsed = stored.collapsed;
      }

      if (typeof stored.name === "string" && stored.name.trim()) {
        track.name = stored.name.trim();
      }

      if (typeof stored.speed === "number") {
        track.speed = stored.speed;
      }

      if (typeof stored.pitch === "number") {
        track.pitch = stored.pitch;
      }
    });
  }

  function hydrateArrangement(arrangement) {
    if (!arrangement || !state.arrangementPreferenceState) {
      return;
    }

    if (typeof state.arrangementPreferenceState.step === "number") {
      arrangement.step = state.arrangementPreferenceState.step;
    }

    if (typeof state.arrangementPreferenceState.enabled === "boolean") {
      arrangement.enabled = state.arrangementPreferenceState.enabled;
    }

    if (Array.isArray(state.arrangementPreferenceState.clips) && state.arrangementPreferenceState.clips.length) {
      arrangement.clips = state.arrangementPreferenceState.clips.map((step) => sanitizeRecord(step));
    }

    if (Array.isArray(state.arrangementPreferenceState.sceneColors) && state.arrangementPreferenceState.sceneColors.length) {
      arrangement.sceneColors = state.arrangementPreferenceState.sceneColors.slice();
    }
  }

  function buildTrackSnapshot(trackRows) {
    const rows = Array.isArray(trackRows) ? trackRows : [];
    const snapshot = {};

    rows.forEach((track) => {
      snapshot[track.id] = {
        name: String(track.name || "").trim(),
        showAdvanced: !!track.showAdvanced,
        collapsed: !!track.collapsed,
        muted: !!track.muted,
        volume: Number(track.volume) || 0,
        startTime: Number(track.startTime) || 0,
        retriggersPerBar: Number(track.retriggersPerBar) || 1,
        blendMode: track.blendMode ?? "normal",
        durationFilter: track.durationFilter ?? "quick",
        opacity: Number(track.opacity) || 1,
        speed: Number(track.speed) || 1,
        pitch: Number(track.pitch) || 0,
      };
    });

    return snapshot;
  }

  function getTrackCountSnapshot(trackRows) {
    const count = Array.isArray(trackRows) ? trackRows.length : Number(state.trackCount);
    return clamp(count || DEFAULTS.trackCount, 1, MAX_PERSISTED_TRACKS);
  }

  function persist() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
        const payload = JSON.stringify({
        version: 2,
        state: {
          preferredBpm: Number(state.preferredBpm) || 92,
          preferredTimeSignature: state.preferredTimeSignature || "4/4",
          metronomeEnabled: !!state.metronomeEnabled,
          arrangementStepCount: clamp(
            state.arrangementStepCount || DEFAULTS.arrangementStepCount,
            MIN_ARRANGEMENT_STEPS,
            MAX_ARRANGEMENT_STEPS,
          ),
          masterMuted: !!state.masterMuted,
          arrangementCopyMode: !!state.arrangementCopyMode,
          trackCount: getTrackCountSnapshot(state.tracks),
          userOnboarding: state.userOnboarding,
        },
        trackPreferenceState: buildTrackSnapshot(state.tracks),
        arrangementPreferenceState: {
          step: state.arrangement?.step,
          enabled: !!state.arrangement?.enabled,
          clips: sanitizeArrangementClips(state.arrangement?.clips),
          sceneColors: sanitizeSceneColors(state.arrangement?.sceneColors),
        },
      });
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // LocalStorage unavailable or blocked.
    }
  }

  function queuePersist() {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }

    persistTimer = window.setTimeout(() => {
      persistTimer = null;
      persist();
    }, 90);
  }

  function markStateDirty(trackRows, force) {
    if (trackRows) {
      state.trackPreferenceState = buildTrackSnapshot(trackRows);
      state.trackCount = getTrackCountSnapshot(trackRows);
      if (!force && !Array.isArray(trackRows)) {
        // Skip invalid writes for partial callers.
      }
    }

    if (force) {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      persist();
      return;
    }

    if (!persistTimer) {
      queuePersist();
    }
  }

  const api = {
    persist,
    hydrateTracks,
    hydrateArrangement,
    queuePersist,
    markStateDirty,
    getPreferredTrackCount: () => getTrackCountSnapshot(state.tracks),
    getTrackPreferenceState: () => state.trackPreferenceState,
    getArrangementPreferenceState: () => state.arrangementPreferenceState,
  };

  window.freemixState = state;
  window.freemixStateManager = api;

  [
    "selectedSource",
    "transport",
    "audioContext",
    "webAudioDisabled",
    "preferredBpm",
    "preferredTimeSignature",
    "masterMuted",
    "metronomeEnabled",
    "arrangementStepCount",
    "arrangementCopyMode",
    "arrangementCopySourceStep",
    "trackCount",
    "tracks",
    "arrangement",
    "trackSearchRequestCounter",
  ].forEach((key) => {
    if (Object.getOwnPropertyDescriptor(window, key)) {
      return;
    }

    Object.defineProperty(window, key, {
      configurable: true,
      get() {
        return state[key];
      },
      set(value) {
        state[key] = value;
        if (persistableScalarKeys.has(key)) {
          queuePersist();
        }
      },
    });
  });

  state.__markStateDirty = markStateDirty;
  state.__persistState = persist;
  state.__trackPreferenceKeys = persistableTrackKeys;

  persist();
})();
