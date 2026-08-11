import { HitsoundTesterEngine } from "./audio-engine.js";

const ASSET_ROOT = "./assets/";
const DON_COLOR = "#EEB9B2";
const KAT_COLOR = "#B0CCD7";
const SLOT_DEFS = [
  { key: "don", label: "Don", required: true },
  { key: "big_don", label: "BigDon", required: false },
  { key: "kat", label: "Kat", required: true },
  { key: "big_kat", label: "BigKat", required: false },
];

const setArea = document.querySelector("#set-area");
const songArea = document.querySelector("#song-area");
const disc = document.querySelector(".disc");
const discLabel = document.querySelector(".disc-label");
const waveform = document.querySelector(".waveform");
const player = document.querySelector(".player");
const playButton = document.querySelector(".play-button");
const playIcon = document.querySelector(".play-icon");
const seekInput = document.querySelector(".seek-input");
const currentTimeElement = document.querySelector(".current-time");
const totalTimeElement = document.querySelector(".total-time");
const statusElement = document.querySelector(".player-status");
const effectVolumeInput = document.querySelector("#effect-volume-input");
const effectVolumeOutput = document.querySelector("#effect-volume-output");

let catalog = null;
let activeSongId = null;
let activeSet = 0;
let loadingSongToken = 0;

const engine = new HitsoundTesterEngine({
  onTime: updateTimeline,
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

function formatTime(seconds) {
  const whole = Math.floor(Math.max(0, seconds));
  const minutes = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateTimeline(current, duration) {
  const d = Math.max(0, duration || 0);
  const c = Math.min(Math.max(0, current || 0), d);
  seekInput.max = String(d || 1);
  seekInput.value = String(c);
  currentTimeElement.textContent = formatTime(c);
  totalTimeElement.textContent = formatTime(d);
  currentTimeElement.dateTime = `PT${Math.floor(c)}S`;
  totalTimeElement.dateTime = `PT${Math.floor(d)}S`;
  seekInput.setAttribute("aria-valuetext", `${formatTime(c)} of ${formatTime(d)}`);
}

function updatePlayerState(playing = engine.playing) {
  player.classList.toggle("is-playing", playing);
  player.classList.toggle("is-paused", !playing);
  player.dataset.playerState = playing ? "playing" : "paused";
  playButton.setAttribute("aria-pressed", String(playing));
  playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
  playIcon.textContent = playing ? "⏸" : "▶";
}

function updatePlayAvailability() {
  const ready = engine.isPlaybackReady(activeSet);
  playButton.disabled = !ready;
  seekInput.disabled = !engine.musicBuffer;

  if (!engine.musicBuffer) {
    statusElement.textContent = "曲assetを読み込んでいます…";
  } else if (!engine.hasRequiredHitsounds(activeSet)) {
    statusElement.textContent = "選択SETのDon / Katを読み込んでください。";
  } else if (!engine.safetyReady) {
    statusElement.textContent = "True Peak安全Gainを計算しています…";
  } else if (engine.safetyResult) {
    statusElement.textContent =
      `再生できます。Master ${engine.safetyResult.fixedSafeGainDb.toFixed(2)} dB`;
  } else {
    statusElement.textContent = "再生準備中です…";
  }
}

function buildSetCards() {
  setArea.textContent = "";
  for (let setIndex = 0; setIndex < 3; setIndex += 1) {
    const card = document.createElement("article");
    card.className = `set-card${setIndex === 0 ? " is-active" : ""}`;
    card.dataset.setCard = String(setIndex + 1);

    const selector = document.createElement("button");
    selector.className = "set-selector";
    selector.type = "button";
    selector.dataset.set = String(setIndex + 1);
    selector.setAttribute("aria-pressed", String(setIndex === 0));
    selector.textContent = `SET ${String(setIndex + 1).padStart(2, "0")}`;
    selector.addEventListener("click", () => selectSet(setIndex));
    card.append(selector);

    const slots = document.createElement("div");
    slots.className = "sound-slots";
    for (const def of SLOT_DEFS) {
      const slot = document.createElement("div");
      slot.className = "sound-slot";
      const input = document.createElement("input");
      input.className = "file-input";
      input.type = "file";
      input.accept = "audio/*";
      input.id = `set-${setIndex + 1}-${def.key}`;
      input.dataset.set = String(setIndex + 1);
      input.dataset.sound = def.key;
      input.setAttribute("aria-label", `SET ${setIndex + 1} ${def.label} audio file, unloaded`);
      const label = document.createElement("label");
      label.className = `sound-trigger sound-${def.key.startsWith("kat") || def.key === "big_kat" ? "kat" : "don"}`;
      label.htmlFor = input.id;
      label.textContent = `${def.label}${def.required ? "" : " · optional"}`;
      input.addEventListener("change", async () => {
        const file = input.files?.[0] || null;
        try {
          label.classList.add("is-loading");
          playButton.disabled = true;
          await engine.setHitsound(setIndex, def.key, file);
          label.classList.toggle("is-loaded", Boolean(file));
          input.setAttribute("aria-label", `SET ${setIndex + 1} ${def.label} audio file, ${file ? "loaded" : "unloaded"}`);
          if (setIndex === activeSet) drawWaveforms();
          updatePlayAvailability();
        } catch (error) {
          console.error(error);
          label.classList.remove("is-loaded");
          statusElement.textContent = `${def.label}の読み込みに失敗しました。`;
        } finally {
          label.classList.remove("is-loading");
        }
      });
      slot.append(input, label);
      slots.append(slot);
    }
    card.append(slots);
    setArea.append(card);
  }
}

function selectSet(index) {
  if (index === activeSet) return;
  activeSet = index;
  engine.setActiveSet(index);
  [...document.querySelectorAll(".set-card")].forEach((card, i) => card.classList.toggle("is-active", i === index));
  [...document.querySelectorAll(".set-selector")].forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
  updatePlayerState(false);
  drawWaveforms();
  updatePlayAvailability();
}

async function loadCatalog() {
  const response = await fetch(`${ASSET_ROOT}01_song_catalog.json`);
  if (!response.ok) throw new Error(`Catalog load failed: ${response.status}`);
  catalog = await response.json();
  if (catalog.schema_version !== 2 || catalog.package_version !== "2.0") {
    throw new Error(`Unexpected asset catalog version: schema=${catalog.schema_version}, package=${catalog.package_version}`);
  }
  renderSongs();
  if (catalog.songs.length) await selectSong(catalog.songs[0].id);
}

function renderSongs() {
  songArea.textContent = "";
  songArea.setAttribute("aria-busy", "false");
  for (const song of catalog.songs) {
    const button = document.createElement("button");
    button.className = "song-button";
    button.type = "button";
    button.dataset.songId = song.id;
    button.setAttribute("aria-pressed", "false");
    const name = document.createElement("span");
    name.className = "song-name";
    name.textContent = song.display_name;
    const purpose = document.createElement("span");
    purpose.className = "song-purpose";
    purpose.textContent = song.purpose;
    button.append(name, purpose);
    button.addEventListener("click", () => selectSong(song.id));
    songArea.append(button);
  }
}

async function selectSong(songId) {
  const song = catalog.songs.find((entry) => entry.id === songId);
  if (!song || (activeSongId === songId && engine.musicBuffer)) return;
  const token = ++loadingSongToken;
  activeSongId = songId;
  [...document.querySelectorAll(".song-button")].forEach((button) => {
    const active = button.dataset.songId === songId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updatePlayerState(false);
  playButton.disabled = true;
  seekInput.disabled = true;
  discLabel.textContent = song.id.replace("song", "SONG ");
  disc.style.backgroundImage = `linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.18)), url("${ASSET_ROOT}${song.background}")`;
  disc.setAttribute("aria-label", `${song.display_name} artwork`);
  try {
    const result = await engine.loadSong({ musicUrl: `${ASSET_ROOT}${song.music}`, chartUrl: `${ASSET_ROOT}${song.chart}` });
    if (token !== loadingSongToken || result?.stale) return;
    updatePlayAvailability();
  } catch (error) {
    console.error(error);
    statusElement.textContent = `曲assetの読み込みに失敗しました: ${error.message}`;
  }
}

function drawBuffer(ctx, buffer, color, width, height) {
  if (!buffer) return;
  const data = buffer.getChannelData(0);
  const maxSamples = Math.min(data.length, Math.floor(buffer.sampleRate * 1.0));
  if (maxSamples <= 1) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const mid = height / 2;
  const step = Math.max(1, Math.floor(maxSamples / width));
  for (let x = 0; x < width; x += 1) {
    const start = Math.min(maxSamples - 1, x * step);
    const end = Math.min(maxSamples, start + step);
    let min = 1;
    let max = -1;
    for (let i = start; i < end; i += 1) {
      const value = data[i];
      if (value < min) min = value;
      if (value > max) max = value;
    }
    const y1 = mid - max * (height * 0.42);
    const y2 = mid - min * (height * 0.42);
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
  }
  ctx.stroke();
}

function drawWaveforms() {
  const ctx = waveform.getContext("2d");
  const { width, height } = waveform;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(0,0,0,.12)";
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  const set = engine.sets[activeSet];
  drawBuffer(ctx, set.don, DON_COLOR, width, height);
  drawBuffer(ctx, set.kat, KAT_COLOR, width, height);
  ctx.fillStyle = "rgba(0,0,0,.62)";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("0 ms", 8, height - 8);
  ctx.textAlign = "right";
  ctx.fillText("1.0 s", width - 8, height - 8);
  ctx.textAlign = "left";
}

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

effectVolumeInput.addEventListener("input", () => {
  const value = Number(effectVolumeInput.value);
  effectVolumeOutput.value = `${value}%`;
  engine.setEffectVolume(value);
});

effectVolumeInput.addEventListener("wheel", (event) => {
  event.preventDefault();
  const direction = event.deltaY < 0 ? 1 : -1;
  const next = Math.min(100, Math.max(0, Number(effectVolumeInput.value) + direction * 5));
  effectVolumeInput.value = String(next);
  effectVolumeInput.dispatchEvent(new Event("input", { bubbles: true }));
}, { passive: false });

buildSetCards();
drawWaveforms();
engine.setEffectVolume(80);
loadCatalog().catch((error) => {
  console.error(error);
  songArea.setAttribute("aria-busy", "false");
  songArea.innerHTML = `<p class="error-note">曲asset catalogを読み込めませんでした。</p>`;
  statusElement.textContent = error.message;
});
