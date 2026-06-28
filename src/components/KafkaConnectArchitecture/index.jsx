import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './styles.module.css';

const nodes = [
  {
    id: 'terraform',
    label: 'Terraform',
    sublabel: 'Connector CRUD',
    group: 'management',
    col: 0, row: 0,
    icon: '🔧',
    phase: 1,
    description: 'Manages all 12 connectors via the Kafka Connect REST API. Uses the Mongey kafka-connect Terraform provider (v0.4.0) to declaratively create and update connector configurations across 12 environments.',
    details: [
      'PUT /connectors/{name}/config for each connector',
      'Basic Auth + mTLS authentication via Vault certs',
      '12 connectors × 12 environments = 144 resource definitions',
      'Config changes trigger rebalance for task redistribution',
    ],
  },
  {
    id: 'k8sProbes',
    label: 'K8s Probes',
    sublabel: 'Health Checks',
    group: 'management',
    col: 4, row: 0,
    icon: '🏥',
    phase: 1,
    description: 'Kubernetes runs three health probes per pod to manage the worker lifecycle. Each probe type uses a different mechanism and triggers a different action on failure.',
    details: [
      'Startup: httpGet / on 8083 — 120s delay + 25×60s = 27 min window',
      'Liveness: tcpSocket 8083 — 10×60s failures → restart container',
      'Readiness: httpGet / on 8083 — failures → remove from Service',
      'GET / does NOT verify tick thread health (Jetty responds immediately)',
      'tcpSocket for liveness avoids false restarts during rebalance',
    ],
  },
  {
    id: 'worker1',
    label: 'Worker 1',
    sublabel: 'Pod / AZ-A',
    group: 'worker',
    col: 1, row: 1,
    icon: '⚙️',
    phase: 2,
    description: 'Kafka Connect worker in Pod 1 (AZ-A). Each worker is a JVM process running connect-distributed, hosting a share of the cluster\'s connectors and tasks.',
    details: [
      'JVM: 1536MB heap (Xms=Xmx), G1GC, 640MB young gen',
      'CPU: 3 cores, Memory: 4GB total (2.5GB headroom)',
      '~22 tasks assigned via consumer group rebalance',
      'connect-distributed with env-templated properties',
      'Non-root (UID 988), read-only root filesystem',
    ],
  },
  {
    id: 'worker2',
    label: 'Worker 2',
    sublabel: 'Pod / AZ-B',
    group: 'worker',
    col: 2, row: 1,
    icon: '⚙️',
    phase: 2,
    description: 'Worker 2 in Pod 2 (AZ-B). Identical to Worker 1 — same image, same JVM settings. Kubernetes places it in a different availability zone via topology spread constraints.',
    details: [
      'Spread across AZ-B for fault tolerance',
      'Same ~22 tasks as other workers',
      'If this worker dies → tasks rebalance to W1 + W3',
      'Rolling update: this pod updates second',
      'maxUnavailable 25% → at least 2 of 3 always running',
    ],
  },
  {
    id: 'worker3',
    label: 'Worker 3',
    sublabel: 'Pod / AZ-C',
    group: 'worker',
    col: 3, row: 1,
    icon: '⚙️',
    phase: 2,
    description: 'Worker 3 in Pod 3 (AZ-C). Three workers form the production cluster, pinned at 3 replicas (no auto-scaling) to avoid unnecessary rebalances.',
    details: [
      'Spread across AZ-C for 3-AZ fault tolerance',
      'HPA min=max=3 — auto-scaling disabled intentionally',
      'PDB: maxUnavailable 34% (at most 1 pod down at a time)',
      'preStop hook: sleep 15s before SIGTERM',
      'terminationGracePeriodSeconds: 60s total',
    ],
  },
  {
    id: 'restApi',
    label: 'REST API',
    sublabel: 'Port 8083 / Jetty',
    group: 'internal',
    col: 1, row: 2,
    icon: '🌐',
    phase: 2,
    description: 'Embedded Jetty HTTP server on port 8083 exposing the Kafka Connect REST interface. Protected by Basic Auth via TlmBasicAuthSecurityRestExtension. All connector management goes through this API.',
    details: [
      'GET / — cluster info (does NOT go through tick thread)',
      'GET /connectors — list (reads local config state only)',
      'GET /connectors/{name} — GOES through tick thread',
      'POST/PUT/DELETE — connector CRUD (through tick thread)',
      'KIP-1017 will add dedicated GET /health endpoint',
    ],
  },
  {
    id: 'tickThread',
    label: 'Tick Thread',
    sublabel: 'Critical Single Thread',
    group: 'internal',
    col: 2, row: 2,
    icon: '🧵',
    phase: 2,
    description: 'The single most important thread in Kafka Connect. Drives group membership, processes connector CRUD, and handles rebalance events. If blocked, the worker cannot handle any connector operations.',
    details: [
      'Single thread — all "real" herder work happens here',
      'Drives consumer group heartbeats and rebalance',
      'Processes connector create/update/delete requests',
      'If deadlocked → GET /connectors/{name} times out',
      'KIP-1017 GET /health specifically tests this thread',
    ],
  },
  {
    id: 'consumerGroup',
    label: 'Consumer Group',
    sublabel: 'Coordination',
    group: 'internal',
    col: 3, row: 2,
    icon: '🤝',
    phase: 2,
    description: 'Workers form a Kafka consumer group to coordinate task assignment. The group leader distributes connectors and tasks across all workers. When a worker joins or leaves, a rebalance redistributes all tasks.',
    details: [
      'Group ID: payments.tlm.kafka-connect-v2.{env}',
      'Leader worker assigns tasks during rebalance',
      'Worker join/leave → rebalance → tasks briefly stop',
      'Rolling update of 3 pods triggers ~6 rebalances',
      'Eager rebalance: ALL tasks stop during redistribution',
    ],
  },
  {
    id: 'sourceConnectors',
    label: 'Source Connectors',
    sublabel: '6 × MQ → Kafka',
    group: 'connector',
    col: 1, row: 3,
    icon: '📥',
    phase: 3,
    description: 'Six source connectors read messages from IBM MQ queues and publish them to Kafka topics. Each runs 3 parallel tasks. Messages processed one at a time (batch.size=1) for ordering guarantees.',
    details: [
      'SPSE Outbound — customer NPP payments (most critical)',
      'Inbound Domestic Fast — NPP credit advice (CAMT.054)',
      'MPIR PAF — PayTo mandate payments',
      'FIS Outbound — NPP gateway responses',
      'Fraud Failure — fraud system fallback',
      'PAF MQ — SWIFT/SAA international events',
    ],
  },
  {
    id: 'tasks',
    label: '66 Tasks',
    sublabel: '~22 per Worker',
    group: 'connector',
    col: 2, row: 3,
    icon: '⚡',
    phase: 3,
    description: 'Tasks are the actual units of parallelism. Each task maintains its own JMS connection to MQ with SSL. 66 total tasks distributed across 3 workers (~22 each) by the rebalance protocol.',
    details: [
      'Source: 6 connectors × 3 tasks = 18 tasks',
      'Sink: 6 connectors × 8 tasks = 48 tasks',
      'Total: 66 tasks across 3 workers (~22 each)',
      'Each task: own JMS session + SSL context to MQ',
      'Retry: 6750 × 2s backoff = ~3.75 hours auto-retry',
      'Offset flush: 5ms (aggressive, minimizes duplicates)',
    ],
  },
  {
    id: 'sinkConnectors',
    label: 'Sink Connectors',
    sublabel: '6 × Kafka → MQ',
    group: 'connector',
    col: 3, row: 3,
    icon: '📤',
    phase: 3,
    description: 'Six sink connectors read from Kafka topics and write to IBM MQ queues. Each runs 8 parallel tasks for higher throughput on the latency-sensitive response delivery path.',
    details: [
      'SPSE Sync A/B/C — sync response per AZ (3 connectors)',
      'SPSE Async — async payment status notification',
      'FIS Outbound — NPP payment instruction to FIS',
      'International SWIFT — payments to GMM',
      'SMTs: RecordKeyLogger, ExtractCorrelationIdToKey',
      '8 tasks per connector for response latency',
    ],
  },
  {
    id: 'ibmMq',
    label: 'IBM MQ',
    sublabel: '3 Queue Managers',
    group: 'mq',
    col: 0, row: 4,
    icon: '📬',
    phase: 4,
    description: 'IBM MQ queue managers running across three availability zones. Connect TLM to upstream (SPSE, FIS) and downstream (SPSE, FIS, GMM) legacy systems via SSL-encrypted JMS connections.',
    details: [
      'AZ-A: pawar014 (prod) / sawar014 (nonprod)',
      'AZ-B: pawbr014 (prod) / sawbr014 (nonprod)',
      'AZ-C: pawcr014 (prod) / sawcr014 (nonprod)',
      'Per-connector JKS keystores (~40 total)',
      'Each task opens its own JMS session (SSL handshake)',
    ],
  },
  {
    id: 'configTopic',
    label: 'Config Topic',
    sublabel: 'Connector Definitions',
    group: 'kafka',
    col: 1, row: 4,
    icon: '📋',
    phase: 4,
    description: 'Internal Kafka topic storing all connector configurations. Written by the leader worker when connectors are created/updated via REST API. All workers read from this topic to stay synchronized.',
    details: [
      'Topic: ...kafka-connect-config-storage-v2.{env}',
      'Stores: connector names + full configuration JSON',
      'Written by: leader worker via tick thread',
      'Read by: all workers to sync connector state',
      'If lost → all connector definitions are gone',
    ],
  },
  {
    id: 'offsetTopic',
    label: 'Offset Topic',
    sublabel: 'Read Positions',
    group: 'kafka',
    col: 2, row: 4,
    icon: '📍',
    phase: 4,
    description: 'Internal Kafka topic tracking where each source connector left off reading from MQ. With a 5ms flush interval, positions are saved near-instantly to minimize message re-reads after restart.',
    details: [
      'Topic: ...kafka-connect-offset-storage-v2.{env}',
      'Stores: source connector read positions in MQ',
      'Flush interval: 5ms (extremely aggressive)',
      'If lost → connectors re-read messages (duplicates)',
      'Replayed during worker startup to restore state',
    ],
  },
  {
    id: 'statusTopic',
    label: 'Status Topic',
    sublabel: 'RUNNING / FAILED',
    group: 'kafka',
    col: 3, row: 4,
    icon: '📊',
    phase: 4,
    description: 'Internal Kafka topic where workers publish connector and task states. The REST API reads from a local in-memory cache of this topic — which means status can be stale.',
    details: [
      'Topic: ...kafka-connect-status-storage-v2.{env}',
      'States: RUNNING, PAUSED, FAILED, UNASSIGNED',
      'Consumed asynchronously — status may be stale',
      'GET /connectors/{name}/status reads from this cache',
      'Does NOT go through tick thread (separate consumer)',
    ],
  },
  {
    id: 'kafkaBrokers',
    label: 'Kafka Brokers',
    sublabel: '3 AZs',
    group: 'kafka',
    col: 4, row: 4,
    icon: '🏢',
    phase: 4,
    description: 'Apache Kafka brokers hosting both data topics (payment events) and Kafka Connect\'s internal coordination topics. Three brokers across availability zones, connected via mTLS.',
    details: [
      '3 brokers across 3 AZs for high availability',
      'Data topics: payment-initiated, outbound-fis-*, etc.',
      'Internal topics: config/offset/status storage',
      'Schema Registry integration for Avro serialization',
      'mTLS encrypted connections from all workers',
    ],
  },
];

const edges = [
  { from: 'terraform', to: 'restApi', label: 'REST' },
  { from: 'k8sProbes', to: 'worker2' },
  { from: 'worker1', to: 'restApi' },
  { from: 'worker2', to: 'tickThread' },
  { from: 'worker3', to: 'consumerGroup' },
  { from: 'restApi', to: 'tickThread', label: 'forwards' },
  { from: 'tickThread', to: 'consumerGroup', label: 'coordinates' },
  { from: 'ibmMq', to: 'sourceConnectors', label: 'JMS', dashed: true },
  { from: 'sourceConnectors', to: 'tasks', label: '3 tasks' },
  { from: 'sinkConnectors', to: 'tasks', label: '8 tasks' },
  { from: 'sinkConnectors', to: 'ibmMq', label: 'JMS', dashed: true },
  { from: 'sourceConnectors', to: 'kafkaBrokers', label: 'produce' },
  { from: 'kafkaBrokers', to: 'sinkConnectors', label: 'consume', dashed: true },
  { from: 'tickThread', to: 'configTopic' },
  { from: 'tasks', to: 'offsetTopic', label: 'flush' },
  { from: 'tasks', to: 'statusTopic', label: 'report' },
];

const groupMeta = {
  management: { label: 'Management',      color: '#f59e0b' },
  worker:     { label: 'Worker',           color: '#00f0ff' },
  internal:   { label: 'Worker Internals', color: '#3b82f6' },
  connector:  { label: 'Connectors',       color: '#f472b6' },
  kafka:      { label: 'Kafka',            color: '#a855f7' },
  mq:         { label: 'IBM MQ',           color: '#fb923c' },
};

const phases = [
  { id: 1, label: 'Management Plane',    color: 'rgba(245, 158, 11, 0.06)', borderColor: 'rgba(245, 158, 11, 0.18)' },
  { id: 2, label: 'Worker Cluster',      color: 'rgba(0, 240, 255, 0.06)',  borderColor: 'rgba(0, 240, 255, 0.18)' },
  { id: 3, label: 'Connectors & Tasks',  color: 'rgba(244, 114, 182, 0.06)', borderColor: 'rgba(244, 114, 182, 0.18)' },
  { id: 4, label: 'Infrastructure',      color: 'rgba(168, 85, 247, 0.06)', borderColor: 'rgba(168, 85, 247, 0.18)' },
];

const CELL_X = 210;
const CELL_Y = 135;
const NODE_W = 155;
const NODE_H = 88;
const PAD_X = 50;
const PAD_Y = 50;

function nodePos(node) {
  const x = PAD_X + node.col * CELL_X;
  const y = PAD_Y + node.row * CELL_Y;
  return { x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 };
}

function edgeAnchor(node, side) {
  const pos = nodePos(node);
  switch (side) {
    case 'right':  return { x: pos.x + NODE_W, y: pos.cy };
    case 'left':   return { x: pos.x, y: pos.cy };
    case 'top':    return { x: pos.cx, y: pos.y };
    case 'bottom': return { x: pos.cx, y: pos.y + NODE_H };
    default:       return { x: pos.cx, y: pos.cy };
  }
}

function pickSides(fromNode, toNode) {
  const dx = toNode.col - fromNode.col;
  const dy = toNode.row - fromNode.row;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? ['right', 'left'] : ['left', 'right'];
  }
  return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom'];
}

function buildPath(fromNode, toNode) {
  const [fs, ts] = pickSides(fromNode, toNode);
  const from = edgeAnchor(fromNode, fs);
  const to = edgeAnchor(toNode, ts);
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dy) < 5 || Math.abs(dx) < 5) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  const cpx = from.x + dx * 0.5;
  return `M ${from.x} ${from.y} C ${cpx} ${from.y}, ${cpx} ${to.y}, ${to.x} ${to.y}`;
}

function edgeMidpoint(fromNode, toNode) {
  const [fs, ts] = pickSides(fromNode, toNode);
  const from = edgeAnchor(fromNode, fs);
  const to = edgeAnchor(toNode, ts);
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

function FlowEdge({ edge, nodesMap, visible }) {
  const fn = nodesMap[edge.from];
  const tn = nodesMap[edge.to];
  if (!fn || !tn) return null;

  const path = buildPath(fn, tn);
  const mid = edgeMidpoint(fn, tn);

  return (
    <g className={`${styles.edgeGroup} ${visible ? styles.edgeVisible : ''}`}>
      <path
        d={path}
        className={styles.edgePath}
        style={edge.dashed ? { strokeDasharray: '8 5' } : undefined}
      />
      <circle r="4" className={styles.edgeDot}>
        <animateMotion dur="2.5s" repeatCount="indefinite" path={path} />
      </circle>
      <circle r="2.5" className={styles.edgeDotTrail}>
        <animateMotion dur="2.5s" repeatCount="indefinite" path={path} begin="0.5s" />
      </circle>
      {edge.label && (
        <text x={mid.x} y={mid.y - 10} className={styles.edgeLabel}>
          {edge.label}
        </text>
      )}
    </g>
  );
}

function FlowNode({ node, visible, selected, onSelect, onHover }) {
  const color = groupMeta[node.group]?.color || '#64748b';
  const pos = nodePos(node);

  return (
    <g
      className={`${styles.nodeGroup} ${visible ? styles.nodeVisible : ''} ${selected ? styles.nodeSelected : ''}`}
      style={{ '--node-color': color, '--i': node.col + node.row * 2 }}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <rect
        x={pos.x} y={pos.y}
        width={NODE_W} height={NODE_H}
        rx={14}
        className={styles.nodeRect}
      />
      <text x={pos.cx} y={pos.y + 28} className={styles.nodeIcon}>{node.icon}</text>
      <text x={pos.cx} y={pos.y + 52} className={styles.nodeLabel}>{node.label}</text>
      <text x={pos.cx} y={pos.y + 68} className={styles.nodeSublabel}>{node.sublabel}</text>
    </g>
  );
}

function Tooltip({ nodeId, nodesMap }) {
  if (!nodeId) return null;
  const n = nodesMap[nodeId];
  if (!n) return null;
  const pos = nodePos(n);
  const color = groupMeta[n.group]?.color || '#64748b';

  const tipX = pos.cx;
  const tipY = pos.y - 8;
  const text = n.description.length > 90 ? n.description.slice(0, 87) + '...' : n.description;
  const textW = Math.min(text.length * 4.2, 320);
  const boxW = textW + 24;

  return (
    <g className={styles.tooltipGroup}>
      <rect
        x={tipX - boxW / 2}
        y={tipY - 42}
        width={boxW}
        height={38}
        rx={8}
        className={styles.tooltipBg}
        style={{ stroke: color }}
      />
      <text x={tipX} y={tipY - 18} className={styles.tooltipText}>
        {text}
      </text>
    </g>
  );
}

function PhaseRegion({ phase, nodesInPhase }) {
  if (nodesInPhase.length === 0) return null;
  const positions = nodesInPhase.map(nodePos);
  const minX = Math.min(...positions.map(p => p.x)) - 18;
  const minY = Math.min(...positions.map(p => p.y)) - 34;
  const maxX = Math.max(...positions.map(p => p.x + NODE_W)) + 18;
  const maxY = Math.max(...positions.map(p => p.y + NODE_H)) + 18;

  return (
    <g>
      <rect
        x={minX} y={minY}
        width={maxX - minX} height={maxY - minY}
        rx={14}
        fill={phase.color}
        stroke={phase.borderColor}
        strokeWidth="1.2"
      />
      <text
        x={minX + 10} y={minY + 16}
        className={styles.phaseLabel}
        style={{ fill: phase.borderColor }}
      >
        {phase.label}
      </text>
    </g>
  );
}

function DetailPanel({ node, onClose }) {
  if (!node) return null;
  const color = groupMeta[node.group]?.color || '#64748b';
  const groupLabel = groupMeta[node.group]?.label || '';

  return (
    <div className={styles.detailPanel} style={{ '--panel-color': color }}>
      <button className={styles.detailClose} onClick={onClose} aria-label="Close">✕</button>
      <div className={styles.detailHeader}>
        <span className={styles.detailIcon}>{node.icon}</span>
        <div>
          <span className={styles.detailBadge} style={{ color, borderColor: color }}>
            {groupLabel}
          </span>
          <h3 className={styles.detailTitle}>{node.label}</h3>
          <span className={styles.detailSublabel}>{node.sublabel}</span>
        </div>
      </div>
      <p className={styles.detailDesc}>{node.description}</p>
      <ul className={styles.detailList}>
        {node.details.map((d, i) => (
          <li key={i} style={{ '--bullet-color': color }}>{d}</li>
        ))}
      </ul>
    </div>
  );
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4.0;
const ZOOM_STEP = 0.2;

function clampZoom(z) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

function ControlBar({ onZoomIn, onZoomOut, onFit, onFullscreen, isFullscreen, zoom }) {
  return (
    <div className={styles.controlBar}>
      <button className={styles.controlBtn} onClick={onZoomIn} title="Zoom in">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      <span className={styles.controlZoomLabel}>{Math.round(zoom * 100)}%</span>
      <button className={styles.controlBtn} onClick={onZoomOut} title="Zoom out">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      <div className={styles.controlDivider} />
      <button className={styles.controlBtn} onClick={onFit} title="Fit to view">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
      </button>
      <button className={styles.controlBtn} onClick={onFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
        {isFullscreen ? (
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M5 2v3H2M11 2v3h3M2 11h3v3M14 11h-3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1" fill="none"/></svg>
        )}
      </button>
    </div>
  );
}

export default function KafkaConnectArchitecture() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nodesMap = {};
  nodes.forEach((n) => { nodesMap[n.id] = n; });

  const maxCol = Math.max(...nodes.map((n) => n.col));
  const maxRow = Math.max(...nodes.map((n) => n.row));
  const naturalW = PAD_X * 2 + maxCol * CELL_X + NODE_W;
  const naturalH = PAD_Y * 2 + maxRow * CELL_Y + NODE_H;

  const initW = naturalW;
  const initH = naturalH;
  const [vb, setVb] = useState({ x: 0, y: 0, w: initW, h: initH });
  const dragState = useRef({ active: false, startX: 0, startY: 0, startVbX: 0, startVbY: 0 });
  const pinchState = useRef({ dist: 0 });

  const currentZoom = naturalW / vb.w;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const screenToSvg = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width;
    const sy = (clientY - rect.top) / rect.height;
    return {
      x: vb.x + sx * vb.w,
      y: vb.y + sy * vb.h,
    };
  }, [vb]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    const newW = vb.w * factor;
    const newH = vb.h * factor;
    const newZoom = naturalW / newW;
    if (newZoom < ZOOM_MIN || newZoom > ZOOM_MAX) return;

    const cursor = screenToSvg(e.clientX, e.clientY);
    const ratioX = (cursor.x - vb.x) / vb.w;
    const ratioY = (cursor.y - vb.y) / vb.h;

    setVb({
      x: cursor.x - ratioX * newW,
      y: cursor.y - ratioY * newH,
      w: newW,
      h: newH,
    });
  }, [vb, naturalW, screenToSvg]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragState.current = { active: true, startX: e.clientX, startY: e.clientY, startVbX: vb.x, startVbY: vb.y };
  }, [vb]);

  const handleMouseMove = useCallback((e) => {
    if (!dragState.current.active) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = vb.w / rect.width;
    const scaleY = vb.h / rect.height;
    const dx = (e.clientX - dragState.current.startX) * scaleX;
    const dy = (e.clientY - dragState.current.startY) * scaleY;
    setVb(prev => ({ ...prev, x: dragState.current.startVbX - dx, y: dragState.current.startVbY - dy }));
  }, [vb.w, vb.h]);

  const handleMouseUp = useCallback(() => {
    dragState.current.active = false;
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchState.current.dist = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      dragState.current = { active: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY, startVbX: vb.x, startVbY: vb.y };
    }
  }, [vb]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      if (pinchState.current.dist > 0) {
        const factor = pinchState.current.dist / newDist;
        const newW = vb.w * factor;
        const newH = vb.h * factor;
        const newZoom = naturalW / newW;
        if (newZoom >= ZOOM_MIN && newZoom <= ZOOM_MAX) {
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const cursor = screenToSvg(cx, cy);
          const ratioX = (cursor.x - vb.x) / vb.w;
          const ratioY = (cursor.y - vb.y) / vb.h;
          setVb({ x: cursor.x - ratioX * newW, y: cursor.y - ratioY * newH, w: newW, h: newH });
        }
      }
      pinchState.current.dist = newDist;
    } else if (e.touches.length === 1 && dragState.current.active) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = vb.w / rect.width;
      const scaleY = vb.h / rect.height;
      const ddx = (e.touches[0].clientX - dragState.current.startX) * scaleX;
      const ddy = (e.touches[0].clientY - dragState.current.startY) * scaleY;
      setVb(prev => ({ ...prev, x: dragState.current.startVbX - ddx, y: dragState.current.startVbY - ddy }));
    }
  }, [vb, naturalW, screenToSvg]);

  const handleTouchEnd = useCallback(() => {
    dragState.current.active = false;
    pinchState.current.dist = 0;
  }, []);

  const handleZoomIn = useCallback(() => {
    const newZoom = clampZoom(currentZoom * (1 + ZOOM_STEP));
    const newW = naturalW / newZoom;
    const newH = naturalH / newZoom;
    const cx = vb.x + vb.w / 2;
    const cy = vb.y + vb.h / 2;
    setVb({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH });
  }, [currentZoom, naturalW, naturalH, vb]);

  const handleZoomOut = useCallback(() => {
    const newZoom = clampZoom(currentZoom * (1 - ZOOM_STEP));
    const newW = naturalW / newZoom;
    const newH = naturalH / newZoom;
    const cx = vb.x + vb.w / 2;
    const cy = vb.y + vb.h / 2;
    setVb({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH });
  }, [currentZoom, naturalW, naturalH, vb]);

  const handleFit = useCallback(() => {
    setVb({ x: 0, y: 0, w: naturalW, h: naturalH });
  }, [naturalW, naturalH]);

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  const handleBgClick = useCallback(() => setSelected(null), []);
  const selectedNode = selected ? nodesMap[selected] : null;
  const isDragging = dragState.current.active;

  return (
    <div
      className={`${styles.flowContainer} ${isFullscreen ? styles.flowContainerFullscreen : ''}`}
      ref={containerRef}
    >
      <div className={styles.flowHeader}>
        <div className={styles.flowTitle}>
          <span className={styles.flowTitleIcon}>⚡</span>
          Kafka Connect Architecture
        </div>
        <p className={styles.flowSubtitle}>
          Scroll to zoom, drag to pan. <strong>Hover</strong> for quick info, <strong>click</strong> for full details.
        </p>
      </div>

      <div className={styles.legendRow}>
        {Object.entries(groupMeta).map(([key, meta]) => (
          <span key={key} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: meta.color }} />
            {meta.label}
          </span>
        ))}
      </div>

      <div className={styles.svgWrap}>
        <svg
          ref={svgRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          className={`${styles.flowSvg} ${isDragging ? styles.flowSvgDragging : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleBgClick}
        >
          <defs>
            <filter id="kcaDotGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {phases.map((phase) => {
            const phaseNodes = nodes.filter(n => n.phase === phase.id);
            return <PhaseRegion key={phase.id} phase={phase} nodesInPhase={phaseNodes} />;
          })}

          {edges.map((edge, i) => (
            <FlowEdge key={i} edge={edge} nodesMap={nodesMap} visible={visible} />
          ))}
          {nodes.map((node) => (
            <FlowNode
              key={node.id}
              node={node}
              visible={visible}
              selected={selected === node.id}
              onSelect={setSelected}
              onHover={setHovered}
            />
          ))}

          {hovered && hovered !== selected && (
            <Tooltip nodeId={hovered} nodesMap={nodesMap} />
          )}
        </svg>

        <ControlBar
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          onFullscreen={handleFullscreen}
          isFullscreen={isFullscreen}
          zoom={currentZoom}
        />
      </div>

      <DetailPanel node={selectedNode} onClose={() => setSelected(null)} />
    </div>
  );
}
