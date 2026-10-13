import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { collectErrors, declineConsent } from '../support/pages.js';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// A word that the site certainly contains: the longest one of the front
// page's heading.
let word;

// Search is optional: ddev add-search.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  test.skip(await page.locator('[data-search-open]').count() === 0, 'Search is not installed.');
  await declineConsent(page);
  const heading = await page.locator('h1').first().textContent();
  word = heading.split(/[^\p{L}]+/u).sort((a, b) => b.length - a.length)[0];
  expect(word.length, `a searchable word in "${heading}"`).toBeGreaterThan(2);
});

test('the search button opens a drawer with results while typing', async ({ page }) => {
  const errors = collectErrors(page);
  const drawer = page.locator('#search-drawer');
  const input = drawer.getByRole('searchbox');
  const status = drawer.getByRole('status');

  await page.locator('[data-search-open]').click();
  await expect(drawer).toHaveAttribute('open', '');
  await expect(input).toBeFocused();

  // Too short to search for.
  await input.fill('x');
  await expect(status).toHaveText(/at least 2/);
  await expect(drawer.locator('.search-result')).toHaveCount(0);

  await input.fill(word);
  await expect(drawer.locator('.search-result').first()).toBeVisible();
  await expect(status).toHaveText(/^\d+ results?$/);
  for (const link of await drawer.locator('.search-result__link').all()) {
    await expect(link).toHaveAttribute('href', /^\//);
    await expect(link).toHaveAccessibleName(/.+/);
  }

  await input.fill('zzqqxxyy');
  await expect(status).toHaveText(/Nothing found/);
  await expect(drawer.locator('.search-result')).toHaveCount(0);

  // Enter leads to the search page with the same search.
  await input.fill(word);
  await input.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/search\\?keys=${encodeURIComponent(word)}`));
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.view--search .search-result').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('the drawer closes with Escape and returns to the button', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation.');
  const button = page.locator('[data-search-open]');
  await button.click();
  await expect(page.locator('#search-drawer')).toHaveAttribute('open', '');
  await expect(page.locator('#search-drawer').getByRole('searchbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#search-drawer')).not.toHaveAttribute('open', '');
  await expect(button).toBeFocused();
});

test('search works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  // The button is a plain link to the search page.
  await page.locator('[data-search-open]').click();
  await expect(page).toHaveURL(/\/search$/);
  await expect(page.locator('#search-drawer-input')).toBeHidden();
  const form = page.locator('.view--search form');
  await form.getByLabel('Search this site').fill(word);
  await form.getByRole('button', { name: 'Search' }).click();
  await expect(page.locator('.view--search .search-result').first()).toBeVisible();
  await context.close();
});

test('the error pages are not found by the search', async ({ request }) => {
  for (const title of ['Page not found', 'Access denied']) {
    const data = await (await request.get(`/api/search?q=${encodeURIComponent(title)}`)).json();
    expect(data.items.map((item) => item.title)).not.toContain(title);
  }
});

test('the search drawer and page have no WCAG 2.2 AA violations', async ({ page }) => {
  await page.locator('[data-search-open]').click();
  const drawer = page.locator('#search-drawer');
  await drawer.getByRole('searchbox').fill(word);
  await expect(drawer.locator('.search-result').first()).toBeVisible();
  let results = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map((n) => n.target.join(' ')) }))).toEqual([]);

  for (const path of ['/search', `/search?keys=${encodeURIComponent(word)}`, '/search?keys=zzqqxxyy']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    results = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map((n) => n.target.join(' ')) })), path).toEqual([]);
  }
});
