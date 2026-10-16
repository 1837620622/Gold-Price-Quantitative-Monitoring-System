/**
 * ============================================================
 * 技术指标（纯函数，无副作用）
 * 约定：输入为等长数组，输出等长数组；预热期不足的位置为 null
 * ============================================================
 */

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function mean(values) {
  if (!values.length) return NaN;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// 样本标准差（n-1）
export function stdev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

export function median(values) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// 简单移动平均
export function sma(values, n) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

// 指数移动平均：以前 n 个有效值的 SMA 作为种子；遇到 null 会重新起算
export function ema(values, n) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (n + 1);
  let seedWindow = [];
  let prev = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!isNum(v)) {
      seedWindow = [];
      prev = null;
      continue;
    }
    if (prev === null) {
      seedWindow.push(v);
      if (seedWindow.length === n) {
        prev = mean(seedWindow);
        out[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

// MACD：DIF = EMA(fast) - EMA(slow)；DEA = EMA(DIF, signal)；柱 = 2 × (DIF - DEA)（国内行情软件惯例）
export function macd(values, fast = 12, slow = 26, signal = 9) {
  const f = ema(values, fast);
  const s = ema(values, slow);
  const dif = values.map((_, i) => (isNum(f[i]) && isNum(s[i]) ? f[i] - s[i] : null));
  const dea = ema(dif, signal);
  const hist = dif.map((d, i) => (isNum(d) && isNum(dea[i]) ? (d - dea[i]) * 2 : null));
  return { dif, dea, hist };
}

// RSI：Wilder 平滑。全涨 → 100，全跌 → 0，无涨跌 → 50
export function rsi(values, n = 14) {
  const out = new Array(values.length).fill(null);
  if (values.length <= n) return out;

  const rsiValue = (gain, loss) => {
    if (loss === 0) return gain === 0 ? 50 : 100;
    return 100 - 100 / (1 + gain / loss);
  };

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / n;
  let avgLoss = loss / n;
  out[n] = rsiValue(avgGain, avgLoss);

  for (let i = n + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (n - 1) + Math.max(d, 0)) / n;
    avgLoss = (avgLoss * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = rsiValue(avgGain, avgLoss);
  }
  return out;
}

// 布林带：中轨 = SMA(n)，上下轨 = 中轨 ± k × 总体标准差；%B = (价格 - 下轨) / (上轨 - 下轨)
export function bollinger(values, n = 20, k = 2) {
  const mid = sma(values, n);
  const upper = new Array(values.length).fill(null);
  const lower = new Array(values.length).fill(null);
  const pctB = new Array(values.length).fill(null);

  for (let i = n - 1; i < values.length; i++) {
    const window = values.slice(i - n + 1, i + 1);
    const m = mid[i];
    const sd = Math.sqrt(window.reduce((s, v) => s + (v - m) ** 2, 0) / n);
    upper[i] = m + k * sd;
    lower[i] = m - k * sd;
    pctB[i] = upper[i] > lower[i] ? (values[i] - lower[i]) / (upper[i] - lower[i]) : 0.5;
  }
  return { upper, mid, lower, pctB };
}

// 真实波幅 TR 的 Wilder 平滑（ATR）
export function atr(bars, n = 14) {
  const out = new Array(bars.length).fill(null);
  if (bars.length <= n) return out;

  const tr = bars.map((b, i) =>
    i === 0
      ? b.high - b.low
      : Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close))
  );

  let prev = mean(tr.slice(1, n + 1));
  out[n] = prev;
  for (let i = n + 1; i < bars.length; i++) {
    prev = (prev * (n - 1) + tr[i]) / n;
    out[i] = prev;
  }
  return out;
}

// 已实现波动率（年化，%）：过去 n 个对数收益率的样本标准差 × √periodsPerYear
export function realizedVol(values, n = 20, periodsPerYear = 252) {
  const out = new Array(values.length).fill(null);
  const logRet = values.map((v, i) => (i === 0 ? null : Math.log(v / values[i - 1])));
  for (let i = n; i < values.length; i++) {
    const window = logRet.slice(i - n + 1, i + 1);
    out[i] = stdev(window) * Math.sqrt(periodsPerYear) * 100;
  }
  return out;
}

// 回撤序列（相对历史高点的比例，0 表示创新高，负数为回撤）
export function drawdownSeries(values) {
  let peak = -Infinity;
  return values.map((v) => {
    peak = Math.max(peak, v);
    return v / peak - 1;
  });
}

// KDJ 指标（中国期货/贵金属经典参数 9, 3, 3）
export function kdj(bars, n = 9, m1 = 3, m2 = 3) {
  const k = new Array(bars.length).fill(null);
  const d = new Array(bars.length).fill(null);
  const j = new Array(bars.length).fill(null);
  if (bars.length < n) return { k, d, j };

  let prevK = 50;
  let prevD = 50;

  for (let i = 0; i < bars.length; i++) {
    if (i < n - 1) continue;
    const window = bars.slice(i - n + 1, i + 1);
    const lowN = Math.min(...window.map((b) => b.low));
    const highN = Math.max(...window.map((b) => b.high));
    const close = bars[i].close;
    const rsv = highN === lowN ? 50 : Math.max(0, Math.min(100, ((close - lowN) / (highN - lowN)) * 100));

    const currentK = (rsv + (m1 - 1) * prevK) / m1;
    const currentD = (currentK + (m2 - 1) * prevD) / m2;
    const currentJ = 3 * currentK - 2 * currentD;

    k[i] = currentK;
    d[i] = currentD;
    j[i] = currentJ;

    prevK = currentK;
    prevD = currentD;
  }
  return { k, d, j };
}

// 能量潮 OBV
export function obv(bars) {
  const out = new Array(bars.length).fill(0);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i > 0) {
      const diff = bars[i].close - bars[i - 1].close;
      const v = bars[i].volume || 0;
      if (diff > 0) sum += v;
      else if (diff < 0) sum -= v;
    }
    out[i] = sum;
  }
  return out;
}

// 枢轴点计算（经典、斐波那契、卡玛利拉支撑阻力）
export function computePivotPoints(high, low, close) {
  if (!isNum(high) || !isNum(low) || !isNum(close)) return null;
  const p = (high + low + close) / 3;
  const diff = high - low;
  const r2 = (v) => Math.round(v * 100) / 100;

  return {
    pivot: r2(p),
    classic: {
      r3: r2(high + 2 * (p - low)),
      r2: r2(p + diff),
      r1: r2(2 * p - low),
      pivot: r2(p),
      s1: r2(2 * p - high),
      s2: r2(p - diff),
      s3: r2(low - 2 * (high - p)),
    },
    fibonacci: {
      r3: r2(p + 1.0 * diff),
      r2: r2(p + 0.618 * diff),
      r1: r2(p + 0.382 * diff),
      pivot: r2(p),
      s1: r2(p - 0.382 * diff),
      s2: r2(p - 0.618 * diff),
      s3: r2(p - 1.0 * diff),
    },
    camarilla: {
      r4: r2(close + (diff * 1.1) / 2),
      r3: r2(close + (diff * 1.1) / 4),
      s3: r2(close - (diff * 1.1) / 4),
      s4: r2(close - (diff * 1.1) / 2),
    },
  };
}

// 专业回测指标（包含索提诺、卡玛、盈亏比、最大连亏等）
export function advancedMetrics({ eq, rets, trades, exposure, inMarket, wins, periodsPerYear = 252 }) {
  const r2 = (v) => Math.round(v * 100) / 100;
  const total = eq[eq.length - 1] / eq[0] - 1;
  const years = rets.length / periodsPerYear;
  const cagr = years > 0 ? (1 + total) ** (1 / years) - 1 : 0;
  const sd = stdev(rets);
  const m = mean(rets) || 0;

  let peak = -Infinity;
  let maxDd = 0;
  for (const v of eq) {
    peak = Math.max(peak, v);
    maxDd = Math.min(maxDd, v / peak - 1);
  }

  // 索提诺比率（仅对下行波动率惩罚）
  const downReturns = rets.filter((r) => r < 0);
  const downSd = downReturns.length > 1
    ? Math.sqrt(downReturns.reduce((s, r) => s + r ** 2, 0) / (downReturns.length - 1))
    : sd;
  const sortino = downSd > 0 ? (m / downSd) * Math.sqrt(periodsPerYear) : 0;

  // 卡玛比率（CAGR / |MaxDrawdown|）
  const calmar = Math.abs(maxDd) > 0.001 ? cagr / Math.abs(maxDd) : 0;

  // 盈亏比（总盈利额 / 总亏损额）
  const grossProfit = rets.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(rets.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.9 : 1.0);

  // 最大连续亏损次数
  let maxConsecLosses = 0;
  let currentLosses = 0;
  for (const r of rets) {
    if (r < 0) {
      currentLosses++;
      if (currentLosses > maxConsecLosses) maxConsecLosses = currentLosses;
    } else if (r > 0) {
      currentLosses = 0;
    }
  }

  return {
    totalReturn: r2(total * 100),
    cagr: r2(cagr * 100),
    vol: r2(sd * Math.sqrt(periodsPerYear) * 100),
    sharpe: sd > 0 ? r2((m / sd) * Math.sqrt(periodsPerYear)) : 0,
    sortino: r2(sortino),
    calmar: r2(calmar),
    profitFactor: r2(profitFactor),
    maxDrawdown: r2(maxDd * 100),
    trades,
    exposure: r2(exposure * 100),
    winRate: inMarket ? r2((wins / inMarket) * 100) : 0,
    maxConsecutiveLosses: maxConsecLosses,
  };
}

