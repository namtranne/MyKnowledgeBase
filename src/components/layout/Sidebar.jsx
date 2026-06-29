import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { tree } from '../../content/loader.js';
import { useProgress } from '../progress/ProgressContext.jsx';
import NavMenu from './NavMenu.jsx';

// Collect every tracked doc route beneath a node (for category percentages).
function docRoutesUnder(node, acc = []) {
  if (node.type === 'category') {
    if (node.indexDoc) acc.push(node.indexDoc.route);
    node.children.forEach((c) => docRoutesUnder(c, acc));
  } else if (node.type === 'doc') {
    acc.push(node.route);
  } else if (node.children) {
    node.children.forEach((c) => docRoutesUnder(c, acc));
  }
  return acc;
}

function ancestorsOf(route) {
  // route like /docs/Technical-Knowledge/Kafka/Foo -> dirRels of ancestors
  const rel = route.replace(/^\/docs\/?/, '');
  const parts = rel.split('/').filter(Boolean);
  const set = new Set();
  let acc = '';
  for (let i = 0; i < parts.length; i++) {
    acc = acc ? acc + '/' + parts[i] : parts[i];
    set.add(acc);
  }
  return set;
}

function Pct({ routes }) {
  const { getRoutesStats } = useProgress();
  const { total, pct } = getRoutesStats(routes);
  if (!total) return null;
  const cls = pct === 0 ? 'zero' : pct === 100 ? 'done' : '';
  return <span className={`tree-pct ${cls}`}>{pct}%</span>;
}

function TreeNode({ node, depth, expanded, toggle, currentPath }) {
  const { getPageStats } = useProgress();

  if (node.type === 'doc') {
    const active = currentPath === node.route;
    const stats = node.tracked ? getPageStats(node.route) : null;
    return (
      <Link to={node.route} className={`tree-row${active ? ' active' : ''}`}>
        <span className="tree-caret" />
        <span className="tree-label">{node.label}</span>
        {stats && stats.total > 0 && (
          <span className={`tree-pct ${stats.pct === 0 ? 'zero' : stats.pct === 100 ? 'done' : ''}`}>
            {stats.pct}%
          </span>
        )}
      </Link>
    );
  }

  // category
  const isOpen = expanded.has(node.dirRel);
  const active = currentPath === node.route;
  const routes = useMemo(() => docRoutesUnder(node), [node]);
  return (
    <div className="tree-item">
      <div className={`tree-row is-category${active ? ' active' : ''}`} style={{ paddingRight: 4 }}>
        <button
          className={`tree-caret ${isOpen ? 'open' : ''}`}
          onClick={(e) => { e.preventDefault(); toggle(node.dirRel); }}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ▶
        </button>
        <Link to={node.route} className="tree-label" style={{ color: 'inherit' }}>
          {node.label}
        </Link>
        {node.tracked && <Pct routes={routes} />}
      </div>
      {isOpen && (
        <div className="tree-children">
          {node.children.map((child, i) => (
            <TreeNode
              key={child.route || child.dirRel || i}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              currentPath={currentPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const currentPath = location.pathname.replace(/\/$/, '') || location.pathname;
  const [expanded, setExpanded] = useState(() => ancestorsOf(currentPath));

  // auto-expand ancestors of the active page on navigation
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      ancestorsOf(currentPath).forEach((a) => next.add(a));
      return next;
    });
  }, [currentPath]);

  const toggle = (dirRel) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dirRel)) next.delete(dirRel);
      else next.add(dirRel);
      return next;
    });

  return (
    <>
      <div className={`sidebar__backdrop${open ? ' show' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`} onClick={(e) => {
        if (e.target.closest('a')) onClose?.();
      }}>
        <div className="sidebar__nav-mobile">
          <div className="sidebar__group-label">Navigation</div>
          <NavMenu onNavigate={onClose} />
        </div>
        <div className="sidebar__group-label">Documentation</div>
        {tree.children.map((node, i) => (
          <TreeNode
            key={node.route || node.dirRel || i}
            node={node}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            currentPath={currentPath}
          />
        ))}
      </aside>
    </>
  );
}
