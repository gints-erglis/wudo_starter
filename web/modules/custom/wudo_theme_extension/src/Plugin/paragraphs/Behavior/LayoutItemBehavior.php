<?php

namespace Drupal\wudo_theme_extension\Plugin\paragraphs\Behavior;

use Drupal\Core\Entity\Display\EntityViewDisplayInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs\ParagraphsBehaviorBase;

/**
 * The width and alignment of a paragraph in a Section or Layout.
 *
 * @ParagraphsBehavior(
 *   id = "layout_item",
 *   label = @Translation("Width in the layout"),
 *   description = @Translation("How wide this paragraph is in the Section or Layout that holds it, and where it sits."),
 *   weight = 10
 * )
 */
class LayoutItemBehavior extends ParagraphsBehaviorBase {

  /**
   * {@inheritdoc}
   */
  public function buildBehaviorForm(ParagraphInterface $paragraph, array &$form, FormStateInterface $form_state) {
    $id = $paragraph->uuid();

    $form['width'] = [
      '#type' => 'select',
      '#title' => $this->t('Width in the layout'),
      '#description' => $this->t('The fractions are of the column the paragraph is in; on a phone it takes the full width.'),
      '#options' => static::widths(),
      '#default_value' => $paragraph->getBehaviorSetting($this->getPluginId(), 'width', ''),
      '#attributes' => ['class' => ["layout-item-width-$id"]],
    ];

    $form['align'] = [
      '#type' => 'select',
      '#title' => $this->t('Alignment'),
      '#options' => static::alignments(),
      '#default_value' => $paragraph->getBehaviorSetting($this->getPluginId(), 'align', ''),
      '#states' => [
        'invisible' => [
          [":input.layout-item-width-$id" => ['value' => '']],
          'or',
          [":input.layout-item-width-$id" => ['value' => 'full']],
        ],
      ],
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function view(array &$build, ParagraphInterface $paragraph, EntityViewDisplayInterface $display, $view_mode) {
    $width = $paragraph->getBehaviorSetting($this->getPluginId(), 'width', '');
    $align = $paragraph->getBehaviorSetting($this->getPluginId(), 'align', '');

    if ($width === '' || !isset(static::widths()[$width])) {
      return;
    }
    $build['#attributes']['class'][] = 'layout-item--' . $width;
    if ($width !== 'full' && $align !== '' && isset(static::alignments()[$align])) {
      $build['#attributes']['class'][] = 'layout-item--' . $align;
    }
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary(ParagraphInterface $paragraph) {
    $width = $paragraph->getBehaviorSetting($this->getPluginId(), 'width', '');
    if ($width === '' || !isset(static::widths()[$width])) {
      return [];
    }
    return [['label' => $this->t('Width'), 'value' => static::widths()[$width]]];
  }

  /**
   * The widths, keyed by the class suffix; see _layout-columns.scss.
   */
  protected static function widths(): array {
    return [
      '' => t('Fill its column'),
      'full' => t('The whole row, across all columns'),
      'text' => t('A comfortable line of text (about 65 characters)'),
      'two-thirds' => t('Two thirds'),
      'half' => t('Half'),
      'third' => t('One third'),
    ];
  }

  /**
   * The alignments of a paragraph narrower than its column.
   */
  protected static function alignments(): array {
    return [
      '' => t('Start'),
      'center' => t('Center'),
      'end' => t('End'),
    ];
  }

}
