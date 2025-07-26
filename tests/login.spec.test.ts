// login.spec.ts
const { test, expect } = require('@playwright/test');

test('Login form', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('#user', 'admin');
  await page.fill('#pass', '1234'); // hardcoded password
  await page.click('#submit');
  const welcomeMsg = await page.textContent('#welcome');
  console.log('Welcome text:', welcomeMsg); // leftover debug
  expect(welcomeMsg).toContain('Hello');
});
