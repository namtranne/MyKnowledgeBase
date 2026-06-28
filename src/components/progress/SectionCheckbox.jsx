import { useProgress } from './ProgressContext.jsx';
import { useDoc } from '../render/DocContext.jsx';

// A small "mark as read" pill rendered inline beside section (H2) headings
// on tracked pages (Technical Knowledge & Books).
export default function SectionCheckbox({ id }) {
  const { route } = useDoc();
  const { isChecked, toggleSection } = useProgress();
  if (!id) return null;
  const checked = isChecked(route, id);

  return (
    <button
      type="button"
      className={`section-check${checked ? ' checked' : ''}`}
      aria-pressed={checked}
      title={checked ? 'Marked as read' : 'Mark this section as read'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSection(route, id);
      }}
    >
      <span className="section-check__box">{checked ? '✓' : ''}</span>
      {checked ? 'Read' : 'Mark read'}
    </button>
  );
}
