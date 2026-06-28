import { useState } from 'react';

// Collapsible question / answer block for interview-style content.
// Usage in MDX:  <QnA question="What is X?">Answer markdown/JSX</QnA>
export default function QnA({ question, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`callout callout--info`} style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: 'none', border: 'none', color: 'var(--neon-cyan)',
          fontWeight: 700, fontSize: '0.95rem', padding: '0.85rem 1.1rem',
          display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: 'inherit',
        }}
      >
        <span style={{ color: 'var(--neon-purple)' }}>{open ? '▾' : '▸'}</span>
        <span style={{ color: 'var(--text-primary)' }}>{question}</span>
      </button>
      {open && (
        <div className="callout__body" style={{ padding: '0 1.1rem 0.9rem 2.3rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}
