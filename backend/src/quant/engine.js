/**
 * ============================================================
 * 量化引擎
 * 流程：数据清洗 → 技术指标 → 逐日评分 → 当日信号 → 关键位与风险 → 回测 → 溢价
 * 约束：每个结论只使用截至当日收盘的数据（信号次日生效，避免前视偏差）
 * 说明：输出为量化参考，不构成投资建议
 * ============================================================
 */

import { QUANT, OZ_TO_GRAM } from '../config.js';
import {
  sma, ema, macd, rsi, bollinger, atr, realizedVol, drawdownSeries,
  kdj, obv, computePivotPoints, advancedMetrics,
  mean, stdev, median, isNum
} from './indicators.js';
import { round } from '../lib/util.js';

const MA_PERIODS = [5, 10, 20, 60];
const COST = QUANT.costPerSwitch;
const valid = isNum;
const clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

// ------------------------------------------------------------
// 数据清洗：去重、剔除非正价格与 OHLC 关系不合理的 K 线，并按日期升序
// ------------------------------------------------------------
export function sanitizeBars(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows ?? []) {
    if (!r || typeof r.date !== 'string' || seen.has(r.date)) continue;
    const { open, high, low, close } = r;
    if (![open, high, low, close].every((v) => isNum(v) && v > 0)) continue;
    if (high < low || high < Math.max(open, close) || low > Math.min(open, close)) continue;
    seen.add(r.date);
    out.push({ date: r.date, open, high, low, close, volume: isNum(r.volume) ? r.volume : 0 });
  }
  return out.sort(byDate);
}

// ------------------------------------------------------------
// 溢价对齐：国内 AU9999 收盘 ÷ (国际 XAU 收盘 × USD/CNY ÷ 31.1035) - 1
// 国际与汇率按"不晚于该日的最近一个交易日"对齐，最多前推 4 个自然日
// 注意：日线收盘时点不同（国内夜盘、伦敦/纽约收盘），溢价为日线级近似
// ------------------------------------------------------------
function asOfClose(rows, date, maxDays) {
  let found = null;
  for (const r of rows) {
    if (r.date <= date) found = r;
    else break;
  }
  if (!found) return null;
  const gapDays = (Date.parse(date) - Date.parse(found.date)) / 86400000;
  return gapDays <= maxDays ? found.close : null;
}

export function alignPremium(domesticBars, intlRows, fxRows) {
  const intl = [...intlRows].sort(byDate);
  const fx = [...fxRows].sort(byDate);
  const map = new Map();
  for (const bar of domesticBars) {
    const xau = asOfClose(intl, bar.date, 4);
    const rate = asOfClose(fx, bar.date, 4);
    if (!valid(xau) || !valid(rate)) continue;
    map.set(bar.date, round((bar.close / ((xau * rate) / OZ_TO_GRAM) - 1) * 100, 3));
  }
  return map;
}

// 滚动 Z 分数（窗口内至少 20 个有效值才计算）
function rollingZ(values, window) {
  return values.map((v, i) => {
    if (!valid(v)) return null;
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter(valid);
    if (slice.length < 20) return null;
    const sd = stdev(slice);
    return sd > 0 ? (v - mean(slice)) / sd : 0;
  });
}

// ------------------------------------------------------------
// 指标计算
// ------------------------------------------------------------
function computeIndicators(bars) {
  const closes = bars.map((b) => b.close);
  const m = macd(closes, QUANT.emaFast, QUANT.emaSlow, QUANT.macdSignal);
  const ma = Object.fromEntries(MA_PERIODS.map((n) => [n, sma(closes, n)]));
  const kdjRes = kdj(bars, QUANT.kdjN || 9, QUANT.kdjM1 || 3, QUANT.kdjM2 || 3);
  return {
    closes,
    ma,
    emaFast: ema(closes, QUANT.emaFast),
    emaSlow: ema(closes, QUANT.emaSlow),
    dif: m.dif,
    dea: m.dea,
    hist: m.hist,
    rsi14: rsi(closes, QUANT.rsiPeriod),
    kdj: kdjRes,
    obv: obv(bars),
    boll: bollinger(closes, QUANT.bollPeriod, QUANT.bollMultiplier),
    atr14: atr(bars, QUANT.atrPeriod),
    vol20: realizedVol(closes, QUANT.volWindow, QUANT.periodsPerYear),
    drawdown: drawdownSeries(closes),
  };
}

// ------------------------------------------------------------
// 逐日评分：各分量映射到 [-1, 1]，按权重加权后放大为 [-100, 100]
// 分量缺失（如无溢价数据）时，权重自动从分母中剔除
// ------------------------------------------------------------
function scoreAt(i, bar, ind, premiumZ) {
  const comps = [];
  const add = (key, label, weight, raw, reason) => {
    if (!valid(raw)) return;
    comps.push({ key, label, weight, score: round(clamp(raw), 3), reason });
  };

  const a = ind.atr14[i];
  if (valid(a) && a > 0) {
    if (valid(ind.emaFast[i]) && valid(ind.emaSlow[i])) {
      const gap = (ind.emaFast[i] - ind.emaSlow[i]) / a;
      add('trend', 'EMA 趋势', 25, gap, gap >= 0 ? 'EMA12 位于 EMA26 上方，趋势向上' : 'EMA12 位于 EMA26 下方，趋势向下');
    }
    if (valid(ind.ma[20][i])) {
      const dev = (bar.close - ind.ma[20][i]) / a;
      add('ma20', '价格 vs MA20', 15, dev * 0.8, dev >= 0 ? '收盘价位于 MA20 上方' : '收盘价位于 MA20 下方');
    }
    if (valid(ind.hist[i])) {
      const h = ind.hist[i] / a;
      add('macd', 'MACD 动能', 15, h * 2, h >= 0 ? 'MACD 柱线为正，动能偏多' : 'MACD 柱线为负，动能偏空');
    }
  }
  if (valid(ind.rsi14[i])) {
    const r = ind.rsi14[i];
    const reason = r >= 70 ? `RSI ${round(r, 1)} 进入超买区，注意回调风险`
      : r <= 30 ? `RSI ${round(r, 1)} 进入超卖区，关注反弹`
        : `RSI ${round(r, 1)} 处于中性区`;
    add('rsi', 'RSI(14)', 15, (r - 50) / 25, reason);
  }
  if (ind.kdj && valid(ind.kdj.k[i]) && valid(ind.kdj.d[i]) && valid(ind.kdj.j[i])) {
    const kVal = ind.kdj.k[i];
    const dVal = ind.kdj.d[i];
    const jVal = ind.kdj.j[i];
    let kScore = 0;
    let kReason = 'KDJ 中性运行';
    if (jVal > 100) {
      kScore = -0.5;
      kReason = `KDJ J值(${round(jVal, 1)}) 超买钝化，警惕冲高回落`;
    } else if (jVal < 0) {
      kScore = 0.5;
      kReason = `KDJ J值(${round(jVal, 1)}) 超卖探底，关注反弹契机`;
    } else {
      kScore = (kVal - dVal) / 25;
      kReason = kVal >= dVal ? 'KDJ 金叉多头运行' : 'KDJ 死叉偏空整理';
    }
    add('kdj', 'KDJ(9,3,3)', 10, kScore, kReason);
  }
  if (valid(ind.boll.pctB[i])) {
    const p = ind.boll.pctB[i];
    const reason = p >= 1 ? '价格突破布林上轨' : p <= 0 ? '价格跌破布林下轨' : `布林 %B=${round(p, 2)}，位于带内`;
    add('boll', '布林 %B', 10, (p - 0.5) * 2, reason);
  }
  if (premiumZ && valid(premiumZ[i])) {
    const z = premiumZ[i];
    add('premium', '溢价 Z 分数', 10, -z / 2, `国内溢价 Z=${round(z, 2)}，${z > 0 ? '偏高，偏空' : '偏低，偏多'}`);
  }

  const weight = comps.reduce((s, c) => s + c.weight, 0);
  const score = weight > 0 ? (comps.reduce((s, c) => s + c.weight * c.score, 0) / weight) * 100 : null;
  return { score: valid(score) ? round(score, 2) : null, components: comps };
}

function labelOf(score) {
  if (score >= 40) return '强势偏多';
  if (score >= 15) return '偏多';
  if (score > -15) return '震荡';
  if (score > -40) return '偏空';
  return '强势偏空';
}

function trendRegime(ind, i) {
  const f = ind.emaFast[i];
  const s = ind.emaSlow[i];
  const m60 = ind.ma[60][i];
  const c = ind.closes[i];
  if (!valid(f) || !valid(s)) return '数据不足';
  if (f > s && (!valid(m60) || c >= m60)) return '上行';
  if (f < s && (!valid(m60) || c <= m60)) return '下行';
  return '震荡';
}

// 当前年化波动相对历史中位数的比值：≥1.3 高波动，≤0.7 低波动
function volRegime(ind, i) {
  const current = ind.vol20[i];
  const history = ind.vol20.filter(valid);
  if (!valid(current) || history.length < 10) return '数据不足';
  const ratio = current / median(history);
  if (ratio >= 1.3) return '高波动';
  if (ratio <= 0.7) return '低波动';
  return '常态';
}

function buildSignal(point, ind, i) {
  if (!valid(point.score)) {
    return { available: false, score: null, label: '数据不足', confidence: 0, components: [], reasons: [] };
  }
  const score = point.score;
  const dir = score >= 0 ? 1 : -1;
  // 只统计明显有方向的分量（|得分| ≥ 0.05），其余视为中性
  const active = point.components.filter((c) => Math.abs(c.score) >= 0.05);
  const activeWeight = active.reduce((s, c) => s + c.weight, 0);
  const agreeWeight = active.filter((c) => Math.sign(c.score) === dir).reduce((s, c) => s + c.weight, 0);
  const reasons = [...point.components]
    .sort((x, y) => Math.abs(y.weight * y.score) - Math.abs(x.weight * x.score))
    .slice(0, 4)
    .map((c) => c.reason);

  return {
    available: true,
    score: round(score, 1),
    label: labelOf(score),
    confidence: activeWeight ? round((agreeWeight / activeWeight) * 100, 0) : 0,
    trend: trendRegime(ind, i),
    volRegime: volRegime(ind, i),
    components: point.components.map((c) => ({ key: c.key, label: c.label, weight: c.weight, score: c.score, reason: c.reason })),
    reasons,
  };
}

function buildLevels(bars, ind, i) {
  const close = bars[i].close;
  const a = ind.atr14[i];
  const span = (n, key) => bars.slice(Math.max(0, i - n + 1), i + 1).map((b) => b[key]);
  const uniq = (arr) => [...new Set(arr.map((v) => round(v, 2)))].sort((x, y) => x - y);
  const hasAtr = valid(a);
  const pivots = computePivotPoints(bars[i].high, bars[i].low, bars[i].close);
  return {
    support: uniq([Math.min(...span(20, 'low')), Math.min(...span(60, 'low'))]),
    resistance: uniq([Math.max(...span(20, 'high')), Math.max(...span(60, 'high'))]),
    atr: hasAtr ? round(a, 2) : null,
    atrPercent: hasAtr ? round((a / close) * 100, 2) : null,
    refLow: hasAtr ? round(close - a, 2) : null,
    refHigh: hasAtr ? round(close + a, 2) : null,
    stopLongRef: hasAtr ? round(close - 2 * a, 2) : null,
    stopShortRef: hasAtr ? round(close + 2 * a, 2) : null,
    pivots,
  };
}

function buildRisk(ind, i) {
  const vol = ind.vol20[i];
  return {
    vol20: valid(vol) ? round(vol, 2) : null,
    volRegime: volRegime(ind, i),
    maxDrawdown: round(Math.min(...ind.drawdown) * 100, 2),
    currentDrawdown: round(ind.drawdown[i] * 100, 2),
  };
}

// ------------------------------------------------------------
// 回测
// pos[i] = 1 表示基于第 i 根收盘信号持有到第 i+1 根收盘；收益从 start+1 开始计
// ------------------------------------------------------------
function simulate(closes, pos, start) {
  const eq = [100];
  const rets = [];
  let trades = 0;
  let inMarket = 0;
  let wins = 0;
  for (let i = start + 1; i < closes.length; i++) {
    const held = pos[i - 1];
    const before = i - 2 >= start ? pos[i - 2] : 0;
    if (held === 1 && before === 0) trades++;
    const r = held * (closes[i] / closes[i - 1] - 1) - Math.abs(held - before) * COST;
    rets.push(r);
    if (held === 1) {
      inMarket++;
      if (r > 0) wins++;
    }
    eq.push(eq[eq.length - 1] * (1 + r));
  }
  return {
    eq,
    rets,
    trades,
    exposure: rets.length ? inMarket / rets.length : 0,
    winRate: inMarket ? wins / inMarket : 0,
    inMarket,
    wins,
  };
}

function ddOf(eq) {
  let peak = -Infinity;
  return eq.map((v) => {
    peak = Math.max(peak, v);
    return round((v / peak - 1) * 100, 2);
  });
}

function backtest(bars, ind, scores, premiumZ = null) {
  const n = bars.length;
  const start = QUANT.warmupBars;
  if (n - start < 20) return { available: false, reason: '样本不足，无法回测' };

  const closes = bars.map((b) => b.close);
  const posTrend = new Array(n).fill(0);
  const posTrendFiltered = new Array(n).fill(0);
  const posScore = new Array(n).fill(0);
  const posBollRsi = new Array(n).fill(0);
  const posPremiumArb = new Array(n).fill(0);
  const posHold = new Array(n).fill(0);

  let heldScore = 0;
  let heldBoll = 0;
  let heldArb = 0;

  for (let i = start; i < n; i++) {
    // 策略1：EMA 趋势
    const isBullTrend = valid(ind.emaFast[i]) && valid(ind.emaSlow[i]) && ind.emaFast[i] > ind.emaSlow[i];
    posTrend[i] = isBullTrend ? 1 : 0;

    // 策略2：EMA 趋势 + MA60 长期趋势过滤（过滤空头弱势反弹）
    const m60 = ind.ma[60]?.[i];
    posTrendFiltered[i] = isBullTrend && (!valid(m60) || closes[i] >= m60) ? 1 : 0;

    // 策略3：综合评分迟滞策略
    const s = scores[i];
    heldScore = heldScore === 1
      ? (valid(s) && s >= QUANT.longExitScore ? 1 : 0)
      : (valid(s) && s >= QUANT.longEntryScore ? 1 : 0);
    posScore[i] = heldScore;

    // 策略4：布林带 + RSI 均值回归反转策略
    const r = ind.rsi14[i];
    const pb = ind.boll.pctB[i];
    if (heldBoll === 1) {
      if ((valid(r) && r > 65) || (valid(pb) && pb > 0.9)) heldBoll = 0;
    } else {
      if (valid(r) && r < 38 && valid(pb) && pb < 0.2) heldBoll = 1;
    }
    posBollRsi[i] = heldBoll;

    // 策略5：溢价套利均值回归策略
    if (premiumZ && valid(premiumZ[i])) {
      const z = premiumZ[i];
      if (heldArb === 1) {
        if (z >= 0.5) heldArb = 0;
      } else {
        if (z <= -1.2) heldArb = 1;
      }
    } else {
      heldArb = 0;
    }
    posPremiumArb[i] = heldArb;

    // 策略6：买入持有
    posHold[i] = 1;
  }

  const simTrend = simulate(closes, posTrend, start);
  const simTrendFiltered = simulate(closes, posTrendFiltered, start);
  const simScore = simulate(closes, posScore, start);
  const simBollRsi = simulate(closes, posBollRsi, start);
  const simPremiumArb = simulate(closes, posPremiumArb, start);
  const simBuyHold = simulate(closes, posHold, start);

  const r2 = (arr) => arr.map((v) => round(v, 2));

  const strategies = {
    trend: { name: 'EMA 趋势', ...advancedMetrics(simTrend) },
    trendFiltered: { name: '趋势过滤', ...advancedMetrics(simTrendFiltered) },
    score: { name: '综合评分', ...advancedMetrics(simScore) },
    bollRsi: { name: '布林反转', ...advancedMetrics(simBollRsi) },
    buyHold: { name: '买入持有', ...advancedMetrics(simBuyHold) },
  };

  const equity = {
    dates: bars.slice(start).map((b) => b.date),
    trend: r2(simTrend.eq),
    trendFiltered: r2(simTrendFiltered.eq),
    score: r2(simScore.eq),
    bollRsi: r2(simBollRsi.eq),
    buyHold: r2(simBuyHold.eq),
  };

  const drawdown = {
    trend: ddOf(simTrend.eq),
    trendFiltered: ddOf(simTrendFiltered.eq),
    score: ddOf(simScore.eq),
    bollRsi: ddOf(simBollRsi.eq),
    buyHold: ddOf(simBuyHold.eq),
  };

  if (premiumZ && premiumZ.some(valid)) {
    strategies.premiumArb = { name: '溢价回归', ...advancedMetrics(simPremiumArb) };
    equity.premiumArb = r2(simPremiumArb.eq);
    drawdown.premiumArb = ddOf(simPremiumArb.eq);
  }

  return {
    available: true,
    startDate: bars[start].date,
    endDate: bars[n - 1].date,
    days: n - start,
    rules: {
      trend: 'EMA12 > EMA26 时持有，次日生效',
      trendFiltered: 'EMA12 > EMA26 且收盘价站在 MA60 上方',
      score: `综合评分 ≥ ${QUANT.longEntryScore} 开仓，≤ ${QUANT.longExitScore} 平仓`,
      bollRsi: 'RSI < 38 且 %B < 0.2 时低吸反弹，超买冲高平仓',
      premiumArb: '国内溢价 Z ≤ -1.2 低估介入，Z ≥ 0.5 止盈',
      buyHold: '全程持有（基准）',
      costPerSwitchPercent: round(COST * 100, 3),
    },
    strategies,
    equity,
    drawdown,
  };
}

// ------------------------------------------------------------
// 溢价统计
// ------------------------------------------------------------
export function summarizePremium(bars, premiumMap) {
  const series = bars
    .filter((b) => premiumMap.has(b.date))
    .map((b) => ({ date: b.date, value: premiumMap.get(b.date) }));
  if (series.length < 20) {
    return { available: false, count: series.length, reason: '可对齐的国际金价与汇率样本不足 20 个交易日', series: [] };
  }

  const values = series.map((s) => s.value);
  const recent = values.slice(-QUANT.premiumWindow);
  const m = mean(recent);
  const sd = stdev(recent);
  const current = values[values.length - 1];
  return {
    available: true,
    count: values.length,
    current: round(current, 3),
    mean60: round(m, 3),
    std60: round(sd, 3),
    z: sd > 0 ? round((current - m) / sd, 2) : 0,
    percentile: round((values.filter((v) => v <= current).length / values.length) * 100, 1),
    min: round(Math.min(...values), 3),
    max: round(Math.max(...values), 3),
    series: series.map((s) => ({ date: s.date, value: round(s.value, 3) })),
  };
}

// ------------------------------------------------------------
// 序列化：指标数组统一保留 2-3 位小数，减小响应体积
// ------------------------------------------------------------
function serialize(ind, scores) {
  const r = (arr, d) => arr.map((v) => (valid(v) ? round(v, d) : null));
  return {
    ma5: r(ind.ma[5], 2),
    ma10: r(ind.ma[10], 2),
    ma20: r(ind.ma[20], 2),
    ma60: r(ind.ma[60], 2),
    ema12: r(ind.emaFast, 2),
    ema26: r(ind.emaSlow, 2),
    bollUpper: r(ind.boll.upper, 2),
    bollMid: r(ind.boll.mid, 2),
    bollLower: r(ind.boll.lower, 2),
    pctB: r(ind.boll.pctB, 3),
    dif: r(ind.dif, 3),
    dea: r(ind.dea, 3),
    hist: r(ind.hist, 3),
    rsi14: r(ind.rsi14, 2),
    atr14: r(ind.atr14, 2),
    vol20: r(ind.vol20, 2),
    drawdown: r(ind.drawdown.map((x) => x * 100), 2),
    score: r(scores, 1),
  };
}

// ------------------------------------------------------------
// 总入口
// options.premiumByDate：Map<date, 溢价%>，由 alignPremium 生成
// ------------------------------------------------------------
export function analyzeMarket(rawBars, { premiumByDate = null } = {}) {
  const bars = sanitizeBars(rawBars);
  if (bars.length < QUANT.minBars) {
    return {
      available: false,
      reason: `有效K线不足（${bars.length} 根，至少需要 ${QUANT.minBars} 根）`,
      bars: [],
    };
  }

  const ind = computeIndicators(bars);
  const premiumAligned = premiumByDate ? bars.map((b) => premiumByDate.get(b.date) ?? null) : null;
  const premiumZ = premiumAligned ? rollingZ(premiumAligned, QUANT.premiumWindow) : null;

  const points = bars.map((bar, i) => scoreAt(i, bar, ind, premiumZ));
  const scores = points.map((p) => p.score);
  const last = bars.length - 1;

  return {
    available: true,
    asOf: bars[last].date,
    bars,
    indicators: serialize(ind, scores),
    signal: buildSignal(points[last], ind, last),
    levels: buildLevels(bars, ind, last),
    risk: buildRisk(ind, last),
    backtest: backtest(bars, ind, scores),
    premium: premiumByDate ? summarizePremium(bars, premiumByDate) : null,
  };
}
