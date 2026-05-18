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
    textTrackVisible: true,
    drumTrackVisible: true,
    textTrackMuted: false,
    textTrackSolo: false,
    drumTrackMuted: false,
    drumTrackSolo: false,
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
    "textTrackVisible",
    "drumTrackVisible",
    "textTrackMuted",
    "textTrackSolo",
    "drumTrackMuted",
    "drumTrackSolo",
    "trackCount",
    "userOnboarding",
  ]);
  const PERSISTED_TRACK_KEYS = new Set([
    "name",
    "color",
    "showAdvanced",
    "collapsed",
    "locked",
    "frozen",
    "heightMode",
    "capturePreset",
    "timingNudgeMs",
    "muted",
    "solo",
    "volume",
    "startTime",
    "timingMode",
    "pianoSnap",
    "pianoRoot",
    "notes",
    "automation",
    "retriggersPerBar",
    "blendMode",
    "opacity",
    "durationFilter",
    "speed",
    "pitch",
    "fx",
  ]);
  const TRACK_PREF_VALID_DURATION_FILTERS = new Set(["any", "quick", "short", "medium", "long"]);
  const TRACK_PREF_VALID_COLORS = new Set(["green", "amber", "blue", "red"]);
  const TRACK_PREF_VALID_HEIGHT_MODES = new Set(["normal", "compact", "tall"]);
  const TRACK_PREF_VALID_CAPTURE_PRESETS = new Set(["current", "dry", "muted", "performance"]);
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
  const CLIP_STATE_SCHEMA_VERSION = 3;
  const CLIP_VALID_TIMING_MODES = new Set(["retrigger", "pianoRoll"]);
  const CLIP_VALID_PIANO_SNAPS = new Set(["1/4", "1/8", "1/16", "1/32"]);
  const CLIP_AUTOMATION_TARGET_KEYS = new Set([
    "volume",
    "opacity",
    "speed",
    "pitch",
    "blendMode",
    "fx.eqLow",
    "fx.eqMid",
    "fx.eqHigh",
    "fx.tube",
    "fx.delay",
    "fx.reverb",
  ]);
  const DRUM_KITS = new Set(["808", "909", "707"]);
  const DRUM_VOICES = Object.freeze([
    "cowbell",
    "crashRide",
    "openHat",
    "closedHat",
    "hiTom",
    "loTom",
    "clap",
    "snare",
    "sidestick",
    "kick",
  ]);
  const TEXT_ALIGN_OPTIONS = new Set(["left", "center", "right"]);
  const VALID_TIME_SIGNATURES = new Set(["2/4", "3/4", "4/4", "5/4", "6/8", "7/8"]);
  const PERSISTED_STATE_PROXY_KEYS = Object.freeze([
    "preferredBpm",
    "preferredTimeSignature",
    "masterMuted",
    "metronomeEnabled",
    "arrangementStepCount",
    "textTrackVisible",
    "drumTrackVisible",
    "textTrackMuted",
    "textTrackSolo",
    "drumTrackMuted",
    "drumTrackSolo",
    "trackCount",
    "userOnboarding",
  ]);
  const PERSISTED_TRACK_FAVORITE_KEYS = Object.freeze([
    "name",
    "color",
    "showAdvanced",
    "collapsed",
    "locked",
    "frozen",
    "heightMode",
    "capturePreset",
    "timingNudgeMs",
    "muted",
    "solo",
    "volume",
    "startTime",
    "timingMode",
    "pianoSnap",
    "pianoRoot",
    "notes",
    "automation",
    "retriggersPerBar",
    "blendMode",
    "opacity",
    "durationFilter",
    "speed",
    "pitch",
    "fx",
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
  state.textTrackVisible = state.textTrackVisible ?? defaultsFromSaved.textTrackVisible;
  state.drumTrackVisible = state.drumTrackVisible ?? defaultsFromSaved.drumTrackVisible;
  state.textTrackMuted = !!(state.textTrackMuted ?? defaultsFromSaved.textTrackMuted);
  state.textTrackSolo = !!(state.textTrackSolo ?? defaultsFromSaved.textTrackSolo);
  state.drumTrackMuted = !!(state.drumTrackMuted ?? defaultsFromSaved.drumTrackMuted);
  state.drumTrackSolo = !!(state.drumTrackSolo ?? defaultsFromSaved.drumTrackSolo);
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

      if (key === "showAdvanced" || key === "muted" || key === "solo" || key === "collapsed" || key === "locked" || key === "frozen") {
        snapshot[key] = !!value;
        return;
      }

      if (key === "name") {
        const nextName = typeof value === "string" ? value.trim() : "";
        snapshot[key] = nextName.length > 0 ? nextName.slice(0, 48) : null;
        return;
      }

      if (key === "color") {
        snapshot[key] = TRACK_PREF_VALID_COLORS.has(String(value)) ? String(value) : null;
        return;
      }

      if (key === "heightMode") {
        snapshot[key] = TRACK_PREF_VALID_HEIGHT_MODES.has(String(value)) ? String(value) : "normal";
        return;
      }

      if (key === "capturePreset") {
        snapshot[key] = TRACK_PREF_VALID_CAPTURE_PRESETS.has(String(value)) ? String(value) : "current";
        return;
      }

      if (key === "volume" || key === "startTime" || key === "opacity" || key === "speed" || key === "pitch" || key === "timingNudgeMs") {
        const limits = {
          volume: [-Infinity, Infinity],
          startTime: [0, Infinity],
          opacity: [0, 1],
          speed: [0.5, 2],
          pitch: [-12, 12],
          timingNudgeMs: [-250, 250],
        }[key];
        snapshot[key] = clamp(sanitizeNumber(value, snapshot[key]), limits[0], limits[1]);
        return;
      }

      if (key === "retriggersPerBar") {
        snapshot[key] = Math.max(1, Math.floor(sanitizeNumber(value, 1)));
        return;
      }

      if (key === "timingMode") {
        snapshot[key] = CLIP_VALID_TIMING_MODES.has(value) ? value : "retrigger";
        return;
      }

      if (key === "pianoSnap") {
        snapshot[key] = CLIP_VALID_PIANO_SNAPS.has(value) ? value : "1/16";
        return;
      }

      if (key === "pianoRoot") {
        snapshot[key] = typeof value === "string" && value.trim() ? value.trim().slice(0, 8) : "C";
        return;
      }

      if (key === "notes") {
        snapshot[key] = sanitizePianoRollNotes(value);
        return;
      }

      if (key === "automation") {
        snapshot[key] = sanitizeAutomation(value);
        return;
      }

      if (key === "fx") {
        snapshot[key] = sanitizeClipFx(value);
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

  function sanitizeClipFx(rawFx = {}) {
    const fx = sanitizeRecord(rawFx);
    return Object.fromEntries(
      Object.entries(fx)
        .filter(([key]) => typeof key === "string" && key.trim())
        .map(([key, value]) => [key, sanitizeNumber(value, 0)]),
    );
  }

  function sanitizePianoRollNotes(rawNotes = []) {
    const notes = Array.isArray(rawNotes) ? rawNotes : [];
    return notes
      .filter((note) => isRecord(note))
      .map((note, index) => ({
        id: typeof note.id === "string" && note.id ? note.id : `note-${index + 1}`,
        startBeat: clamp(sanitizeNumber(note.startBeat, 0), 0, 512),
        durationBeats: clamp(sanitizeNumber(note.durationBeats, 0.25), 0.0625, 64),
        pitchSemitones: clamp(sanitizeNumber(note.pitchSemitones, 0), -12, 12),
        velocity: clamp(sanitizeNumber(note.velocity, 1), 0, 1),
        anchorOffset: clamp(sanitizeNumber(note.anchorOffset, 0), -120, 120),
      }))
      .sort((a, b) => a.startBeat - b.startBeat || b.pitchSemitones - a.pitchSemitones);
  }

  function sanitizeAutomation(rawAutomation = {}) {
    const automation = sanitizeRecord(rawAutomation);
    return Object.fromEntries(
      Object.entries(automation)
        .filter(([targetKey, envelope]) => CLIP_AUTOMATION_TARGET_KEYS.has(targetKey) && isRecord(envelope))
        .map(([targetKey, envelope]) => [
          targetKey,
          {
            enabled: envelope.enabled !== false,
            interpolation: envelope.interpolation === "hold" ? "hold" : "linear",
            points: (Array.isArray(envelope.points) ? envelope.points : [])
              .filter((point) => isRecord(point))
              .map((point, index) => ({
                id: typeof point.id === "string" && point.id ? point.id : `${targetKey}-point-${index + 1}`,
                beat: clamp(sanitizeNumber(point.beat, 0), 0, 512),
                value: typeof point.value === "string" ? point.value : sanitizeNumber(point.value, 0),
              }))
              .sort((a, b) => a.beat - b.beat),
          },
        ]),
    );
  }

  function sanitizeTextField(rawField = {}, index = 0) {
    const field = sanitizeRecord(rawField);
    return {
      id: typeof field.id === "string" && field.id ? field.id : `text-field-${index + 1}`,
      text: typeof field.text === "string" ? field.text.slice(0, 240) : "",
      font: typeof field.font === "string" && field.font ? field.font : "Impact, Haettenschweiler, 'Arial Black', sans-serif",
      size: clamp(sanitizeNumber(field.size, 28), 10, 72),
      color: typeof field.color === "string" && field.color ? field.color : "#f4f1df",
      bold: typeof field.bold === "boolean" ? field.bold : true,
      italic: !!field.italic,
      underline: !!field.underline,
      stroke: typeof field.stroke === "boolean" ? field.stroke : true,
      strokeWidth: clamp(sanitizeNumber(field.strokeWidth, 2), 0, 8),
      strokeColor: typeof field.strokeColor === "string" && field.strokeColor ? field.strokeColor : "#050607",
      shadow: typeof field.shadow === "boolean" ? field.shadow : true,
      shadowColor: typeof field.shadowColor === "string" && field.shadowColor ? field.shadowColor : "#000000",
      shadowBlur: clamp(sanitizeNumber(field.shadowBlur, 8), 0, 24),
      shadowX: clamp(sanitizeNumber(field.shadowX, 3), -24, 24),
      shadowY: clamp(sanitizeNumber(field.shadowY, 3), -24, 24),
      align: TEXT_ALIGN_OPTIONS.has(field.align) ? field.align : "center",
      x: clamp(sanitizeNumber(field.x, 50), 0, 100),
      y: clamp(sanitizeNumber(field.y, 50), 0, 100),
      opacity: clamp(sanitizeNumber(field.opacity, 1), 0, 1),
    };
  }

  function sanitizeTextClip(rawClip = null) {
    if (!isRecord(rawClip)) {
      return null;
    }

    const rawFields = Array.isArray(rawClip.fields)
      ? rawClip.fields
      : typeof rawClip.text === "string"
        ? [{ ...rawClip, id: "text-field-1" }]
        : [];
    const fields = rawFields
      .map(sanitizeTextField)
      .filter((field) => field.text || rawFields.length === 1);
    if (!fields.length) {
      return null;
    }

    return {
      fields,
      selectedFieldId: fields.some((field) => field.id === rawClip.selectedFieldId)
        ? rawClip.selectedFieldId
        : fields[0].id,
    };
  }

  function sanitizeDrumVelocity(value) {
    if (value === true) {
      return 1;
    }

    return clamp(sanitizeNumber(value, 0), 0, 1);
  }

  function sanitizeDrumPattern(rawPattern = {}, stepCount = 16) {
    const pattern = sanitizeRecord(rawPattern);
    const steps = Math.max(1, Math.floor(sanitizeNumber(stepCount, 16)));
    return Object.fromEntries(
      DRUM_VOICES.map((voice) => {
        const rawSteps = Array.isArray(pattern[voice]) ? pattern[voice] : [];
        return [voice, Array.from({ length: steps }, (_, index) => sanitizeDrumVelocity(rawSteps[index]))];
      }),
    );
  }

  function sanitizeDrumClip(rawClip = null, stepCount = 16) {
    if (!isRecord(rawClip)) {
      return null;
    }

    return {
      kit: DRUM_KITS.has(rawClip.kit) ? rawClip.kit : "808",
      volume: clamp(sanitizeNumber(rawClip.volume, 0.8), 0, 1),
      pattern: sanitizeDrumPattern(rawClip.pattern, stepCount),
    };
  }

  function sanitizeArrangementClip(raw = {}) {
    const input = sanitizeRecord(raw);
    return {
      schemaVersion: CLIP_STATE_SCHEMA_VERSION,
      source: cloneSerializable(input.source, null),
      colorIndex: clamp(Math.floor(sanitizeNumber(input.colorIndex, 0)), 0, 5),
      durationFilter: TRACK_PREF_VALID_DURATION_FILTERS.has(input.durationFilter) ? input.durationFilter : "quick",
      startTime: Math.max(0, sanitizeNumber(input.startTime, 0)),
      timingMode: CLIP_VALID_TIMING_MODES.has(input.timingMode) ? input.timingMode : "retrigger",
      pianoSnap: CLIP_VALID_PIANO_SNAPS.has(input.pianoSnap) ? input.pianoSnap : "1/16",
      pianoRoot: typeof input.pianoRoot === "string" && input.pianoRoot ? input.pianoRoot : "C",
      retriggersPerBar: Math.max(1, Math.floor(sanitizeNumber(input.retriggersPerBar, 1))),
      notes: sanitizePianoRollNotes(input.notes),
      automation: sanitizeAutomation(input.automation),
      volume: clamp(sanitizeNumber(input.volume, 0.55), 0, 1),
      muted: !!input.muted,
      blendMode: TRACK_PREF_VALID_BLEND_MODES.has(input.blendMode) ? input.blendMode : "normal",
      opacity: clamp(sanitizeNumber(input.opacity, 1), 0, 1),
      speed: clamp(sanitizeNumber(input.speed, 1), 0.5, 2),
      pitch: clamp(sanitizeNumber(input.pitch, 0), -12, 12),
      fx: sanitizeClipFx(input.fx),
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
    const textClips = Array.isArray(input.textClips) ? input.textClips.map(sanitizeTextClip) : [];
    const drumClips = Array.isArray(input.drumClips)
      ? input.drumClips.map((clip) => sanitizeDrumClip(clip, 16))
      : [];

    return {
      step: Number.isFinite(rawStep) ? Math.max(0, Math.floor(rawStep)) : 0,
      enabled: !!input.enabled,
      clips: sanitizeArrangementClips(input.clips),
      textClips,
      drumClips,
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

      if (typeof stored.solo === "boolean") {
        track.solo = stored.solo;
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

      if (typeof stored.timingMode === "string") {
        track.timingMode = stored.timingMode;
      }

      if (typeof stored.pianoSnap === "string") {
        track.pianoSnap = stored.pianoSnap;
      }

      if (typeof stored.pianoRoot === "string") {
        track.pianoRoot = stored.pianoRoot;
      }

      if (Array.isArray(stored.notes)) {
        track.notes = sanitizePianoRollNotes(stored.notes);
      }

      if (isRecord(stored.automation)) {
        track.automation = sanitizeAutomation(stored.automation);
      }

      if (isRecord(stored.fx)) {
        track.fx = sanitizeClipFx(stored.fx);
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

      if (typeof stored.locked === "boolean") {
        track.locked = stored.locked;
      }

      if (typeof stored.frozen === "boolean") {
        track.frozen = stored.frozen;
      }

      if (typeof stored.color === "string" && TRACK_PREF_VALID_COLORS.has(stored.color)) {
        track.color = stored.color;
      }

      if (typeof stored.heightMode === "string" && TRACK_PREF_VALID_HEIGHT_MODES.has(stored.heightMode)) {
        track.heightMode = stored.heightMode;
      }

      if (typeof stored.capturePreset === "string" && TRACK_PREF_VALID_CAPTURE_PRESETS.has(stored.capturePreset)) {
        track.capturePreset = stored.capturePreset;
      }

      if (typeof stored.timingNudgeMs === "number") {
        track.timingNudgeMs = stored.timingNudgeMs;
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

    if (Array.isArray(state.arrangementPreferenceState.textClips) && state.arrangementPreferenceState.textClips.length) {
      arrangement.textClips = state.arrangementPreferenceState.textClips.map(sanitizeTextClip);
    }

    if (Array.isArray(state.arrangementPreferenceState.drumClips) && state.arrangementPreferenceState.drumClips.length) {
      arrangement.drumClips = state.arrangementPreferenceState.drumClips.map((clip) => sanitizeDrumClip(clip, 16));
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
        color: track.color || "green",
        showAdvanced: !!track.showAdvanced,
        collapsed: !!track.collapsed,
        locked: !!track.locked,
        frozen: false,
        heightMode: track.heightMode || "normal",
        capturePreset: track.capturePreset || "current",
        timingNudgeMs: Number(track.timingNudgeMs) || 0,
        muted: !!track.muted,
        solo: !!track.solo,
        volume: Number(track.volume) || 0,
        startTime: Number(track.startTime) || 0,
        timingMode: CLIP_VALID_TIMING_MODES.has(track.timingMode) ? track.timingMode : "retrigger",
        pianoSnap: CLIP_VALID_PIANO_SNAPS.has(track.pianoSnap) ? track.pianoSnap : "1/16",
        pianoRoot: typeof track.pianoRoot === "string" && track.pianoRoot ? track.pianoRoot : "C",
        notes: sanitizePianoRollNotes(track.notes),
        automation: sanitizeAutomation(track.automation),
        retriggersPerBar: Number(track.retriggersPerBar) || 1,
        blendMode: track.blendMode ?? "normal",
        durationFilter: track.durationFilter ?? "quick",
        opacity: Number(track.opacity) || 1,
        speed: Number(track.speed) || 1,
        pitch: Number(track.pitch) || 0,
        fx: sanitizeClipFx(track.fx),
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
          textTrackVisible: state.textTrackVisible !== false,
          drumTrackVisible: state.drumTrackVisible !== false,
          textTrackMuted: !!state.textTrackMuted,
          textTrackSolo: !!state.textTrackSolo,
          drumTrackMuted: !!state.drumTrackMuted,
          drumTrackSolo: !!state.drumTrackSolo,
          masterMuted: !!state.masterMuted,
          trackCount: getTrackCountSnapshot(state.tracks),
          userOnboarding: state.userOnboarding,
        },
        trackPreferenceState: buildTrackSnapshot(state.tracks),
        arrangementPreferenceState: {
          step: state.arrangement?.step,
          enabled: !!state.arrangement?.enabled,
          clips: sanitizeArrangementClips(state.arrangement?.clips),
          textClips: Array.isArray(state.arrangement?.textClips) ? state.arrangement.textClips.map(sanitizeTextClip) : [],
          drumClips: Array.isArray(state.arrangement?.drumClips)
            ? state.arrangement.drumClips.map((clip) => sanitizeDrumClip(clip, 16))
            : [],
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
    "textTrackVisible",
    "drumTrackVisible",
    "textTrackMuted",
    "textTrackSolo",
    "drumTrackMuted",
    "drumTrackSolo",
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
