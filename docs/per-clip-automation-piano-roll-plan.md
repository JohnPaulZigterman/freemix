# Per-clip automation and piano-roll timing plan

## Goal

Give every A/V clip two complementary ways to perform:

- Retrigger mode: the current beat-grid retrigger behavior, kept fast and immediate.
- Piano-roll mode: notes determine when the clip fires, how long it plays, and what pitch offset it uses.

Add per-clip automation envelopes so users can draw or record changes to FX, opacity, volume, speed, pitch, anchor, blend, and other clip-owned controls over the clip's bar span.

The core rule stays the same: a clip is a complete, persistent, malleable performance object. Selecting a clip must reveal its timing mode, notes, envelopes, source, anchor, density, FX, color, text/drums where applicable, and all saved settings.

## Design principles

- Do not weaken current retrigger behavior.
- Piano roll timing must use the same deterministic transport clock as retrigger and metronome.
- Automation must be stored inside the clip, not globally.
- Playback and export must read the same clip timeline.
- Empty clips remain silence/black.
- The first implementation should favor reliability over maximal editing depth.

## Data model

Extend normalized A/V clip state with a timing mode:

```js
{
  timingMode: "retrigger" | "pianoRoll",
  pianoSnap: "1/4" | "1/8" | "1/16" | "triplet",
  pianoRoot: "C",
  retriggersPerBar: 4,
  notes: [],
  automation: {}
}
```

### Piano-roll note shape

```js
{
  id: "note-id",
  startBeat: 0,
  durationBeats: 0.25,
  pitchSemitones: 0,
  velocity: 1,
  anchorOffset: 0
}
```

Initial limits:

- `startBeat`: position inside the clip scene, in beats.
- `durationBeats`: note length in beats.
- `pitchSemitones`: relative pitch from the clip root.
- `velocity`: 0 to 1, mapped to clip gain.
- `anchorOffset`: optional seconds added to the clip anchor for that note.

### Automation envelope shape

```js
{
  automation: {
    volume: {
      enabled: true,
      interpolation: "linear",
      points: [
        { beat: 0, value: 0.8 },
        { beat: 2, value: 1 }
      ]
    },
    "fx.delay": {
      enabled: true,
      interpolation: "linear",
      points: []
    }
  }
}
```

Supported v1 targets:

- `volume`
- `opacity`
- `speed`
- `pitch`
- `startTime`
- `blendMode`
- `fx.eqLow`
- `fx.eqMid`
- `fx.eqHigh`
- `fx.tube`
- `fx.delay`
- `fx.reverb`

## UI plan

### Clip timing mode switch

Add a small mode switch in each A/V track control panel:

- `Retrigger`
- `Piano Roll`

When `Retrigger` is active, show the existing density controls.

When `Piano Roll` is active, show a compact note editor in the same track control area.

### Piano-roll editor

The v1 editor should be intentionally small and fast:

- Horizontal axis: clip time in beats/bars.
- Vertical axis: pitch rows, centered on root pitch.
- Click empty cell: add note.
- Drag note horizontally: move timing.
- Drag note vertically: change pitch.
- Drag right edge: change duration.
- Delete selected note: remove.
- Velocity lane: optional simple vertical fill or small slider for selected note.
- Snap menu: 1/4, 1/8, 1/16, triplet.

Recommended initial range:

- 25 pitch rows: -12 to +12 semitones.
- Scene length follows the arrangement bar count and time signature.

### Automation editor

Add an `Automation` tab or collapsible module for selected A/V clips:

- Target selector.
- Enable/bypass envelope button.
- Reset envelope button.
- Lane editor with draggable points.
- Add point by clicking.
- Delete selected point.
- Interpolation toggle: `Hold` / `Linear`.

V1 can use one visible automation lane at a time, with the target chosen from a menu. This keeps the interface from becoming dense too early.

## Playback architecture

### One clip timing scheduler

Create one clip scheduler that resolves clip events for both timing modes:

```js
function getClipPlaybackEvents(clip, sceneStartBeat, sceneLengthBeats) {
  if (clip.timingMode === "pianoRoll") {
    return getPianoRollEvents(clip, sceneStartBeat, sceneLengthBeats);
  }
  return getRetriggerEvents(clip, sceneStartBeat, sceneLengthBeats);
}
```

Each event should become:

```js
{
  beat,
  timeMs,
  trackId,
  clip,
  sourceUrl,
  startTime,
  durationMs,
  pitchSemitones,
  speed,
  velocity
}
```

Retrigger mode should simply become generated note-like events. That makes export, playback, and future editing much easier.

### Transport scheduling

The scheduler should:

- Use absolute transport time, not accumulated timeouts.
- Schedule a short lookahead window.
- Trigger events from the same beat clock as the metronome.
- Reset cleanly on play, stop, scene jump, clip selection, and export.

### Piano-roll playback behavior

V1 should be monophonic per A/V track:

- If a new note starts while the previous note is still playing, retrigger to the new note.
- This avoids multiple video decoders per track.
- It is more reliable and easier to reason about.

Future version:

- Optional polyphonic audio-only sampler layer for pitched chords.
- Visual output can remain monophonic while audio can become polyphonic if needed.

### Pitch behavior

V1 should map note pitch to playback rate:

```js
playbackRate = clip.speed * Math.pow(2, pitchSemitones / 12);
```

This gives intuitive sample-style pitch changes. Later, if we need independent time-stretch pitch, that should be a separate high-cost feature.

## Automation evaluation

At any transport beat, resolve clip controls like this:

```js
const baseState = getClipBaseState(clip);
const automatedState = applyAutomationAtBeat(baseState, clip.automation, localBeat);
```

Rules:

- Automation is evaluated in local clip beats.
- Automation values should clamp to each target's legal range.
- Disabled envelopes do nothing.
- Missing envelopes do nothing.
- Hold interpolation keeps the previous point value.
- Linear interpolation blends between surrounding points.

Playback and export must call the same automation resolver.

## Export architecture

Export should not have a separate interpretation of clips.

Export should consume:

- `getClipPlaybackEvents`
- `applyAutomationAtBeat`
- the same text/drum event generation already used for playback

Acceptance rule:

If the live transport plays a note or automation move at beat X, the export must render the same note or automation move at beat X.

## Session compatibility

Existing clips should hydrate as:

```js
timingMode: "retrigger",
notes: [],
automation: {}
```

No older session should break or silently change behavior.

## Rollout phases

### Phase 1: Data model and compatibility

- [x] Add `timingMode`, `notes`, and `automation` to normalized clips.
- [x] Hydrate older sessions safely.
- [x] Save/load the new fields through existing clip/session snapshots.
- [x] Add defensive validation for malformed notes and envelopes.
- [x] Add first shared event-generation helpers for retrigger and piano-roll timing.
- [x] Add first automation-at-beat resolver.

### Phase 2: Unified clip event scheduler

- [x] Convert existing retrigger behavior into generated clip events.
- [x] Keep visible behavior identical.
- [x] Route live playback and export through the same event generator.
- [x] Add smoke coverage for retrigger events.

### Phase 3: Piano-roll playback core

- [x] Add `Piano Roll` timing mode.
- [x] Add simple note data creation via debug/helper path first.
- [x] Make piano-roll clips trigger video/audio at exact note beats.
- [x] Support pitch via playback rate.
- [x] Keep per-track playback monophonic.

### Phase 4: Piano-roll editor UI

- [x] Build compact note grid.
- [x] Add note create, move, resize, delete.
- [x] Add initial click-to-add/click-selected-to-remove note editing.
- [x] Add snap setting.
- [x] Add selected-note velocity control.
- [x] Reflect selected clip state immediately.

### Phase 5: Automation engine

- [x] Add automation resolver.
- [x] Support hold and linear interpolation.
- [x] Apply automation to live playback controls.
- [x] Apply automation to export rendering.

### Phase 6: Automation editor UI

- [x] Add automation target selector.
- [x] Add one-lane point editor.
- [x] Add enable, reset, and interpolation controls.
- [x] Add visual feedback for clips that contain automation.

### Phase 7: Validation

- Extend smoke test for:
  - [x] old sessions hydrate as retrigger clips
  - [x] piano-roll note events fire on expected beats
  - [x] automation resolves expected values
  - export includes piano-roll timing
  - export includes automation changes

### Phase 8: Polish

- [x] Clip badge for `Retrigger` vs `Piano`.
- [x] Automation indicator on clips.
- [x] Optional root pitch setting.
- [x] Optional note preview/audition.
- [x] Optional duplicate notes and quantize commands.

## Open choices before implementation

- Should piano roll use semitone rows only, or named note rows like C, C#, D?
- Should the user set a root note per clip?
- Should note duration control video gate length, audio gate length, or both?
- Should pitch affect video speed visibly, or only audio pitch in a later audio-buffer mode?

## Recommended v1 decisions

- Use semitone rows first.
- Add a simple root label later.
- Let note duration gate both audio and video.
- Let pitch affect playback rate for both audio and video.
- Keep one active note per A/V track.
- Ship automation with one visible lane at a time.
