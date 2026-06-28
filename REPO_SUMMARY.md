# Repository Summary

## Overview

Personal knowledge base site. Markdown/MDX notes on DSA, system design, AWS, Kafka,
OS, databases, and technical book summaries. Custom React rendering with reading-
progress tracking and real diagram/graph rendering. **Migrated from Docusaurus to a
custom Vite + React Router app** — content is unchanged Markdown, rendered at runtime.

## Tech Stack

- Vite 5 + React 18 + React Router 6 (SPA)
- MDX runtime compilation (`@mdx-js/mdx` `evaluate`) with remark-gfm, remark-math,
  rehype-katex, rehype-slug
- Mermaid (real diagrams), Recharts (data charts), KaTeX (math)
- Plain CSS theme + CSS Modules (no Tailwind)

## Directory Layout

```
├── docs/                         # Markdown/MDX content (source of truth — unchanged)
│   ├── Books/  DSA-Foundations/  DSA-Training/  Technical-Knowledge/  intro.md
│   └── **/_category_.json        # category labels / order (Docusaurus convention kept)
├── index.html                    # Vite entry (loads fonts + KaTeX CSS)
├── vite.config.js                # base path, React plugin (JSX in .js enabled)
├── src/
│   ├── main.jsx  App.jsx         # entry + router (BrowserRouter, basename = BASE_URL)
│   ├── theme.css                 # full neon/cyberpunk theme (ported + extended)
│   ├── content/
│   │   ├── loader.js             # glob docs, build nav tree, routes, link resolver
│   │   ├── frontmatter.js        # tiny frontmatter parser
│   │   ├── preprocess.js         # strip MDX imports, :::admonitions→<Callout>, {#id}→<h*>
│   │   ├── useMdx.js             # lazy MDX compile hook (+ cache)
│   │   ├── mdxComponents.jsx     # component map handed to compiled MDX
│   │   ├── sections.js           # H2 counts per page (for progress %)
│   │   └── search.js             # in-memory search index
│   ├── components/
│   │   ├── layout/               # Navbar, Sidebar (with % pills), TOC, Pagination, Search, Layout
│   │   ├── render/               # Heading, Anchor, Table, CodeBlock, Callout, Mermaid,
│   │   │                         #   Diagram, Chart, QnA, DocContext
│   │   ├── progress/             # ProgressContext, PageProgress, SectionCheckbox
│   │   ├── AlgoViz/              # legacy algorithm visualizer (used in DSA MDX)
│   │   └── KafkaConnect*/        # legacy Kafka diagrams (used in MDX)
│   ├── compat/                   # Layout/Link shims so legacy pages port unchanged
│   └── pages/
│       ├── Home.jsx              # homepage (particle canvas)
│       ├── DocPage.jsx           # doc renderer + breadcrumbs + progress + TOC + pagination
│       ├── dsa-roadmap/          # interactive roadmap (localStorage)
│       └── interview-checklist/  # interview checklist
└── static/img/                   # static assets
```

## Routing

| URL | Component |
|-----|-----------|
| `/` | Home |
| `/dsa-roadmap` | DSA Roadmap |
| `/interview-checklist` | Interview Checklist |
| `/docs/*` | DocPage (resolves route → doc or category landing) |

Routes mirror the `docs/` folder structure; `index.md` becomes a folder's landing
page. Internal Markdown links (relative or absolute) are resolved to SPA routes.

## Reading Progress

- Tracked topics: **Technical-Knowledge** and **Books**.
- Each H2 section gets a "Mark read" pill; state persists in `localStorage`
  (`kb-reading-progress-v1`).
- Sidebar shows a % pill on each tracked page and aggregates up to parent topics.
- A progress bar with "Reset" sits at the top of each tracked page.

## Diagrams & Graphs

- ASCII/box-drawing fences → styled **Diagram** cards (automatic, all files).
- ` ```mermaid ` fences → real **Mermaid** diagrams (e.g. converted in
  `Books/System-Design-Interview-V1/01-scale-from-zero-to-millions.md`).
- `<Chart>` → Recharts bar/line/area/pie for numeric data.

## Scripts

- `npm run dev` — dev server (HMR)
- `npm run build` — static build to `dist/` (+ `404.html`, `.nojekyll`)
- `npm run preview` — serve the production build
- `npm run deploy` — build and push `dist/` to the `gh-pages` branch

## Verification status

- Production build passes.
- All 234 docs compile via the runtime MDX pipeline (0 failures).
- All 234 docs server-render through the full component tree (0 failures, none empty).
