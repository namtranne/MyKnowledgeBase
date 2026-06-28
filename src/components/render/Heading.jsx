import { useDoc } from './DocContext.jsx';
import SectionCheckbox from '../progress/SectionCheckbox.jsx';

// Factory producing h1..h6 components. rehype-slug injects `id` onto each
// heading; we add a hover anchor link and (for H2 on tracked pages) a
// reading-progress checkbox.
export function makeHeading(level) {
  const Tag = `h${level}`;
  return function Heading({ id, children, ...rest }) {
    const { tracked } = useDoc();
    const showCheck = level === 2 && tracked && id;
    return (
      <Tag id={id} {...rest}>
        {children}
        {id && (
          <a className="heading-anchor" href={`#${id}`} aria-label="Direct link to section">
            #
          </a>
        )}
        {showCheck && <SectionCheckbox id={id} />}
      </Tag>
    );
  };
}
