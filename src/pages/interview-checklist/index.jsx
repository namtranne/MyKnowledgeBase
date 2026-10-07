import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  createContext,
} from "react";
import Layout from "../../compat/Layout.jsx";
import styles from "./styles.module.css";
import { CATEGORIES, TOPICS_DATA } from "./_topics-data";
import { useAuth } from "../../auth/AuthContext.jsx";
import { api } from "../../api/client.js";
import { useUserState } from "../../auth/UserStateContext.jsx";
import { useDictation, useAiDictation } from "../mock-interview/useVoice.js";

const GRADE_LEVELS = [
  "Intern",
  "Junior",
  "Mid",
  "Senior",
  "Staff",
  "Principal",
];

// "My Interview": your own target role + CV + questions you write yourself.
// It behaves like a category whose single section is built from your questions,
// so progress, answers, voice and AI grading all work the same way.
const MY_CAT = {
  id: "my-interview",
  label: "⭐ My Interview",
  color: "#fbbf24",
};
const ALL_CATS = [MY_CAT, ...CATEGORIES];
const MY_SECTION_ID = "my-questions";

function newQuestionId() {
  const rand =
    (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `mq-${rand}`;
}

// Shared by every AnswerBox: grading, voice config, auth.
const AnswerCtx = createContext(null);

const STORAGE_KEY_PREFIX = "interview-checklist-v1";
const ANSWERS_KEY_PREFIX = "interview-checklist-answers-v1";

// ─── Local (offline / signed-out) storage ────────────────────────────────────

function loadProgress(categoryId) {
  try {
    return JSON.parse(
      localStorage.getItem(`${STORAGE_KEY_PREFIX}:${categoryId}`) || "{}",
    );
  } catch {
    return {};
  }
}

function saveProgress(categoryId, p) {
  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}:${categoryId}`,
    JSON.stringify(p),
  );
}

function loadAnswers(categoryId) {
  try {
    return JSON.parse(
      localStorage.getItem(`${ANSWERS_KEY_PREFIX}:${categoryId}`) || "{}",
    );
  } catch {
    return {};
  }
}

function saveAnswers(categoryId, a) {
  localStorage.setItem(
    `${ANSWERS_KEY_PREFIX}:${categoryId}`,
    JSON.stringify(a),
  );
}

function clearLocal(categoryId) {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}:${categoryId}`);
    localStorage.removeItem(`${ANSWERS_KEY_PREFIX}:${categoryId}`);
  } catch {
    /* ignore */
  }
}

// Push signed-out (guest) progress into the user's account for items the
// server doesn't have yet. Mutates `grouped` so the UI shows merged state.
async function uploadGuestChecklist(grouped) {
  for (const cat of ALL_CATS) {
    const localP = loadProgress(cat.id);
    const localA = loadAnswers(cat.id);
    const ids = new Set([...Object.keys(localP), ...Object.keys(localA)]);
    const serverItems = (grouped[cat.id] ||= {});
    for (const itemId of ids) {
      if (serverItems[itemId]) continue; // server wins
      const checked = !!localP[itemId];
      const answer = localA[itemId] || "";
      if (!checked && !answer) continue;
      await api.upsertItem(itemId, { categoryId: cat.id, checked, answer });
      serverItems[itemId] = { checked, answer };
    }
    clearLocal(cat.id);
  }
}

// ─── Progress Ring ───────────────────────────────────────────────────────────

function ProgressRing({ pct, color }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const gradId = `ringGrad-${color.replace("#", "")}`;
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
        <circle
          className={styles.ringFg}
          cx="70"
          cy="70"
          r={r}
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

// ─── Answer box ──────────────────────────────────────────────────────────────
// Expandable per-question answer: type or dictate, save, and get AI feedback.

// Plain text with ```code``` fences rendered as code blocks.
function RichText({ text, className }) {
  const parts = [];
  const re = /```([\w+#.-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last)
      parts.push({ code: false, v: text.slice(last, m.index) });
    parts.push({ code: true, v: m[2].replace(/\n$/, "") });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ code: false, v: text.slice(last) });
  return (
    <div className={className}>
      {parts.map((p, i) =>
        p.code ? (
          <pre key={i} className={styles.fbCode}>
            <code>{p.v}</code>
          </pre>
        ) : (
          <span key={i}>{p.v.replace(/^\n+|\n+$/g, "")}</span>
        ),
      )}
    </div>
  );
}

const VERDICT = {
  strong: { label: "Strong", color: "#34d399" },
  good: { label: "Good", color: "#60a5fa" },
  "needs-work": { label: "Needs work", color: "#f59e0b" },
  weak: { label: "Weak", color: "#ef4444" },
};

function scoreColor(score) {
  return score >= 8
    ? "#34d399"
    : score >= 6
      ? "#60a5fa"
      : score >= 4
        ? "#f59e0b"
        : "#ef4444";
}

function FeedbackList({ title, items, icon }) {
  if (!items || !items.length) return null;
  return (
    <div className={styles.fbBlock}>
      <span className={styles.fbBlockTitle}>{title}</span>
      <ul className={styles.fbList}>
        {items.map((t, i) => (
          <li key={i}>
            <span className={styles.fbIcon}>{icon}</span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeedbackPanel({ fb, gradedAt, stale }) {
  const v = VERDICT[fb.verdict] || VERDICT["needs-work"];
  return (
    <div className={styles.fbPanel}>
      <div className={styles.fbHead}>
        <span
          className={styles.fbScore}
          style={{
            color: scoreColor(fb.score),
            borderColor: scoreColor(fb.score),
          }}
        >
          {fb.score}
          <small>/10</small>
        </span>
        <div className={styles.fbHeadText}>
          <span className={styles.fbVerdict} style={{ color: v.color }}>
            {v.label}
            <span className={styles.fbLevel}>
              {" "}
              · judged at {fb.level || "Mid"} level
            </span>
          </span>
          {fb.summary && <span className={styles.fbSummary}>{fb.summary}</span>}
        </div>
      </div>
      {stale && (
        <div className={styles.fbStale}>
          You’ve changed your answer since this feedback — grade again to update
          it.
        </div>
      )}
      <FeedbackList title="What worked" items={fb.strengths} icon="✓" />
      <FeedbackList title="Gaps" items={fb.gaps} icon="△" />
      <FeedbackList
        title="Missing or incorrect"
        items={fb.missingPoints}
        icon="✗"
      />
      {fb.modelAnswer && (
        <details className={styles.fbDetails}>
          <summary>Show a strong answer outline</summary>
          <RichText text={fb.modelAnswer} className={styles.fbModel} />
        </details>
      )}
      <FeedbackList
        title="Likely follow-up questions"
        items={fb.followUpQuestions}
        icon="→"
      />
      <FeedbackList title="English tips" items={fb.languageTips} icon="✎" />
      {gradedAt && (
        <span className={styles.fbMeta}>
          Graded {new Date(gradedAt).toLocaleString()}
        </span>
      )}
    </div>
  );
}

function AnswerEditor({ item, sectionTitle, value, onSave }) {
  const ctx = useContext(AnswerCtx);
  const graded = ctx.feedbackFor(item.id);
  const [draft, setDraft] = useState(value || "");
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState("");

  // Keep the draft in sync if the stored value changes (e.g. after login sync).
  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  const dirty = draft !== (value || "");

  // ── voice input
  const append = useCallback(
    (t) => t && setDraft((d) => (d.trim() ? d.replace(/\s*$/, " ") : "") + t),
    [],
  );
  const hint = `Interview answer. Question: ${item.name}${item.note ? `. ${item.note}` : ""}`;
  const browserDictation = useDictation({ onFinal: append });
  const aiDictation = useAiDictation({
    transcribe: (blob) => api.transcribeVoice(blob, hint),
    onFinal: append,
  });
  const dictation =
    ctx.aiStt && aiDictation.supported ? aiDictation : browserDictation;
  const voiceBusy = dictation.listening || dictation.busy;

  async function commit() {
    if (!dirty || voiceBusy) return;
    setStatus("saving");
    try {
      await onSave(draft);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (err) {
      setStatus("error");
    }
  }

  async function grade() {
    if (!ctx.isAuthenticated) {
      ctx.openAuth();
      return;
    }
    const text = draft.trim();
    if (!text || grading || voiceBusy) return;
    setGrading(true);
    setGradeError("");
    try {
      await ctx.grade(item.id, {
        question: item.name,
        note: item.note || undefined,
        section: sectionTitle || undefined,
        answer: text,
      });
    } catch (err) {
      setGradeError(err.message || "Could not grade this answer");
    } finally {
      setGrading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  }

  const stale =
    graded &&
    graded.feedback?.gradedAnswer !== undefined &&
    graded.feedback.gradedAnswer.trim() !== draft.trim();

  return (
    <div className={styles.answerBody}>
      <textarea
        className={styles.answerInput}
        value={draft}
        placeholder="Write or dictate your answer… (Enter to save, Shift+Enter for a new line)"
        onChange={(e) => {
          setDraft(e.target.value);
          if (status !== "idle") setStatus("idle");
        }}
        onKeyDown={handleKeyDown}
        rows={4}
      />
      {dictation.listening && (
        <div className={styles.dictationNote}>
          <span className={styles.recDot} />
          {dictation.ai
            ? `Recording ${Math.floor(dictation.elapsed / 60)}:${String(dictation.elapsed % 60).padStart(2, "0")} — press ⏹ when done`
            : "Listening… press ⏹ when done"}
          {dictation.interim && (
            <em className={styles.interim}> {dictation.interim}</em>
          )}
        </div>
      )}
      {dictation.busy && (
        <div className={styles.dictationNote}>✨ Transcribing…</div>
      )}
      {dictation.error && (
        <span className={styles.answerError}>{dictation.error}</span>
      )}

      <div className={styles.answerActions}>
        <button
          type="button"
          className={styles.answerSaveBtn}
          onClick={commit}
          disabled={!dirty || status === "saving" || voiceBusy}
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {(dictation.supported || ctx.aiStt) && (
          <button
            type="button"
            className={`${styles.micBtn} ${dictation.listening ? styles.micBtnOn : ""}`}
            onClick={() =>
              dictation.listening ? dictation.stop() : dictation.start()
            }
            disabled={dictation.busy || grading}
            title={dictation.listening ? "Stop" : "Answer by voice"}
            aria-pressed={dictation.listening}
          >
            {dictation.listening ? "⏹" : "🎤"}
          </button>
        )}
        <button
          type="button"
          className={styles.gradeBtn}
          onClick={grade}
          disabled={
            grading || voiceBusy || (ctx.isAuthenticated && !draft.trim())
          }
          title={
            ctx.isAuthenticated
              ? "Get AI feedback on this answer"
              : "Sign in to get AI feedback"
          }
        >
          {grading
            ? "Grading…"
            : graded
              ? "✨ Grade again"
              : "✨ Grade with AI"}
        </button>
        {status === "saved" && (
          <span className={styles.answerSaved}>✓ Saved</span>
        )}
        {status === "error" && (
          <span className={styles.answerError}>Couldn’t save</span>
        )}
        {gradeError && <span className={styles.answerError}>{gradeError}</span>}
      </div>

      {graded?.feedback && (
        <FeedbackPanel
          fb={graded.feedback}
          gradedAt={graded.gradedAt}
          stale={stale}
        />
      )}
    </div>
  );
}

function AnswerBox({ item, sectionTitle, value, onSave }) {
  const ctx = useContext(AnswerCtx);
  const graded = ctx.feedbackFor(item.id);
  const [open, setOpen] = useState(!!value);
  const score = graded?.feedback?.score;

  return (
    <div className={styles.answerWrap}>
      <button
        type="button"
        className={styles.answerToggle}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.answerChevron}>{open ? "▾" : "▸"}</span>
        {value ? "Your answer" : "Add answer"}
        {value && !open && <span className={styles.answerBadge}>saved</span>}
        {typeof score === "number" && (
          <span
            className={styles.scoreBadge}
            style={{ color: scoreColor(score), borderColor: scoreColor(score) }}
          >
            AI {score}/10
          </span>
        )}
      </button>

      {open && (
        <AnswerEditor
          item={item}
          sectionTitle={sectionTitle}
          value={value}
          onSave={onSave}
        />
      )}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({
  section,
  color,
  progress,
  answers,
  onToggle,
  onSaveAnswer,
  onEditItem,
  onDeleteItem,
  emptyText,
}) {
  const [isOpen, setIsOpen] = useState(true);

  const solved = useMemo(
    () => section.items.filter((item) => progress[item.id]).length,
    [section.items, progress],
  );
  const total = section.items.length;

  return (
    <div className={styles.section}>
      <div
        className={styles.sectionHeader}
        onClick={() => setIsOpen((o) => !o)}
      >
        <div className={styles.sectionColor} style={{ background: color }} />
        <span className={styles.sectionTitle}>{section.title}</span>
        <span className={styles.sectionProgress}>
          {solved}/{total}
        </span>
        <span
          className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}
        >
          &#9654;
        </span>
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          {section.items.length === 0 && emptyText && (
            <p className={styles.emptyState}>{emptyText}</p>
          )}
          {section.items.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              checked={!!progress[item.id]}
              answer={answers[item.id] || ""}
              onToggle={() => onToggle(item.id)}
              sectionTitle={section.title}
              onSaveAnswer={(text) => onSaveAnswer(item.id, text)}
              onEdit={
                onEditItem ? (patch) => onEditItem(item.id, patch) : undefined
              }
              onDelete={onDeleteItem ? () => onDeleteItem(item.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Checklist Item ────────────────────────────────────────────────────────────

function ChecklistItem({
  item,
  checked,
  answer,
  sectionTitle,
  onToggle,
  onSaveAnswer,
  onEdit,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [qDraft, setQDraft] = useState(item.name);
  const [nDraft, setNDraft] = useState(item.note || "");

  function startEdit() {
    setQDraft(item.name);
    setNDraft(item.note || "");
    setEditing(true);
  }
  function saveEdit() {
    const q = qDraft.trim();
    if (!q) return;
    onEdit({ question: q, note: nDraft.trim() });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className={styles.checklistItem}>
        <div className={styles.itemContent}>
          <textarea
            className={styles.answerInput}
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            rows={2}
            autoFocus
          />
          <input
            className={styles.myInput}
            value={nDraft}
            placeholder="Note (optional) — e.g. asked in round 1, hint, source"
            onChange={(e) => setNDraft(e.target.value)}
          />
          <div className={styles.answerActions}>
            <button
              type="button"
              className={styles.answerSaveBtn}
              onClick={saveEdit}
              disabled={!qDraft.trim()}
            >
              Save question
            </button>
            <button
              type="button"
              className={styles.myLinkBtn}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          className={`${styles.itemName} ${checked ? styles.itemNameDone : ""}`}
        >
          {item.name}
        </label>
        {item.note && <p className={styles.itemNote}>{item.note}</p>}
        <AnswerBox
          item={item}
          sectionTitle={sectionTitle}
          value={answer}
          onSave={onSaveAnswer}
        />
      </div>
      {(onEdit || onDelete) && (
        <div className={styles.itemTools}>
          {onEdit && (
            <button
              type="button"
              className={styles.itemToolBtn}
              onClick={startEdit}
              title="Edit question"
            >
              ✎
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className={styles.itemToolBtn}
              onClick={onDelete}
              title="Delete question"
            >
              🗑
            </button>
          )}
        </div>
      )}
      {item.resource && (
        <a
          href={item.resource}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.itemResource}
        >
          Ref
        </a>
      )}
    </div>
  );
}

// ─── My Interview: profile + add question ──────────────────────────────────────

function MyInterviewProfile({ profile, onSave, isAuthenticated, openAuth }) {
  const [role, setRole] = useState(profile.role || "");
  const [level, setLevel] = useState(profile.level || "Mid");
  const [cvText, setCvText] = useState(profile.cvText || "");
  const [cvFileName, setCvFileName] = useState(profile.cvFileName || "");
  const [showCv, setShowCv] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(!profile.role);

  // Re-sync when the stored profile arrives (e.g. after sign-in).
  useEffect(() => {
    setRole(profile.role || "");
    setLevel(profile.level || "Mid");
    setCvText(profile.cvText || "");
    setCvFileName(profile.cvFileName || "");
    if (profile.role) setEditing(false);
  }, [profile.role, profile.level, profile.cvText, profile.cvFileName]);

  async function handleFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!isAuthenticated) {
      openAuth();
      return;
    }
    setError("");
    setParsing(true);
    try {
      const { text } = await api.parseResume(f);
      setCvText(text);
      setCvFileName(f.name);
      setPasting(false);
    } catch (err) {
      setError(
        err.message ||
          "Could not read that file — try pasting the text instead",
      );
    } finally {
      setParsing(false);
    }
  }

  function save() {
    if (!role.trim()) {
      setError("Enter the position you are preparing for");
      return;
    }
    setError("");
    onSave({
      role: role.trim(),
      level,
      cvText: cvText.trim().slice(0, 15000),
      cvFileName: cvFileName || (cvText.trim() ? "Pasted text" : ""),
      updatedAt: new Date().toISOString(),
    });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!editing) {
    return (
      <div className={styles.myCard}>
        <div className={styles.mySummary}>
          <div>
            <span className={styles.myLabel}>Preparing for</span>
            <div className={styles.myRole}>
              {profile.role}{" "}
              <span className={styles.myLevel}>{profile.level}</span>
            </div>
            <div className={styles.myCvLine}>
              {profile.cvText ? (
                <>
                  📄 {profile.cvFileName || "CV"} ·{" "}
                  {profile.cvText.length.toLocaleString()} chars{" "}
                  <button
                    type="button"
                    className={styles.myLinkBtn}
                    onClick={() => setShowCv((v) => !v)}
                  >
                    {showCv ? "Hide" : "View"}
                  </button>
                </>
              ) : (
                <span className={styles.myMuted}>No CV attached</span>
              )}
              {saved && <span className={styles.answerSaved}> ✓ Saved</span>}
            </div>
          </div>
          <button
            type="button"
            className={styles.answerSaveBtn}
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </div>
        {showCv && profile.cvText && (
          <pre className={styles.myCvPreview}>{profile.cvText}</pre>
        )}
      </div>
    );
  }

  return (
    <div className={styles.myCard}>
      <h3 className={styles.myTitle}>Your target interview</h3>
      <div className={styles.myRow}>
        <label className={styles.myField}>
          <span className={styles.myLabel}>Position</span>
          <input
            className={styles.myInput}
            value={role}
            placeholder="e.g. Senior Backend Engineer (Payments)"
            onChange={(e) => setRole(e.target.value)}
          />
        </label>
        <label className={styles.myField} style={{ maxWidth: 180 }}>
          <span className={styles.myLabel}>Level</span>
          <select
            className={styles.myInput}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {GRADE_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.myField}>
        <span className={styles.myLabel}>CV</span>
        <div className={styles.myCvActions}>
          <label className={styles.myFileBtn}>
            {parsing
              ? "Reading…"
              : cvText
                ? "Replace file (PDF/DOCX)"
                : "Upload PDF/DOCX"}
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFile}
              hidden
              disabled={parsing}
            />
          </label>
          <button
            type="button"
            className={styles.myLinkBtn}
            onClick={() => setPasting((v) => !v)}
          >
            {pasting ? "Hide text" : cvText ? "Edit text" : "or paste text"}
          </button>
          {cvText && (
            <>
              <span className={styles.myMuted}>
                ✓ {cvFileName || "Pasted text"} ·{" "}
                {cvText.length.toLocaleString()} chars
              </span>
              <button
                type="button"
                className={styles.myLinkBtn}
                onClick={() => {
                  setCvText("");
                  setCvFileName("");
                }}
              >
                Remove
              </button>
            </>
          )}
        </div>
        {!isAuthenticated && (
          <span className={styles.myMuted}>
            Sign in to upload a file — or paste the text.
          </span>
        )}
        {pasting && (
          <textarea
            className={styles.answerInput}
            rows={8}
            value={cvText}
            placeholder="Paste your CV text here"
            onChange={(e) => {
              setCvText(e.target.value);
              if (!cvFileName) setCvFileName("Pasted text");
            }}
          />
        )}
      </div>

      {error && <span className={styles.answerError}>{error}</span>}
      <div className={styles.answerActions}>
        <button
          type="button"
          className={styles.answerSaveBtn}
          onClick={save}
          disabled={parsing}
        >
          Save
        </button>
        {profile.role && (
          <button
            type="button"
            className={styles.myLinkBtn}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function AddQuestion({ onAdd }) {
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  function add() {
    const text = q.trim();
    if (!text) return;
    onAdd({ question: text, note: note.trim() });
    setQ("");
    setNote("");
    setShowNote(false);
  }

  return (
    <div className={styles.myCard}>
      <h3 className={styles.myTitle}>Add a question you’re preparing</h3>
      <textarea
        className={styles.answerInput}
        rows={2}
        value={q}
        placeholder="Add your question here..."
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            add();
          }
        }}
      />
      {showNote && (
        <input
          className={styles.myInput}
          value={note}
          placeholder="Note (optional) — e.g. asked in round 1, hint, source"
          onChange={(e) => setNote(e.target.value)}
        />
      )}
      <div className={styles.answerActions}>
        <button
          type="button"
          className={styles.answerSaveBtn}
          onClick={add}
          disabled={!q.trim()}
        >
          + Add question
        </button>
        {!showNote && (
          <button
            type="button"
            className={styles.myLinkBtn}
            onClick={() => setShowNote(true)}
          >
            + note
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function InterviewChecklist() {
  const { isAuthenticated, loading: authLoading, openAuth } = useAuth();

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [progressMap, setProgressMap] = useState({});
  const [answersMap, setAnswersMap] = useState({});
  const [feedbackMap, setFeedbackMap] = useState({}); // { cat: { itemId: { feedback, gradedAt } } }
  const [gradeLevel, setGradeLevel] = useUserState(
    "checklist:grade-level",
    "Mid",
  );
  const [myProfile, setMyProfile] = useUserState("my-interview:profile", {});
  const [myQuestions, setMyQuestions] = useUserState(
    "my-interview:questions",
    [],
  );
  const isMy = activeCategory === MY_CAT.id;
  const [aiStt, setAiStt] = useState(false);

  // AI transcription is available only when signed in and configured on the server.
  useEffect(() => {
    if (!isAuthenticated) {
      setAiStt(false);
      return;
    }
    let cancelled = false;
    api
      .getVoiceConfig()
      .then((c) => !cancelled && setAiStt(!!c?.aiTranscription))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const myData = useMemo(
    () => ({
      sections: [
        {
          id: MY_SECTION_ID,
          title: "My questions",
          items: (Array.isArray(myQuestions) ? myQuestions : []).map((q) => ({
            id: q.id,
            name: q.question,
            note: q.note || undefined,
          })),
        },
      ],
    }),
    [myQuestions],
  );
  const categoryConfig = ALL_CATS.find((c) => c.id === activeCategory);
  const categoryData = isMy ? myData : TOPICS_DATA[activeCategory];
  const progress = progressMap[activeCategory] || {};
  const answers = answersMap[activeCategory] || {};

  // Load state whenever auth status settles or changes.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      if (isAuthenticated) {
        try {
          const grouped = await api.getChecklist(); // { cat: { itemId: {checked, answer} } }
          // One-time upload of anything recorded while signed out in this
          // browser, then clear it so it can't leak into another account.
          await uploadGuestChecklist(grouped);
          if (cancelled) return;
          const p = {};
          const a = {};
          const f = {};
          ALL_CATS.forEach((cat) => {
            p[cat.id] = {};
            a[cat.id] = {};
            f[cat.id] = {};
            const items = grouped[cat.id] || {};
            Object.entries(items).forEach(([itemId, s]) => {
              p[cat.id][itemId] = !!s.checked;
              if (s.answer) a[cat.id][itemId] = s.answer;
              if (s.feedback)
                f[cat.id][itemId] = {
                  feedback: s.feedback,
                  gradedAt: s.gradedAt,
                };
            });
          });
          setProgressMap(p);
          setAnswersMap(a);
          setFeedbackMap(f);
          return;
        } catch {
          // fall through to local storage if the API is unreachable
        }
      }
      const p = {};
      const a = {};
      ALL_CATS.forEach((cat) => {
        p[cat.id] = loadProgress(cat.id);
        a[cat.id] = loadAnswers(cat.id);
      });
      if (!cancelled) {
        setProgressMap(p);
        setAnswersMap(a);
        setFeedbackMap({});
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  // Persist one item to the server (when signed in) or local storage.
  const persist = useCallback(
    (categoryId, itemId, patch) => {
      if (isAuthenticated) {
        return api.upsertItem(itemId, { categoryId, ...patch });
      }
      // local fallback
      if (patch.checked !== undefined) {
        const next = { ...loadProgress(categoryId), [itemId]: patch.checked };
        saveProgress(categoryId, next);
      }
      if (patch.answer !== undefined) {
        const next = { ...loadAnswers(categoryId), [itemId]: patch.answer };
        saveAnswers(categoryId, next);
      }
      return Promise.resolve();
    },
    [isAuthenticated],
  );

  const toggle = useCallback(
    (itemId) => {
      const current = progressMap[activeCategory] || {};
      const nextChecked = !current[itemId];
      setProgressMap((prev) => ({
        ...prev,
        [activeCategory]: {
          ...(prev[activeCategory] || {}),
          [itemId]: nextChecked,
        },
      }));
      persist(activeCategory, itemId, { checked: nextChecked }).catch(() => {
        // revert on failure
        setProgressMap((prev) => ({
          ...prev,
          [activeCategory]: {
            ...(prev[activeCategory] || {}),
            [itemId]: !nextChecked,
          },
        }));
      });
    },
    [activeCategory, progressMap, persist],
  );

  const saveAnswer = useCallback(
    async (itemId, text) => {
      await persist(activeCategory, itemId, { answer: text });
      setAnswersMap((prev) => ({
        ...prev,
        [activeCategory]: { ...(prev[activeCategory] || {}), [itemId]: text },
      }));
    },
    [activeCategory, persist],
  );

  const totalItems = useMemo(
    () => categoryData.sections.reduce((s, sec) => s + sec.items.length, 0),
    [categoryData],
  );

  const solvedItems = useMemo(
    () =>
      categoryData.sections.reduce(
        (s, sec) => s + sec.items.filter((item) => progress[item.id]).length,
        0,
      ),
    [categoryData, progress],
  );

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categoryData.sections;

    const allItems = categoryData.sections.flatMap((sec) =>
      sec.items.map((item) => ({ ...item, sectionTitle: sec.title })),
    );

    const matchedIds = new Set(
      allItems
        .filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.note && item.note.toLowerCase().includes(q)),
        )
        .map((item) => item.id),
    );

    if (filter === "done") {
      matchedIds.forEach((id) => {
        if (!progress[id]) matchedIds.delete(id);
      });
    } else if (filter === "todo") {
      matchedIds.forEach((id) => {
        if (progress[id]) matchedIds.delete(id);
      });
    }

    const filtered = allItems.filter((item) => matchedIds.has(item.id));

    const sectionMap = {};
    filtered.forEach((item) => {
      if (!sectionMap[item.sectionTitle]) {
        const orig = categoryData.sections.find(
          (s) => s.title === item.sectionTitle,
        );
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
      !window.confirm(
        `Reset all "${categoryConfig.label}" progress? This cannot be undone.`,
      )
    ) {
      return;
    }
    setProgressMap((prev) => ({ ...prev, [activeCategory]: {} }));
    setAnswersMap((prev) => ({ ...prev, [activeCategory]: {} }));
    setFeedbackMap((prev) => ({ ...prev, [activeCategory]: {} }));
    if (isAuthenticated) {
      api.resetCategory(activeCategory).catch(() => {});
    } else {
      saveProgress(activeCategory, {});
      saveAnswers(activeCategory, {});
    }
  }, [activeCategory, categoryConfig.label, isAuthenticated]);

  const grade = useCallback(
    async (itemId, payload) => {
      const res = await api.gradeChecklistItem(itemId, {
        categoryId: activeCategory,
        level: isMy ? myProfile?.level || gradeLevel : gradeLevel,
        ...payload,
      });
      setAnswersMap((prev) => ({
        ...prev,
        [activeCategory]: {
          ...(prev[activeCategory] || {}),
          [itemId]: res.answer,
        },
      }));
      setFeedbackMap((prev) => ({
        ...prev,
        [activeCategory]: {
          ...(prev[activeCategory] || {}),
          [itemId]: { feedback: res.feedback, gradedAt: res.gradedAt },
        },
      }));
      return res;
    },
    [activeCategory, gradeLevel, isMy, myProfile],
  );

  // ── My Interview: question CRUD (list stored per user via UserState)
  const addMyQuestion = useCallback(
    ({ question, note }) => {
      setMyQuestions((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: newQuestionId(),
          question,
          note,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [setMyQuestions],
  );

  const editMyQuestion = useCallback(
    (id, patch) => {
      setMyQuestions((prev) =>
        (Array.isArray(prev) ? prev : []).map((q) =>
          q.id === id ? { ...q, ...patch } : q,
        ),
      );
    },
    [setMyQuestions],
  );

  const deleteMyQuestion = useCallback(
    (id) => {
      if (!window.confirm("Delete this question and its answer?")) return;
      setMyQuestions((prev) =>
        (Array.isArray(prev) ? prev : []).filter((q) => q.id !== id),
      );
      const drop = (prev) => {
        const cat = { ...(prev[MY_CAT.id] || {}) };
        delete cat[id];
        return { ...prev, [MY_CAT.id]: cat };
      };
      setProgressMap(drop);
      setAnswersMap(drop);
      setFeedbackMap(drop);
      if (isAuthenticated) {
        api.deleteChecklistItem(id).catch(() => {});
      } else {
        const p = loadProgress(MY_CAT.id);
        const a = loadAnswers(MY_CAT.id);
        delete p[id];
        delete a[id];
        saveProgress(MY_CAT.id, p);
        saveAnswers(MY_CAT.id, a);
      }
    },
    [setMyQuestions, isAuthenticated],
  );

  const answerCtx = useMemo(
    () => ({
      isAuthenticated,
      openAuth,
      aiStt,
      grade,
      feedbackFor: (itemId) =>
        (feedbackMap[activeCategory] || {})[itemId] || null,
    }),
    [isAuthenticated, openAuth, aiStt, grade, feedbackMap, activeCategory],
  );

  const cssVarColor = categoryConfig.color;
  const tabStyle = {
    "--tab-accent": cssVarColor,
    "--tab-bg": `linear-gradient(145deg, ${cssVarColor}12, #a855f712)`,
    "--tab-glow": `${cssVarColor}18`,
  };

  const actualPct =
    totalItems > 0 ? Math.round((solvedItems / totalItems) * 100) : 0;

  return (
    <AnswerCtx.Provider value={answerCtx}>
      <Layout
        title="Interview Checklist"
        description="Comprehensive interview preparation checklist — track your progress across all topics"
      >
        <div className={styles.root}>
          <header className={styles.hero}>
            <span className={styles.heroTag}>
              {CATEGORIES.length} Tracks /{" "}
              {Object.values(TOPICS_DATA).reduce(
                (s, d) =>
                  s + d.sections.reduce((ss, sec) => ss + sec.items.length, 0),
                0,
              )}{" "}
              Topics
            </span>
            <h1 className={styles.heroTitle}>
              Interview <span className={styles.neonGradient}>Checklist</span>
            </h1>
            <p className={styles.heroSub}>
              Comprehensive interview preparation tracker. Track your progress
              across Behavioural, System Design, Databases, Microservices, CS
              Fundamentals, and more.
            </p>
            {!authLoading && !isAuthenticated && (
              <p
                className={styles.heroSub}
                style={{ marginTop: "0.5rem", fontSize: "0.82rem" }}
              >
                Progress is saved on this device.{" "}
                <button
                  onClick={openAuth}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#00f0ff",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  Sign in
                </button>{" "}
                to sync across devices.
              </p>
            )}
          </header>

          <div className={styles.categoryTabs} style={tabStyle}>
            {ALL_CATS.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.categoryTab} ${
                  activeCategory === cat.id ? styles.categoryTabActive : ""
                }`}
                onClick={() => setActiveCategory(cat.id)}
                style={
                  activeCategory === cat.id
                    ? {
                        "--tab-accent": cat.color,
                        "--tab-bg": `linear-gradient(145deg, ${cat.color}12, #a855f712)`,
                        "--tab-glow": `${cat.color}18`,
                      }
                    : {}
                }
              >
                {cat.label}
              </button>
            ))}
          </div>

          {isMy && (
            <div className={styles.myWrap}>
              <MyInterviewProfile
                profile={myProfile || {}}
                onSave={setMyProfile}
                isAuthenticated={isAuthenticated}
                openAuth={openAuth}
              />
              <AddQuestion onAdd={addMyQuestion} />
            </div>
          )}

          <section className={styles.dashboard}>
            <ProgressRing pct={actualPct} color={categoryConfig.color} />
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{solvedItems}</span>
                <span className={styles.statLabel}>Checked</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {totalItems - solvedItems}
                </span>
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
            {[
              ["all", "All"],
              ["todo", "To Do"],
              ["done", "Done"],
            ].map(([k, l]) => (
              <button
                key={k}
                className={`${styles.filterBtn} ${filter === k ? styles.filterBtnActive : ""}`}
                onClick={() => setFilter(k)}
              >
                {l}
              </button>
            ))}
            <input
              className={styles.searchInput}
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isMy ? (
              <span className={styles.levelPicker}>
                AI grades at your target level:{" "}
                <strong>{myProfile?.level || gradeLevel}</strong>
              </span>
            ) : (
              <label
                className={styles.levelPicker}
                title="Seniority level the AI grades your answers against"
              >
                AI grading level
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                >
                  {GRADE_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {searchActive ? (
            <section
              className={styles.searchResults}
              aria-labelledby="search-results-heading"
            >
              <h2
                id="search-results-heading"
                className={styles.searchResultsTitle}
              >
                Matching topics
                <span className={styles.searchResultsCount}>
                  {matchedCount}
                </span>
              </h2>
              {matchedCount === 0 ? (
                <p className={styles.emptyState}>
                  No topics match your search and filter.
                </p>
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
                            className={`${styles.itemName} ${progress[item.id] ? styles.itemNameDone : ""}`}
                          >
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
                              className={styles.itemResource}
                            >
                              Ref
                            </a>
                          )}
                        </div>
                        <AnswerBox
                          item={item}
                          sectionTitle={sec.title}
                          value={answers[item.id] || ""}
                          onSave={(text) => saveAnswer(item.id, text)}
                        />
                        <div className={styles.searchResultMeta}>
                          {sec.title}
                        </div>
                      </li>
                    )),
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
                answers={answers}
                onToggle={toggle}
                onSaveAnswer={saveAnswer}
                onEditItem={isMy ? editMyQuestion : undefined}
                onDeleteItem={isMy ? deleteMyQuestion : undefined}
                emptyText={
                  isMy
                    ? "No questions yet — add the first one above."
                    : undefined
                }
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
    </AnswerCtx.Provider>
  );
}
