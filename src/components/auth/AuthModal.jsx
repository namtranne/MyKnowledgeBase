import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import styles from './AuthModal.module.css';

export default function AuthModal() {
  const { modalOpen, closeAuth, login, signup } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!modalOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, displayName || undefined);
      }
      // reset + close
      setEmail('');
      setPassword('');
      setDisplayName('');
      closeAuth();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={closeAuth}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true">
        <button className={styles.close} onClick={closeAuth} aria-label="Close">
          ✕
        </button>
        <h2 className={styles.title}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h2>
        <p className={styles.sub}>
          {mode === 'login'
            ? 'Sign in to sync your checklist and answers across devices.'
            : 'Create an account to save your progress and answers to the cloud.'}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'signup' && (
            <label className={styles.label}>
              Name (optional)
              <input
                className={styles.input}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </label>
          )}
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className={styles.switch}>
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                className={styles.linkBtn}
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                className={styles.linkBtn}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
