# Stage 4 — Automated practical audio gate

This stage replaces the manual Stage 3 interaction checklist with Playwright automation.

## Automated targets

Exactly the five practical interaction families retained after scope reduction:

1. Effect Volume changes
2. SET switching
3. Play / Pause / Resume
4. Seek
5. Song / Hitsound changes and safety recalculation

## Browsers in CI

- Desktop Chromium
- WebKit with iPhone 15 Pro Max emulation

The WebKit/iPhone project is not a physical iPhone. Physical-device automation is intentionally deferred unless a browser-specific problem is found.

## No dependency on the final 25-song layout

`qa-server.mjs` dynamically serves a two-song synthetic catalog plus synthetic Music/Don/Kat fixtures only while the Playwright test server is running.

The production song layout and the final 25-song asset placement remain undecided and untouched.

## Assertions

The automated gate verifies that:

- Effect Volume changes do not invalidate safety or change fixed Master.
- SET switching does not invalidate safety or change fixed Master.
- Play/Pause repeatedly returns the player to a stable transport state.
- Seek works while paused and playing without safety recalculation.
- Hitsound replacement and song change disable playback until safety calculation completes.
- BigDon/BigKat remain unregistered in the fixture so chart big-note paths exercise normal Don/Kat fallback.

## Deliberately not claimed

Playwright cannot decide whether a very short transient is perceptually audible as a click/pop, and WebKit emulation is not physical iPhone Safari hardware.

Those are no longer blocking requirements. They are investigated only if a concrete user-visible problem appears.

## CI

GitHub Actions runs the gate on pushes to `main` and `integration/**`, and on pull requests to `main`.
