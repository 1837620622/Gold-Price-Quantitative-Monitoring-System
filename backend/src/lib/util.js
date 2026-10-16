/**
 * 通用工具：数值判断、格式化、时间、HTML 转义、常量时间比较
 */

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const inRange = (v, [min, max]) => isNum(v) && v >= min && v <= max;

export function round(value, digits = 2) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export const fmt = (v, digits = 2) => (isNum(v) ? v.toFixed(digits) : '--');

export const signed = (v, digits = 2) => (isNum(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(digits)}` : '--');

export const signedPercent = (v) => (isNum(v) ? `${signed(v)}%` : '--');

export const toneOf = (v) => (!isNum(v) ? 'tone-flat' : v >= 0 ? 'tone-up' : 'tone-down');

export const arrowOf = (v) => (!isNum(v) ? '' : v >= 0 ? '▲ ' : '▼ ');

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 恒定时间比较，避免通过响应时间侧信道猜测 Token
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function clampDays(value, fallback = 30, max = 250) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), max);
}

// 上海时区日期（YYYY-MM-DD），用于判断"同一天"
export function shanghaiDate(ts) {
  return new Date(ts + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function nowInShanghai() {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}
