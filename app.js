const playerPanel = document.querySelector("#playerPanel");
const statusPill = document.querySelector("#statusPill");

const IA_SEARCH_URL = "https://archive.org/advancedsearch.php";
const IA_METADATA_URL = "https://archive.org/metadata";
const IA_DOWNLOAD_URL = "https://archive.org/download";
const SEARCH_DELAY_MS = 280;
const DEFAULT_BPM = 92;
const TRACKS = [
  { name: "Perc", role: "Impact", color: "green" },
  { name: "Bass", role: "Weight", color: "amber" },
  { name: "Rhythm", role: "Motion", color: "blue" },
  { name: "Lead", role: "Hook", color: "red" },
];
const RETRIGGER_LABELS = {
  1: "1 - anchor",
  2: "2 - stride",
  3: "3 - roll",
  4: "4 - pulse",
  5: "5 - skip",
  6: "6 - drive",
  7: "7 - spark",
  8: "8 - rush",
};
const DURATION_FILTERS = {
  any: { label: "Any", min: 0, max: Infinity },
  quick: { label: "< 5m", min: 0, max: 5 * 60 },
  short: { label: "< 15m", min: 0, max: 15 * 60 },
  medium: { label: "15-30m", min: 15 * 60, max: 30 * 60 },
  long: { label: "30m+", min: 30 * 60, max: Infinity },
};
const FX_CONTROLS = [
  { key: "eqLow", label: "Low", min: -12, max: 12, step: 1 },
  { key: "eqMid", label: "Mid", min: -12, max: 12, step: 1 },
  { key: "eqHigh", label: "High", min: -12, max: 12, step: 1 },
  { key: "tube", label: "Tube", min: 0, max: 1, step: 0.01 },
  { key: "delay", label: "Dly", min: 0, max: 1, step: 0.01 },
  { key: "reverb", label: "Verb", min: 0, max: 1, step: 0.01 },
];

let selectedSource = null;
let transport = null;
let audioContext = null;
let masterMuted = false;
let tracks = createInitialTracks();
let trackSearchRequestCounter = 0;

renderWorkstation();
setStatus("Ready");

document.addEventListener("click", (event) => {
  if (!event.target.closest(".track-source")) {
    tracks.forEach((track) => renderTrackResults(track, []));
  }
});

function normalizeResults(docs) {
  return docs
    .filter((doc) => doc.identifier)
    .map((doc) => ({
      identifier: doc.identifier,
      title: textValue(doc.title) || doc.identifier,
      creator: textValue(doc.creator),
      year: textValue(doc.year),
      description: textValue(doc.description),
      runtime: textValue(doc.runtime),
      durationSeconds: parseRuntime(textValue(doc.runtime)),
      thumbnail: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
      archiveUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
    }));
}

function textValue(value) {
  if (Array.isArray(value)) {
    return value.find(Boolean) ?? "";
  }

  return value ?? "";
}

function parseRuntime(runtime) {
  if (!runtime) {
    return Infinity;
  }

  const parts = String(runtime)
    .trim()
    .split(":")
    .map((part) => Number(part));

  if (parts.some((part) => Number.isNaN(part))) {
    return Infinity;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0];
}

async function performArchiveSearch(params) {
  const response = await fetch(`${IA_SEARCH_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload.response?.docs ?? [];
}

async function fetchPlayableSource(result) {
  const response = await fetch(`${IA_METADATA_URL}/${encodeURIComponent(result.identifier)}`);
  if (!response.ok) {
    throw new Error(`Metadata failed with status ${response.status}`);
  }

  const metadata = await response.json();
  const file = choosePlayableFile(metadata.files ?? []);
  if (!file) {
    throw new Error("No playable video file found.");
  }

  const mediaUrl = `${IA_DOWNLOAD_URL}/${encodeURIComponent(result.identifier)}/${encodePath(file.name)}`;
  return {
    ...result,
    duration: Number(metadata.metadata?.runtime) || 0,
    mediaUrl,
    mediaName: file.name,
    mediaFormat: file.format ?? "video",
  };
}

function choosePlayableFile(files) {
  const candidates = files
    .filter((file) => {
      const name = file.name ?? "";
      const format = file.format ?? "";
      const combined = `${name} ${format}`.toLowerCase();
      return (
        /\.(mp4|m4v|webm|ogv)$/i.test(name) &&
        !combined.includes("thumbnail") &&
        !combined.includes("metadata") &&
        !combined.includes("item tile") &&
        !combined.includes("spectrogram")
      );
    })
    .map((file) => ({
      ...file,
      numericSize: Number(file.size) || Number.MAX_SAFE_INTEGER,
      score: scorePlayableFile(file),
    }))
    .sort((a, b) => a.score - b.score || a.numericSize - b.numericSize);

  return candidates[0];
}

function scorePlayableFile(file) {
  const name = file.name.toLowerCase();
  const format = (file.format ?? "").toLowerCase();
  let score = 100;

  if (name.endsWith(".mp4")) score -= 50;
  if (format.includes("h.264") || format.includes("mpeg4")) score -= 30;
  if (name.includes("512kb") || name.includes("360") || name.includes("480")) score -= 10;
  if (name.includes("1080") || name.includes("720")) score += 15;
  if (name.endsWith(".ogv")) score += 20;

  return score;
}

function renderWorkstation() {
  const loadedTracks = tracks.filter((track) => track.source);
  const allSameSource =
    loadedTracks.length > 0 &&
    loadedTracks.every((track) => track.source.identifier === loadedTracks[0].source.identifier);
  const sourceLabel = allSameSource
    ? loadedTracks[0].source.title
    : `${loadedTracks.length} of ${tracks.length} sources loaded`;
  const sourceMeta = allSameSource
    ? [loadedTracks[0].source.creator, loadedTracks[0].source.year].filter(Boolean).join(" - ")
    : "Search inside any track to swap its video";

  playerPanel.innerHTML = `
    <section class="workstation" aria-label="Four track video looper">
      <div class="source-strip">
        <div class="source-copy">
          <span class="panel-label">Sources</span>
          <h2>${escapeHtml(sourceLabel)}</h2>
          <p>${escapeHtml(sourceMeta || "Four independent Internet Archive tracks")}</p>
        </div>
        ${
          allSameSource
            ? `<a class="archive-link" href="${loadedTracks[0].source.archiveUrl}" target="_blank" rel="noreferrer">Archive</a>`
            : ""
        }
      </div>

      <div class="transport" aria-label="Transport controls">
        <button class="transport-button play-button" id="playButton" type="button">Play</button>
        <button class="transport-button" id="stopButton" type="button">Stop</button>
        <label class="control-field bpm-field">
          <span>BPM</span>
          <input id="bpmInput" type="number" min="40" max="220" step="1" value="${DEFAULT_BPM}">
        </label>
        <button class="transport-button metronome-button active" id="metroButton" type="button">
          Click
        </button>
        <div class="meter" aria-label="Bar position">
          <span class="beat-light" data-beat="0"></span>
          <span class="beat-light" data-beat="1"></span>
          <span class="beat-light" data-beat="2"></span>
          <span class="beat-light" data-beat="3"></span>
        </div>
      </div>

      <div class="video-matrix" aria-label="Video sources">
        ${tracks.map((track) => renderVideoCell(track)).join("")}
      </div>

      <div class="control-bank" aria-label="Track controls">
        ${tracks.map((track) => renderTrackControlRow(track)).join("")}
      </div>
    </section>
  `;

  bindWorkstationControls();
}

function renderVideoCell(track) {
  return `
    <div class="video-cell ${track.color}" data-track-id="${track.id}">
      ${
        track.source
          ? `<video
              class="track-video"
              id="video-${track.id}"
              src="${track.source.mediaUrl}"
              preload="metadata"
              crossorigin="anonymous"
              playsinline
            ></video>`
          : `<div class="track-empty-video">Ready</div>`
      }
      <div class="track-badge">
        <strong>${escapeHtml(track.name)}</strong>
        <span>${escapeHtml(track.role)}</span>
      </div>
      <div class="trigger-flash" aria-hidden="true"></div>
    </div>
  `;
}

function renderTrackControlRow(track) {
  const sourceTitle = track.source?.title ?? "Empty slot";
  const sourceMeta = track.source
    ? [track.source.creator, track.source.year].filter(Boolean).join(" - ") || track.source.mediaFormat
    : "Search to load video";

  return `
    <article class="track-row ${track.color}" data-track-row-id="${track.id}">
      <div class="track-row-label">
        <strong>${escapeHtml(track.name)}</strong>
        <span>${escapeHtml(track.role)}</span>
      </div>
      <div class="track-source">
        <label class="control-field track-source-search">
          <span>Source</span>
          <input
            type="search"
            placeholder="Search video"
            autocomplete="off"
            spellcheck="false"
            value=""
            data-track-control="${track.id}"
            data-control="sourceSearch"
          >
        </label>
        <label class="control-field duration-filter">
          <span>Length</span>
          <select data-track-control="${track.id}" data-control="durationFilter">
            ${Object.entries(DURATION_FILTERS)
              .map(
                ([value, filter]) =>
                  `<option value="${value}" ${value === track.durationFilter ? "selected" : ""}>${filter.label}</option>`,
              )
              .join("")}
          </select>
        </label>
        <div class="track-source-name" title="${escapeHtml(sourceTitle)}">
          <strong>${escapeHtml(sourceTitle)}</strong>
          <span>${escapeHtml(sourceMeta)}</span>
        </div>
        <div class="track-results" id="results-${track.id}" hidden></div>
      </div>
      <label class="control-field start-field">
        <span>Moment</span>
        <input
          type="range"
          min="0"
          max="120"
          step="0.1"
          value="${track.startTime}"
          data-track-control="${track.id}"
          data-control="startTime"
        >
      </label>
      <label class="control-field compact-number">
        <span>Sec</span>
        <input
          type="number"
          min="0"
          step="0.1"
          value="${track.startTime}"
          data-track-control="${track.id}"
          data-control="startNumber"
        >
      </label>
      <label class="control-field energy-field">
        <span>Energy</span>
        <select data-track-control="${track.id}" data-control="retriggersPerBar">
          ${Object.entries(RETRIGGER_LABELS)
            .map(
              ([value, label]) =>
                `<option value="${value}" ${Number(value) === track.retriggersPerBar ? "selected" : ""}>${label}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label class="control-field volume-field">
        <span>Vol</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value="${track.volume}"
          data-track-control="${track.id}"
          data-control="volume"
        >
      </label>
      <div class="fx-chain" aria-label="${escapeHtml(track.name)} effects chain">
        <span class="fx-title">FX</span>
        ${FX_CONTROLS.map((fxControl) => renderFxControl(track, fxControl)).join("")}
      </div>
      <button
        class="track-toggle"
        type="button"
        data-track-control="${track.id}"
        data-control="muted"
        aria-pressed="${track.muted}"
      >
        ${track.muted ? "Muted" : "On"}
      </button>
    </article>
  `;
}

function renderFxControl(track, fxControl) {
  return `
    <label class="control-field fx-field">
      <span>${fxControl.label}</span>
      <input
        type="range"
        min="${fxControl.min}"
        max="${fxControl.max}"
        step="${fxControl.step}"
        value="${track.fx[fxControl.key]}"
        data-track-control="${track.id}"
        data-control="${fxControl.key}"
      >
    </label>
  `;
}

function bindWorkstationControls() {
  document.querySelector("#playButton").addEventListener("click", startTransport);
  document.querySelector("#stopButton").addEventListener("click", stopTransport);
  document.querySelector("#bpmInput").addEventListener("input", (event) => {
    if (!transport) {
      return;
    }

    transport.bpm = clamp(Number(event.target.value), 40, 220);
    const now = performance.now();
    transport.nextBeatAt = now;
    transport.beatIndex = 0;
    updateTrackTriggerGrid(now);
  });
  document.querySelector("#metroButton").addEventListener("click", () => {
    masterMuted = !masterMuted;
    document.querySelector("#metroButton").classList.toggle("active", !masterMuted);
  });

  document.querySelectorAll("[data-track-control]").forEach((control) => {
    control.addEventListener("input", handleTrackControl);
    control.addEventListener("click", handleTrackControl);
    control.addEventListener("keydown", handleTrackSearchKeydown);
  });

  document.querySelectorAll(".track-video").forEach((video) => {
    video.addEventListener("loadedmetadata", () => updateTrackDuration(video));
    video.addEventListener("error", () => setStatus("Media error", true));
    video.muted = false;
    video.volume = 1;
  });

  tracks.forEach((track) => applyVideoFx(track));
}

function handleTrackControl(event) {
  const control = event.currentTarget;
  const track = tracks.find((item) => item.id === control.dataset.trackControl);
  if (!track) {
    return;
  }

  const controlName = control.dataset.control;

  if (controlName === "sourceSearch") {
    queueTrackSearch(track, control.value.trim());
    return;
  }

  if (controlName === "durationFilter") {
    track.durationFilter = control.value;
    const sourceSearch = document.querySelector(
      `[data-track-control="${track.id}"][data-control="sourceSearch"]`,
    );
    queueTrackSearch(track, sourceSearch?.value.trim() ?? "");
    return;
  }

  if (controlName === "startTime" || controlName === "startNumber") {
    track.startTime = Math.max(0, Number(control.value) || 0);
    syncStartControls(track);
    previewTrack(track);
  }

  if (controlName === "retriggersPerBar") {
    track.retriggersPerBar = Number(control.value);
    track.lastStep = -1;
    previewTrack(track);
  }

  if (controlName === "volume") {
    track.volume = Number(control.value);
    applyTrackVolume(track);
  }

  if (controlName in track.fx) {
    track.fx[controlName] = Number(control.value);
    applyTrackFx(track);
    applyVideoFx(track);
  }

  if (controlName === "muted") {
    track.muted = !track.muted;
    control.textContent = track.muted ? "Muted" : "On";
    control.setAttribute("aria-pressed", String(track.muted));
    applyTrackVolume(track);
  }
}

function startTransport() {
  if (!tracks.some((track) => track.source)) {
    setStatus("Load a source", true);
    return;
  }

  stopTransport(false);
  ensureAudioContext();
  tracks.forEach((track) => {
    track.lastStep = -1;
    track.nextTriggerAt = 0;
    track.stepMs = 0;
  });

  const now = performance.now();
  const startAt = now + 80;
  transport = {
    active: true,
    bpm: clamp(Number(document.querySelector("#bpmInput").value), 40, 220),
    startedAt: startAt,
    nextBeatAt: startAt,
    beatIndex: 0,
    frameId: null,
  };

  updateTrackTriggerGrid(startAt);

  document.querySelector("#playButton").classList.add("active");
  setStatus("Playing");
  tickTransport();
}

function stopTransport(resetVideos = true) {
  if (transport?.frameId) {
    cancelAnimationFrame(transport.frameId);
  }

  transport = null;
  document.querySelector("#playButton")?.classList.remove("active");
  document.querySelectorAll(".beat-light").forEach((light) => light.classList.remove("active"));

  if (resetVideos) {
    tracks.forEach((track) => {
      const video = getTrackVideo(track);
      if (video) {
        video.pause();
        video.currentTime = safeStartTime(track, video);
      }
    });
  }

  if (tracks.some((track) => track.source)) {
    setStatus("Source ready");
  }
}

function tickTransport() {
  if (!transport?.active) {
    return;
  }

  const now = performance.now();
  const beatMs = 60000 / transport.bpm;

  while (now >= transport.nextBeatAt) {
    const beat = transport.beatIndex % 4;
    renderBeat(beat);
    playMetronome(beat);
    transport.beatIndex += 1;
    transport.nextBeatAt += beatMs;
  }

  tracks.forEach((track) => {
    if (!track.source || !track.stepMs) {
      return;
    }

    while (now >= track.nextTriggerAt) {
      triggerTrack(track);
      track.nextTriggerAt += track.stepMs;
    }
  });

  transport.frameId = requestAnimationFrame(tickTransport);
}

function triggerTrack(track) {
  const video = getTrackVideo(track);
  const cell = document.querySelector(`[data-track-id="${track.id}"]`);
  if (!video || !cell) {
    return;
  }

  video.currentTime = safeStartTime(track, video);
  setupTrackAudio(track, video);
  applyTrackVolume(track);
  applyTrackFx(track);
  applyVideoFx(track);
  video.play().catch(() => {
    setStatus("Tap play again", true);
  });

  cell.classList.remove("triggered");
  window.requestAnimationFrame(() => cell.classList.add("triggered"));
}

function previewTrack(track) {
  if (!track.source || transport?.active) {
    return;
  }

  triggerTrack(track);
  window.setTimeout(() => {
    const video = getTrackVideo(track);
    if (video && !transport?.active) {
      video.pause();
    }
  }, 650);
}

function renderBeat(beat) {
  document.querySelectorAll(".beat-light").forEach((light, index) => {
    light.classList.toggle("active", index === beat);
  });
}

function playMetronome(beat) {
  if (masterMuted || !audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = beat === 0 ? 1320 : 880;
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.05);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.055);
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function updateTrackDuration(video) {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return;
  }

  const trackId = video.id.replace("video-", "");
  document
    .querySelectorAll(`[data-track-control="${trackId}"][data-control="startTime"]`)
    .forEach((range) => {
      range.max = String(Math.max(1, video.duration - 1));
    });

  document
    .querySelectorAll(`[data-track-control="${trackId}"][data-control="startNumber"]`)
    .forEach((number) => {
      number.max = String(Math.max(1, video.duration - 1));
    });
}

function syncStartControls(track) {
  document
    .querySelectorAll(`[data-track-control="${track.id}"][data-control="startTime"]`)
    .forEach((range) => {
      range.value = String(track.startTime);
    });

  document
    .querySelectorAll(`[data-track-control="${track.id}"][data-control="startNumber"]`)
    .forEach((number) => {
      number.value = track.startTime.toFixed(1);
    });
}

function applyTrackVolume(track) {
  const video = getTrackVideo(track);
  if (track.audio?.output) {
    track.audio.output.gain.value = track.muted ? 0 : track.volume;
  }

  if (video) {
    video.muted = false;
    video.volume = track.audio ? 1 : track.muted ? 0 : track.volume;
  }
}

function setupTrackAudio(track, video) {
  if (!audioContext || track.audio || !video) {
    return;
  }

  try {
    const source = audioContext.createMediaElementSource(video);
    const low = audioContext.createBiquadFilter();
    const mid = audioContext.createBiquadFilter();
    const high = audioContext.createBiquadFilter();
    const drive = audioContext.createWaveShaper();
    const dryGain = audioContext.createGain();
    const delay = audioContext.createDelay(1);
    const delayGain = audioContext.createGain();
    const reverb = audioContext.createConvolver();
    const reverbGain = audioContext.createGain();
    const output = audioContext.createGain();

    low.type = "lowshelf";
    low.frequency.value = 180;
    mid.type = "peaking";
    mid.frequency.value = 1100;
    mid.Q.value = 0.8;
    high.type = "highshelf";
    high.frequency.value = 3600;
    dryGain.gain.value = 1;
    delay.delayTime.value = 0.25;
    reverb.buffer = createReverbImpulse(audioContext);

    source.connect(low).connect(mid).connect(high).connect(drive);
    drive.connect(dryGain).connect(output);
    drive.connect(delay).connect(delayGain).connect(output);
    drive.connect(reverb).connect(reverbGain).connect(output);
    output.connect(audioContext.destination);

    track.audio = {
      source,
      low,
      mid,
      high,
      drive,
      delay,
      delayGain,
      reverb,
      reverbGain,
      output,
    };
  } catch (error) {
    console.warn(error);
    track.audio = null;
  }
}

function applyTrackFx(track) {
  const audio = track.audio;
  if (!audio) {
    return;
  }

  audio.low.gain.value = track.fx.eqLow;
  audio.mid.gain.value = track.fx.eqMid;
  audio.high.gain.value = track.fx.eqHigh;
  audio.drive.curve = createTubeCurve(track.fx.tube);
  audio.drive.oversample = "4x";
  audio.delay.delayTime.value = 0.12 + track.fx.delay * 0.5;
  audio.delayGain.gain.value = track.fx.delay * 0.42;
  audio.reverbGain.gain.value = track.fx.reverb * 0.45;
}

function applyVideoFx(track) {
  const cell = document.querySelector(`[data-track-id="${track.id}"]`);
  if (!cell) {
    return;
  }

  const lowLift = Math.max(track.fx.eqLow, 0) / 12;
  const midCut = Math.max(-track.fx.eqMid, 0) / 12;
  const highLift = Math.max(track.fx.eqHigh, 0) / 12;
  const highCut = Math.max(-track.fx.eqHigh, 0) / 12;
  const tube = track.fx.tube;
  const delay = track.fx.delay;
  const reverb = track.fx.reverb;

  const brightness = 0.86 + highLift * 0.3 - highCut * 0.22 + lowLift * 0.06;
  const contrast = 1 + tube * 0.45 + Math.max(track.fx.eqMid, 0) * 0.018;
  const saturate = 0.92 + lowLift * 0.25 + highLift * 0.18 + tube * 0.75;
  const blur = reverb * 2.2 + highCut * 1.4 + midCut * 0.6;
  const hue = track.fx.eqMid * 1.6;

  cell.style.setProperty("--delay-ghost", delay.toFixed(2));
  cell.style.setProperty("--reverb-glow", reverb.toFixed(2));
  cell.style.setProperty(
    "--video-filter",
    `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) blur(${blur}px) hue-rotate(${hue}deg)`,
  );
}

function disposeTrackAudio(track) {
  if (!track.audio) {
    return;
  }

  Object.values(track.audio).forEach((node) => {
    if (node?.disconnect) {
      try {
        node.disconnect();
      } catch {
        // Already disconnected.
      }
    }
  });

  track.audio = null;
}

function createTubeCurve(amount) {
  const samples = 256;
  const curve = new Float32Array(samples);
  const drive = 1 + amount * 36;

  for (let index = 0; index < samples; index += 1) {
    const x = (index * 2) / samples - 1;
    curve[index] = ((1 + drive) * x) / (1 + drive * Math.abs(x));
  }

  return curve;
}

function createReverbImpulse(context) {
  const seconds = 1.6;
  const length = context.sampleRate * seconds;
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 2.4;
    }
  }

  return impulse;
}

function safeStartTime(track, video) {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return track.startTime;
  }

  return Math.min(track.startTime, Math.max(video.duration - 0.2, 0));
}

function getTrackVideo(track) {
  return document.querySelector(`#video-${track.id}`);
}

function updateTrackTriggerGrid(startAt = performance.now()) {
  if (!transport) {
    return;
  }

  const beatMs = 60000 / transport.bpm;
  const barMs = beatMs * 4;
  tracks.forEach((track) => {
    track.stepMs = barMs / track.retriggersPerBar;
    track.nextTriggerAt = startAt;
  });
}

function queueTrackSearch(track, query) {
  window.clearTimeout(track.searchTimer);

  if (query.length < 2) {
    renderTrackResults(track, []);
    return;
  }

  track.searchTimer = window.setTimeout(() => searchTrackSource(track, query), SEARCH_DELAY_MS);
}

async function searchTrackSource(track, query) {
  const requestId = ++trackSearchRequestCounter;
  track.searchRequestId = requestId;
  renderTrackResultsMessage(track, "Searching...");

  const params = new URLSearchParams({
    q: `mediatype:(movies) AND (${query})`,
    sort: "downloads desc",
    rows: "24",
    page: "1",
    output: "json",
  });

  ["identifier", "title", "creator", "year", "description", "runtime"].forEach((field) => {
    params.append("fl[]", field);
  });

  try {
    const docs = await performArchiveSearch(params);
    if (track.searchRequestId !== requestId) {
      return;
    }

    const results = rankAndFilterResults(normalizeResults(docs), track.durationFilter);
    if (results.length) {
      renderTrackResults(track, results);
    } else {
      renderTrackResultsMessage(track, "No matches");
    }
  } catch (error) {
    if (track.searchRequestId !== requestId) {
      return;
    }

    renderTrackResultsMessage(track, "Search failed");
    console.error(error);
  }
}

function rankAndFilterResults(results, filterKey = "any") {
  const filter = DURATION_FILTERS[filterKey] ?? DURATION_FILTERS.any;

  return results
    .filter((result) => {
      if (filterKey === "any") {
        return true;
      }

      return result.durationSeconds >= filter.min && result.durationSeconds < filter.max;
    })
    .sort((a, b) => a.durationSeconds - b.durationSeconds || a.title.localeCompare(b.title))
    .slice(0, 6);
}

function renderTrackResults(track, results) {
  const resultsEl = document.querySelector(`#results-${track.id}`);
  if (!resultsEl) {
    return;
  }

  if (!results.length) {
    resultsEl.hidden = true;
    resultsEl.innerHTML = "";
    return;
  }

  resultsEl.hidden = false;
  resultsEl.innerHTML = results
    .map(
      (result) => `
        <button class="track-result-button" type="button" data-track-id="${track.id}" data-source-id="${result.identifier}">
          <img src="${result.thumbnail}" alt="" loading="lazy">
          <span>
            <strong>${escapeHtml(result.title)}</strong>
            <small>${escapeHtml(formatResultMeta(result))}</small>
          </span>
        </button>
      `,
    )
    .join("");

  resultsEl.querySelectorAll(".track-result-button").forEach((button) => {
    button.addEventListener("click", () => {
      const result = results.find((item) => item.identifier === button.dataset.sourceId);
      if (result) {
        loadTrackSource(track, result);
      }
    });
  });
}

function formatResultMeta(result) {
  const credit = [result.creator, result.year].filter(Boolean).join(" - ") || result.identifier;
  return [result.runtime, credit].filter(Boolean).join(" | ");
}

function renderTrackResultsMessage(track, message) {
  const resultsEl = document.querySelector(`#results-${track.id}`);
  if (!resultsEl) {
    return;
  }

  resultsEl.hidden = false;
  resultsEl.innerHTML = `<div class="track-result-message">${escapeHtml(message)}</div>`;
}

async function loadTrackSource(track, result) {
  stopTransport(false);
  disposeTrackAudio(track);
  setStatus(`${track.name}: loading`);
  renderTrackResultsMessage(track, "Loading media...");

  try {
    const source = await fetchPlayableSource(result);
    track.source = source;
    track.startTime = 0;
    track.lastStep = -1;
    selectedSource = tracks.find((item) => item.source)?.source ?? source;
    renderWorkstation();
    setStatus(`${track.name}: ready`);
  } catch (error) {
    renderTrackResultsMessage(track, "No playable file");
    setStatus(`${track.name}: no file`, true);
    console.warn(error);
  }
}

function handleTrackSearchKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  const track = tracks.find((item) => item.id === event.currentTarget.dataset.trackControl);
  if (track) {
    renderTrackResults(track, []);
  }
}

function createInitialTracks() {
  return TRACKS.map((track, index) => ({
    ...track,
    id: `track-${index + 1}`,
    startTime: index * 2,
    retriggersPerBar: [1, 2, 4, 8][index],
    volume: 0.55,
    muted: false,
    fx: {
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      tube: 0,
      delay: 0,
      reverb: 0,
    },
    audio: null,
    lastStep: -1,
    nextTriggerAt: 0,
    stepMs: 0,
    source: null,
    durationFilter: "any",
    searchTimer: null,
    searchRequestId: 0,
  }));
}

function setStatus(message, isError = false) {
  statusPill.textContent = message;
  statusPill.classList.toggle("error", isError);
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value || min, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
