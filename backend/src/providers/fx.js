/**
 * 汇率：USD/CNY
 * - 最新汇率：open.er-api.com（免费，每日更新）
 * - 历史汇率：Stooq（主）→ Frankfurter/ECB（备）
 */

import { SOURCE_URLS, SANE } from '../config.js';
import { fetchJson } from '../lib/http.js';
import { track, declareSource } from '../lib/sources.js';
import { inRange, isNum, round, shanghaiDate } from '../lib/util.js';
import { fetchStooqDaily } from './stooq.js';

const LATEST = 'open.er-api.com';
const ECB = 'Frankfurter (ECB)';
declareSource(LATEST, '最新汇率 USD/CNY');
declareSource(ECB, '历史汇率 USD/CNY（备）');

export function fetchUsdCnyLatest() {
  return track(LATEST, 'fx', async () => {
    const data = await fetchJson(SOURCE_URLS.fxLatest);
    const rate = Number(data?.rates?.CNY);
    if (!inRange(rate, SANE.usdCny)) throw new Error('汇率数据异常');
    return { rate: round(rate, 4), asOf: data.time_last_update_utc ?? null };
  });
}

export async function fetchUsdCnyHistory(days) {
  try {
    const rows = await fetchStooqDaily('usdcny');
    return rows.slice(-days).map((r) => ({ date: r.date, close: r.close }));
  } catch (stooqError) {
    return track(ECB, 'fx-history', async () => {
      const end = shanghaiDate(Date.now());
      const start = shanghaiDate(Date.now() - 420 * 86400000);
      const json = await fetchJson(`${SOURCE_URLS.frankfurter}/${start}..${end}?from=USD&to=CNY`);
      const rates = json?.rates ?? {};
      const rows = Object.keys(rates)
        .sort()
        .map((date) => ({ date, close: Number(rates[date]?.CNY) }))
        .filter((r) => isNum(r.close) && r.close > 0);
      if (!rows.length) throw new Error(`Frankfurter 无数据（Stooq: ${stooqError.message}）`);
      return rows.slice(-days);
    });
  }
}
