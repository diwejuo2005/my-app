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

// ─── Cross-platform storage ───────────────────────────────────────────────────
export const storage = {
  async get(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const v = window.localStorage.getItem(key);
        return v ? JSON.parse(v) : null;
      }
      return null;
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {}
  },
};
