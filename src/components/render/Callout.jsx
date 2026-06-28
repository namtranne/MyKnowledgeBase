const ICONS = {
  tip: '💡',
  info: 'ℹ️',
  note: '📝',
  warning: '⚠️',
  caution: '⚠️',
  danger: '🚫',
  important: '❗',
  success: '✅',
};

const DEFAULT_TITLES = {
  tip: 'Tip',
  info: 'Info',
  note: 'Note',
  warning: 'Warning',
  caution: 'Caution',
  danger: 'Danger',
  important: 'Important',
  success: 'Success',
};

// Renders Docusaurus-style admonitions converted during preprocessing.
export default function Callout({ type = 'note', title, children }) {
  const t = String(type).toLowerCase();
  const label = title || DEFAULT_TITLES[t] || 'Note';
  return (
    <div className={`callout callout--${t}`}>
      <div className="callout__title">
        <span aria-hidden>{ICONS[t] || '📝'}</span>
        {label}
      </div>
      <div className="callout__body">{children}</div>
    </div>
  );
}
