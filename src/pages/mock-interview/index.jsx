import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../compat/Layout.jsx';
import styles from './styles.module.css';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { useUserState } from '../../auth/UserStateContext.jsx';
import { useSpeaker, useDictation } from './useVoice.js';

const LEVELS = ['Intern', 'Junior', 'Mid', 'Senior', 'Staff', 'Principal'];
const TYPES = [
  { id: 'technical', label: 'Technical' },
  { id: 'live-coding', label: 'Live Coding' },
  { id: 'system-design', label: 'System Design' },
  { id: 'behavioural', label: 'Behavioural' },
  { id: 'mixed', label: 'Mixed (full loop)' },
];
const DURATIONS = [15, 30, 45];

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const CODE_LANGS = ['python', 'javascript', 'typescript', 'java', 'cpp', 'go', 'csharp', 'kotlin', 'rust', 'sql'];

function typeLabel(id) {
  return TYPES.find((t) => t.id === id)?.label || id;
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// Render a message, turning ```lang ... ``` fences into code blocks.
function MessageContent({ content }) {
  const parts = [];
  const re = /```([\w+#.-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: content.slice(last, m.index) });
    parts.push({ type: 'code', lang: m[1], value: m[2].replace(/\n$/, '') });
    last = re.lastIndex;
  }
  if (last < content.length) parts.push({ type: 'text', value: content.slice(last) });

  return (
    <div className={styles.bubbleText}>
      {parts.map((p, i) =>
        p.type === 'code' ? (
          <pre key={i} className={styles.codeBlock}>
            {p.lang && <span className={styles.codeLang}>{p.lang}</span>}
            <code>{p.value}</code>
          </pre>
        ) : (
          <span key={i}>{p.value.replace(/^\n+|\n+$/g, '')}</span>
        )
      )}
    </div>
  );
}

// Minimal dependency-free code editor: monospace, line numbers, Tab indents,
// Shift+Tab outdents, Enter keeps the current indentation.
function CodeEditor({ value, onChange, language, onLanguageChange, disabled, onSubmit }) {
  const taRef = useRef(null);
  const gutterRef = useRef(null);
  const lineCount = Math.max(1, value.split('\n').length);
  const INDENT = '    ';

  function setWithCursor(next, start, end = start) {
    onChange(next);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (ta) {
        ta.selectionStart = start;
        ta.selectionEnd = end;
      }
    });
  }

  function onKeyDown(e) {
    const ta = e.currentTarget;
    const { selectionStart: s0, selectionEnd: s1 } = ta;

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', s0 - 1) + 1;
      if (e.shiftKey) {
        // outdent every selected line
        const block = value.slice(lineStart, s1);
        let removedFirst = 0;
        let removed = 0;
        const out = block
          .split('\n')
          .map((ln, i) => {
            const n = ln.startsWith(INDENT) ? INDENT.length : ln.match(/^ */)[0].length;
            if (i === 0) removedFirst = n;
            removed += n;
            return ln.slice(n);
          })
          .join('\n');
        setWithCursor(
          value.slice(0, lineStart) + out + value.slice(s1),
          Math.max(lineStart, s0 - removedFirst),
          Math.max(lineStart, s1 - removed)
        );
      } else if (s0 !== s1 && value.slice(s0, s1).includes('\n')) {
        // indent every selected line
        const block = value.slice(lineStart, s1);
        const lines = block.split('\n');
        const out = lines.map((ln) => INDENT + ln).join('\n');
        setWithCursor(
          value.slice(0, lineStart) + out + value.slice(s1),
          s0 + INDENT.length,
          s1 + INDENT.length * lines.length
        );
      } else {
        setWithCursor(value.slice(0, s0) + INDENT + value.slice(s1), s0 + INDENT.length);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', s0 - 1) + 1;
      const indent = value.slice(lineStart, s0).match(/^[ \t]*/)[0];
      const extra = /[:{[(]\s*$/.test(value.slice(lineStart, s0)) ? INDENT : '';
      const ins = '\n' + indent + extra;
      setWithCursor(value.slice(0, s0) + ins + value.slice(s1), s0 + ins.length);
    }
  }

  return (
    <div className={styles.editorWrap}>
      <div className={styles.editorBar}>
        <span className={styles.editorTitle}>Code editor</span>
        <select
          className={styles.editorLang}
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}>
          {CODE_LANGS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
      <div className={styles.editorBody}>
        <pre className={styles.editorGutter} ref={gutterRef} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
        </pre>
        <textarea
          ref={taRef}
          className={styles.editorInput}
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={'# Write your solution here\n# Tab = indent · Ctrl/⌘+Enter = send'}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={(e) => {
            if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          disabled={disabled}
          rows={12}
        />
      </div>
    </div>
  );
}

// ─── Interviewer avatar ──────────────────────────────────────────────────────
// Emoji face that "talks" (mouth alternates) while the voice is playing,
// ponders while the AI is generating, and leans in while you're speaking.
function InterviewerAvatar({ mode }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (mode !== 'speaking') return;
    const t = setInterval(() => setFrame((f) => (f + 1) % 4), 140);
    return () => clearInterval(t);
  }, [mode]);

  const TALK = ['😮', '🙂', '😯', '😐'];
  const face =
    mode === 'speaking' ? TALK[frame]
    : mode === 'thinking' ? '🤔'
    : mode === 'listening' ? '🧐'
    : '🙂';
  const label =
    mode === 'speaking' ? 'Speaking…'
    : mode === 'thinking' ? 'Thinking…'
    : mode === 'listening' ? 'Listening to you…'
    : 'Waiting for your answer';

  return (
    <div className={`${styles.avatar} ${styles['avatar_' + mode] || ''}`} aria-live="polite">
      <div className={styles.avatarFace}>
        <span className={styles.avatarRing} />
        <span className={styles.avatarEmoji} role="img" aria-label="Interviewer">{face}</span>
      </div>
      <div className={styles.avatarInfo}>
        <span className={styles.avatarName}>Interviewer</span>
        <span className={styles.avatarStatus}>
          {mode === 'speaking' && (
            <span className={styles.wave} aria-hidden="true">
              <i /><i /><i /><i />
            </span>
          )}
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── History ─────────────────────────────────────────────────────────────────

function History({ onOpen, refreshKey }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    api
      .listInterviews()
      .then((r) => !cancelled && setRows(r || []))
      .catch((err) => !cancelled && setError(err.message || 'Could not load history'));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Past interviews</h2>
      {error && <div className={styles.error}>{error}</div>}
      {!rows && !error && <p className={styles.hint}>Loading…</p>}
      {rows && rows.length === 0 && (
        <p className={styles.hint}>No interviews yet — your sessions will show up here.</p>
      )}
      {rows && rows.length > 0 && (
        <ul className={styles.historyList}>
          {rows.map((r) => {
            const done = r.status === 'completed';
            const pct = r.passProbability;
            const color = pct >= 70 ? '#34d399' : pct >= 45 ? '#f59e0b' : '#ef4444';
            return (
              <li key={r.id}>
                <button type="button" className={styles.historyItem} onClick={() => onOpen(r.id)}>
                  <span className={styles.historyMain}>
                    <strong>{r.role}</strong> · {r.level} · {typeLabel(r.interviewType)} · {r.durationMin} min
                  </span>
                  <span className={styles.historyMeta}>{fmtDate(r.createdAt)}</span>
                  {done && typeof pct === 'number' ? (
                    <span className={styles.historyScore} style={{ color }}>{pct}%</span>
                  ) : (
                    <span className={styles.historyBadge}>In progress</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Transcript({ messages }) {
  return (
    <div className={styles.chat}>
      {messages.map((m, i) => (
        <div
          key={i}
          className={`${styles.bubble} ${m.sender === 'interviewer' ? styles.bubbleAi : styles.bubbleMe}`}>
          <span className={styles.bubbleWho}>{m.sender === 'interviewer' ? 'Interviewer' : 'You'}</span>
          <MessageContent content={m.content} />
        </div>
      ))}
    </div>
  );
}

// Detail view for one past interview: transcript + evaluation. In-progress
// sessions can be resumed (if time remains) or scored.
function HistoryDetail({ id, onBack, onResume }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('results');

  const load = useCallback(() => {
    setError('');
    return api
      .getInterview(id)
      .then((d) => {
        setData(d);
        setTab(d.status === 'completed' ? 'results' : 'transcript');
      })
      .catch((err) => setError(err.message || 'Could not load interview'));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function score() {
    setBusy(true);
    setError('');
    try {
      await api.finishInterview(id);
      await load();
    } catch (err) {
      setError(err.message || 'Could not score this interview');
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <div className={styles.card}>
        <div className={styles.error}>{error}</div>
        <button className={styles.secondaryBtn} onClick={onBack}>← Back</button>
      </div>
    );
  }
  if (!data) return <div className={styles.card}><p className={styles.hint}>Loading…</p></div>;

  const done = data.status === 'completed';
  const canResume = !done && data.secondsRemaining > 0;
  const result = done
    ? { passProbability: data.passProbability, ...(data.summary || {}) }
    : null;

  return (
    <div className={styles.detailWrap}>
      <div className={styles.detailHead}>
        <button className={styles.secondaryBtn} onClick={onBack}>← All interviews</button>
        <div className={styles.detailMeta}>
          <strong>{data.role}</strong> · {data.level} · {typeLabel(data.interviewType)} ·{' '}
          {data.durationMin} min · {fmtDate(data.startedAt)}
        </div>
      </div>

      {!done && (
        <div className={styles.card}>
          <p className={styles.hint}>
            This interview wasn’t finished
            {canResume ? ` — ${fmt(data.secondsRemaining)} left.` : ' and its time is up.'}
          </p>
          <div className={styles.detailActions}>
            {canResume && (
              <button className={styles.primaryBtn} onClick={() => onResume(data)} disabled={busy}>
                Resume interview
              </button>
            )}
            <button className={styles.secondaryBtn} onClick={score} disabled={busy}>
              {busy ? 'Scoring…' : 'End & get results'}
            </button>
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}

      {done && (
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${tab === 'results' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('results')}>
            Results
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'transcript' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('transcript')}>
            Transcript
          </button>
        </div>
      )}

      {done && tab === 'results' && <Results result={result} />}
      {(tab === 'transcript' || !done) && <Transcript messages={data.messages} />}
    </div>
  );
}

// ─── Setup screen ────────────────────────────────────────────────────────────

function Setup({ onStart }) {
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('Mid');
  const [type, setType] = useState('mixed');
  const [duration, setDuration] = useState(30);
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');
    setParsing(true);
    setResumeText('');
    try {
      const { text } = await api.parseResume(f);
      setResumeText(text);
    } catch (err) {
      setError(err.message || 'Could not read that file');
      setFile(null);
    } finally {
      setParsing(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!role.trim()) return setError('Enter the role you are interviewing for');
    if (!resumeText) return setError('Upload your resume (PDF or DOCX)');
    setBusy(true);
    try {
      await onStart({
        role: role.trim(),
        level,
        interviewType: type,
        durationMin: duration,
        resumeText,
      });
    } catch (err) {
      setError(err.message || 'Could not start the interview');
      setBusy(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={submit}>
      <h2 className={styles.cardTitle}>Set up your mock interview</h2>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Role</span>
        <input
          className={styles.input}
          placeholder="e.g. Backend Engineer, Data Scientist"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Level</span>
          <select className={styles.input} value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Interview type</span>
          <select className={styles.input} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Duration</span>
        <div className={styles.durations}>
          {DURATIONS.map((d) => (
            <button
              type="button"
              key={d}
              className={`${styles.durationBtn} ${duration === d ? styles.durationBtnActive : ''}`}
              onClick={() => setDuration(d)}>
              {d} min
            </button>
          ))}
        </div>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Resume (PDF or DOCX)</span>
        <input type="file" accept=".pdf,.docx" onChange={handleFile} className={styles.file} />
        {parsing && <span className={styles.hint}>Reading your resume…</span>}
        {resumeText && !parsing && (
          <span className={styles.hintOk}>✓ Resume loaded ({resumeText.length} chars)</span>
        )}
      </label>

      {error && <div className={styles.error}>{error}</div>}

      <button className={styles.primaryBtn} type="submit" disabled={busy || parsing}>
        {busy ? 'Starting…' : 'Start interview'}
      </button>
    </form>
  );
}

// ─── Live interview screen ───────────────────────────────────────────────────

function Live({ session, onEnded }) {
  const [messages, setMessages] = useState(
    session.messages && session.messages.length
      ? session.messages
      : [{ sender: 'interviewer', content: session.question }]
  );
  const [answer, setAnswer] = useState('');
  const isCoding = session.interviewType === 'live-coding';

  // ── voice: interviewer TTS + candidate dictation (browser APIs, free)
  const [voiceOn, setVoiceOn] = useUserState('interview:voice-on', true);
  const speaker = useSpeaker();
  const dictation = useDictation({
    onFinal: (t) => t && setAnswer((a) => (a.trim() ? a.replace(/\s*$/, ' ') : '') + t),
  });
  const lastSpokenRef = useRef(-1);
  const [code, setCode] = useState('');
  const [codeLang, setCodeLang] = useState('python');
  const [thinking, setThinking] = useState(false);
  const [remaining, setRemaining] = useState(session.secondsRemaining);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const endedRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Read each new interviewer message aloud.
  useEffect(() => {
    const i = messages.length - 1;
    const last = messages[i];
    if (!last || last.sender !== 'interviewer' || i <= lastSpokenRef.current) return;
    lastSpokenRef.current = i;
    if (voiceOn && !dictation.listening) speaker.speak(last.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const toggleVoice = () => {
    if (voiceOn) speaker.stop();
    setVoiceOn(!voiceOn);
  };

  const replay = () => {
    const last = [...messages].reverse().find((m) => m.sender === 'interviewer');
    if (last) speaker.speak(last.content);
  };

  const toggleMic = () => {
    if (dictation.listening) dictation.stop();
    else {
      speaker.stop(); // barge-in: stop the interviewer when you start talking
      dictation.start();
    }
  };

  const avatarMode = thinking
    ? 'thinking'
    : speaker.speaking
      ? 'speaking'
      : dictation.listening
        ? 'listening'
        : 'idle';

  // Countdown; auto-finish at zero.
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          if (!endedRef.current) {
            endedRef.current = true;
            api
              .finishInterview(session.id)
              .then((result) => onEnded(result, messages))
              .catch(() => onEnded(null, messages));
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining > 0]);

  const send = useCallback(async () => {
    const prose = answer.trim();
    const codeText = isCoding ? code.replace(/\s+$/, '') : '';
    const text = [prose, codeText ? '```' + codeLang + '\n' + codeText + '\n```' : '']
      .filter(Boolean)
      .join('\n\n');
    if (!text || thinking || endedRef.current) return;
    dictation.stop();
    speaker.stop();
    setError('');
    setAnswer('');
    const newMsgs = [...messages, { sender: 'candidate', content: text }];
    setMessages(newMsgs);
    setThinking(true);
    try {
      const res = await api.answerInterview(session.id, text);
      if (res.ended) {
        endedRef.current = true;
        const finalMsgs = res.closing
          ? [...newMsgs, { sender: 'interviewer', content: res.closing }]
          : newMsgs;
        setMessages(finalMsgs);
        onEnded(res.result, finalMsgs);
        return;
      }
      setMessages((m) => [...m, { sender: 'interviewer', content: res.question }]);
      if (typeof res.secondsRemaining === 'number') setRemaining(res.secondsRemaining);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      // restore the answer so it isn't lost
      setAnswer(prose);
      setMessages(messages);
      return;
    } finally {
      setThinking(false);
    }
    // Sent successfully: keep the code (candidates often iterate on it) —
    // they can clear it with the button.
  }, [answer, code, codeLang, isCoding, thinking, messages, session.id, onEnded, dictation, speaker]);

  async function endNow() {
    if (endedRef.current) return;
    if (!window.confirm('End the interview now and see your results?')) return;
    endedRef.current = true;
    dictation.stop();
    speaker.stop();
    setThinking(true);
    try {
      const result = await api.finishInterview(session.id);
      onEnded(result, messages);
    } catch (err) {
      setError(err.message || 'Could not end the interview');
      endedRef.current = false;
      setThinking(false);
    }
  }

  const low = remaining <= 60;

  return (
    <div className={styles.liveWrap}>
      <div className={styles.liveBar}>
        <span className={styles.liveMeta}>
          {session.role} · {session.level} · {typeLabel(session.interviewType)}
        </span>
        <span className={`${styles.timer} ${low ? styles.timerLow : ''}`}>⏱ {fmt(remaining)}</span>
        <button className={styles.endBtn} onClick={endNow}>End</button>
      </div>

      <div className={styles.stage}>
        <InterviewerAvatar mode={avatarMode} />
        <div className={styles.voiceControls}>
          {speaker.supported ? (
            <>
              <button
                type="button"
                className={`${styles.voiceBtn} ${voiceOn ? styles.voiceBtnOn : ''}`}
                onClick={toggleVoice}
                title={voiceOn ? 'Mute interviewer voice' : 'Read questions aloud'}>
                {voiceOn ? '🔊 Voice on' : '🔇 Voice off'}
              </button>
              <button
                type="button"
                className={styles.voiceBtn}
                onClick={speaker.speaking ? speaker.stop : replay}
                title={speaker.speaking ? 'Stop speaking' : 'Repeat the last question'}>
                {speaker.speaking ? '⏹ Stop' : '🔁 Repeat'}
              </button>
            </>
          ) : (
            <span className={styles.hint}>Voice playback isn’t supported in this browser.</span>
          )}
        </div>
      </div>

      <div className={styles.chat}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`${styles.bubble} ${m.sender === 'interviewer' ? styles.bubbleAi : styles.bubbleMe}`}>
            <span className={styles.bubbleWho}>
              {m.sender === 'interviewer' ? 'Interviewer' : 'You'}
            </span>
            <MessageContent content={m.content} />
          </div>
        ))}
        {thinking && (
          <div className={`${styles.bubble} ${styles.bubbleAi}`}>
            <span className={styles.bubbleWho}>Interviewer</span>
            <p className={styles.bubbleText}><em>thinking…</em></p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {isCoding && (
        <>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={codeLang}
            onLanguageChange={setCodeLang}
            disabled={thinking || remaining <= 0}
            onSubmit={send}
          />
          {code && (
            <div className={styles.editorActions}>
              <button type="button" className={styles.linkBtn} onClick={() => setCode('')}>
                Clear code
              </button>
              <span className={styles.hint}>The code is sent with your message below.</span>
            </div>
          )}
        </>
      )}

      <div className={styles.composer}>
        <textarea
          className={styles.answerInput}
          placeholder={
            isCoding
              ? 'Explain your approach / complexity… (Enter to send, Shift+Enter for a new line)'
              : 'Type your answer… (Enter to send, Shift+Enter for a new line)'
          }
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={3}
          disabled={thinking || remaining <= 0}
        />
        {dictation.supported && (
          <button
            type="button"
            className={`${styles.micBtn} ${dictation.listening ? styles.micBtnOn : ''}`}
            onClick={toggleMic}
            disabled={thinking || remaining <= 0}
            title={dictation.listening ? 'Stop voice input' : 'Answer by voice'}
            aria-pressed={dictation.listening}>
            {dictation.listening ? '⏹' : '🎤'}
          </button>
        )}
        <button
          className={styles.sendBtn}
          onClick={send}
          disabled={thinking || (!answer.trim() && !(isCoding && code.trim()))}>
          Send
        </button>
      </div>
      {dictation.listening && (
        <div className={styles.dictation}>
          <span className={styles.recDot} /> Listening — speak your answer, then press Send.
          {dictation.interim && <em className={styles.interim}> {dictation.interim}</em>}
        </div>
      )}
      {dictation.error && <div className={styles.error}>{dictation.error}</div>}
      {!dictation.supported && (
        <span className={styles.hint}>
          Voice answers need Chrome, Edge or Safari — Firefox doesn’t support speech recognition.
        </span>
      )}
    </div>
  );
}

// ─── Results screen ──────────────────────────────────────────────────────────

function Results({ result, onRestart }) {
  if (!result) {
    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Interview ended</h2>
        <p className={styles.hint}>We couldn’t generate a score this time. Please try again.</p>
        {onRestart && <button className={styles.primaryBtn} onClick={onRestart}>New interview</button>}
      </div>
    );
  }
  const pct = result.passProbability ?? 0;
  const color = pct >= 70 ? '#34d399' : pct >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div className={styles.results}>
      <div className={styles.scoreCard}>
        <div className={styles.scoreNum} style={{ color }}>{pct}%</div>
        <div className={styles.scoreLabel}>estimated chance to pass</div>
      </div>
      {result.overallSummary && <p className={styles.overall}>{result.overallSummary}</p>}

      <h3 className={styles.answersHeading}>Answer-by-answer feedback</h3>
      <div className={styles.answers}>
        {(result.answers || []).map((a, i) => (
          <div key={i} className={styles.answerCard}>
            <p className={styles.aq}><strong>Q{i + 1}.</strong> {a.question}</p>
            {a.answer && <p className={styles.aa}><span className={styles.aLabel}>Your answer:</span> {a.answer}</p>}
            {a.assessment && <p className={styles.aAssess}><span className={styles.aLabel}>Assessment:</span> {a.assessment}</p>}
            {a.improvement && <p className={styles.aImprove}><span className={styles.aLabel}>Improve:</span> {a.improvement}</p>}
          </div>
        ))}
      </div>

      {onRestart && <button className={styles.primaryBtn} onClick={onRestart}>New interview</button>}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function MockInterview() {
  const { isAuthenticated, loading, openAuth } = useAuth();
  // setup | live | results | history | detail
  const [phase, setPhase] = useState('setup');
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);

  const start = useCallback(async (payload) => {
    const s = await api.createInterview(payload);
    setSession(s);
    setPhase('live');
  }, []);

  const handleEnded = useCallback((res) => {
    setResult(res);
    setPhase('results');
    setHistoryKey((k) => k + 1);
  }, []);

  const restart = useCallback(() => {
    setSession(null);
    setResult(null);
    setPhase('setup');
  }, []);

  const openHistory = useCallback(() => {
    setHistoryKey((k) => k + 1);
    setPhase('history');
  }, []);

  const openDetail = useCallback((id) => {
    setDetailId(id);
    setPhase('detail');
  }, []);

  // Resume an unfinished session from history (full transcript from the server).
  const resume = useCallback((data) => {
    setSession({
      id: data.id,
      role: data.role,
      level: data.level,
      interviewType: data.interviewType,
      durationMin: data.durationMin,
      secondsRemaining: data.secondsRemaining,
      messages: data.messages,
    });
    setPhase('live');
  }, []);

  return (
    <Layout title="Mock Interview" description="Practice interviews with an AI interviewer">
      <div className={styles.root}>
        <header className={styles.hero}>
          <span className={styles.heroTag}>AI Mock Interview</span>
          <h1 className={styles.heroTitle}>
            Practice with an <span className={styles.neon}>AI interviewer</span>
          </h1>
          <p className={styles.heroSub}>
            Pick a role, level, and format, upload your resume, and get grilled — then
            see your estimated pass rate and how to improve each answer.
          </p>
        </header>

        {!loading && !isAuthenticated ? (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Sign in to start</h2>
            <p className={styles.hint}>
              Mock interviews are saved to your account so you can review them later.
            </p>
            <button className={styles.primaryBtn} onClick={openAuth}>Sign in</button>
          </div>
        ) : (
          <>
            {phase !== 'live' && (
              <div className={styles.tabs}>
                <button
                  className={`${styles.tabBtn} ${phase === 'setup' || phase === 'results' ? styles.tabBtnActive : ''}`}
                  onClick={restart}>
                  New interview
                </button>
                <button
                  className={`${styles.tabBtn} ${phase === 'history' || phase === 'detail' ? styles.tabBtnActive : ''}`}
                  onClick={openHistory}>
                  History
                </button>
              </div>
            )}
            {phase === 'setup' && <Setup onStart={start} />}
            {phase === 'live' && session && (
              <Live key={session.id} session={session} onEnded={handleEnded} />
            )}
            {phase === 'results' && <Results result={result} onRestart={restart} />}
            {phase === 'history' && <History onOpen={openDetail} refreshKey={historyKey} />}
            {phase === 'detail' && detailId && (
              <HistoryDetail id={detailId} onBack={openHistory} onResume={resume} />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
