<?php

declare(strict_types=1);

namespace Drupal\wudo_theme_extension;

use Drupal\Component\Utility\Html;
use Drupal\Core\Security\TrustedCallbackInterface;
use Drupal\node\NodeInterface;

/**
 * The table of contents of a page, from the h2 and h3 headings of its body.
 *
 * The headings get an id when the body is rendered (addIds()), and the links
 * are built from the same text (headings()), so both always match.
 */
final class TableOfContents implements TrustedCallbackInterface {

  /**
   * The field the headings are read from.
   */
  public const FIELD = 'field_body';

  /**
   * Fewer headings than this make no table of contents.
   */
  public const MINIMUM = 2;

  /**
   * {@inheritdoc}
   */
  public static function trustedCallbacks(): array {
    return ['addIds'];
  }

  /**
   * Returns the headings of a node's body: id, text and level (2 or 3).
   */
  public static function forNode(NodeInterface $node): array {
    if (!$node->hasField(self::FIELD) || $node->get(self::FIELD)->isEmpty()) {
      return [];
    }
    return self::headings((string) $node->get(self::FIELD)->value);
  }

  /**
   * Returns the h2 and h3 headings of an HTML fragment, in order.
   */
  public static function headings(string $html): array {
    $headings = [];
    $used = [];
    foreach (self::query($html) as $element) {
      if (!$element instanceof \DOMElement) {
        continue;
      }
      $text = trim(preg_replace('/\s+/u', ' ', $element->textContent));
      if ($text === '') {
        continue;
      }
      $headings[] = [
        'id' => self::id($element, $text, $used),
        'text' => $text,
        'level' => (int) substr($element->nodeName, 1),
      ];
    }
    return $headings;
  }

  /**
   * Post-render callback: gives the h2 and h3 headings of the body an id.
   */
  public static function addIds(string $html, array $element): string {
    $dom = Html::load($html);
    $used = [];
    $changed = FALSE;
    foreach ((new \DOMXPath($dom))->query('//h2 | //h3') as $heading) {
      if (!$heading instanceof \DOMElement) {
        continue;
      }
      $text = trim(preg_replace('/\s+/u', ' ', $heading->textContent));
      if ($text === '') {
        continue;
      }
      $heading->setAttribute('id', self::id($heading, $text, $used));
      $changed = TRUE;
    }
    return $changed ? Html::serialize($dom) : $html;
  }

  /**
   * Returns the h2 and h3 elements of an HTML fragment.
   */
  private static function query(string $html): \DOMNodeList {
    return (new \DOMXPath(Html::load($html)))->query('//h2 | //h3');
  }

  /**
   * Returns the id of a heading: its own, or one made from its text.
   */
  private static function id(\DOMElement $heading, string $text, array &$used): string {
    $id = $heading->getAttribute('id') ?: Html::getClass($text);
    $unique = $id;
    for ($i = 2; isset($used[$unique]); $i++) {
      $unique = "$id-$i";
    }
    $used[$unique] = TRUE;
    return $unique;
  }

}
