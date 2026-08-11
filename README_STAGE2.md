# Stage 2 — True Peak safety integration

Branch target:

```text
integration/v23-stage2-tp
```

## Purpose

This stage adds the audio-safety layer without deciding the final 25-song UI placement.

Implemented:

- DedicatedWorker True Peak analysis
- version-pinned WASM FIR core
- 8× oversampling
- 383-tap FIR / 48 taps per phase
- Float32 input / Float64 accumulation
- stable-state evaluation of:
  - `M`
  - `M + E1`
  - `M + E2`
  - `M + E3`
- project-certified under-read allowance: `0.25 dB`
- formal stable-state ceiling: `-1.0 dBTP`
- one fixed Master Gain shared across all SETs and Effect Volume values
- Effect Volume remains linear `0..1`
- SET switch does not recalculate Master
- Effect Volume change does not recalculate Master
- song / Hitsound changes rebuild the three completed Effect buses and recalculate safety
- playback is disabled while safety calculation is incomplete
- actual playback uses the same completed Effect-bus PCM used by the safety analyzer
- seek is quantized to the decoded Music sample frame
- BigDon/BigKat fallback is resolved while building Effect buses
- AudioContext does not require `resume()` for decode/safety analysis; it is resumed on user playback

## Not changed in this stage

- final layout/placement of the 25 songs
- final UI visual design
- True Peak transition-state validation for Effect Volume ramp / Play / Pause / Seek
- device-output-path resampling after the app Master bus

## Safety formula

```text
WorstTP_measured
= max(TP(M), TP(M+E1), TP(M+E2), TP(M+E3))

fixedSafeGain_dB
= min(
    0,
    -1.0
    - 0.25
    - WorstTP_measured
  )
```

The `0.25 dB` value is tied to `true-peak-certification.json` and the exact WASM/filter version. It must not be silently reused after changing the analyzer or coefficients.

See `TRUE_PEAK_VALIDATION.md`.
