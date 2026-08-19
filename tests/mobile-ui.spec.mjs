import { test, expect } from "@playwright/test";

test("mobile dedicated layout: native song picker and responsive timeline", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");

  const picker = page.locator(".mobile-song-picker");
  await expect(picker).toBeVisible();
  await expect(page.locator(".song-area")).toBeHidden();
  await expect(page.locator(".sound-slot")).toHaveCount(2);
  await expect(page.locator("#set-1-don")).toBeAttached();
  await expect(page.locator("#set-1-kat")).toBeAttached();
  await expect(page.locator("#set-1-big_don")).toHaveCount(0);
  await expect(page.locator("#set-1-big_kat")).toHaveCount(0);

  const select = page.locator("#mobile-song-select");
  await expect.poll(async () => select.locator("option").count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
  await expect(page.locator("#mobile-object-timeline")).toBeVisible();
  await expect(page.locator("#object-timeline")).toBeHidden();

  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { width: r.width, height: r.height, x: r.x, y: r.y };
    };
    return {
      stage: rect(".playback-stage"),
      mobileTimeline: rect("#mobile-object-timeline"),
      overview: rect(".overview"),
      controls: rect(".controls"),
      source: rect(".sound-source-area"),
      songPicker: rect(".mobile-song-picker"),
    };
  });

  expect(geometry.stage.width).toBe(406);
  expect(geometry.stage.height).toBe(188);
  expect(geometry.mobileTimeline.width).toBe(geometry.stage.width - 2);
  expect(geometry.mobileTimeline.height).toBe(136);
  expect(geometry.overview.width).toBe(406);
  expect(geometry.controls.width).toBe(406);
  expect(geometry.source.width).toBe(406);
  expect(geometry.stage.y - (geometry.songPicker.y + geometry.songPicker.height)).toBeGreaterThanOrEqual(160);
  expect(geometry.overview.y - (geometry.stage.y + geometry.stage.height)).toBeGreaterThanOrEqual(130);

  await expect.poll(async () => page.locator("#mobile-object-timeline").evaluate((canvas) => canvas.width), { timeout: 30_000 }).toBeGreaterThan(400);
  await expect(page.locator(".player")).toHaveAttribute("data-safety-ready", "true", { timeout: 30_000 });

  // Capture the initial dense fixture before changing songs so the responsive
  // horizontal spacing is visible in the visual QA artifact.
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("stage6-mobile-430x932", { body: screenshot, contentType: "image/png" });

  await select.selectOption("song02");
  await expect(select).toHaveValue("song02");
  await expect(page.locator('[data-song-id="song02"]')).toHaveAttribute("aria-pressed", "true");
});
