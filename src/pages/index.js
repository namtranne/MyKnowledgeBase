import React, { useEffect, useRef, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

/* ── Particle canvas background ── */
function ParticleCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.r = Math.random() * 2 + 0.5;
        this.color = ['#00f0ff', '#a855f7', '#22d3ee', '#f472b6'][Math.floor(Math.random() * 4)];
        this.alpha = Math.random() * 0.6 + 0.2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    for (let i = 0; i < 80; i++) particles.push(new Particle());

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });

      // draw lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = '#00f0ff';
            ctx.globalAlpha = 0.08 * (1 - dist / 140);
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} className={styles.particleCanvas} />;
}

/* ── Typing animation hook ── */
function useTypingText(texts, typingSpeed = 80, pause = 2000) {
  const [display, setDisplay] = useState('');
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    let timer;
    if (!deleting && charIdx < current.length) {
      timer = setTimeout(() => setCharIdx(c => c + 1), typingSpeed);
    } else if (!deleting && charIdx === current.length) {
      timer = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timer = setTimeout(() => setCharIdx(c => c - 1), typingSpeed / 2);
    } else if (deleting && charIdx === 0) {
      setDeleting(false);
      setIdx(i => (i + 1) % texts.length);
    }
    setDisplay(current.slice(0, charIdx));
    return () => clearTimeout(timer);
  }, [charIdx, deleting, idx, texts, typingSpeed, pause]);

  return display;
}

/* ── Category card data ── */
const categories = [
  {
    title: 'Kafka',
    emoji: '🔥',
    description: 'From "what is Kafka?" to byte-level internals — storage engine, protocol, replication, streams.',
    link: '/docs/Technical-Knowledge/Kafka/Kafka_The_Complete_Guide',
    gradient: 'linear-gradient(135deg, #00f0ff22, #a855f722)',
    glowColor: '#00f0ff',
  },
  {
    title: 'AWS',
    emoji: '☁️',
    description: 'Solutions Architect Associate (SAA-C03) — complete study guide covering all exam domains.',
    link: '/docs/Technical-Knowledge/AWS/SAA_C03/',
    gradient: 'linear-gradient(135deg, #a855f722, #f472b622)',
    glowColor: '#a855f7',
  },
  {
    title: 'DSA Training',
    emoji: '🏋️',
    description: 'Two tracks: 20-week Foundations (420 problems) & 20-week Intensive (420 problems). Must-do problems highlighted. Interactive progress tracking.',
    link: '/dsa-roadmap',
    gradient: 'linear-gradient(135deg, #34d39922, #00f0ff22)',
    glowColor: '#34d399',
  },
];

/* ── Stats row ── */
const stats = [
  { value: '3', label: 'Learning Paths' },
  { value: '420+', label: 'DSA Problems' },
  { value: '24/7', label: 'Always Available' },
];

/* ── Main page ── */
export default function Home() {
  const typed = useTypingText([
    'Apache Kafka',
    'AWS Cloud',
    'KRaft Architecture',
    'Distributed Systems',
    'Event Streaming',
    'Cloud Infrastructure',
  ]);

  return (
    <Layout title="Home" description="Personal Knowledge Base — neon edition">
      <div className={styles.root}>
        <ParticleCanvas />

        {/* ── Hero ── */}
        <header className={styles.hero}>
          <div className={styles.heroGlow} />
          <p className={styles.heroTag}>⚡ Personal Knowledge Base</p>
          <h1 className={styles.heroTitle}>
            Learn about<br />
            <span className={styles.neonText}>{typed}</span>
            <span className={styles.cursor}>|</span>
          </h1>
          <p className={styles.heroSub}>
            A curated collection of technical notes, architecture guides, and deep-dive references — all in one place.
          </p>
          <div className={styles.heroCta}>
            <Link className={styles.btnPrimary} to="/docs/intro">
              Explore Docs →
            </Link>
            <Link className={styles.btnGhost} to="/docs/Technical-Knowledge/Kafka/">
              Kafka Learning Path
            </Link>
          </div>
        </header>

        {/* ── Stats ── */}
        <section className={styles.statsRow}>
          {stats.map((s, i) => (
            <div key={i} className={styles.statCard}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </section>

        {/* ── Categories ── */}
        <section className={styles.categories}>
          <h2 className={styles.sectionTitle}>Browse by Category</h2>
          <div className={styles.cardGrid}>
            {categories.map((cat, i) => (
              <Link key={i} to={cat.link} className={styles.card} style={{ background: cat.gradient }}>
                <div className={styles.cardGlow} style={{ boxShadow: `0 0 60px ${cat.glowColor}33` }} />
                <span className={styles.cardEmoji}>{cat.emoji}</span>
                <h3 className={styles.cardTitle}>{cat.title}</h3>
                <p className={styles.cardDesc}>{cat.description}</p>
                <span className={styles.cardArrow}>→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaGlow} />
          <h2 className={styles.ctaTitle}>Ready to dive in?</h2>
          <p className={styles.ctaSub}>Pick a topic and start exploring. New guides are added regularly.</p>
          <Link className={styles.btnPrimary} to="/docs/intro">
            Open the Docs →
          </Link>
        </section>
      </div>
    </Layout>
  );
}
