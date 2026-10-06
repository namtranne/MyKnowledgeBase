// Browser-native voice for the mock interview — no API cost.
//  - useSpeaker: interviewer text-to-speech via window.speechSynthesis
//  - useDictation: candidate speech-to-text via (webkit)SpeechRecognition
// Both degrade gracefully: `supported` is false where the browser lacks the API.
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Text-to-speech ──────────────────────────────────────────────────────────

const PREFERRED_VOICES = [
  // natural-sounding voices first (Edge "Online (Natural)", Chrome "Google", macOS)
  /natural/i,
  /google us english/i,
  /samantha/i,
  /aria|jenny|guy/i,
  /google uk english/i,
  /daniel|karen|moira/i,
];

function pickVoice(voices) {
  const en = voices.filter((v) => /^en[-_]/i.test(v.lang));
  for (const re of PREFERRED_VOICES) {
    const v = en.find((x) => re.test(x.name));
    if (v) return v;
  }
  return en.find((v) => v.default) || en[0] || voices[0] || null;
}

// Code is shown on screen, not read aloud.
function speakableText(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' (see the code on screen) ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Chrome cuts off long utterances (~15s), so speak sentence-sized chunks.
function chunk(text, max = 180) {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
  const out = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = '';
    }
    if (s.length > max) {
      // very long sentence: split on commas / spaces
      const words = s.split(/(?<=,)\s+|\s+/);
      for (const w of words) {
        if ((cur + ' ' + w).length > max && cur) {
          out.push(cur.trim());
          cur = '';
        }
        cur += ' ' + w;
      }
    } else {
      cur += s;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function useSpeaker() {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const supported = !!synth && typeof window.SpeechSynthesisUtterance !== 'undefined';
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef(null);
  const tokenRef = useRef(0); // invalidates callbacks from cancelled speech

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      voiceRef.current = pickVoice(synth.getVoices());
    };
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => {
      synth.removeEventListener?.('voiceschanged', load);
      synth.cancel();
    };
  }, [supported, synth]);

  const stop = useCallback(() => {
    if (!supported) return;
    tokenRef.current += 1;
    synth.cancel();
    setSpeaking(false);
  }, [supported, synth]);

  const speak = useCallback(
    (text) => {
      if (!supported) return;
      stop();
      const parts = chunk(speakableText(text));
      if (!parts.length) return;
      const token = tokenRef.current;
      setSpeaking(true);
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p);
        if (voiceRef.current) u.voice = voiceRef.current;
        u.lang = voiceRef.current?.lang || 'en-US';
        u.rate = 1.0;
        u.pitch = 1.0;
        if (i === parts.length - 1) {
          u.onend = () => token === tokenRef.current && setSpeaking(false);
        }
        u.onerror = () => token === tokenRef.current && setSpeaking(false);
        synth.speak(u);
      });
    },
    [supported, synth, stop]
  );

  return { supported, speaking, speak, stop };
}

// ─── Speech-to-text ──────────────────────────────────────────────────────────

const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// onFinal(text) is called with each finalised phrase; `interim` holds the
// in-progress phrase for display.
export function useDictation({ onFinal, lang = 'en-US' }) {
  const supported = !!Recognition;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const wantRef = useRef(false); // user wants the mic on (auto-restart after silence)
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stop = useCallback(() => {
    wantRef.current = false;
    setListening(false);
    setInterim('');
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const start = useCallback(() => {
    if (!supported || wantRef.current) return;
    setError('');
    wantRef.current = true;

    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onFinalRef.current?.(r[0].transcript.trim());
        else live += r[0].transcript;
      }
      setInterim(live);
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Microphone permission was denied.'
          : `Voice input error: ${e.error}`
      );
      wantRef.current = false;
    };
    rec.onend = () => {
      setInterim('');
      // Browsers end the session after a pause — restart while the user wants it.
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
      wantRef.current = false;
      setListening(false);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      wantRef.current = false;
      setError('Could not start voice input.');
    }
  }, [supported, lang]);

  useEffect(() => () => {
    wantRef.current = false;
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
  }, []);

  return { supported, listening, interim, error, start, stop };
}
