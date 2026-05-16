# Transport stop/start contract

Freemix transport should have one boring rule: start prepares media and timing, while stop kills all audible/visible output.

## Start

- `startTransport()` owns a boot token so stale async start work cannot activate old playback.
- Track media is primed before `startTransportWithState()` makes the transport active.
- Arrangement playback starts through the same transport state used by retriggers, metronome, drums, and export.

## Stop

- `stopTransport()` owns active transport teardown: tokens, pending anchor seeks, preroll timers, frame callbacks, playhead state, beat lights, and user status.
- `stopAllPlaybackOutputs()` owns output teardown: track playback output reset plus every visible `video`/`audio` element paused, muted, and cleared of export-playback markers.
- `hardStopPlayback()` and export teardown use the same stop-output path instead of carrying separate pause/mute loops.

## Future rule

If a future feature introduces another source of playback output, it should register with or be stopped by `stopAllPlaybackOutputs()`. Avoid one-off pause/mute loops outside the transport teardown path.
