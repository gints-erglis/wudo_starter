/**
 * @file
 * Buttons that decrease and increase a number field.
 *
 * The limits are those of the field (min, max, step). A change by a button
 * is a change of the field ("change" event, which forms listen to) and a
 * "quantity:update" event with the new value and the element's data-*
 * attributes.
 */

class WudoQuantity extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input[type="number"]');
    this.minus = this.querySelector('[data-action="minus"]');
    this.plus = this.querySelector('[data-action="plus"]');
    if (!this.input || !this.minus || !this.plus) return;

    // The field of a form keeps its own class.
    this.input.classList.add('quantity-input__field');

    this.minus.addEventListener('click', () => this.change(-this.step));
    this.plus.addEventListener('click', () => this.change(this.step));
    this.input.addEventListener('input', () => this.update());
    this.update();
  }

  get step() {
    return Number(this.input.step) || 1;
  }

  get min() {
    return this.input.min === '' ? -Infinity : Number(this.input.min);
  }

  get max() {
    return this.input.max === '' ? Infinity : Number(this.input.max);
  }

  clamp(value) {
    return Math.min(this.max, Math.max(this.min, value));
  }

  change(delta) {
    const current = Number(this.input.value);
    // An empty or invalid field starts from its minimum.
    const start = this.input.value === '' || Number.isNaN(current) ? Math.max(this.min, 0) : current;
    const value = this.clamp(start + delta);
    if (value === current) return;

    this.input.value = value;
    this.update();
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
    this.dispatchEvent(new CustomEvent('quantity:update', {
      detail: { ...this.dataset, value },
      bubbles: true,
    }));
  }

  // The buttons that would go past a limit are disabled; the field itself is
  // left as typed, the form validates it.
  update() {
    const value = Number(this.input.value);
    const valid = this.input.value !== '' && !Number.isNaN(value);
    this.minus.disabled = this.input.disabled || (valid && value <= this.min);
    this.plus.disabled = this.input.disabled || (valid && value >= this.max);
  }
}

if (!customElements.get('wudo-quantity')) {
  customElements.define('wudo-quantity', WudoQuantity);
}
