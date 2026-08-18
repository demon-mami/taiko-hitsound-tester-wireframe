import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Patch target not found: ${label}`);
  return next;
}

// ---------- index.html ----------
let index = readFileSync("index.html", "utf8");
index = replaceRequired(
  index,
  /(\s*<section class="song-area"[\s\S]*?<\/section>)(\n\n\s*<section class="playback-stage")/,
  `$1\n\n      <section class="mobile-song-picker" id="mobile-song-picker" aria-label="Test song">\n        <div class="mobile-song-select-card" id="mobile-song-select-card">\n          <span class="mobile-song-copy">\n            <strong class="mobile-song-name" id="mobile-song-name">曲assetを読み込んでいます…</strong>\n            <span class="mobile-song-credit" id="mobile-song-credit">—</span>\n          </span>\n          <span class="mobile-song-chevron" aria-hidden="true">⌄</span>\n          <select class="mobile-song-select" id="mobile-song-select" aria-label="曲を選択"></select>\n        </div>\n      </section>$2`,
  "mobile song picker",
);
index = replaceRequired(
  index,
  /(<canvas class="object-timeline" id="object-timeline" width="1340" height="250" aria-label="Current osu!taiko notes"><\/canvas>)/,
  `<canvas class="mobile-object-timeline" id="mobile-object-timeline" width="1" height="1" aria-label="Current osu!taiko notes — mobile"></canvas>\n        $1`,
  "mobile object timeline canvas",
);
writeFileSync("index.html", index);

// ---------- style.css ----------
let style = readFileSync("style.css", "utf8");
style = replaceRequired(
  style,
  /grid-template-columns: repeat\(4, 198px\);/,
  "grid-template-columns: repeat(2, 280px);",
  "desktop two hitsound columns",
);
style += `\n\n/* ---------- Stage 6 mobile / two-hit responsive UI ---------- */\n.mobile-song-picker,\n.mobile-object-timeline {\n  display: none;\n}\n\n@media (max-width: 767px) {\n  html,\n  body {\n    min-width: 0;\n    width: 100%;\n    min-height: 100%;\n    overflow-x: hidden;\n  }\n\n  body {\n    min-height: 100svh;\n  }\n\n  .app-shell {\n    width: 100%;\n    min-height: 100svh;\n    padding: 10px 12px max(18px, env(safe-area-inset-bottom));\n    overflow: visible;\n  }\n\n  .sound-source-area {\n    width: 100%;\n    height: auto;\n    margin: 0 auto 13px;\n  }\n\n  .source-selector {\n    grid-template-columns: repeat(4, minmax(0, 1fr));\n    gap: 6px;\n    width: 100%;\n    height: 42px;\n  }\n\n  .source-button {\n    height: 42px;\n    padding: 0 5px;\n    border-radius: 9px;\n    font-size: 11px;\n  }\n\n  .sound-slot-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n    gap: 8px;\n    width: 100%;\n    height: 56px;\n    margin-top: 8px;\n  }\n\n  .sound-slot,\n  .sound-trigger {\n    height: 56px;\n  }\n\n  .sound-trigger {\n    grid-template-columns: 44px minmax(0, 1fr);\n    padding: 6px 10px 6px 7px;\n    border-radius: 14px 10px 14px 10px;\n  }\n\n  .note-icon {\n    width: 36px;\n    height: 36px;\n  }\n\n  .song-area {\n    display: none;\n  }\n\n  .mobile-song-picker {\n    display: block;\n    width: 100%;\n    height: 58px;\n    margin: 0 auto 24px;\n  }\n\n  .mobile-song-select-card {\n    position: relative;\n    isolation: isolate;\n    display: grid;\n    grid-template-columns: minmax(0, 1fr) 28px;\n    align-items: center;\n    width: 100%;\n    height: 58px;\n    overflow: hidden;\n    border: 1px solid rgba(255,255,255,.18);\n    border-radius: 11px;\n    background-color: #1b1b1f;\n    background-position: center;\n    background-size: cover;\n    box-shadow:\n      inset 0 1px 0 rgba(255,255,255,.14),\n      inset 0 -1px 0 rgba(0,0,0,.58),\n      0 5px 12px rgba(0,0,0,.34);\n  }\n\n  .mobile-song-select-card::before {\n    content: \"\";\n    position: absolute;\n    inset: 0;\n    z-index: -1;\n    background:\n      linear-gradient(180deg, rgba(255,255,255,.11), transparent 45%),\n      linear-gradient(90deg, rgba(7,7,10,.58), rgba(7,7,10,.78));\n  }\n\n  .mobile-song-copy {\n    min-width: 0;\n    padding: 7px 8px 7px 11px;\n    pointer-events: none;\n  }\n\n  .mobile-song-name,\n  .mobile-song-credit {\n    display: block;\n    overflow: hidden;\n    white-space: nowrap;\n    text-overflow: ellipsis;\n  }\n\n  .mobile-song-name {\n    color: rgba(250,250,252,.96);\n    font-size: 12px;\n    line-height: 18px;\n  }\n\n  .mobile-song-credit {\n    margin-top: 3px;\n    color: rgba(236,236,242,.68);\n    font-size: 10px;\n    line-height: 14px;\n  }\n\n  .mobile-song-chevron {\n    justify-self: center;\n    color: rgba(250,250,252,.78);\n    font-size: 20px;\n    line-height: 1;\n    pointer-events: none;\n  }\n\n  .mobile-song-select {\n    position: absolute;\n    inset: 0;\n    width: 100%;\n    height: 100%;\n    opacity: .001;\n    cursor: pointer;\n  }\n\n  .playback-stage {\n    width: 100%;\n    height: 320px;\n    margin: 0 auto 8px;\n    border-radius: 14px;\n  }\n\n  .stage-background {\n    top: 4px !important;\n    width: 100%;\n    height: auto;\n  }\n\n  .stage-dim-top {\n    height: 34px;\n  }\n\n  .stage-dim-lower {\n    top: 158px;\n  }\n\n  .object-timeline {\n    display: none;\n  }\n\n  .mobile-object-timeline {\n    position: absolute;\n    z-index: 3;\n    top: 0;\n    left: 0;\n    display: block;\n    width: 100%;\n    height: 196px;\n    pointer-events: none;\n  }\n\n  .transport-row {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);\n    gap: 8px;\n    width: 100%;\n    height: auto;\n  }\n\n  .overview {\n    grid-column: 1;\n    width: 100%;\n    height: 72px;\n  }\n\n  .overview-static,\n  .overview-cursor {\n    width: 100%;\n    height: 72px;\n  }\n\n  .controls {\n    grid-column: 1;\n    grid-template-columns: 60px 10px minmax(0, 1fr);\n    width: 100%;\n    height: 60px;\n  }\n\n  .play-button {\n    width: 60px;\n    height: 60px;\n  }\n\n  .effect-volume {\n    width: 100%;\n    height: 60px;\n    padding: 8px 10px;\n  }\n\n  .effect-volume input {\n    width: 100%;\n  }\n}\n`;
writeFileSync("style.css", style);

// ---------- script.js ----------
let script = readFileSync("script.js", "utf8");
script = replaceRequired(
  script,
  /const SLOT_DEFS = \[[\s\S]*?\n\];/,
  `const SLOT_DEFS = [\n  { key: "don", role: "hitnormal", family: "don", primary: true },\n  { key: "kat", role: "hitclap", family: "kat", primary: true },\n];`,
  "two hitsound slot definitions",
);
script = replaceRequired(
  script,
  /files: Object\.freeze\(\{\n\s*don: "PresetA-hitnormal\.wav",\n\s*big_don: "PresetA-hitfinish\.wav",\n\s*kat: "PresetA-hitclap\.wav",\n\s*big_kat: "PresetA-hitwhistle\.wav",\n\s*\}\),/,
  `files: Object.freeze({\n      don: "PresetA-hitnormal.wav",\n      kat: "PresetA-hitclap.wav",\n    }),`,
  "Preset A two-file mapping",
);
script = replaceRequired(
  script,
  /const OVERVIEW_HEIGHT = 84;/,
  `const OVERVIEW_HEIGHT = 84;\nconst MOBILE_TIMELINE_HEIGHT = 196;`,
  "mobile timeline constant",
);
script = replaceRequired(
  script,
  /const songArea = document\.querySelector\("#song-area"\);/,
  `const songArea = document.querySelector("#song-area");\nconst mobileSongSelect = document.querySelector("#mobile-song-select");\nconst mobileSongSelectCard = document.querySelector("#mobile-song-select-card");\nconst mobileSongName = document.querySelector("#mobile-song-name");\nconst mobileSongCredit = document.querySelector("#mobile-song-credit");`,
  "mobile song DOM refs",
);
script = replaceRequired(
  script,
  /const timelineCanvas = document\.querySelector\("#object-timeline"\);/,
  `const timelineCanvas = document.querySelector("#object-timeline");\nconst mobileTimelineCanvas = document.querySelector("#mobile-object-timeline");`,
  "mobile timeline DOM ref",
);

script = replaceRequired(
  script,
  /function renderSongs\(\) \{[\s\S]*?\n\}\n\nfunction updateSongSelection/,
  `function renderSongs() {\n  songArea.textContent = "";\n  songArea.setAttribute("aria-busy", "false");\n  if (mobileSongSelect) mobileSongSelect.textContent = "";\n\n  for (const song of songs) {\n    const button = document.createElement("button");\n    button.className = "song-button";\n    button.type = "button";\n    button.dataset.songId = song.id;\n    button.setAttribute("aria-pressed", "false");\n    button.style.backgroundImage = \`url("\${ASSET_ROOT}\${song.background}")\`;\n\n    const name = document.createElement("span");\n    name.className = "song-name";\n    name.textContent = song.title;\n    name.title = song.title;\n\n    const credit = document.createElement("span");\n    credit.className = "song-credit";\n    credit.textContent = song.credit;\n    credit.title = song.credit;\n\n    button.append(name, credit);\n    button.addEventListener("click", () => selectSong(song.id));\n    songArea.append(button);\n\n    if (mobileSongSelect) {\n      const option = document.createElement("option");\n      option.value = song.id;\n      option.textContent = song.credit && song.credit !== "—" ? \`\${song.title} — \${song.credit}\` : song.title;\n      mobileSongSelect.append(option);\n    }\n  }\n}\n\nfunction updateSongSelection`,
  "responsive song rendering",
);

script = replaceRequired(
  script,
  /function updateSongSelection\(songId\) \{[\s\S]*?\n\}\n\nfunction updateStageBackground/,
  `function updateSongSelection(songId) {\n  for (const button of songArea.querySelectorAll(".song-button")) {\n    const active = button.dataset.songId === songId;\n    button.classList.toggle("is-active", active);\n    button.setAttribute("aria-pressed", String(active));\n  }\n\n  const song = songs.find((entry) => entry.id === songId);\n  if (song && mobileSongSelect) mobileSongSelect.value = songId;\n  if (song && mobileSongSelectCard) {\n    mobileSongSelectCard.style.backgroundImage = \`url("\${ASSET_ROOT}\${song.background}")\`;\n    if (mobileSongName) {\n      mobileSongName.textContent = song.title;\n      mobileSongName.title = song.title;\n    }\n    if (mobileSongCredit) {\n      mobileSongCredit.textContent = song.credit;\n      mobileSongCredit.title = song.credit;\n    }\n  }\n}\n\nfunction updateStageBackground`,
  "mobile selected song state",
);

const mobileRenderer = `\nfunction sizeMobileTimelineCanvas(width, height) {\n  if (!mobileTimelineCanvas) return null;\n  const dpr = Math.max(1, window.devicePixelRatio || 1);\n  const pixelWidth = Math.max(1, Math.round(width * dpr));\n  const pixelHeight = Math.max(1, Math.round(height * dpr));\n  if (mobileTimelineCanvas.width !== pixelWidth || mobileTimelineCanvas.height !== pixelHeight) {\n    mobileTimelineCanvas.width = pixelWidth;\n    mobileTimelineCanvas.height = pixelHeight;\n  }\n  const context = mobileTimelineCanvas.getContext("2d");\n  context.setTransform(dpr, 0, 0, dpr, 0, 0);\n  context.imageSmoothingEnabled = true;\n  return context;\n}\n\nfunction drawMobileJudgeTarget(context, geometry, outerOnly) {\n  const { judgeX, noteY, laneTop, laneBottom, noteDiameter, outerDiameter } = geometry;\n  context.save();\n  if (!outerOnly) {\n    context.strokeStyle = "rgba(248,248,250,0.18)";\n    context.lineWidth = 1;\n    context.beginPath();\n    context.moveTo(judgeX, laneTop + 8);\n    context.lineTo(judgeX, laneBottom - 8);\n    context.stroke();\n\n    context.strokeStyle = "rgba(248,248,250,0.26)";\n    context.beginPath();\n    context.arc(judgeX, noteY, noteDiameter / 2, 0, Math.PI * 2);\n    context.stroke();\n  } else {\n    context.strokeStyle = "rgba(248,248,250,0.76)";\n    context.lineWidth = 2;\n    context.beginPath();\n    context.arc(judgeX, noteY, outerDiameter / 2, 0, Math.PI * 2);\n    context.stroke();\n  }\n  context.restore();\n}\n\nfunction drawMobileObjectTimeline(currentSeconds) {\n  if (!mobileTimelineCanvas) return;\n  const rect = mobileTimelineCanvas.getBoundingClientRect();\n  if (rect.width <= 0 || rect.height <= 0) return;\n\n  const width = rect.width;\n  const height = MOBILE_TIMELINE_HEIGHT;\n  const context = sizeMobileTimelineCanvas(width, height);\n  if (!context) return;\n  context.clearRect(0, 0, width, height);\n\n  // Reuses the proven responsive principles from osutaiko-mami-viewer:\n  // viewport-derived lane geometry, hit position and px/ms mapping.\n  const laneHeight = clamp(width * 0.305, 108, 128);\n  const laneTop = Math.round((height - laneHeight) / 2);\n  const laneBottom = laneTop + laneHeight;\n  const noteY = laneTop + laneHeight / 2;\n  const noteDiameter = laneHeight * (NORMAL_NOTE_SIZE / LANE_HEIGHT);\n  const outerDiameter = noteDiameter * (JUDGE_OUTER_DIAMETER / NORMAL_NOTE_SIZE);\n  const judgeX = clamp(width * 0.12, 42, 52);\n  const pxPerMs = (width - judgeX - 12) / FUTURE_WINDOW_MS;\n  const geometry = { laneHeight, laneTop, laneBottom, noteY, noteDiameter, outerDiameter, judgeX, pxPerMs };\n\n  context.fillStyle = "#171719";\n  context.fillRect(0, laneTop, width, laneHeight);\n  context.fillStyle = "rgba(255,255,255,0.10)";\n  context.fillRect(0, laneTop, width, 1);\n  context.fillStyle = "rgba(0,0,0,0.28)";\n  context.fillRect(0, laneBottom - 1, width, 1);\n\n  if (!timelineChart?.events?.length) {\n    drawMobileJudgeTarget(context, geometry, false);\n    drawMobileJudgeTarget(context, geometry, true);\n    return;\n  }\n\n  const nowMs = currentSeconds * 1000;\n  const events = timelineChart.events;\n  const measureTimes = timelineChart.measure_lines_ms || timelineChart.measureLinesMs || [];\n\n  context.strokeStyle = "rgba(255,255,255,0.14)";\n  context.lineWidth = 1;\n  for (const measureMs of measureTimes) {\n    const dt = measureMs - nowMs;\n    if (dt < 0 || dt > FUTURE_WINDOW_MS) continue;\n    const x = judgeX + dt * pxPerMs;\n    context.beginPath();\n    context.moveTo(x, laneTop + 8);\n    context.lineTo(x, laneBottom - 8);\n    context.stroke();\n  }\n\n  drawMobileJudgeTarget(context, geometry, false);\n  const startIndex = lowerBound(events, nowMs - EJECT_MAX_MS);\n  const endIndex = lowerBound(events, nowMs + FUTURE_WINDOW_MS + 0.001);\n\n  for (let index = startIndex; index < endIndex; index += 1) {\n    const event = events[index];\n    const dt = event.time_ms - nowMs;\n    if (dt < 0) continue;\n    drawNote(context, judgeX + dt * pxPerMs, noteY, noteDiameter, event.type, 1);\n  }\n\n  const xScale = width / TIMELINE_WIDTH;\n  const yScale = laneHeight / LANE_HEIGHT;\n  for (let index = startIndex; index < endIndex; index += 1) {\n    const event = events[index];\n    const ageMs = nowMs - event.time_ms;\n    if (ageMs < 0 || ageMs > EJECT_MAX_MS) continue;\n    const alpha = ejectedOpacity(ageMs);\n    if (alpha <= 0) continue;\n\n    const age = ageMs / 1000;\n    const x = judgeX + EJECT_VX * xScale * age;\n    const y = noteY + EJECT_VY0 * yScale * age + 0.5 * EJECT_GRAVITY * yScale * age * age;\n    const z = EJECT_Z_RATE * age;\n    const scale = 1 / (1 + EJECT_PERSPECTIVE * z);\n    drawNote(context, x, y, noteDiameter * scale, event.type, alpha);\n  }\n\n  drawMobileJudgeTarget(context, geometry, true);\n}\n`;
script = replaceRequired(
  script,
  /\nfunction drawObjectTimeline\(currentSeconds\) \{/,
  `${mobileRenderer}\nfunction drawObjectTimeline(currentSeconds) {`,
  "mobile responsive timeline renderer",
);

script = script.replace(/drawObjectTimeline\(0\);/g, `drawObjectTimeline(0);\n  drawMobileObjectTimeline(0);`);
script = replaceRequired(
  script,
  /drawObjectTimeline\(current\);\n  drawOverviewCursor/,
  `drawObjectTimeline(current);\n  drawMobileObjectTimeline(current);\n  drawOverviewCursor`,
  "mobile timeline playback updates",
);
script = replaceRequired(
  script,
  /effectVolumeInput\.addEventListener\("wheel",[\s\S]*?\}, \{ passive: false \}\);/,
  `$&\n\nmobileSongSelect?.addEventListener("change", () => {\n  if (mobileSongSelect.value) selectSong(mobileSongSelect.value);\n});\n\nwindow.addEventListener("resize", () => drawMobileObjectTimeline(playbackCurrentMs / 1000));\nwindow.addEventListener("orientationchange", () => setTimeout(() => drawMobileObjectTimeline(playbackCurrentMs / 1000), 0));`,
  "mobile listeners",
);
script = script.replace("Normal / Clapを読み込んでください。", "hitnormal / hitclapを読み込んでください。");
writeFileSync("script.js", script);

// ---------- practical audio test ----------
let practical = readFileSync("tests/practical-audio.spec.mjs", "utf8");
practical = replaceRequired(
  practical,
  /for \(const name of \[\n\s*"PresetA-hitnormal\.wav",\n\s*"PresetA-hitfinish\.wav",\n\s*"PresetA-hitclap\.wav",\n\s*"PresetA-hitwhistle\.wav",\n\s*\]\)/,
  `for (const name of [\n      "PresetA-hitnormal.wav",\n      "PresetA-hitclap.wav",\n    ])`,
  "Preset A test file list",
);
practical = replaceRequired(
  practical,
  /await expect\(page\.locator\("\.sound-filename"\)\.nth\(0\)\)\.toHaveText\("PresetA-hitnormal\.wav"\);\n\s*await expect\(page\.locator\("\.sound-filename"\)\.nth\(1\)\)\.toHaveText\("PresetA-hitfinish\.wav"\);\n\s*await expect\(page\.locator\("\.sound-filename"\)\.nth\(2\)\)\.toHaveText\("PresetA-hitclap\.wav"\);\n\s*await expect\(page\.locator\("\.sound-filename"\)\.nth\(3\)\)\.toHaveText\("PresetA-hitwhistle\.wav"\);/,
  `await expect(page.locator(".sound-filename").nth(0)).toHaveText("PresetA-hitnormal.wav");\n    await expect(page.locator(".sound-filename").nth(1)).toHaveText("PresetA-hitclap.wav");`,
  "Preset A two visible filenames",
);
practical = replaceRequired(
  practical,
  /await expect\(page\.locator\("#set-1-big_don"\)\)\.toHaveValue\(""\);\n\s*await expect\(page\.locator\("#set-1-big_kat"\)\)\.toHaveValue\(""\);/,
  `await expect(page.locator("#set-1-big_don")).toHaveCount(0);\n    await expect(page.locator("#set-1-big_kat")).toHaveCount(0);`,
  "no Big-specific input controls",
);
writeFileSync("tests/practical-audio.spec.mjs", practical);

// ---------- desktop UI test ----------
let desktop = readFileSync("tests/desktop-ui.spec.mjs", "utf8");
desktop = replaceRequired(
  desktop,
  /await expect\(page\.locator\('\[data-source="preset-c"\]'\)\)\.toBeDisabled\(\);/,
  `await expect(page.locator('[data-source="preset-c"]')).toBeDisabled();\n  await expect(page.locator(".sound-slot")).toHaveCount(2);\n  await expect(page.locator("#set-1-big_don")).toHaveCount(0);\n  await expect(page.locator("#set-1-big_kat")).toHaveCount(0);\n  await expect(page.locator(".mobile-song-picker")).toBeHidden();\n  await expect(page.locator("#mobile-object-timeline")).toBeHidden();`,
  "desktop two-hit/mobile-hidden assertions",
);
writeFileSync("tests/desktop-ui.spec.mjs", desktop);

// ---------- mobile UI test ----------
writeFileSync("tests/mobile-ui.spec.mjs", `import { test, expect } from "@playwright/test";\n\ntest("mobile dedicated layout: native song picker and responsive timeline", async ({ page }, testInfo) => {\n  await page.setViewportSize({ width: 430, height: 932 });\n  await page.goto("/");\n\n  const picker = page.locator(".mobile-song-picker");\n  await expect(picker).toBeVisible();\n  await expect(page.locator(".song-area")).toBeHidden();\n  await expect(page.locator(".sound-slot")).toHaveCount(2);\n  await expect(page.locator("#set-1-don")).toBeAttached();\n  await expect(page.locator("#set-1-kat")).toBeAttached();\n  await expect(page.locator("#set-1-big_don")).toHaveCount(0);\n  await expect(page.locator("#set-1-big_kat")).toHaveCount(0);\n\n  const select = page.locator("#mobile-song-select");\n  await expect.poll(async () => select.locator("option").count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(2);\n  await expect(page.locator("#mobile-object-timeline")).toBeVisible();\n  await expect(page.locator("#object-timeline")).toBeHidden();\n\n  const geometry = await page.evaluate(() => {\n    const rect = (selector) => {\n      const r = document.querySelector(selector).getBoundingClientRect();\n      return { width: r.width, height: r.height, x: r.x, y: r.y };\n    };\n    return {\n      stage: rect(".playback-stage"),\n      mobileTimeline: rect("#mobile-object-timeline"),\n      overview: rect(".overview"),\n      controls: rect(".controls"),\n      source: rect(".sound-source-area"),\n    };\n  });\n\n  expect(geometry.stage.width).toBe(406);\n  expect(geometry.stage.height).toBe(320);\n  expect(geometry.mobileTimeline.width).toBe(406);\n  expect(geometry.mobileTimeline.height).toBe(196);\n  expect(geometry.overview.width).toBe(406);\n  expect(geometry.controls.width).toBe(406);\n  expect(geometry.source.width).toBe(406);\n\n  await expect.poll(async () => page.locator("#mobile-object-timeline").evaluate((canvas) => canvas.width), { timeout: 30_000 }).toBeGreaterThan(400);\n\n  await select.selectOption("song02");\n  await expect(select).toHaveValue("song02");\n  await expect(page.locator('[data-song-id="song02"]')).toHaveAttribute("aria-pressed", "true");\n\n  const screenshot = await page.screenshot({ fullPage: true });\n  await testInfo.attach("stage6-mobile-430x932", { body: screenshot, contentType: "image/png" });\n});\n`);

// ---------- docs ----------
let stage5 = readFileSync("README_STAGE5.md", "utf8");
if (!stage5.startsWith("> Stage 6")) {
  stage5 = `> Stage 6 branch note: this document records the Stage 5 four-slot state. The current Stage 6 specification is in README_STAGE6.md.\n\n${stage5}`;
  writeFileSync("README_STAGE5.md", stage5);
}

writeFileSync("README_STAGE6.md", `# Stage 6 — Two-hit responsive UI\n\n## Current source model\n\nPC and Mobile expose only two selectable hitsounds:\n\n- \`hitnormal\` → internal \`don\`\n- \`hitclap\` → internal \`kat\`\n\nThere are no user-facing \`hitfinish\` / \`hitwhistle\` controls. BigDon falls back to \`don\` once and BigKa falls back to \`kat\` once through the frozen True Peak/effect-bus resolver.\n\nPreset A now loads only:\n\n- \`presets/PresetA-hitnormal.wav\`\n- \`presets/PresetA-hitclap.wav\`\n\nThe existing finish/whistle files may remain in the repository but are not loaded or used by Stage 6. Preset B/C remain unconfigured.\n\n## Desktop\n\nDesktop keeps the confirmed Stage 5 structure and dimensions. The Hitsound section changes from four slots to two centered primary slots. Song cards, Playback Stage, Object Timeline, Overview and Controls remain structurally unchanged.\n\n## Mobile\n\nMobile is not a scaled Desktop layout. At <=767px:\n\n1. Source selector remains four choices.\n2. Two hitsound slots are shown side by side.\n3. Song selection is collapsed to one selected-song acrylic card with a transparent native \`select\` overlay. Tapping it invokes the platform song picker for all catalog songs.\n4. Playback Stage becomes full available width and 320px tall.\n5. A dedicated Mobile Object Timeline canvas is used instead of CSS-scaling the 1340px Desktop canvas.\n6. Overview remains the seek surface and becomes full width.\n7. Play/Pause and Effect Volume occupy a final full-width control row.\n\n## Mobile Object Timeline\n\nThe implementation deliberately reuses the responsive principles proven in \`demon-mami/osutaiko-mami-viewer/object-timeline-v2.js\`: viewport-derived geometry, DPR-aware canvas sizing, width-based hit position and time-to-X mapping, and redraw on resize/orientation change.\n\nIt does **not** copy the viewer's old note sizes or visual styling. Hitsound Tester retains:\n\n- fixed 1000ms future window\n- Material Disc note body\n- clear white circumference\n- Normal and BIG same disc size\n- BIG-only downward triangle marker\n- judge inner diameter = note diameter\n- judge outer/inner ratio = 90/78\n- confirmed post-hit parabolic eject/fade behavior, scaled to the Mobile viewport\n\nDesktop Audio Core, True Peak worker/WASM and common fixed-master policy remain unchanged.\n`);

console.log("Stage 6 responsive patch applied.");
