const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function raisedCosineIn(u) {
  const x = clamp(u, 0, 1);
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

function raisedCosineOut(u) {
  const x = clamp(u, 0, 1);
  return 0.5 + 0.5 * Math.cos(Math.PI * x);
}

export function eventEnvelopeGain(chart, timeMs) {
  const env = chart.effect_envelope;
  if (!env) return 1;

  if (timeMs < env.fade_in_start_ms || timeMs >= env.fade_out_end_ms) return 0;
  if (timeMs < env.fade_in_end_ms) {
    const denom = env.fade_in_end_ms - env.fade_in_start_ms;
    return denom > 0 ? raisedCosineIn((timeMs - env.fade_in_start_ms) / denom) : 1;
  }
  if (timeMs < env.fade_out_start_ms) return 1;
  const denom = env.fade_out_end_ms - env.fade_out_start_ms;
  return denom > 0 ? raisedCosineOut((timeMs - env.fade_out_start_ms) / denom) : 0;
}

export class HitsoundTesterEngine {
  constructor({ onTime, onEnded, onStatus } = {}) {
    this.context = null;
    this.masterGain = null;
    this.effectGain = null;
    this.musicBuffer = null;
    this.chart = null;
    this.sets = Array.from({ length: 3 }, () => ({ don: null, big_don: null, kat: null, big_kat: null }));
    this.activeSet = 0;
    this.effectVolume = 0.8;
    this.position = 0;
    this.playing = false;
    this.startedAt = 0;
    this.musicSource = null;
    this.effectSources = new Set();
    this.raf = 0;
    this.fixedMasterGain = 1;
    this.onTime = onTime || (() => {});
    this.onEnded = onEnded || (() => {});
    this.onStatus = onStatus || (() => {});
  }

  async ensureContext() {
    if (!this.context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) throw new Error("Web Audio API is not supported in this browser.");
      this.context = new AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.effectGain = this.context.createGain();
      this.masterGain.gain.value = this.fixedMasterGain;
      this.effectGain.gain.value = this.effectVolume;
      this.effectGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
    return this.context;
  }

  async decodeArrayBuffer(arrayBuffer) {
    const ctx = await this.ensureContext();
    return ctx.decodeAudioData(arrayBuffer.slice(0));
  }

  async loadFile(file) {
    return this.decodeArrayBuffer(await file.arrayBuffer());
  }

  async loadSong({ musicUrl, chartUrl }) {
    this.stop(true);
    this.onStatus("曲assetを読み込んでいます…");
    const [musicRes, chartRes] = await Promise.all([fetch(musicUrl), fetch(chartUrl)]);
    if (!musicRes.ok) throw new Error(`music.ogg load failed: ${musicRes.status}`);
    if (!chartRes.ok) throw new Error(`chart.json load failed: ${chartRes.status}`);
    const chart = await chartRes.json();
    if (chart.schema_version !== 2) throw new Error(`Unsupported chart schema: ${chart.schema_version}`);
    this.chart = chart;
    this.musicBuffer = await this.decodeArrayBuffer(await musicRes.arrayBuffer());
    this.position = 0;
    this.onTime(0, this.musicBuffer.duration);
    this.onStatus("曲assetを読み込みました。");
    return { duration: this.musicBuffer.duration, sampleRate: this.musicBuffer.sampleRate };
  }

  setActiveSet(index) {
    if (index === this.activeSet) return;
    this.stop(true);
    this.activeSet = index;
  }

  async setHitsound(setIndex, type, file) {
    if (!file) {
      this.sets[setIndex][type] = null;
      return null;
    }
    const buffer = await this.loadFile(file);
    this.sets[setIndex][type] = buffer;
    return buffer;
  }

  hasRequiredHitsounds(setIndex = this.activeSet) {
    const set = this.sets[setIndex];
    return Boolean(set.don && set.kat);
  }

  resolveBuffer(eventType, setIndex = this.activeSet) {
    const set = this.sets[setIndex];
    if (eventType === "don") return set.don;
    if (eventType === "kat") return set.kat;
    if (eventType === "big_don") return set.big_don || set.don;
    if (eventType === "big_kat") return set.big_kat || set.kat;
    return null;
  }

  setEffectVolume(percent) {
    const p = clamp(Number(percent), 0, 100);
    this.effectVolume = p / 100;
    if (this.context && this.effectGain) {
      const now = this.context.currentTime;
      const param = this.effectGain.gain;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(this.effectVolume, now + 0.02);
    }
  }

  setFixedMasterGain(linearGain) {
    this.fixedMasterGain = clamp(Number(linearGain), 0, 1);
    if (this.masterGain && this.context) {
      this.masterGain.gain.setValueAtTime(this.fixedMasterGain, this.context.currentTime);
    }
  }

  stop(reset = false) {
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch {}
      this.musicSource.disconnect();
      this.musicSource = null;
    }
    for (const source of this.effectSources) {
      try { source.stop(); } catch {}
      source.disconnect();
    }
    this.effectSources.clear();
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (reset) this.position = 0;
    this.onTime(this.position, this.musicBuffer?.duration || 0);
  }

  pause() {
    if (!this.playing || !this.context) return;
    this.position = clamp(this.context.currentTime - this.startedAt, 0, this.musicBuffer?.duration || 0);
    this.stop(false);
  }

  seek(seconds) {
    const duration = this.musicBuffer?.duration || 0;
    const target = clamp(Number(seconds), 0, duration);
    const wasPlaying = this.playing;
    this.stop(false);
    this.position = target;
    this.onTime(this.position, duration);
    if (wasPlaying) return this.play();
  }

  async play() {
    if (!this.musicBuffer || !this.chart) throw new Error("Song is not loaded.");
    if (!this.hasRequiredHitsounds()) throw new Error("Active SET requires Don and Kat.");
    const ctx = await this.ensureContext();
    if (this.position >= this.musicBuffer.duration - 0.001) this.position = 0;

    const startAt = ctx.currentTime + 0.05;
    const offset = this.position;
    this.startedAt = startAt - offset;

    const music = ctx.createBufferSource();
    music.buffer = this.musicBuffer;
    music.connect(this.masterGain);
    music.onended = () => {
      if (this.musicSource !== music) return;
      this.musicSource = null;
      this.playing = false;
      this.position = this.musicBuffer.duration;
      cancelAnimationFrame(this.raf);
      this.onTime(this.position, this.musicBuffer.duration);
      this.onEnded();
    };
    music.start(startAt, offset);
    this.musicSource = music;

    for (const event of this.chart.events) {
      const eventSec = event.time_ms / 1000;
      if (eventSec < offset) continue;
      const buffer = this.resolveBuffer(event.type);
      if (!buffer) continue;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const eventGainNode = ctx.createGain();
      eventGainNode.gain.value = eventEnvelopeGain(this.chart, event.time_ms);
      source.connect(eventGainNode).connect(this.effectGain);
      const when = startAt + (eventSec - offset);
      source.start(when);
      this.effectSources.add(source);
      source.onended = () => {
        this.effectSources.delete(source);
        source.disconnect();
        eventGainNode.disconnect();
      };
    }

    this.playing = true;
    const tick = () => {
      if (!this.playing) return;
      this.position = clamp(ctx.currentTime - this.startedAt, 0, this.musicBuffer.duration);
      this.onTime(this.position, this.musicBuffer.duration);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
}
