// Renders ASCII / box-drawing diagrams as a styled "diagram" card so the
// text-art looks intentional and legible rather than like a raw code block.
export default function Diagram({ code, title = 'Diagram' }) {
  return (
    <figure className="diagram">
      <figcaption className="diagram__head">{title}</figcaption>
      <pre>{code.replace(/\n$/, '')}</pre>
    </figure>
  );
}
