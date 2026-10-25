# Filters

## Filter bar (`wudo:filter-bar`)

The one filtering pattern for lists. `views-view.html.twig` uses it for every
view that has exposed filters, so a view needs no template of its own to get
it.

- **Wide screens:** the form sits above the results. Selects, checkboxes and
  radios filter as soon as they change; text fields filter on Enter, and the
  form keeps its buttons when it has any.
- **Narrow screens:** a "Filters" button with the number of active filters
  opens the same form in a drawer. The list updates behind it, and the drawer
  footer shows the result summary next to "Show results".
- **Active filters** are listed above the results as chips that remove them,
  with "Clear all".
- **Nested checkboxes** (a taxonomy with "Use hierarchy" and "Always expand
  hierarchy"): the options under an option show once it is checked, and
  unchecking it unchecks them. A checked child keeps its parents checked
  (`wudo_preprocess_bef_checkboxes()`), though Facets queries the child only.
- **Accessibility:** only the results are replaced, so focus stays on the
  control in use; the result summary is announced through a live region; the
  drawer traps focus and returns it to its trigger.
- **Address:** every change updates the URL, so a filtered list can be shared
  and the back button works.
- **Without JavaScript** it is a plain GET form with its submit button.

```twig
{% embed 'wudo:filter-bar' with { id: 'project-filters' } only %}
  {% block content %}
    {{ exposed }}
  {% endblock %}
{% endembed %}

<div id="project-filters-results">
  <header data-filter-summary>{{ header }}</header>
  {{ rows }}
  {{ pager }}
</div>
```

The element with the ID `<id>-results` is what gets replaced. Inside it,
`[data-filter-summary]` (or `[data-filter-empty]` when there are no rows) is
the text that is announced; in a view, add the "Result summary" header to
provide it. Leave "Use AJAX" and the auto-submit of Better Exposed Filters
off: the filter bar submits on a change itself, and they would send the form
again and replace it while it is in use.
