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
    videoLayout: "stack",
    trackSearchRequestCounter: 0,
    userOnboarding: {
      phase: "seed",
      needsHint: true,
    },
  };

  let rawSavedState = null;
  if (typeof localStorage !== "undefined") {
    try {
      rawSavedState = localStorage.getItem(STORAGE_KEY);
      rawSavedState = rawSavedState ? JSON.parse(rawSavedState) : null;
    } catch {
      rawSavedState = null;
    }
  }

  const saved = rawSavedState || {};
  const state = window.freemixState || {};
  const defaultsFromSaved = {
    ...DEFAULTS,
    ...saved.state,
  };

  state.selectedSource = state.selectedSource ?? defaultsFromSaved.selectedSource;
  state.transport = state.transport ?? defaultsFromSaved.transport;
  state.audioContext = state.audioContext ?? defaultsFromSaved.audioContext;
  state.webAudioDisabled = state.webAudioDisabled ?? defaultsFromSaved.webAudioDisabled;
  state.preferredBpm = Number(state.preferredBpm) || Number(defaultsFromSaved.preferredBpm) || 92;
  state.masterMuted = state.masterMuted ?? defaultsFromSaved.masterMuted;
  state.arrangementStepCount = state.arrangementStepCount ?? defaultsFromSaved.arrangementStepCount;
  state.arrangementCopyMode = state.arrangementCopyMode ?? defaultsFromSaved.arrangementCopyMode;
  state.arrangementCopySourceStep = state.arrangementCopySourceStep ?? defaultsFromSaved.arrangementCopySourceStep;
  state.tracks = state.tracks ?? null;
  state.arrangement = state.arrangement ?? null;
  state.videoLayout = state.videoLayout ?? defaultsFromSaved.videoLayout;
  state.trackSearchRequestCounter = state.trackSearchRequestCounter ?? 0;
  state.userOnboarding = state.userOnboarding ?? defaultsFromSaved.userOnboarding ?? { ...DEFAULTS.userOnboarding };
  state.trackPreferenceState = state.trackPreferenceState ?? saved.trackPreferenceState ?? {};
  state.arrangementPreferenceState = state.arrangementPreferenceState ?? saved.arrangementPreferenceState ?? {};
  state.trackSourceCache = state.trackSourceCache ?? {};

  const persistableScalarKeys = new Set([
    "preferredBpm",
    "arrangementStepCount",
    "masterMuted",
    "arrangementCopyMode",
    "videoLayout",
    "userOnboarding",
  ]);

  const persistableTrackKeys = new Set([
    "showAdvanced",
    "muted",
    "volume",
    "startTime",
    "retriggersPerBar",
    "blendMode",
    "durationFilter",
  ]);
  let persistTimer = null;

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

      if (typeof stored.showAdvanced === "boolean") {
        track.showAdvanced = stored.showAdvanced;
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
          videoLayout: state.videoLayout || "stack",
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
    "videoLayout",
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
