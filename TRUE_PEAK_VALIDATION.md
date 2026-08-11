# True Peak safety module validation — Stage 2

## Status

`project-certified` for the app's **stable-state fixedSafeGain calculation**.

This is an internal project certification and **not a claim that the application is an EBU Mode meter**.

## Production analyzer

- DedicatedWorker
- version-pinned WASM core
- 8× oversampling
- 383-tap FIR, 48 taps/phase
- Float32 input / Float64 accumulation
- per-channel maximum
- zero-padded filter tail
- stable conditions: `M`, `M+E1`, `M+E2`, `M+E3`
- fixed safety ceiling: `-1.0 dBTP`
- certified under-read margin: `0.25 dB`

## Validation results

Synthesized EBU Tech 3341 minimum-requirement steady sine cases:

| Test | Expected | WASM result |
|---|---:|---:|
| 15 | -6.0 dBTP | -6.027787 dBTP |
| 16 | -6.0 dBTP | -6.028930 dBTP |
| 17 | -6.0 dBTP | -6.024468 dBTP |
| 18 | -6.0 dBTP | -6.022548 dBTP |
| 19 | +3.0 dBTP | +2.976052 dBTP |

Additional internal validation:

- frequency/phase sweep: `0.01..0.455 × Fs`, 0.005 step, phase 0..355° / 5° step
  - maximum observed under-read: **0.122593 dB**
- band-limited random noise + multisine vs 64× reference
  - maximum observed under-read: **0.065891 dB**
- supplied `perfect-v3.2` Hitsounds vs 64× reference
  - maximum observed under-read: **0.043573 dB**
- 25 final Music assets, peak neighborhoods vs 64× reference
  - maximum observed under-read: **0.036371 dB**
- 25 Music + supplied Hitsound mixes, peak neighborhoods vs 64× reference
  - maximum observed under-read: **0.040064 dB**

Observed worst case:

```text
0.122593 dB
```

Configured safety allowance:

```text
0.250000 dB
```

Remaining release reserve against the observed suite:

```text
0.127407 dB
```

## Certification boundary

The certification applies to:

- actual Float32 PCM used by the app after `decodeAudioData()`
- stable Effect Gain in `[0,1]`
- one active SET at a time
- Master-bus safety calculation before device/output resampling
- audio content within the validated true-peak reconstruction bandwidth

Effect Volume ramps, SET transitions, Play/Pause boundaries, Seek boundaries and post-`AudioContext` device resampling remain separate transition/output-path validation items.

## External references used for the validation criteria

- ITU-R BS.1770-5 Annex 2 — Guidelines for accurate measurement of true-peak level
- EBU Tech 3341 — True Peak minimum-requirement tests 15–23 and total-error tolerance concept
