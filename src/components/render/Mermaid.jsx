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
        themeVariables: {
          background: '#0f1629',
          primaryColor: '#151d33',
          primaryBorderColor: '#00f0ff',
          primaryTextColor: '#e2e8f0',
          lineColor: '#64748b',
          secondaryColor: '#1b2540',
          tertiaryColor: '#0f1629',
          fontFamily: 'JetBrains Mono, monospace',
        },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

// Renders a ```mermaid fenced block as a real diagram.
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
          if (!cancelled && ref.current) ref.current.innerHTML = svg;
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
