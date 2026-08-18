import { test, expect } from "@playwright/test";

async function installSafetyObserver(page) {
  await page.evaluate(() => {
    const player = document.querySelector(".player");
    globalThis.__safetyMutations = [];
    const record = () => globalThis.__safetyMutations.push({
      ready: player.getAttribute("data-safety-ready"),
      master: player.getAttribute("data-master-gain-db"),
      at: performance.now(),
    });
    new MutationObserver(record).observe(player, {
      attributes: true,
      attributeFilter: ["data-safety-ready", "data-master-gain-db"],
    });
    record();
  });
}

async function resetSafetyLog(page) {
  await page.evaluate(() => { globalThis.__safetyMutations = []; });
}

async function safetyLog(page) {
  return page.evaluate(() => globalThis.__safetyMutations || []);
}

async function masterDb(page) {
  return page.locator(".player").getAttribute("data-master-gain-db");
}

async function waitForSafety(page) {
  await expect(page.locator(".player")).toHaveAttribute("data-safety-ready", "true", { timeout: 30_000 });
}

async function setFileFromUrl(page, selector, url, filename) {
  await page.locator(selector).evaluate(async (input, args) => {
    const response = await fetch(args.url);
    if (!response.ok) throw new Error(`fixture fetch failed: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const file = new File([bytes], args.filename, { type: "audio/wav" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, { url, filename });
}

async function loadRequiredSounds(page) {
  await setFileFromUrl(page, "#set-1-don", "/fixtures/don.wav", "my-normal.wav");
  await waitForSafety(page);
  await setFileFromUrl(page, "#set-1-kat", "/fixtures/kat.wav", "my-clap.wav");
  await waitForSafety(page);
  await expect(page.locator(".play-button")).toBeEnabled();
}

async function setEffectVolume(page, value) {
  await page.locator("#effect-volume-input").evaluate((input, next) => {
    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  await expect(page.locator("#effect-volume-output")).toHaveText(`${value}%`);
  await page.waitForTimeout(35);
}

async function setSeek(page, seconds) {
  await page.locator(".seek-input").evaluate((input, value) => {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, seconds);
}

async function chooseSong(page, songId) {
  const mobilePicker = page.locator(".mobile-song-picker");
  if (await mobilePicker.isVisible()) {
    await page.locator("#mobile-song-select").selectOption(songId);
  } else {
    await page.locator(`[data-song-id="${songId}"]`).click();
  }
}

test("practical audio gate: My Sound + Preset A", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-song-id="song01"]')).toBeAttached();
  await waitForSafety(page);
  await installSafetyObserver(page);
  await loadRequiredSounds(page);

  await test.step("1. Effect Volume does not change fixed Master or invalidate safety", async () => {
    const master = await masterDb(page);
    await resetSafetyLog(page);
    for (const value of [100, 50, 0, 80, 85, 80]) {
      await setEffectVolume(page, value);
      await expect(page.locator(".player")).toHaveAttribute("data-safety-ready", "true");
      expect(await masterDb(page)).toBe(master);
    }
    expect((await safetyLog(page)).some((entry) => entry.ready === null)).toBe(false);
  });

  await test.step("2. Preset A is ready and source switching keeps common Master", async () => {
    const master = await masterDb(page);
    await resetSafetyLog(page);

    const presetA = page.locator('[data-source="preset-a"]');
    await expect(presetA).toBeEnabled();
    await expect(presetA).toHaveAttribute("data-source-state", "ready");
    await expect(page.locator('[data-source="preset-b"]')).toBeDisabled();
    await expect(page.locator('[data-source="preset-c"]')).toBeDisabled();

    for (const name of [
      "PresetA-hitnormal.wav",
      "PresetA-hitclap.wav",
    ]) {
      const response = await page.request.get(`/presets/${name}`);
      expect(response.ok()).toBe(true);
      expect((await response.body()).byteLength).toBeGreaterThan(1000);
    }

    await presetA.click();
    await expect(presetA).toHaveAttribute("aria-checked", "true");
    await expect(page.locator(".play-button")).toBeEnabled();
    await expect(page.locator("#set-1-don")).toBeDisabled();
    await expect(page.locator("#set-1-kat")).toBeDisabled();
    await expect(page.locator(".sound-filename").nth(0)).toHaveText("PresetA-hitnormal.wav");
    await expect(page.locator(".sound-filename").nth(1)).toHaveText("PresetA-hitclap.wav");
    expect(await masterDb(page)).toBe(master);
    expect((await safetyLog(page)).some((entry) => entry.ready === null)).toBe(false);

    await page.locator('[data-source="my-sound"]').click();
    await expect(page.locator('[data-source="my-sound"]')).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#set-1-don")).toBeEnabled();
    await expect(page.locator("#set-1-kat")).toBeEnabled();
    expect(await masterDb(page)).toBe(master);
    expect((await safetyLog(page)).some((entry) => entry.ready === null)).toBe(false);
  });

  await test.step("3. Play / Pause / Resume remains a single stable transport", async () => {
    const master = await masterDb(page);
    await resetSafetyLog(page);
    for (let i = 0; i < 5; i += 1) {
      await page.locator(".play-button").click();
      await expect(page.locator(".player")).toHaveAttribute("data-player-state", "playing");
      await page.waitForTimeout(90);
      await page.locator(".play-button").click();
      await expect(page.locator(".player")).toHaveAttribute("data-player-state", "paused");
    }
    expect(await masterDb(page)).toBe(master);
    expect((await safetyLog(page)).some((entry) => entry.ready === null)).toBe(false);
  });

  await test.step("4. Seek works paused and playing without safety recalculation", async () => {
    const master = await masterDb(page);
    await resetSafetyLog(page);
    await setSeek(page, 1.2);
    await expect.poll(async () => Number(await page.locator(".seek-input").inputValue())).toBeGreaterThan(1.15);

    await page.locator(".play-button").click();
    await expect(page.locator(".player")).toHaveAttribute("data-player-state", "playing");
    await page.waitForTimeout(80);
    await setSeek(page, 2.25);
    await expect(page.locator(".player")).toHaveAttribute("data-player-state", "playing");
    await expect.poll(async () => Number(await page.locator(".seek-input").inputValue())).toBeGreaterThan(2.2);
    await page.locator(".play-button").click();
    await expect(page.locator(".player")).toHaveAttribute("data-player-state", "paused");

    expect(await masterDb(page)).toBe(master);
    expect((await safetyLog(page)).some((entry) => entry.ready === null)).toBe(false);
  });

  await test.step("5. My Sound/song changes invalidate then rebuild safety", async () => {
    await resetSafetyLog(page);
    await setFileFromUrl(page, "#set-1-don", "/fixtures/loud-don.wav", "loud-normal.wav");
    await expect(page.locator(".play-button")).toBeDisabled();
    await waitForSafety(page);
    await expect(page.locator(".play-button")).toBeEnabled();
    expect((await safetyLog(page)).some((entry) => entry.ready === null)).toBe(true);

    await resetSafetyLog(page);
    await chooseSong(page, "song02");
    await expect(page.locator(".play-button")).toBeDisabled();
    await waitForSafety(page);
    await expect(page.locator(".play-button")).toBeEnabled();
    expect((await safetyLog(page)).some((entry) => entry.ready === null)).toBe(true);

    await expect(page.locator("#set-1-big_don")).toHaveCount(0);
    await expect(page.locator("#set-1-big_kat")).toHaveCount(0);
  });
});
