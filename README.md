# Touch Rugby Rules

A searchable single-page reference for the Touch playing rules (5th Edition), hosted on GitHub Pages.

**Live site:** https://rjnienaber.github.io/touch-rugby-rules/

## Contents

| Section | Description |
|---------|-------------|
| Rules of Play | All 25 rules with sub-clauses and referee rulings |
| Definitions | Full glossary of terms |
| Field of Play | SVG diagram with dimensions |
| Referee Communication | Standard two-word calls and their usage |
| Level 2 Assessment | Referee badge competency criteria |

## Features

- **Client-side search** — filters rules, definitions, and section cards to matching content only; sidebar nav updates in sync
- **Deep links** — every rule clause has a stable anchor (e.g. `#r13-12-1`); links highlight on jump
- **AI ingestion** — `/llms.txt` index and `/rules.md` full plain-text content following the [llmstxt.org](https://llmstxt.org) spec
- **Responsive** — collapsible sidebar on mobile

## Files

```
index.html   — single-page app
style.css    — all styles
app.js       — search, scroll spy, mobile nav
rules.md     — full content in Markdown (AI ingestion)
llms.txt     — llmstxt.org index
```

## Running locally

Open `index.html` directly in a browser — no build step or server required.

## Deployment

The site is served from the `main` branch root via GitHub Pages. Push to `main` to deploy.
