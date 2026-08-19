import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

let script = readFileSync("script.js", "utf8");
script = replaceRequired(
  script,
  "const MOBILE_TIMELINE_HEIGHT = 136;",
  "const MOBILE_TIMELINE_HEIGHT = 136;\nconst MOBILE_TIMELINE_X_SCALE = 1.15;",
  "mobile timeline X scale constant",
);
script = replaceRequired(
  script,
  "  const pxPerMs = (width - judgeX - 12) / FUTURE_WINDOW_MS;",
  "  const pxPerMs = ((width - judgeX - 12) / FUTURE_WINDOW_MS) * MOBILE_TIMELINE_X_SCALE;",
  "mobile timeline horizontal time scale",
);
writeFileSync("script.js", script);

let style = readFileSync("style.css", "utf8");
style = replaceRequired(
  style,
  "  .playback-stage {\n    width: 100%;\n    height: 320px;\n    margin: 0 auto 8px;\n    border-radius: 14px;\n  }",
  "  .playback-stage {\n    width: 100%;\n    height: 188px;\n    margin: 0 auto 32px;\n    border-radius: 14px;\n  }",
  "mobile focused playback stage height",
);
style = replaceRequired(
  style,
  "  .mobile-song-picker {\n    display: block;\n    width: 100%;\n    height: 58px;\n    margin: 0 auto 24px;\n  }",
  "  .mobile-song-picker {\n    display: block;\n    width: 100%;\n    height: 58px;\n    margin: 0 auto 48px;\n  }",
  "mobile default pre-stage spacing",
);
style = replaceRequired(
  style,
  "  .transport-row {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);\n    gap: 8px;\n    width: 100%;\n    height: auto;\n  }",
  "  .transport-row {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);\n    gap: 18px;\n    width: 100%;\n    height: auto;\n  }",
  "mobile default transport spacing",
);
style += `\n\n/* Stage 6 Mobile focus spacing: use tall portrait space to frame Object Timeline. */\n@media (max-width: 767px) and (min-height: 920px) {\n  .app-shell {\n    padding-top: 18px;\n    padding-bottom: max(60px, env(safe-area-inset-bottom));\n  }\n\n  .sound-source-area {\n    margin-bottom: 30px;\n  }\n\n  .mobile-song-picker {\n    margin-bottom: 170px;\n  }\n\n  .playback-stage {\n    margin-bottom: 140px;\n  }\n\n  .transport-row {\n    gap: 30px;\n  }\n}\n`;
writeFileSync("style.css", style);

let mobile = readFileSync("tests/mobile-ui.spec.mjs", "utf8");
mobile = replaceRequired(
  mobile,
  "  expect(geometry.stage.height).toBe(320);",
  "  expect(geometry.stage.height).toBe(188);",
  "mobile focused stage QA height",
);
mobile = replaceRequired(
  mobile,
  "      source: rect(\".sound-source-area\"),",
  "      source: rect(\".sound-source-area\"),\n      songPicker: rect(\".mobile-song-picker\"),\n      overview: rect(\".overview\"),",
  "mobile focus geometry additions",
);
mobile = replaceRequired(
  mobile,
  "      overview: rect(\".overview\"),\n      controls: rect(\".controls\"),\n      source: rect(\".sound-source-area\"),\n      songPicker: rect(\".mobile-song-picker\"),\n      overview: rect(\".overview\"),",
  "      overview: rect(\".overview\"),\n      controls: rect(\".controls\"),\n      source: rect(\".sound-source-area\"),\n      songPicker: rect(\".mobile-song-picker\"),",
  "deduplicate overview geometry",
);
mobile = replaceRequired(
  mobile,
  "  expect(geometry.source.width).toBe(406);",
  "  expect(geometry.source.width).toBe(406);\n  expect(geometry.stage.y - (geometry.songPicker.y + geometry.songPicker.height)).toBeGreaterThanOrEqual(160);\n  expect(geometry.overview.y - (geometry.stage.y + geometry.stage.height)).toBeGreaterThanOrEqual(130);",
  "timeline focus spacing QA",
);
writeFileSync("tests/mobile-ui.spec.mjs", mobile);

let readme = readFileSync("README_STAGE6.md", "utf8");
readme = replaceRequired(
  readme,
  "4. Playback Stage becomes full available width and 320px tall.",
  "4. Playback Stage becomes full available width and 188px tall; the lane is the primary visual and the background below it is limited to about 80px.",
  "mobile focused stage documentation",
);
readme = replaceRequired(
  readme,
  "- Mobile judge outer diameter = 46px",
  "- Mobile judge outer diameter = 46px\n- Mobile horizontal time scale = 1.15× relative to the previous Stage 6 mapping; judge position itself is unchanged\n- 430×932-class tall portrait layouts spend the surplus vertical space mainly above and below Playback Stage so Object Timeline becomes the visual focal point",
  "mobile focus documentation",
);
writeFileSync("README_STAGE6.md", readme);

console.log("Applied Mobile timeline focus layout: stage 188 / x-scale 1.15 / tall portrait focus spacing.");
