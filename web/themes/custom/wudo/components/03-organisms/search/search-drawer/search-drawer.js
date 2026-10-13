/**
 * @file
 * Search field that shows the first results while typing.
 *
 * Works on a plain form: submitting it, or using it without this script,
 * leads to the search page.
 */

class WudoSearch extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.input = this.querySelector('input[type="search"]');
    this.status = this.querySelector('.search-status');
    this.list = this.querySelector('.search-results');
    this.all = this.querySelector('.search-all');
    if (!this.form || !this.input || !this.status || !this.list || !this.all) return;

    this.minLength = parseInt(this.getAttribute('min-length'), 10) || 2;
    this.timer = null;
    this.request = null;

    this.input.addEventListener('input', () => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.search(), 250);
    });

    const drawer = this.closest('wudo-drawer');
    if (drawer) {
      document.addEventListener('drawer:after-open', (e) => {
        // After the drawer has placed the focus on its first control.
        if (e.detail.id === drawer.id) setTimeout(() => this.input.focus(), 50);
      });
    }
  }

  label(name, replacements = {}) {
    let text = this.getAttribute(`label-${name}`) || '';
    Object.entries(replacements).forEach(([key, value]) => {
      text = text.replace(key, value);
    });
    return text;
  }

  clear(message = '') {
    this.list.replaceChildren();
    this.list.hidden = true;
    this.all.hidden = true;
    this.status.textContent = message;
  }

  async search() {
    const keys = this.input.value.trim();
    if (this.request) this.request.abort();

    if (!keys) {
      this.clear();
      return;
    }
    if (keys.length < this.minLength) {
      this.clear(this.label('short'));
      return;
    }

    this.request = new AbortController();
    this.status.textContent = this.label('loading');
    try {
      const url = new URL(this.getAttribute('api-url') || '/api/search', window.location.origin);
      url.searchParams.set('q', keys);
      const response = await fetch(url, { signal: this.request.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.show(await response.json(), keys);
    }
    catch (error) {
      // A newer search replaced this one.
      if (error.name === 'AbortError') return;
      this.clear(this.label('error'));
    }
  }

  show(data, keys) {
    if (!data.total) {
      this.clear(this.label('none', { '@keys': keys }));
      return;
    }

    this.list.replaceChildren(...data.items.map((item) => {
      const row = document.createElement('li');
      row.className = 'search-result';

      const link = document.createElement('a');
      link.className = 'search-result__link';
      link.href = item.url;
      link.textContent = item.title;
      row.append(link);

      if (item.type) {
        const type = document.createElement('span');
        type.className = 'search-result__type';
        type.textContent = item.type;
        row.append(type);
      }
      if (item.excerpt) {
        const excerpt = document.createElement('p');
        excerpt.className = 'search-result__excerpt';
        // The server lets nothing but <strong> through.
        excerpt.innerHTML = item.excerpt;
        row.append(excerpt);
      }
      return row;
    }));
    this.list.hidden = false;

    this.status.textContent = data.total === 1
      ? this.label('one')
      : this.label('many', { '@count': data.total });

    const more = data.total > data.items.length;
    this.all.hidden = !more;
    if (more) {
      this.all.href = data.url;
      this.all.textContent = this.label('all', { '@count': data.total });
    }
  }
}

if (!customElements.get('wudo-search')) {
  customElements.define('wudo-search', WudoSearch);
}

// The search button is a link to the search page; with the drawer on the
// page it opens the drawer instead.
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-search-open]');
  if (!trigger || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const drawer = document.getElementById(trigger.dataset.searchOpen);
  if (!drawer || !customElements.get('wudo-drawer')) return;
  e.preventDefault();
  document.dispatchEvent(new CustomEvent('drawer:open', {
    detail: { id: drawer.id, trigger },
  }));
});
