/**
 * 东方财富：国内 AU9999 实时行情与日K（免费，无需 Key）
 * 注意：价格字段为"放大100倍"的整数，需除以 100
 */

import { SOURCE_URLS, SANE } from '../config.js';
import { fetchJson } from '../lib/http.js';
import { track, declareSource } from '../lib/sources.js';
import { inRange, round } from '../lib/util.js';

const NAME = '东方财富';
const REFERER = { Referer: 'https://quote.eastmoney.com/' };
declareSource(NAME, 'AU9999 实时行情与日K（国内，主）');

const scaled = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? round(n / 100, 2) : null;
};

export function fetchAU9999Quote() {
  return track(NAME, 'quote', async () => {
    const fields = 'f43,f44,f45,f46,f47,f48,f51,f52,f57,f58,f60,f169,f170';
    const result = await fetchJson(`${SOURCE_URLS.eastmoneyQuote}?secid=118.AU9999&fields=${fields}`, { headers: REFERER });
    const d = result?.data;
    if (result?.rc !== 0 || !d) throw new Error('东方财富返回数据异常');

    const price = scaled(d.f43);
    if (!inRange(price, SANE.domesticCnyPerGram)) throw new Error(`AU9999 最新价异常: ${d.f43}`);

    return {
      source: NAME,
      estimated: false,
      code: d.f57,
      name: d.f58,
      currency: 'CNY',
      unit: '克',
      price,
      open: scaled(d.f46),
      high: scaled(d.f44),
      low: scaled(d.f45),
      previousClose: scaled(d.f60),
      change: scaled(d.f169),
      changePercent: scaled(d.f170), // 涨跌幅（%）
      volume: Number(d.f47) || null, // 成交量（手）
      amount: Number(d.f48) || null, // 成交额（元）
      limitUp: scaled(d.f51),
      limitDown: scaled(d.f52),
      asOf: new Date().toISOString(),
    };
  });
}

// 返回字段顺序：日期,开盘,收盘,最高,最低,成交量
export function parseEastmoneyKline(lines) {
  return lines.map((line) => {
    const [date, open, close, high, low, volume] = String(line).split(',');
    return { date, open: Number(open), close: Number(close), high: Number(high), low: Number(low), volume: Number(volume) || 0 };
  });
}

export function fetchAU9999Kline(days) {
  return track(NAME, 'kline', async () => {
    const url = `${SOURCE_URLS.eastmoneyKline}?secid=118.AU9999&fields1=f1,f2,f3,f4,f5,f6` +
      `&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=0&end=20500101&lmt=${days}`;
    const result = await fetchJson(url, { headers: REFERER });
    const lines = result?.data?.klines;
    if (!Array.isArray(lines) || lines.length === 0) throw new Error('K线数据为空');
    return parseEastmoneyKline(lines);
  });
}
