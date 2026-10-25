# Map

A place on an OpenStreetMap map, with a link to a larger map and one to
directions in Google Maps. OpenStreetMap sets no cookies, so the map needs no
consent; the site's Content Security Policy has to allow it as a frame
source (`https://www.openstreetmap.org`).

To let editors place maps, add a paragraph type with a latitude, a
longitude and a title, and include the component in its template
(`paragraph--map.html.twig`).

## Props

| Property | Type | Description |
| --- | --- | --- |
| `latitude` | `number` | Latitude of the place. |
| `longitude` | `number` | Longitude of the place. |
| `title` | `string` | What is on the map: the frame's title and the end of the links for screen readers. |
| `modifier_class` | `string` | Additional classes. |

## Usage (Twig)

```twig
{% include 'wudo:map' with {
  latitude: 60.1694,
  longitude: 24.9522,
  title: 'Senate Square, Helsinki',
} only %}
```
