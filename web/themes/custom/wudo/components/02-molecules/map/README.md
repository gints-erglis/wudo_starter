# Map

A place on an OpenStreetMap map, with a link to a larger map and one to
directions in Google Maps; both are external links that open in a new tab.
OpenStreetMap sets no cookies, so the map needs no
consent; the site's Content Security Policy has to allow it as a frame
source (`https://www.openstreetmap.org`).

Editors place a map with the "Map" paragraph: the name of the place, its
coordinates as Google Maps copies them ("56.9496, 24.1052") and an address
(`templates/paragraphs/paragraph--map.html.twig`).

## Props

| Property | Type | Description |
| --- | --- | --- |
| `latitude` | `number` | Latitude of the place. |
| `longitude` | `number` | Longitude of the place. |
| `title` | `string` | What is on the map: the frame's title and the end of the links for screen readers. |
| `address` | `string` | Optional address, shown under the name of the place line by line. |
| `modifier_class` | `string` | Additional classes. |

## Usage (Twig)

```twig
{% include 'wudo:map' with {
  latitude: 60.1694,
  longitude: 24.9522,
  title: 'Senate Square, Helsinki',
  address: "Aleksanterinkatu 1\n00170 Helsinki",
} only %}
```
