import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Every component of the Storybook catalog reads well in every color scheme:
// on a light and a dark page, and as a dark or light part of the other.
// Needs the built catalog (ddev storybook).
const catalog = '/themes/custom/wudo/storybook-static/';
const schemes = ['light', 'dark', 'dark-part', 'light-part'];

test('components keep readable contrast in every color scheme', async ({ page, request, isMobile }) => {
  test.skip(isMobile, 'The catalog is checked once.');
  const index = await request.get(`${catalog}index.json`);
  test.skip(!index.ok(), 'The component catalog is not built; run ddev storybook.');
  test.setTimeout(5 * 60 * 1000);

  const stories = Object.values((await index.json()).entries).filter((entry) => entry.type === 'story');
  const problems = {};
  for (const scheme of schemes) {
    for (const story of stories) {
      await page.goto(`${catalog}iframe.html?id=${story.id}&viewMode=story&globals=scheme:${scheme}`, { waitUntil: 'networkidle' });
      const results = await new AxeBuilder({ page })
        .include('#storybook-root')
        .withRules(['color-contrast'])
        .analyze();
      const nodes = results.violations.flatMap(({ nodes }) => nodes.map((node) => node.target.join(' ')));
      if (nodes.length) {
        problems[`${story.id} (${scheme})`] = nodes;
      }
    }
  }
  expect(problems).toEqual({});
});
