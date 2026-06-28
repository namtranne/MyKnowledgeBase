# Personal Knowledge Base

A custom **React (Vite + React Router)** site that renders Markdown/MDX notes with
purpose-built components, reading-progress tracking, and real diagram rendering.
Migrated from Docusaurus to give full control over styling and features.

## Prerequisites

- Node.js 18+
- npm (or pnpm)

## Run locally

```bash
npm install
npm run dev
```

Dev server: `http://localhost:5173/MyKnowledgeBase/`

## Build for production

```bash
npm run build     # outputs static site to dist/ (+ 404.html, .nojekyll for SPA hosting)
npm run preview   # serve the production build locally
```

The base path defaults to `/MyKnowledgeBase/` (for GitHub Pages). For a root
deployment or quick local use, override it:

```bash
VITE_BASE=/ npm run build
```

## How it works

- **Content stays as Markdown/MDX** under `docs/`. Nothing was hand-converted —
  every page is compiled at runtime by a small MDX pipeline, so editing a note is
  just editing its `.md` file.
- **Navigation** is generated automatically from the `docs/` folder structure and
  `_category_.json` files (same convention as before).
- **Reading progress**: every section (H2) on *Technical Knowledge* and *Books*
  pages has a "Mark read" toggle. Per-page and per-topic percentages show in the
  sidebar; progress is saved in `localStorage`.
- **Diagrams**: ASCII/box-drawing diagrams render as styled diagram cards; fenced
  ` ```mermaid ` blocks render as real graphs; `<Chart>` renders data as bar/line/
  area/pie charts.

See `REPO_SUMMARY.md` for the full architecture and component map.

## Authoring tips

- **Real graph from text:** replace an ASCII diagram fence with a `mermaid` fence:

  ````md
  ```mermaid
  flowchart LR
    A[Client] --> B[Load Balancer] --> C[Web Server]
  ```
  ````

- **Data chart:**

  ```mdx
  <Chart type="bar" data={[{name:'p50',ms:12},{name:'p99',ms:80}]} x="name" series={["ms"]} />
  ```

- **Callouts:** the Docusaurus `:::tip`, `:::warning`, `:::info`, `:::note`,
  `:::danger` syntax still works.
- **Q&A block:** `<QnA question="...">answer</QnA>`.
