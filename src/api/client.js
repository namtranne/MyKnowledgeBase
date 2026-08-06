// Small API client for the NestJS backend.
// Configure the base URL with VITE_API_URL (defaults to local dev server).

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(
  /\/$/,
  '',
);

const TOKEN_KEY = 'kb-auth-token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : message,
      res.status,
    );
  }
  return data;
}

export const api = {
  // --- auth ---
  signup: (email, password, displayName) =>
    request('/auth/signup', {
      method: 'POST',
      auth: false,
      body: { email, password, displayName },
    }),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    }),
  me: () => request('/auth/me'),

  // --- checklist ---
  getChecklist: () => request('/checklist'),
  upsertItem: (itemId, payload) =>
    request(`/checklist/item/${encodeURIComponent(itemId)}`, {
      method: 'PUT',
      body: payload,
    }),
  resetCategory: (categoryId) =>
    request(`/checklist/category/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
    }),
};

export { ApiError };
