// ─── Design tokens ────────────────────────────────────────────────────────────
export const C = {
  bg:         '#070d1a',
  surface:    '#0e1629',
  surface2:   '#162035',
  surfaceAlt: '#0c1424',   // alternating table row
  border:     '#1e2d4a',
  borderLight:'#253654',   // thin internal row/column dividers
  primary:    '#1e40af',
  accent:     '#f59e0b',
  text:       '#e2e8f0',
  textSec:    '#94a3b8',
  textMuted:  '#475569',
  green:      '#10b981',
  yellow:     '#f59e0b',
  red:        '#ef4444',
};

// ─── Color helper ─────────────────────────────────────────────────────────────
export function pctColor(pct) {
  if (pct >= 100) return '#10b981';
  if (pct >= 60)  return '#22c55e';
  if (pct >= 30)  return '#f59e0b';
  if (pct > 0)    return '#ef4444';
  return C.border;
}

// ─── Per-user storage namespacing ─────────────────────────────────────────────
// Keys in this set are global (read before login) and are never namespaced.
const GLOBAL_KEYS = new Set(['userProfile', 'theme']);

// Module-level prefix — set immediately after login/mount, cleared on sign-out.
let _prefix = '';

/**
 * Set the storage prefix for the currently logged-in user.
 * Call with the user's email after login; call with '' on sign-out.
 */
export function setStorageUser(email) {
  _prefix = email ? `${encodeURIComponent(email)}__` : '';
}

// ─── Cross-platform storage ───────────────────────────────────────────────────
export const storage = {
  async get(key) {
    const k = GLOBAL_KEYS.has(key) ? key : _prefix + key;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const v = window.localStorage.getItem(k);
        return v ? JSON.parse(v) : null;
      }
      return null;
    } catch {
      return null;
    }
  },
  async set(key, value) {
    const k = GLOBAL_KEYS.has(key) ? key : _prefix + key;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(k, JSON.stringify(value));
      }
    } catch {}
  },
};
