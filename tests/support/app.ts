import { expect, type Page } from '@playwright/test';

export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.waitForFunction(() => window.__tennis !== undefined);
}
