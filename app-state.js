(function initFreemixState() {
  const STORAGE_KEY = "freemix.preferences.v2";
  const DEFAULTS = {
    selectedSource: null,
    transport: null,
    audioContext: null,
    webAudioDisabled: false,
    preferredBpm: 92,
    masterMuted: false,
    arrangementStepCount: 8,
    arrangementCopyMode: false,
    arrangementCopySourceStep: null,
    tracks: null,
    arrangement: null,
    trackSearchRequestCounter: 0,
    userOnboarding: {
      phase: "seed",
      needsHint: true,
    },
  };
  const PERSISTED_STATE_KEYS = new Set([
    "preferredBpm",
    "masterMuted",
    "arrangementStepCount",
    "arrangementCopyMode",
    "userOnboarding",
  ]);
  const PERSISTED_TRACK_KEYS = new Set([
    "showAdvanced",
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
  const PERSISTED_STATE_PROXY_KEYS = Object.freeze([
    "preferredBpm",
    "masterMuted",
    "arrangementStepCount",
    "arrangementCopyMode",
    "userOnboarding",
  ]);
  const PERSISTED_TRACK_FAVORITE_KEYS = Object.freeze([
    "showAdvanced",
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
  state.masterMuted = state.masterMuted ?? defaultsFromSaved.masterMuted;
  state.arrangementStepCount = Number(state.arrangementStepCount) || Number(defaultsFromSaved.arrangementStepCount) || 8;
  state.arrangementCopyMode = state.arrangementCopyMode ?? defaultsFromSaved.arrangementCopyMode;
  state.arrangementCopySourceStep = state.arrangementCopySourceStep ?? defaultsFromSaved.arrangementCopySourceStep;
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

      if (key === "showAdvanced" || key === "muted") {
        snapshot[key] = !!value;
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

  function sanitizeArrangementPreferenceState(raw = {}) {
    const input = sanitizeRecord(raw);
    return {
      step: sanitizeNumber(input.step, 0),
      enabled: !!input.enabled,
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
  }

  function buildTrackSnapshot(trackRows) {
    const rows = Array.isArray(trackRows) ? trackRows : [];
    const snapshot = {};

    rows.forEach((track) => {
      snapshot[track.id] = {
        showAdvanced: !!track.showAdvanced,
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

  function persist() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
        const payload = JSON.stringify({
        version: 2,
        state: {
          preferredBpm: Number(state.preferredBpm) || 92,
          arrangementStepCount: state.arrangementStepCount || 8,
          masterMuted: !!state.masterMuted,
          arrangementCopyMode: !!state.arrangementCopyMode,
          userOnboarding: state.userOnboarding,
        },
        trackPreferenceState: buildTrackSnapshot(state.tracks),
        arrangementPreferenceState: {
          step: state.arrangement?.step,
          enabled: !!state.arrangement?.enabled,
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
      if (!force && !Array.isArray(trackRows)) {
        // Skip invalid writes for partial callers.
      }
    }

    if (force || !persistTimer) {
      queuePersist();
    }
  }

  const api = {
    persist,
    hydrateTracks,
    hydrateArrangement,
    queuePersist,
    markStateDirty,
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
    "masterMuted",
    "arrangementStepCount",
    "arrangementCopyMode",
    "arrangementCopySourceStep",
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
