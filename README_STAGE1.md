# v2.3 integration — Stage 1

This branch replaces the dummy playback model with the v2.3 asset-driven Web Audio skeleton.

Implemented:
- 25-song catalog expected at `assets/01_song_catalog.json`
- chart schema v2
- Don / BigDon / Kat / BigKat local slots for 3 SETs
- Big fallback to the corresponding normal sound once
- per-event 2.5 s Raised-Cosine event gain defined by chart v2
- Music Gain 1.00
- Effect Volume 0–100%, default 80%, 5% step
- mouse-wheel 5% step on the Effect Volume control
- 20 ms monotonic linear ramp during Effect Volume changes
- actual Web Audio playback, pause and seek
- first 1.0 s Don/Kat waveform preview
- song artwork from each `background.webp`

## Important

The binary v2.3 asset package is intentionally not committed by this branch yet. The final asset directory must be placed at `/assets/` for the branch to run.

The certified `-1.0 dBTP` True-Peak / `fixedSafeGain` engine is also not included in Stage 1. This branch is therefore **not the final public audio-safety build**.
