import AsciiGraph from './AsciiGraph.jsx';

// Renders ASCII / box-drawing diagrams as an animated neon SVG graph — the
// box layout is preserved exactly (no semantic guessing), boxes become glowing
// components, connectors glow, and dots flow along the lines.
export default function Diagram({ code, title = 'Diagram' }) {
  return (
    <figure className="diagram">
      <figcaption className="diagram__head">{title}</figcaption>
      <div className="diagram__canvas">
        <AsciiGraph code={code} />
      </div>
    </figure>
  );
}
