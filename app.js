const searchInput = document.querySelector("#searchInput");
const searchBox = document.querySelector(".search-box");
const resultsPopover = document.querySelector("#resultsPopover");
const resultsList = document.querySelector("#resultsList");
const playerPanel = document.querySelector("#playerPanel");
const statusPill = document.querySelector("#statusPill");

const IA_SEARCH_URL = "https://archive.org/advancedsearch.php";
const IA_METADATA_URL = "https://archive.org/metadata";
const IA_DOWNLOAD_URL = "https://archive.org/download";
const SEARCH_DELAY_MS = 280;
const RESULT_LIMIT = 12;
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

let debounceTimer = null;
let activeIndex = -1;
let currentResults = [];
let requestCounter = 0;
let selectedSource = null;
let transport = null;
let audioContext = null;
let masterMuted = false;
let tracks = createInitialTracks();
let trackSearchRequestCounter = 0;

searchInput.addEventListener("input", () => {
  window.clearTimeout(debounceTimer);
  const query = searchInput.value.trim();

  if (query.length < 2) {
    currentResults = [];
    hideResults();
    setStatus(selectedSource ? "Loaded" : "Ready");
    return;
  }

  setStatus("Typing...");
  debounceTimer = window.setTimeout(() => searchArchive(query), SEARCH_DELAY_MS);
});

searchInput.addEventListener("keydown", (event) => {
  if (resultsPopover.hidden || currentResults.length === 0) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    setActiveIndex(Math.min(activeIndex + 1, currentResults.length - 1));
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    setActiveIndex(Math.max(activeIndex - 1, 0));
  }

  if (event.key === "Enter" && activeIndex >= 0) {
    event.preventDefault();
    selectResult(currentResults[activeIndex]);
  }

  if (event.key === "Escape") {
    hideResults();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-panel")) {
    hideResults();
  }
});

async function searchArchive(query) {
  const requestId = ++requestCounter;
  setStatus("Searching...");
  showMessage("Searching Internet Archive...");

  const params = new URLSearchParams({
    q: `mediatype:(movies) AND (${query})`,
    sort: "downloads desc",
    rows: String(RESULT_LIMIT),
    page: "1",
    output: "json",
  });

  ["identifier", "title", "creator", "year", "description"].forEach((field) => {
    params.append("fl[]", field);
  });

  try {
    const docs = await performArchiveSearch(params);
    if (requestId !== requestCounter) {
      return;
    }

    currentResults = normalizeResults(docs);
    activeIndex = currentResults.length ? 0 : -1;
    renderResults(currentResults);
    setStatus(currentResults.length ? `${currentResults.length} found` : "No matches");
  } catch (error) {
    if (requestId !== requestCounter) {
      return;
    }

    currentResults = [];
    showMessage("Search is unavailable right now. Try again in a moment.");
    setStatus("Search error", true);
    console.error(error);
  }
}

function normalizeResults(docs) {
  return docs
    .filter((doc) => doc.identifier)
    .map((doc) => ({
      identifier: doc.identifier,
      title: textValue(doc.title) || doc.identifier,
      creator: textValue(doc.creator),
      year: textValue(doc.year),
      description: textValue(doc.description),
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

function renderResults(results) {
  resultsList.innerHTML = "";

  if (!results.length) {
    showMessage("No videos found. Try a broader search.");
    return;
  }

  const fragment = document.createDocumentFragment();

  results.forEach((result, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.className = "result-button";
    button.type = "button";
    button.role = "option";
    button.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
    button.addEventListener("click", () => selectResult(result));
    button.addEventListener("mouseenter", () => setActiveIndex(index));

    const meta = [result.creator, result.year].filter(Boolean).join(" - ");

    button.innerHTML = `
      <span class="thumb"><img src="${result.thumbnail}" alt="" loading="lazy"></span>
      <span>
        <span class="result-title">${escapeHtml(result.title)}</span>
        <span class="result-meta">${escapeHtml(meta || result.identifier)}</span>
        ${
          result.description
            ? `<span class="result-description">${escapeHtml(result.description)}</span>`
            : ""
        }
      </span>
    `;

    item.append(button);
    fragment.append(item);
  });

  resultsList.append(fragment);
  showResults();
  setActiveIndex(activeIndex);
}

async function selectResult(result) {
  stopTransport();
  searchInput.value = result.title;
  hideResults();
  setStatus("Loading media...");
  renderLoadingSource(result);

  try {
    const source = await fetchPlayableSource(result);
    selectedSource = source;
    tracks = createInitialTracks().map((track) => ({ ...track, source }));
    renderWorkstation();
    setStatus("4 tracks loaded");
  } catch (error) {
    selectedSource = null;
    setStatus("No media file", true);
    renderSourceError(result);
    console.warn(error);
  }
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

function renderLoadingSource(result) {
  playerPanel.innerHTML = `
    <div class="empty-state compact-state">
      <div class="play-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10h-3a7 7 0 1 1-7-7V2Z" /></svg>
      </div>
      <h2>Loading Source</h2>
      <p>${escapeHtml(result.title)}</p>
    </div>
  `;
}

function renderSourceError(result) {
  playerPanel.innerHTML = `
    <div class="empty-state compact-state">
      <div class="play-mark warning" aria-hidden="true">!</div>
      <h2>Try Another Video</h2>
      <p>${escapeHtml(result.title)} does not expose a direct browser-playable video file.</p>
      <a class="archive-link" href="${result.archiveUrl}" target="_blank" rel="noreferrer">
        View archive page
      </a>
    </div>
  `;
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

      <div class="track-grid">
        ${tracks.map((track) => renderTrack(track)).join("")}
      </div>
    </section>
  `;

  bindWorkstationControls();
}

function renderTrack(track) {
  const sourceTitle = track.source?.title ?? "No source loaded";
  const sourceMeta = track.source
    ? [track.source.creator, track.source.year].filter(Boolean).join(" - ") || track.source.mediaFormat
    : "Search this track";

  return `
    <article class="track-card ${track.color}" data-track-id="${track.id}">
      <div class="track-video-shell">
        ${
          track.source
            ? `<video
                class="track-video"
                id="video-${track.id}"
                src="${track.source.mediaUrl}"
                preload="metadata"
                playsinline
              ></video>`
            : `<div class="track-empty-video">Search source</div>`
        }
        <div class="track-badge">
          <strong>${escapeHtml(track.name)}</strong>
          <span>${escapeHtml(track.role)}</span>
        </div>
        <div class="trigger-flash" aria-hidden="true"></div>
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
        <div class="track-source-name" title="${escapeHtml(sourceTitle)}">
          <strong>${escapeHtml(sourceTitle)}</strong>
          <span>${escapeHtml(sourceMeta)}</span>
        </div>
        <div class="track-results" id="results-${track.id}" hidden></div>
      </div>
      <div class="track-controls">
        <label class="control-field start-field">
          <span>Find Moment</span>
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
        <label class="control-field">
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
        <label class="control-field">
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
        <button
          class="track-toggle"
          type="button"
          data-track-control="${track.id}"
          data-control="muted"
          aria-pressed="${track.muted}"
        >
          ${track.muted ? "Muted" : "On"}
        </button>
      </div>
    </article>
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
    video.muted = true;
  });
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
  const card = document.querySelector(`[data-track-id="${track.id}"]`);
  if (!video || !card) {
    return;
  }

  video.currentTime = safeStartTime(track, video);
  applyTrackVolume(track);
  video.play().catch(() => {
    setStatus("Tap play again", true);
  });

  card.classList.remove("triggered");
  window.requestAnimationFrame(() => card.classList.add("triggered"));
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
  if (!video) {
    return;
  }

  video.muted = track.muted;
  video.volume = track.muted ? 0 : track.volume;
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
    rows: "6",
    page: "1",
    output: "json",
  });

  ["identifier", "title", "creator", "year", "description"].forEach((field) => {
    params.append("fl[]", field);
  });

  try {
    const docs = await performArchiveSearch(params);
    if (track.searchRequestId !== requestId) {
      return;
    }

    renderTrackResults(track, normalizeResults(docs));
  } catch (error) {
    if (track.searchRequestId !== requestId) {
      return;
    }

    renderTrackResultsMessage(track, "Search failed");
    console.error(error);
  }
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
            <small>${escapeHtml([result.creator, result.year].filter(Boolean).join(" - ") || result.identifier)}</small>
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
    lastStep: -1,
    nextTriggerAt: 0,
    stepMs: 0,
    source: null,
    searchTimer: null,
    searchRequestId: 0,
  }));
}

function setActiveIndex(index) {
  activeIndex = index;

  [...resultsList.querySelectorAll(".result-button")].forEach((button, buttonIndex) => {
    const isActive = buttonIndex === activeIndex;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");

    if (isActive) {
      button.scrollIntoView({ block: "nearest" });
    }
  });
}

function showMessage(message) {
  resultsList.innerHTML = `<li class="message-row">${escapeHtml(message)}</li>`;
  showResults();
}

function showResults() {
  resultsPopover.hidden = false;
  searchBox.setAttribute("aria-expanded", "true");
}

function hideResults() {
  resultsPopover.hidden = true;
  searchBox.setAttribute("aria-expanded", "false");
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
