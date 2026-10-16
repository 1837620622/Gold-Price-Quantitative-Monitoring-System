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
