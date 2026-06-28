// Compatibility shim replacing Docusaurus's @docusaurus/Link.
// Maps to react-router's Link. External/absolute URLs fall back to <a>.
import { Link as RouterLink } from 'react-router-dom';

export default function Link({ to, href, children, ...rest }) {
  const target = to || href || '';
  if (/^(https?:|mailto:|tel:|\/\/)/i.test(target)) {
    return (
      <a href={target} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <RouterLink to={target} {...rest}>
      {children}
    </RouterLink>
  );
}
