import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// The AI helpers are optional: ddev add-ai. Only the editor's side is
// checked; the answers need an API key and cost money.
const drushPath = new URL('../../../vendor/bin/drush', import.meta.url).pathname;
const drush = (...args) => execFileSync(drushPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const image = new URL('../../../recipes/demo/content/file/japan-2.jpeg', import.meta.url).pathname;
const name = 'e2e_ai_editor';

test.describe('AI helpers', () => {
  // One worker, so the account is created once.
  test.describe.configure({ mode: 'serial' });
  test.skip(({ isMobile }) => isMobile, 'The admin UI is checked once.');
  test.skip(!existsSync(drushPath), 'Drush is not available.');
  test.skip(existsSync(drushPath) && !drush('pm:list', '--status=enabled', '--field=name').split('\n').includes('ai_ckeditor'), 'AI is not installed.');

  test.beforeAll(() => {
    try {
      execFileSync(drushPath, ['user:cancel', '--delete-content', name, '--yes'], { stdio: 'ignore' });
    }
    catch {
      // No leftover account from an interrupted run.
    }
    drush('user:create', name, '--password=' + crypto.randomUUID());
    drush('user:role:add', 'content_editor', name);
  });

  test.afterAll(() => {
    drush('user:cancel', '--delete-content', name, '--yes');
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(drush('user:login', '--name=' + name, '--no-browser', '--uri=' + baseURL));
  });

  test('the text editor has the AI assistant', async ({ page }) => {
    await page.goto('/node/add/article');
    const assistant = page.locator('.ck-toolbar .ai-dropdown').first();
    await expect(assistant).toBeVisible();
    await assistant.click();
    await expect(page.locator('.ck-dropdown__panel-visible .ck-list__item')).toHaveCount(5);
  });

  test('the description of a page can be written by AI', async ({ page }) => {
    await page.goto('/node/add/article');
    const description = page.locator('.field--name-field-description');
    await expect(description.getByRole('button', { name: 'Generate' })).toBeVisible();
  });

  test('an uploaded image can get its alt text from AI', async ({ page }) => {
    await page.goto('/media/add/image');
    await page.locator('input[type="file"]').setInputFiles(image);
    const alt = page.getByLabel('Alternative text');
    await expect(alt).toBeVisible();
    await expect(page.getByRole('button', { name: /generate/i })).toBeVisible();
  });
});
