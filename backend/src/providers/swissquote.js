/**
 * 瑞讯银行（Swissquote）公开外汇及贵金属报价接口（免费，无需 Key）
 * 用途：国际现货 XAU/USD、XAG/USD 机构级备用源与高精度校验
 */

import { SOURCE_URLS, SANE } from '../config.js';
import { fetchJson } from '../lib/http.js';
import { track, declareSource } from '../lib/sources.js';
import { inRange, isNum, round } from '../lib/util.js';

const NAME = 'Swissquote';
declareSource(NAME, '国际现货 XAU / XAG 机构级实时报价（备）');

function parseSwissquotePrice(items) {
  if (!Array.isArray(items) || !items.length) return null;
  for (const item of items) {
    const list = item.spreadProfilePrices;
    if (Array.isArray(list) && list.length) {
      const top = list[0];
      const bid = Number(top.bid);
      const ask = Number(top.ask);
      if (isNum(bid) && isNum(ask) && bid > 0 && ask > 0) {
        return {
          mid: (bid + ask) / 2,
          bid,
          ask,
          ts: item.ts ? new Date(item.ts).toISOString() : null,
        };
      }
    }
  }
  return null;
}

export async function fetchSwissquoteSpot(instrument = 'XAU') {
  return track(NAME, `spot-${instrument.toLowerCase()}`, async () => {
    const url = `${SOURCE_URLS.swissquote}/${instrument}/USD`;
    const data = await fetchJson(url);
    const parsed = parseSwissquotePrice(data);
    if (!parsed) throw new Error(`Swissquote ${instrument}/USD 返回数据异常`);

    if (instrument === 'XAU' && !inRange(parsed.mid, SANE.intlUsdPerOz)) {
      throw new Error(`Swissquote XAU 价格异常: ${parsed.mid}`);
    }

    return {
      price: round(parsed.mid, 2),
      bid: round(parsed.bid, 2),
      ask: round(parsed.ask, 2),
      asOf: parsed.ts || new Date().toISOString(),
    };
  });
}
