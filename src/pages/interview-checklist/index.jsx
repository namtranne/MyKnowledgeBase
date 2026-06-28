import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../../compat/Layout.jsx';
import styles from './styles.module.css';
import { CATEGORIES, TOPICS_DATA } from './_topics-data';

const STORAGE_KEY_PREFIX = 'interview-checklist-v1';

function loadProgress(categoryId) {
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_KEY_PREFIX}:${categoryId}`) || '{}');
  } catch {
    return {};
  }
}

function saveProgress(categoryId, p) {
  localStorage.setItem(`${STORAGE_KEY_PREFIX}:${categoryId}`, JSON.stringify(p));
}

// ─── Progress Ring ───────────────────────────────────────────────────────────

function ProgressRing({ pct, color }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const gradId = `ringGrad-${color.replace('#', '')}`;
  return (
    <div className={styles.ringWrap}>
      <svg className={styles.ringSvg} viewBox="0 0 140 140">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle className={styles.ringBg} cx="70" cy="70" r={r} />
        <circle className={styles.ringFg} cx="70" cy="70" r={r}
          stroke={`url(#${gradId})`}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.ringLabel}>
        <span className={styles.ringPct}>{pct}%</span>
        <span className={styles.ringText}>Complete</span>
      </div>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ section, color, progress, onToggle }) {
  const [isOpen, setIsOpen] = useState(true);

  const solved = useMemo(
    () => section.items.filter((item) => progress[item.id]).length,
    [section.items, progress]
  );
  const total = section.items.length;
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

  return (
    <div className={styles.section}>
      <div
        className={styles.sectionHeader}
        onClick={() => setIsOpen((o) => !o)}>
        <div className={styles.sectionColor} style={{ background: color }} />
        <span className={styles.sectionTitle}>{section.title}</span>
        <span className={styles.sectionProgress}>{solved}/{total}</span>
        <span className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ''}`}>
          &#9654;
        </span>
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          {section.items.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              checked={!!progress[item.id]}
              onToggle={() => onToggle(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Checklist Item ────────────────────────────────────────────────────────────

function ChecklistItem({ item, checked, onToggle }) {
  return (
    <div className={styles.checklistItem}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        onChange={onToggle}
        id={item.id}
      />
      <div className={styles.itemContent}>
        <label
          htmlFor={item.id}
          className={`${styles.itemName} ${checked ? styles.itemNameDone : ''}`}>
          {item.name}
        </label>
        {item.note && (
          <p className={styles.itemNote}>{item.note}</p>
        )}
      </div>
      {item.resource && (
        <a
          href={item.resource}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.itemResource}>
          Ref
        </a>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function InterviewChecklist() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [progressMap, setProgressMap] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const categoryConfig = CATEGORIES.find((c) => c.id === activeCategory);
  const categoryData = TOPICS_DATA[activeCategory];
  const progress = progressMap[activeCategory] || {};

  useEffect(() => {
    const loaded = {};
    CATEGORIES.forEach((cat) => {
      loaded[cat.id] = loadProgress(cat.id);
    });
    setProgressMap(loaded);
  }, []);

  const toggle = useCallback((itemId) => {
    setProgressMap((prev) => {
      const current = prev[activeCategory] || {};
      const next = { ...current, [itemId]: !current[itemId] };
      saveProgress(activeCategory, next);
      return { ...prev, [activeCategory]: next };
    });
  }, [activeCategory]);

  const totalItems = useMemo(
    () => categoryData.sections.reduce((s, sec) => s + sec.items.length, 0),
    [categoryData]
  );

  const solvedItems = useMemo(
    () => categoryData.sections.reduce(
      (s, sec) => s + sec.items.filter((item) => progress[item.id]).length,
      0
    ),
    [categoryData, progress]
  );

  const pct = totalItems > 0 ? Math.round((solvedItems / totalItems) * 0) : 0;

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categoryData.sections;

    const allItems = categoryData.sections.flatMap((sec) =>
      sec.items.map((item) => ({ ...item, sectionTitle: sec.title }))
    );

    const matchedIds = new Set(
      allItems
        .filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.note && item.note.toLowerCase().includes(q))
        )
        .map((item) => item.id)
    );

    if (filter === 'done') {
      matchedIds.forEach((id) => {
        if (!progress[id]) matchedIds.delete(id);
      });
    } else if (filter === 'todo') {
      matchedIds.forEach((id) => {
        if (progress[id]) matchedIds.delete(id);
      });
    }

    const filtered = allItems.filter((item) => matchedIds.has(item.id));

    const sectionMap = {};
    filtered.forEach((item) => {
      if (!sectionMap[item.sectionTitle]) {
        const orig = categoryData.sections.find((s) => s.title === item.sectionTitle);
        sectionMap[item.sectionTitle] = { ...orig, items: [] };
      }
      sectionMap[item.sectionTitle].items.push(item);
    });

    return Object.values(sectionMap);
  }, [categoryData, search, filter, progress]);

  const searchTrimmed = search.trim();
  const searchActive = searchTrimmed.length > 0;
  const matchedCount = searchActive
    ? filteredSections.reduce((s, sec) => s + sec.items.length, 0)
    : 0;

  const resetAll = useCallback(() => {
    if (
      window.confirm(
        `Reset all "${categoryConfig.label}" progress? This cannot be undone.`
      )
    ) {
      saveProgress(activeCategory, {});
      setProgressMap((prev) => ({ ...prev, [activeCategory]: {} }));
    }
  }, [activeCategory, categoryConfig.label]);

  const cssVarColor = categoryConfig.color;
  const tabStyle = {
    '--tab-accent': cssVarColor,
    '--tab-bg': `linear-gradient(145deg, ${cssVarColor}12, #a855f712)`,
    '--tab-glow': `${cssVarColor}18`,
  };

  const actualPct = totalItems > 0 ? Math.round((solvedItems / totalItems) * 100) : 0;

  return (
    <Layout
      title="Interview Checklist"
      description="Comprehensive interview preparation checklist — track your progress across all topics">
      <div className={styles.root}>
        <header className={styles.hero}>
          <span className={styles.heroTag}>
            {CATEGORIES.length} Tracks / {Object.values(TOPICS_DATA).reduce((s, d) => s + d.sections.reduce((ss, sec) => ss + sec.items.length, 0), 0)} Topics
          </span>
          <h1 className={styles.heroTitle}>
            Interview <span className={styles.neonGradient}>Checklist</span>
          </h1>
          <p className={styles.heroSub}>
            Comprehensive interview preparation tracker. Track your progress across
            Behavioural, System Design, Databases, Microservices, CS Fundamentals, and more.
          </p>
        </header>

        <div className={styles.categoryTabs} style={tabStyle}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryTab} ${
                activeCategory === cat.id ? styles.categoryTabActive : ''
              }`}
              onClick={() => setActiveCategory(cat.id)}
              style={
                activeCategory === cat.id
                  ? { '--tab-accent': cat.color, '--tab-bg': `linear-gradient(145deg, ${cat.color}12, #a855f712)`, '--tab-glow': `${cat.color}18` }
                  : {}
              }>
              {cat.label}
            </button>
          ))}
        </div>

        <section className={styles.dashboard}>
          <ProgressRing pct={actualPct} color={categoryConfig.color} />
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{solvedItems}</span>
              <span className={styles.statLabel}>Checked</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalItems - solvedItems}</span>
              <span className={styles.statLabel}>Remaining</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalItems}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{actualPct}%</span>
              <span className={styles.statLabel}>Complete</span>
            </div>
          </div>
        </section>

        <div className={styles.filterBar}>
          {[['all', 'All'], ['todo', 'To Do'], ['done', 'Done']].map(([k, l]) => (
            <button
              key={k}
              className={`${styles.filterBtn} ${filter === k ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
          <input
            className={styles.searchInput}
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {searchActive ? (
          <section className={styles.searchResults} aria-labelledby="search-results-heading">
            <h2 id="search-results-heading" className={styles.searchResultsTitle}>
              Matching topics
              <span className={styles.searchResultsCount}>{matchedCount}</span>
            </h2>
            {matchedCount === 0 ? (
              <p className={styles.emptyState}>No topics match your search and filter.</p>
            ) : (
              <ul className={styles.searchResultsList}>
                {filteredSections.flatMap((sec) =>
                  sec.items.map((item) => (
                    <li key={item.id} className={styles.searchResultItem}>
                      <div className={styles.searchResultTop}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={!!progress[item.id]}
                          onChange={() => toggle(item.id)}
                          id={`search-${item.id}`}
                        />
                        <label
                          htmlFor={`search-${item.id}`}
                          className={`${styles.itemName} ${progress[item.id] ? styles.itemNameDone : ''}`}>
                          {item.name}
                        </label>
                        {item.note && (
                          <p className={styles.itemNote}>{item.note}</p>
                        )}
                        {item.resource && (
                          <a
                            href={item.resource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.itemResource}>
                            Ref
                          </a>
                        )}
                      </div>
                      <div className={styles.searchResultMeta}>{sec.title}</div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </section>
        ) : (
          filteredSections.map((section) => (
            <Section
              key={section.id}
              section={section}
              color={categoryConfig.color}
              progress={progress}
              onToggle={toggle}
            />
          ))
        )}

        <div className={styles.actions}>
          <button className={styles.resetBtn} onClick={resetAll}>
            Reset {categoryConfig.label} Progress
          </button>
        </div>
      </div>
    </Layout>
  );
}
