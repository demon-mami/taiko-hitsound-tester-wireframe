const WASM_URL = new URL("./true-peak-core.wasm", import.meta.url);
const CERT_URL = new URL("./true-peak-certification.json", import.meta.url);

let runtimePromise = null;

async function sha256Hex(arrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function raisedCosineIn(u) {
  const x = clamp(u, 0, 1);
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

function raisedCosineOut(u) {
  const x = clamp(u, 0, 1);
  return 0.5 + 0.5 * Math.cos(Math.PI * x);
}

function eventEnvelopeGain(chart, timeMs) {
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

function resolveSound(set, type) {
  if (!set) return null;
  if (type === "don") return set.don;
  if (type === "kat") return set.kat;
  if (type === "big_don") return set.big_don || set.don;
  if (type === "big_kat") return set.big_kat || set.kat;
  return null;
}

function sampleForTargetChannel(sound, targetChannel, targetChannelCount, sourceIndex) {
  if (!sound || !sound.channels?.length) return 0;
  if (sound.numberOfChannels === 1) return sound.channels[0][sourceIndex] || 0;
  if (targetChannelCount === 1) {
    let sum = 0;
    for (let ch = 0; ch < sound.numberOfChannels; ch += 1) {
      sum += sound.channels[ch][sourceIndex] || 0;
    }
    return sum / sound.numberOfChannels;
  }
  const sourceChannel = Math.min(targetChannel, sound.numberOfChannels - 1);
  return sound.channels[sourceChannel][sourceIndex] || 0;
}

function assertSampleRateMatches(music, sets) {
  for (const set of sets) {
    for (const key of ["don", "big_don", "kat", "big_kat"]) {
      const sound = set?.[key];
      if (sound && sound.sampleRate !== music.sampleRate) {
        throw new Error(`Sample rate mismatch: ${key}=${sound.sampleRate}, music=${music.sampleRate}`);
      }
    }
  }
}

function buildEffectBuses(music, chart, sets) {
  const channels = music.numberOfChannels;
  const frames = music.length;
  const effectBuses = Array.from({ length: 3 }, () => ({
    sampleRate: music.sampleRate,
    length: frames,
    numberOfChannels: channels,
    channels: Array.from({ length: channels }, () => new Float32Array(frames)),
  }));

  for (const event of chart.events || []) {
    const startFrame = Math.round((event.time_ms * music.sampleRate) / 1000);
    if (startFrame < 0 || startFrame >= frames) continue;
    const eventGain = eventEnvelopeGain(chart, event.time_ms);
    if (eventGain === 0) continue;

    for (let setIndex = 0; setIndex < 3; setIndex += 1) {
      const sound = resolveSound(sets[setIndex], event.type);
      if (!sound) continue;
      const available = Math.min(sound.length, frames - startFrame);
      if (available <= 0) continue;

      for (let targetChannel = 0; targetChannel < channels; targetChannel += 1) {
        const target = effectBuses[setIndex].channels[targetChannel];
        for (let i = 0; i < available; i += 1) {
          target[startFrame + i] += sampleForTargetChannel(
            sound,
            targetChannel,
            channels,
            i,
          ) * eventGain;
        }
      }
    }
  }

  return effectBuses;
}

async function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const [certResponse, wasmResponse] = await Promise.all([
        fetch(CERT_URL, { cache: "no-store" }),
        fetch(WASM_URL, { cache: "no-store" }),
      ]);
      if (!certResponse.ok) throw new Error(`True Peak certification load failed: ${certResponse.status}`);
      if (!wasmResponse.ok) throw new Error(`True Peak WASM load failed: ${wasmResponse.status}`);

      const certification = await certResponse.json();
      if (certification.status !== "project-certified") {
        throw new Error(`True Peak analyzer is not certified: ${certification.status}`);
      }
      const wasmBytes = await wasmResponse.arrayBuffer();
      const wasmHash = await sha256Hex(wasmBytes);
      if (wasmHash !== certification.filter.wasm_sha256) {
        throw new Error(`True Peak WASM hash mismatch: ${wasmHash}`);
      }

      const { instance } = await WebAssembly.instantiate(wasmBytes, {});
      const api = instance.exports;

      if (api.tp_oversample_factor() !== certification.oversample_factor) {
        throw new Error("True Peak WASM oversampling factor does not match certification.");
      }
      if (api.tp_filter_taps_per_phase() !== certification.filter.taps_per_phase) {
        throw new Error("True Peak WASM filter tap count does not match certification.");
      }

      return { certification, api, memory: api.memory };
    })();
  }
  return runtimePromise;
}

function maxToDb(maxAbs) {
  return maxAbs > 0 ? 20 * Math.log10(maxAbs) : -Infinity;
}

function analyzeChannel(runtime, music, effectBuses, channelIndex) {
  const { api, memory } = runtime;
  api.tp_reset();

  const block = api.tp_block_capacity();
  const ptrs = [0, 1, 2, 3].map((i) => api.tp_get_input_ptr(i));
  const sources = [
    music.channels[channelIndex],
    effectBuses[0].channels[channelIndex],
    effectBuses[1].channels[channelIndex],
    effectBuses[2].channels[channelIndex],
  ];

  let offset = 0;
  while (offset < music.length) {
    const count = Math.min(block, music.length - offset);
    for (let i = 0; i < 4; i += 1) {
      const view = new Float32Array(memory.buffer, ptrs[i], count);
      view.set(sources[i].subarray(offset, offset + count));
    }
    api.tp_process_block(count);
    offset += count;
  }

  api.tp_flush();
  return [0, 1, 2, 3].map((i) => api.tp_get_max(i));
}

function analyzeStableConditions(runtime, music, effectBuses) {
  const maxima = [0, 0, 0, 0];
  for (let channel = 0; channel < music.numberOfChannels; channel += 1) {
    const channelMaxima = analyzeChannel(runtime, music, effectBuses, channel);
    for (let i = 0; i < 4; i += 1) {
      maxima[i] = Math.max(maxima[i], channelMaxima[i]);
    }
  }
  return maxima;
}

self.addEventListener("message", async (event) => {
  const { id, type, music, chart, sets } = event.data || {};
  if (type !== "analyze") return;

  try {
    if (!music?.channels?.length) throw new Error("Music PCM is missing.");
    if (chart?.schema_version !== 2) throw new Error("chart schema v2 is required.");
    if (!Array.isArray(sets) || sets.length !== 3) throw new Error("Exactly 3 SET containers are required.");

    assertSampleRateMatches(music, sets);
    const runtime = await loadRuntime();
    const effectBuses = buildEffectBuses(music, chart, sets);
    const maxima = analyzeStableConditions(runtime, music, effectBuses);
    const tpDb = maxima.map(maxToDb);
    const worstTpMeasuredDb = Math.max(...tpDb);
    const marginDb = runtime.certification.certified_underread_margin_db;
    const ceilingDb = runtime.certification.ceiling_dbTP;
    const fixedSafeGainDb = Math.min(0, ceilingDb - marginDb - worstTpMeasuredDb);
    const fixedSafeGainLinear = 10 ** (fixedSafeGainDb / 20);

    const transfer = [];
    for (const bus of effectBuses) {
      for (const channel of bus.channels) transfer.push(channel.buffer);
    }

    self.postMessage({
      id,
      ok: true,
      result: {
        analyzerVersion: runtime.certification.analyzer_version,
        certificationStatus: runtime.certification.status,
        sampleRate: music.sampleRate,
        tpDb,
        worstTpMeasuredDb,
        certifiedUnderreadMarginDb: marginDb,
        ceilingDbTP: ceilingDb,
        fixedSafeGainDb,
        fixedSafeGainLinear,
        effectBuses,
      },
    }, transfer);
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
