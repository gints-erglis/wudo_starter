# Site layer

What makes one site look different from the starter it was built on.

The starter tracks `site.example/` only. `site/` is created from it by the
build when it is missing, and Git ignores it there, so nothing the starter
does later can change or conflict with it. A site made with `ddev new-site`
has `site/` tracked in its own repository; for a site started another way,
copy `site.example/` to `site/` and remove the `/site/` line from the theme's
`.gitignore`.

Edit the files in `site/`, never the ones in `site.example/`.

| File | For |
| --- | --- |
| `_tokens.scss` | colors, fonts, spacing and sizes: overrides of the tokens in `components/00-base/00-defaults/_01-variables.scss`, and new ones |
| `site.scss` | everything else: component custom properties and the site's own rules |
| `logo.svg` | the logo; replace the file |

Both `.scss` files are built into `dist/site.css` by `npm run build` (or
`npm run dev` while working), which the theme loads last on every page and in
the component catalog.

## How to change something

1. **A color, font or size used everywhere**: set the token in `_tokens.scss`.
2. **One component**: open its `.scss`, find the custom properties at the top
   (`--header-bg`, `--menu-item-color`, …) and set them in `site.scss` on the
   same selector:

   ```scss
   .site-header {
     --header-bg: var(--color-black);
   }
   ```

   Where the component has a rule for the dark color scheme
   (`[data-theme="dark"] &`), that rule is more specific and still applies;
   set the dark value too if it should differ.
3. **Anything a custom property does not cover**: write the rule in
   `site.scss`. With the same selector as the starter's rule it wins, because
   it comes later.

Another font: put the files in `assets/fonts/<name>/`, declare `@font-face`
in `site.scss` and set `--font-family-headings-default` and
`--font-family-body-default` in `_tokens.scss`.

## What does not belong here

Changing the markup or behavior of a component means editing the starter's
file, and that can conflict with a later version of the starter. If the
change is useful to every site, make it in the starter instead. If a site
needs many of them, a sub-theme with `base theme: wudo` is the next step, and
the contents of this directory move there as they are.
