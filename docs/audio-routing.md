# Freemix audio routing model

Freemix should treat every loaded audio/video source as moving toward one durable route: source media into the per-track FX graph, then into the shared browser output. Native element audio is only a limited fallback and should be visible as such.

## Route states

- `empty`: the track has no source and no audio route.
- `waiting`: the track has a source but is still preparing an FX route.
- `webaudio`: a `MediaElementAudioSourceNode` is connected to the track FX graph.
- `capture-fx`: a captured media stream is connected to the track FX graph.
- `native-audio`: browser-native media element audio is audible, but it is not FX-routed.
- `fx-unavailable`: an FX route is currently unavailable.
- `unrouted`: the track has media but no confirmed route.
- `capture-failed`: capture-stream routing failed.
- `failed`: audio routing failed.

## Readiness mapping

- `webaudio` and `capture-fx` are `fx-ready`.
- `waiting` is `loading`.
- `native-audio`, `fx-unavailable`, and `unrouted` are `limited`.
- `capture-failed` and `failed` are `failed`.
- `empty` is `empty`.

## Rules for future hardening

- UI, diagnostics, and export logic should read route state through `freemixGetTrackAudioRouteState()`.
- Any new audio fallback must declare its route state instead of silently muting or bypassing FX.
- Track volume should be applied at the FX graph output when a graph exists.
- Native media element audio should stay muted whenever an FX graph owns audible output.
- Limited routes are allowed as recovery states, but they are not equivalent to the intended 1.0 path.
