import { flatDocs, getBreadcrumbs } from './loader.js';

// Build a lightweight in-memory search index once.
const index = flatDocs.map((doc) => {
  const crumbs = getBreadcrumbs(doc.route).map((c) => c.label);
  const plain = doc.body
    .replace(/```[\s\S]*?```/g, ' ') // drop code blocks
    .replace(/[#>*`_|]/g, ' ')
    .replace(/\s+/g, ' ');
  return {
    route: doc.route,
    title: doc.title,
    crumb: crumbs.join(' › '),
    lowerTitle: doc.title.toLowerCase(),
    lowerBody: plain.toLowerCase(),
    plain,
  };
});

export function searchDocs(query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = [];
  for (const entry of index) {
    let score = 0;
    let snippet = '';
    for (const term of terms) {
      if (entry.lowerTitle.includes(term)) score += 10;
      const bi = entry.lowerBody.indexOf(term);
      if (bi >= 0) {
        score += 2;
        if (!snippet) {
          const start = Math.max(0, bi - 40);
          snippet = (start > 0 ? '…' : '') + entry.plain.slice(start, bi + 60).trim() + '…';
        }
      }
    }
    if (score > 0) scored.push({ ...entry, score, snippet });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
