import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  getDocByRoute, getCategoryByRoute, getAdjacentDocs, getBreadcrumbs,
} from '../content/loader.js';
import { isTrackedRoute, getSectionCount } from '../content/sections.js';
import { useMdx } from '../content/useMdx.js';
import { mdxComponents } from '../content/mdxComponents.jsx';
import { DocContext } from '../components/render/DocContext.jsx';
import TableOfContents from '../components/layout/TableOfContents.jsx';
import Pagination from '../components/layout/Pagination.jsx';
import PageProgress from '../components/progress/PageProgress.jsx';

function Breadcrumbs({ route }) {
  const crumbs = getBreadcrumbs(route);
  return (
    <div className="breadcrumbs">
      <Link to="/docs/intro">Docs</Link>
      {crumbs.map((c) => (
        <span key={c.route} style={{ display: 'contents' }}>
          <span className="breadcrumbs__sep">/</span>
          <Link to={c.route}>{c.label}</Link>
        </span>
      ))}
    </div>
  );
}

function CategoryLanding({ category }) {
  return (
    <div className="doc-area">
      <div className="doc-area-inner markdown-body">
        <Breadcrumbs route={category.route} />
        <h1>{category.label}</h1>
        <p>Browse the {category.children.length} item{category.children.length === 1 ? '' : 's'} in this section.</p>
        <div className="cat-grid">
          {category.children.map((child) => {
            const route = child.route;
            const count = child.type === 'doc' ? getSectionCount(route) : null;
            return (
              <Link key={route} to={route} className="cat-card">
                <span className="cat-card__title">
                  {child.type === 'category' ? '📁 ' : '📄 '}{child.label}
                </span>
                {child.type === 'category' ? (
                  <span className="cat-card__meta">{child.children.length} items</span>
                ) : count ? (
                  <span className="cat-card__meta">{count} sections</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DocBody({ doc, route }) {
  const tracked = isTrackedRoute(route);
  const articleRef = useRef(null);
  const { Content, error, loading } = useMdx(doc.body, doc.fileRel);
  const location = useLocation();
  const { prev, next } = getAdjacentDocs(route);

  // scroll handling on navigation / after content renders
  useEffect(() => {
    if (loading) return;
    if (location.hash) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo({ top: 0 });
  }, [route, loading, location.hash]);

  return (
    <>
      <div className="doc-area">
        <div className="doc-area-inner">
          <DocContext.Provider value={{ route, tracked, doc }}>
            <Breadcrumbs route={route} />
            {tracked && <PageProgress route={route} />}
            <article className="markdown-body" ref={articleRef}>
              {loading && (
                <div className="spinner-wrap"><div className="spinner" /><span>Rendering…</span></div>
              )}
              {error && (
                <div className="md-error">Failed to render this page:{'\n'}{String(error.message || error)}</div>
              )}
              {!loading && !error && Content && <Content components={mdxComponents} />}
            </article>
            <Pagination prev={prev} next={next} />
          </DocContext.Provider>
        </div>
      </div>
      <TableOfContents targetRef={articleRef} contentKey={`${route}:${loading}`} />
    </>
  );
}

export default function DocPage() {
  const location = useLocation();
  let route = decodeURIComponent(location.pathname);
  if (route.length > 1) route = route.replace(/\/$/, '');

  const doc = getDocByRoute(route);
  if (doc) return <DocBody doc={doc} route={route} />;

  const category = getCategoryByRoute(route);
  if (category) {
    if (category.indexDoc) return <DocBody doc={category.indexDoc} route={category.indexDoc.route} />;
    return <CategoryLanding category={category} />;
  }

  return (
    <div className="doc-area">
      <div className="doc-area-inner markdown-body">
        <h1>404 — Not found</h1>
        <p>No document exists at <code>{route}</code>.</p>
        <p><Link to="/docs/intro">← Back to docs</Link></p>
      </div>
    </div>
  );
}
