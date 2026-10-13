<?php

declare(strict_types=1);

namespace Drupal\wudo_theme_extension\Hook;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\path_alias\AliasManagerInterface;

/**
 * Hook implementations for the Wudo Theme Extension module.
 */
class WudoThemeExtensionHooks {

  public function __construct(
    private readonly ConfigFactoryInterface $configFactory,
    private readonly AliasManagerInterface $aliasManager,
  ) {}

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
