import { test, expect } from '@playwright/test';

// What search engines and AI crawlers read besides the pages themselves.

/**
 * Returns the schema.org items of a page, by type.
 */
async function structuredData(page, path) {
  await page.goto(path);
  const items = {};
  for (const json of await page.locator('script[type="application/ld+json"]').allTextContents()) {
    const data = JSON.parse(json);
    for (const item of data['@graph'] ?? [data]) {
      items[item['@type']] = item;
    }
  }
  return items;
}

test.describe('discovery', () => {
  test.skip(({ isMobile }) => isMobile, 'Does not depend on the screen.');

  test('robots.txt lists the sitemap and keeps AI training crawlers out', async ({ request, baseURL }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBe(true);
    const robots = await response.text();
    expect(robots).toContain(`Sitemap: ${new URL('/sitemap.xml', baseURL)}`);
    expect(robots).toMatch(/User-agent: GPTBot\nDisallow: \/\n/);
    expect(robots).toContain('Disallow: /admin/');
  });

  test('llms.txt describes the site in Markdown', async ({ request, baseURL }) => {
    const response = await request.get('/llms.txt');
    expect(response.ok()).toBe(true);
    const llms = await response.text();
    expect(llms).toMatch(/^# \S/);
    expect(llms).toContain('## Main pages');
    expect(llms).toContain(`(${new URL('/sitemap.xml', baseURL)})`);
    expect(llms).not.toMatch(/\[[a-z_]+:[^\]]+\]/);
  });

  test('the front page describes the site and its publisher', async ({ page, baseURL }) => {
    const items = await structuredData(page, '/');
    const site = new URL('/', baseURL).href;
    expect(items.WebSite).toMatchObject({ url: site, publisher: { '@id': `${site}#organization` } });
    expect(items.Organization).toMatchObject({ url: site, name: expect.any(String) });
    expect(items.Organization.logo.url).toMatch(/^https?:\/\/.+\/logo\.\w+$/);
    expect((await page.request.get(items.Organization.logo.url)).ok(), 'logo').toBe(true);
    expect(items.WebPage).not.toHaveProperty('breadcrumb');
  });

  test('an article describes itself, its publisher and its breadcrumb', async ({ page }) => {
    await page.goto('/articles');
    const link = page.locator('.article-card__title__link').first();
    test.skip(await link.count() === 0, 'Needs articles; install with --demo.');

    const items = await structuredData(page, await link.getAttribute('href'));
    expect(items.Article).toMatchObject({
      headline: await page.locator('h1').innerText(),
      datePublished: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
      publisher: { '@type': 'Organization' },
    });
    expect(items.Article.author['@type']).toBe('Organization');
    expect(items.WebPage.breadcrumb.itemListElement.length).toBeGreaterThan(0);
  });
});
