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

  const noteStyle = await page.locator("#object-timeline").evaluate((canvas) => {
    const ctx = canvas.getContext("2d");
    const ratio = canvas.width / 1340;
    const pixel = (x, y) => {
      const p = ctx.getImageData(Math.round(x * ratio), Math.round(y * ratio), 1, 1).data;
      return [p[0], p[1], p[2], p[3]];
    };
    const bodyWidth = (centerX) => {
      const active = [];
      for (let x = centerX - 45; x <= centerX + 45; x += 1) {
        const p = pixel(x, 125);
        if (p[0] > 42 || p[1] > 42 || p[2] > 42) active.push(x);
      }
      return active.length ? active.at(-1) - active[0] + 1 : 0;
    };

    // QA Dense at t=0: normal Don=500ms (x≈702), BIG Don=800ms (x≈1068).
    return {
      normalWidth: bodyWidth(702),
      bigWidth: bodyWidth(1068),
      normalRim: pixel(674, 125),
      bigRim: pixel(1040, 125),
      normalAbove: pixel(702, 50),
      bigMarker: pixel(1068, 50),
      materialLight: pixel(692, 115),
      materialDark: pixel(712, 135),
    };
  });

  expect(Math.abs(noteStyle.normalWidth - noteStyle.bigWidth)).toBeLessThanOrEqual(2);
  expect(noteStyle.normalWidth).toBeGreaterThanOrEqual(56);
  expect(Math.min(...noteStyle.normalRim.slice(0, 3))).toBeGreaterThan(180);
  expect(Math.min(...noteStyle.bigRim.slice(0, 3))).toBeGreaterThan(180);
  expect(Math.max(...noteStyle.normalAbove.slice(0, 3))).toBeLessThan(60);
  expect(Math.min(...noteStyle.bigMarker.slice(0, 3))).toBeGreaterThan(200);
  expect(noteStyle.materialLight[0] + noteStyle.materialLight[1] + noteStyle.materialLight[2])
    .toBeGreaterThan(noteStyle.materialDark[0] + noteStyle.materialDark[1] + noteStyle.materialDark[2]);

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("desktop-stage5-1440x900", {
    body: screenshot,
    contentType: "image/png",
  });
});
