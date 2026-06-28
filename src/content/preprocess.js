// Transform raw Docusaurus-flavoured MDX into MDX our runtime can compile:
//  1. Strip MDX `import`/`export` statements (we provide components via scope).
//  2. Convert Docusaurus admonitions (:::tip ... :::) into <Callout> JSX.
// Code fences are respected so Java/Python imports inside ``` are untouched.

const KNOWN_TYPES = new Set([
  'tip', 'info', 'note', 'warning', 'caution', 'danger', 'important', 'success',
]);

// Emit a JSX expression-container attribute value so any character
// (quotes, braces, etc.) survives MDX parsing.
function jsxAttr(s) {
  return `{${JSON.stringify(s)}}`;
}

export function preprocessMdx(body) {
  const lines = body.split('\n');
  const out = [];
  const calloutStack = [];
  let inFence = false;
  let fenceMarker = '';

  for (let raw of lines) {
    const line = raw;
    const trimmed = line.trim();

    // Track code fences (``` or ~~~ with optional language)
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1][0].repeat(3);
      } else if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
      }
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }

    // Strip MDX import/export statements (top-level, not inside fences)
    if (/^\s*(import|export)\s+[^\n]*$/.test(line) && /from\s+['"]|=\s|\{|\*/.test(line)) {
      // be conservative: only strip lines that look like JS module statements
      if (/^\s*import\s+[\w*{].*from\s+['"]/.test(line) || /^\s*export\s+(default|const|function|\{)/.test(line)) {
        continue;
      }
    }

    // Docusaurus explicit heading id:  ## Heading {#custom-id}
    // Convert to an HTML heading so MDX doesn't treat {#id} as a JS expression.
    const hid = line.match(/^(#{1,6})\s+(.*?)\s*\{#([-\w]+)\}\s*$/);
    if (hid) {
      const level = hid[1].length;
      const text = hid[2].replace(/</g, '&lt;');
      out.push('');
      out.push(`<h${level} id="${hid[3]}">${text}</h${level}>`);
      out.push('');
      continue;
    }

    // Admonition opener:  :::type [Title]  or  :::type[Title]
    const open = trimmed.match(/^:::([a-zA-Z][\w-]*)\s*(?:\[(.*?)\]|\s+(.*))?$/);
    const isClose = trimmed === ':::';

    if (open && !isClose) {
      const typeRaw = open[1].toLowerCase();
      const title = (open[2] || open[3] || '').trim();
      const type = KNOWN_TYPES.has(typeRaw) ? typeRaw : 'note';
      calloutStack.push(true);
      const titleAttr = title ? ` title=${jsxAttr(title)}` : '';
      out.push('');
      out.push(`<Callout type=${jsxAttr(type)}${titleAttr}>`);
      out.push('');
      continue;
    }

    if (isClose && calloutStack.length > 0) {
      calloutStack.pop();
      out.push('');
      out.push('</Callout>');
      out.push('');
      continue;
    }

    out.push(line);
  }

  // Close any unbalanced callouts
  while (calloutStack.length > 0) {
    calloutStack.pop();
    out.push('');
    out.push('</Callout>');
  }

  return out.join('\n');
}
