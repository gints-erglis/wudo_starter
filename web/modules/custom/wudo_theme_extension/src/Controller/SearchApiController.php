<?php

declare(strict_types=1);

namespace Drupal\wudo_theme_extension\Controller;

use Drupal\Component\Utility\Xss;
use Drupal\Core\Cache\CacheableJsonResponse;
use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Url;
use Drupal\search_api\IndexInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Returns the first search results for the search drawer.
 *
 * Search is optional (recipes/search). Whatever backend the "content" index
 * uses, the answer has the same shape, so the drawer does not depend on it.
 */
final class SearchApiController extends ControllerBase {

  /**
   * The index that the search recipe creates.
   */
  const INDEX = 'content';

  /**
   * How many results the drawer shows; the rest are on the search page.
   */
  const LIMIT = 6;

  /**
   * The shortest search the database backend can answer.
   */
  const MIN_LENGTH = 2;

  /**
   * The longest search text that is passed on.
   */
  const MAX_LENGTH = 128;

  /**
   * Returns results for the "q" query argument.
   */
  public function search(Request $request): CacheableJsonResponse {
    $index = $this->moduleHandler()->moduleExists('search_api')
      ? $this->entityTypeManager()->getStorage('search_api_index')->load(self::INDEX)
      : NULL;
    if (!$index instanceof IndexInterface || !$index->status()) {
      throw new NotFoundHttpException();
    }

    $langcode = $this->languageManager()->getCurrentLanguage()->getId();
    $cacheability = (new CacheableMetadata())
      ->addCacheContexts(['url.query_args:q', 'languages:language_interface', 'user.permissions'])
      ->addCacheTags(['search_api_list:' . self::INDEX])
      ->addCacheableDependency($index);

    $keys = mb_substr(trim((string) $request->query->get('q')), 0, self::MAX_LENGTH);
    $data = [
      'total' => 0,
      'items' => [],
      'url' => Url::fromUserInput('/search', ['query' => ['keys' => $keys]])->toString(),
    ];
    if (mb_strlen($keys) < self::MIN_LENGTH) {
      return (new CacheableJsonResponse($data))->addCacheableDependency($cacheability);
    }

    $query = $index->query();
    $query->keys($keys);
    $query->setLanguages([$langcode]);
    $query->range(0, self::LIMIT);
    $query->setSearchId('wudo_search_drawer');
    $results = $query->execute();

    $data['total'] = (int) $results->getResultCount();
    foreach ($results->getResultItems() as $item) {
      $entity = $item->getOriginalObject()?->getValue();
      if (!$entity instanceof ContentEntityInterface) {
        continue;
      }
      $cacheability->addCacheableDependency($entity);
      $data['items'][] = [
        'title' => (string) $entity->label(),
        'url' => $entity->toUrl()->toString(),
        'type' => (string) ($entity->get($entity->getEntityType()->getKey('bundle'))->entity?->label() ?? ''),
        // The excerpt marks the matches with <strong>; nothing else is let
        // through, because the drawer inserts it as markup.
        'excerpt' => Xss::filter((string) $item->getExcerpt(), ['strong']),
      ];
    }

    return (new CacheableJsonResponse($data))->addCacheableDependency($cacheability);
  }

}
