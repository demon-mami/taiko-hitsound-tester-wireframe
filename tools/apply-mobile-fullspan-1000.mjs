import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

let script = readFileSync("script.js", "utf8");
script = replaceRequired(
  script,
  "const MOBILE_TIMELINE_HEIGHT = 136;\nconst MOBILE_TIMELINE_X_SCALE = 1.15;",
  "const MOBILE_TIMELINE_HEIGHT = 136;\nconst MOBILE_TIMELINE_SPAN_MS = 1000;",
  "mobile span constant",
);
script = replaceRequired(
  script,
  "  const pxPerMs = ((width - judgeX - 12) / FUTURE_WINDOW_MS) * MOBILE_TIMELINE_X_SCALE;\n  const geometry = { laneHeight, laneTop, laneBottom, noteY, noteDiameter, outerDiameter, judgeX, pxPerMs };",
  "  // Match the reference Viewer/Lab definition: the full Canvas width represents 1000ms.\n  // Judge position remains Hitsound Tester-specific, so past/future visible time is asymmetric.\n  const pxPerMs = width / MOBILE_TIMELINE_SPAN_MS;\n  mobileTimelineCanvas.dataset.timeSpanMs = String(MOBILE_TIMELINE_SPAN_MS);\n  mobileTimelineCanvas.dataset.pxPerMs = pxPerMs.toFixed(6);\n  const geometry = { laneHeight, laneTop, laneBottom, noteY, noteDiameter, outerDiameter, judgeX, pxPerMs };",
  "mobile full-width time mapping",
);
writeFileSync("script.js", script);

let mobile = readFileSync("tests/mobile-ui.spec.mjs", "utf8");
mobile = replaceRequired(
  mobile,
  "  await expect.poll(async () => page.locator(\"#mobile-object-timeline\").evaluate((canvas) => canvas.width), { timeout: 30_000 }).toBeGreaterThan(400);\n  await expect(page.locator(\".player\")).toHaveAttribute(\"data-safety-ready\", \"true\", { timeout: 30_000 });",
  "  await expect.poll(async () => page.locator(\"#mobile-object-timeline\").evaluate((canvas) => canvas.width), { timeout: 30_000 }).toBeGreaterThan(400);\n\n  const timeScale = await page.locator(\"#mobile-object-timeline\").evaluate((canvas) => ({\n    spanMs: Number(canvas.dataset.timeSpanMs),\n    pxPerMs: Number(canvas.dataset.pxPerMs),\n    cssWidth: canvas.getBoundingClientRect().width,\n  }));\n  expect(timeScale.spanMs).toBe(1000);\n  expect(timeScale.pxPerMs).toBeCloseTo(timeScale.cssWidth / 1000, 5);\n\n  await expect(page.locator(\".player\")).toHaveAttribute(\"data-safety-ready\", \"true\", { timeout: 30_000 });",
  "mobile full-span QA",
);
writeFileSync("tests/mobile-ui.spec.mjs", mobile);

let readme = readFileSync("README_STAGE6.md", "utf8");
readme = replaceRequired(
  readme,
  "- Mobile horizontal time scale = 1.15× relative to the previous Stage 6 mapping; judge position itself is unchanged",
  "- Mobile horizontal time scale uses the same span definition as the reference Viewer/Lab: full Canvas width = 1000ms (`pxPerMs = width / 1000`); judge position itself is unchanged, so visible past/future time is intentionally asymmetric",
  "mobile full-span documentation",
);
writeFileSync("README_STAGE6.md", readme);

console.log("Applied Mobile full-width 1000ms mapping; judge position unchanged.");
