import { Link } from 'react-router-dom';
import { resolveLink } from '../../content/loader.js';
import { useDoc } from './DocContext.jsx';

// Rewrites markdown links: relative/absolute doc links become SPA router
// links; external links open in a new tab with a marker.
export default function Anchor({ href, children, ...rest }) {
  const { doc } = useDoc();
  const resolved = resolveLink(href, doc);

  if (resolved.type === 'external') {
    return (
      <a
        className="md-link md-link__external"
        href={resolved.to}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  }

  if (resolved.type === 'anchor') {
    return (
      <a className="md-link" href={resolved.to} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link className="md-link" to={resolved.to} {...rest}>
      {children}
    </Link>
  );
}
