import { parseFrontmatter } from './frontmatter.js';

// ── Eager-import every markdown file as a raw string ──
const rawModules = import.meta.glob('/docs/**/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// ── Eager-import every _category_.json ──
const categoryModules = import.meta.glob('/docs/**/_category_.json', {
  import: 'default',
  eager: true,
});

// Topics that get reading-progress tracking.
const TRACKED_TOP = new Set([
  'Technical-Knowledge',
  'Books',
  'DSA-Foundations',
  'DSA-Training',
]);

function prettify(name) {
  return name
    .replace(/\.(md|mdx)$/i, '')
    .replace(/^\d+[-_.]?\s*/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function firstHeading(body) {
  const m = body.match(/^\s*#\s+(.+?)\s*$/m);
  return m ? m[1].replace(/[`*_]/g, '').trim() : null;
}

// Category metadata keyed by directory relative path (e.g. "Technical-Knowledge/Kafka").
const categoryMeta = {};
for (const [path, json] of Object.entries(categoryModules)) {
  const dir = path.replace(/^\/docs\//, '').replace(/\/_category_\.json$/, '');
  categoryMeta[dir] = json || {};
}

// ── Parse every doc ──
const docs = []; // { fileRel, dirRel, base, isIndex, route, title, position, data, body }
for (const [path, raw] of Object.entries(rawModules)) {
  const fileRel = path.replace(/^\/docs\//, ''); // e.g. Technical-Knowledge/Kafka/index.md
  const { data, content } = parseFrontmatter(raw);
  const segments = fileRel.split('/');
  const filename = segments[segments.length - 1];
  const base = filename.replace(/\.(md|mdx)$/i, '');
  const dirRel = segments.slice(0, -1).join('/'); // '' for top-level
  const isIndex = /^index$/i.test(base) || /^readme$/i.test(base);

  const relNoExt = fileRel.replace(/\.(md|mdx)$/i, '');
  const route = isIndex
    ? '/docs' + (dirRel ? '/' + dirRel : '')
    : '/docs/' + relNoExt;

  const title =
    (typeof data.title === 'string' && data.title) ||
    data.sidebar_label ||
    firstHeading(content) ||
    prettify(base);

  const position =
    typeof data.sidebar_position === 'number'
      ? data.sidebar_position
      : Number.isFinite(Number(base.match(/^\d+/)?.[0]))
      ? Number(base.match(/^\d+/)[0])
      : 999;

  docs.push({
    fileRel,
    dirRel,
    base,
    isIndex,
    route,
    title,
    position,
    data,
    body: content,
  });
}

// ── Build the navigation tree ──
// Node: { type: 'doc'|'category', label, route, position, children?, doc?, dirRel?, tracked }
function ensureCategory(root, dirRel) {
  if (!dirRel) return root;
  const parts = dirRel.split('/');
  let node = root;
  let acc = '';
  for (const part of parts) {
    acc = acc ? acc + '/' + part : part;
    let child = node.children.find((c) => c.type === 'category' && c.dirRel === acc);
    if (!child) {
      const meta = categoryMeta[acc] || {};
      child = {
        type: 'category',
        dirRel: acc,
        label: meta.label || prettify(part),
        position: typeof meta.position === 'number' ? meta.position : 999,
        collapsed: meta.collapsed !== false,
        route: '/docs/' + acc,
        children: [],
        tracked: TRACKED_TOP.has(acc.split('/')[0]),
        indexDoc: null,
      };
      node.children.push(child);
    }
    node = child;
  }
  return node;
}

const tree = { type: 'root', children: [] };

for (const doc of docs) {
  const parent = ensureCategory(tree, doc.dirRel);
  const tracked = doc.dirRel ? TRACKED_TOP.has(doc.dirRel.split('/')[0]) : false;
  if (doc.isIndex && parent.type === 'category') {
    // index doc becomes the category's landing page
    parent.indexDoc = doc;
    parent.route = doc.route;
    if (typeof doc.position === 'number' && doc.position !== 999) {
      // keep category position from _category_.json; index position is for the doc
    }
  } else {
    parent.children.push({
      type: 'doc',
      label: doc.title,
      route: doc.route,
      position: doc.position,
      doc,
      tracked,
    });
  }
}

function sortTree(node) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.label.localeCompare(b.label);
  });
  node.children.forEach(sortTree);
}
sortTree(tree);

// ── Flat ordered list (DFS) for pagination / search ──
const flatDocs = [];
function collect(node) {
  for (const child of node.children) {
    if (child.type === 'category') {
      if (child.indexDoc) flatDocs.push({ ...child.indexDoc, isCategoryIndex: true });
      collect(child);
    } else {
      flatDocs.push(child.doc);
    }
  }
}
collect(tree);

// ── Route lookup maps ──
const docByRoute = new Map();
for (const doc of docs) docByRoute.set(doc.route.toLowerCase(), doc);

const categoryByRoute = new Map();
function indexCats(node) {
  for (const child of node.children) {
    if (child.type === 'category') {
      categoryByRoute.set(child.route.toLowerCase(), child);
      indexCats(child);
    }
  }
}
indexCats(tree);

const allRoutes = new Set([
  ...docByRoute.keys(),
  ...categoryByRoute.keys(),
]);

// ── Link resolution ──
function normalizeJoin(baseDir, href) {
  // baseDir like 'Technical-Knowledge/Kafka' (no leading slash, no /docs)
  const stack = baseDir ? baseDir.split('/') : [];
  for (const part of href.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

/**
 * Resolve a markdown link target relative to a doc's file path.
 * Returns { type: 'internal'|'external'|'anchor', to }.
 */
export function resolveLink(href, currentDoc) {
  if (!href) return { type: 'external', to: href };
  if (/^(https?:|mailto:|tel:|\/\/)/i.test(href)) return { type: 'external', to: href };
  if (href.startsWith('#')) return { type: 'anchor', to: href };

  // split off hash
  const hashIdx = href.indexOf('#');
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : '';
  let path = hashIdx >= 0 ? href.slice(0, hashIdx) : href;

  path = path.replace(/\.(md|mdx)$/i, '').replace(/\/$/, '');

  // Absolute app routes that aren't docs (e.g. /dsa-roadmap)
  if (path.startsWith('/') && !path.startsWith('/docs')) {
    return { type: 'internal', to: path + hash };
  }

  let candidate;
  if (path.startsWith('/docs')) {
    candidate = path.replace(/^\/docs\/?/, ''); // rel under docs
  } else if (path.startsWith('/')) {
    candidate = path.replace(/^\//, '');
  } else {
    // relative to current doc's directory
    const baseDir = currentDoc ? currentDoc.dirRel : '';
    candidate = normalizeJoin(baseDir, path);
  }

  const route = '/docs' + (candidate ? '/' + candidate : '');
  const lc = route.toLowerCase();
  if (allRoutes.has(lc)) {
    // use canonical casing
    const canonical =
      docByRoute.get(lc)?.route || categoryByRoute.get(lc)?.route || route;
    return { type: 'internal', to: canonical + hash };
  }
  // Unknown — still treat as internal doc route (may show not-found gracefully)
  return { type: 'internal', to: route + hash };
}

export function getDocByRoute(route) {
  return docByRoute.get(decodeURIComponent(route).toLowerCase()) || null;
}

export function getCategoryByRoute(route) {
  return categoryByRoute.get(decodeURIComponent(route).toLowerCase()) || null;
}

export function getAdjacentDocs(route) {
  const idx = flatDocs.findIndex((d) => d.route.toLowerCase() === route.toLowerCase());
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flatDocs[idx - 1] : null,
    next: idx < flatDocs.length - 1 ? flatDocs[idx + 1] : null,
  };
}

export function getBreadcrumbs(route) {
  const crumbs = [];
  const doc = getDocByRoute(route);
  const dirRel = doc ? doc.dirRel : getCategoryByRoute(route)?.dirRel || '';
  if (dirRel) {
    const parts = dirRel.split('/');
    let acc = '';
    for (const part of parts) {
      acc = acc ? acc + '/' + part : part;
      const cat = categoryByRoute.get(('/docs/' + acc).toLowerCase());
      crumbs.push({ label: cat ? cat.label : prettify(part), route: '/docs/' + acc });
    }
  }
  return crumbs;
}

export { tree, docs, flatDocs, prettify, TRACKED_TOP };
