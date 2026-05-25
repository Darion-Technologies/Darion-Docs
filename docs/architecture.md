# Architecture

Darion Docs is a static documentation system built with VitePress. Source
content is stored as Markdown, site behavior is configured in
`.vitepress/config.mjs`, and visual identity is controlled through a thin theme
extension.

## System Boundaries

| Boundary | Responsibility |
| --- | --- |
| Markdown content | Stores durable product, platform, and API knowledge. |
| VitePress runtime | Builds routes, search indexes, navigation, and static assets. |
| Theme override | Applies Darion typography, spacing, borders, and color behavior. |
| Hosting layer | Serves the generated static files from `.vitepress/dist`. |

## Design Principles

The architecture favors static rendering, predictable routing, and low operating
cost. Search is local to the generated site, which keeps the platform portable
across self-hosted environments.
