import { HitsoundTesterEngine } from "./audio-engine.js";

const ASSET_ROOT = "./assets/";
const PRESET_ROOT = "./presets/";
const DON_RGB = [235, 69, 44];
const KAT_RGB = [68, 141, 171];

const TIMELINE_WIDTH = 1340;
const TIMELINE_HEIGHT = 250;
const LANE_TOP = 45;
const LANE_HEIGHT = 160;
const LANE_BOTTOM = LANE_TOP + LANE_HEIGHT;
const LANE_CENTER_Y = LANE_TOP + LANE_HEIGHT / 2;
const JUDGE_X = 92;
const FUTURE_WINDOW_MS = 1000;
const NORMAL_NOTE_SIZE = 78;
const BIG_NOTE_SIZE = NORMAL_NOTE_SIZE;
const JUDGE_OUTER_DIAMETER = 90;
const BIG_MARKER_WIDTH = 28;
const BIG_MARKER_HEIGHT = 18;
const BIG_MARKER_GAP = 33;
const EJECT_MAX_MS = 260;
const EJECT_VX = -510;
const EJECT_VY0 = -700;
const EJECT_GRAVITY = 1200;
const EJECT_Z_RATE = 3.15;
const EJECT_PERSPECTIVE = 0.95;

const OVERVIEW_WIDTH = 1000;
const OVERVIEW_HEIGHT = 84;
const MOBILE_TIMELINE_HEIGHT = 136;
const FILE_LABEL_LIMIT = "taiko-normal-hitwhistle.wav".length;

const SLOT_DEFS = [
  { key: "don", role: "hitnormal", family: "don", primary: true },
  { key: "kat", role: "hitclap", family: "kat", primary: true },
];

// UI source -> frozen three-container audio backend.
// My Sound + Preset A currently fit in the existing common-master model.
// Preset B/C remain unresolved until their files/config are supplied.
const SOURCE_CONFIG = Object.freeze({
  "my-sound": { label: "My Sound", setIndex: 0, kind: "user" },
  "preset-a": {
    label: "Preset A",
    setIndex: 1,
    kind: "preset",
    files: Object.freeze({
      don: "PresetA-hitnormal.wav",
      kat: "PresetA-hitclap.wav",
    }),
  },
});

const sourceSelector = document.querySelector("#source-selector");
const soundSlotGrid = document.querySelector("#my-sound-slots");
const songArea = document.querySelector("#song-area");
const mobileSongSelect = document.querySelector("#mobile-song-select");
const mobileSongSelectCard = document.querySelector("#mobile-song-select-card");
const mobileSongName = document.querySelector("#mobile-song-name");
const mobileSongCredit = document.querySelector("#mobile-song-credit");
const stageBackground = document.querySelector("#stage-background");
const timelineCanvas = document.querySelector("#object-timeline");
const mobileTimelineCanvas = document.querySelector("#mobile-object-timeline");
const overview = document.querySelector("#overview");
const overviewStaticCanvas = document.querySelector("#overview-static");
const overviewCursorCanvas = document.querySelector("#overview-cursor");
const player = document.querySelector(".player");
const playButton = document.querySelector(".play-button");
const seekInput = document.querySelector(".seek-input");
const currentTimeElement = document.querySelector(".current-time");
const totalTimeElement = document.querySelector(".total-time");
const statusElement = document.querySelector(".player-status");
const effectVolumeInput = document.querySelector("#effect-volume-input");
const effectVolumeOutput = document.querySelector("#effect-volume-output");

let catalog = null;
let songs = [];
let activeSongId = null;
let activeSource = "my-sound";
let loadingSongToken = 0;
let stageImageToken = 0;
let timelineChart = null;
let playbackDurationMs = 0;
let playbackCurrentMs = 0;
let overviewPreviewMs = null;
let overviewDrag = null;

const slotRefs = new Map();
const mySoundFileNames = new Map();

const timelineCtx = prepareCanvas(timelineCanvas, TIMELINE_WIDTH, TIMELINE_HEIGHT);
const overviewStaticCtx = prepareCanvas(overviewStaticCanvas, OVERVIEW_WIDTH, OVERVIEW_HEIGHT);
const overviewCursorCtx = prepareCanvas(overviewCursorCanvas, OVERVIEW_WIDTH, OVERVIEW_HEIGHT);

const engine = new HitsoundTesterEngine({
  onTime: updatePlaybackView,
  onEnded: () => updatePlayerState(false),
  onStatus: (message) => { statusElement.textContent = message; },
  onSafety: (result) => {
    if (!result) {
      player.removeAttribute("data-safety-ready");
      player.removeAttribute("data-master-gain-db");
      return;
    }
    player.dataset.safetyReady = "true";
    player.dataset.masterGainDb = result.fixedSafeGainDb.toFixed(3);
  },
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function prepareCanvas(canvas, logicalWidth, logicalHeight) {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(logicalWidth * ratio);
  canvas.height = Math.round(logicalHeight * ratio);
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;
  return context;
}

function formatTime(seconds, tenths = false) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const remaining = safe - minutes * 60;
  if (tenths) return `${minutes}:${remaining.toFixed(1).padStart(4, "0")}`;
  return `${minutes}:${String(Math.floor(remaining)).padStart(2, "0")}`;
}

function truncateFilename(filename) {
  if (filename.length <= FILE_LABEL_LIMIT) return filename;
  const extensionMatch = filename.match(/\.[^.]+$/);
  const extension = extensionMatch?.[0] || "";
  const base = extension ? filename.slice(0, -extension.length) : filename;
  const available = Math.max(4, FILE_LABEL_LIMIT - extension.length - 1);
  return `${base.slice(0, available)}…${extension}`;
}

function lowerBound(events, timeMs) {
  let low = 0;
  let high = events.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (events[mid].time_ms < timeMs) low = mid + 1;
    else high = mid;
  }
  return low;
}

function rgba(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function buildSoundSlots() {
  soundSlotGrid.textContent = "";
  slotRefs.clear();

  for (const def of SLOT_DEFS) {
    const slot = document.createElement("div");
    slot.className = "sound-slot";

    const input = document.createElement("input");
    input.className = "file-input";
    input.type = "file";
    input.accept = "audio/*,.wav,.ogg";
    input.id = `set-1-${def.key}`;
    input.dataset.set = "1";
    input.dataset.sound = def.key;
    input.setAttribute("aria-label", `${def.role} audio file, unloaded`);

    const trigger = document.createElement("label");
    trigger.className = `sound-trigger sound-${def.family}${def.primary ? "" : " is-secondary"}`;
    trigger.htmlFor = input.id;

    const icon = document.createElement("span");
    icon.className = "note-icon";
    icon.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "sound-copy";

    const role = document.createElement("span");
    role.className = "sound-role";
    role.textContent = def.role;

    const filename = document.createElement("span");
    filename.className = "sound-filename";
    filename.textContent = "Select file";

    copy.append(role, filename);
    trigger.append(icon, copy);
    slot.append(input, trigger);
    soundSlotGrid.append(slot);
    slotRefs.set(def.key, { def, input, trigger, filename });

    input.addEventListener("click", () => {
      if (activeSource !== "my-sound") return;
      input.value = "";
    });

    input.addEventListener("change", async () => {
      if (activeSource !== "my-sound") return;
      const file = input.files?.[0] || null;
      try {
        trigger.classList.add("is-loading");
        playButton.disabled = true;
        await engine.setHitsound(0, def.key, file);
        if (file) mySoundFileNames.set(def.key, file.name);
        else mySoundFileNames.delete(def.key);
        renderSourceSlots();
        updatePlayAvailability();
      } catch (error) {
        console.error(error);
        trigger.classList.remove("is-loaded");
        filename.textContent = "Load failed";
        statusElement.textContent = `${def.role}の読み込みに失敗しました。`;
      } finally {
        trigger.classList.remove("is-loading");
      }
    });
  }

  renderSourceSlots();
}

function renderSourceSlots() {
  const config = SOURCE_CONFIG[activeSource];
  const presetFiles = config?.kind === "preset" ? config.files : null;

  for (const def of SLOT_DEFS) {
    const ref = slotRefs.get(def.key);
    if (!ref) continue;
    const { input, trigger, filename } = ref;

    if (presetFiles) {
      const presetFilename = presetFiles[def.key];
      input.disabled = true;
      trigger.classList.add("is-preset", "is-loaded");
      trigger.style.cursor = "default";
      filename.textContent = truncateFilename(presetFilename);
      filename.title = presetFilename;
      input.setAttribute("aria-label", `${config.label} ${def.role}: ${presetFilename}`);
    } else {
      const userFilename = mySoundFileNames.get(def.key) || "";
      input.disabled = false;
      trigger.classList.remove("is-preset");
      trigger.classList.toggle("is-loaded", Boolean(engine.sets[0][def.key]));
      trigger.style.cursor = "";
      filename.textContent = userFilename ? truncateFilename(userFilename) : "Select file";
      filename.title = userFilename;
      input.setAttribute("aria-label", `${def.role} audio file, ${userFilename ? `loaded: ${userFilename}` : "unloaded"}`);
    }
  }
}

function initializeSourceSelector() {
  for (const button of sourceSelector.querySelectorAll(".source-button")) {
    const source = button.dataset.source;
    const config = SOURCE_CONFIG[source];

    if (!config) {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.dataset.sourceState = "unconfigured";
      continue;
    }

    if (config.kind === "preset") {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.dataset.sourceState = "loading";
      button.title = `${config.label} を準備しています。`;
    } else {
      button.disabled = false;
      button.setAttribute("aria-disabled", "false");
      button.dataset.sourceState = "ready";
      button.title = "";
    }

    button.addEventListener("click", () => selectSource(source));
  }

  selectSource("my-sound");
}

function markPresetReady(source) {
  const config = SOURCE_CONFIG[source];
  const button = sourceSelector.querySelector(`[data-source="${source}"]`);
  if (!button || !config) return;
  button.disabled = false;
  button.setAttribute("aria-disabled", "false");
  button.dataset.sourceState = "ready";
  button.title = "";
}

function markPresetFailed(source, error) {
  const config = SOURCE_CONFIG[source];
  const button = sourceSelector.querySelector(`[data-source="${source}"]`);
  if (!button || !config) return;
  button.disabled = true;
  button.setAttribute("aria-disabled", "true");
  button.dataset.sourceState = "error";
  button.title = `${config.label} の読み込みに失敗しました。`;
  console.error(error);
}

function selectSource(source) {
  const config = SOURCE_CONFIG[source];
  const button = sourceSelector.querySelector(`[data-source="${source}"]`);
  if (!config || !button || button.disabled) return;
  if (source === activeSource) return;

  activeSource = source;
  engine.setActiveSet(config.setIndex);
  player.dataset.activeSource = source;

  for (const item of sourceSelector.querySelectorAll(".source-button")) {
    const selected = item.dataset.source === source;
    item.classList.toggle("is-active", selected);
    item.setAttribute("aria-checked", String(selected));
  }

  renderSourceSlots();
  updatePlayerState(false);
  updatePlayAvailability();
}

async function preloadConfiguredPresets() {
  for (const [source, config] of Object.entries(SOURCE_CONFIG)) {
    if (config.kind !== "preset") continue;

    try {
      const entries = await Promise.all(SLOT_DEFS.map(async ({ key }) => {
        const filename = config.files[key];
        const response = await fetch(`${PRESET_ROOT}${filename}`);
        if (!response.ok) throw new Error(`${filename} load failed: ${response.status}`);
        const bytes = await response.arrayBuffer();
        const buffer = await engine.decodeArrayBuffer(bytes);
        return [key, buffer];
      }));

      engine.sets[config.setIndex] = Object.fromEntries(entries);
      markPresetReady(source);
    } catch (error) {
      markPresetFailed(source, error);
    }
  }
}

async function loadCatalog() {
  const response = await fetch(`${ASSET_ROOT}01_song_catalog.json`);
  if (!response.ok) throw new Error(`Catalog load failed: ${response.status}`);
  catalog = await response.json();
  if (catalog.schema_version !== 2 || catalog.package_version !== "2.0") {
    throw new Error(`Unexpected asset catalog version: schema=${catalog.schema_version}, package=${catalog.package_version}`);
  }

  songs = await Promise.all(catalog.songs.map(hydrateSongMetadata));
  renderSongs();
  if (songs.length) await selectSong(songs[0].id);
}

async function hydrateSongMetadata(song) {
  try {
    const response = await fetch(`${ASSET_ROOT}${song.source_info}`);
    if (!response.ok) throw new Error(String(response.status));
    const sourceInfo = await response.json();
    const source = sourceInfo.source || {};
    const title = source.title || source.title_unicode || song.display_name;
    const artist = source.artist || "";
    const mapper = source.creator || "";
    const credit = artist && mapper ? `${artist} - ${mapper}` : (artist || mapper || song.purpose || "—");
    return { ...song, title, artist, mapper, credit, sourceInfo };
  } catch {
    return { ...song, title: song.display_name, artist: "", mapper: "", credit: song.purpose || "—", sourceInfo: null };
  }
}

function renderSongs() {
  songArea.textContent = "";
  songArea.setAttribute("aria-busy", "false");
  if (mobileSongSelect) mobileSongSelect.textContent = "";

  for (const song of songs) {
    const button = document.createElement("button");
    button.className = "song-button";
    button.type = "button";
    button.dataset.songId = song.id;
    button.setAttribute("aria-pressed", "false");
    button.style.backgroundImage = `url("${ASSET_ROOT}${song.background}")`;

    const name = document.createElement("span");
    name.className = "song-name";
    name.textContent = song.title;
    name.title = song.title;

    const credit = document.createElement("span");
    credit.className = "song-credit";
    credit.textContent = song.credit;
    credit.title = song.credit;

    button.append(name, credit);
    button.addEventListener("click", () => selectSong(song.id));
    songArea.append(button);

    if (mobileSongSelect) {
      const option = document.createElement("option");
      option.value = song.id;
      option.textContent = song.credit && song.credit !== "—" ? `${song.title} — ${song.credit}` : song.title;
      mobileSongSelect.append(option);
    }
  }
}

function updateSongSelection(songId) {
  for (const button of songArea.querySelectorAll(".song-button")) {
    const active = button.dataset.songId === songId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  const song = songs.find((entry) => entry.id === songId);
  if (song && mobileSongSelect) mobileSongSelect.value = songId;
  if (song && mobileSongSelectCard) {
    mobileSongSelectCard.style.backgroundImage = `url("${ASSET_ROOT}${song.background}")`;
    if (mobileSongName) {
      mobileSongName.textContent = song.title;
      mobileSongName.title = song.title;
    }
    if (mobileSongCredit) {
      mobileSongCredit.textContent = song.credit;
      mobileSongCredit.title = song.credit;
    }
  }
}

function updateStageBackground(song, token) {
  stageBackground.classList.remove("is-ready");
  stageBackground.style.top = `${Number(song.background_offset_y ?? 14)}px`;
  stageBackground.onload = () => {
    if (token !== stageImageToken) return;
    stageBackground.classList.add("is-ready");
  };
  stageBackground.src = `${ASSET_ROOT}${song.background}`;
}

async function selectSong(songId) {
  const song = songs.find((entry) => entry.id === songId);
  if (!song || (activeSongId === songId && engine.musicBuffer)) return;

  const token = ++loadingSongToken;
  stageImageToken = token;
  activeSongId = songId;
  updateSongSelection(songId);
  updateStageBackground(song, token);
  updatePlayerState(false);
  playButton.disabled = true;
  seekInput.disabled = true;
  statusElement.textContent = "曲assetを読み込んでいます…";

  try {
    const result = await engine.loadSong({ musicUrl: `${ASSET_ROOT}${song.music}`, chartUrl: `${ASSET_ROOT}${song.chart}` });
    if (token !== loadingSongToken || result?.stale) return;

    timelineChart = engine.chart;
    playbackDurationMs = Math.round((engine.musicBuffer?.duration || result.duration || 0) * 1000);
    playbackCurrentMs = 0;
    drawOverviewStatic();
    drawObjectTimeline(0);
  drawMobileObjectTimeline(0);
    drawOverviewCursor(0);
    updatePlayAvailability();
  } catch (error) {
    console.error(error);
    timelineChart = null;
    playbackDurationMs = 0;
    drawOverviewStatic();
    drawObjectTimeline(0);
  drawMobileObjectTimeline(0);
    drawOverviewCursor(0);
    statusElement.textContent = `曲assetの読み込みに失敗しました: ${error.message}`;
  }
}

function updatePlaybackView(currentSeconds, durationSeconds) {
  const duration = Math.max(0, Number(durationSeconds) || 0);
  const current = clamp(Number(currentSeconds) || 0, 0, duration);
  playbackDurationMs = Math.round(duration * 1000);
  playbackCurrentMs = Math.round(current * 1000);

  seekInput.max = String(duration || 1);
  seekInput.value = String(current);
  currentTimeElement.textContent = formatTime(current);
  totalTimeElement.textContent = formatTime(duration);
  currentTimeElement.dateTime = `PT${Math.floor(current)}S`;
  totalTimeElement.dateTime = `PT${Math.floor(duration)}S`;
  seekInput.setAttribute("aria-valuetext", `${formatTime(current)} of ${formatTime(duration)}`);

  overview.setAttribute("aria-valuemax", String(Math.round(duration * 1000)));
  overview.setAttribute("aria-valuenow", String(Math.round(current * 1000)));
  overview.setAttribute("aria-valuetext", `${formatTime(current)} of ${formatTime(duration)}`);

  drawObjectTimeline(current);
  drawMobileObjectTimeline(current);
  drawOverviewCursor(current * 1000, overviewPreviewMs);
}

function updatePlayerState(playing = engine.playing) {
  player.classList.toggle("is-playing", playing);
  player.classList.toggle("is-paused", !playing);
  player.dataset.playerState = playing ? "playing" : "paused";
  playButton.setAttribute("aria-pressed", String(playing));
  playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
}

function updatePlayAvailability() {
  const config = SOURCE_CONFIG[activeSource];
  const setIndex = config?.setIndex ?? 0;
  const ready = engine.isPlaybackReady(setIndex);
  playButton.disabled = !ready;
  seekInput.disabled = !engine.musicBuffer;

  if (!engine.musicBuffer) statusElement.textContent = "曲assetを読み込んでいます…";
  else if (!engine.hasRequiredHitsounds(setIndex)) statusElement.textContent = activeSource === "my-sound" ? "hitnormal / hitclapを読み込んでください。" : `${config.label}を準備できませんでした。`;
  else if (!engine.safetyReady) statusElement.textContent = "True Peak安全Gainを計算しています…";
  else if (engine.safetyResult) statusElement.textContent = `再生できます。Master ${engine.safetyResult.fixedSafeGainDb.toFixed(2)} dB`;
  else statusElement.textContent = "再生準備中です…";
}

function noteIsDon(type) {
  return type === "don" || type === "big_don";
}

function noteIsBig(type) {
  return type === "big_don" || type === "big_kat";
}

function scaleColor(color, factor) {
  return color.map((channel) => clamp(Math.round(channel * factor), 0, 255));
}

function drawBigMarker(context, x, y, diameter) {
  const scale = diameter / NORMAL_NOTE_SIZE;
  const halfWidth = (BIG_MARKER_WIDTH * scale) / 2;
  const markerHeight = BIG_MARKER_HEIGHT * scale;
  const apexY = y - diameter / 2 - BIG_MARKER_GAP * scale;
  const baseY = apexY - markerHeight;

  context.beginPath();
  context.moveTo(x - halfWidth, baseY);
  context.lineTo(x + halfWidth, baseY);
  context.lineTo(x, apexY);
  context.closePath();
  context.fillStyle = "rgba(255,255,255,0.96)";
  context.fill();
}

function drawNote(context, x, y, diameter, type, alpha = 1) {
  const radius = diameter / 2;
  const color = noteIsDon(type) ? DON_RGB : KAT_RGB;
  const lightColor = scaleColor(color, 1.13);
  const darkColor = scaleColor(color, 0.72);

  context.save();
  context.globalAlpha = clamp(alpha, 0, 1);

  // Material Disc: restrained internal depth without a glossy white reflection band.
  const material = context.createRadialGradient(
    x - radius * 0.28,
    y - radius * 0.32,
    Math.max(1, radius * 0.10),
    x + radius * 0.08,
    y + radius * 0.12,
    radius * 1.08,
  );
  material.addColorStop(0, rgba(lightColor, 1));
  material.addColorStop(0.48, rgba(color, 1));
  material.addColorStop(1, rgba(darkColor, 1));

  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = material;
  context.fill();

  // Reference-like clear white circumference. The rim scales with the ejected note.
  context.lineWidth = Math.max(1.25, diameter * (4 / NORMAL_NOTE_SIZE));
  context.strokeStyle = "rgba(255,255,255,0.96)";
  context.stroke();

  // BIG is deliberately the same disc size/material as Normal; only the upper marker differs.
  if (noteIsBig(type)) drawBigMarker(context, x, y, diameter);

  context.restore();
}

function ejectedOpacity(ageMs) {
  if (ageMs <= 25) return 1 + (0.65 - 1) * (ageMs / 25);
  if (ageMs <= 50) return 0.65 + (0.40 - 0.65) * ((ageMs - 25) / 25);
  if (ageMs <= 85) return 0.40 + (0.18 - 0.40) * ((ageMs - 50) / 35);
  if (ageMs <= 130) return 0.18 * (1 - ((ageMs - 85) / 45));
  return 0;
}

function sizeMobileTimelineCanvas(width, height) {
  if (!mobileTimelineCanvas) return null;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));
  if (mobileTimelineCanvas.width !== pixelWidth || mobileTimelineCanvas.height !== pixelHeight) {
    mobileTimelineCanvas.width = pixelWidth;
    mobileTimelineCanvas.height = pixelHeight;
  }
  const context = mobileTimelineCanvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;
  return context;
}

function drawMobileJudgeTarget(context, geometry, outerOnly) {
  const { judgeX, noteY, laneTop, laneBottom, noteDiameter, outerDiameter } = geometry;
  context.save();
  if (!outerOnly) {
    context.strokeStyle = "rgba(248,248,250,0.18)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(judgeX, laneTop + 8);
    context.lineTo(judgeX, laneBottom - 8);
    context.stroke();

    context.strokeStyle = "rgba(248,248,250,0.26)";
    context.beginPath();
    context.arc(judgeX, noteY, noteDiameter / 2, 0, Math.PI * 2);
    context.stroke();
  } else {
    context.strokeStyle = "rgba(248,248,250,0.76)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(judgeX, noteY, outerDiameter / 2, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function drawMobileObjectTimeline(currentSeconds) {
  if (!mobileTimelineCanvas) return;
  const rect = mobileTimelineCanvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const width = rect.width;
  const height = MOBILE_TIMELINE_HEIGHT;
  const context = sizeMobileTimelineCanvas(width, height);
  if (!context) return;
  context.clearRect(0, 0, width, height);

  // Reuses the proven responsive principles from osutaiko-mami-viewer:
  // viewport-derived lane geometry, hit position and px/ms mapping.
  const laneHeight = 80;
  const laneTop = Math.round((height - laneHeight) / 2);
  const laneBottom = laneTop + laneHeight;
  const noteY = laneTop + laneHeight / 2;
  const noteDiameter = 40;
  const outerDiameter = 46;
  const judgeX = clamp(width * 0.12, 42, 52);
  const pxPerMs = (width - judgeX - 12) / FUTURE_WINDOW_MS;
  const geometry = { laneHeight, laneTop, laneBottom, noteY, noteDiameter, outerDiameter, judgeX, pxPerMs };

  context.fillStyle = "#171719";
  context.fillRect(0, laneTop, width, laneHeight);
  context.fillStyle = "rgba(255,255,255,0.10)";
  context.fillRect(0, laneTop, width, 1);
  context.fillStyle = "rgba(0,0,0,0.28)";
  context.fillRect(0, laneBottom - 1, width, 1);

  if (!timelineChart?.events?.length) {
    drawMobileJudgeTarget(context, geometry, false);
    drawMobileJudgeTarget(context, geometry, true);
    return;
  }

  const nowMs = currentSeconds * 1000;
  const events = timelineChart.events;
  const measureTimes = timelineChart.measure_lines_ms || timelineChart.measureLinesMs || [];

  context.strokeStyle = "rgba(255,255,255,0.14)";
  context.lineWidth = 1;
  for (const measureMs of measureTimes) {
    const dt = measureMs - nowMs;
    if (dt < 0 || dt > FUTURE_WINDOW_MS) continue;
    const x = judgeX + dt * pxPerMs;
    context.beginPath();
    context.moveTo(x, laneTop + 8);
    context.lineTo(x, laneBottom - 8);
    context.stroke();
  }

  drawMobileJudgeTarget(context, geometry, false);
  const startIndex = lowerBound(events, nowMs - EJECT_MAX_MS);
  const endIndex = lowerBound(events, nowMs + FUTURE_WINDOW_MS + 0.001);

  for (let index = startIndex; index < endIndex; index += 1) {
    const event = events[index];
    const dt = event.time_ms - nowMs;
    if (dt < 0) continue;
    drawNote(context, judgeX + dt * pxPerMs, noteY, noteDiameter, event.type, 1);
  }

  const xScale = width / TIMELINE_WIDTH;
  const yScale = laneHeight / LANE_HEIGHT;
  for (let index = startIndex; index < endIndex; index += 1) {
    const event = events[index];
    const ageMs = nowMs - event.time_ms;
    if (ageMs < 0 || ageMs > EJECT_MAX_MS) continue;
    const alpha = ejectedOpacity(ageMs);
    if (alpha <= 0) continue;

    const age = ageMs / 1000;
    const x = judgeX + EJECT_VX * xScale * age;
    const y = noteY + EJECT_VY0 * yScale * age + 0.5 * EJECT_GRAVITY * yScale * age * age;
    const z = EJECT_Z_RATE * age;
    const scale = 1 / (1 + EJECT_PERSPECTIVE * z);
    drawNote(context, x, y, noteDiameter * scale, event.type, alpha);
  }

  drawMobileJudgeTarget(context, geometry, true);
}

function drawObjectTimeline(currentSeconds) {
  const context = timelineCtx;
  context.clearRect(0, 0, TIMELINE_WIDTH, TIMELINE_HEIGHT);
  context.fillStyle = "#171719";
  context.fillRect(0, LANE_TOP, TIMELINE_WIDTH, LANE_HEIGHT);
  context.fillStyle = "rgba(255,255,255,0.10)";
  context.fillRect(0, LANE_TOP, TIMELINE_WIDTH, 1);
  context.fillStyle = "rgba(0,0,0,0.28)";
  context.fillRect(0, LANE_BOTTOM - 1, TIMELINE_WIDTH, 1);

  if (!timelineChart?.events?.length) {
    drawJudgeTarget(context, false);
    drawJudgeTarget(context, true);
    return;
  }

  const nowMs = currentSeconds * 1000;
  const events = timelineChart.events;
  const pxPerMs = (TIMELINE_WIDTH - 28 - JUDGE_X) / FUTURE_WINDOW_MS;

  const measureTimes = timelineChart.measure_lines_ms || timelineChart.measureLinesMs || [];
  context.strokeStyle = "rgba(255,255,255,0.14)";
  context.lineWidth = 1;
  for (const measureMs of measureTimes) {
    const dt = measureMs - nowMs;
    if (dt < 0 || dt > FUTURE_WINDOW_MS) continue;
    const x = JUDGE_X + dt * pxPerMs;
    context.beginPath();
    context.moveTo(x, LANE_TOP + 10);
    context.lineTo(x, LANE_BOTTOM - 10);
    context.stroke();
  }

  drawJudgeTarget(context, false);
  const startIndex = lowerBound(events, nowMs - EJECT_MAX_MS);
  const endIndex = lowerBound(events, nowMs + FUTURE_WINDOW_MS + 0.001);

  for (let index = startIndex; index < endIndex; index += 1) {
    const event = events[index];
    const dt = event.time_ms - nowMs;
    if (dt < 0) continue;
    const x = JUDGE_X + dt * pxPerMs;
    drawNote(context, x, LANE_CENTER_Y, noteIsBig(event.type) ? BIG_NOTE_SIZE : NORMAL_NOTE_SIZE, event.type, 1);
  }

  for (let index = startIndex; index < endIndex; index += 1) {
    const event = events[index];
    const ageMs = nowMs - event.time_ms;
    if (ageMs < 0 || ageMs > EJECT_MAX_MS) continue;
    const alpha = ejectedOpacity(ageMs);
    if (alpha <= 0) continue;

    const age = ageMs / 1000;
    const x = JUDGE_X + EJECT_VX * age;
    const y = LANE_CENTER_Y + EJECT_VY0 * age + 0.5 * EJECT_GRAVITY * age * age;
    const z = EJECT_Z_RATE * age;
    const scale = 1 / (1 + EJECT_PERSPECTIVE * z);
    const diameter = (noteIsBig(event.type) ? BIG_NOTE_SIZE : NORMAL_NOTE_SIZE) * scale;
    drawNote(context, x, y, diameter, event.type, alpha);
  }

  drawJudgeTarget(context, true);
}

function drawJudgeTarget(context, outerOnly) {
  context.save();
  if (!outerOnly) {
    context.strokeStyle = "rgba(248,248,250,0.18)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(JUDGE_X, LANE_TOP + 10);
    context.lineTo(JUDGE_X, LANE_BOTTOM - 10);
    context.stroke();
    context.strokeStyle = "rgba(248,248,250,0.26)";
    context.beginPath();
    context.arc(JUDGE_X, LANE_CENTER_Y, NORMAL_NOTE_SIZE / 2, 0, Math.PI * 2);
    context.stroke();
  } else {
    context.strokeStyle = "rgba(248,248,250,0.76)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(JUDGE_X, LANE_CENTER_Y, JUDGE_OUTER_DIAMETER / 2, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function buildDensity(events, durationMs, width) {
  const binCount = clamp(Math.floor(width / 8), 28, 46);
  const counts = Array(binCount).fill(0);
  if (!durationMs) return counts;

  for (const event of events || []) {
    const time = clamp(event.time_ms, 0, Math.max(0, durationMs - 1));
    const bin = Math.min(binCount - 1, Math.floor((time / durationMs) * binCount));
    counts[bin] += 1;
  }

  const smoothed = counts.map((value, index) => {
    const previous = counts[index - 1] ?? value;
    const next = counts[index + 1] ?? value;
    return previous * 0.2 + value * 0.6 + next * 0.2;
  });

  const nonZero = smoothed.filter((value) => value > 0).sort((a, b) => a - b);
  const p90 = nonZero.length ? nonZero[Math.round((nonZero.length - 1) * 0.9)] : 1;
  return smoothed.map((value) => value > 0 ? Math.min(1, Math.sqrt(value / p90)) : 0);
}

function chooseMajorTick(durationSeconds) {
  const target = durationSeconds / 6;
  return [1, 2, 5, 10, 15, 20, 30, 60, 120]
    .reduce((best, value) => Math.abs(value - target) < Math.abs(best - target) ? value : best, 1);
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawOverviewStatic() {
  const context = overviewStaticCtx;
  context.clearRect(0, 0, OVERVIEW_WIDTH, OVERVIEW_HEIGHT);
  if (!timelineChart || playbackDurationMs <= 0) return;

  const effectStart = timelineChart.effect_window_start_ms ?? timelineChart.kiai_start_ms ?? 0;
  const effectEnd = timelineChart.effect_window_end_ms ?? timelineChart.kiai_end_ms ?? playbackDurationMs;
  const windowX = effectStart / playbackDurationMs * OVERVIEW_WIDTH;
  const windowWidth = Math.max(1, (effectEnd - effectStart) / playbackDurationMs * OVERVIEW_WIDTH);
  context.fillStyle = "rgba(255,255,255,0.07)";
  roundedRect(context, windowX, 8, windowWidth, 52, 3);
  context.fill();

  const density = buildDensity(timelineChart.events, playbackDurationMs, OVERVIEW_WIDTH);
  const binWidth = OVERVIEW_WIDTH / density.length;
  const baseline = 58;
  context.fillStyle = "rgba(224,226,232,0.58)";
  density.forEach((value, index) => {
    const x = Math.round(index * binWidth);
    const right = Math.round((index + 1) * binWidth) - 2;
    const height = Math.max(1, Math.round(value * 38));
    roundedRect(context, x, baseline - height, Math.max(1, right - x), height, 1);
    context.fill();
  });

  context.fillStyle = "rgba(230,230,236,0.20)";
  context.fillRect(0, 60, OVERVIEW_WIDTH, 1);

  const durationSeconds = playbackDurationMs / 1000;
  const major = chooseMajorTick(durationSeconds);
  const minor = major / 4;
  context.font = "11px system-ui, sans-serif";
  context.textBaseline = "top";

  for (let time = 0; time <= durationSeconds + 0.0001; time += minor) {
    const x = durationSeconds ? time / durationSeconds * (OVERVIEW_WIDTH - 1) : 0;
    const isMajor = Math.abs(time / major - Math.round(time / major)) < 0.0001;
    context.fillStyle = isMajor ? "rgba(230,230,236,0.35)" : "rgba(230,230,236,0.15)";
    context.fillRect(Math.round(x), 61, 1, isMajor ? 5 : 3);
    if (isMajor) {
      context.fillStyle = "rgba(225,225,232,0.55)";
      context.fillText(formatTime(time), Math.min(OVERVIEW_WIDTH - 35, Math.round(x) + 3), 66);
    }
  }

  const endLabel = formatTime(durationSeconds);
  const width = context.measureText(endLabel).width;
  context.fillStyle = "#161619";
  context.fillRect(OVERVIEW_WIDTH - width - 8, 65, width + 8, 19);
  context.fillStyle = "rgba(225,225,232,0.55)";
  context.fillText(endLabel, OVERVIEW_WIDTH - width - 4, 66);
}

function drawOverviewCursor(currentMs, previewMs = null) {
  const context = overviewCursorCtx;
  context.clearRect(0, 0, OVERVIEW_WIDTH, OVERVIEW_HEIGHT);
  if (playbackDurationMs <= 0) return;

  const currentX = clamp(currentMs / playbackDurationMs * (OVERVIEW_WIDTH - 1), 0, OVERVIEW_WIDTH - 1);
  context.fillStyle = "rgba(252,252,255,0.85)";
  context.fillRect(Math.round(currentX) - 1, 7, 2, 54);
  context.beginPath();
  context.moveTo(currentX - 4, 5);
  context.lineTo(currentX + 4, 5);
  context.lineTo(currentX, 10);
  context.closePath();
  context.fill();

  if (previewMs === null) return;
  const previewX = clamp(previewMs / playbackDurationMs * (OVERVIEW_WIDTH - 1), 0, OVERVIEW_WIDTH - 1);
  context.fillStyle = "rgba(252,252,255,0.38)";
  context.fillRect(Math.round(previewX), 7, 1, 54);

  const label = formatTime(previewMs / 1000, true);
  context.font = "11px system-ui, sans-serif";
  const textWidth = context.measureText(label).width;
  const boxX = clamp(previewX - textWidth / 2 - 5, 2, OVERVIEW_WIDTH - textWidth - 12);
  context.fillStyle = "rgba(10,10,12,0.88)";
  roundedRect(context, boxX, 10, textWidth + 10, 18, 4);
  context.fill();
  context.fillStyle = "rgba(250,250,252,0.90)";
  context.textBaseline = "top";
  context.fillText(label, boxX + 5, 12);
}

function overviewTimeFromPointer(event) {
  const rect = overview.getBoundingClientRect();
  const x = clamp(event.clientX - rect.left, 0, rect.width);
  return rect.width ? x / rect.width * playbackDurationMs : 0;
}

function clearOverviewPreview() {
  overviewPreviewMs = null;
  drawOverviewCursor(playbackCurrentMs, null);
}

overview.addEventListener("pointerdown", (event) => {
  if (!engine.musicBuffer || playbackDurationMs <= 0) return;
  overview.focus({ preventScroll: true });
  overview.setPointerCapture(event.pointerId);
  overviewPreviewMs = overviewTimeFromPointer(event);
  overviewDrag = { pointerId: event.pointerId };
  drawOverviewCursor(playbackCurrentMs, overviewPreviewMs);
});

overview.addEventListener("pointermove", (event) => {
  if (!overviewDrag || overviewDrag.pointerId !== event.pointerId) return;
  overviewPreviewMs = overviewTimeFromPointer(event);
  drawOverviewCursor(playbackCurrentMs, overviewPreviewMs);
});

overview.addEventListener("pointerup", async (event) => {
  if (!overviewDrag || overviewDrag.pointerId !== event.pointerId) return;
  const targetMs = overviewTimeFromPointer(event);
  overviewDrag = null;
  overview.releasePointerCapture(event.pointerId);
  clearOverviewPreview();
  try {
    await engine.seek(targetMs / 1000);
    updatePlayerState(engine.playing);
  } catch (error) {
    console.error(error);
  }
});

overview.addEventListener("pointercancel", () => {
  overviewDrag = null;
  clearOverviewPreview();
});

overview.addEventListener("keydown", async (event) => {
  if (!engine.musicBuffer) return;
  let target = engine.position;
  if (event.key === "ArrowLeft") target -= event.shiftKey ? 5 : 1;
  else if (event.key === "ArrowRight") target += event.shiftKey ? 5 : 1;
  else if (event.key === "Home") target = 0;
  else if (event.key === "End") target = engine.musicBuffer.duration;
  else return;
  event.preventDefault();
  await engine.seek(target);
  updatePlayerState(engine.playing);
});

playButton.addEventListener("click", async () => {
  try {
    if (engine.playing) {
      engine.pause();
      updatePlayerState(false);
    } else {
      await engine.play();
      updatePlayerState(true);
    }
  } catch (error) {
    console.error(error);
    statusElement.textContent = error.message;
    updatePlayerState(false);
  }
});

seekInput.addEventListener("input", async () => {
  try {
    await engine.seek(Number(seekInput.value));
    updatePlayerState(engine.playing);
  } catch (error) {
    console.error(error);
  }
});

function setEffectVolume(value) {
  const normalized = clamp(Math.round(Number(value) / 5) * 5, 0, 100);
  effectVolumeInput.value = String(normalized);
  effectVolumeOutput.value = `${normalized}%`;
  effectVolumeOutput.textContent = `${normalized}%`;
  effectVolumeInput.style.setProperty("--volume-fill", `${normalized}%`);
  engine.setEffectVolume(normalized);
}

effectVolumeInput.addEventListener("input", () => setEffectVolume(effectVolumeInput.value));
effectVolumeInput.addEventListener("wheel", (event) => {
  event.preventDefault();
  const direction = event.deltaY < 0 ? 1 : -1;
  setEffectVolume(Number(effectVolumeInput.value) + direction * 5);
}, { passive: false });

mobileSongSelect?.addEventListener("change", () => {
  if (mobileSongSelect.value) selectSong(mobileSongSelect.value);
});

window.addEventListener("resize", () => drawMobileObjectTimeline(playbackCurrentMs / 1000));
window.addEventListener("orientationchange", () => setTimeout(() => drawMobileObjectTimeline(playbackCurrentMs / 1000), 0));

async function bootstrap() {
  buildSoundSlots();
  initializeSourceSelector();
  setEffectVolume(80);
  drawObjectTimeline(0);
  drawMobileObjectTimeline(0);
  drawOverviewStatic();
  drawOverviewCursor(0);

  // Load all currently confirmed fixed preset sources before loading the first song,
  // so the first common-master safety analysis already includes Preset A.
  await preloadConfiguredPresets();
  await loadCatalog();
}

bootstrap().catch((error) => {
  console.error(error);
  songArea.setAttribute("aria-busy", "false");
  songArea.innerHTML = `<p class="error-note">初期化に失敗しました。</p>`;
  statusElement.textContent = error.message;
});
