/**
 * ============================================================
 * 数值与时间格式化
 * 所有 null / NaN 统一显示为 "--"，避免界面出现误导性的 0.00
 * ============================================================
 */

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

const formatterCache = new Map();

function fixedFormatter(digits) {
  if (!formatterCache.has(digits)) {
    formatterCache.set(
      digits,
      new Intl.NumberFormat('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    );
  }
  return formatterCache.get(digits);
}

export function fmtNumber(value, digits = 2) {
  return isNum(value) ? fixedFormatter(digits).format(value) : '--';
}

export function fmtInt(value) {
  return isNum(value) ? Math.round(value).toLocaleString('zh-CN') : '--';
}

export function fmtSigned(value, digits = 2) {
  if (!isNum(value)) return '--';
  return `${value >= 0 ? '+' : '-'}${fmtNumber(Math.abs(value), digits)}`;
}

export function fmtPercent(value) {
  return isNum(value) ? `${fmtSigned(value)}%` : '--';
}

// 国内习惯：红涨绿跌
export function toneOf(value) {
  if (!isNum(value)) return 'flat';
  return value >= 0 ? 'up' : 'down';
}

export function fmtClock(input) {
  const date = input instanceof Date ? input : new Date(input ?? Date.now());
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
}

export function fmtDateTime(input) {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
}
