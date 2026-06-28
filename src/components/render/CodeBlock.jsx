import { isValidElement, useState } from 'react';
import Mermaid from './Mermaid.jsx';
import Diagram from './Diagram.jsx';

// True box-drawing characters mark an actual diagram. Bare arrows (→ ▶) alone
// usually mean prose / API / math examples, so they no longer qualify.
const BOX_CHARS = /[┌┐└┘│─├┤┬┴┼╔╗╚╝║═╠╣╦╩╬]/;

function nodeToText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (isValidElement(node)) return nodeToText(node.props.children);
  return '';
}

function looksLikeDiagram(text) {
  if (BOX_CHARS.test(text)) return true;
  // ASCII corner boxes like +-----+ with vertical bars
  if (/\+[-=]{2,}\+/.test(text) && /\|/.test(text)) return true;
  return false;
}

// Replaces the default <pre> for fenced code blocks.
export default function CodeBlock({ children, ...rest }) {
  const [copied, setCopied] = useState(false);

  // children is normally a single <code> element
  const codeEl = Array.isArray(children) ? children[0] : children;
  const className =
    (isValidElement(codeEl) && codeEl.props.className) || rest.className || '';
  const langMatch = /language-([\w+-]+)/.exec(className);
  const lang = langMatch ? langMatch[1] : '';
  const text = nodeToText(children);

  if (lang === 'mermaid') return <Mermaid code={text} />;
  if (!lang || lang === 'text' || lang === 'plaintext' || lang === 'txt' || lang === 'ascii') {
    if (looksLikeDiagram(text)) return <Diagram code={text} />;
  } else if (looksLikeDiagram(text) && text.split('\n').length > 2) {
    // even labelled blocks that are clearly diagrams
    if (/^(diagram|graph|flow|arch|architecture)/.test(lang)) return <Diagram code={text} />;
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="code-block">
      <div className="code-block__head">
        <span className="code-block__lang">{lang || 'code'}</span>
        <button type="button" className="code-block__copy" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre>
        <code className={className}>{text}</code>
      </pre>
    </div>
  );
}
