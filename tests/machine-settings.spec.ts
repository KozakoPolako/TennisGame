import { expect, test } from '@playwright/test';

test('machine settings appear only in solo and reset training while retaining choices', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  const settings = page.locator('#machine-settings');
  await expect(settings).toBeHidden();
  await page.locator('#player-count').selectOption('1');
  await expect(settings).toBeVisible();
  await expect(page.locator('#machine-power')).toHaveValue('standard');
  await expect(page.locator('#machine-direction')).toHaveValue('standard');
  await page.locator('#start').click();
  await expect.poll(() => page.locator('#tick').textContent().then(Number)).toBeGreaterThan(5);
  await page.getByLabel('Siła podania').selectOption('random');
  await expect(page.locator('#tick')).toHaveText('000000');
  await expect(page.locator('#session-status')).toContainText('Pauza');
  await expect(page.locator('#machine-direction')).toHaveValue('standard');
  await page.getByLabel('Kierunek wyrzutu').selectOption('random');
  await page.locator('#reset').click();
  await expect(page.locator('#machine-power')).toHaveValue('random');
  await expect(page.locator('#machine-direction')).toHaveValue('random');
  await page.locator('#player-count').selectOption('4');
  await expect(settings).toBeHidden();
  await page.locator('#player-count').selectOption('1');
  await expect(settings).toBeVisible();
  await expect(page.locator('#machine-power')).toHaveValue('random');
  await page.locator('#start').click();
  await expect(page.locator('#training-status')).toContainText('Podania: 1', { timeout: 10000 });
});