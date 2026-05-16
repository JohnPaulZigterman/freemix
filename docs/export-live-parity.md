# Export/live playback parity

Export should use the live transport and clip interpretation rather than maintaining a second arrangement engine.

## Export timeline snapshot

`createExportTimelineSnapshot()` defines the export contract for both clip and arrangement export:

- arrangement export starts at scene 1;
- arrangement export length matches the current arrangement bar count;
- clip export renders one bar from the currently selected scene/live state;
- duration is derived from the same BPM and beats-per-bar values used by transport playback;
- playable A/V clips and text clips are detected from the same step indexes that export will render.

## Live engine ownership

The exporter still starts the normal transport, records the canvas stream, and taps the live audio graph. This means scene binding, retrigger behavior, text overlay, drums, and A/V clips continue to be interpreted by the same runtime used during normal playback.

## Future rule

Any future export feature should first extend the timeline snapshot and then let the live playback engine render it. Avoid introducing export-only clip interpretation unless it is a pure preflight check or diagnostic.
