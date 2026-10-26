<?php

declare(strict_types=1);

namespace Drupal\wudo_theme_extension\Hook;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityTypeInterface;
use Drupal\Core\Extension\ThemeSettingsProvider;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Render\BubbleableMetadata;
use Drupal\Core\StringTranslation\PluralTranslatableMarkup;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\path_alias\AliasManagerInterface;
use Drupal\wudo_theme_extension\TableOfContents;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Hook implementations for the Wudo Theme Extension module.
 */
class WudoThemeExtensionHooks {

  public function __construct(
    private readonly ConfigFactoryInterface $configFactory,
    private readonly AliasManagerInterface $aliasManager,
    private readonly ThemeSettingsProvider $themeSettings,
    private readonly RequestStack $requestStack,
  ) {}

  /**
   * Implements hook_token_info().
   */
  #[Hook('token_info')]
  public function tokenInfo(): array {
    return [
      'tokens' => [
        'site' => [
          'logo-url' => [
            'name' => new TranslatableMarkup('Logo URL'),
            'description' => new TranslatableMarkup("The absolute URL of the active theme's logo."),
          ],
        ],
      ],
    ];
  }

  /**
   * Implements hook_tokens().
   *
   * Gives the structured data (schema.org) of the site a logo that follows
   * the logo of each site, see the theme's site/ folder.
   */
  #[Hook('tokens')]
  public function tokens(string $type, array $tokens, array $data, array $options, BubbleableMetadata $bubbleable_metadata): array {
    $replacements = [];
    if ($type !== 'site' || !isset($tokens['logo-url'])) {
      return $replacements;
    }
    $url = (string) $this->themeSettings->getSetting('logo.url');
    if ($url !== '' && !preg_match('#^[a-z][a-z0-9+.-]*://#i', $url)) {
      $url = $this->requestStack->getCurrentRequest()->getSchemeAndHttpHost() . $url;
    }
    $bubbleable_metadata->addCacheContexts(['url.site', 'theme']);
    $replacements[$tokens['logo-url']] = $url;
    return $replacements;
  }

  /**
   * Implements hook_field_widget_complete_WIDGET_TYPE_form_alter().
   *
   * Adds the collapsible "Styles" panel to forms that edit paragraphs.
   */
  #[Hook('field_widget_complete_paragraphs_form_alter')]
  public function paragraphsWidgetAlter(array &$field_widget_complete_form, FormStateInterface $form_state, array $context): void {
    $field_widget_complete_form['#attached']['library'][] = 'wudo_theme_extension/paragraph_behavior';
  }

  /**
   * Implements hook_entity_bundle_field_info_alter().
   *
   * The coordinates of a map paragraph are a latitude and a longitude, as
   * Google Maps and OpenStreetMap copy them: "56.9496, 24.1052".
   */
  #[Hook('entity_bundle_field_info_alter')]
  public function entityBundleFieldInfoAlter(array &$fields, EntityTypeInterface $entity_type, string $bundle): void {
    if ($entity_type->id() !== 'paragraph' || !isset($fields['field_coordinates'])) {
      return;
    }
    $fields['field_coordinates']->addPropertyConstraints('value', [
      'Regex' => [
        'pattern' => '/^\s*-?(90(\.0+)?|[1-8]?\d(\.\d+)?)\s*,\s*-?(180(\.0+)?|(1[0-7]\d|[1-9]?\d)(\.\d+)?)\s*$/',
        // Translated by the validator.
        'message' => 'Enter the latitude and the longitude separated by a comma, such as 56.9496, 24.1052.',
      ],
    ]);
  }

  /**
   * Implements hook_preprocess_HOOK() for field templates.
   *
   * Gives the headings of a node's body an id for the table of contents.
   */
  #[Hook('preprocess_field')]
  public function preprocessField(array &$variables): void {
    if ($variables['entity_type'] !== 'node' || $variables['field_name'] !== TableOfContents::FIELD) {
      return;
    }
    foreach ($variables['items'] as &$item) {
      $item['content']['#post_render'][] = [TableOfContents::class, 'addIds'];
    }
  }

  /**
   * Implements hook_preprocess_HOOK() for node templates.
   *
   * Gives full pages the headings of their body ("toc", for small screens;
   * the "Table of contents" block shows them in a sidebar) and the minutes it
   * takes to read the body ("reading_time").
   */
  #[Hook('preprocess_node')]
  public function preprocessNode(array &$variables): void {
    $node = $variables['node'];
    if ($variables['view_mode'] !== 'full' || !$node->hasField(TableOfContents::FIELD)) {
      return;
    }
    $items = TableOfContents::forNode($node);
    if (count($items) >= TableOfContents::MINIMUM) {
      $variables['toc'] = $items;
    }
    $text = strip_tags((string) $node->get(TableOfContents::FIELD)->value);
    $words = count(preg_split('/\s+/u', trim($text), -1, PREG_SPLIT_NO_EMPTY));
    if ($words > 0) {
      // About 200 words a minute.
      $variables['reading_time'] = new PluralTranslatableMarkup((int) ceil($words / 200), '1 min read', '@count min read');
    }
  }

  /**
   * Implements hook_xmlsitemap_link_alter().
   *
   * Keeps the error pages out of the sitemap, as well as the front page node,
   * which the sitemap already lists as the site root.
   */
  #[Hook('xmlsitemap_link_alter')]
  public function xmlsitemapLinkAlter(array &$link, array $context): void {
    $pages = $this->configFactory->get('system.site')->get('page');
    foreach (array_filter($pages) as $path) {
      if ($this->aliasManager->getPathByAlias($path) === $link['loc']) {
        $link['access'] = FALSE;
      }
    }
  }

  /**
   * Implements hook_search_api_index_items_alter().
   *
   * Keeps the error pages out of the search results.
   */
  #[Hook('search_api_index_items_alter')]
  public function searchApiIndexItemsAlter(object $index, array &$items): void {
    $pages = $this->configFactory->get('system.site')->get('page');
    $paths = [];
    foreach (['403', '404'] as $code) {
      if (!empty($pages[$code])) {
        $paths[] = $this->aliasManager->getPathByAlias($pages[$code]);
      }
    }
    foreach ($items as $id => $item) {
      $entity = $item->getOriginalObject()?->getValue();
      if ($entity instanceof EntityInterface && in_array('/' . $entity->toUrl()->getInternalPath(), $paths, TRUE)) {
        unset($items[$id]);
      }
    }
  }

  /**
   * Implements hook_js_settings_alter().
   *
   * Klaro! turns the code of a consent service into a function with
   * "new Function()", even when a service has no code. The Content Security
   * Policy does not allow evaluating strings, so the empty ones are removed
   * and the consent dialog works without 'unsafe-eval'.
   */
  #[Hook('js_settings_alter')]
  public function jsSettingsAlter(array &$settings): void {
    if (!isset($settings['klaro']['config']['services'])) {
      return;
    }
    foreach ($settings['klaro']['config']['services'] as &$service) {
      foreach (['onInit', 'onAccept', 'onDecline'] as $callback) {
        if (isset($service[$callback]) && trim((string) $service[$callback]) === '') {
          unset($service[$callback]);
        }
      }
    }
  }

}
