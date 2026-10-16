/**
 * 新浪财经：国内黄金现货与国际现货备份源（免费，无需 Key）
 * - AU9999 / AU(T+D) 实时行情（国内备用，防东方财富接口故障）
 * - XAU/USD 国际现货（国际备用源）
 * - XAG/USD 国际现货白银（白银与金银比备用源）
 * - USD/CNY 人民币汇率（汇率备用源）
 */

import { SOURCE_URLS, SANE } from '../config.js';
import { fetchText, fetchJson } from '../lib/http.js';
import { track, declareSource } from '../lib/sources.js';
import { inRange, isNum, round } from '../lib/util.js';

const NAME = '新浪财经';
const SINA_REFERER = { Referer: 'https://finance.sina.com.cn' };
declareSource(NAME, 'AU9999 实时行情（备）、国际现货 XAU/XAG（备）、USD/CNY（备）');

export function parseSinaQuote(line) {
  const match = String(line).match(/="([^"]+)"/);
  if (!match) return null;
  return match[1].split(',');
}

export async function fetchSinaDomesticQuote() {
  return track(NAME, 'domestic-quote-backup', async () => {
    const text = await fetchText(`${SOURCE_URLS.sinaHq}gds_AU9999,gds_AUTD`, { headers: SINA_REFERER });
    const lines = text.split('\n');
    let parts = parseSinaQuote(lines[0] || '');
    let code = 'AU9999';
    let name = '黄金9999（新浪）';

    // 如果 AU9999 没有数据，回退到 AUTD
    if (!parts || !parts[0] || Number(parts[0]) <= 0) {
      parts = parseSinaQuote(lines[1] || '');
      code = 'AUTD';
      name = '黄金T+D（新浪）';
    }

    if (!parts || parts.length < 9) throw new Error('新浪黄金行情数据异常');

    const price = Number(parts[0]);
    if (!inRange(price, SANE.domesticCnyPerGram)) throw new Error(`新浪 AU9999 价格异常: ${price}`);

    const previousClose = Number(parts[7]);
    const open = Number(parts[8]);
    const high = Number(parts[4]);
    const low = Number(parts[5]);
    const volume = Number(parts[9]) || null;
    const change = isNum(previousClose) && previousClose > 0 ? round(price - previousClose, 2) : null;
    const changePercent = isNum(previousClose) && previousClose > 0 ? round(((price - previousClose) / previousClose) * 100, 2) : null;

    return {
      source: NAME,
      estimated: false,
      code,
      name,
      currency: 'CNY',
      unit: '克',
      price: round(price, 2),
      open: isNum(open) ? round(open, 2) : null,
      high: isNum(high) ? round(high, 2) : null,
      low: isNum(low) ? round(low, 2) : null,
      previousClose: isNum(previousClose) ? round(previousClose, 2) : null,
      change,
      changePercent,
      volume,
      amount: null,
      asOf: new Date().toISOString(),
    };
  });
}

export async function fetchSinaSpot() {
  return track(NAME, 'spot-backup', async () => {
    const text = await fetchText(`${SOURCE_URLS.sinaHq}hf_XAU`, { headers: SINA_REFERER });
    const parts = parseSinaQuote(text);
    if (!parts || parts.length < 8) throw new Error('新浪国际现货数据异常');

    const price = Number(parts[0]);
    if (!inRange(price, SANE.intlUsdPerOz)) throw new Error('新浪现货报价异常');

    const previousClose = Number(parts[7]);
    return {
      price: round(price, 2),
      previousClose: isNum(previousClose) && previousClose > 0 ? round(previousClose, 2) : null,
      asOf: new Date().toISOString(),
    };
  });
}

export async function fetchSinaSilverSpot() {
  return track(NAME, 'silver-backup', async () => {
    const text = await fetchText(`${SOURCE_URLS.sinaHq}hf_XAG`, { headers: SINA_REFERER });
    const parts = parseSinaQuote(text);
    if (!parts || parts.length < 2) throw new Error('新浪白银数据异常');
    const price = Number(parts[0]);
    if (!isNum(price) || price <= 0) throw new Error('新浪白银报价异常');
    return round(price, 2);
  });
}

export async function fetchSinaFx() {
  return track(NAME, 'fx-backup', async () => {
    const text = await fetchText(`${SOURCE_URLS.sinaHq}fx_susdcny`, { headers: SINA_REFERER });
    const parts = parseSinaQuote(text);
    if (!parts || parts.length < 3) throw new Error('新浪汇率数据异常');
    const rate = Number(parts[2]) || Number(parts[1]);
    if (!inRange(rate, SANE.usdCny)) throw new Error('新浪汇率数据异常');
    return { rate: round(rate, 4), asOf: new Date().toISOString() };
  });
}

export async function fetchSinaXauDaily(days = 250) {
  return track(NAME, 'sina-xau-daily', async () => {
    const json = await fetchJson('https://stock2.finance.sina.com.cn/futures/api/json.php/GlobalFuturesService.getGlobalFuturesDailyKLine?symbol=XAU', {
      headers: SINA_REFERER,
    });
    if (!Array.isArray(json) || json.length === 0) throw new Error('新浪国际黄金K线为空');
    return json.slice(-days).map((d) => ({
      date: d.date,
      open: Number(d.open),
      high: Number(d.high),
      low: Number(d.low),
      close: Number(d.close),
      volume: Number(d.volume) || 0,
    }));
  });
}

