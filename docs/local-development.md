# Working locally on a live site

How to get a copy of a site that already runs on a server (see
`production.md`) onto your own machine, and how changes travel back. For a
new, empty site use `ddev site-install` instead; see the README.

Two rules keep the copies from drifting apart:

- **Content** (pages, media, users) is made on the live site and copied
  down. A local database is disposable.
- **Code and configuration** (theme, modules, content types, views, blocks)
  are made locally, committed, and go up with `ddev deploy`.

## 1. Code

```bash
git clone <repository> && cd <project>
ddev start
ddev composer install
ddev exec -d /var/www/html/web/themes/custom/wudo "npm ci && npm run build"
```

Do not create `.ddev/config.local.yaml`, `.ddev/.env` or
`web/sites/default/settings.local.php` here; those are the server's. Without
them DDEV serves the site at `https://<project>.ddev.site`, shows errors on
the page and catches outgoing mail in Mailpit (`ddev mailpit`).

## 2. Content from the server

On the server:

```bash
cd /var/www/<project> && ddev backup
```

On your machine, with the timestamp that command printed:

```bash
rsync -a <user>@<server>:/var/www/<project>/backups/<timestamp> backups/
ddev restore backups/<timestamp>
ddev drush deploy          # applies what your code has and the backup has not
ddev drush sql:sanitize    # replaces the users' addresses and passwords
ddev drush user:login
```

Repeat this step whenever you want fresh content. It replaces the local
database and uploaded files entirely.

`ddev restore` says so when the backup was made at a different commit than
the code you have. That is fine when your code is newer; `ddev drush deploy`
brings the database up to it.

## 3. Sending changes up

```bash
ddev drush config:export   # after changing anything in the admin interface
git status                 # the change shows up in config/sync
ddev e2e
git commit && git push
```

Then on the server:

```bash
ddev deploy
```

Before exporting, make sure the local database is a recent copy of the live
one (step 2). `config:export` writes the whole configuration, so an old copy
would also write back whatever was changed on the live site since.

A setting that is changed on the live site directly (a block moved by an
editor with enough permissions, say) has to be exported and committed from
the server, or the next `ddev deploy` puts the committed version back.

## What differs from the live site

| | Local | Server |
| --- | --- | --- |
| Address | `https://<project>.ddev.site` through DDEV's router | host nginx to `127.0.0.1:<port>` |
| Errors | shown on the page | logged only |
| Mail | caught in Mailpit | sent through SMTP |
| Cron | on page views | server's crontab |
| Composer | with dev packages (PHPCS, PHPStan, PHPUnit) | `--no-dev` |
| Allowed host names | any | `SITE_HOSTS` |

Everything in the right column comes from the three files copied from
`deploy/` on the server, so nothing has to be switched off locally.
