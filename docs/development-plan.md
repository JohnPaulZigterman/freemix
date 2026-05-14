# Freemix Development Plan

This plan keeps the first versions narrow, playable, and friendly. The guiding rule is that every milestone should make the app more usable for a first-time visitor, not merely more technically complete.

Freemix's long-term product goal is to let people make a song and an accompanying music video at the same time. The user should not need prior technical knowledge of music production, sampling, video editing, timelines, codecs, or rendering to get a satisfying result. The product should feel fun, intuitive, and highly experimental: a place where swapping sources, moving moments, changing pulse density, and trying odd combinations is the main creative path.

## Guiding Principles

- Start with the shortest path from search to sound.
- Treat sound and video as one creative output.
- Keep the workspace minimal and self-explanatory.
- Make every default musically useful.
- Add power through progressive disclosure.
- Preserve the bond between audio and video.
- Make experimentation fast, safe, and reversible.
- Verify the app with real beginner-style flows, not only technical tests.
- Use a compact hardware-inspired UI: high contrast, short labels, dense layout, and obvious state.

## Phase 0: Current Prototype

Status: started.

The current app can search Internet Archive videos, show results in a dropdown, and embed a selected video for playback.

Next improvements:

- Make result loading feel more polished with clearer loading, empty, and error states.
- Add selected-video metadata and source attribution.
- Create a stronger app shell that anticipates the four-track workstation.
- Add mobile-friendly refinements for search and selection.

## Phase 1: Search And Source Selection

Goal: make video import feel as easy as searching YouTube.

User flow:

1. User searches for a video.
2. Results appear instantly in a dropdown.
3. User previews or selects a result.
4. Freemix loads the video as the source material.
5. The app offers the next obvious action: find sounds.

Core features:

- Internet Archive search focused on video media.
- Result thumbnails, titles, creators, dates, and short descriptions.
- Duration-aware results that prioritize shorter, more remixable videos by default.
- Per-track duration filters so users can search for quick clips, short videos, medium videos, or longer source material.
- Keyboard and mouse result selection.
- Source video preview.
- Clear loading and error states.
- Basic recent searches or recent videos.

Usability requirements:

- Search should never feel like a database form.
- Results should be scannable in under five seconds.
- Selecting a video should not require knowing what an archive identifier is.
- The app should explain unavailable media in plain language.

## Phase 2: Four-Track Workspace

Goal: turn Internet Archive material into four simple, synchronized video-instrument tracks.

This phase should be a usable song-and-music-video sketchpad, not a full production environment. The user chooses source videos, sees four track cells in a square, sets a tempo, chooses a start moment for each track, and decides how many times each track retriggers per bar.

User flow:

1. User searches for source material in one or more track rows.
2. The app transforms into a four-cell square, one cell per track.
3. User presses play on a shared metronome clock.
4. User adjusts the project BPM.
5. For each track, user chooses the video start time.
6. For each track, user chooses how many times it retriggers per bar.
7. The four tracks loop together as both a song and a music video.

Core features:

- Four-track 2x2 video grid.
- Suggested track roles: percussion, bass, rhythm, lead.
- Per-track Internet Archive source search.
- Per-track duration filters that favor short, remixable videos.
- Shared transport: play, stop, bar position, and beat position.
- Adjustable BPM.
- Metronome with clear visual pulse and optional audio click.
- Per-track start time selector.
- Per-track retrigger rate from 1 through 8 times per bar.
- Per-track mute and volume.
- Simple track labels that can be renamed later.
- Immediate preview when a start time or retrigger rate changes.

The first retrigger-rate choices should be plain-language and musical:

- 1 per bar
- 2 per bar
- 3 per bar
- 4 per bar
- 5 per bar
- 6 per bar
- 7 per bar
- 8 per bar

The control can show the number first and the musical feel second, for example "4 - steady pulse" or "8 - fast eighths." Beginners should not have to understand note values to use it.

Usability requirements:

- The 2x2 grid should immediately communicate "four playable parts."
- The app should feel playable before any deep editing exists.
- BPM should be globally visible and easy to adjust.
- Start-time selection should feel like finding a good moment, not editing a timeline.
- Retrigger rate should feel like choosing energy level or motion density.
- A beginner should understand what to do next without reading a manual.
- Track controls should be compact and obvious.
- Advanced controls should not appear until the user needs them.
- The user should be able to make a recognizable loop within one minute of selecting a video.
- The user should understand that they are creating both music and a music video without needing a separate visual workflow.

Suggested first interface:

- Top area: compact source search and selected-video title.
- Center: 2x2 video grid.
- Bottom or side strip: global play/stop, BPM, metronome toggle.
- Each grid cell: track name, start picker, retrigger selector, mute, volume.

Visual direction:

- Treat the app like an A/V instrument faceplate.
- Prefer compact rectangular controls over large web cards.
- Use status-light color sparingly for important state.
- Keep labels short enough to scan during playback.
- Make active tracks and metronome pulses visually unmistakable.
- Avoid decorative surfaces that do not help performance.
- Keep the default video canvas at standard 16:9 so the combined 2x2 output is suitable for YouTube and other streaming platforms.
- Preserve the default control layout as a matching 2x2 grid, mapped to the video quadrants, even when future video layouts are added.
- Default the video layout to a full-frame stack, with track 1 at the bottom and tracks 2 through 4 layered above it.
- Offer simple per-track blend modes, such as screen, multiply, add, difference, and color-dodge, so layered video sources can get vivid without turning the app into a video compositor.

Non-goals for this phase:

- Automatic slice detection.
- Full waveform editing.
- Full timeline arrangement.
- Export.
- Effects beyond basic playback/retriggering.
- Multiple source videos.

Technical shape:

- Use one selected Internet Archive item as the shared source.
- Prefer direct media files from the Internet Archive metadata API when available, instead of relying only on embed iframes.
- Create four track states in app data: name, role, startTime, retriggersPerBar, volume, muted.
- Use a single scheduler based on BPM and bar duration.
- On each scheduled retrigger, seek the track video to its start time and play from there.
- Keep audio and video linked by using the same video element per track at first.
- Treat the 2x2 grid as the main performance surface.

## Phase 3: Beginner-Friendly Sound Extraction

Goal: help users pull useful instruments out of the video.

User flow:

1. User chooses a track role.
2. Freemix suggests moments in the video that fit the role.
3. User auditions suggestions.
4. User picks one and can refine it with a few simple controls.

Early instrument model:

- A selected video slice.
- Retriggering from the slice start.
- Basic start and length adjustment.
- Pitch adjustment.
- Filter amount.
- Envelope shape.
- Repeat or stutter amount.

Track-specific guidance:

- Percussion: short impacts, clicks, hits, cuts, consonants, hard edits.
- Bass: low tones, hums, drones, engine sounds, speech pitched down.
- Rhythm: loops, textures, repeated gestures, mechanical motion.
- Lead: voice fragments, melodies, bright tones, distinctive gestures.

Usability requirements:

- The app should suggest good starting points.
- Auditioning should be immediate.
- Controls should be named by musical outcome where possible.
- Beginner copy should be short, contextual, and skippable.

## Phase 4: Playability

Goal: make the tracks feel like instruments.

Core features:

- Trigger pads for each track.
- Keyboard shortcuts.
- Quantized retriggering.
- Simple loop capture.
- Per-track refinement controls.
- Responsive visual feedback when a track plays.

Possible controls:

- Start
- Length
- Tone
- Shape
- Repeat
- Space
- Dirt

Usability requirements:

- First sound should happen immediately.
- Triggering should feel responsive.
- Controls should invite exploration.
- Bad settings should be hard to create accidentally.

## Phase 5: Visual-Audio Coupling

Goal: make video react to the musical treatment of each track.

This phase is where Freemix moves from "video looper" toward "automatic music video maker." Every meaningful musical action should have a visual consequence by default, while still letting the user override or simplify it.

Core features:

- Each track has an associated video cell.
- Triggering a track triggers its video slice.
- Each track has a simplified FX chain: EQ Three-style tone shaping, tube-style distortion, simple delay, and reverb.
- Audio delay creates video echo or trail.
- Distortion creates fuzz, noise, blur, or glitch.
- Filters influence brightness, color, crop, or saturation.
- Pitch or speed changes alter video playback speed where useful.

Usability requirements:

- Visual effects should clarify the music, not distract from it.
- Defaults should look good without adjustment.
- Users should be able to disable or simplify visuals.
- Visual behavior should stay predictable enough for performance.
- FX controls should stay beginner-readable, omitting expert parameters unless they become clearly necessary.

## Phase 6: Scenes And Arrangement

Goal: create a hyper-simple arrangement system inspired by performance scenes.

User flow:

1. User makes a musical moment.
2. User saves it as a scene.
3. User creates a few more scenes.
4. User switches between scenes live or records an arrangement.

Core features:

- Scene slots.
- Capture current track states.
- First pass: an 8-bar grid to the right of the video surface, with one row per track.
- Clicking a grid cell captures that track's current source, start moment, retrigger rate, volume, mute state, and FX.
- When arrangement mode is on, captured cells override the matching track's live controls during playback.
- Switch scenes with quantization.
- Simple arrangement recording.
- Minimal timeline showing scene order and duration.

Usability requirements:

- Scene capture should feel as easy as taking a snapshot.
- The arrangement view should avoid DAW intimidation.
- The user should be able to make a beginning, middle, and ending quickly.

## Phase 7: Export And Sharing

Goal: let users keep and share the song and its generated music video.

Core features:

- Save project locally.
- Export audio.
- Export video with the same track-based visual behavior.
- Export a combined audiovisual render suitable for common streaming platforms.
- Shareable project link or project file.
- Source attribution for Internet Archive media.

Usability requirements:

- Export should use plain language.
- The app should explain licensing/source limits without sounding legalistic.
- Users should always know whether they are saving a project or rendering a finished piece.
- Export should preserve the relationship between musical arrangement and visual behavior.

## Technical Direction

Early architecture should favor fast iteration:

- Static frontend first.
- Internet Archive APIs for search and metadata.
- Browser-native video playback where possible.
- Web Audio API for slicing, retriggering, filtering, and effects.
- Canvas or WebGL for video grid and reactive visuals once needed.
- Local project state in JSON.

Likely future pieces:

- Media metadata fetcher.
- Audio buffer extraction pipeline.
- Slice detection and suggestion system.
- Track engine.
- Scene engine.
- Render/export pipeline.

## Milestone Checklist

1. Search and select Internet Archive video.
2. Load source video into a four-track workspace.
3. Create one playable slice manually.
4. Create four playable tracks from one video.
5. Add beginner tutorial mode.
6. Add suggested slices for each track role.
7. Add 2x2 video-reactive performance grid.
8. Add scenes.
9. Add simple arrangement recording.
10. Add export.

## UX Acceptance Tests

Use these as product tests as much as technical tests:

- A first-time user can search and load a video without help.
- A first-time user can make sound within one minute of loading a video.
- A first-time user can create four tracks without understanding sampling terminology.
- A first-time user can make a simple song and understand that a matching video is being created with it.
- A user can recover from every empty or error state.
- The interface never shows more controls than the current step needs.
- A user can ignore tutorial mode and still understand the main path.
- A user can make something surprising before they understand why it worked.
- A user feels encouraged to try multiple sources, start points, and energy settings without fear of breaking the project.
