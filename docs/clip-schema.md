# Freemix Clip Schema

This document defines the 1.0 clip contracts used by the arrangement. Runtime normalizers remain the final authority in code, but new features should treat these shapes as stable.

## Session envelope

- `version`: current session schema version.
- `app`: `freemix-vm-420`.
- `state`: global session settings such as BPM, time signature, metronome, mute, and arrangement length.
- `tracks`: live A/V track states.
- `arrangement`: scene-by-scene clip data.

## Arrangement

- `enabled`: whether arrangement mode is active.
- `step`: selected or current scene index.
- `steps`: total scene count.
- `clips`: A/V clips by scene, keyed by track id.
- `textClips`: one optional text clip per scene.
- `drumClips`: one optional drum clip per scene.
- `sceneColors`: scene color indices.

## A/V clip

An A/V clip is a snapshot of one track's playable/editable state:

- `source`
- `startTime`
- `retriggersPerBar`
- `volume`
- `muted`
- `solo`
- `blendMode`
- `opacity`
- `speed`
- `pitch`
- `durationFilter`
- `fx`
- `colorIndex`

## Text clip

A text clip stores multiple fields plus the selected field:

- `fields`: array of text fields.
- `selectedFieldId`: selected text field id.

A text field stores:

- `id`
- `text`
- `font`
- `size`
- `color`
- `bold`
- `italic`
- `underline`
- `stroke`
- `strokeWidth`
- `strokeColor`
- `shadow`
- `shadowColor`
- `shadowBlur`
- `shadowX`
- `shadowY`
- `align`
- `x`
- `y`
- `opacity`

## Drum clip

A drum clip stores kit, volume, and velocity pattern:

- `kit`: `808`, `909`, or `707`.
- `volume`: `0..1`.
- `pattern`: object keyed by drum voice id.

Each pattern voice is an array of numeric velocities from `0..1`. `0` is off. Old boolean patterns migrate through normalization, where `true` becomes full velocity and `false` becomes off.

Current drum voice ids:

- `cowbell`
- `crashRide`
- `openHat`
- `closedHat`
- `hiTom`
- `loTom`
- `clap`
- `snare`
- `sidestick`
- `kick`

## Migration rules

- Session snapshots are migrated before hydration.
- Missing arrangement arrays are created to match `arrangementStepCount`.
- Old text clips are normalized by `normalizeTextClip`.
- Old drum boolean patterns are normalized by `normalizeDrumClip`.
- Future schema changes should add explicit `migrateSessionVnToVnPlus1` helpers instead of embedding compatibility assumptions in UI code.
