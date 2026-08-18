import { test, expect } from "@playwright/test";

test("desktop geometry and confirmed source states", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator('[data-song-id="song01"]')).toBeVisible();

  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return {
      source: rect(".sound-source-area"),
      song: rect(".song-area"),
      card: rect(".song-button"),
      stage: rect(".playback-stage"),
      timeline: rect(".object-timeline"),
      transport: rect(".transport-row"),
      overview: rect(".overview"),
      controls: rect(".controls"),
    };
  });

  expect(geometry.source.width).toBe(900);
  expect(geometry.song.width).toBe(1120);
  expect(geometry.song.height).toBe(240);
  expect(geometry.card.width).toBe(210);
  expect(geometry.card.height).toBe(40);
  expect(geometry.stage.width).toBe(1340);
  expect(geometry.stage.height).toBe(420);
  expect(geometry.timeline.width).toBe(1340);
  expect(geometry.timeline.height).toBe(250);
  expect(geometry.transport.width).toBe(1340);
  expect(geometry.transport.height).toBe(84);
  expect(geometry.overview.width).toBe(1000);
  expect(geometry.controls.width).toBe(320);

  expect(geometry.stage.y - (geometry.song.y + geometry.song.height)).toBe(34);
  expect(geometry.transport.y - (geometry.stage.y + geometry.stage.height)).toBe(10);

  await expect(page.locator('[data-source="my-sound"]')).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('[data-source="preset-a"]')).toBeEnabled();
  await expect(page.locator('[data-source="preset-a"]')).toHaveAttribute("data-source-state", "ready");
  await expect(page.locator('[data-source="preset-b"]')).toBeDisabled();
  await expect(page.locator('[data-source="preset-c"]')).toBeDisabled();

  await expect(page.locator(".disc-panel")).toHaveCount(0);
  await expect(page.locator(".waveform-panel")).toHaveCount(0);

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("desktop-stage5-1440x900", {
    body: screenshot,
    contentType: "image/png",
  });
});
