/**
 * @file
 * Creates site/ from site.example/ when it is missing.
 *
 * site/ holds one site's own look and is not tracked by the starter, so a
 * fresh checkout has none. An existing site/ is never touched.
 */

import { cpSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const theme = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(theme, 'site');

if (!existsSync(site)) {
  cpSync(resolve(theme, 'site.example'), site, { recursive: true });
  console.log('Created site/ from site.example/.');
}
