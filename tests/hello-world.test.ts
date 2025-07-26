const { test, expect } = require('@playwright/test');

test('should display Hello, World!', async ({ page }) => {
  await page.setContent('<h1>Hello, World!</h1>');
  await expect(page.locator('h1')).toHaveText('Hello, World!');
});
