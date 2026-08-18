> Stage 6 branch note: this document records the Stage 5 four-slot state. The current Stage 6 specification is in README_STAGE6.md.

# Stage 5 — Desktop Final UI Integration

## Scope

This stage replaces the legacy three-SET / disc / waveform desktop interface with the confirmed 1440×900 desktop layout while preserving the existing Web Audio and True Peak safety implementation.

## Implemented

- My Sound as the active user source with four file slots:
  - Normal (`don`, required)
  - finish (`big_don`, optional)
  - Clap (`kat`, required)
  - whistle (`big_kat`, optional)
- Preset A is bundled and selectable.
- Preset B / C remain explicit unavailable states until their confirmed files/config are supplied.
- 5×5 compact song cards at 210×40px, using each song background and Title / Artist - Mapper metadata when available.
- Selected song Micro Aura state.
- Object Timeline note appearance:
  - Normal and BIG use the same 78px Material Disc body.
  - Don = RGB(235,69,44), Ka = RGB(68,141,171).
  - Clear reference-like white circumference; no glossy white reflection stripe.
  - BIG adds only a white downward triangle marker above the disc.
  - Judge target inner ring = 78px diameter; outer ring = 90px diameter.
- 1340×420 Playback Stage:
  - 1340×250 Object Timeline
  - 1000ms fixed future window
  - x=92px judge point
  - Normal / BIG disc body both 78px; BIG differs only by the upper marker
  - approved left-back parabolic eject path and strong immediate fade
  - background width-fit at y=14px
- 1000×84 Overview with effect-window band, density histogram, time ticks, current cursor, click/drag/keyboard seek.
- 320×84 controls with Play/Pause and Effect Volume 0–100%, default 80%, step 5%.

## Preset A

The supplied `presetA_v3.2.zip` contains normal and soft banks. Only the four `taiko-normal-*` files are used; all four `taiko-soft-*` files are intentionally excluded.

Repository filenames are normalized to:

- `presets/PresetA-hitnormal.wav`
- `presets/PresetA-hitfinish.wav`
- `presets/PresetA-hitclap.wav`
- `presets/PresetA-hitwhistle.wav`

Mapping:

- `PresetA-hitnormal.wav` → `don`
- `PresetA-hitfinish.wav` → `big_don`
- `PresetA-hitclap.wav` → `kat`
- `PresetA-hitwhistle.wav` → `big_kat`

The four fixed Preset A files are decoded before the first song is loaded. Preset A occupies internal SET container 1, while My Sound remains in container 0. Therefore the existing True Peak safety pass calculates one common fixed master across My Sound, Preset A, and the remaining empty third container. Switching My Sound ↔ Preset A does not invalidate safety or recalculate the master.

## Preset B / C status

No confirmed Preset B or Preset C audio files or mappings are present yet. They remain disabled and marked `unconfigured`; no substitute or inferred audio is used.

## Compatibility

- Existing `HitsoundTesterEngine`, True Peak worker, WASM, and certification files remain unchanged.
- Existing three internal effect-bus containers remain intact.
