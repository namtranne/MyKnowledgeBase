import { useEffect, useRef, useState } from 'react';

let mermaidPromise = null;
let idCounter = 0;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => {
      const mermaid = m.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        // htmlLabels lets labels auto-size to multi-line content (no clipping).
        flowchart: { htmlLabels: true, useMaxWidth: true, padding: 14, nodeSpacing: 55, rankSpacing: 60, curve: 'basis' },
        themeVariables: {
          background: '#0f1629',
          primaryColor: '#151d33',
          primaryBorderColor: '#00f0ff',
          primaryTextColor: '#e2e8f0',
          lineColor: '#00f0ff',
          secondaryColor: '#1b2540',
          tertiaryColor: '#0f1629',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '15px',
          // edge-label background must match the canvas exactly so it masks the
          // line behind the text without showing a visible box.
          edgeLabelBackground: '#0f1629',
        },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

const SVGNS = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';
const DOT_COLORS = ['#00f0ff', '#a855f7', '#f472b6', '#34d399'];

// Inject glowing dots that travel along every edge path — the "data flowing
// between components" effect. Skipped when the user prefers reduced motion.
function injectFlowDots(svgEl, baseId) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const paths = svgEl.querySelectorAll(
    '.edgePaths path, path.flowchart-link, .edge path, .relation'
  );
  paths.forEach((p, i) => {
    const len = typeof p.getTotalLength === 'function' ? p.getTotalLength() : 0;
    if (!len) return;
    if (!p.id) p.id = `${baseId}-edge-${i}`;
    const color = DOT_COLORS[i % DOT_COLORS.length];
    const dur = Math.max(1.6, Math.min(4, len / 90)); // speed scales with length
    const dots = len > 240 ? 2 : 1; // longer edges get a small stream
    for (let d = 0; d < dots; d++) {
      const dot = document.createElementNS(SVGNS, 'circle');
      dot.setAttribute('r', '3.4');
      dot.setAttribute('fill', color);
      dot.setAttribute('color', color); // drives currentColor glow in CSS
      dot.setAttribute('class', 'flow-dot');
      const anim = document.createElementNS(SVGNS, 'animateMotion');
      anim.setAttribute('dur', `${dur}s`);
      anim.setAttribute('repeatCount', 'indefinite');
      anim.setAttribute('begin', `${(dur / dots) * d}s`);
      anim.setAttribute('rotate', 'auto');
      const mpath = document.createElementNS(SVGNS, 'mpath');
      mpath.setAttributeNS(XLINK, 'href', `#${p.id}`);
      mpath.setAttribute('href', `#${p.id}`);
      anim.appendChild(mpath);
      dot.appendChild(anim);
      svgEl.appendChild(dot);
    }
  });
}

// Renders a ```mermaid fenced block as a real, animated diagram.
export default function Mermaid({ code }) {
  const ref = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadMermaid()
      .then(async (mermaid) => {
        const id = `mmd-${idCounter++}`;
        try {
          const { svg } = await mermaid.render(id, code.trim());
          if (!cancelled && ref.current) {
            ref.current.innerHTML = svg;
            const svgEl = ref.current.querySelector('svg');
            if (svgEl) {
              try { injectFlowDots(svgEl, id); } catch { /* non-fatal */ }
            }
          }
        } catch (err) {
          if (!cancelled) setError(err.message || String(err));
        }
      })
      .catch((err) => !cancelled && setError(String(err)));
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="mermaid-host">
        <pre className="mermaid-error">Mermaid error: {error}{'\n\n'}{code}</pre>
      </div>
    );
  }
  return <div className="mermaid-host" ref={ref} />;
}
