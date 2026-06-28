import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './styles.module.css';

function ArrayBar({ value, highlight, label, secondary, pointer, shrink }) {
  const maxH = 48;
  const h = typeof value === 'number' ? Math.max(8, Math.min(maxH, (Math.abs(value) / 100) * maxH + 8)) : 24;
  return (
    <div className={`${styles.cell} ${highlight ? styles.cellHighlight : ''} ${secondary ? styles.cellSecondary : ''} ${shrink ? styles.cellShrink : ''}`}>
      {pointer && <div className={styles.pointer}>{pointer}</div>}
      <div className={styles.cellValue}>{value}</div>
      {label && <div className={styles.cellLabel}>{label}</div>}
    </div>
  );
}

function StackViz({ items, highlights = [] }) {
  return (
    <div className={styles.stackWrap}>
      <div className={styles.stackLabel}>Stack</div>
      <div className={styles.stack}>
        {items.length === 0 && <div className={styles.stackEmpty}>empty</div>}
        {[...items].reverse().map((item, i) => {
          const origIdx = items.length - 1 - i;
          return (
            <div key={i} className={`${styles.stackItem} ${highlights.includes(origIdx) ? styles.stackItemHighlight : ''}`}>
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HashMapViz({ entries }) {
  const items = Array.isArray(entries) ? entries : Object.entries(entries);
  return (
    <div className={styles.hashWrap}>
      <div className={styles.hashLabel}>HashMap</div>
      <div className={styles.hashGrid}>
        {items.map(([k, v], i) => (
          <div key={i} className={styles.hashEntry}>
            <span className={styles.hashKey}>{String(k)}</span>
            <span className={styles.hashArrow}>→</span>
            <span className={styles.hashVal}>{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TreeNodeViz({ node, depth = 0, highlights = [] }) {
  if (!node) return <div className={styles.treeNull}>null</div>;
  const isHighlighted = highlights.includes(node.val);
  return (
    <div className={styles.treeNode}>
      <div className={`${styles.treeVal} ${isHighlighted ? styles.treeValHighlight : ''}`}>{node.val}</div>
      {(node.left || node.right) && (
        <div className={styles.treeChildren}>
          <TreeNodeViz node={node.left} depth={depth + 1} highlights={highlights} />
          <TreeNodeViz node={node.right} depth={depth + 1} highlights={highlights} />
        </div>
      )}
    </div>
  );
}

export default function AlgoViz({ steps, title, description, autoPlay = false, speed = 1000 }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const timerRef = useRef(null);

  const current = steps[step] || {};

  const next = useCallback(() => setStep(s => Math.min(s + 1, steps.length - 1)), [steps.length]);
  const prev = useCallback(() => setStep(s => Math.max(s - 1, 0)), []);
  const reset = useCallback(() => { setStep(0); setPlaying(false); }, []);

  useEffect(() => {
    if (playing && step < steps.length - 1) {
      timerRef.current = setTimeout(next, speed);
    } else if (step >= steps.length - 1) {
      setPlaying(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [playing, step, next, speed, steps.length]);

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [steps]);

  return (
    <div className={styles.vizContainer}>
      <div className={styles.vizHeader}>
        <div className={styles.vizIcon}>▶</div>
        <div>
          <div className={styles.vizTitle}>{title || 'Algorithm Visualization'}</div>
          {description && <div className={styles.vizDesc}>{description}</div>}
        </div>
      </div>

      <div className={styles.vizBody}>
        {current.array && (
          <div className={styles.arrayRow}>
            {current.array.map((val, i) => (
              <ArrayBar
                key={i}
                value={val}
                highlight={current.highlights?.includes(i)}
                secondary={current.secondary?.includes(i)}
                pointer={current.pointers?.[i]}
                label={current.labels?.[i]}
              />
            ))}
          </div>
        )}

        {current.array2 && (
          <div className={styles.arrayRow}>
            {current.array2.map((val, i) => (
              <ArrayBar
                key={i}
                value={val}
                highlight={current.highlights2?.includes(i)}
                label={current.labels2?.[i]}
              />
            ))}
          </div>
        )}

        <div className={styles.vizAux}>
          {current.stack && <StackViz items={current.stack} highlights={current.stackHighlights} />}
          {current.hashMap && <HashMapViz entries={current.hashMap} />}
          {current.tree && <TreeNodeViz node={current.tree} highlights={current.treeHighlights || []} />}
        </div>

        {current.variables && (
          <div className={styles.varsRow}>
            {Object.entries(current.variables).map(([k, v]) => (
              <div key={k} className={styles.varChip}>
                <span className={styles.varName}>{k}</span>
                <span className={styles.varVal}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {current.explanation && (
          <div className={styles.explanation}>{current.explanation}</div>
        )}

        {current.code && (
          <div className={styles.codeLine}>
            <code>{current.code}</code>
          </div>
        )}
      </div>

      <div className={styles.vizControls}>
        <button className={styles.vizBtn} onClick={reset} title="Reset">⟲</button>
        <button className={styles.vizBtn} onClick={prev} disabled={step === 0}>◀</button>
        <button className={`${styles.vizBtn} ${styles.vizBtnPlay}`}
          onClick={() => setPlaying(p => !p)}>
          {playing ? '⏸' : '▶'}
        </button>
        <button className={styles.vizBtn} onClick={next} disabled={step === steps.length - 1}>▶</button>
        <div className={styles.vizStep}>
          Step {step + 1} / {steps.length}
        </div>
        <div className={styles.vizProgress}>
          <div className={styles.vizProgressFill} style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

export { ArrayBar, StackViz, HashMapViz, TreeNodeViz };
