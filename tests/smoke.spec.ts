import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL!);
});

test('dashboard loads with header and KPIs', async ({ page }) => {
  await expect(page.locator('.header .logo-title')).toBeVisible();
  await expect(page.locator('.kpi-grid .kpi-card').first()).toBeVisible();
});

test('network overview iframe is reachable', async ({ page }) => {
  await page.locator('.nav-item[data-view="network"]').click();
  const frameEl = page.locator('#networkMapFrame');
  await expect(frameEl).toBeVisible();
  // Wait a bit for inner map to initialize
  await page.waitForTimeout(1000);
  const frame = await frameEl.elementHandle();
  const content = await (await frame!.contentFrame())!;
  // Map container should exist inside
  await expect(content.locator('#map')).toBeVisible({ timeout: 15_000 });
});

test('schedule planning shows rows (real or demo)', async ({ page }) => {
  await page.locator('.nav-item[data-view="schedule"]').click();
  const table = page.locator('#scheduleTableBody');
  // The loader replaces content; give it time to fetch or generate demo
  await expect(page.locator('#scheduleCount')).toBeVisible();
  await page.waitForTimeout(1500);
  const rows = table.locator('tr');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
});
