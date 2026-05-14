# Freemix Philosophy

Freemix is a video remixer for people who want to make music before they know how to make music.

The core promise is simple: search the Internet Archive, choose source videos, pull playable sounds out of them, and turn those sounds into a song that already has an accompanying music video. The video remains alive while the music is being made. It is not just a sample source. It is the instrument, the visualizer, and the raw material of the performance.

Freemix should feel like finding a secret instrument inside a film.

The final product goal is not merely to help users make loops. It is to help people make a complete audiovisual idea quickly: a song and a music video born from the same playful actions, without needing prior technical knowledge of music production, video editing, sampling, codecs, timelines, or export workflows.

## Product North Star

Freemix turns archived video into playable musical instruments that produce music and visuals together.

A user should be able to:

1. Search the Internet Archive for source material.
2. Load it without thinking about formats, downloads, or setup.
3. Let Freemix help them find useful musical and visual moments.
4. Play, refine, arrange, and perform those moments.
5. Finish with a song that already has a matching music video.

The first successful session should happen in minutes, not hours.

## Hyper-Usability

Freemix is beginner-first without being toy-like.

The interface should assume the user is curious, not trained. It should never make the user prove they understand music production, sampling, synthesis, video editing, routing, codecs, envelopes, timelines, DAWs, or plugin workflows before they get to make something interesting.

The product should make the obvious next move feel obvious.

That means:

- No empty professional workstation intimidation.
- No wall of controls on first load.
- No required setup vocabulary.
- No hidden core workflow.
- No dead-end states.
- No button that exists only because other music tools have it.

Every visible control should earn its place. If a button is visible, it should do something important, understandable, and satisfying.

Advanced features are welcome, but they should live behind gentle doors: expandable panels, secondary modes, contextual controls, and progressive disclosure. A beginner should never feel punished for not knowing what to touch. A pro should never feel trapped by training wheels.

The product should actively encourage experimentation. Trying a different source, moving a start point, changing a retrigger rate, muting a track, or swapping a visual should feel safe, fast, and reversible. The user should feel invited to play around rather than worry about doing it correctly.

## Magic, Not Mystery

Freemix should feel magical because the result arrives quickly, not because the interface hides what is happening.

Good magic in Freemix looks like:

- The app notices promising transients, tones, voices, impacts, and textures in the video.
- The app suggests useful starting points.
- The user can accept, preview, nudge, or replace those suggestions.
- The sound and video stay linked in ways that are delightful and legible.
- The system teaches through doing instead of stopping the flow for explanation.
- The user accidentally discovers combinations that feel like finished audiovisual ideas.

Tutorial mode should feel like a friendly collaborator sitting beside the user. It should guide the user through the first remix with tiny, timely prompts, then quietly step back as confidence grows.

## The Four-Track Instrument

Freemix begins with four tracks. Four is enough to make a complete idea without turning the workspace into a control room.

Suggested track roles:

- Track 1: Percussion
- Track 2: Bass
- Track 3: Rhythm
- Track 4: Lead

These labels should guide rather than restrict. A user can ignore them, rename them, or discover that a strange archival sound wants to be something else.

Each track should help the user pull one or more sounds from the source video with a clear musical intent. The track asks a simple question:

What kind of part do you want this to become?

For early versions, an instrument can be as simple as retriggering a video moment with a few powerful refinements: start point, length, pitch, filter, envelope, repeat, and effect intensity. The important thing is that it feels playable.

The first truly musical version should be even simpler: four tracks share one clock, each track chooses a start moment in the video, and each track decides how often that moment retriggers inside a bar. One track might hit once per bar, another four times, another eight times. With only BPM, start time, and retrigger rate, the user can already make rhythm, structure, and visual motion without needing to learn a workstation.

Effects should follow the same rule. Each track can have a compact chain inspired by familiar music tools: broad low, mid, and high tone shaping; warm tube-style distortion; simple delay; and reverb. The user should feel like they are turning a few meaningful knobs on a friendly piece of gear, not managing a plugin stack.

## Video As Instrument

The video should always matter.

Freemix is not a sampler that forgets where the sound came from. The visual layer should reinforce the musical layer. If audio is delayed, the video should echo or trail. If the sound is distorted, the image can fuzz, smear, crush, or glitch. If a filter removes high frequencies, the image might lose brightness, color range, or sharpness. If a sound is cropped tightly, the video can crop tightly with it.

These audiovisual effects should be legible at beginner speed. Delay can create a visible ghost, reverb can add bloom or softness, distortion can increase contrast and grit, and tone controls can shift brightness, color, or saturation. The point is not photorealistic simulation. The point is that the user immediately understands that the sound and picture are responding together.

The early visual layout should use a 2x2 grid, one video surface per track. This makes the four-part structure immediately visible and playable.

In this grid, the song and the music video are the same object. When a track retriggers, its video cell should jump, flash, pulse, or otherwise show that the sound has been played. The user should not have to assemble a separate visual composition after making the music. If the loop sounds good, it should already look alive.

Future layouts can include:

- Full-screen single-track focus.
- Stacked performance views, with track 1 on the bottom and later tracks layered above it.
- Transparency and blend modes that let multiple videos occupy the same full-frame canvas.
- Picture-in-picture emphasis.
- Scene-based arrangements.
- Layouts that follow the currently active track.

The video system should make the song visible without turning the app into a video editor.

## Song Plus Music Video

Freemix should eventually make it normal for a user to create a song and its music video in the same flow.

The user should not have to finish the music, open a separate visual tool, sync clips by hand, and learn another workflow. If they perform a track, arrange a scene, delay a sound, distort a sample, filter a loop, or mute a part, the visual side should already know how to respond. The music video should emerge from the musical decisions.

The best version of Freemix makes audiovisual creation feel casual and quick:

- Pick a few sources.
- Find a few moments.
- Press play.
- Change the energy.
- Save the best accidents.
- Arrange the moments into a song.
- Export a video that reflects what happened musically.

This should be approachable for people with hardly any prior technical know-how. The app should do the boring translation work between music and video, leaving the user with the fun part: experimenting until something clicks.

## Arrangement

Arrangement should be hyper simple.

The inspiration is closer to a Kaossilator-style scene system than a traditional DAW timeline. A user should be able to capture musical states, move between them, and build a song from memorable scenes.

The arrangement layer should answer:

- What is playing now?
- What changes next?
- How do I capture this moment?
- How do I return to a moment I liked?

The timeline can become richer over time, but the earliest version should prioritize immediacy: record a loop, save a scene, switch scenes, and perform an arrangement.

A first arrangement mode can be a small clip grid rather than a full timeline. Each track gets a row, each bar gets a cell, and clicking a cell captures the current musical and visual state of that track. During arrangement playback, those captured cells should take over from the local live controls so the user can build form without learning timeline editing.

## Design Values

Freemix should feel:

- Plug and play.
- Warmly intelligent.
- Minimal, but never empty.
- Powerful, but never crowded.
- Playful, but not unserious.
- Experimental without being confusing.
- Fast enough to keep creative momentum alive.
- Safe enough that beginners are willing to explore.

The user should always feel one move away from making sound.

## Interface Aesthetic

Freemix should look and behave like a compact piece of A/V performance hardware from a major music technology manufacturer.

The interface should feel dense, readable, and physical: more like a sampler, groovebox, video mixer, or field recorder than a lifestyle web app. It should use high-contrast labels, compact spacing, clear status lights, strong grid alignment, and controls that read at a glance under pressure.

The aesthetic should support usability first:

- Dark chassis surfaces.
- Bright but disciplined accent colors.
- Short labels.
- Clear active and inactive states.
- No decorative clutter.
- No oversized hero treatment once the tool is loaded.
- Controls arranged by performance priority.
- A compact layout that still breathes enough to prevent mistakes.

The goal is not to imitate any specific brand. The goal is the feeling of trustworthy creative hardware: immediate, durable, legible, and ready to play.

## What Freemix Is Not

Freemix is not trying to become a conventional DAW.

It is not a timeline-first video editor. It is not a plugin host. It is not a maximal synthesis environment. It is not an expert-only sampling workstation.

Freemix can borrow from all of those worlds, but its center is different:

An approachable musical playground where archived video becomes a living, playable instrument.
