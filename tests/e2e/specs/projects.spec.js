import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { declineConsent } from '../support/pages.js';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The "Project" content type is optional: ddev add-projects --demo.
test.beforeEach(async ({ page }) => {
  const response = await page.goto('/projects');
  test.skip(response.status() === 404, 'Projects are not installed.');
  test.skip(await page.locator('.project-card').count() === 0, 'No demo projects.');
  await declineConsent(page);
});

test('the project list is filtered in place', async ({ page, isMobile }) => {
  const cards = page.locator('.project-card');
  const all = await cards.count();
  const category = page.getByLabel('Category');
  const name = (await category.locator('option:not([value="All"])').first().textContent()).trim();

  // Narrow screens keep the filters in a drawer.
  const toggle = page.locator('.filter-bar__toggle');
  if (isMobile) {
    await expect(category).toBeHidden();
    await toggle.click();
  }
  else {
    await expect(toggle).toBeHidden();
    await category.focus();
  }

  // No submit button: the list follows the filter, and so does the address.
  await category.selectOption({ label: name });
  await expect(page).toHaveURL(/category=\d+/);
  await expect(page.locator('[data-filter-status]')).toHaveText(/\d+/);
  if (isMobile) {
    await page.getByRole('button', { name: 'Show results' }).click();
    await expect(toggle).toBeFocused();
    await expect(toggle).toContainText('1');
  }
  else {
    // Only the results were replaced, so the keyboard position is kept.
    await expect(category).toBeFocused();
  }
  expect(await cards.count()).toBeLessThan(all);
  for (const card of await cards.all()) {
    await expect(card.locator('.project-card__meta')).toContainText(name);
  }

  // The active filter is a chip that removes it.
  await page.getByRole('button', { name: `Remove filter: Category: ${name}` }).click();
  await expect(cards).toHaveCount(all);
  await expect(page.locator('.filter-bar__chip')).toHaveCount(0);
});

test('a filtered project list can be opened by its address', async ({ page }) => {
  const value = await page.getByLabel('Category').locator('option:not([value="All"])').first().getAttribute('value');
  const all = await page.locator('.project-card').count();

  await page.goto(`/projects?category=${value}`);
  await expect(page.locator('.filter-bar__chip')).toHaveCount(1);
  expect(await page.locator('.project-card').count()).toBeLessThan(all);
});

test('project filters work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/projects');
  const all = await page.locator('.project-card').count();

  await page.getByLabel('Category').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/category=\d+/);
  expect(await page.locator('.project-card').count()).toBeLessThan(all);
  await context.close();
});

test('a project page lists its facts', async ({ page }) => {
  await page.locator('.project-card a').first().click();

  await expect(page.locator('h1')).toHaveCount(1);
  const facts = page.locator('.project__facts dl');
  await expect(facts.locator('dt', { hasText: 'Category' })).toBeVisible();
  await expect(facts.locator('dt', { hasText: 'Year' })).toBeVisible();
  // The end year is part of the "Year" row, not a row of its own.
  await expect(facts.locator('dt', { hasText: 'End year' })).toHaveCount(0);
});

test('the filtered project list has no WCAG 2.2 AA violations', async ({ page, isMobile }) => {
  const value = await page.getByLabel('Category').locator('option:not([value="All"])').first().getAttribute('value');
  await page.goto(`/projects?category=${value}`, { waitUntil: 'networkidle' });
  if (isMobile) {
    await page.locator('.filter-bar__toggle').click();
    await expect(page.locator('wudo-filter-bar wudo-drawer')).toHaveAttribute('open', '');
  }
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(results.violations.map(({ id, nodes }) => ({ rule: id, nodes: nodes.map((node) => node.target.join(' ')) }))).toEqual([]);
});
