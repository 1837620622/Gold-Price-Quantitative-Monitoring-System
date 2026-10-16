import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMarket, alignPremium, sanitizeBars, summarizePremium } from '../src/quant/engine.js';
import { syntheticSeries } from './helpers.js';

test('数据清洗：去重、剔除非正价格与 OHLC 不合理的 K 线，并按日期升序', () => {
  const rows = [
    { date: '2026-01-02', open: 10, high: 11, low: 9, close: 10.5, volume: 1 },
    { date: '2026-01-01', open: 10, high: 11, low: 9, close: 10.2, volume: 1 },
    { date: '2026-01-01', open: 10, high: 11, low: 9, close: 10.2, volume: 1 }, // 重复
    { date: '2026-01-03', open: 10, high: 9, low: 11, close: 10, volume: 1 },   // high < low
    { date: '2026-01-04', open: 0, high: 1, low: 0.5, close: 0.8, volume: 1 },  // 非正价格
    { date: '2026-01-05', open: 10, high: 10, low: 10, close: 12, volume: 1 },  // close 超出 high
  ];
  const out = sanitizeBars(rows);
  assert.deepEqual(out.map((b) => b.date), ['2026-01-01', '2026-01-02']);
});

test('上涨趋势：信号偏多，EMA 趋势与买入持有的总收益为正', () => {
  const bars = syntheticSeries(160, { drift: 0.002, vol: 0.006, seed: 11 });
  const q = analyzeMarket(bars);
  assert.equal(q.available, true);
  assert.ok(q.signal.score > 0, `score=${q.signal.score}`);
  assert.ok(['偏多', '强势偏多'].includes(q.signal.label), q.signal.label);
  assert.ok(q.backtest.strategies.trend.totalReturn > 0);
  assert.ok(q.backtest.strategies.buyHold.totalReturn > 0);
  assert.ok(q.backtest.strategies.trend.trades >= 1);
});

test('下跌趋势：信号偏空；EMA 趋势策略全程空仓，收益为 0', () => {
  const bars = syntheticSeries(160, { drift: -0.002, vol: 0.006, seed: 12 });
  const q = analyzeMarket(bars);
  assert.ok(q.signal.score < 0, `score=${q.signal.score}`);
  assert.ok(['偏空', '强势偏空'].includes(q.signal.label), q.signal.label);
  assert.equal(q.backtest.strategies.trend.trades, 0);
  assert.equal(q.backtest.strategies.trend.totalReturn, 0);
  assert.ok(q.backtest.strategies.buyHold.totalReturn < 0);
});

test('无前视偏差：截断后的历史评分与完整序列逐点一致', () => {
  const bars = syntheticSeries(200, { seed: 21 });
  const full = analyzeMarket(bars);
  const part = analyzeMarket(bars.slice(0, 150));
  for (let i = 0; i < 150; i++) {
    assert.equal(part.indicators.score[i], full.indicators.score[i], `score mismatch at ${i}`);
    assert.equal(part.indicators.ma20[i], full.indicators.ma20[i]);
    assert.equal(part.indicators.rsi14[i], full.indicators.rsi14[i]);
  }
});

test('回测：仓位只使用前一根收盘信号，收益序列与权益曲线长度一致', () => {
  const bars = syntheticSeries(120, { seed: 31 });
  const q = analyzeMarket(bars);
  const bt = q.backtest;
  assert.equal(bt.available, true);
  assert.equal(bt.equity.dates.length, bt.equity.buyHold.length);
  assert.equal(bt.equity.dates.length, bt.days);
  assert.equal(bt.drawdown.trend.length, bt.days);
  assert.ok(bt.strategies.score.maxDrawdown <= 0);
});

test('样本不足：返回 available=false 而不是伪造结论', () => {
  const q = analyzeMarket(syntheticSeries(20));
  assert.equal(q.available, false);
  assert.match(q.reason, /有效K线不足/);
});

test('溢价对齐：国内 = 国际 × 汇率 ÷ 31.1035 × 1.02 时，溢价应为 2%', () => {
  const intl = syntheticSeries(30, { seed: 41 });
  const fx = intl.map((b) => ({ date: b.date, close: 7.2 }));
  const domestic = intl.map((b) => ({ date: b.date, close: (b.close * 7.2 / 31.1035) * 1.02 }));
  const map = alignPremium(domestic, intl, fx);
  assert.equal(map.size, 30);
  for (const v of map.values()) assert.ok(Math.abs(v - 2) < 0.01, `premium=${v}`);
});

test('溢价对齐：国际或汇率缺失的日期不生成溢价；前推不超过 4 个自然日', () => {
  const domestic = [
    { date: '2026-03-02', close: 100 },
    { date: '2026-03-10', close: 100 },
  ];
  const intl = [{ date: '2026-03-01', close: 4000 }]; // 距 3-02 为 1 天（可用），距 3-10 为 9 天（不可用）
  const fx = [{ date: '2026-03-01', close: 7 }];
  const map = alignPremium(domestic, intl, fx);
  assert.ok(map.has('2026-03-02'));
  assert.ok(!map.has('2026-03-10'));
});

test('溢价统计：Z 分数与分位数计算正确', () => {
  const bars = Array.from({ length: 30 }, (_, i) => ({ date: `2026-02-${String(i + 1).padStart(2, '0')}`, close: 1 }));
  const map = new Map(bars.map((b, i) => [b.date, i < 29 ? 1 : 3]));
  const p = summarizePremium(bars, map);
  assert.equal(p.available, true);
  assert.equal(p.current, 3);
  assert.equal(p.percentile, 100);
  assert.ok(p.z > 0);
});

test('溢价样本不足 20 个时不给统计结论', () => {
  const bars = syntheticSeries(10);
  const map = new Map(bars.map((b) => [b.date, 1]));
  assert.equal(summarizePremium(bars, map).available, false);
});

test('评分分量会随溢价数据增减，且权重在缺失时自动归一化', () => {
  const bars = syntheticSeries(120, { seed: 51 });
  const without = analyzeMarket(bars);
  const premiumMap = new Map(bars.map((b, i) => [b.date, 1 + 0.5 * Math.sin(i / 4)]));
  const withPremium = analyzeMarket(bars, { premiumByDate: premiumMap });
  assert.ok(!without.signal.components.some((c) => c.key === 'premium'));
  assert.ok(withPremium.signal.components.some((c) => c.key === 'premium'));
  assert.ok(withPremium.signal.score >= -100 && withPremium.signal.score <= 100);
});
