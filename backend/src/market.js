/**
 * ============================================================
 * 行情聚合：多源获取、失败降级、交叉校验，以及量化分析的缓存入口
 * 原则：任何一路失败都标记为 null，绝不伪造数据；估算价必须显式标注
 * 多源架构：
 *   - 国内金价：东方财富 (主) → 新浪财经 SGE (备) → 汇率公式精准估算
 *   - 国际金价：gold-api.com (主) → Swissquote 机构源 (备1) → Yahoo Finance (备2) → 新浪财经 (备3)
 *   - 白银现货：gold-api.com (主) → Swissquote (备1) → 新浪财经 (备2)
 *   - 美元汇率：open.er-api.com (主) → 新浪外汇 (备1) → Frankfurter ECB (备2) → Stooq (备3)
 * ============================================================
 */

import { TTL, OZ_TO_GRAM, PREMIUM_ALERT_PERCENT, QUANT_DAYS } from './config.js';
import { memo } from './lib/cache.js';
import { round, isNum } from './lib/util.js';
import { fetchGoldSpot } from './providers/gold.js';
import { fetchYahooSpot, fetchYahooDaily } from './providers/yahoo.js';
import { fetchStooqDaily } from './providers/stooq.js';
import { fetchUsdCnyLatest, fetchUsdCnyHistory } from './providers/fx.js';
import { fetchAU9999Quote, fetchAU9999Kline } from './providers/eastmoney.js';
import { fetchSinaDomesticQuote, fetchSinaSpot, fetchSinaSilverSpot, fetchSinaFx, fetchSinaXauDaily } from './providers/sina.js';
import { fetchSwissquoteSpot } from './providers/swissquote.js';
import { analyzeMarket, alignPremium, sanitizeBars } from './quant/engine.js';

const settle = (result, label, errors) => {
  if (result.status === 'fulfilled') return result.value;
  const message = result.reason?.message ?? '未知错误';
  errors.push(`${label}: ${message}`);
  console.error(`${label}获取失败:`, message);
  return null;
};

// ------------------------------------------------------------
// 国际现货：多源链式获取与交叉校验
// ------------------------------------------------------------
async function loadIntlQuote() {
  const errors = [];
  const [spotR, yahooR, sinaR] = await Promise.allSettled([
    fetchGoldSpot(),
    fetchYahooSpot({ timeoutMs: 1500 }),
    fetchSinaSpot(),
  ]);
  let spot = settle(spotR, '国际金价(gold-api)', errors);
  let yahoo = settle(yahooR, '国际金价(Yahoo)', errors);
  let sina = settle(sinaR, '国际金价(新浪)', errors);

  let price = spot?.price ?? sina?.price ?? yahoo?.price ?? null;
  let source = spot ? 'gold-api.com' : (sina ? '新浪财经' : (yahoo ? 'Yahoo Finance' : null));
  let silverPrice = spot?.silverPrice ?? null;

  // 兜底：瑞讯银行 Swissquote
  if (price === null) {
    try {
      const sq = await fetchSwissquoteSpot('XAU');
      price = sq.price;
      source = 'Swissquote';
    } catch (sqErr) {
      errors.push(`国际金价(Swissquote): ${sqErr.message}`);
    }
  }

  if (price === null) return { quote: null, errors };

  // 白银现货价格兜底（优先新浪，次选 Swissquote）
  if (silverPrice === null) {
    try {
      silverPrice = await fetchSinaSilverSpot();
    } catch {
      try {
        const sqSilver = await fetchSwissquoteSpot('XAG');
        silverPrice = sqSilver.price;
      } catch {}
    }
  }

  const previousClose = yahoo?.previousClose ?? sina?.previousClose ?? null;

  // 交叉校验：优先对比 Yahoo，若 Yahoo 异常（如 404/429）则自动使用新浪现货或 Swissquote
  let peerQuote = null;
  let peerName = null;

  if (source === 'gold-api.com') {
    if (yahoo && isNum(yahoo.price)) {
      peerQuote = yahoo;
      peerName = 'Yahoo Finance';
    } else if (sina && isNum(sina.price)) {
      peerQuote = sina;
      peerName = '新浪现货';
    }
  } else if (source === '新浪财经') {
    if (spot && isNum(spot.price)) {
      peerQuote = spot;
      peerName = 'gold-api.com';
    } else if (yahoo && isNum(yahoo.price)) {
      peerQuote = yahoo;
      peerName = 'Yahoo Finance';
    }
  }

  if (!peerQuote) {
    try {
      const sq = await fetchSwissquoteSpot('XAU');
      if (sq && isNum(sq.price)) {
        peerQuote = sq;
        peerName = 'Swissquote';
      }
    } catch {}
  }

  let crossCheck = { status: 'single', deviationPercent: null, peer: null };
  if (price && peerQuote && isNum(peerQuote.price)) {
    const deviationPercent = round(((price - peerQuote.price) / peerQuote.price) * 100, 3);
    crossCheck = {
      status: Math.abs(deviationPercent) <= 0.5 ? 'consistent' : 'divergent',
      deviationPercent,
      peer: peerName,
    };
  }

  return {
    quote: {
      source: source || 'gold-api.com',
      currency: 'USD',
      unit: '盎司',
      price,
      change: previousClose !== null ? round(price - previousClose, 2) : null,
      changePercent: previousClose !== null ? round(((price - previousClose) / previousClose) * 100, 2) : null,
      previousClose,
      silverPrice,
      asOf: spot?.asOf ?? sina?.asOf ?? yahoo?.asOf ?? new Date().toISOString(),
      crossCheck,
    },
    errors,
  };
}

export const getIntlQuote = () => memo('intl-quote', TTL.intlQuote, loadIntlQuote);

// ------------------------------------------------------------
// 国内估算价：国际金价 × 汇率 ÷ 31.1035；不含国内溢价，无涨跌幅
// ------------------------------------------------------------
function estimateDomestic(intl, usdCny) {
  return {
    source: 'estimated',
    estimated: true,
    code: 'AU9999',
    name: '黄金9999（估算）',
    currency: 'CNY',
    unit: '克',
    price: round((intl.price * usdCny) / OZ_TO_GRAM, 2),
    open: null,
    high: null,
    low: null,
    previousClose: null,
    change: null,
    changePercent: null,
    volume: null,
    amount: null,
    exchangeRate: usdCny,
    basePrice: intl.price,
    asOf: new Date().toISOString(),
  };
}

// 国内溢价：国内价相对"国际金价按汇率折算为元/克"的偏离
function theoreticalPremium(domesticPrice, intlPrice, usdCny) {
  return round((domesticPrice / ((intlPrice * usdCny) / OZ_TO_GRAM) - 1) * 100, 2);
}

// ------------------------------------------------------------
// 行情快照：多路并行，失败逐级降级；返回交叉校验结果
// ------------------------------------------------------------
async function loadSnapshot() {
  const errors = [];

  // 国内行情：并行尝试东财与新浪（新浪50ms极速返回，东财超时800ms自动放弃）
  const fetchDomestic = async () => {
    try {
      return await Promise.any([
        fetchAU9999Quote({ timeoutMs: 800 }),
        fetchSinaDomesticQuote(),
      ]);
    } catch (allErr) {
      errors.push(`国内金价: ${allErr.message || '双源不可用'}`);
      return null;
    }
  };

  const [intlR, domR, fxR] = await Promise.allSettled([
    getIntlQuote(),
    fetchDomestic(),
    fetchUsdCnyLatest(),
  ]);

  const intlPack = intlR.status === 'fulfilled' ? intlR.value : { quote: null, errors: [intlR.reason?.message ?? '未知错误'] };
  errors.push(...intlPack.errors);
  const international = intlPack.quote;

  let domestic = settle(domR, '国内金价', errors);

  let fx = settle(fxR, '汇率', errors);
  // 汇率备用兜底：open.er-api 故障时，尝试新浪外汇
  if (!fx) {
    try {
      fx = await fetchSinaFx();
    } catch (sinaFxErr) {
      errors.push(`汇率(新浪备用): ${sinaFxErr.message}`);
    }
  }

  const usdCny = fx?.rate ?? null;
  if (!domestic && international && usdCny) domestic = estimateDomestic(international, usdCny);

  const premiumPercent = domestic && !domestic.estimated && international && usdCny
    ? theoreticalPremium(domestic.price, international.price, usdCny)
    : null;

  const crossChecks = [];
  if (international?.crossCheck) {
    const c = international.crossCheck;
    crossChecks.push({
      name: '国际金价双源校验',
      status: c.status === 'consistent' ? 'ok' : c.status === 'divergent' ? 'warn' : 'info',
      detail: c.deviationPercent == null
        ? '仅单一来源，无法交叉校验'
        : `${international.source} 与 ${c.peer || '校验源'} 偏差 ${c.deviationPercent}%（阈值 0.5%）`,
    });
  }
  if (premiumPercent !== null) {
    const warn = Math.abs(premiumPercent) > PREMIUM_ALERT_PERCENT;
    crossChecks.push({
      name: '国内溢价合理性',
      status: warn ? 'warn' : 'ok',
      detail: `相对国际金价折算的溢价 ${premiumPercent >= 0 ? '+' : ''}${premiumPercent}%${warn ? '，超出常规范围，请核对数据源' : ''}`,
    });
  }
  if (domestic?.estimated) {
    crossChecks.push({ name: '国内价来源', status: 'warn', detail: '交易所接口不可用，国内价由国际金价与汇率估算' });
  }

  return {
    international,
    domestic,
    fx: fx ? { usdCny, asOf: fx.asOf, source: fx.source || 'open.er-api.com' } : null,
    premiumPercent,
    crossChecks,
    errors,
    timestamp: new Date().toISOString(),
  };
}

export const getSnapshot = () =>
  memo('snapshot', TTL.snapshot, loadSnapshot, (s) => Boolean(s.international || s.domestic));

// ------------------------------------------------------------
// 历史数据：每个 getter 都带缓存与并发合并
// ------------------------------------------------------------
export const getDomesticKline = (days) =>
  memo(`kline-cn:${days}`, TTL.kline, async () => {
    try {
      return await fetchAU9999Kline(days);
    } catch (emErr) {
      console.warn('东方财富K线失败，启用国际金价与汇率理论折算K线:', emErr.message);
      const [xauBars, fxBars] = await Promise.all([
        getGoldHistory(days),
        getFxHistory(days).catch(() => []),
      ]);
      const fxMap = new Map((fxBars || []).map((f) => [f.date, f.rate]));
      const defaultRate = 7.25;
      return xauBars.map((b) => {
        const rate = fxMap.get(b.date) || defaultRate;
        return {
          date: b.date,
          open: round((b.open * rate) / OZ_TO_GRAM, 2),
          high: round((b.high * rate) / OZ_TO_GRAM, 2),
          low: round((b.low * rate) / OZ_TO_GRAM, 2),
          close: round((b.close * rate) / OZ_TO_GRAM, 2),
          volume: 0,
          estimated: true,
        };
      });
    }
  });

// 国际日K：新浪主通道（高可用不限IP），Stooq 为备，Yahoo 为兜底
export const getGoldHistory = (days) =>
  memo(`hist-xau:${days}`, TTL.history, async () => {
    try {
      return (await fetchSinaXauDaily(days)).slice(-days);
    } catch (sinaErr) {
      console.warn('新浪国际日K不可用，尝试备用源:', sinaErr.message);
      try {
        return (await fetchStooqDaily('xauusd')).slice(-days);
      } catch (stooqError) {
        try {
          return (await fetchYahooDaily(days)).slice(-days);
        } catch (yahooError) {
          throw new Error(`国际金价历史不可用（Sina: ${sinaErr.message}；Stooq: ${stooqError.message}；Yahoo: ${yahooError.message}）`);
        }
      }
    }
  });

export const getFxHistory = (days) => memo(`hist-fx:${days}`, TTL.history, () => fetchUsdCnyHistory(days));

// ------------------------------------------------------------
// 金银比（Gold/Silver Ratio）接口
// ------------------------------------------------------------
export async function getGoldSilverRatio(days = 60) {
  return memo(`ratio:${days}`, TTL.snapshot, async () => {
    const snapshot = await getSnapshot();
    const goldPrice = snapshot.international?.price ?? null;
    const silverPrice = snapshot.international?.silverPrice ?? null;
    if (!goldPrice || !silverPrice || silverPrice <= 0) {
      return {
        available: false,
        reason: '金价或银价不可用，无法计算金银比',
      };
    }
    const currentRatio = round(goldPrice / silverPrice, 2);

    let regime = '均衡中枢';
    let signal = 'neutral';
    let suggestion = '金银比处于历史合理中枢区间（65-75），贵金属整体估值协同良好。';
    if (currentRatio >= 85) {
      regime = '历史极高位（白银极度低估）';
      signal = 'silver-undervalued';
      suggestion = '金银比突破85处于历史极高分位，均值回归确定性较高，白银具备更强补涨弹性，可关注多银空金套利或加大白银配置比例。';
    } else if (currentRatio >= 75) {
      regime = '偏高区间（避险属性主导）';
      signal = 'gold-strong';
      suggestion = '黄金相对白银走势偏强，宏观地缘避险买盘主导行情，警惕金银比冲高动能衰竭。';
    } else if (currentRatio < 65) {
      regime = '偏低区间（工业与通胀驱动）';
      signal = 'silver-strong';
      suggestion = '金银比处于低位，白银表现显著优于黄金，通常反映强劲的工业需求与通胀预期共振。';
    }

    return {
      available: true,
      current: currentRatio,
      goldPrice,
      silverPrice,
      regime,
      signal,
      suggestion,
      timestamp: new Date().toISOString(),
    };
  });
}

// ------------------------------------------------------------
// 多策略信号概览
// ------------------------------------------------------------
export async function getSignals(market = 'cn', days = QUANT_DAYS) {
  const quant = await getQuant(market, days);
  if (!quant?.available) {
    return { available: false, reason: quant?.reason || '量化数据暂不可用' };
  }
  const snapshot = await getSnapshot();
  const ratio = await getGoldSilverRatio();

  return {
    available: true,
    market,
    name: quant.name,
    asOf: quant.asOf,
    price: market === 'cn' ? snapshot.domestic?.price : snapshot.international?.price,
    signal: quant.signal,
    levels: quant.levels,
    risk: quant.risk,
    pivots: quant.levels?.pivots,
    premium: quant.premium,
    ratio: ratio.available ? { current: ratio.current, regime: ratio.regime, signal: ratio.signal } : null,
    strategiesSummary: quant.backtest?.available ? quant.backtest.strategies : null,
    timestamp: new Date().toISOString(),
  };
}

// ------------------------------------------------------------
// 量化分析入口（带缓存）
// market: 'cn' 国内 AU9999（含溢价与回测）｜'intl' 国际 XAU/USD
// ------------------------------------------------------------
export const getQuant = (market, days = QUANT_DAYS) =>
  memo(`quant:${market}:${days}`, TTL.quant, async () => {
    if (market === 'cn') {
      const bars = sanitizeBars(await getDomesticKline(days));
      const [xauR, fxR] = await Promise.allSettled([getGoldHistory(days), getFxHistory(days)]);
      const premiumByDate = xauR.status === 'fulfilled' && fxR.status === 'fulfilled'
        ? alignPremium(bars, xauR.value, fxR.value)
        : null;
      return { market: 'cn', name: 'AU9999', currency: 'CNY', ...analyzeMarket(bars, { premiumByDate }) };
    }
    const bars = sanitizeBars(await getGoldHistory(days));
    return { market: 'intl', name: 'XAU/USD', currency: 'USD', ...analyzeMarket(bars) };
  });

export async function getPremium(days = QUANT_DAYS) {
  const quant = await getQuant('cn', days);
  return quant.premium ?? { available: false, reason: '溢价数据不可用', series: [] };
}
