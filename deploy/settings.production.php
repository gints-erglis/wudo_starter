<?php

/**
 * @file
 * Settings of a production site that runs in DDEV behind the host's nginx.
 *
 * Copy to web/sites/default/settings.local.php on the server. It is included
 * after settings.ddev.php and takes back what that file relaxes for
 * development. The values come from .ddev/.env; see deploy/env.example.
 */

// Only answer to the site's own names; DDEV's settings accept any.
$hosts = array_filter(array_map('trim', explode(',', (string) getenv('SITE_HOSTS'))));
if (!$hosts) {
  throw new \RuntimeException('SITE_HOSTS is not set. See deploy/env.example.');
}
$settings['trusted_host_patterns'] = array_map(
  static fn (string $host): string => '^' . preg_quote($host, '/') . '$',
  $hosts,
);

if ($salt = getenv('DRUPAL_HASH_SALT')) {
  $settings['hash_salt'] = $salt;
}

// The site's port is bound to 127.0.0.1, so whatever connects is the host's
// nginx. Trusting it makes Drupal see the visitor's address and HTTPS.
$settings['reverse_proxy'] = TRUE;
$settings['reverse_proxy_addresses'] = [$_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'];

// Errors go to the log, not to visitors.
$config['system.logging']['error_level'] = 'hide';

$config['system.performance']['css']['preprocess'] = TRUE;
$config['system.performance']['js']['preprocess'] = TRUE;

// Cron is run by the server's crontab (deploy/crontab), not by page views.
$config['automated_cron.settings']['interval'] = 0;

// Mail goes out through SMTP; DDEV would otherwise catch it in Mailpit.
if ($smtp_host = getenv('SMTP_HOST')) {
  $config['system.mail']['interface']['default'] = 'symfony_mailer';
  $config['system.mail']['mailer_dsn'] = [
    'scheme' => 'smtp',
    'host' => $smtp_host,
    'port' => (int) (getenv('SMTP_PORT') ?: 587),
    'user' => getenv('SMTP_USER') ?: NULL,
    'password' => getenv('SMTP_PASSWORD') ?: NULL,
    'options' => [],
  ];
}
if ($site_mail = getenv('SITE_MAIL')) {
  $config['system.site']['mail'] = $site_mail;
}
