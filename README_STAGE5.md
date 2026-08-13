# Stage 5 — Desktop Final UI Integration

## Scope

This stage replaces the legacy three-SET / disc / waveform desktop interface with the confirmed 1440×900 desktop layout while preserving the existing Web Audio and True Peak safety implementation.

## Implemented

- My Sound as the active user source with four file slots:
  - Normal (`don`, required)
  - finish (`big_don`, optional)
  - Clap (`kat`, required)
  - whistle (`big_kat`, optional)
- Preset A / B / C controls retained as explicit unavailable states because no preset audio assignments exist in the current project files.
- 5×5 compact song cards at 210×40px, using each song background and Title / Artist - Mapper metadata when available.
- Selected song Micro Aura state.
- 1340×420 Playback Stage:
  - 1340×250 Object Timeline
  - 1000ms fixed future window
  - x=92px judge point
  - Normal 56px / Big 70px
  - approved left-back parabolic eject path and strong immediate fade
  - background width-fit at y=14px
- 1000×84 Overview with effect-window band, density histogram, time ticks, current cursor, click/drag/keyboard seek.
- 320×84 controls with Play/Pause and Effect Volume 0–100%, default 80%, step 5%.

## Preset status

The project currently contains no confirmed file paths, filenames, labels beyond A/B/C, or source-to-engine assignments for Preset A, Preset B, or Preset C. They are therefore disabled and marked internally as `unconfigured`. No inference or substitute audio has been added.

## Compatibility

- Existing `HitsoundTesterEngine`, True Peak worker, WASM, and certification files remain unchanged.
- The existing three internal effect-bus containers remain intact. My Sound uses internal container 0; the unconfigured presets do not mutate the engine.
