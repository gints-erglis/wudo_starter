import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// A banner block in the article sidebar. Needs Drush to make one, so it runs
// where the site does (ddev e2e).
const drushPath = new URL('../../../vendor/bin/drush', import.meta.url).pathname;
const drush = (...args) => execFileSync(drushPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const path = '/article/colors-change';

test.describe('banner', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!existsSync(drushPath), 'Drush is not available.');

  // One banner per project, as the projects may run at the same time.
  const id = (testInfo) => `e2e_banner_${testInfo.project.name}`;

  test.beforeAll(({}, testInfo) => {
    drush('php:eval', `
      $media = current(\\Drupal::entityTypeManager()->getStorage('media')->loadByProperties(['bundle' => 'image']));
      if (!$media) { return; }
      $banner = \\Drupal\\block_content\\Entity\\BlockContent::create(['type' => 'banner', 'info' => '${id(testInfo)}', 'field_banner_image' => $media->id(), 'field_banner_link' => ['uri' => 'https://example.com/']]);
      $banner->save();
      \\Drupal\\block\\Entity\\Block::create(['id' => '${id(testInfo)}', 'theme' => 'wudo', 'region' => 'sidebar_second', 'weight' => 10, 'plugin' => 'block_content:' . $banner->uuid(), 'settings' => ['label' => '${id(testInfo)}', 'label_display' => '0', 'provider' => 'block_content'], 'visibility' => ['entity_bundle:node' => ['id' => 'entity_bundle:node', 'negate' => FALSE, 'context_mapping' => ['node' => '@node.node_route_context:node'], 'bundles' => ['article' => 'article']]]])->save();
    `);
  });

  test.afterAll(({}, testInfo) => {
    drush('php:eval', `
      \\Drupal\\block\\Entity\\Block::load('${id(testInfo)}')?->delete();
      foreach (\\Drupal::entityTypeManager()->getStorage('block_content')->loadByProperties(['info' => '${id(testInfo)}']) as $banner) { $banner->delete(); }
    `);
  });

  test('a banner in the sidebar is an image that links, marked as sponsored', async ({ page, isMobile }, testInfo) => {
    const response = await page.goto(path);
    test.skip(response.status() !== 200, 'Needs the demo articles; install with --demo.');
    const banner = page.locator(`.layout-sidebar-second #block-${id(testInfo).replaceAll('_', '-')} .banner`);
    test.skip(await banner.count() === 0, 'Needs a media image; install with --demo.');

    const link = banner.locator('a.banner__link');
    await expect(link).toHaveAttribute('href', 'https://example.com/');
    await expect(link).toHaveAttribute('rel', 'sponsored noopener');
    await expect(link.locator('img')).toHaveAttribute('alt', /.+/);
    await link.scrollIntoViewIfNeeded();
    await expect(link.locator('img')).toBeVisible();

    // Beside the article on wide screens, below it on small ones.
    const article = await page.locator('article.article').boundingBox();
    const box = await banner.boundingBox();
    if (isMobile) {
      expect(box.y).toBeGreaterThan(article.y + article.height - 1);
    }
    else {
      expect(box.x).toBeGreaterThan(article.x + article.width);
    }
  });
});
