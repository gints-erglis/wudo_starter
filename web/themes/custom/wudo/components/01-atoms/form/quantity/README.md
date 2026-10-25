# Quantity Input

A number field with buttons that decrease and increase it: `<wudo-quantity>`.

- The buttons take the limits of the field (`min`, `max`, `step`) and are
  disabled at them. What is typed is left to the form to validate.
- They are out of the tab order (`tabindex="-1"`): the arrow keys change the
  field. Their names are translatable ("Decrease quantity", "Increase
  quantity"); the field keeps its own label.
- Until the script runs, and without it, the buttons are hidden and the field
  is a plain number field.

## A field of a Drupal form

Put the form's own field in the `input` slot, so that its name, ID and
`data-drupal-selector` stay. For the quantity fields of Commerce, suggest a
template for them:

```php
function wudo_theme_suggestions_input_alter(array &$suggestions, array $variables): void {
  $element = $variables['element'];
  if (($element['#type'] ?? '') === 'number' && in_array($element['#parents'][0] ?? '', ['quantity', 'edit_quantity'], TRUE)) {
    $suggestions[] = 'input__number__quantity';
  }
}
```

and wrap the field in `templates/form/input--number--quantity.html.twig`:

```twig
{% set field %}<input{{ attributes }} />{{ children }}{% endset %}
{{ include('wudo:quantity-input', { input: field }, with_context = false) }}
```

## A field of its own

```twig
{% include 'wudo:quantity-input' with {
  name: 'quantity',
  value: 1,
  min: 1,
  max: 10,
  label: 'Quantity'|t,
} only %}
```

## Events

A change by a button fires `input` and `change` on the field, as typing
does, and `quantity:update` on the component, with the new value and the
component's `data-*` attributes:

```html
<wudo-quantity data-id="123" data-action="update-cart">...</wudo-quantity>
```

```javascript
document.addEventListener('quantity:update', (e) => {
  const { value, id, action } = e.detail;
});
```
