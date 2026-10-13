<?php

namespace Drupal\wudo_theme_extension\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Url;

/**
 * Provides the search button and the drawer it opens.
 *
 * Placed by the optional search recipe (recipes/search).
 *
 * @Block(
 *   id = "wudo_search",
 *   admin_label = @Translation("Search button and drawer"),
 *   category = @Translation("Wudo")
 * )
 */
class SearchBlock extends BlockBase {

  /**
   * {@inheritdoc}
   */
  public function defaultConfiguration(): array {
    return [
      'drawer_id' => 'search-drawer',
      'display_mode' => 'both',
    ] + parent::defaultConfiguration();
  }

  /**
   * {@inheritdoc}
   */
  public function blockForm($form, FormStateInterface $form_state): array {
    $form['drawer_id'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Drawer ID'),
      '#description' => $this->t('The button and the drawer must have the same ID.'),
      '#default_value' => $this->configuration['drawer_id'],
      '#required' => TRUE,
    ];
    $form['display_mode'] = [
      '#type' => 'select',
      '#title' => $this->t('Display'),
      '#options' => [
        'button' => $this->t('Button only'),
        'drawer' => $this->t('Drawer only'),
        'both' => $this->t('Button and drawer'),
      ],
      '#default_value' => $this->configuration['display_mode'],
      '#required' => TRUE,
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function blockSubmit($form, FormStateInterface $form_state): void {
    $this->configuration['drawer_id'] = $form_state->getValue('drawer_id');
    $this->configuration['display_mode'] = $form_state->getValue('display_mode');
  }

  /**
   * {@inheritdoc}
   */
  public function build(): array {
    $drawer_id = $this->configuration['drawer_id'];
    $display_mode = $this->configuration['display_mode'] ?? 'both';
    $search_url = Url::fromUserInput('/search')->toString();
    $build = [];

    if ($display_mode === 'button' || $display_mode === 'both') {
      $build['button'] = [
        '#type' => 'component',
        '#component' => 'wudo:search-button',
        '#props' => [
          'drawer_id' => $drawer_id,
          'search_url' => $search_url,
        ],
      ];
    }

    if ($display_mode === 'drawer' || $display_mode === 'both') {
      $build['drawer'] = [
        '#type' => 'component',
        '#component' => 'wudo:search-drawer',
        '#props' => [
          'drawer_id' => $drawer_id,
          'search_url' => $search_url,
          'api_url' => Url::fromRoute('wudo_theme_extension.search_api')->toString(),
        ],
      ];
    }

    return $build;
  }

}
