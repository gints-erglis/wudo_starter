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

// The color scheme a story is shown in, from the toolbar: a component should
// read well in each.
export const globalTypes = {
  scheme: {
    description: 'Color scheme',
    toolbar: {
      title: 'Scheme',
      icon: 'contrast',
      dynamicTitle: true,
      items: [
        { value: 'light', title: 'Light page' },
        { value: 'dark', title: 'Dark page' },
        { value: 'dark-part', title: 'Dark part of a light page' },
        { value: 'light-part', title: 'Light part of a dark page' },
      ],
    },
  },
};

export const initialGlobals = { scheme: 'light' };

function applyScheme(scheme) {
  const page = scheme === 'dark' || scheme === 'light-part' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', page);
  const root = document.getElementById('storybook-root');
  root?.classList.toggle('scheme-dark', scheme === 'dark-part');
  root?.classList.toggle('scheme-light', scheme === 'light-part');
  root?.classList.toggle('scheme-surface', scheme.endsWith('-part'));
  // The part fills the view, so fixed elements (drawers) are on it too.
  document.body.style.padding = scheme.endsWith('-part') ? '0' : '';
  if (root) {
    root.style.minHeight = scheme.endsWith('-part') ? '100vh' : '';
    root.style.padding = scheme.endsWith('-part') ? '1rem' : '';
  }
}

export const decorators = [
  (story, context) => {
    applyScheme(context.globals.scheme ?? 'light');
    const html = story();
    // A drawer is closed until something opens it; show it open in the catalog.
    requestAnimationFrame(() => {
      document.querySelectorAll('#storybook-root wudo-drawer').forEach((drawer) => drawer.open?.());
    });
    return html;
  },
];
