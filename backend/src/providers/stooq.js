/**
 * Stooq 历史日K（CSV，免费，无需 Key）
 * 覆盖：XAU/USD（xauusd）、USD/CNY（usdcny）
 */

import { SOURCE_URLS } from '../config.js';
import { fetchText } from '../lib/http.js';
import { track, declareSource } from '../lib/sources.js';
import { isNum } from '../lib/util.js';

const NAME = 'Stooq';
declareSource(NAME, '历史日K：XAU/USD（主）、USD/CNY（主）');

// 解析 CSV：表头 Date,Open,High,Low,Close,Volume；跳过格式不正确的行；按日期升序返回
export function parseStooqCsv(text) {
  const lines = String(text).trim().split(/\r?\n/);
  if (lines.length < 2 || !/^Date/i.test(lines[0])) throw new Error('Stooq 返回格式异常');

  const rows = [];
  for (const line of lines.slice(1)) {
    const [date, open, high, low, close, volume] = line.split(',');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) continue;
    const prices = [open, high, low, close].map(Number);
    if (!prices.every((p) => isNum(p) && p > 0)) continue;
    rows.push({
      date,
      open: prices[0],
      high: prices[1],
      low: prices[2],
      close: prices[3],
      volume: Number(volume) || 0,
    });
  }
  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function fetchStooqDaily(symbol) {
  return track(NAME, 'history', async () => {
    const text = await fetchText(`${SOURCE_URLS.stooq}?s=${encodeURIComponent(symbol)}&i=d`);
    const rows = parseStooqCsv(text);
    if (!rows.length) throw new Error('Stooq 无数据');
    return rows;
  });
}
