// Minimal, dependency-free frontmatter parser.
// Handles the simple `key: value` YAML used across the docs
// (title, sidebar_position, slug, id, sidebar_label, description).

function coerce(value) {
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v !== '' && !Number.isNaN(Number(v))) return Number(v);
  return v;
}

/**
 * Split a raw markdown string into { data, content }.
 * `data` is the parsed frontmatter object, `content` is the body (frontmatter removed).
 */
export function parseFrontmatter(raw) {
  const text = raw.replace(/^﻿/, '');
  if (!text.startsWith('---')) return { data: {}, content: text };

  // Find the closing --- on its own line.
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, content: text };

  const block = match[1];
  const content = text.slice(match[0].length);
  const data = {};

  for (const line of block.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    if (!key) continue;
    data[key] = value.trim() === '' ? '' : coerce(value);
  }

  return { data, content };
}
