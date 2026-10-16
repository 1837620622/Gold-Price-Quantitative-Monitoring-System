import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sma, ema, macd, rsi, bollinger, atr, realizedVol, drawdownSeries, stdev, median } from '../src/quant/indicators.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('SMA：前 n-1 个为 null，之后为窗口均值', () => {
  const out = sma([1, 2, 3, 4, 5], 3);
  assert.deepEqual(out, [null, null, 2, 3, 4]);
});

test('EMA：线性序列 1..10，n=3 时 EMA = 价格 - 1（种子为前三值均值 2）', () => {
  const values = Array.from({ length: 10 }, (_, i) => i + 1);
  const out = ema(values, 3);
  assert.equal(out[0], null);
  assert.equal(out[1], null);
  close(out[2], 2);
  for (let i = 3; i < values.length; i++) close(out[i], values[i] - 1);
});

test('EMA：遇到 null 会重新起算', () => {
  const out = ema([1, 2, null, 4, 5, 6], 2);
  assert.equal(out[2], null);
  assert.equal(out[3], null);
  close(out[4], 4.5); // 种子 (4+5)/2
});

test('RSI：单边上涨为 100，单边下跌为 0，无涨跌为 50', () => {
  const up = Array.from({ length: 30 }, (_, i) => 100 + i);
  const down = Array.from({ length: 30 }, (_, i) => 100 - i);
  const flat = new Array(30).fill(100);
  assert.equal(rsi(up, 14)[29], 100);
  assert.equal(rsi(down, 14)[29], 0);
  assert.equal(rsi(flat, 14)[29], 50);
});

test('RSI（Wilder 平滑）：手算验证，序列 10,11,10,11,10,11，周期 3', () => {
  // 初始窗口涨跌各 2、1：avgGain=2/3，avgLoss=1/3 → RSI=66.667
  // 之后依次为 44.444、62.963（分别手工递推得出）
  const out = rsi([10, 11, 10, 11, 10, 11], 3);
  assert.equal(out[2], null);
  close(out[3], 100 - 100 / 3, 1e-9);
  close(out[4], 100 - 100 / 1.8, 1e-9);
  close(out[5], 100 - 100 / 2.7, 1e-9);
});

test('MACD：常数序列的 DIF、DEA、柱线均为 0', () => {
  const values = new Array(60).fill(50);
  const m = macd(values, 12, 26, 9);
  assert.equal(m.dif[59], 0);
  assert.equal(m.dea[59], 0);
  assert.equal(m.hist[59], 0);
});

test('MACD：上涨趋势中 DIF 为正，柱线 = 2 × (DIF - DEA)', () => {
  const values = Array.from({ length: 80 }, (_, i) => 100 + i * 0.5);
  const m = macd(values);
  assert.ok(m.dif[79] > 0);
  close(m.hist[79], (m.dif[79] - m.dea[79]) * 2, 1e-12);
});

test('布林带：常数序列上下轨与中轨重合，%B = 0.5', () => {
  const b = bollinger(new Array(25).fill(10), 20, 2);
  assert.equal(b.upper[24], 10);
  assert.equal(b.lower[24], 10);
  assert.equal(b.pctB[24], 0.5);
});

test('布林带：上下轨对称于中轨，且 %B 与价格位置一致', () => {
  const values = Array.from({ length: 30 }, (_, i) => 100 + (i % 3));
  const b = bollinger(values, 20, 2);
  const i = 29;
  close(b.upper[i] - b.mid[i], b.mid[i] - b.lower[i], 1e-9);
  close(b.pctB[i], (values[i] - b.lower[i]) / (b.upper[i] - b.lower[i]), 1e-12);
});

test('ATR：固定振幅 2 的 K 线，ATR 恒为 2', () => {
  const bars = Array.from({ length: 30 }, (_, i) => ({ high: 101 + i * 0, low: 99, close: 100 }));
  const out = atr(bars, 14);
  assert.equal(out[13], null);
  close(out[14], 2);
  close(out[29], 2);
});

test('已实现波动率：常数价格为 0；交替涨跌 ±1% 时接近 1% × √252 × 100', () => {
  const flat = new Array(40).fill(100);
  assert.equal(realizedVol(flat, 20, 252)[39], 0);

  const zigzag = Array.from({ length: 60 }, (_, i) => (i % 2 ? 100 : 101));
  const vol = realizedVol(zigzag, 20, 252)[59];
  const expected = Math.abs(Math.log(101 / 100)) * Math.sqrt(252) * 100;
  assert.ok(Math.abs(vol - expected) / expected < 0.06, `vol=${vol} expected≈${expected}`);
});

test('回撤序列：相对历史高点计算', () => {
  const dd = drawdownSeries([1, 2, 1.5, 3, 2.7]);
  assert.deepEqual(dd.map((x) => Math.round(x * 1e6) / 1e6), [0, 0, -0.25, 0, -0.1]);
});

test('样本标准差与中位数', () => {
  close(stdev([2, 4, 4, 4, 5, 5, 7, 9]), Math.sqrt(32 / 7), 1e-12);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});
