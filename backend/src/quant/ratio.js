/**
 * 金银比（Gold/Silver Ratio）：历史序列与统计量。纯函数，不做网络请求。
 * 金、银两条日线按日期对齐，只保留两边都有收盘价的交易日。
 */

const round2 = (v) => Math.round(v * 100) / 100;

// 按日期对齐金价与银价，返回最近 days 个交易日的 { date, value }（value = 金价 ÷ 银价）
export function buildRatioSeries(goldBars, silverBars, days) {
  const silverByDate = new Map((silverBars || []).map((b) => [b.date, b.close]));
  const series = [];
  for (const g of goldBars || []) {
    const silver = silverByDate.get(g.date);
    if (!(g.close > 0) || !(silver > 0)) continue;
    series.push({ date: g.date, value: round2(g.close / silver) });
  }
  return series.slice(-days);
}

// 均值、标准差，以及当前值在历史序列中的分位（0–100，越高越接近历史高位）
export function summarizeRatio(series, current) {
  const values = (series || []).map((p) => p.value);
  if (!values.length) return { mean: null, std: null, percentile: null };

  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const ref = Number.isFinite(current) ? current : values[n - 1];
  const atOrBelow = values.filter((v) => v <= ref).length;

  return {
    mean: round2(mean),
    std: round2(Math.sqrt(variance)),
    percentile: Math.round((atOrBelow / n) * 100),
  };
}
