import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// What a content editor can and cannot do. Needs Drush, so it runs where the
// site does (ddev e2e).
const drushPath = new URL('../../../vendor/bin/drush', import.meta.url).pathname;
const drush = (...args) => execFileSync(drushPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const name = 'e2e_editor';
const title = 'Written by the e2e editor';

test.describe('content editor', () => {
  test.skip(({ isMobile }) => isMobile, 'The admin UI is checked once.');
  test.skip(!existsSync(drushPath), 'Drush is not available.');

  // The hooks run in every project, also where the tests are skipped; two
  // projects creating the same account at once would collide.
  test.beforeAll(({}, testInfo) => {
    if (testInfo.project.use.isMobile) {
      return;
    }
    try {
      execFileSync(drushPath, ['user:cancel', '--delete-content', name, '--yes'], { stdio: 'ignore' });
    }
    catch {
      // No leftover account from an interrupted run.
    }
    drush('user:create', name, '--password=' + crypto.randomUUID());
    drush('user:role:add', 'content_editor', name);
  });

  test.afterAll(({}, testInfo) => {
    if (testInfo.project.use.isMobile) {
      return;
    }
    drush('user:cancel', '--delete-content', name, '--yes');
  });

  test('writes an article and reaches the editorial pages only', async ({ page, baseURL }) => {
    await page.goto(drush('user:login', '--name=' + name, '--no-browser', '--uri=' + baseURL));

    // Writes and publishes an article with formatted text.
    await page.goto('/node/add/article');
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.locator('.ck-editor__editable').first().click();
    await page.keyboard.type('A paragraph typed in the editor.');
    await page.locator('#gin-sticky-edit-submit, #edit-submit').first().click();
    await expect(page.locator('h1')).toHaveText(title);
    await expect(page.getByText('A paragraph typed in the editor.')).toBeVisible();
    // Pathauto gave it an address.
    await expect(page).toHaveURL(/\/article\/written-e2e-editor$/);

    // Pages of the job are open...
    for (const path of ['/admin/content', '/admin/content/media', '/media/add/image', '/block/add/banner', '/node/add/landingpage', '/node/add/gallery', '/admin/structure/menu/manage/main', '/admin/structure/taxonomy/manage/tags/add', '/admin/config/search/redirect']) {
      expect((await page.request.get(path)).status(), path).toBe(200);
    }
    // ...and site building is not.
    for (const path of ['/admin/people', '/admin/modules', '/admin/structure/types', '/admin/structure/views', '/admin/config/system/site-information', '/admin/appearance']) {
      expect((await page.request.get(path)).status(), path).toBe(403);
    }
  });
});
