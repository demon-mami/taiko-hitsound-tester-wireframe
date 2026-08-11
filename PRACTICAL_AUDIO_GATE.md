# Practical Audio Gate

This gate is intentionally small. It checks product-relevant failures, not laboratory completeness.

## Test setup

Use:

- one high-density test song
- one ordinary-density test song
- all three SETs loaded with valid Don / Kat
- BigDon / BigKat may be present or absent; at least one run should exercise fallback
- default Effect Volume 80%

Target browser classes:

- one desktop Chromium-class browser
- iPhone Safari

A third browser/device is only required if a failure appears platform-specific.

---

## Gate A — Effect Volume

While music is playing:

1. 80% → 100%
2. 100% → 50%
3. 50% → 0%
4. 0% → 80%
5. perform several 5% wheel/step changes in succession

PASS when:

- no stuck sound or duplicate playback
- Music level does not jump because of a Master recalculation
- Master Gain remains unchanged
- Effect level follows the requested direction
- no clearly audible click/pop attributable to the control

Do not test every 5% value unless a defect appears.

---

## Gate B — SET switch

With SET1 / SET2 / SET3 already loaded:

1. play SET1
2. switch to SET2
3. play SET2
4. switch to SET3
5. play SET3

PASS when:

- switching follows the intended stop/reset behavior
- Music does not acquire a different Master level merely because the active SET changed
- no stale SET audio remains audible
- no safety recalculation is triggered only by selecting a different SET

---

## Gate C — Play / Pause / Resume

At least five normal cycles:

```text
Play → Pause → Resume
```

Also perform two relatively quick cycles.

PASS when:

- only one Music stream and one Effect bus are audible
- paused audio does not continue in the background
- resume continues from approximately the paused position
- no stuck playback remains after repeated use
- no clearly audible transport click/pop is reproduced consistently

If a repeatable click/pop exists, only then add a short common transport anti-click ramp and retest this gate.

---

## Gate D — Seek

Test while paused and while playing.

Seek to:

- an early position
- the Kiai body
- a dense-hit position
- near the end

PASS when:

- seek position is correct
- Music and Effect remain synchronized
- old Effect audio does not continue after the seek
- no duplicate playback starts
- no crash or invalid state occurs

A repeatable audible seek click is a defect to fix; otherwise no extra seek DSP is required.

---

## Gate E — Safety recalculation lifecycle

### Hitsound change

Replace Don or Kat in any SET.

PASS when:

```text
change
→ playback unavailable
→ Effect buses rebuilt
→ True Peak safety recalculated
→ one new fixed Master confirmed
→ playback available again
```

### Song change

Change the selected song.

PASS when the same lifecycle occurs for the new Music/chart combination.

### Negative checks

The following must **not** trigger a new Master calculation:

- SET selection only
- Effect Volume change
- Play
- Pause
- Seek

---

# Release decision

## PASS

All five gates pass on desktop Chromium and iPhone Safari.

Then:

```text
Audio core = functionally frozen
```

No additional True Peak/DSP research is required for the current product scope.

## CONDITIONAL FIX

If exactly one practical defect is reproducible:

- fix that defect only
- repeat its gate
- do not reopen unrelated DSP design

## FAIL

Stop UI integration only if the defect affects:

- comparison fairness
- synchronization
- playback reliability
- safety recalculation lifecycle
- clearly audible normal-use artifacts

Cosmetic or theoretical issues outside normal use are not release blockers for the audio core.
