<?php

namespace Drupal\wudo_theme_extension\Plugin\paragraphs\Behavior;

use Drupal\Core\Entity\Display\EntityViewDisplayInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs\ParagraphsBehaviorBase;

/**
 * Provides parallax positioning settings for media paragraphs.
 *
 * @ParagraphsBehavior(
 *   id = "parallax_layer",
 *   label = @Translation("Parallax Layer"),
 *   description = @Translation("Positions this media as a parallax background layer."),
 *   weight = 2
 * )
 */
class ParallaxLayerBehavior extends ParagraphsBehaviorBase {

  /**
   * A CSS length: a number with a unit, or auto.
   *
   * Nothing else reaches the style attribute, so a value can't load anything
   * or add other properties.
   */
  const LENGTH = '/^(auto|\d+(\.\d+)?(px|rem|em|%|vw|vh|svh|lvh|dvh))$/';

  /**
   * {@inheritdoc}
   */
  public function buildBehaviorForm(ParagraphInterface $paragraph, array &$form, FormStateInterface $form_state) {
    // Several layers can be open in one form, so the controls are found by
    // the paragraph's UUID rather than by name.
    $id = $paragraph->uuid();
    $form['enable_parallax'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable parallax layer'),
      '#default_value' => $paragraph->getBehaviorSetting($this->getPluginId(), 'enable_parallax', FALSE),
      '#attributes' => ['class' => ["parallax-enable-$id"]],
    ];

    $states = [
      'visible' => [
        ":input.parallax-enable-$id" => ['checked' => TRUE],
      ],
    ];
    $custom_states = [
      'visible' => [
        ":input.parallax-enable-$id" => ['checked' => TRUE],
        ":input.parallax-size-$id" => ['value' => 'custom'],
      ],
    ];

    $form['size'] = [
      '#type' => 'radios',
      '#title' => $this->t('Size'),
      '#options' => [
        'cover' => $this->t('Fill the section: a background that covers it at every scroll position'),
        'custom' => $this->t('Custom size and position: a shape or picture in front of the background'),
      ],
      '#default_value' => static::size($paragraph),
      '#attributes' => ['class' => ["parallax-size-$id"]],
      '#states' => $states,
    ];

    $form['position'] = [
      '#type' => 'select',
      '#title' => $this->t('Position'),
      '#options' => [
        'top-left' => $this->t('Top left'),
        'top-center' => $this->t('Top center'),
        'top-right' => $this->t('Top right'),
        'left-center' => $this->t('Left center'),
        'center' => $this->t('Center'),
        'right-center' => $this->t('Right center'),
        'bottom-left' => $this->t('Bottom left'),
        'bottom-center' => $this->t('Bottom center'),
        'bottom-right' => $this->t('Bottom right'),
      ],
      '#default_value' => $paragraph->getBehaviorSetting($this->getPluginId(), 'position', 'center'),
      '#states' => $custom_states,
    ];

    $form['width'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Width'),
      '#description' => $this->t('A number with a unit: px, rem, %, vw or vh, e.g. 400px, 60%, 40vw. Empty: the width of the picture.'),
      '#default_value' => $paragraph->getBehaviorSetting($this->getPluginId(), 'width', ''),
      '#size' => 10,
      '#states' => $custom_states,
    ];

    $form['height'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Height'),
      '#description' => $this->t('As the width, or auto.'),
      '#default_value' => $paragraph->getBehaviorSetting($this->getPluginId(), 'height', ''),
      '#size' => 10,
      '#states' => $custom_states,
    ];

    $form['speed'] = [
      '#type' => 'number',
      '#title' => $this->t('Parallax speed'),
      '#description' => $this->t('0 stands still while the page scrolls, 1 scrolls with the page. A background usually looks best at 0.2–0.4.'),
      '#step' => 0.05,
      '#min' => 0,
      '#max' => 1,
      '#default_value' => $paragraph->getBehaviorSetting($this->getPluginId(), 'speed', 0.3),
      '#states' => $states,
    ];

    $form['z_index'] = [
      '#type' => 'number',
      '#title' => $this->t('Z-index'),
      '#description' => $this->t('Layers with a higher number are in front.'),
      '#step' => 1,
      '#default_value' => $paragraph->getBehaviorSetting($this->getPluginId(), 'z_index', 0),
      '#states' => $states,
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function validateBehaviorForm(ParagraphInterface $paragraph, array &$form, FormStateInterface $form_state) {
    foreach (['width', 'height'] as $key) {
      $value = trim((string) $form_state->getValue($key));
      if ($value !== '' && !preg_match(static::LENGTH, $value)) {
        $form_state->setError($form[$key], $this->t('%field must be a number with a unit, such as 400px, 60% or 40vw.', ['%field' => $form[$key]['#title']]));
      }
      $form_state->setValue($key, $value);
    }
  }

  /**
   * {@inheritdoc}
   */
  public function view(array &$build, ParagraphInterface $paragraph, EntityViewDisplayInterface $display, $view_mode) {
    if (!$paragraph->getBehaviorSetting($this->getPluginId(), 'enable_parallax', FALSE)) {
      return;
    }

    $speed = (float) $paragraph->getBehaviorSetting($this->getPluginId(), 'speed', 0.3);
    $z_index = (int) $paragraph->getBehaviorSetting($this->getPluginId(), 'z_index', 0);

    $build['#attributes']['class'][] = 'parallax-layer';
    $build['#attributes']['data-parallax-speed'] = max(0, min(1, $speed));
    $build['#attached']['library'][] = 'wudo/parallax';

    if (static::size($paragraph) === 'cover') {
      $build['#attributes']['class'][] = 'parallax-layer--cover';
    }
    else {
      $position = $paragraph->getBehaviorSetting($this->getPluginId(), 'position', 'center');
      $build['#attributes']['class'][] = 'parallax-layer--' . preg_replace('/[^a-z-]/', '', $position);
      foreach (['width', 'height'] as $key) {
        $value = $paragraph->getBehaviorSetting($this->getPluginId(), $key, '');
        // Settings saved before the form checked them are checked here too.
        if ($value !== '' && preg_match(static::LENGTH, $value)) {
          $build['#attributes']['style'][] = $key . ': ' . $value . ';';
        }
      }
    }
    if ($z_index) {
      $build['#attributes']['style'][] = 'z-index: ' . $z_index . ';';
    }
  }

  /**
   * Returns the layer's size mode: "cover" or "custom".
   *
   * Layers saved before there was a size mode filled the section with a
   * width and height of 100%; those count as "cover".
   */
  protected static function size(ParagraphInterface $paragraph): string {
    $size = $paragraph->getBehaviorSetting('parallax_layer', 'size');
    if ($size === 'cover' || $size === 'custom') {
      return $size;
    }
    if ($size === NULL) {
      $width = $paragraph->getBehaviorSetting('parallax_layer', 'width', '');
      $height = $paragraph->getBehaviorSetting('parallax_layer', 'height', '');
      if ($width === '' && $height === '' && !$paragraph->getBehaviorSetting('parallax_layer', 'enable_parallax', FALSE)) {
        // A new layer.
        return 'cover';
      }
      return $width === '100%' && $height === '100%' ? 'cover' : 'custom';
    }
    return 'custom';
  }

}
