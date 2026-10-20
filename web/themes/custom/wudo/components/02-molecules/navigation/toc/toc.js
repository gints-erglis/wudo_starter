/**
 * @file toc.js
 *
 * Marks the link of the section being read with aria-current: the last
 * heading above the upper third of the window, or the last heading once the
 * page is scrolled to the end.
 */
class WudoToc extends HTMLElement {
  connectedCallback() {
    this.links = [...this.querySelectorAll('.toc__link')];
    this.headings = this.links.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))));
    if (this.headings.includes(null)) {
      return;
    }
    this.onScroll = () => {
      if (!this.frame) {
        this.frame = requestAnimationFrame(() => {
          this.frame = null;
          this.update();
        });
      }
    };
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.update();
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.onScroll);
  }

  update() {
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const line = window.innerHeight / 3;
    let current = -1;
    if (atEnd && window.scrollY > 0) {
      current = this.headings.length - 1;
    }
    else {
      this.headings.forEach((heading, index) => {
        if (heading.getBoundingClientRect().top <= line) {
          current = index;
        }
      });
    }
    this.links.forEach((link, index) => {
      if (index === current) {
        link.setAttribute('aria-current', 'location');
      }
      else {
        link.removeAttribute('aria-current');
      }
    });
  }
}

if (!customElements.get('wudo-toc')) {
  customElements.define('wudo-toc', WudoToc);
}
