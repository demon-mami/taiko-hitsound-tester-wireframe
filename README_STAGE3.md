# Stage 3 — Practical audio validation

Branch:

```text
integration/v23-stage3-practical
```

## Purpose

Stage 3 deliberately does **not** deepen the True Peak DSP implementation.

Stage 2 already provides the core requirements needed by this comparison tool:

- Music Gain fixed at 1.00
- Effect Volume linear 0..1
- 20 ms monotonic Effect Volume ramp
- one fixed Master Gain shared across SETs and Effect Volume values
- safety evaluation from M / M+E1 / M+E2 / M+E3
- stable-state ceiling -1.0 dBTP with the project-certified analyzer margin
- playback blocked until safety calculation is complete
- completed Effect-bus PCM shared between safety analysis and playback
- BigDon / BigKat fallback
- sample-frame-quantized seek

The purpose of Stage 3 is therefore only to check whether normal user operations cause an audible or functional failure.

## Required practical checks

Only these five operation families are release-gating:

1. Effect Volume change while playing
2. SET switch
3. Play / Pause / Resume
4. Seek
5. Song or Hitsound change followed by safety recalculation

See `PRACTICAL_AUDIO_GATE.md`.

## Explicitly not pursued

Unless a practical failure is observed, Stage 3 does not add or pursue:

- another True Peak algorithm
- higher oversampling ratios
- formal EBU product/meter certification
- exhaustive testing of every 5% Effect Volume value
- exhaustive testing of all 25 songs
- exhaustive phase-sweep or synthetic adversarial audio vectors beyond the Stage 2 analyzer validation
- guarantees after the app Master bus (OS mixer, Bluetooth/AirPlay codec, DAC, amplifier, speakers/headphones)
- additional permanent headroom beyond the current project-certified safety calculation
- transport micro-fades solely as a precaution

If a click, duplicate playback, stale safety state, or other concrete failure is observed during the practical gate, fix that specific failure and repeat the relevant test only.

## Exit criterion

When all five practical operation families pass on the target browser classes, the audio core is considered **functionally frozen** for the current product scope.

After that, development returns to application structure and UI work, including the still-undecided presentation of the 25 songs.
