/**
 * @file
 * Storybook as a catalog of the theme's Single Directory Components.
 *
 * Stories are generated from each *.component.yml and rendered with the
 * component's own Twig template, so nothing is described twice.
 */

import { join } from 'node:path';
import { cwd } from 'node:process';

const config = {
  stories: ['../components/**/*.component.yml'],
  addons: [
    {
      name: 'storybook-addon-sdc',
      options: {
        sdcStorybookOptions: {
          namespace: 'wudo',
          twigLib: 'twing',
          // Drupal maps @wudo to templates/, so the icon component reads its
          // SVG files from "@wudo/../assets". Give Storybook the same path.
          namespaces: {
            'wudo/../assets': join(cwd(), 'assets'),
          },
        },
      },
    },
    '@storybook/addon-docs',
  ],
  // Example assets referenced by the stories.
  staticDirs: [{ from: '../site/logo.svg', to: '/logo.svg' }],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
};

export default config;
