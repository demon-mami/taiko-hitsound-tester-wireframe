import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const HOST = "127.0.0.1";
const PORT = 4173;
const ROOT = process.cwd();
const SAMPLE_RATE = 48_000;

const catalog = {
  schema_version: 2,
  package_version: "2.0",
  song_count: 2,
  songs: [
    {
      id: "song01",
      order: 1,
      display_name: "QA Dense",
      purpose: "automated dense playback fixture",
      music: "songs/song01/music.wav",
      background: "songs/song01/background.svg",
      chart: "songs/song01/chart.json",
      source_info: "songs/song01/source_info.json"
    },
    {
      id: "song02",
      order: 2,
      display_name: "QA Normal",
      purpose: "automated normal playback fixture",
      music: "songs/song02/music.wav",
      background: "songs/song02/background.svg",
      chart: "songs/song02/chart.json",
      source_info: "songs/song02/source_info.json"
    }
  ]
};

function chart(events) {
  return {
    schema_version: 2,
    song_id: "qa",
    timebase: "music_start_ms",
    source_offset_ms: 0,
    kiai_start_ms: 750,
    kiai_end_ms: 3250,
    effect_window_start_ms: 250,
    effect_window_end_ms: 3750,
    effect_envelope: {
      type: "raised_cosine",
      fade_in_start_ms: 250,
      fade_in_end_ms: 750,
      full_start_ms: 750,
      full_end_ms: 3250,
      fade_out_start_ms: 3250,
      fade_out_end_ms: 3750
    },
    events
  };
}

const denseChart = chart([
  { time_ms: 500, type: "don", source_hit_sound: 0 },
  { time_ms: 650, type: "kat", source_hit_sound: 8 },
  { time_ms: 800, type: "big_don", source_hit_sound: 4 },
  { time_ms: 950, type: "big_kat", source_hit_sound: 12 },
  { time_ms: 1100, type: "don", source_hit_sound: 0 },
  { time_ms: 1250, type: "kat", source_hit_sound: 8 },
  { time_ms: 1400, type: "don", source_hit_sound: 0 },
  { time_ms: 1400, type: "big_don", source_hit_sound: 4 },
  { time_ms: 1550, type: "kat", source_hit_sound: 8 },
  { time_ms: 1700, type: "big_kat", source_hit_sound: 12 },
  { time_ms: 1850, type: "don", source_hit_sound: 0 },
  { time_ms: 2000, type: "kat", source_hit_sound: 8 },
  { time_ms: 2150, type: "big_don", source_hit_sound: 4 },
  { time_ms: 2300, type: "big_kat", source_hit_sound: 12 },
  { time_ms: 2450, type: "don", source_hit_sound: 0 },
  { time_ms: 2600, type: "kat", source_hit_sound: 8 },
  { time_ms: 2750, type: "don", source_hit_sound: 0 },
  { time_ms: 2900, type: "kat", source_hit_sound: 8 },
  { time_ms: 3150, type: "big_don", source_hit_sound: 4 },
  { time_ms: 3400, type: "big_kat", source_hit_sound: 12 }
]);

const normalChart = chart([
  { time_ms: 600, type: "don", source_hit_sound: 0 },
  { time_ms: 1000, type: "kat", source_hit_sound: 8 },
  { time_ms: 1450, type: "big_don", source_hit_sound: 4 },
  { time_ms: 1900, type: "don", source_hit_sound: 0 },
  { time_ms: 2350, type: "big_kat", source_hit_sound: 12 },
  { time_ms: 2800, type: "kat", source_hit_sound: 8 },
  { time_ms: 3350, type: "don", source_hit_sound: 0 }
]);

function writeAscii(buffer, offset, text) {
  for (let i = 0; i < text.length; i += 1) buffer.writeUInt8(text.charCodeAt(i), offset + i);
}

function makeWav({ durationSeconds, channels, sampleRate = SAMPLE_RATE, sampleAt }) {
  const frames = Math.floor(durationSeconds * sampleRate);
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataBytes = frames * blockAlign;
  const out = Buffer.alloc(44 + dataBytes);

  writeAscii(out, 0, "RIFF");
  out.writeUInt32LE(36 + dataBytes, 4);
  writeAscii(out, 8, "WAVE");
  writeAscii(out, 12, "fmt ");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(channels, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * blockAlign, 28);
  out.writeUInt16LE(blockAlign, 32);
  out.writeUInt16LE(16, 34);
  writeAscii(out, 36, "data");
  out.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    const t = frame / sampleRate;
    for (let ch = 0; ch < channels; ch += 1) {
      const sample = Math.max(-1, Math.min(1, sampleAt(t, ch)));
      out.writeInt16LE(Math.round(sample * 32767), offset);
      offset += 2;
    }
  }
  return out;
}

const musicWav = makeWav({
  durationSeconds: 4,
  channels: 2,
  sampleAt(t, ch) {
    const base = 0.18 * Math.sin(2 * Math.PI * 220 * t);
    const upper = 0.08 * Math.sin(2 * Math.PI * (ch ? 334 : 330) * t + 0.3);
    return base + upper;
  }
});

function makeHit({ frequency, amplitude }) {
  return makeWav({
    durationSeconds: 0.09,
    channels: 1,
    sampleAt(t) {
      const envelope = Math.exp(-38 * t);
      return amplitude * envelope * Math.sin(2 * Math.PI * frequency * t);
    }
  });
}

const donWav = makeHit({ frequency: 150, amplitude: 0.36 });
const katWav = makeHit({ frequency: 1100, amplitude: 0.31 });
const loudDonWav = makeHit({ frequency: 150, amplitude: 0.96 });

const backgroundSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#e9e7e3"/>
  <circle cx="320" cy="180" r="120" fill="#d8d5cf"/>
  <text x="320" y="188" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#444">QA</text>
</svg>`);

const jsonBuffer = (value) => Buffer.from(JSON.stringify(value));

const dynamicRoutes = new Map([
  ["/assets/01_song_catalog.json", { type: "application/json; charset=utf-8", body: jsonBuffer(catalog) }],
  ["/assets/songs/song01/music.wav", { type: "audio/wav", body: musicWav }],
  ["/assets/songs/song02/music.wav", { type: "audio/wav", body: musicWav }],
  ["/assets/songs/song01/chart.json", { type: "application/json; charset=utf-8", body: jsonBuffer(denseChart) }],
  ["/assets/songs/song02/chart.json", { type: "application/json; charset=utf-8", body: jsonBuffer(normalChart) }],
  ["/assets/songs/song01/source_info.json", { type: "application/json; charset=utf-8", body: jsonBuffer({ schema_version: 2, song_id: "song01" }) }],
  ["/assets/songs/song02/source_info.json", { type: "application/json; charset=utf-8", body: jsonBuffer({ schema_version: 2, song_id: "song02" }) }],
  ["/assets/songs/song01/background.svg", { type: "image/svg+xml", body: backgroundSvg }],
  ["/assets/songs/song02/background.svg", { type: "image/svg+xml", body: backgroundSvg }],
  ["/fixtures/don.wav", { type: "audio/wav", body: donWav }],
  ["/fixtures/kat.wav", { type: "audio/wav", body: katWav }],
  ["/fixtures/loud-don.wav", { type: "audio/wav", body: loudDonWav }]
]);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav"
};

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp"
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    const route = dynamicRoutes.get(url.pathname);
    if (route) {
      send(res, 200, route.type, route.body);
      return;
    }

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = resolve(ROOT, `.${requested}`);
    const safeRoot = ROOT.endsWith(sep) ? ROOT : `${ROOT}${sep}`;
    if (filePath !== ROOT && !filePath.startsWith(safeRoot)) {
      send(res, 403, "text/plain; charset=utf-8", "Forbidden");
      return;
    }
    const data = await readFile(filePath);
    send(res, 200, mime[extname(filePath)] || "application/octet-stream", data);
  } catch (error) {
    const code = error?.code === "ENOENT" ? 404 : 500;
    send(res, code, "text/plain; charset=utf-8", code === 404 ? "Not Found" : String(error));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`QA server listening on http://${HOST}:${PORT}`);
});
