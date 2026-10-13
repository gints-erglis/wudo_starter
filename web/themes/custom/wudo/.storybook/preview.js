// Global styles, as loaded by the theme on every page.
import '../dist/style.css';
// The site's own layer, after the starter's styles.
import '../dist/site.css';

export const parameters = {
  controls: { expanded: true },
  docs: {
    // Drawers, toasts and other fixed elements need a viewport of their own.
    story: { inline: false, height: '320px' },
  },
};

export const tags = ['autodocs'];

export const decorators = [
  (story) => {
    const html = story();
    // A drawer is closed until something opens it; show it open in the catalog.
    requestAnimationFrame(() => {
      document.querySelectorAll('#storybook-root wudo-drawer').forEach((drawer) => drawer.open?.());
    });
    return html;
  },
];
