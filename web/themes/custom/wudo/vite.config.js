/**
 * @file
 * Vite configuration.
 *
 * Implements bundling global assets.
 */

import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    cssCodeSplit: true,

    rollupOptions: {
      input: {
        style: path.resolve(__dirname, "components/style.scss"),
        print: path.resolve(__dirname, "components/print.scss"),
        // The site's own layer; see site/README.md.
        site: path.resolve(__dirname, "site/site.scss"),
      },
      output: {
        assetFileNames: (assetInfo) => {
          // All .css files goes to the root of dist
          if (assetInfo.name.endsWith('.css')) {
            return "[name][extname]";
          }
          // All the rest goes to assets folder
          return "assets/[name][extname]";
        },
      },
    },
  },
});
