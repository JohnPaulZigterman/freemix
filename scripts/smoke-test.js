const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SERVER_URL = process.env.FREEMIX_SMOKE_URL || "http://localhost:4200";
const JS_FILES = [
  "app.js",
  "app-render.js",
  "app-state.js",
  "app-events.js",
  "app-debug.js",
  "server.js",
  "scripts/smoke-test.js",
];

const messages = [];
const errors = [];
const warnings = [];

function log(message) {
  messages.push(message);
  console.log(message);
}

function fail(message) {
  throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runSyntaxChecks() {
  log("Checking JavaScript syntax...");
  JS_FILES.forEach((file) => {
    const result = spawnSync(process.execPath, ["--check", file], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
    if (result.status !== 0) {
      const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
      fail(`Syntax check failed for ${file}\n${output}`);
    }
    log(`  ok: ${file}`);
  });
}

async function fetchWithTimeout(url, timeoutMs = 2000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function isServerReachable() {
  try {
    const response = await fetchWithTimeout(SERVER_URL, 2000);
    return response.ok || (response.status >= 300 && response.status < 500);
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReachable()) {
      return true;
    }
    await sleep(200);
  }
  return false;
}

async function ensureServer() {
  if (await isServerReachable()) {
    log(`Server reachable: ${SERVER_URL}`);
    return null;
  }

  log("Starting local Freemix server...");
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    stdio: "ignore",
    windowsHide: true,
  });

  if (!(await waitForServer(12000))) {
    try {
      child.kill();
    } catch {
      // Best effort cleanup.
    }
    fail(`Server did not become reachable at ${SERVER_URL}`);
  }

  log(`Server started: ${SERVER_URL}`);
  return child;
}

function findChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.GOOGLE_CHROME_BIN,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    path.join(os.homedir(), "AppData/Local/Google/Chrome/Application/chrome.exe"),
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    path.join(os.homedir(), "AppData/Local/Microsoft/Edge/Application/msedge.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function fetchJson(url, timeoutMs = 5000) {
  const response = await fetchWithTimeout(url, timeoutMs);
  if (!response.ok) {
    fail(`${url} returned HTTP ${response.status}`);
  }
  return response.json();
}

async function waitForJson(url, timeoutMs = 10000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await fetchJson(url, 2000);
    } catch (error) {
      lastError = error;
      await sleep(150);
    }
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function isIgnorableBrowserMessage(message) {
  return /favicon\.ico/i.test(message || "");
}

async function runBrowserSmoke() {
  if (process.env.FREEMIX_SMOKE_SKIP_BROWSER === "1") {
    log("Skipping browser smoke because FREEMIX_SMOKE_SKIP_BROWSER=1");
    return;
  }

  if (typeof WebSocket !== "function") {
    fail("Browser smoke requires a Node runtime with WebSocket support.");
  }

  const chromePath = findChromePath();
  if (!chromePath) {
    fail("Chrome or Edge was not found. Set CHROME_PATH or run with FREEMIX_SMOKE_SKIP_BROWSER=1.");
  }

  const port = await getFreePort();
  const userDataDir = path.join(os.tmpdir(), `freemix-smoke-${Date.now()}`);
  let chrome = null;
  let ws = null;
  let nextId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    const id = nextId;
    nextId += 1;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!pending.has(id)) {
          return;
        }
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 10000);
      pending.set(id, { resolve, reject, method, timeout });
    });
  }

  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      fail(description || "Browser evaluation failed.");
    }
    return result.result?.value;
  }

  try {
    log("Launching browser smoke...");
    chrome = spawn(chromePath, [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
      SERVER_URL,
    ], {
      stdio: "ignore",
      windowsHide: true,
    });

    await waitForJson(`http://127.0.0.1:${port}/json/version`, 10000);
    const targets = await waitForJson(`http://127.0.0.1:${port}/json/list`, 10000);
    const target = targets.find((entry) => entry.type === "page") || targets[0];
    if (!target?.webSocketDebuggerUrl) {
      fail("No browser page target was available.");
    }

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });

    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const entry = pending.get(message.id);
        pending.delete(message.id);
        clearTimeout(entry.timeout);
        if (message.error) {
          entry.reject(new Error(`${entry.method}: ${message.error.message}`));
        } else {
          entry.resolve(message.result || {});
        }
        return;
      }

      if (message.method === "Runtime.exceptionThrown") {
        const description =
          message.params?.exceptionDetails?.exception?.description ||
          message.params?.exceptionDetails?.text ||
          "Runtime exception";
        if (!isIgnorableBrowserMessage(description)) {
          errors.push(description);
        }
      }

      if (message.method === "Runtime.consoleAPICalled") {
        const text = (message.params?.args || []).map((arg) => arg.value ?? arg.description ?? "").join(" ");
        const type = message.params?.type || "log";
        const line = `${type}: ${text}`;
        if (isIgnorableBrowserMessage(line)) {
          return;
        }
        if (type === "error") {
          errors.push(line);
        } else if (type === "warning" || type === "warn") {
          warnings.push(line);
        }
      }

      if (message.method === "Log.entryAdded") {
        const entry = message.params?.entry;
        if (!entry) {
          return;
        }
        const line = `${entry.level}: ${entry.text}`;
        if (isIgnorableBrowserMessage(line)) {
          return;
        }
        if (entry.level === "error") {
          errors.push(line);
        } else if (entry.level === "warning") {
          warnings.push(line);
        }
      }
    });

    await send("Runtime.enable");
    await send("Page.enable");
    await send("Log.enable");
    await send("Page.navigate", { url: SERVER_URL });
    await sleep(1800);

    const initialState = await evaluate(`(() => ({
      title: document.title,
      status: document.querySelector("#statusPill")?.textContent?.trim() || "",
      hasPlayerPanel: !!document.querySelector("#playerPanel"),
      hasPlaybackEngine: !!window.freemixPlaybackEngine,
      trackCells: document.querySelectorAll(".video-cell").length,
      arrangementCells: document.querySelectorAll(".arrangement-cell").length,
      arrangementActions: {
        capture: !!document.querySelector("#arrangementCaptureButton"),
        copy: !!document.querySelector("#arrangementCopyButton"),
        paste: !!document.querySelector("#arrangementPasteButton"),
        delete: !!document.querySelector("#arrangementDeleteButton"),
        fill: !!document.querySelector("#arrangementCopyAllButton"),
      },
      specialTracks: {
        text: !!document.querySelector(".arrangement-text-row"),
        drum: !!document.querySelector(".arrangement-drum-row"),
      },
      textEditor: {
        panel: !!document.querySelector(".text-editor-row"),
        field: !!(
          document.querySelector('[data-text-control="text"]') ||
          document.querySelector(".text-editor-row textarea") ||
          document.querySelector('.text-editor-row input[type="text"]')
        ),
      },
      drumEditor: {
        panel: !!document.querySelector(".drum-editor-row"),
        pads: document.querySelectorAll(".drum-step-button").length,
      },
      exportButtons: {
        clip: !!document.querySelector("#exportClipButton"),
        arrangement: !!document.querySelector("#exportArrangementButton"),
      },
    }))()`);

    if (initialState.title !== "FREEMIX VM-420") {
      fail(`Unexpected page title: ${initialState.title}`);
    }
    if (!initialState.hasPlayerPanel) {
      fail("Player panel did not render.");
    }
    if (!initialState.hasPlaybackEngine) {
      fail("Playback engine facade is missing.");
    }
    if (initialState.trackCells < 1) {
      fail("No track video cells rendered.");
    }
    if (initialState.arrangementCells < 1) {
      fail("No arrangement cells rendered.");
    }
    const missingArrangementActions = Object.entries(initialState.arrangementActions)
      .filter(([, present]) => !present)
      .map(([name]) => name);
    if (missingArrangementActions.length) {
      fail(`Arrangement actions missing: ${missingArrangementActions.join(", ")}`);
    }
    if (!initialState.specialTracks.text || !initialState.specialTracks.drum) {
      fail("Special arrangement tracks did not render.");
    }
    if (!initialState.textEditor.panel || !initialState.textEditor.field) {
      fail("Text editor controls did not render.");
    }
    if (!initialState.drumEditor.panel || initialState.drumEditor.pads < 1) {
      fail("Drum editor controls did not render.");
    }
    if (!initialState.exportButtons.clip || !initialState.exportButtons.arrangement) {
      fail("Export buttons did not render.");
    }

    const interactionState = await evaluate(`(async () => {
      const results = [];
      const clip = window.freemixPlaybackEngine.normalizeClipState({
        startTime: 12.5,
        retriggersPerBar: 4,
        volume: 0.8,
        fx: { eqLow: 6, tube: 0.4 },
      });
      results.push({
        action: "normalize clip",
        startTime: clip.startTime,
        density: clip.retriggersPerBar,
        volume: clip.volume,
        fxLow: clip.fx.eqLow,
        schemaVersion: clip.schemaVersion,
        timingMode: clip.timingMode,
        notesLength: clip.notes.length,
        automationKeys: Object.keys(clip.automation).length,
      });
      const retriggerClip = window.freemixPlaybackEngine.normalizeClipState({
        source: { mediaUrl: "https://example.com/retrigger.mp4" },
        startTime: 3,
        retriggersPerBar: 4,
        volume: 0.5,
        pitch: 2,
        automation: {
          volume: {
            enabled: true,
            interpolation: "linear",
            points: [
              { beat: 0, value: 0.25 },
              { beat: 2, value: 0.75 },
            ],
          },
        },
      });
      const retriggerEvents = window.freemixPlaybackEngine.getClipPlaybackEvents(retriggerClip, 0, 4, {
        trackId: "smoke-track",
        beatMs: 500,
      });
      const retriggerPulseState = window.freemixPlaybackEngine.getRetriggerPlaybackStateForPulse(
        { id: "smoke-track" },
        retriggerClip,
        2,
        4,
        500,
      );
      const pianoClip = window.freemixPlaybackEngine.normalizeClipState({
        source: { mediaUrl: "https://example.com/piano.mp4" },
        timingMode: "pianoRoll",
        startTime: 9,
        volume: 0.8,
        notes: [
          {
            id: "smoke-note",
            startBeat: 1,
            durationBeats: 0.5,
            pitchSemitones: 7,
            velocity: 0.5,
          },
        ],
      });
      const pianoEvents = window.freemixPlaybackEngine.getClipPlaybackEvents(pianoClip, 0, 4, {
        trackId: "smoke-track",
        beatMs: 500,
      });
      const pianoEventState = window.freemixPlaybackEngine.createClipEventPlaybackState(pianoClip, pianoEvents[0]);
      results.push({
        action: "clip scheduler",
        retriggerCount: retriggerEvents.length,
        retriggerBeats: retriggerEvents.map((entry) => entry.localBeat),
        retriggerVolumeAtPulseTwo: Number(retriggerPulseState.volume.toFixed(3)),
        retriggerStartTimeAtPulseTwo: retriggerPulseState.startTime,
        pianoCount: pianoEvents.length,
        pianoBeat: pianoEvents[0]?.localBeat,
        pianoDuration: pianoEvents[0]?.durationBeats,
        pianoPitch: pianoEventState.pitch,
        pianoVolume: Number(pianoEventState.volume.toFixed(3)),
      });
      window.freemixToggleDebugPanel?.(true);
      window.freemixToggleDebugPanel?.(false);
      const firstAvCell = document.querySelector('.arrangement-cell[data-arr-track]:not(.arrangement-text-cell):not(.arrangement-drum-cell)[data-arr-step="0"]');
      if (!firstAvCell) {
        throw new Error("First A/V arrangement cell missing.");
      }
      firstAvCell.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      results.push({
        action: "select av clip",
        selected: firstAvCell.classList.contains("selected"),
        targetLabel: document.querySelector("#selectedTargetLabel")?.textContent?.trim() || "",
      });
      const timingModeSelect = document.querySelector('[data-track-control="track-1"][data-control="timingMode"]');
      if (!timingModeSelect) {
        throw new Error("Timing mode control missing.");
      }
      timingModeSelect.value = "pianoRoll";
      timingModeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 100));
      const snapSelect = document.querySelector('[data-track-control="track-1"][data-control="pianoSnap"]');
      if (snapSelect) {
        snapSelect.value = "1/8";
        snapSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      const rootSelect = document.querySelector('[data-track-control="track-1"][data-control="pianoRoot"]');
      if (rootSelect) {
        rootSelect.value = "D";
        rootSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      const firstPianoCell = document.querySelector('[data-piano-cell="true"][data-track-control="track-1"][data-note-pitch="0"]');
      if (firstPianoCell) {
        const rect = firstPianoCell.getBoundingClientRect();
        firstPianoCell.dispatchEvent(new PointerEvent("pointerdown", {
          bubbles: true,
          clientX: rect.left + Math.max(1, rect.width / 2),
          clientY: rect.top + Math.max(1, rect.height / 2),
          pointerId: 1,
          pointerType: "mouse",
        }));
        document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "mouse" }));
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      const duplicateButton = document.querySelector('[data-track-control="track-1"][data-control="pianoDuplicateNote"]');
      duplicateButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const quantizeButton = document.querySelector('[data-track-control="track-1"][data-control="pianoQuantizeNotes"]');
      quantizeButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const activeTarget = window.freemixPlaybackEngine.getActiveEditTarget?.();
      const activeClip = activeTarget?.clip || activeTarget?.state || null;
      results.push({
        action: "piano roll ui",
        editor: !!document.querySelector('[data-piano-roll-editor="track-1"]'),
        snap: document.querySelector('[data-track-control="track-1"][data-control="pianoSnap"]')?.value || "",
        root: document.querySelector('[data-track-control="track-1"][data-control="pianoRoot"]')?.value || "",
        noteCount: activeClip?.notes?.length || 0,
        selectedTiming: activeClip?.timingMode || "",
        clipSnap: activeClip?.pianoSnap || "",
        clipRoot: activeClip?.pianoRoot || "",
        duplicateEnabled: duplicateButton ? !duplicateButton.disabled : false,
        quantizeEnabled: quantizeButton ? !quantizeButton.disabled : false,
      });
      const textCell = document.querySelector('.arrangement-text-cell[data-arr-step="0"]');
      if (!textCell) {
        throw new Error("First TEXT arrangement cell missing.");
      }
      textCell.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const textInput =
        document.querySelector('[data-text-control="text"]') ||
        document.querySelector(".text-editor-row textarea") ||
        document.querySelector('.text-editor-row input[type="text"]');
      if (textInput) {
        textInput.value = "SMOKE TEXT";
        textInput.dispatchEvent(new Event("input", { bubbles: true }));
        textInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      results.push({
        action: "edit text clip",
        selected: textCell.classList.contains("selected"),
        hasInput: !!textInput,
        disabled: !!textInput?.disabled,
        value: textInput?.value || "",
      });
      const drumCell = document.querySelector('.arrangement-drum-cell[data-arr-step="0"]');
      if (!drumCell) {
        throw new Error("First DRUM arrangement cell missing.");
      }
      drumCell.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const drumPad = document.querySelector(".drum-step-button");
      drumPad?.click();
      results.push({
        action: "edit drum clip",
        selected: drumCell.classList.contains("selected"),
        pads: document.querySelectorAll(".drum-step-button").length,
      });
      results.push({
        action: "export controls",
        clipButton: !!document.querySelector("#exportClipButton"),
        arrangementButton: !!document.querySelector("#exportArrangementButton"),
        exporting: !!window.freemixIsExportingVideo?.(),
      });
      const playButton = document.querySelector("#playButton");
      if (!playButton || playButton.disabled) {
        throw new Error("Play button missing or disabled.");
      }
      playButton.click();
      await new Promise((resolve) => setTimeout(resolve, 650));
      results.push({
        action: "play",
        status: document.querySelector("#statusPill")?.textContent?.trim() || "",
        active: !!window.freemixGetDebugSnapshot?.().transport?.active,
      });
      const stopButton = document.querySelector("#stopButton");
      if (!stopButton || stopButton.disabled) {
        throw new Error("Stop button missing or disabled.");
      }
      stopButton.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
      results.push({
        action: "stop",
        status: document.querySelector("#statusPill")?.textContent?.trim() || "",
        active: !!window.freemixGetDebugSnapshot?.().transport?.active,
      });
      return results;
    })()`);

    const normalizedClip = interactionState.find((entry) => entry.action === "normalize clip");
    if (
      normalizedClip?.startTime !== 12.5 ||
      normalizedClip?.density !== 4 ||
      normalizedClip?.volume !== 0.8 ||
      normalizedClip?.fxLow !== 6 ||
      normalizedClip?.schemaVersion !== 3 ||
      normalizedClip?.timingMode !== "retrigger" ||
      normalizedClip?.notesLength !== 0 ||
      normalizedClip?.automationKeys !== 0
    ) {
      fail(`Clip normalization smoke failed: ${JSON.stringify(normalizedClip)}`);
    }

    const clipScheduler = interactionState.find((entry) => entry.action === "clip scheduler");
    if (
      clipScheduler?.retriggerCount !== 4 ||
      JSON.stringify(clipScheduler.retriggerBeats) !== JSON.stringify([0, 1, 2, 3]) ||
      clipScheduler.retriggerVolumeAtPulseTwo !== 0.75 ||
      clipScheduler.retriggerStartTimeAtPulseTwo !== 3 ||
      clipScheduler.pianoCount !== 1 ||
      clipScheduler.pianoBeat !== 1 ||
      clipScheduler.pianoDuration !== 0.5 ||
      clipScheduler.pianoPitch !== 7 ||
      clipScheduler.pianoVolume !== 0.4
    ) {
      fail(`Clip scheduler smoke failed: ${JSON.stringify(clipScheduler)}`);
    }

    const avSelection = interactionState.find((entry) => entry.action === "select av clip");
    if (!avSelection?.selected) {
      fail(`A/V arrangement selection smoke failed: ${JSON.stringify(avSelection)}`);
    }

    const pianoRollUi = interactionState.find((entry) => entry.action === "piano roll ui");
    if (
      !pianoRollUi?.editor ||
      pianoRollUi.snap !== "1/8" ||
      pianoRollUi.root !== "D" ||
      pianoRollUi.selectedTiming !== "pianoRoll" ||
      pianoRollUi.clipSnap !== "1/8" ||
      pianoRollUi.clipRoot !== "D" ||
      pianoRollUi.noteCount < 2 ||
      !pianoRollUi.duplicateEnabled ||
      !pianoRollUi.quantizeEnabled
    ) {
      fail(`Piano roll UI smoke failed: ${JSON.stringify(pianoRollUi)}`);
    }

    const textEdit = interactionState.find((entry) => entry.action === "edit text clip");
    if (!textEdit?.selected || !textEdit.hasInput || textEdit.disabled || textEdit.value !== "SMOKE TEXT") {
      fail(`Text clip edit smoke failed: ${JSON.stringify(textEdit)}`);
    }

    const drumEdit = interactionState.find((entry) => entry.action === "edit drum clip");
    if (!drumEdit?.selected || drumEdit.pads < 1) {
      fail(`Drum clip edit smoke failed: ${JSON.stringify(drumEdit)}`);
    }

    const exportControls = interactionState.find((entry) => entry.action === "export controls");
    if (!exportControls?.clipButton || !exportControls.arrangementButton || exportControls.exporting) {
      fail(`Export control smoke failed: ${JSON.stringify(exportControls)}`);
    }

    const playResult = interactionState.find((entry) => entry.action === "play");
    if (!playResult?.active) {
      fail(`Play smoke did not activate transport: ${JSON.stringify(playResult)}`);
    }

    const stopResult = interactionState.find((entry) => entry.action === "stop");
    if (stopResult?.active) {
      fail(`Stop smoke did not stop transport: ${JSON.stringify(stopResult)}`);
    }

    if (errors.length) {
      fail(`Browser runtime errors:\n${errors.join("\n")}`);
    }

    warnings.forEach((warning) => log(`  warning: ${warning}`));
    log("Browser smoke passed.");
  } finally {
    pending.forEach((entry) => clearTimeout(entry.timeout));
    pending.clear();
    try {
      ws?.close();
    } catch {
      // Already closed.
    }
    try {
      chrome?.kill();
    } catch {
      // Already closed.
    }
    await sleep(250);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Chrome can briefly hold profile files after shutdown; the OS temp cleanup can finish the job.
    }
  }
}

async function main() {
  runSyntaxChecks();
  const serverProcess = await ensureServer();
  try {
    await runBrowserSmoke();
    log("Freemix smoke test passed.");
  } finally {
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch {
        // Already stopped.
      }
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
