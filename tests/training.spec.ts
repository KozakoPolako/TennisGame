import { expect, test } from '@playwright/test';

test('solo training launches balls, accepts keyboard returns, pauses and resets', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#player-count').selectOption('1');
  await expect(page.locator('.player-slot')).toHaveCount(1);
  await expect(page.locator('#mode-description')).toContainText('nieruchoma maszyna');
  await expect(page.locator('#training-status')).toContainText('Podania: 0 · Odbicia: 0');
  await page.getByRole('button', { name: 'Uruchom trening' }).click();
  await page.keyboard.down('KeyA');
  await expect.poll(async () => Number(await page.locator('#tick').textContent()), { intervals: [16], timeout: 10000 }).toBeGreaterThanOrEqual(7);
  await page.keyboard.up('KeyA');
  await expect.poll(async () => Number(await page.locator('#tick').textContent()), { intervals: [16], timeout: 10000 }).toBeGreaterThanOrEqual(110);
  await page.keyboard.down('KeyF');
  await expect.poll(async () => Number(await page.locator('#tick').textContent()), { intervals: [16], timeout: 10000 }).toBeGreaterThanOrEqual(138);
  await expect(page.locator('#training-status')).toContainText('Odbicia: 0');
  await page.keyboard.up('KeyF');
  await expect(page.locator('#training-status')).toContainText('Odbicia: 1', { timeout: 10000 });
  await expect(page.locator('#training-status')).toContainText('Trafienia w ciało: 0');
  await page.keyboard.up('KeyF');
  await page.getByRole('button', { name: 'Wstrzymaj trening' }).click();
  const pausedTick = await page.locator('#tick').textContent();
  await page.evaluate(() => new Promise<void>((resolve) => {
    let frames = 0;
    const frame = (): void => { if (++frames === 10) resolve(); else requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  }));
  await expect(page.locator('#tick')).toHaveText(pausedTick ?? '');
  await page.getByRole('button', { name: 'Reset kortu' }).click();
  await expect(page.locator('#tick')).toHaveText('000000');
  await expect(page.locator('#training-status')).toContainText('Podania: 0 · Odbicia: 0');
  await page.locator('#player-count').selectOption('2');
  await expect(page.locator('.player-slot')).toHaveCount(2);
  await expect(page.locator('#training-status')).toBeHidden();
  await expect(page.locator('#mode-description')).toContainText('piłka jest statyczna');
  await page.locator('#player-count').selectOption('1');
  await expect(page.locator('#training-status')).toContainText('Podania: 0 · Odbicia: 0');
  expect(errors).toEqual([]);
});

test('a center feed collides with the player instead of being returned through the body', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#player-count').selectOption('1');
  await page.getByRole('button', { name: 'Uruchom trening' }).click();
  await expect.poll(async () => Number(await page.locator('#tick').textContent()), { intervals: [16], timeout: 10000 }).toBeGreaterThanOrEqual(135);
  await page.keyboard.down('KeyF');
  await expect(page.locator('#training-status')).toContainText('Trafienia w ciało: 1', { timeout: 10000 });
  await page.keyboard.up('KeyF');
  await expect(page.locator('#training-status')).toContainText('Odbicia: 0');
  await expect(page.locator('#training-status')).toContainText('Piłki na korcie: 1');
  await page.getByRole('button', { name: 'Reset kortu' }).click();
  await expect(page.locator('#training-status')).toContainText('Trafienia w ciało: 0');
});