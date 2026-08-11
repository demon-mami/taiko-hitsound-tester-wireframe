import { TruePeakSafetyAnalyzer } from "./true-peak-safety.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class HitsoundTesterEngine {
  constructor({ onTime, onEnded, onStatus, onSafety } = {}) {
    this.context = null;
    this.masterGain = null;
    this.effectGain = null;

    this.musicBuffer = null;
    this.chart = null;
    this.sets = Array.from({ length: 3 }, () => ({
      don: null,
      big_don: null,
      kat: null,
      big_kat: null,
    }));

    this.effectBusBuffers = [null, null, null];
    this.activeSet = 0;
    this.effectVolume = 0.8;
    this.position = 0;
    this.playing = false;
    this.startedAt = 0;
    this.musicSource = null;
    this.effectSource = null;
    this.raf = 0;

    this.fixedMasterGain = 1;
    this.safetyReady = false;
    this.safetyResult = null;
    this.safetyGeneration = 0;
    this.songLoadGeneration = 0;
    this.safetyAnalyzer = new TruePeakSafetyAnalyzer();

    this.onTime = onTime || (() => {});
    this.onEnded = onEnded || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onSafety = onSafety || (() => {});
  }

  async ensureContext({ resume = false } = {}) {
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

    if (resume && this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context;
  }

  async decodeArrayBuffer(arrayBuffer) {
    const ctx = await this.ensureContext({ resume: false });
    return ctx.decodeAudioData(arrayBuffer.slice(0));
  }

  async loadFile(file) {
    return this.decodeArrayBuffer(await file.arrayBuffer());
  }

  invalidateSafety(message = "安全Gainを再計算します。") {
    this.safetyGeneration += 1;
    this.safetyAnalyzer.cancelAll(message);
    this.safetyReady = false;
    this.safetyResult = null;
    this.effectBusBuffers = [null, null, null];
    this.onSafety(null);
  }

  createEffectAudioBuffer(serializedBus) {
    if (!serializedBus) return null;
    const ctx = this.context;
    const buffer = ctx.createBuffer(
      serializedBus.numberOfChannels,
      serializedBus.length,
      serializedBus.sampleRate,
    );

    serializedBus.channels.forEach((channel, index) => {
      buffer.copyToChannel(channel, index);
    });

    return buffer;
  }

  async rebuildSafety() {
    if (!this.musicBuffer || !this.chart) {
      this.safetyReady = false;
      return null;
    }

    this.stop(false);
    const generation = ++this.safetyGeneration;
    this.safetyAnalyzer.cancelAll("Safety inputs changed.");
    this.safetyReady = false;
    this.onSafety(null);
    this.onStatus("True Peak安全Gainを計算しています…");

    try {
      const result = await this.safetyAnalyzer.analyze({
        musicBuffer: this.musicBuffer,
        chart: this.chart,
        sets: this.sets,
      });

      if (generation !== this.safetyGeneration) return null;

      this.effectBusBuffers = result.effectBuses.map((bus) => this.createEffectAudioBuffer(bus));
      this.fixedMasterGain = clamp(result.fixedSafeGainLinear, 0, 1);
      this.masterGain.gain.setValueAtTime(
        this.fixedMasterGain,
        this.context.currentTime,
      );

      this.safetyResult = result;
      this.safetyReady = true;
      this.onSafety(result);
      this.onStatus(
        `安全Gain確定: Master ${result.fixedSafeGainDb.toFixed(2)} dB / WorstTP ${result.worstTpMeasuredDb.toFixed(2)} dBTP`,
      );
      return result;
    } catch (error) {
      if (generation !== this.safetyGeneration || error?.name === "AbortError") {
        return null;
      }

      this.safetyReady = false;
      this.safetyResult = null;
      this.onSafety(null);
      this.onStatus(`True Peak安全計算に失敗しました: ${error.message}`);
      throw error;
    }
  }

  async loadSong({ musicUrl, chartUrl }) {
    this.stop(true);
    this.invalidateSafety("Song changed.");
    const generation = ++this.songLoadGeneration;
    this.onStatus("曲assetを読み込んでいます…");

    const [musicRes, chartRes] = await Promise.all([
      fetch(musicUrl),
      fetch(chartUrl),
    ]);

    if (!musicRes.ok) throw new Error(`music.ogg load failed: ${musicRes.status}`);
    if (!chartRes.ok) throw new Error(`chart.json load failed: ${chartRes.status}`);

    const [chart, musicArrayBuffer] = await Promise.all([
      chartRes.json(),
      musicRes.arrayBuffer(),
    ]);

    if (chart.schema_version !== 2) {
      throw new Error(`Unsupported chart schema: ${chart.schema_version}`);
    }

    const musicBuffer = await this.decodeArrayBuffer(musicArrayBuffer);

    if (generation !== this.songLoadGeneration) {
      return { stale: true };
    }

    this.chart = chart;
    this.musicBuffer = musicBuffer;
    this.position = 0;
    this.onTime(0, this.musicBuffer.duration);
    this.onStatus("曲assetを読み込みました。安全Gainを計算します…");

    await this.rebuildSafety();

    if (generation !== this.songLoadGeneration) {
      return { stale: true };
    }

    return {
      duration: this.musicBuffer.duration,
      sampleRate: this.musicBuffer.sampleRate,
      safety: this.safetyResult,
    };
  }

  setActiveSet(index) {
    if (index === this.activeSet) return;
    this.stop(true);
    this.activeSet = index;
  }

  async setHitsound(setIndex, type, file) {
    this.stop(false);

    if (!file) {
      this.sets[setIndex][type] = null;
      await this.rebuildSafety();
      return null;
    }

    const buffer = await this.loadFile(file);
    this.sets[setIndex][type] = buffer;
    await this.rebuildSafety();
    return buffer;
  }

  hasRequiredHitsounds(setIndex = this.activeSet) {
    const set = this.sets[setIndex];
    return Boolean(set.don && set.kat);
  }

  isPlaybackReady(setIndex = this.activeSet) {
    return Boolean(
      this.musicBuffer
      && this.chart
      && this.safetyReady
      && this.effectBusBuffers[setIndex]
      && this.hasRequiredHitsounds(setIndex)
    );
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

  stop(reset = false) {
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch {}
      this.musicSource.disconnect();
      this.musicSource = null;
    }

    if (this.effectSource) {
      try { this.effectSource.stop(); } catch {}
      this.effectSource.disconnect();
      this.effectSource = null;
    }

    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;

    if (reset) this.position = 0;
    this.onTime(this.position, this.musicBuffer?.duration || 0);
  }

  pause() {
    if (!this.playing || !this.context) return;
    this.position = clamp(
      this.context.currentTime - this.startedAt,
      0,
      this.musicBuffer?.duration || 0,
    );
    this.stop(false);
  }

  async seek(seconds) {
    const duration = this.musicBuffer?.duration || 0;
    const frame = this.musicBuffer
      ? Math.round(clamp(Number(seconds), 0, duration) * this.musicBuffer.sampleRate)
      : 0;
    const target = this.musicBuffer
      ? clamp(frame / this.musicBuffer.sampleRate, 0, duration)
      : 0;

    const wasPlaying = this.playing;
    this.stop(false);
    this.position = target;
    this.onTime(this.position, duration);

    if (wasPlaying) {
      await this.play();
    }
  }

  async play() {
    if (!this.musicBuffer || !this.chart) {
      throw new Error("Song is not loaded.");
    }
    if (!this.hasRequiredHitsounds()) {
      throw new Error("Active SET requires Don and Kat.");
    }
    if (!this.safetyReady || !this.effectBusBuffers[this.activeSet]) {
      throw new Error("True Peak安全Gainの計算完了を待ってください。");
    }

    const ctx = await this.ensureContext({ resume: true });

    if (this.position >= this.musicBuffer.duration - 0.001) {
      this.position = 0;
    }

    const startAt = ctx.currentTime + 0.05;
    const startFrame = Math.round(this.position * this.musicBuffer.sampleRate);
    const offset = startFrame / this.musicBuffer.sampleRate;
    this.position = offset;
    this.startedAt = startAt - offset;

    const music = ctx.createBufferSource();
    music.buffer = this.musicBuffer;
    music.connect(this.masterGain);

    const effect = ctx.createBufferSource();
    effect.buffer = this.effectBusBuffers[this.activeSet];
    effect.connect(this.effectGain);

    music.onended = () => {
      if (this.musicSource !== music) return;
      this.musicSource = null;
      this.effectSource = null;
      this.playing = false;
      this.position = this.musicBuffer.duration;
      cancelAnimationFrame(this.raf);
      this.onTime(this.position, this.musicBuffer.duration);
      this.onEnded();
    };

    music.start(startAt, offset);
    effect.start(startAt, offset);

    this.musicSource = music;
    this.effectSource = effect;
    this.playing = true;

    const tick = () => {
      if (!this.playing) return;
      this.position = clamp(
        ctx.currentTime - this.startedAt,
        0,
        this.musicBuffer.duration,
      );
      this.onTime(this.position, this.musicBuffer.duration);
      this.raf = requestAnimationFrame(tick);
    };

    this.raf = requestAnimationFrame(tick);
  }

  dispose() {
    this.stop(true);
    this.safetyAnalyzer.dispose();
    this.context?.close();
    this.context = null;
  }
}
