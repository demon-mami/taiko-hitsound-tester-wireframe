# Stage 6 — Two-hit responsive UI

## Current source model

PC and Mobile expose only two selectable hitsounds:

- `hitnormal` → internal `don`
- `hitclap` → internal `kat`

There are no user-facing `hitfinish` / `hitwhistle` controls. BigDon falls back to `don` once and BigKa falls back to `kat` once through the frozen True Peak/effect-bus resolver.

Preset A now loads only:

- `presets/PresetA-hitnormal.wav`
- `presets/PresetA-hitclap.wav`

The existing finish/whistle files may remain in the repository but are not loaded or used by Stage 6. Preset B/C remain unconfigured.

## Desktop

Desktop keeps the confirmed Stage 5 structure and dimensions. The Hitsound section changes from four slots to two centered primary slots. Song cards, Playback Stage, Object Timeline, Overview and Controls remain structurally unchanged.

## Mobile

Mobile is not a scaled Desktop layout. At <=767px:

1. Source selector remains four choices.
2. Two hitsound slots are shown side by side.
3. Song selection is collapsed to one selected-song acrylic card with a transparent native `select` overlay. Tapping it invokes the platform song picker for all catalog songs.
4. Playback Stage becomes full available width and 188px tall; the lane is the primary visual and the background below it is limited to about 80px.
5. A dedicated Mobile Object Timeline canvas is used instead of CSS-scaling the 1340px Desktop canvas.
6. Overview remains the seek surface and becomes full width.
7. Play/Pause and Effect Volume occupy a final full-width control row.

## Mobile Object Timeline

The implementation deliberately reuses the responsive principles proven in `demon-mami/osutaiko-mami-viewer/object-timeline-v2.js`: viewport-derived geometry, DPR-aware canvas sizing, width-based hit position and time-to-X mapping, and redraw on resize/orientation change.

It does **not** copy the viewer's old note sizes or visual styling. Hitsound Tester retains:

- fixed 1000ms future window
- Material Disc note body
- clear white circumference
- Normal and BIG same disc size
- BIG-only downward triangle marker
- judge inner diameter = note diameter
- Mobile lane = 80px at the 430px reference width
- Mobile note / judge inner diameter = 40px
- Mobile judge outer diameter = 46px
- Mobile horizontal time scale uses the same span definition as the reference Viewer/Lab: full Canvas width = 1000ms (`pxPerMs = width / 1000`); judge position itself is unchanged, so visible past/future time is intentionally asymmetric
- 430×932-class tall portrait layouts spend the surplus vertical space mainly above and below Playback Stage so Object Timeline becomes the visual focal point
- judge outer/inner ratio = 46/40 on Mobile
- confirmed post-hit parabolic eject/fade behavior, scaled to the Mobile viewport

Desktop Audio Core, True Peak worker/WASM and common fixed-master policy remain unchanged.
