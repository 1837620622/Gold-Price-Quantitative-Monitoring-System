/**
 * Yahoo Finance（非官方公开图表接口，免费，无需 Key）
 * 用途：国际现货的交叉校验与昨收来源；失败时作为国际日K的备用源
 */

import { SOURCE_URLS, SANE } from '../config.js';
import { fetchJson } from '../lib/http.js';
import { track, declareSource } from '../lib/sources.js';
import { inRange, isNum, round } from '../lib/util.js';

const NAME = 'Yahoo Finance';
const SYMBOL = 'XAUUSD=X';
declareSource(NAME, '国际现货校验 / 昨收（副）、国际日K（备）');

function chartResult(json) {
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(json?.chart?.error?.description || 'Yahoo 返回为空');
  return result;
}

// 现价取 meta.regularMarketPrice；昨收取"倒数第二个有效日收盘"。
// 注意：meta.chartPreviousClose 是请求区间起点之前的收盘，不能当作昨收使用。
export async function fetchYahooSpot() {
  return track(NAME, 'spot', async () => {
    const json = await fetchJson(`${SOURCE_URLS.yahooChart}${encodeURIComponent(SYMBOL)}?interval=1d&range=5d`);
    const result = chartResult(json);
    const price = Number(result.meta?.regularMarketPrice);
    if (!inRange(price, SANE.intlUsdPerOz)) throw new Error('Yahoo 报价异常');

    const closes = (result.indicators?.quote?.[0]?.close || []).filter(isNum);
    const previousClose = closes.length >= 2 ? closes[closes.length - 2] : null;
    const marketTime = result.meta?.regularMarketTime;

    return {
      price: round(price, 2),
      previousClose: previousClose ? round(previousClose, 2) : null,
      asOf: marketTime ? new Date(marketTime * 1000).toISOString() : null,
    };
  });
}

export async function fetchYahooDaily(days) {
  const range = days > 200 ? '2y' : '1y';
  return track(NAME, 'history', async () => {
    const json = await fetchJson(`${SOURCE_URLS.yahooChart}${encodeURIComponent(SYMBOL)}?interval=1d&range=${range}`);
    const result = chartResult(json);
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    const rows = [];
    timestamps.forEach((t, i) => {
      const values = [quote.open?.[i], quote.high?.[i], quote.low?.[i], quote.close?.[i]];
      // Yahoo 在非交易时段会返回 null，整根丢弃
      if (!values.every(isNum)) return;
      const [open, high, low, close] = values;
      rows.push({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        open,
        high,
        low,
        close,
        volume: isNum(quote.volume?.[i]) ? quote.volume[i] : 0,
      });
    });
    if (!rows.length) throw new Error('Yahoo 历史数据为空');
    return rows;
  });
}
