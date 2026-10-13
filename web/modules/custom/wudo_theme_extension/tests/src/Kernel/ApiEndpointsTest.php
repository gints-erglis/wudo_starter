<?php

declare(strict_types=1);

namespace Drupal\Tests\wudo_theme_extension\Kernel;

use Drupal\Core\Cache\CacheableJsonResponse;
use Drupal\KernelTests\KernelTestBase;
use Drupal\node\Entity\Node;
use Drupal\node\Entity\NodeType;
use Drupal\node\NodeInterface;
use Drupal\user\Entity\Role;
use Drupal\user\RoleInterface;
use Drupal\views\Entity\View;
use PHPUnit\Framework\Attributes\Group;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tests the JSON endpoints of the Wudo Theme Extension module.
 */
#[Group('wudo_theme_extension')]
class ApiEndpointsTest extends KernelTestBase {

  /**
   * {@inheritdoc}
   */
  protected static $modules = [
    'system',
    'user',
    'field',
    'text',
    'filter',
    'file',
    'node',
    'path_alias',
    'views',
    'entity_reference_revisions',
    'paragraphs',
    'wudo_theme_extension',
  ];

  /**
   * Published nodes, in creation order.
   *
   * @var \Drupal\node\NodeInterface[]
   */
  protected array $nodes = [];

  /**
   * An unpublished node.
   */
  protected NodeInterface $unpublished;

  /**
   * {@inheritdoc}
   */
  protected function setUp(): void {
    parent::setUp();

    $this->installEntitySchema('user');
    $this->installEntitySchema('node');
    $this->installEntitySchema('path_alias');
    $this->installSchema('node', ['node_access']);
    $this->installConfig(['system', 'user', 'filter', 'node', 'wudo_theme_extension']);

    Role::load(RoleInterface::ANONYMOUS_ID)->grantPermission('access content')->save();
    NodeType::create(['type' => 'article', 'name' => 'Article'])->save();

    foreach (['Alpha', 'Bravo', 'Charlie'] as $title) {
      $node = Node::create(['type' => 'article', 'title' => $title, 'status' => 1]);
      $node->save();
      $this->nodes[] = $node;
    }
    $this->unpublished = Node::create(['type' => 'article', 'title' => 'Hidden', 'status' => 0]);
    $this->unpublished->save();

    View::create([
      'id' => 'test_cards',
      'label' => 'Test cards',
      'base_table' => 'node_field_data',
      'base_field' => 'nid',
      'display' => [
        'default' => [
          'id' => 'default',
          'display_plugin' => 'default',
          'display_title' => 'Default',
          'position' => 0,
          'display_options' => [
            'title' => 'Test cards',
            'access' => ['type' => 'perm', 'options' => ['perm' => 'access content']],
            'pager' => ['type' => 'full', 'options' => ['items_per_page' => 2]],
            'row' => ['type' => 'fields'],
            'fields' => [
              'title' => [
                'id' => 'title',
                'table' => 'node_field_data',
                'field' => 'title',
                'entity_type' => 'node',
                'entity_field' => 'title',
                'plugin_id' => 'field',
              ],
            ],
            'filters' => [
              'status' => [
                'id' => 'status',
                'table' => 'node_field_data',
                'field' => 'status',
                'entity_type' => 'node',
                'entity_field' => 'status',
                'plugin_id' => 'boolean',
                'value' => '1',
              ],
            ],
            'sorts' => [
              'nid' => [
                'id' => 'nid',
                'table' => 'node_field_data',
                'field' => 'nid',
                'entity_type' => 'node',
                'entity_field' => 'nid',
                'plugin_id' => 'standard',
                'order' => 'ASC',
              ],
            ],
          ],
        ],
      ],
    ])->save();

    $this->container->get('router.builder')->rebuild();
  }

  /**
   * Requests a path as the anonymous user.
   */
  protected function request(string $uri): Response {
    return $this->container->get('http_kernel')->handle(Request::create($uri));
  }

  /**
   * Decodes a JSON response body.
   */
  protected function json(Response $response): array {
    return json_decode((string) $response->getContent(), TRUE, flags: JSON_THROW_ON_ERROR);
  }

  /**
   * Tests that favorites returns the requested, viewable nodes only.
   */
  public function testFavorites(): void {
    [$alpha, $bravo] = $this->nodes;
    $ids = implode(',', [$alpha->id(), $bravo->id(), $this->unpublished->id(), 9999]);

    $response = $this->request("/api/favorites?ids=$ids");
    $this->assertSame(200, $response->getStatusCode());
    $data = $this->json($response);
    $this->assertSame([$alpha->id(), $bravo->id()], array_column($data, 'id'));
    $this->assertStringContainsString('Alpha', $data[0]['html']);

    $this->assertInstanceOf(CacheableJsonResponse::class, $response);
    $cacheability = $response->getCacheableMetadata();
    $this->assertContains('node:' . $alpha->id(), $cacheability->getCacheTags());
    $this->assertContains('node:' . $this->unpublished->id(), $cacheability->getCacheTags());
    $this->assertContains('url.query_args:ids', $cacheability->getCacheContexts());
  }

  /**
   * Tests that favorites ignores input that is not a list of node IDs.
   */
  public function testFavoritesInput(): void {
    $this->assertSame([], $this->json($this->request('/api/favorites')));
    $this->assertSame([], $this->json($this->request('/api/favorites?ids=abc,1%20OR%201,-1')));

    // Duplicates are returned once.
    $id = $this->nodes[0]->id();
    $this->assertCount(1, $this->json($this->request("/api/favorites?ids=$id,$id,$id")));
  }

  /**
   * Tests that favorites loads no more than the allowed number of nodes.
   */
  public function testFavoritesLimit(): void {
    // The third node sits beyond the limit once 50 other IDs precede it.
    $padding = implode(',', range(1000, 1049));
    $id = $this->nodes[2]->id();

    $this->assertSame([], $this->json($this->request("/api/favorites?ids=$padding,$id")));
    $this->assertCount(1, $this->json($this->request("/api/favorites?ids=$id,$padding")));
  }

  /**
   * Tests that only allow-listed views are served.
   */
  public function testViewsAllowList(): void {
    $response = $this->request('/api/views/test_cards');
    $this->assertSame(404, $response->getStatusCode());
    $this->assertSame(['error' => 'View not found'], $this->json($response));

    $this->allowView('test_cards');
    $this->assertSame(200, $this->request('/api/views/test_cards')->getStatusCode());
    $this->assertSame(404, $this->request('/api/views/missing')->getStatusCode());
  }

  /**
   * Tests paging and the validation of the page argument.
   */
  public function testViewsPaging(): void {
    $this->allowView('test_cards');

    $response = $this->request('/api/views/test_cards');
    $data = $this->json($response);
    $this->assertSame('Test cards', $data['title']);
    $this->assertSame(['current_page' => 0, 'total_items' => 3, 'has_more' => TRUE], $data['pager']);
    $this->assertStringContainsString('Alpha', $data['html']);
    $this->assertStringContainsString('Bravo', $data['html']);
    $this->assertStringNotContainsString('Charlie', $data['html']);
    $this->assertStringNotContainsString('Hidden', $data['html']);

    $this->assertInstanceOf(CacheableJsonResponse::class, $response);
    $cacheability = $response->getCacheableMetadata();
    $this->assertContains('node_list', $cacheability->getCacheTags());
    $this->assertContains('config:wudo_theme_extension.settings', $cacheability->getCacheTags());
    $this->assertContains('url.query_args:page', $cacheability->getCacheContexts());

    $data = $this->json($this->request('/api/views/test_cards?page=1'));
    $this->assertSame(['current_page' => 1, 'total_items' => 3, 'has_more' => FALSE], $data['pager']);
    $this->assertStringContainsString('Charlie', $data['html']);

    foreach (['abc', '-1', '1.5'] as $page) {
      $response = $this->request("/api/views/test_cards?page=$page");
      $this->assertSame(400, $response->getStatusCode(), "Page '$page' is rejected.");
    }
  }

  /**
   * The search endpoint does not exist on a site without the search recipe.
   */
  public function testSearchWithoutSearch(): void {
    $this->assertSame(404, $this->request('/api/search?q=alpha')->getStatusCode());
  }

  /**
   * Adds a view to the list served by /api/views.
   */
  protected function allowView(string $view_id): void {
    $this->config('wudo_theme_extension.settings')->set('api_views', [$view_id])->save();
  }

}
