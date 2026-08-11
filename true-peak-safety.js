const DEFAULT_TIMEOUT_MS = 30000;

function cloneAudioBuffer(buffer) {
  if (!buffer) return null;
  const channels = [];
  const transfers = [];
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = new Float32Array(buffer.getChannelData(ch));
    channels.push(data);
    transfers.push(data.buffer);
  }
  return {
    payload: {
      sampleRate: buffer.sampleRate,
      length: buffer.length,
      numberOfChannels: buffer.numberOfChannels,
      channels,
    },
    transfers,
  };
}

function serializeSet(set) {
  const payload = {};
  const transfers = [];
  for (const key of ["don", "big_don", "kat", "big_kat"]) {
    const item = cloneAudioBuffer(set[key]);
    payload[key] = item?.payload || null;
    if (item) transfers.push(...item.transfers);
  }
  return { payload, transfers };
}

export class TruePeakSafetyAnalyzer {
  constructor({ workerUrl = new URL("./true-peak-worker.js", import.meta.url) } = {}) {
    this.workerUrl = workerUrl;
    this.worker = null;
    this.pending = new Map();
    this.sequence = 0;
  }

  ensureWorker() {
    if (this.worker) return this.worker;
    this.worker = new Worker(this.workerUrl, { type: "module" });
    this.worker.addEventListener("message", (event) => {
      const { id, ok, result, error } = event.data || {};
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      clearTimeout(pending.timeout);
      if (ok) pending.resolve(result);
      else pending.reject(new Error(error || "True Peak analysis failed."));
    });
    this.worker.addEventListener("error", (event) => {
      const err = new Error(event.message || "True Peak worker failed.");
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timeout);
        pending.reject(err);
      }
      this.pending.clear();
      this.worker?.terminate();
      this.worker = null;
    });
    return this.worker;
  }

  cancelAll(reason = "True Peak analysis superseded.") {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    const err = new DOMException(reason, "AbortError");
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(err);
    }
    this.pending.clear();
  }

  async analyze({ musicBuffer, chart, sets, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    if (!musicBuffer) throw new Error("Music buffer is required for safety analysis.");
    if (!chart || chart.schema_version !== 2) throw new Error("chart schema v2 is required for safety analysis.");

    const music = cloneAudioBuffer(musicBuffer);
    const serializedSets = [];
    const transfers = [...music.transfers];

    for (const set of sets) {
      const serialized = serializeSet(set);
      serializedSets.push(serialized.payload);
      transfers.push(...serialized.transfers);
    }

    const id = ++this.sequence;
    const worker = this.ensureWorker();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("True Peak analysis timed out."));
        this.cancelAll("True Peak analysis timed out.");
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timeout });
      worker.postMessage({
        id,
        type: "analyze",
        music: music.payload,
        chart,
        sets: serializedSets,
      }, transfers);
    });
  }

  dispose() {
    this.cancelAll("True Peak analyzer disposed.");
  }
}
