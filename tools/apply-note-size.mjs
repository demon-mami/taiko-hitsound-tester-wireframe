import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

let script = readFileSync("script.js", "utf8");
script = replaceRequired(
  script,
  "const NORMAL_NOTE_SIZE = 56;\nconst BIG_NOTE_SIZE = NORMAL_NOTE_SIZE;",
  "const NORMAL_NOTE_SIZE = 78;\nconst BIG_NOTE_SIZE = NORMAL_NOTE_SIZE;\nconst JUDGE_OUTER_DIAMETER = 90;",
  "note and judge geometry constants",
);
script = replaceRequired(
  script,
  "context.arc(JUDGE_X, LANE_CENTER_Y, 34, 0, Math.PI * 2);",
  "context.arc(JUDGE_X, LANE_CENTER_Y, JUDGE_OUTER_DIAMETER / 2, 0, Math.PI * 2);",
  "judge outer ring radius",
);
writeFileSync("script.js", script);

let test = readFileSync("tests/desktop-ui.spec.mjs", "utf8");
test = replaceRequired(test, "normalRim: pixel(674, 125),", "normalRim: pixel(663, 125),", "normal rim sample");
test = replaceRequired(test, "bigRim: pixel(1040, 125),", "bigRim: pixel(1029, 125),", "big rim sample");
test = replaceRequired(test, "expect(noteStyle.normalWidth).toBeGreaterThanOrEqual(56);", "expect(noteStyle.normalWidth).toBeGreaterThanOrEqual(78);", "note diameter assertion");

const returnAnchor = "materialDark: pixel(712, 135),\n    };";
const returnReplacement = "materialDark: pixel(712, 135),\n      judgeInnerRing: pixel(131, 125),\n      judgeGap: pixel(134, 125),\n      judgeOuterRing: pixel(137, 125),\n    };";
test = replaceRequired(test, returnAnchor, returnReplacement, "judge ring samples");

const assertAnchor = "expect(Math.min(...noteStyle.bigMarker.slice(0, 3))).toBeGreaterThan(200);\n  expect(noteStyle.materialLight[0] + noteStyle.materialLight[1] + noteStyle.materialLight[2])";
const assertReplacement = "expect(Math.min(...noteStyle.bigMarker.slice(0, 3))).toBeGreaterThan(200);\n  expect(Math.max(...noteStyle.judgeInnerRing.slice(0, 3))).toBeGreaterThan(35);\n  expect(Math.max(...noteStyle.judgeGap.slice(0, 3))).toBeLessThan(60);\n  expect(Math.min(...noteStyle.judgeOuterRing.slice(0, 3))).toBeGreaterThan(150);\n  expect(noteStyle.materialLight[0] + noteStyle.materialLight[1] + noteStyle.materialLight[2])";
test = replaceRequired(test, assertAnchor, assertReplacement, "judge ring assertions");
writeFileSync("tests/desktop-ui.spec.mjs", test);

let readme = readFileSync("README_STAGE5.md", "utf8");
readme = replaceRequired(readme, "Normal and BIG use the same 56px Material Disc body.", "Normal and BIG use the same 78px Material Disc body.", "README note diameter");
readme = replaceRequired(readme, "Normal 56px / Big 56px", "Normal 78px / Big 78px", "README stage note sizes");
const noteLine = "  - BIG adds only a white downward triangle marker above the disc.\n";
const judgeLine = "  - Judge target inner ring = 78px diameter; outer ring = 90px diameter.\n";
if (!readme.includes(judgeLine)) readme = replaceRequired(readme, noteLine, `${noteLine}${judgeLine}`, "README judge geometry");
writeFileSync("README_STAGE5.md", readme);

console.log("Confirmed 78px notes and 78/90px judge target applied.");
