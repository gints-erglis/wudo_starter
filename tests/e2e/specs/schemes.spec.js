import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { declineConsent } from '../support/pages.js';

// Color schemes: a part of the page in the other scheme (.scheme-dark,
// .scheme-light) keeps its text readable, on a light and on a dark page.

/**
 * Returns the color contrast problems inside the given element.
 */
async function contrast(page, selector) {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withRules(['color-contrast'])
    .analyze();
  return results.violations.flatMap(({ nodes }) => nodes.map((node) => node.target.join(' ')));
}

/**
 * Returns how light a color is, from 0 (black) to 1 (white).
 */
function lightness(color) {
  const [r, g, b] = color.match(/[\d.]+/g).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/articles', { waitUntil: 'networkidle' });
  await declineConsent(page);
});

test('a dark header on a light page has light text', async ({ page }) => {
  const header = page.locator('header.site-header');
  await header.evaluate((element) => element.classList.add('scheme-dark'));

  const colors = await header.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    text: getComputedStyle(element).color,
  }));
  expect(lightness(colors.background)).toBeLessThan(0.5);
  expect(lightness(colors.text)).toBeGreaterThan(0.5);
  expect(await contrast(page, 'header.site-header')).toEqual([]);
});

test('a light part of a dark page keeps dark text on light cards', async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.querySelector('.layout-content').classList.add('scheme-light', 'scheme-surface');
  });
  const card = page.locator('.layout-content .article-card').first();
  test.skip(await card.count() === 0, 'Needs articles; install with --demo.');

  const colors = await card.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    text: getComputedStyle(element).color,
  }));
  expect(lightness(colors.background)).toBeGreaterThan(0.5);
  expect(lightness(colors.text)).toBeLessThan(0.5);
  expect(await contrast(page, '.layout-content')).toEqual([]);
});

test('the footer is dark on light and dark pages', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
    const background = await page.locator('.site-footer').evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(lightness(background), theme).toBeLessThan(0.2);
    expect(await contrast(page, '.site-footer'), theme).toEqual([]);
  }
});

test('links in a dark part of a light page stay light on hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover needs a pointer.');
  await page.evaluate(() => document.querySelector('.layout-content').classList.add('scheme-dark', 'scheme-surface'));
  const link = page.locator('.layout-content .article-card__title__link').first();
  test.skip(await link.count() === 0, 'Needs articles; install with --demo.');

  await link.hover();
  expect(lightness(await link.evaluate((element) => getComputedStyle(element).color))).toBeGreaterThan(0.5);
});
