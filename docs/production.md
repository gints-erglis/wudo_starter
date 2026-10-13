# Production on your own server

How to run the site on an Ubuntu server with Docker, in DDEV, behind the
nginx that is already installed on the host. The same steps bring the site up
on a second server, which is what makes moving it quick.

```
visitor ──HTTPS──▶ host nginx (certificates, domains)
                      │ http://127.0.0.1:8081
                      ▼
                 DDEV web container ──▶ DDEV database container
```

- The **host nginx** owns ports 80 and 443 and the Let's Encrypt
  certificates. Each site is one small `server` block.
- **DDEV** runs the site exactly as it runs locally, without its own router.
  The web container listens on a port of `127.0.0.1` only.
- The site's **state** is three things: the Git repository, the database and
  the uploaded files. Everything below follows from that.

DDEV calls this "casual hosting": fine for a small or medium site on one
server. It has no zero-downtime deploys and does not scale beyond that server.

What was tried and what was not: the DDEV overrides, the production settings
behind a proxy, mail over SMTP and the `backup`, `restore` and `deploy`
commands were run on a local copy. The server steps themselves (packages,
nginx, certbot, systemd, cron) are written from documentation and were not
run on a server.

## 1. Server, once

Install Docker and DDEV from their official instructions, as a user that is
in the `docker` group and is not root. Then:

```bash
ddev config global \
  --omit-containers=ddev-router,ddev-ssh-agent \
  --use-hardened-images \
  --performance-mode=none \
  --instrumentation-opt-in=false
```

- `ddev-router` is left out because the host nginx does its job. This also
  means DDEV never touches ports 80 and 443.
- Hardened images remove `sudo` from the containers.

Make the sites start after a reboot (edit the user name in the file first):

```bash
sudo cp deploy/ddev-sites.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable ddev-sites
```

## 2. Site

```bash
git clone <repository> /srv/sites/example && cd /srv/sites/example

cp deploy/config.production.yaml .ddev/config.local.yaml   # set the port
cp deploy/env.example .ddev/.env                           # fill in
chmod 600 .ddev/.env
cp deploy/settings.production.php web/sites/default/settings.local.php

ddev start
ddev site-install        # a new site; to move an existing one, see section 5
```

None of the three copied files is tracked in Git; they are this server's
configuration.

| File | What to set |
| --- | --- |
| `.ddev/config.local.yaml` | `host_webserver_port`, different for every DDEV project on the server |
| `.ddev/.env` | `SITE_HOSTS`, `DRUPAL_HASH_SALT`, SMTP account, optional backup target |
| `web/sites/default/settings.local.php` | nothing; it reads `.ddev/.env` |

After changing `.ddev/.env` or `.ddev/config.local.yaml`, run `ddev restart`.

What the production settings change compared with development: the site
answers only to the names in `SITE_HOSTS`, errors are logged instead of shown,
the visitor's address and HTTPS are taken from nginx, mail goes out through
SMTP instead of DDEV's Mailpit, and cron is left to the crontab.

### Mail through Google

Use an [app password](https://myaccount.google.com/apppasswords) as
`SMTP_PASSWORD`, not the account password, and set `SITE_MAIL` to the address
of that account: Google rewrites or rejects other senders. Check with a
password reset mail from `/user/password`.

## 3. Domain and certificate

Point the domain's DNS to the server, then:

```bash
sudo cp deploy/nginx-site.conf /etc/nginx/sites-available/example.com
sudo nano /etc/nginx/sites-available/example.com      # domain and port
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d example.com -d www.example.com
```

certbot adds the certificate and the redirect to HTTPS, and renews it on its
own. Adding another domain to the site later is the same three things: the
name in `server_name`, in `SITE_HOSTS`, and in the certbot command.

## 4. Routine

```bash
crontab -e      # paste deploy/crontab, with the project's path
```

That runs Drupal's cron every 15 minutes and a backup every night.

| Command | What it does |
| --- | --- |
| `ddev deploy` | backup, `git pull`, Composer without dev packages, theme build, database updates, configuration import, then checks that the front page answers |
| `ddev backup` | database and uploaded files into `backups/<timestamp>`, keeps the newest `BACKUP_KEEP`, copies them to `BACKUP_REMOTE` if set |
| `ddev restore backups/<timestamp>` | replaces the database and uploaded files with that backup |

`ddev deploy` takes the site down for the few seconds of the database update
at most. If an update goes wrong, `git checkout` the previous commit and
`ddev restore` the backup that the deploy made first.

Configuration changed on the live site (a view, a block) lives in its
database only. Export it there with `ddev drush config:export`, commit and
push from the server, or it is overwritten by the next `ddev deploy`.

### Deploying from GitHub

`.github/workflows/deploy.yml` runs `ddev deploy` on the server whenever CI
has passed on `main`, so a push is all it takes. It can also be started by
hand: Actions → Deploy → Run workflow. It does nothing until the repository
has the variable `DEPLOY_TARGET`.

GitHub gets an SSH key that can do one thing only. On the server, as the user
that owns the project:

```bash
ssh-keygen -t ed25519 -N '' -C github-deploy -f ~/github-deploy
echo "command=\"cd /var/www/<project> && ddev deploy\",restrict $(cat ~/github-deploy.pub)" >> ~/.ssh/authorized_keys
cat ~/github-deploy       # the private key, for the secret below
rm ~/github-deploy ~/github-deploy.pub
```

`command=` makes the server run the deploy whatever the caller asks for, and
`restrict` turns off everything else (shell, port forwarding). A leaked key
can start a deploy of what is already on `main`, nothing more.

On your own machine, which already trusts the server:

```bash
ssh-keyscan <server>      # for the second secret
```

In the repository on GitHub, Settings → Secrets and variables → Actions:

| Kind | Name | Value |
| --- | --- | --- |
| Variable | `DEPLOY_TARGET` | `<user>@<server>` |
| Variable | `DEPLOY_PORT` | only if SSH is not on port 22 |
| Secret | `DEPLOY_SSH_KEY` | the private key printed above, all lines |
| Secret | `DEPLOY_KNOWN_HOSTS` | the output of `ssh-keyscan` |

Two things on the server have to hold:

- `git pull` works there without your own SSH agent. Check with
  `ssh -T git@github.com` in a session opened without agent forwarding; if it
  is refused, give the server a read-only deploy key in the repository's
  settings.
- SSH is reachable from GitHub's runners. If the firewall lets in known
  addresses only, this workflow cannot connect.

The deploy fails, and GitHub sends its usual mail about it, when any step of
`ddev deploy` fails or the front page does not answer afterwards. The backup
made at the start is the way back.

## 5. Moving to another server

The second server needs steps 1 to 3 and the latest backup. Kept ready in
advance, the move takes about a quarter of an hour, most of it waiting for
DNS.

**In advance, on the backup server**

1. Do step 1 and step 2 up to `ddev start`. Copy `.ddev/.env` from the first
   server instead of filling it in again, so the hash salt stays the same and
   visitors stay logged in.
2. On the first server, set `BACKUP_REMOTE` in `.ddev/.env` to this server,
   e.g. `deploy@backup.example.com:/srv/sites/example/backups/`, with an SSH
   key that needs no passphrase. The nightly backup now lands here.
3. Lower the TTL of the domain's DNS records to 300 seconds, so that a change
   reaches visitors in minutes.

**When moving**

1. Planned move only: on the old server run `ddev backup` once more, so
   nothing since the night is lost. After a failure, skip this; what was
   written since the last backup is lost.
2. On the new server:

   ```bash
   cd /srv/sites/example
   git pull --ff-only
   ddev start
   ddev composer install --no-dev --optimize-autoloader
   ddev exec -d /var/www/html/web/themes/custom/wudo "npm ci && npm run build"
   ddev restore "$(ls -1d backups/*/ | tail -n 1)"
   ddev drush deploy
   ```

3. Check the site before DNS changes, by asking nginx for it directly:

   ```bash
   curl -sI -H 'Host: example.com' -H 'X-Forwarded-Proto: https' http://127.0.0.1:8081/
   ```

4. Do step 3 (nginx block), change the DNS records to the new server, and run
   certbot once the name resolves to it. Until the certificate exists the
   site answers on HTTP only; to avoid that gap, copy `/etc/letsencrypt` from
   the old server together with the nginx block.
5. On the new server, install the crontab, and remove `BACKUP_REMOTE` or
   point it at the next backup server.

**Rehearse it.** A backup that has never been restored is a hope, not a
backup. Run "when moving" steps 2 and 3 on the backup server once, without
touching DNS, and repeat after larger changes.

## What is not covered

- **The host's own services.** The nginx blocks of other sites and the host's
  MariaDB are outside this project and need their own backup.
- **Monitoring.** Nothing tells you the site is down or a backup failed; add
  an uptime check and read `backups/backup.log`.
- **Offsite copies.** `BACKUP_REMOTE` is one other server. A copy with a
  different provider protects against losing the account.
