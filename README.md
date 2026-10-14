# Touch Rugby Rules

A searchable single-page reference for the Touch playing rules (5th Edition), hosted on GitHub Pages.

**Live site:** https://rjnienaber.github.io/touch-rugby-rules/

## Contents

| Section | Description |
|---------|-------------|
| Rules of Play | All 25 rules with sub-clauses and referee rulings |
| Tap or Rollball? | Referee cribsheet: whether an infringement is a penalty tap or a rollball, with rule links |
| Definitions | Full glossary of terms |
| Field of Play | SVG diagram with dimensions |
| Referee Communication | Standard two-word calls and their usage |
| Level 2 Assessment | Referee badge competency criteria |
| Positioning | Referee positioning diagrams for tap-off, rollball and try line |

## Features

- **Section tabs** — each section (Rules, Tap or Rollball?, Definitions, …) is its own view, reached from the tabs in the top bar; the sidebar lists the contents of the current section only
- **Client-side search** — searches every section at once, showing only matching content; click a result to open it in its section, or press Esc to return to the section of the selected match
- **Deep links** — every rule clause has a stable anchor (e.g. `#r13-12-1`); links highlight on jump
- **AI ingestion** — `/llms.txt` index and `/rules.md` full plain-text content following the [llmstxt.org](https://llmstxt.org) spec
- **Phone layout** — opens on a home screen of section tiles; each section has a back link and a "Jump to…" menu

## Files

```
index.html   — single-page app
style.css    — all styles
app.js       — section views (hash routing), search, scroll spy
rules.md     — full content in Markdown (AI ingestion)
llms.txt     — llmstxt.org index
```

## Running locally

Open `index.html` directly in a browser — no build step or server required.

## Deployment

The site is served from the `main` branch root via GitHub Pages. Push to `main` to deploy.
