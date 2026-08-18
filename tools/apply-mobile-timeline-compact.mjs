import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

let script = readFileSync("script.js", "utf8");
script = replaceRequired(script, "const MOBILE_TIMELINE_HEIGHT = 196;", "const MOBILE_TIMELINE_HEIGHT = 136;", "mobile timeline height constant");
script = replaceRequired(script, "  const laneHeight = clamp(width * 0.305, 108, 128);", "  const laneHeight = 80;", "mobile lane height");
script = replaceRequired(script, "  const noteDiameter = laneHeight * (NORMAL_NOTE_SIZE / LANE_HEIGHT);", "  const noteDiameter = 40;", "mobile note diameter");
script = replaceRequired(script, "  const outerDiameter = noteDiameter * (JUDGE_OUTER_DIAMETER / NORMAL_NOTE_SIZE);", "  const outerDiameter = 46;", "mobile judge outer diameter");
writeFileSync("script.js", script);

let style = readFileSync("style.css", "utf8");
style = replaceRequired(style, "  .stage-dim-top {\n    height: 34px;\n  }", "  .stage-dim-top {\n    height: 28px;\n  }", "mobile upper dim boundary");
style = replaceRequired(style, "  .stage-dim-lower {\n    top: 158px;\n  }", "  .stage-dim-lower {\n    top: 108px;\n  }", "mobile lower dim boundary");
style = replaceRequired(style, "    height: 196px;\n    pointer-events: none;", "    height: 136px;\n    pointer-events: none;", "mobile canvas css height");
writeFileSync("style.css", style);

let mobile = readFileSync("tests/mobile-ui.spec.mjs", "utf8");
mobile = replaceRequired(mobile, "  expect(geometry.mobileTimeline.height).toBe(196);", "  expect(geometry.mobileTimeline.height).toBe(136);", "mobile timeline QA height");
writeFileSync("tests/mobile-ui.spec.mjs", mobile);

let readme = readFileSync("README_STAGE6.md", "utf8");
readme = replaceRequired(readme, "- judge outer/inner ratio = 90/78", "- Mobile lane = 80px at the 430px reference width\n- Mobile note / judge inner diameter = 40px\n- Mobile judge outer diameter = 46px\n- judge outer/inner ratio = 46/40 on Mobile", "mobile compact geometry documentation");
writeFileSync("README_STAGE6.md", readme);

console.log("Applied compact Mobile timeline: lane 80 / note 40 / judge 40-46 / 1000ms.");
