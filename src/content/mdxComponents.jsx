import { makeHeading } from '../components/render/Heading.jsx';
import Anchor from '../components/render/Anchor.jsx';
import Table from '../components/render/Table.jsx';
import CodeBlock from '../components/render/CodeBlock.jsx';
import Callout from '../components/render/Callout.jsx';
import Mermaid from '../components/render/Mermaid.jsx';
import Diagram from '../components/render/Diagram.jsx';
import Chart from '../components/render/Chart.jsx';
import QnA from '../components/render/QnA.jsx';

// Legacy interactive components embedded in DSA MDX pages.
import AlgoViz from '../components/AlgoViz/index.jsx';
import KafkaConnectArchitecture from '../components/KafkaConnectArchitecture/index.jsx';
import KafkaConnectPipeline from '../components/KafkaConnectPipeline/index.jsx';

// The component map handed to compiled MDX content. Lowercase keys override
// intrinsic HTML elements; capitalized keys resolve JSX tags used in content.
export const mdxComponents = {
  h1: makeHeading(1),
  h2: makeHeading(2),
  h3: makeHeading(3),
  h4: makeHeading(4),
  h5: makeHeading(5),
  h6: makeHeading(6),
  a: Anchor,
  table: Table,
  pre: CodeBlock,
  // custom / embedded
  Callout,
  Mermaid,
  Diagram,
  Chart,
  QnA,
  AlgoViz,
  KafkaConnectArchitecture,
  KafkaConnectPipeline,
};
