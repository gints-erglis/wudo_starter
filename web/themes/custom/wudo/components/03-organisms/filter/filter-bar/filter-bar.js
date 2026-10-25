/**
 * @file filter-bar.js
 * @description Wudo Filter Bar: filters that update a list in place.
 *
 * Enhances a plain GET form. Selects, checkboxes and radios filter as soon as
 * they change; text fields filter on submit. Only the results are replaced, so
 * focus stays on the control that was used, and the address is updated so the
 * filtered list can be shared. If anything fails, the form is submitted the
 * ordinary way.
 */

const EMPTY_VALUES = ['', 'All', '_none'];
const TEXT_TYPES = ['text', 'search', 'number', 'date', 'email', 'tel', 'url'];

class WudoFilterBar extends HTMLElement {
  connectedCallback() {
    this._request = null;

    this.addEventListener('change', (e) => {
      if (e.target.matches('input[type="checkbox"]') && !e.target.checked) {
        this._uncheckNested(e.target);
      }
      this._sync();
      if (e.target.matches('select, input[type="checkbox"], input[type="radio"]')) {
        this._submit();
      }
    });

    this.addEventListener('submit', (e) => {
      e.preventDefault();
      if (e.submitter && e.submitter.name === 'reset') {
        this._clearAll();
        return;
      }
      this._submit();
    });

    this.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-filter-remove]');
      if (chip) {
        const filter = this._filters()[Number(chip.dataset.filterRemove)];
        if (filter) {
          filter.clear();
          this._sync();
          this._submit();
          // The chip is gone; keep keyboard users in the list of filters.
          const next = this.querySelector('[data-filter-remove], .filter-bar__toggle');
          if (next && next.offsetParent) next.focus();
        }
      }
      else if (e.target.closest('[data-filter-clear]')) {
        this._clearAll();
      }
      else if (e.target.closest('[data-filter-close]')) {
        this._closeDrawer();
      }
    });

    // Going back shows the list as it was for that address.
    this._onPopState = () => window.location.reload();
    window.addEventListener('popstate', this._onPopState);

    this._sync();
    this._showSummary(false);
  }

  disconnectedCallback() {
    window.removeEventListener('popstate', this._onPopState);
  }

  get form() {
    return this.querySelector('form');
  }

  get results() {
    return document.getElementById(this.getAttribute('results-id'));
  }

  /**
   * Lists the filters that are set, each with a label and a way to unset it.
   */
  _filters() {
    const form = this.form;
    if (!form) return [];

    const filters = [];
    const labelOf = (control) => {
      const label = control.labels && control.labels[0];
      return label ? label.textContent.trim() : '';
    };

    Array.from(form.elements).forEach((control) => {
      if (control.disabled || !control.name) return;

      if (control.tagName === 'SELECT') {
        Array.from(control.selectedOptions).forEach((option) => {
          if (EMPTY_VALUES.includes(option.value)) return;
          filters.push({
            label: `${labelOf(control)}: ${option.textContent.trim()}`,
            clear: () => {
              option.selected = false;
              if (!control.multiple) {
                const none = Array.from(control.options).find((o) => EMPTY_VALUES.includes(o.value));
                control.value = none ? none.value : control.options[0].value;
              }
            },
          });
        });
      }
      else if (control.type === 'checkbox' || control.type === 'radio') {
        if (!control.checked || EMPTY_VALUES.includes(control.value)) return;
        const legend = control.closest('fieldset') && control.closest('fieldset').querySelector('legend');
        const group = legend ? `${legend.textContent.trim()}: ` : '';
        filters.push({
          label: `${group}${labelOf(control)}`,
          clear: () => {
            control.checked = false;
            this._uncheckNested(control);
            if (control.type === 'radio') {
              const none = Array.from(form.elements[control.name]).find((r) => EMPTY_VALUES.includes(r.value));
              if (none) none.checked = true;
            }
          },
        });
      }
      else if (TEXT_TYPES.includes(control.type) && control.value.trim() !== '') {
        filters.push({
          label: `${labelOf(control)}: ${control.value.trim()}`,
          clear: () => { control.value = ''; },
        });
      }
    });

    return filters;
  }

  /**
   * Updates the removable chips and the count on the drawer trigger.
   */
  _sync() {
    const filters = this._filters();

    const active = this.querySelector('[data-filter-active]');
    const list = active && active.querySelector('ul');
    if (list) {
      list.replaceChildren(...filters.map((filter, index) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'filter-bar__chip';
        button.dataset.filterRemove = String(index);

        const hint = document.createElement('span');
        hint.className = 'visually-hidden';
        hint.textContent = `${this.dataset.labelRemove}: `;
        const cross = document.createElement('span');
        cross.setAttribute('aria-hidden', 'true');
        cross.textContent = '×';

        button.append(hint, filter.label, cross);
        item.append(button);
        return item;
      }));
      active.hidden = filters.length === 0;
    }

    const badge = this.querySelector('.filter-bar__toggle .js-count');
    if (badge) {
      badge.hidden = filters.length === 0;
      badge.replaceChildren();
      if (filters.length) {
        const hint = document.createElement('span');
        hint.className = 'visually-hidden';
        hint.textContent = ` ${this.dataset.labelActive}`;
        badge.append(String(filters.length), hint);
      }
    }
  }

  /**
   * Unchecks the options nested under an option, hidden once it is unchecked.
   */
  _uncheckNested(control) {
    const item = control.closest('li');
    if (!item) return;
    item.querySelectorAll(':scope > ul input[type="checkbox"]').forEach((nested) => {
      nested.checked = false;
    });
  }

  _clearAll() {
    this._filters().forEach((filter) => filter.clear());
    this._sync();
    this._submit();
  }

  _closeDrawer() {
    document.dispatchEvent(new CustomEvent('drawer:close', {
      detail: { id: this.getAttribute('drawer-id') },
    }));
  }

  /**
   * Builds the address the form would submit to.
   */
  _url() {
    const form = this.form;
    const url = new URL(form.getAttribute('action') || window.location.pathname, window.location.href);
    const params = new URLSearchParams();
    new FormData(form).forEach((value, name) => {
      if (typeof value === 'string' && value !== '') params.append(name, value);
    });
    url.search = params.toString();
    return url;
  }

  async _submit() {
    const form = this.form;
    const results = this.results;
    if (!form) return;

    const url = this._url();
    if (!results) {
      window.location.assign(url);
      return;
    }

    if (this._request) this._request.abort();
    this._request = new AbortController();
    results.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(url, { signal: this._request.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      const fresh = page.getElementById(results.id);
      if (!fresh) throw new Error('No results in the response.');

      results.replaceChildren(...fresh.childNodes);
      window.history.pushState({}, '', url);
      if (window.Drupal && window.Drupal.attachBehaviors) {
        window.Drupal.attachBehaviors(results, window.drupalSettings);
      }
      this._showSummary(true);
    }
    catch (error) {
      if (error.name === 'AbortError') return;
      window.location.assign(url);
    }
    finally {
      results.removeAttribute('aria-busy');
    }
  }

  /**
   * Shows the result summary in the drawer and announces it.
   */
  _showSummary(announce) {
    const results = this.results;
    const summary = results && results.querySelector('[data-filter-summary], [data-filter-empty]');
    const text = summary ? summary.textContent.replace(/\s+/g, ' ').trim() : '';

    const inDrawer = this.querySelector('[data-filter-drawer-summary]');
    if (inDrawer) inDrawer.textContent = text;

    const status = this.querySelector('[data-filter-status]');
    if (announce && status) {
      // An emptied live region announces the same text again.
      status.textContent = '';
      requestAnimationFrame(() => {
        status.textContent = text || this.dataset.labelUpdated;
      });
    }
  }
}

if (!customElements.get('wudo-filter-bar')) {
  customElements.define('wudo-filter-bar', WudoFilterBar);
}
