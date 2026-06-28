import { useMemo } from 'react';

// Cell geometry (monospace grid → SVG coordinates)
const CW = 8.8;   // cell width
const CH = 19;    // cell height
const PAD = 14;   // svg padding

const H_CHARS = new Set('─┄┈╌━┬┴┼╦╩╬═╤╧╪');
const V_CHARS = new Set('│┊┆╎┃├┤┼╠╣╬║╟╢╫');
const TL = new Set('┌╔╓╒┏');
const TR = new Set('┐╗╖╕┓');
const BL = new Set('└╚╙╘┗');
const BR = new Set('┘╝╜╛┛');
const ARROWS = new Set('▶◀▲▼►◄△▽→←↑↓');
const ANY_BOX = new Set(
  [...H_CHARS, ...V_CHARS, ...TL, ...TR, ...BL, ...BR, ...'┣┫┳┻╋'].join('')
);

function isHoriz(ch) { return H_CHARS.has(ch) || TL.has(ch) || TR.has(ch) || BL.has(ch) || BR.has(ch); }
function isVert(ch) { return V_CHARS.has(ch) || TL.has(ch) || TR.has(ch) || BL.has(ch) || BR.has(ch); }

function parse(text) {
  const rawLines = text.replace(/\t/g, '    ').replace(/\s+$/g, '').split('\n');
  // trim leading/trailing fully-blank lines
  while (rawLines.length && !rawLines[0].trim()) rawLines.shift();
  while (rawLines.length && !rawLines[rawLines.length - 1].trim()) rawLines.pop();
  const rows = rawLines.length;
  const cols = rawLines.reduce((m, l) => Math.max(m, l.length), 0);
  if (!rows || !cols) return null;

  const g = rawLines.map((l) => l.padEnd(cols, ' '));
  const at = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols ? g[r][c] : ' ');
  const consumed = Array.from({ length: rows }, () => new Array(cols).fill(false));

  // ── detect rectangles ──
  const rects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (consumed[r][c]) continue;
      if (!TL.has(at(r, c))) continue;
      // top edge
      let c2 = -1;
      for (let cc = c + 1; cc < cols; cc++) {
        const ch = at(r, cc);
        if (TR.has(ch)) { c2 = cc; break; }
        if (!H_CHARS.has(ch)) break;
      }
      if (c2 < 0) continue;
      // left edge
      let r2 = -1;
      for (let rr = r + 1; rr < rows; rr++) {
        const ch = at(rr, c);
        if (BL.has(ch)) { r2 = rr; break; }
        if (!V_CHARS.has(ch)) break;
      }
      if (r2 < 0) continue;
      // validate bottom-right + edges
      if (!BR.has(at(r2, c2))) continue;
      let ok = true;
      for (let cc = c + 1; cc < c2 && ok; cc++) if (!H_CHARS.has(at(r2, cc))) ok = false;
      for (let rr = r + 1; rr < r2 && ok; rr++) if (!V_CHARS.has(at(rr, c2))) ok = false;
      if (!ok) continue;

      // label = interior text
      const lines = [];
      for (let rr = r + 1; rr < r2; rr++) {
        let seg = '';
        for (let cc = c + 1; cc < c2; cc++) {
          const ch = at(rr, cc);
          seg += ANY_BOX.has(ch) ? ' ' : ch;
        }
        if (seg.trim()) lines.push(seg.trim());
      }
      rects.push({ r, c, r2, c2, label: lines });
      // consume border cells (keep interior free so nested boxes still parse)
      for (let cc = c; cc <= c2; cc++) { consumed[r][cc] = true; consumed[r2][cc] = true; }
      for (let rr = r; rr <= r2; rr++) { consumed[rr][c] = true; consumed[rr][c2] = true; }
    }
  }

  // ── connectors, arrows, free text from remaining cells ──
  const strokes = [];
  const arrows = [];
  const texts = [];
  for (let r = 0; r < rows; r++) {
    let textRun = '';
    let textStart = -1;
    const flushText = (endC) => {
      const t = textRun.replace(/\s+$/, '');
      const lead = t.length - t.trimStart().length;
      const s = t.trim();
      if (s) texts.push({ r, c: textStart + lead, text: s });
      textRun = ''; textStart = -1;
    };
    for (let c = 0; c < cols; c++) {
      const ch = at(r, c);
      if (consumed[r][c]) { flushText(c); continue; }
      if (ch === ' ') { if (textRun) textRun += ' '; continue; }
      if (ANY_BOX.has(ch)) {
        flushText(c);
        strokes.push({ r, c, ch });
      } else if (ARROWS.has(ch)) {
        flushText(c);
        arrows.push({ r, c, ch });
      } else {
        if (textStart < 0) textStart = c;
        textRun += ch;
      }
    }
    flushText(cols);
  }

  return { rows, cols, rects, strokes, arrows, texts, at, consumed };
}

// Build the small SVG path for a single box-drawing character within its cell.
function cellPath(ch, x, y) {
  const mx = x + CW / 2, my = y + CH / 2;
  const x0 = x, x1 = x + CW, y0 = y, y1 = y + CH;
  const seg = [];
  const horiz = isHoriz(ch);
  const vert = isVert(ch);
  if (TL.has(ch)) { seg.push(`M${mx} ${y1}L${mx} ${my}L${x1} ${my}`); return seg.join(''); }
  if (TR.has(ch)) { seg.push(`M${x0} ${my}L${mx} ${my}L${mx} ${y1}`); return seg.join(''); }
  if (BL.has(ch)) { seg.push(`M${mx} ${y0}L${mx} ${my}L${x1} ${my}`); return seg.join(''); }
  if (BR.has(ch)) { seg.push(`M${x0} ${my}L${mx} ${my}L${mx} ${y0}`); return seg.join(''); }
  if (ch === '┼' || ch === '╬') return `M${x0} ${my}L${x1} ${my}M${mx} ${y0}L${mx} ${y1}`;
  if (ch === '┬' || ch === '╦') return `M${x0} ${my}L${x1} ${my}M${mx} ${my}L${mx} ${y1}`;
  if (ch === '┴' || ch === '╩') return `M${x0} ${my}L${x1} ${my}M${mx} ${my}L${mx} ${y0}`;
  if (ch === '├' || ch === '╠') return `M${mx} ${y0}L${mx} ${y1}M${mx} ${my}L${x1} ${my}`;
  if (ch === '┤' || ch === '╣') return `M${mx} ${y0}L${mx} ${y1}M${x0} ${my}L${mx} ${my}`;
  if (horiz) return `M${x0} ${my}L${x1} ${my}`;
  if (vert) return `M${mx} ${y0}L${mx} ${y1}`;
  return '';
}

const DOT_COLORS = ['#00f0ff', '#a855f7', '#f472b6', '#34d399'];

// Find vertical / horizontal runs of connector cells for the flowing dots.
function findRuns(model) {
  const { rows, cols, at, consumed } = model;
  const runs = [];
  const vCell = (r, c) => !consumed[r][c] && (V_CHARS.has(at(r, c)) || at(r, c) === '│');
  const hCell = (r, c) => !consumed[r][c] && (H_CHARS.has(at(r, c)) || at(r, c) === '─');
  // vertical
  for (let c = 0; c < cols; c++) {
    let start = -1;
    for (let r = 0; r <= rows; r++) {
      if (r < rows && vCell(r, c)) { if (start < 0) start = r; }
      else { if (start >= 0 && r - start >= 2) runs.push({ dir: 'v', c, r0: start, r1: r - 1 }); start = -1; }
    }
  }
  // horizontal
  for (let r = 0; r < rows; r++) {
    let start = -1;
    for (let c = 0; c <= cols; c++) {
      if (c < cols && hCell(r, c)) { if (start < 0) start = c; }
      else { if (start >= 0 && c - start >= 2) runs.push({ dir: 'h', r, c0: start, c1: c - 1 }); start = -1; }
    }
  }
  return runs.slice(0, 60); // cap for performance
}

export default function AsciiGraph({ code }) {
  const model = useMemo(() => {
    try { return parse(code); } catch { return null; }
  }, [code]);

  // Fall back to plain text if there's nothing box-like to render.
  if (!model || (model.rects.length === 0 && model.strokes.length < 3)) {
    return <pre className="ascii-fallback">{code.replace(/\n$/, '')}</pre>;
  }

  const { rows, cols, rects, strokes, arrows, texts } = model;
  const W = cols * CW + PAD * 2;
  const Hh = rows * CH + PAD * 2;
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const runs = reduceMotion ? [] : findRuns(model);
  const X = (c) => PAD + c * CW;
  const Y = (r) => PAD + r * CH;

  const strokePath = strokes.map((s) => cellPath(s.ch, X(s.c), Y(s.r))).join(' ');

  return (
    <svg
      className="ascii-graph"
      viewBox={`0 0 ${W} ${Hh}`}
      width={W}
      style={{ maxWidth: '100%', height: 'auto' }}
      role="img"
    >
      <defs>
        <filter id="ag-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* connector strokes */}
      <path d={strokePath} className="ag-stroke" fill="none" />

      {/* rectangles (components) */}
      {rects.map((rc, i) => {
        const x = X(rc.c), y = Y(rc.r);
        const w = (rc.c2 - rc.c) * CW, h = (rc.r2 - rc.r) * CH;
        const cy = y + h / 2 - ((rc.label.length - 1) * CH) / 2 + 4;
        return (
          <g key={`r${i}`} className="ag-node">
            <rect x={x} y={y} width={w} height={h} rx="8" />
            {rc.label.map((ln, j) => (
              <text key={j} x={x + w / 2} y={cy + j * CH} textAnchor="middle" className="ag-node-text">
                {ln}
              </text>
            ))}
          </g>
        );
      })}

      {/* arrowheads */}
      {arrows.map((a, i) => {
        const cx = X(a.c) + CW / 2, cy = Y(a.r) + CH / 2;
        const d = a.ch;
        let pts;
        if (d === '▶' || d === '►' || d === '→') pts = `${cx - 4},${cy - 4} ${cx + 4},${cy} ${cx - 4},${cy + 4}`;
        else if (d === '◀' || d === '◄' || d === '←') pts = `${cx + 4},${cy - 4} ${cx - 4},${cy} ${cx + 4},${cy + 4}`;
        else if (d === '▲' || d === '△' || d === '↑') pts = `${cx - 4},${cy + 4} ${cx},${cy - 4} ${cx + 4},${cy + 4}`;
        else pts = `${cx - 4},${cy - 4} ${cx},${cy + 4} ${cx + 4},${cy - 4}`;
        return <polygon key={`a${i}`} points={pts} className="ag-arrow" />;
      })}

      {/* free-floating text (labels outside boxes) */}
      {texts.map((t, i) => (
        <text key={`t${i}`} x={X(t.c)} y={Y(t.r) + CH * 0.7} className="ag-text">{t.text}</text>
      ))}

      {/* flowing dots along connector runs */}
      {runs.map((run, i) => {
        const color = DOT_COLORS[i % DOT_COLORS.length];
        let path;
        let len;
        if (run.dir === 'v') {
          const x = X(run.c) + CW / 2;
          path = `M${x} ${Y(run.r0) + CH / 2}L${x} ${Y(run.r1) + CH / 2}`;
          len = (run.r1 - run.r0) * CH;
        } else {
          const y = Y(run.r) + CH / 2;
          path = `M${X(run.c0) + CW / 2} ${y}L${X(run.c1) + CW / 2} ${y}`;
          len = (run.c1 - run.c0) * CW;
        }
        const dur = Math.max(1.4, Math.min(3.5, len / 70));
        return (
          <circle key={`d${i}`} r="3" fill={color} color={color} className="ag-dot">
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={path} rotate="auto" />
          </circle>
        );
      })}
    </svg>
  );
}
