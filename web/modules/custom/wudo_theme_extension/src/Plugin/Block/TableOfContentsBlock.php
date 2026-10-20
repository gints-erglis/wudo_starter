<?php

declare(strict_types=1);

namespace Drupal\wudo_theme_extension\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Cache\Cache;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\node\NodeInterface;
use Drupal\wudo_theme_extension\TableOfContents;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Links to the headings of the page's body.
 *
 * Shows nothing on a page with fewer than two h2 or h3 headings, so the
 * region it is placed in stays empty there.
 *
 * @Block(
 *   id = "wudo_table_of_contents",
 *   admin_label = @Translation("Table of contents"),
 *   category = @Translation("Wudo")
 * )
 */
final class TableOfContentsBlock extends BlockBase implements ContainerFactoryPluginInterface {

  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    protected readonly RouteMatchInterface $routeMatch,
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): static {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('current_route_match'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build(): array {
    $node = $this->routeMatch->getParameter('node');
    if (!$node instanceof NodeInterface) {
      return [];
    }
    $build = ['#cache' => ['tags' => $node->getCacheTags()]];
    $items = TableOfContents::forNode($node);
    if (count($items) >= TableOfContents::MINIMUM) {
      $build['toc'] = [
        '#type' => 'component',
        '#component' => 'wudo:toc',
        '#props' => [
          'items' => $items,
          'title' => (string) $this->t('Contents'),
        ],
      ];
    }
    return $build;
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheContexts(): array {
    return Cache::mergeContexts(parent::getCacheContexts(), ['route']);
  }

}
