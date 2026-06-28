import { docs, TRACKED_TOP } from './loader.js';

// Count level-2 headings (## ) outside code fences — these are the
// "sections" that reading-progress checkboxes attach to.
export function countH2(body) {
  let inFence = false;
  let marker = '';
  let count = 0;
  for (const line of body.split('\n')) {
    const t = line.trim();
    const fence = t.match(/^(```+|~~~+)/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        marker = fence[1][0].repeat(3);
      } else if (t.startsWith(marker)) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    if (/^##\s+\S/.test(t) && !/^###/.test(t)) count++;
  }
  return count;
}

// route -> { count, tracked }
export const sectionInfoByRoute = new Map();
for (const doc of docs) {
  const tracked = doc.dirRel ? TRACKED_TOP.has(doc.dirRel.split('/')[0]) : false;
  sectionInfoByRoute.set(doc.route, { count: countH2(doc.body), tracked });
}

export function getSectionCount(route) {
  return sectionInfoByRoute.get(route)?.count || 0;
}

export function isTrackedRoute(route) {
  return !!sectionInfoByRoute.get(route)?.tracked;
}
