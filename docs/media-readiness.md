# Media Readiness States

Freemix uses one user-facing media readiness model for track controls and diagnostics. Raw playback states can still be specific, but they should map into one of these visible categories.

## States

- `empty`: no source loaded.
- `loading`: source, proxy, slice, or clean-frame preparation is in progress.
- `ready`: media is loaded and ready for playback.
- `fx-ready`: media is ready and expected to hit the audio FX route.
- `playing`: media is currently playing.
- `stopped`: media is parked after stop.
- `limited`: media is present, but browser/CORS/proxy limits may prevent full FX behavior.
- `audio-only`: audio is available but video is not.
- `video-only`: video is available but audio is not.
- `unsupported`: the browser cannot decode the selected media.
- `failed`: loading, decoding, proxying, or routing failed.

## UI contract

- Track control panels show readiness through the media prep strip.
- Diagnostics summarize readiness across all tracks.
- The video viewport stays clean; readiness overlays should not clutter the output view.
- Source loading and recovery code should set a raw `mediaStatus`, then let `getTrackMediaReadiness()` translate it for users.

## 1.0 expectations

- Users should never have to guess whether a clip is empty, loading, ready, limited, failed, or unsupported.
- FX limitations should be visible as `limited`, not silently treated as success.
- Export and playback debugging should rely on the same readiness helper as the visible UI.
