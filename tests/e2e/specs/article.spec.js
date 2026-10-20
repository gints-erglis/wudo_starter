import { test, expect } from '@playwright/test';
import { declineConsent } from '../support/pages.js';

// The article page: date, reading time, favorite, and a table of contents
// from the headings of the body, in the sidebar or, on small screens, at the
// top of the article.
const path = '/article/colors-change';

async function open(page) {
  const response = await page.goto(path, { waitUntil: 'networkidle' });
  test.skip(response.status() !== 200, 'Needs the demo articles; install with --demo.');
  await declineConsent(page);
}

test('an article shows its date, reading time and favorite button', async ({ page }) => {
  await open(page);
  const meta = page.locator('.article__meta');
  await expect(meta.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d\d-\d\dT/);
  await expect(meta.locator('.article__reading-time')).toHaveText(/^\d+ min read$/);
  await expect(meta.locator('wudo-favorite-button')).toHaveAttribute('label', 'Colors of change');
});

test('the text keeps a readable line length', async ({ page }) => {
  await open(page);
  const width = await page.locator('.article__body').evaluate((element) => element.getBoundingClientRect().width);
  const fontSize = await page.locator('.article__body p').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  // Roughly 75 characters of half an em.
  expect(width / (fontSize * 0.5)).toBeLessThanOrEqual(85);
});

test('the contents link to the headings of the body', async ({ page, isMobile }) => {
  await open(page);
  const toc = isMobile ? page.locator('.article__toc .toc') : page.locator('.layout-sidebar-second .toc');
  const hidden = isMobile ? page.locator('.layout-sidebar-second .toc') : page.locator('.article__toc .toc');
  await expect(toc).toBeVisible();
  await expect(hidden).toBeHidden();

  if (isMobile) {
    await toc.locator('summary').click();
  }
  const links = toc.locator('.toc__link');
  const headings = page.locator('.article__body :is(h2, h3)');
  await expect(links).toHaveCount(await headings.count());
  for (const [index, heading] of (await headings.all()).entries()) {
    await expect(links.nth(index)).toHaveAttribute('href', `#${await heading.getAttribute('id')}`);
    await expect(links.nth(index)).toHaveText(await heading.innerText());
  }

  await links.last().click();
  await expect(page).toHaveURL(new RegExp(`${await links.last().getAttribute('href')}$`));
  await expect(headings.last()).toBeInViewport();
  if (!isMobile) {
    await expect(links.last()).toHaveAttribute('aria-current', 'location');
  }
});

test('article cards show a short summary without the headings of the body', async ({ page }) => {
  await page.goto('/articles', { waitUntil: 'networkidle' });
  const summaries = page.locator('.article-card__summary');
  test.skip(await summaries.count() === 0, 'Needs articles; install with --demo.');
  for (const summary of await summaries.all()) {
    await expect(summary.locator('h2, h3, ul, ol')).toHaveCount(0);
    const lines = await summary.evaluate((element) => element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight));
    expect(Math.round(lines)).toBeLessThanOrEqual(3);
  }
});
