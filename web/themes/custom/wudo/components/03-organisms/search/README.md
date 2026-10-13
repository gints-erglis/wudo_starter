# Search

The interface of the optional site search (`ddev add-search`, `recipes/search`).

| Component | What it is |
| --- | --- |
| `wudo:search-button` | Icon button for the header. A link to the search page that opens the drawer instead when the drawer is on the page. |
| `wudo:search-drawer` | Drawer with a search form; shows the first results while typing. |
| `wudo:search-result` | One result: linked title, content type, excerpt. Used by the search page; the drawer builds the same markup from JSON. |

The button and the drawer are placed by the block "Search button and drawer"
of the Wudo Theme Extension module, once as the button in the header and once
as the drawer at the bottom of the page, so the drawer is outside the sticky
header.

## How it behaves

- Opening the drawer puts the cursor in the field. Escape, the close button
  and the overlay close it and return to the button.
- Typing searches after a short pause; an older, slower answer never replaces
  a newer one. Fewer than `min_length` characters are not searched for.
- The number of results, "nothing found" and errors are announced through a
  status region.
- Enter, or the button next to the field, opens the search page with the
  same search. That is also all that happens without JavaScript.

## The data

`api_url` is asked with `?q=<text>` and answers:

```json
{
  "total": 12,
  "items": [
    { "title": "…", "url": "/…", "type": "Article", "excerpt": "… <strong>match</strong> …" }
  ],
  "url": "/search?keys=…"
}
```

The excerpt is inserted as markup; the endpoint lets nothing but `<strong>`
through. Anything that answers in this shape can stand in for it.
