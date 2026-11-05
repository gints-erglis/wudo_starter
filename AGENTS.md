# AGENTS.md

Guidance for AI coding agents working in this repository. rig adds its own
rules for the container, the stack and the central policy; this file says
what is specific to this project. People will find it useful too.

## Project

A Drupal 11 starter for small sites: install from configuration in Git, a
custom theme built from components, and optional features (languages,
projects, search, AI tools, cookie consent) added with one command each.
[README.md](README.md) describes all of it; read it before larger changes.

| Path | What |
|---|---|
| `web/` | Drupal document root |
| `web/themes/custom/wudo/` | the theme and its component source |
| `web/modules/custom/wudo_theme_extension/` | custom behavior and API endpoints |
| `recipes/` | content recipes and the optional features |
| `config/sync/` | exported configuration, the single source of truth |
| `tests/e2e/` | Playwright browser tests |
| `.ddev/commands/` | `ddev site-install`, `ddev new-site`, `ddev add-*` and the rest |
| `deploy/`, `docs/` | production setup and its documentation |

## Conventions

- Configuration changes go through `config/sync/`: change the site, then
  `drush config:export`, and commit the exported YAML with the code.
- Contributed extensions come from Composer; never edit `web/core`,
  `web/modules/contrib`, `web/themes/contrib` or `vendor/`.
- Modern web standards first: semantic HTML, CSS without frameworks,
  accessibility to WCAG 2.2 AA, no third-party requests before consent.
- Never put credentials in tracked files. Secrets live in `.ddev/.env` and
  `settings.local.php`, which agents can't read.
- Keep the README in step with behavior it describes.
- Don't commit or push; a person reviews and commits.

## Testing

CI (`.github/workflows/ci.yml`) runs these on every pull request, after a
full `ddev site-install --demo`. Run the ones your change touches:

```sh
vendor/bin/phpcs                  # Drupal coding standards (phpcbf fixes)
vendor/bin/phpstan                # static analysis
vendor/bin/phpunit                # tests, on a throwaway SQLite database
npm run lint:css                  # in web/themes/custom/wudo
```

The Playwright tests in `tests/e2e` need the installed site and run in the
web container (`ddev e2e`); a person runs them on the host.
