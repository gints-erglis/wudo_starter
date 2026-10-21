# Color schemes

Every color in the theme comes in a pair, one for light and one for dark, and
the nearest `color-scheme` picks one. The page is light, or dark with the
theme toggler (`data-theme="dark"` on `<html>`). Any part of a page can be the
other, and everything in it follows: text, links, menus, buttons, icons and a
one-color logo, at any depth and in both directions.

A component never knows whether it is light or dark. It uses tokens, and the
element around it decides.

## Making a part of a page light or dark

| Where | How |
| --- | --- |
| Markup | `class="scheme-dark"` or `class="scheme-light"`; add `scheme-surface` for the scheme's background |
| A site's styles (`site/site.scss`) | `@include scheme(dark);` (see below) |
| A component that is always dark or light | `@include scheme(dark);` in its `.scss` |
| Content | "Color scheme" under a section's styles |

```scss
// site/site.scss
@use "../components/00-base/00-defaults/03-mixins" as *;

.site-header {
  @include scheme(dark);

  --header-bg: #07140f;
}
```

The mixin sets `color-scheme`, the text color and the logo filter together.
Setting `color-scheme` alone is not enough: the text color is inherited as a
finished color and a one-color logo would stay dark.

## Writing a component

### Use the scheme tokens

```scss
.my-card {
  // The component's own tokens, so a site can change one component.
  --my-card-bg: var(--color-surface-raised);
  --my-card-text: var(--color-text);
  --my-card-border: var(--color-border);

  background: var(--my-card-bg);
  color: var(--my-card-text);
  border: 1px solid var(--my-card-border);
}
```

| Token | For |
| --- | --- |
| `--color-surface` | the background of a page or section |
| `--color-surface-muted` | a slightly different background: header, bars, secondary buttons |
| `--color-surface-raised` | something on top: cards, dropdowns, slots |
| `--color-text` | text |
| `--color-text-muted` | secondary text: dates, labels, inactive links |
| `--color-border` | borders and dividers |

They are defined in `components/00-base/00-defaults/_01-variables.scss`.

### Other colors: `light-dark()`

```scss
--badge-bg: light-dark(#e8fcf1, #0f3d24);
box-shadow: 0 4px 12px light-dark(rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.4));
border: 1px solid light-dark(transparent, #616161);
```

`light-dark()` takes colors only. For anything else (a filter, an image) use
a custom property that the scheme sets, as `--logo-filter` does.

### Rules

- **No `[data-theme="dark"] & { … }`.** It looks at `<html>`, so the
  component would ignore the part of the page it is in.
- **No fixed neutral colors** (`white`, `#fff`, `#222`) for backgrounds or
  text. A pair that is the same in both schemes is fine when it sets both
  the background and the text (a badge, a warning).
- **A background comes with a text color.** Otherwise the browser's own
  colors (`ButtonText` on buttons, `LinkText` on links) follow the scheme and
  can end up light on light.
- **Icons use `fill: currentcolor`** (or `stroke`), so they follow the text.
- **Contrast is at least 4.5:1** in both schemes; the tests check it.

## Checking a component

- **Storybook** (`ddev storybook`): the "Scheme" menu in the toolbar shows a
  story on a light page, a dark page, and as a dark or light part of the
  other. A component should read well in all four, hover and focus included.
- **On a page**: put the component in a section with "Color scheme: Dark".
- **Tests**: `tests/e2e/specs/components.spec.js` renders every story in all
  four schemes and checks the color contrast with axe;
  `tests/e2e/specs/schemes.spec.js` does the same for the header, parts of
  pages and the footer.

## Moving an old component over

1. Find its fixed colors and `[data-theme="dark"]` rules.
2. Replace each color with a scheme token, or with
   `light-dark(<the light value>, <the dark value>)` from the two old rules.
3. Delete the `[data-theme="dark"]` block.
4. Where it sets a background, set `color` too.
5. Check it in the four Storybook schemes.

```bash
grep -rln 'data-theme' web/themes/custom/wudo/components
```
