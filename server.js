const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const crypto = require("node:crypto");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 4200;
const CACHE_DIR = path.join(ROOT, ".freemix-media-cache");
const CACHE_MAX_BYTES = Number(process.env.FREEMIX_CACHE_MAX_BYTES) || 750 * 1024 * 1024;
const CACHE_PRUNE_TARGET_BYTES = Number(process.env.FREEMIX_CACHE_PRUNE_TARGET_BYTES) || Math.floor(CACHE_MAX_BYTES * 0.6);
const CACHE_TEMP_MAX_AGE_MS = Number(process.env.FREEMIX_CACHE_TEMP_MAX_AGE_MS) || 10 * 60 * 1000;
const CACHE_SLICE_MAX_AGE_MS = Number(process.env.FREEMIX_CACHE_SLICE_MAX_AGE_MS) || 6 * 60 * 60 * 1000;
const CACHE_ORIGINAL_MAX_AGE_MS = Number(process.env.FREEMIX_CACHE_ORIGINAL_MAX_AGE_MS) || 60 * 60 * 1000;
const DEFAULT_SLICE_DURATION_SECONDS = 24;
const MAX_SLICE_DURATION_SECONDS = 180;
const cacheInflight = new Map();
const activeCachePaths = new Set();
let ffmpegPath = null;

try {
  ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
} catch {
  ffmpegPath = null;
}

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function sendText(response, statusCode, text, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "access-control-allow-origin": "*",
    "content-type": contentType,
    "content-length": Buffer.byteLength(text),
  });
  response.end(text);
}

function isAllowedProxyUrl(rawUrl) {
  try {
    const target = new URL(rawUrl);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return false;
    }

    const host = target.hostname.toLowerCase();
    return host === "archive.org" || host.endsWith(".archive.org");
  } catch {
    return false;
  }
}

function getCachePaths(targetUrl) {
  const key = crypto.createHash("sha256").update(targetUrl).digest("hex");
  return {
    filePath: path.join(CACHE_DIR, `${key}.media`),
    metaPath: path.join(CACHE_DIR, `${key}.json`),
    tempPath: path.join(CACHE_DIR, `${key}.tmp`),
    playablePath: path.join(CACHE_DIR, `${key}.playable.mp4`),
    playableMetaPath: path.join(CACHE_DIR, `${key}.playable.json`),
    playableTempPath: path.join(CACHE_DIR, `${key}.playable.tmp.mp4`),
  };
}

function getSliceCachePaths(targetUrl, startSeconds, durationSeconds) {
  const normalizedStart = Math.max(0, Number(startSeconds) || 0).toFixed(3);
  const normalizedDuration = Math.max(0.25, Number(durationSeconds) || DEFAULT_SLICE_DURATION_SECONDS).toFixed(3);
  const key = crypto
    .createHash("sha256")
    .update(`${targetUrl}|slice|${normalizedStart}|${normalizedDuration}`)
    .digest("hex");
  return {
    key,
    sliceStart: Number(normalizedStart),
    sliceDuration: Number(normalizedDuration),
    filePath: path.join(CACHE_DIR, `${key}.slice.mp4`),
    metaPath: path.join(CACHE_DIR, `${key}.slice.json`),
    tempPath: path.join(CACHE_DIR, `${key}.slice.tmp.mp4`),
  };
}

async function fileExists(filePath) {
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function readCacheMeta(metaPath) {
  try {
    return JSON.parse(await fs.promises.readFile(metaPath, "utf8"));
  } catch {
    return null;
  }
}

async function removeFileIfExists(filePath) {
  await fs.promises.rm(filePath, { force: true }).catch(() => {});
}

function protectCachePath(filePath) {
  if (filePath) {
    activeCachePaths.add(path.resolve(filePath));
  }
}

function releaseCachePath(filePath) {
  if (filePath) {
    activeCachePaths.delete(path.resolve(filePath));
  }
}

async function cleanupOriginalCacheFiles(paths) {
  await Promise.all([
    removeFileIfExists(paths.filePath),
    removeFileIfExists(paths.metaPath),
    removeFileIfExists(paths.tempPath),
  ]);
}

async function cleanupSliceCacheFiles(paths) {
  await Promise.all([
    removeFileIfExists(paths.filePath),
    removeFileIfExists(paths.metaPath),
    removeFileIfExists(paths.tempPath),
  ]);
}

async function pruneMediaCache(protectedPaths = []) {
  await fs.promises.mkdir(CACHE_DIR, { recursive: true });
  const protectedSet = new Set([
    ...protectedPaths.map((filePath) => path.resolve(filePath)),
    ...activeCachePaths,
  ]);
  const entries = await fs.promises.readdir(CACHE_DIR, { withFileTypes: true }).catch(() => []);
  const files = [];
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const filePath = path.join(CACHE_DIR, entry.name);
    const resolvedPath = path.resolve(filePath);
    if (protectedSet.has(resolvedPath)) {
      continue;
    }

    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat?.isFile()) {
      continue;
    }

    files.push({
      name: entry.name,
      filePath,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    });
  }

  await Promise.all(
    files
      .filter((file) => (file.name.endsWith(".tmp") || file.name.endsWith(".tmp.mp4")) && now - file.mtimeMs > CACHE_TEMP_MAX_AGE_MS)
      .map((file) => removeFileIfExists(file.filePath)),
  );

  await Promise.all(
    files
      .filter((file) => file.name.endsWith(".slice.mp4") || file.name.endsWith(".slice.json"))
      .filter((file) => now - file.mtimeMs > CACHE_SLICE_MAX_AGE_MS)
      .map((file) => removeFileIfExists(file.filePath)),
  );

  await Promise.all(
    files
      .filter((file) => file.name.endsWith(".media") || (/^[a-f0-9]{64}\.json$/i.test(file.name) && !file.name.endsWith(".playable.json") && !file.name.endsWith(".slice.json")))
      .filter((file) => now - file.mtimeMs > CACHE_ORIGINAL_MAX_AGE_MS)
      .map((file) => removeFileIfExists(file.filePath)),
  );

  const refreshedEntries = await fs.promises.readdir(CACHE_DIR, { withFileTypes: true }).catch(() => []);
  const remaining = [];
  for (const entry of refreshedEntries) {
    if (!entry.isFile()) {
      continue;
    }
    const filePath = path.join(CACHE_DIR, entry.name);
    const resolvedPath = path.resolve(filePath);
    if (protectedSet.has(resolvedPath) || entry.name.endsWith(".tmp") || entry.name.endsWith(".tmp.mp4")) {
      continue;
    }
    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (stat?.isFile()) {
      remaining.push({
        name: entry.name,
        filePath,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      });
    }
  }

  let totalBytes = remaining.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes <= CACHE_MAX_BYTES) {
    return;
  }

  const originals = remaining
    .filter((file) => file.name.endsWith(".media") || (/^[a-f0-9]{64}\.json$/i.test(file.name) && !file.name.endsWith(".playable.json") && !file.name.endsWith(".slice.json")))
    .sort((a, b) => a.mtimeMs - b.mtimeMs);

  for (const file of originals) {
    await removeFileIfExists(file.filePath);
    totalBytes -= file.size;
    if (totalBytes <= CACHE_PRUNE_TARGET_BYTES) {
      return;
    }
  }

  const playableFiles = remaining
    .filter(
      (file) =>
        file.name.endsWith(".playable.mp4") ||
        file.name.endsWith(".playable.json") ||
        file.name.endsWith(".slice.mp4") ||
        file.name.endsWith(".slice.json"),
    )
    .sort((a, b) => a.mtimeMs - b.mtimeMs);

  for (const file of playableFiles) {
    await removeFileIfExists(file.filePath);
    totalBytes -= file.size;
    if (totalBytes <= CACHE_PRUNE_TARGET_BYTES) {
      return;
    }
  }
}

async function ensureOriginalCachedMedia(targetUrl) {
  const paths = getCachePaths(targetUrl);
  const existingMeta = await readCacheMeta(paths.metaPath);
  if (existingMeta && await fileExists(paths.filePath)) {
    return { ...paths, meta: existingMeta };
  }

  const inflightKey = `${targetUrl}:original`;
  if (cacheInflight.has(inflightKey)) {
    return cacheInflight.get(inflightKey);
  }

  const cachePromise = (async () => {
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });
    await removeFileIfExists(paths.tempPath);
    protectCachePath(paths.tempPath);

    const upstream = await fetch(targetUrl, {
      headers: {
        "user-agent": "Freemix-VM420/1.0",
        accept: "*/*",
      },
      redirect: "follow",
    });

    if (!upstream.ok || !upstream.body) {
      throw new Error(`Cache fetch failed: ${upstream.status}`);
    }

    await pipeline(Readable.fromWeb(upstream.body), fs.createWriteStream(paths.tempPath));
    const stat = await fs.promises.stat(paths.tempPath);
    const meta = {
      url: targetUrl,
      contentType: upstream.headers.get("content-type") || "application/octet-stream",
      contentLength: stat.size,
      cachedAt: new Date().toISOString(),
    };

    await fs.promises.rename(paths.tempPath, paths.filePath);
    await fs.promises.writeFile(paths.metaPath, JSON.stringify(meta, null, 2));
    await pruneMediaCache([paths.filePath, paths.metaPath]);
    return { ...paths, meta };
  })()
    .catch(async (error) => {
      await removeFileIfExists(paths.tempPath);
      throw error;
    })
    .finally(() => {
      releaseCachePath(paths.tempPath);
      cacheInflight.delete(inflightKey);
    });

  cacheInflight.set(inflightKey, cachePromise);
  return cachePromise;
}

function transcodeMediaToPlayableMp4(inputPath, outputPath, options = {}) {
  if (!ffmpegPath) {
    return Promise.reject(new Error("FFmpeg is not installed."));
  }

  return new Promise((resolve, reject) => {
    protectCachePath(outputPath);
    const isRemoteInput = /^https?:\/\//i.test(inputPath);
    const hasStart = Number.isFinite(Number(options.startSeconds)) && Number(options.startSeconds) > 0;
    const seekArgs = hasStart
      ? ["-ss", String(Math.max(0, Number(options.startSeconds)))]
      : [];
    const inputSeekArgs = options.accurateSeek ? [] : seekArgs;
    const outputSeekArgs = options.accurateSeek ? seekArgs : [];
    const durationArgs = Number.isFinite(Number(options.durationSeconds)) && Number(options.durationSeconds) > 0
      ? ["-t", String(Math.max(0.25, Number(options.durationSeconds)))]
      : [];
    const remoteInputArgs = isRemoteInput
      ? [
          "-user_agent",
          "Freemix-VM420/1.0",
          "-reconnect",
          "1",
          "-reconnect_streamed",
          "1",
          "-reconnect_delay_max",
          "3",
        ]
      : [];
    const ffmpeg = spawn(ffmpegPath, [
      "-hide_banner",
      "-y",
      ...inputSeekArgs,
      ...remoteInputArgs,
      "-i",
      inputPath,
      ...outputSeekArgs,
      ...durationArgs,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-ar",
      "48000",
      "-ac",
      "2",
      outputPath,
    ]);
    let stderr = "";

    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 8000) {
        stderr = stderr.slice(-8000);
      }
    });

    ffmpeg.on("error", (error) => {
      releaseCachePath(outputPath);
      reject(error);
    });
    ffmpeg.on("close", (code) => {
      releaseCachePath(outputPath);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`FFmpeg transcode failed with code ${code}: ${stderr}`));
    });
  });
}

async function ensureCachedMedia(targetUrl) {
  const original = await ensureOriginalCachedMedia(targetUrl);
  const paths = getCachePaths(targetUrl);
  if (!ffmpegPath) {
    await pruneMediaCache([original.filePath, original.metaPath]);
    return original;
  }

  const existingPlayableMeta = await readCacheMeta(paths.playableMetaPath);
  if (existingPlayableMeta && await fileExists(paths.playablePath)) {
    await cleanupOriginalCacheFiles(paths);
    pruneMediaCache([paths.playablePath, paths.playableMetaPath]).catch(console.error);
    return { ...paths, filePath: paths.playablePath, meta: existingPlayableMeta };
  }

  const inflightKey = `${targetUrl}:playable`;
  if (cacheInflight.has(inflightKey)) {
    return cacheInflight.get(inflightKey);
  }

  const playablePromise = (async () => {
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });
    await removeFileIfExists(paths.playableTempPath);
    await transcodeMediaToPlayableMp4(original.filePath, paths.playableTempPath);
    const stat = await fs.promises.stat(paths.playableTempPath);
    const meta = {
      url: targetUrl,
      sourceContentType: original.meta?.contentType || "application/octet-stream",
      contentType: "video/mp4",
      contentLength: stat.size,
      cachedAt: original.meta?.cachedAt || new Date().toISOString(),
      transcodedAt: new Date().toISOString(),
      transcoder: "ffmpeg",
    };

    await fs.promises.rename(paths.playableTempPath, paths.playablePath);
    await fs.promises.writeFile(paths.playableMetaPath, JSON.stringify(meta, null, 2));
    await cleanupOriginalCacheFiles(paths);
    await pruneMediaCache([paths.playablePath, paths.playableMetaPath]);
    return { ...paths, filePath: paths.playablePath, meta };
  })()
    .catch(async (error) => {
      await removeFileIfExists(paths.playableTempPath);
      throw error;
    })
    .finally(() => {
      cacheInflight.delete(inflightKey);
    });

  cacheInflight.set(inflightKey, playablePromise);
  return playablePromise;
}

async function ensureSlicedMedia(targetUrl, startSeconds, durationSeconds) {
  if (!ffmpegPath) {
    return ensureCachedMedia(targetUrl);
  }

  const safeStart = Math.max(0, Number(startSeconds) || 0);
  const safeDuration = Math.max(0.25, Math.min(MAX_SLICE_DURATION_SECONDS, Number(durationSeconds) || DEFAULT_SLICE_DURATION_SECONDS));
  const paths = getSliceCachePaths(targetUrl, safeStart, safeDuration);
  const existingMeta = await readCacheMeta(paths.metaPath);
  if (existingMeta && await fileExists(paths.filePath)) {
    pruneMediaCache([paths.filePath, paths.metaPath]).catch(console.error);
    return { ...paths, meta: existingMeta };
  }

  const inflightKey = `${targetUrl}:slice:${paths.sliceStart}:${paths.sliceDuration}`;
  if (cacheInflight.has(inflightKey)) {
    return cacheInflight.get(inflightKey);
  }

  const slicePromise = (async () => {
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });
    let buildMode = "remote-fast-slice";
    await removeFileIfExists(paths.tempPath);
    try {
      await transcodeMediaToPlayableMp4(targetUrl, paths.tempPath, {
        startSeconds: paths.sliceStart,
        durationSeconds: paths.sliceDuration,
      });
    } catch (remoteError) {
      await removeFileIfExists(paths.tempPath);
      buildMode = "local-accurate-slice";
      const original = await ensureOriginalCachedMedia(targetUrl);
      protectCachePath(original.filePath);
      protectCachePath(original.metaPath);
      try {
        await transcodeMediaToPlayableMp4(original.filePath, paths.tempPath, {
          startSeconds: paths.sliceStart,
          durationSeconds: paths.sliceDuration,
          accurateSeek: true,
        });
      } catch (localError) {
        localError.message = `Remote slice failed (${remoteError.message}); local accurate slice failed (${localError.message})`;
        throw localError;
      } finally {
        releaseCachePath(original.filePath);
        releaseCachePath(original.metaPath);
        await cleanupOriginalCacheFiles(original);
      }
    }
    const stat = await fs.promises.stat(paths.tempPath);
    if (!stat.size || stat.size < 1024) {
      await removeFileIfExists(paths.tempPath);
      throw new Error("Media slice produced an empty output.");
    }
    const meta = {
      url: targetUrl,
      contentType: "video/mp4",
      contentLength: stat.size,
      cachedAt: new Date().toISOString(),
      transcodedAt: new Date().toISOString(),
      transcoder: "ffmpeg",
      buildMode,
      sliceStart: paths.sliceStart,
      sliceDuration: paths.sliceDuration,
    };

    await fs.promises.rename(paths.tempPath, paths.filePath);
    await fs.promises.writeFile(paths.metaPath, JSON.stringify(meta, null, 2));
    await pruneMediaCache([paths.filePath, paths.metaPath]);
    return { ...paths, meta };
  })()
    .catch(async (error) => {
      await removeFileIfExists(paths.tempPath);
      throw error;
    })
    .finally(() => {
      cacheInflight.delete(inflightKey);
    });

  cacheInflight.set(inflightKey, slicePromise);
  return slicePromise;
}

function serveCachedFile(request, response, filePath, meta) {
  const size = Number(meta.contentLength) || fs.statSync(filePath).size;
  const contentType = meta.contentType || "application/octet-stream";
  const baseHeaders = {
    "access-control-allow-origin": "*",
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
    "content-type": contentType,
  };

  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      response.writeHead(416, {
        ...baseHeaders,
        "content-range": `bytes */${size}`,
      });
      response.end();
      return;
    }

    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : size - 1;
    const safeStart = Math.max(0, Math.min(start, size - 1));
    const safeEnd = Math.max(safeStart, Math.min(end, size - 1));
    response.writeHead(206, {
      ...baseHeaders,
      "content-length": safeEnd - safeStart + 1,
      "content-range": `bytes ${safeStart}-${safeEnd}/${size}`,
    });
    fs.createReadStream(filePath, { start: safeStart, end: safeEnd }).pipe(response);
    return;
  }

  response.writeHead(200, {
    ...baseHeaders,
    "content-length": size,
  });
  fs.createReadStream(filePath).pipe(response);
}

async function cacheMedia(request, response, requestUrl) {
  const targetUrl = requestUrl.searchParams.get("url");
  if (!targetUrl || !isAllowedProxyUrl(targetUrl)) {
    sendText(response, 400, "Unsupported media cache URL");
    return;
  }

  try {
    const cached = await ensureCachedMedia(targetUrl);
    serveCachedFile(request, response, cached.filePath, cached.meta);
  } catch (error) {
    console.error(error);
    sendText(response, 502, "Media cache failed");
  }
}

async function sliceMedia(request, response, requestUrl) {
  const targetUrl = requestUrl.searchParams.get("url");
  if (!targetUrl || !isAllowedProxyUrl(targetUrl)) {
    sendText(response, 400, "Unsupported media slice URL");
    return;
  }

  const start = Math.max(0, Number(requestUrl.searchParams.get("start")) || 0);
  const duration = Math.max(0.25, Math.min(MAX_SLICE_DURATION_SECONDS, Number(requestUrl.searchParams.get("duration")) || DEFAULT_SLICE_DURATION_SECONDS));

  try {
    const cached = await ensureSlicedMedia(targetUrl, start, duration);
    serveCachedFile(request, response, cached.filePath, cached.meta);
  } catch (error) {
    console.error(error);
    sendText(response, 502, "Media slice failed");
  }
}

function getSliceRequestParts(requestUrl) {
  const targetUrl = requestUrl.searchParams.get("url");
  if (!targetUrl || !isAllowedProxyUrl(targetUrl)) {
    return null;
  }

  const start = Math.max(0, Number(requestUrl.searchParams.get("start")) || 0);
  const duration = Math.max(0.25, Math.min(MAX_SLICE_DURATION_SECONDS, Number(requestUrl.searchParams.get("duration")) || DEFAULT_SLICE_DURATION_SECONDS));
  return {
    targetUrl,
    start,
    duration,
    paths: getSliceCachePaths(targetUrl, start, duration),
  };
}

async function sliceStatus(request, response, requestUrl) {
  const parts = getSliceRequestParts(requestUrl);
  if (!parts) {
    sendText(response, 400, "{\"ready\":false,\"error\":\"Unsupported media slice URL\"}", "application/json; charset=utf-8");
    return;
  }

  const meta = await readCacheMeta(parts.paths.metaPath);
  const ready = !!meta && await fileExists(parts.paths.filePath);
  sendText(
    response,
    200,
    JSON.stringify({
      ready,
      sliceStart: parts.paths.sliceStart,
      sliceDuration: parts.paths.sliceDuration,
      contentLength: ready ? meta.contentLength : 0,
    }),
    "application/json; charset=utf-8",
  );
}

async function sliceWarm(request, response, requestUrl) {
  const parts = getSliceRequestParts(requestUrl);
  if (!parts) {
    sendText(response, 400, "{\"ready\":false,\"error\":\"Unsupported media slice URL\"}", "application/json; charset=utf-8");
    return;
  }

  try {
    if (requestUrl.searchParams.get("force") === "1") {
      await cleanupSliceCacheFiles(parts.paths);
    }
    const cached = await ensureSlicedMedia(parts.targetUrl, parts.start, parts.duration);
    sendText(
      response,
      200,
      JSON.stringify({
        ready: true,
        sliceStart: cached.meta?.sliceStart ?? parts.paths.sliceStart,
        sliceDuration: cached.meta?.sliceDuration ?? parts.paths.sliceDuration,
        contentLength: cached.meta?.contentLength || 0,
        buildMode: cached.meta?.buildMode || "cached",
      }),
      "application/json; charset=utf-8",
    );
  } catch (error) {
    console.error(error);
    sendText(response, 502, "{\"ready\":false,\"error\":\"Media slice warm failed\"}", "application/json; charset=utf-8");
  }
}

async function proxyMedia(request, response, requestUrl) {
  const targetUrl = requestUrl.searchParams.get("url");
  if (!targetUrl || !isAllowedProxyUrl(targetUrl)) {
    sendText(response, 400, "Unsupported media proxy URL");
    return;
  }

  streamRemoteMedia(targetUrl, request, response);
}

function liveMedia(request, response, requestUrl) {
  const targetUrl = requestUrl.searchParams.get("url");
  if (!targetUrl || !isAllowedProxyUrl(targetUrl)) {
    sendText(response, 400, "Unsupported live media URL");
    return;
  }

  if (!ffmpegPath) {
    proxyMedia(request, response, requestUrl);
    return;
  }

  const start = Math.max(0, Number(requestUrl.searchParams.get("start")) || 0);
  const seekArgs = start > 0 ? ["-ss", String(start)] : [];
  response.writeHead(200, {
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
    "content-type": "video/webm",
  });

  const ffmpeg = spawn(ffmpegPath, [
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "warning",
    ...seekArgs,
    "-user_agent",
    "Freemix-VM420/1.0",
    "-reconnect",
    "1",
    "-reconnect_streamed",
    "1",
    "-reconnect_delay_max",
    "3",
    "-i",
    targetUrl,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libvpx",
    "-deadline",
    "realtime",
    "-cpu-used",
    "6",
    "-b:v",
    "1400k",
    "-maxrate",
    "1800k",
    "-bufsize",
    "2800k",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "libopus",
    "-b:a",
    "128k",
    "-ar",
    "48000",
    "-cluster_time_limit",
    "1000",
    "-f",
    "webm",
    "pipe:1",
  ]);

  ffmpeg.stdout.pipe(response);
  ffmpeg.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();
    if (text) {
      console.warn(text);
    }
  });
  ffmpeg.on("error", (error) => {
    console.error(error);
    if (!response.destroyed) {
      response.destroy(error);
    }
  });
  response.on("close", () => {
    if (!ffmpeg.killed) {
      ffmpeg.kill("SIGTERM");
    }
  });
}

function streamRemoteMedia(targetUrl, clientRequest, clientResponse, redirectCount = 0) {
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    sendText(clientResponse, 400, "Unsupported media proxy URL");
    return;
  }

  const transport = parsedUrl.protocol === "https:" ? https : http;
  let upstreamResponseStream = null;
  let upstreamCompleted = false;
  const upstreamRequest = transport.request(
    parsedUrl,
    {
      method: "GET",
      headers: {
        "user-agent": "Freemix-VM420/1.0",
        accept: clientRequest.headers.accept || "*/*",
        ...(clientRequest.headers.range ? { range: clientRequest.headers.range } : {}),
      },
    },
    (upstreamResponse) => {
      upstreamResponseStream = upstreamResponse;
      const statusCode = Number(upstreamResponse.statusCode) || 502;
      const location = upstreamResponse.headers.location;
      if ([301, 302, 303, 307, 308].includes(statusCode) && location && redirectCount < 8) {
        upstreamResponse.resume();
        const redirectedUrl = new URL(location, parsedUrl).href;
        if (!isAllowedProxyUrl(redirectedUrl)) {
          sendText(clientResponse, 400, "Unsupported media redirect URL");
          return;
        }
        streamRemoteMedia(redirectedUrl, clientRequest, clientResponse, redirectCount + 1);
        return;
      }

      const responseHeaders = {
        "access-control-allow-origin": "*",
        "accept-ranges": upstreamResponse.headers["accept-ranges"] || "bytes",
        "cache-control": "public, max-age=3600",
        "content-type": upstreamResponse.headers["content-type"] || "application/octet-stream",
      };

      ["content-length", "content-range", "last-modified", "etag"].forEach((header) => {
        const value = upstreamResponse.headers[header];
        if (value) {
          responseHeaders[header] = value;
        }
      });

      clientResponse.writeHead(statusCode, responseHeaders);
      upstreamResponse.on("end", () => {
        upstreamCompleted = true;
      });
      upstreamResponse.pipe(clientResponse);
    },
  );

  upstreamRequest.on("error", (error) => {
    console.error(error);
    if (!clientResponse.headersSent) {
      sendText(clientResponse, 502, "Media proxy failed");
    } else {
      clientResponse.destroy(error);
    }
  });

  clientResponse.on("close", () => {
    if (upstreamCompleted || clientResponse.writableEnded) {
      return;
    }

    upstreamRequest.destroy();
    if (upstreamResponseStream && !upstreamResponseStream.destroyed) {
      upstreamResponseStream.destroy();
    }
  });

  upstreamRequest.end();
}

function serveStatic(response, pathname) {
  const safePath = path
    .normalize(decodeURIComponent(pathname === "/" ? "/index.html" : pathname))
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(ROOT)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  fs.stat(resolvedPath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      sendText(response, 404, "Not found");
      return;
    }

    const extension = path.extname(resolvedPath).toLowerCase();
    response.writeHead(200, {
      "content-type": MIME_TYPES[extension] || "application/octet-stream",
      "content-length": stat.size,
      "cache-control": "no-store",
    });
    fs.createReadStream(resolvedPath).pipe(response);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || `localhost:${PORT}`}`);

  if (requestUrl.pathname === "/proxy-health") {
    sendText(response, 200, "ok");
    return;
  }

  if (requestUrl.pathname === "/favicon.ico") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    });
    response.end();
    return;
  }

  if (requestUrl.pathname === "/media-proxy") {
    proxyMedia(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/media-live") {
    liveMedia(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/media-cache") {
    cacheMedia(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/media-slice") {
    sliceMedia(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/media-slice-status") {
    sliceStatus(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/media-slice-warm") {
    sliceWarm(request, response, requestUrl);
    return;
  }

  serveStatic(response, requestUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`Freemix VM-420 running at http://localhost:${PORT}`);
  console.log("Remote Internet Archive media will be sliced/cached through /media-slice for WebAudio FX.");
  pruneMediaCache().catch(console.error);
});
