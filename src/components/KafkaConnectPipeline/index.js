import React, { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';

const stages = [
  {
    layer: 1,
    title: 'Base Image Build',
    repo: 'docker-image-kafka-connect',
    trigger: 'PR merge to develop / hotfix',
    ci: 'Jenkins',
    output: 'nabserv-kafka-connect:git-<commit>',
    description: 'RHEL 9 + Confluent 8.1 + MQ connectors + custom SMTs + SSL keystores',
    duration: '~10 min',
    icon: '🏗️',
    details: [
      'Dockerfile: RHEL 9, OpenJDK 17, Python 3.11',
      'Confluent Platform 8.1.0 + IBM MQ connectors',
      'TLM custom SMT library (lib-kafka-connect 4.0.0)',
      '40+ JKS keystores for prod & nonprod',
      'Startup scripts: app-startup.sh → configure.sh → launch.sh',
    ],
  },
  {
    layer: 2,
    title: 'App Image Build',
    repo: 'kafka-connect',
    trigger: 'PR merge to develop / hotfix',
    ci: 'Jenkins',
    output: 'kafka-connect:git-<commit>',
    description: 'Thin overlay: Prometheus config + Log4j2/Splunk + SCA & SAST scans',
    duration: '~5 min',
    icon: '📦',
    details: [
      'FROM nabserv-kafka-connect (Layer 1 image)',
      'Adds Prometheus JMX exporter config (port 8197)',
      'Adds Log4j2 + Splunk HEC appender',
      'Snyk SCA scan + SAST scan',
      '8 env configs: dev, sit1, sit4, sit5, st, ppt, perf, prod',
    ],
  },
  {
    layer: 3,
    title: 'Kubernetes Deploy',
    repo: 'kafka-connect-helm',
    trigger: 'Manual — Harness CD',
    ci: 'Harness',
    output: '3 running pods (prod)',
    description: 'Helm upgrade → Rolling update → Startup probe → Rebalance → Steady state',
    duration: '~20-25 min',
    icon: '☸️',
    details: [
      'Harness CD: select image tag + target environment',
      'Vault secrets synced → Kubernetes Secrets',
      'helm upgrade --install with env-specific values',
      'Rolling update: maxSurge 100%, maxUnavailable 25%',
      'Startup probe: up to 27 min for Connect to join cluster',
    ],
  },
  {
    layer: 4,
    title: 'Connector Provisioning',
    repo: 'terraform-kafka-connect',
    trigger: 'Manual — post deploy',
    ci: 'Harness + Terraform',
    output: '12 connectors (6 src + 6 sink)',
    description: 'terraform apply → REST API → create/update connectors → tasks start',
    duration: '~3 min',
    icon: '🔌',
    details: [
      'Vault auth → fetch TLS cert + key for mTLS',
      'terraform plan with envs/<env>.tfvars',
      'terraform apply → PUT /connectors/<name>/config',
      'Mongey/kafka-connect provider v0.4.0',
      '6 source (MQ→Kafka) + 6 sink (Kafka→MQ) connectors',
    ],
  },
];

const connectorLabels = [
  'Docker Image',
  'ECR Push',
  'Helm Deploy',
];

function FlowLine({ index, visible }) {
  return (
    <div className={styles.flowLineWrap} style={{ '--i': index }}>
      <svg className={styles.flowLineSvg} viewBox="0 0 100 40" preserveAspectRatio="none">
        <path
          d="M 0 20 C 30 20, 70 20, 100 20"
          className={`${styles.flowPath} ${visible ? styles.flowPathVisible : ''}`}
          style={{ animationDelay: `${index * 0.3 + 0.6}s` }}
        />
        {visible && (
          <>
            <circle r="4" className={styles.flowDot}>
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                begin={`${index * 0.4}s`}
                path="M 0 20 C 30 20, 70 20, 100 20"
              />
            </circle>
            <circle r="2.5" className={styles.flowDotTrail}>
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                begin={`${index * 0.4 + 0.5}s`}
                path="M 0 20 C 30 20, 70 20, 100 20"
              />
            </circle>
          </>
        )}
      </svg>
      {visible && (
        <span className={styles.flowLabel} style={{ animationDelay: `${index * 0.3 + 0.8}s` }}>
          {connectorLabels[index]}
        </span>
      )}
    </div>
  );
}

function StageCard({ stage, index, visible, expanded, onToggle }) {
  const colorVar = `var(--pipeline-color-${stage.layer})`;

  return (
    <div
      className={`${styles.stageCard} ${visible ? styles.stageCardVisible : ''} ${expanded ? styles.stageCardExpanded : ''}`}
      style={{
        '--stage-color': colorVar,
        '--i': index,
        animationDelay: `${index * 0.15}s`,
      }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
    >
      <div className={styles.stageGlow} />

      <div className={styles.stageHeader}>
        <span className={styles.stageIcon}>{stage.icon}</span>
        <span className={styles.stageLayer}>Layer {stage.layer}</span>
      </div>

      <h3 className={styles.stageTitle}>{stage.title}</h3>

      <code className={styles.stageRepo}>{stage.repo}</code>

      <p className={styles.stageDesc}>{stage.description}</p>

      <div className={styles.stageOutput}>
        <span className={styles.stageOutputLabel}>Output</span>
        <code className={styles.stageOutputValue}>{stage.output}</code>
      </div>

      <div className={styles.stageDetails}>
        <div className={styles.stageDetailsMeta}>
          <div className={styles.stageMetaItem}>
            <span className={styles.stageMetaLabel}>Trigger</span>
            <span className={styles.stageMetaValue}>{stage.trigger}</span>
          </div>
          <div className={styles.stageMetaItem}>
            <span className={styles.stageMetaLabel}>CI/CD</span>
            <span className={styles.stageMetaValue}>{stage.ci}</span>
          </div>
          <div className={styles.stageMetaItem}>
            <span className={styles.stageMetaLabel}>Duration</span>
            <span className={styles.stageMetaValue}>{stage.duration}</span>
          </div>
        </div>
        <ul className={styles.stageDetailsList}>
          {stage.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </div>

      <div className={styles.expandHint}>
        {expanded ? '▲ collapse' : '▼ click for details'}
      </div>
    </div>
  );
}

export default function KafkaConnectPipeline() {
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const toggleExpand = (index) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className={styles.pipelineContainer} ref={containerRef}>
      <div className={styles.pipelineTitle}>
        <span className={styles.pipelineTitleIcon}>⚡</span>
        Deployment Pipeline
      </div>
      <p className={styles.pipelineSubtitle}>
        Four layers, four repos — each builds on the previous. Click any stage for details.
      </p>

      {visible && <div className={styles.signalSweep} />}

      <div className={styles.pipelineTrack}>
        {stages.map((stage, i) => (
          <React.Fragment key={stage.layer}>
            <StageCard
              stage={stage}
              index={i}
              visible={visible}
              expanded={expanded[i]}
              onToggle={() => toggleExpand(i)}
            />
            {i < stages.length - 1 && (
              <FlowLine index={i} visible={visible} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
