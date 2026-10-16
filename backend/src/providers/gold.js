/**
 * 国际现货：gold-api.com（免费，无需 Key）
 * 仅提供现价，不提供涨跌幅与昨收
 */

import { SOURCE_URLS, SANE } from '../config.js';
import { fetchJson } from '../lib/http.js';
import { track, declareSource } from '../lib/sources.js';
import { inRange, isNum, round } from '../lib/util.js';

const NAME = 'gold-api.com';
declareSource(NAME, '国际现货 XAU / XAG（主）');

function quote(symbol) {
  return track(NAME, 'spot', () => fetchJson(`${SOURCE_URLS.goldSpot}/${symbol}`));
}

export async function fetchGoldSpot() {
  const [xau, xag] = await Promise.allSettled([quote('XAU'), quote('XAG')]);
  if (xau.status === 'rejected') throw xau.reason;

  const price = Number(xau.value?.price);
  if (!inRange(price, SANE.intlUsdPerOz)) throw new Error(`国际金价数据异常: ${xau.value?.price}`);

  // 白银为辅助信息，失败不影响主数据
  const silver = xag.status === 'fulfilled' ? Number(xag.value?.price) : NaN;
  return {
    price: round(price, 2),
    silverPrice: isNum(silver) && silver > 0 ? round(silver, 2) : null,
    asOf: xau.value?.updatedAt ?? null,
  };
}
