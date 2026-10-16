/**
 * ============================================================
 * 行情聚合：多源获取、失败降级、交叉校验，以及量化分析的缓存入口
 * 原则：任何一路失败都标记为 null，绝不伪造数据；估算价必须显式标注
 * ============================================================
 */

import { TTL, OZ_TO_GRAM, PREMIUM_ALERT_PERCENT, QUANT_DAYS } from './config.js';
import { memo } from './lib/cache.js';
import { round } from './lib/util.js';
import { fetchGoldSpot } from './providers/gold.js';
import { fetchYahooSpot, fetchYahooDaily } from './providers/yahoo.js';
import { fetchStooqDaily } from './providers/stooq.js';
import { fetchUsdCnyLatest, fetchUsdCnyHistory } from './providers/fx.js';
import { fetchAU9999Quote, fetchAU9999Kline } from './providers/eastmoney.js';
import { analyzeMarket, alignPremium, sanitizeBars } from './quant/engine.js';

const settle = (result, label, errors) => {
  if (result.status === 'fulfilled') return result.value;
  const message = result.reason?.message ?? '未知错误';
  errors.push(`${label}: ${message}`);
  console.error(`${label}获取失败:`, message);
  return null;
};

// ------------------------------------------------------------
// 国际现货：gold-api.com 为主；Yahoo 提供昨收，并与主源做双源校验
// ------------------------------------------------------------
async function loadIntlQuote() {
  const [spotR, yahooR] = await Promise.allSettled([fetchGoldSpot(), fetchYahooSpot()]);
  const errors = [];
  const spot = settle(spotR, '国际金价(gold-api)', errors);
  const yahoo = settle(yahooR, '国际金价(Yahoo)', errors);

  const price = spot?.price ?? yahoo?.price ?? null;
  if (price === null) return { quote: null, errors };

  const previousClose = yahoo?.previousClose ?? null;
  let crossCheck = { status: 'single', deviationPercent: null, peer: null };
  if (spot && yahoo) {
    const deviationPercent = round(((spot.price - yahoo.price) / yahoo.price) * 100, 3);
    crossCheck = {
      status: Math.abs(deviationPercent) <= 0.5 ? 'consistent' : 'divergent',
      deviationPercent,
      peer: 'Yahoo Finance',
    };
  }

  return {
    quote: {
      source: spot ? 'gold-api.com' : 'Yahoo Finance',
      currency: 'USD',
      unit: '盎司',
      price,
      change: previousClose !== null ? round(price - previousClose, 2) : null,
      changePercent: previousClose !== null ? round(((price - previousClose) / previousClose) * 100, 2) : null,
      previousClose,
      silverPrice: spot?.silverPrice ?? null,
      asOf: spot?.asOf ?? yahoo?.asOf ?? new Date().toISOString(),
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
// 行情快照：三路并行，失败降级；返回交叉校验结果
// ------------------------------------------------------------
async function loadSnapshot() {
  const [intlR, domR, fxR] = await Promise.allSettled([getIntlQuote(), fetchAU9999Quote(), fetchUsdCnyLatest()]);
  const errors = [];

  const intlPack = intlR.status === 'fulfilled' ? intlR.value : { quote: null, errors: [intlR.reason?.message ?? '未知错误'] };
  errors.push(...intlPack.errors);
  const international = intlPack.quote;

  let domestic = settle(domR, '国内金价', errors);
  const fx = settle(fxR, '汇率', errors);
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
        : `gold-api 与 Yahoo 偏差 ${c.deviationPercent}%（阈值 0.5%）`,
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
    crossChecks.push({ name: '国内价来源', status: 'warn', detail: '东方财富不可用，国内价由国际金价与汇率估算' });
  }

  return {
    international,
    domestic,
    fx: fx ? { usdCny, asOf: fx.asOf, source: 'open.er-api.com' } : null,
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
  memo(`kline-cn:${days}`, TTL.kline, () => fetchAU9999Kline(days));

// 国际日K：Stooq 为主，Yahoo 为备
export const getGoldHistory = (days) =>
  memo(`hist-xau:${days}`, TTL.history, async () => {
    try {
      return (await fetchStooqDaily('xauusd')).slice(-days);
    } catch (stooqError) {
      try {
        return (await fetchYahooDaily(days)).slice(-days);
      } catch (yahooError) {
        throw new Error(`国际金价历史不可用（Stooq: ${stooqError.message}；Yahoo: ${yahooError.message}）`);
      }
    }
  });

export const getFxHistory = (days) => memo(`hist-fx:${days}`, TTL.history, () => fetchUsdCnyHistory(days));

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
