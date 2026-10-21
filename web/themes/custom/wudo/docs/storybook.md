# Storybook: component catalog

Storybook is the catalog and documentation of the theme's Single Directory
Components. It is not a second implementation: every page is generated from
the component's own files.

| Shown in Storybook            | Comes from                                   |
|-------------------------------|----------------------------------------------|
| Component name, group, status | `name`, `group`, `status` in `*.component.yml` |
| Description                   | `description` in `*.component.yml`           |
| Controls and their options    | `props` (type, `enum`, `default`)            |
| Preview                       | the component's Twig template, CSS and JS    |
| Values used in the preview    | `examples` of each prop and slot             |

So a new component appears in Storybook as soon as it has a
`*.component.yml`, and its documentation is as good as that file.

## Running it

```bash
ddev storybook
```

builds the catalog and prints its address,
`https://<project>.ddev.site/themes/custom/wudo/storybook-static/`. The build
is static, ignored by Git, and can be hosted anywhere.

With Node.js 20 or newer on your own machine you can also run the live
development server from the theme directory:

```bash
npm run storybook
```

Run `npm run build` first: the previews use the compiled CSS.

## Describing a component

Props with `examples` are all a simple component needs:

```yaml
name: Tag
description: "Short label for categories and statuses."
group: Atoms
props:
  type: object
  properties:
    text:
      type: string
      title: Tag Text
      examples:
        - New
```

Without an example Storybook fills the prop with a random placeholder, so
give every prop and slot one.

Components that take lists, nested components or slots get a story under
`thirdPartySettings`, which Drupal ignores:

```yaml
thirdPartySettings:
  sdcStorybook:
    disabledStories:
      - basic
    stories:
      preview:
        props:
          title: Shopping Cart
        slots:
          content: "<p>Your cart is empty.</p>"
          footer:
            - type: component
              component: 'wudo:button'
              props:
                text: Continue shopping
```

See the [storybook-addon-sdc](https://github.com/iberdinsky-skilld/sdc-addon)
documentation for everything a story can contain.

## Limits

Templates are rendered in the browser by Twing, not by Drupal:

- Slots that are plain Twig blocks (`{% block content %}{% endblock %}`)
  filled through `{% embed %}` stay empty. This affects Header and Gallery.
- Anything that needs Drupal data (the favorites API, menus, translations)
  shows example data or nothing.
- Accessibility is not checked here. The Playwright tests (`ddev e2e`) run
  axe against the real pages.

## Color schemes

The "Scheme" menu in the toolbar shows a story on a light page, a dark page,
or as a dark or light part of the other page. A component should read well in
all four; see [color-schemes.md](color-schemes.md).
