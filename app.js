const searchInput = document.querySelector("#searchInput");
const searchBox = document.querySelector(".search-box");
const resultsPopover = document.querySelector("#resultsPopover");
const resultsList = document.querySelector("#resultsList");
const playerPanel = document.querySelector("#playerPanel");
const statusPill = document.querySelector("#statusPill");

const IA_SEARCH_URL = "https://archive.org/advancedsearch.php";
const SEARCH_DELAY_MS = 280;
const RESULT_LIMIT = 12;

let debounceTimer = null;
let activeIndex = -1;
let currentResults = [];
let requestCounter = 0;

searchInput.addEventListener("input", () => {
  window.clearTimeout(debounceTimer);
  const query = searchInput.value.trim();

  if (query.length < 2) {
    currentResults = [];
    hideResults();
    setStatus("Ready");
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
    const response = await fetch(`${IA_SEARCH_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Search failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (requestId !== requestCounter) {
      return;
    }

    currentResults = normalizeResults(payload.response?.docs ?? []);
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
      embedUrl: `https://archive.org/embed/${encodeURIComponent(doc.identifier)}`,
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

function selectResult(result) {
  searchInput.value = result.title;
  hideResults();
  setStatus("Loaded");

  const meta = [result.creator, result.year].filter(Boolean).join(" - ");
  playerPanel.innerHTML = `
    <iframe
      class="video-frame"
      src="${result.embedUrl}"
      title="${escapeHtml(result.title)}"
      allow="fullscreen; autoplay"
      allowfullscreen
    ></iframe>
    <div class="video-details">
      <div>
        <h2>${escapeHtml(result.title)}</h2>
        <p>${escapeHtml(meta || "Internet Archive video")}</p>
      </div>
      <a class="archive-link" href="${result.archiveUrl}" target="_blank" rel="noreferrer">
        View archive page
      </a>
    </div>
  `;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
