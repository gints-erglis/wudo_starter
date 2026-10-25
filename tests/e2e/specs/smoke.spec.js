import { test, expect } from '@playwright/test';
import { collectErrors, sitePaths } from '../support/pages.js';

test('every page renders without script or CSP errors', async ({ page, request }) => {
  const width = page.viewportSize().width;
  for (const path of await sitePaths(request)) {
    await test.step(path, async () => {
      const errors = collectErrors(page);
      const response = await page.goto(path, { waitUntil: 'networkidle' });
      const expected = path === '/this-page-does-not-exist' ? 404 : 200;

      expect(response.status(), 'status').toBe(expected);
      await expect(page.locator('h1'), 'exactly one h1').toHaveCount(1);
      await expect(page.locator('html'), 'language').toHaveAttribute('lang', /.+/);
      await expect(page, 'title').toHaveTitle(/.+/);
      // Wider than the screen, a page makes a phone zoom out.
      expect(await page.evaluate(() => window.innerWidth), 'no wider than the screen').toBe(width);
      // The 404 response itself is logged by the browser as a failed resource.
      expect(errors.filter((error) => !(expected === 404 && /404/.test(error))), 'console errors').toEqual([]);
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
    });
  }
});

test('security headers are sent', async ({ request }) => {
  const headers = (await request.get('/')).headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).not.toContain("script-src 'self' 'unsafe-inline'");
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['x-content-type-options']).toBe('nosniff');
});

test('the skip link is the first focusable element', async ({ page, browserName, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation.');
  await page.goto('/', { waitUntil: 'networkidle' });
  // An unanswered consent notice comes first; answer it.
  const decline = page.locator('#klaro .cookie-notice .cn-decline');
  if (await decline.count()) {
    await decline.click();
    await page.reload();
  }
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
});

test('social links have an icon and a name', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('.social-links__link');
  test.skip(await links.count() === 0, 'No links in the "Social links" menu.');

  for (const link of await links.all()) {
    await expect(link.locator('svg')).toBeVisible();
    await expect(link).toHaveAccessibleName(/.+/);
  }
  // Known networks get their own icon instead of the fallback globe.
  for (const link of await page.locator('.social-links__link[href*="facebook.com"]').all()) {
    await expect(link).toHaveClass(/social-links__link--facebook/);
  }
});
