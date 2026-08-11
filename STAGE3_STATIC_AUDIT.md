# Stage 3 static audit

Scope: product-relevant invariants only.

Result: **PASS — no pre-emptive DSP change required before practical browser testing.**

## Verified in current code

### Effect Volume

- clamped to 0..100%
- converted to linear 0..1 gain
- 20 ms linear ramp
- changing Effect Volume does not call `rebuildSafety()`
- shared Master Gain therefore remains fixed during Effect Volume adjustment

### SET selection

- `setActiveSet()` stops/resets transport and changes only active SET
- SET selection itself does not call `rebuildSafety()`
- fixed Master therefore remains common across SET selection

### Hitsound changes

- changing/removing a Hitsound calls `rebuildSafety()`
- playback is stopped before rebuilding
- Don and Kat remain required for the active SET
- BigDon / BigKat fallback is resolved as `big_don || don` and `big_kat || kat`

### Song changes

- song load invalidates the previous safety state
- chart schema v2 is required
- decoded Music is used for the new safety calculation
- stale asynchronous song loads are rejected by generation checks

### Safety lifecycle

- playback requires `safetyReady`
- M / M+E1 / M+E2 / M+E3 are evaluated in the worker
- one `fixedSafeGain` is calculated from the worst condition
- analyzer certification/WASM hash are checked before use
- completed Effect-bus PCM returned by the analyzer is converted to AudioBuffer and used for actual playback

### Seek

- seek target is quantized to the decoded Music sample frame
- Music and completed Effect bus start with the same offset
- if seek occurs while playing, transport is restarted from the quantized position

### Playback duplication protection

- previous Music/Effect sources are stopped before a new transport start caused by seek/change
- only one Music source and one completed Effect-bus source are assigned as the current transport pair

## Intentionally not changed yet

No common transport micro-fade was added for Play/Pause/Seek.

Reason: this would be a speculative DSP change. The practical gate first checks whether a repeatable audible click/pop exists in normal use. If it does, add a short common transport anti-click ramp and retest only that gate.

No additional True Peak headroom or analyzer margin was added.

Reason: Stage 2 already provides the current project safety rule. Further margin is not justified without an observed practical problem or a failed analyzer validation.

## Remaining work before audio-core freeze

Only the manual checks in `PRACTICAL_AUDIO_GATE.md` remain:

1. Effect Volume operation
2. SET switch
3. Play/Pause/Resume
4. Seek
5. Song/Hitsound safety-recalculation lifecycle

If these pass on desktop Chromium and iPhone Safari, the audio core is frozen for the current product scope and development returns to application/UI work.
