import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Fix target not found: ${label}`);
  return source.replace(before, after);
}

let practical = readFileSync("tests/practical-audio.spec.mjs", "utf8");

practical = replaceRequired(
  practical,
  `async function setSeek(page, seconds) {\n  await page.locator(".seek-input").evaluate((input, value) => {\n    input.value = String(value);\n    input.dispatchEvent(new Event("input", { bubbles: true }));\n  }, seconds);\n}\n`,
  `async function setSeek(page, seconds) {\n  await page.locator(".seek-input").evaluate((input, value) => {\n    input.value = String(value);\n    input.dispatchEvent(new Event("input", { bubbles: true }));\n  }, seconds);\n}\n\nasync function chooseSong(page, songId) {\n  const mobilePicker = page.locator(".mobile-song-picker");\n  if (await mobilePicker.isVisible()) {\n    await page.locator("#mobile-song-select").selectOption(songId);\n  } else {\n    await page.locator(\`[data-song-id="\${songId}"]\`).click();\n  }\n}\n`,
  "chooseSong helper",
);

practical = replaceRequired(
  practical,
  `  await expect(page.locator('[data-song-id="song01"]')).toBeVisible();`,
  `  await expect(page.locator('[data-song-id="song01"]')).toBeAttached();`,
  "initial song readiness independent of layout",
);

practical = replaceRequired(
  practical,
  `    await page.locator('[data-song-id="song02"]').click();`,
  `    await chooseSong(page, "song02");`,
  "responsive song selection in practical gate",
);

writeFileSync("tests/practical-audio.spec.mjs", practical);

let mobile = readFileSync("tests/mobile-ui.spec.mjs", "utf8");
mobile = replaceRequired(
  mobile,
  `  expect(geometry.mobileTimeline.width).toBe(406);`,
  `  expect(geometry.mobileTimeline.width).toBe(geometry.stage.width - 2);`,
  "timeline content-box width",
);
writeFileSync("tests/mobile-ui.spec.mjs", mobile);

console.log("Stage 6 mobile QA fixes applied.");
