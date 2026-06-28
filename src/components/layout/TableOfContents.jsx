import { useEffect, useState } from 'react';

// Builds an "On this page" TOC by reading the rendered headings (h2/h3 with
// ids from rehype-slug) out of the article DOM, with scroll-spy highlighting.
export default function TableOfContents({ targetRef, contentKey }) {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const root = targetRef.current;
    if (!root) return;
    const headings = Array.from(root.querySelectorAll('h2[id], h3[id]'));
    setItems(
      headings.map((h) => ({
        id: h.id,
        text: h.textContent.replace(/#$/, '').replace(/Mark read|Read$/,'').trim(),
        level: Number(h.tagName[1]),
      }))
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: [0, 1] }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [targetRef, contentKey]);

  if (items.length < 2) return null;

  return (
    <nav className="toc-desktop">
      <div className="toc-title">On this page</div>
      <ul className="toc-list">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`toc-link lvl-${it.level}${activeId === it.id ? ' active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth' });
                history.replaceState(null, '', `#${it.id}`);
              }}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
