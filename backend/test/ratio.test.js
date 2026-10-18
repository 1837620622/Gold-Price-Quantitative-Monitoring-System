/**
 * 金银比：日期对齐、统计量，以及接口返回的历史序列
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { buildRatioSeries, summarizeRatio } from '../src/quant/ratio.js';
import { resetCachesForTests } from '../src/lib/cache.js';
import { resetSourcesForTests } from '../src/lib/sources.js';
import { syntheticSeries, domesticFrom, fxSeries, makeUpstream } from './helpers.js';

test('按日期对齐金银价格，只保留两边都有收盘价的交易日', () => {
  const gold = [
    { date: '2026-01-01', close: 2600 },
    { date: '2026-01-02', close: 2620 },
    { date: '2026-01-05', close: 2650 },
  ];
  const silver = [
    { date: '2026-01-01', close: 50 },
    { date: '2026-01-05', close: 53 },
  ];
  assert.deepEqual(buildRatioSeries(gold, silver, 10), [
    { date: '2026-01-01', value: 52 },
    { date: '2026-01-05', value: 50 },
  ]);
});

test('序列只取最近 days 个交易日；非正价格被跳过', () => {
  const gold = Array.from({ length: 5 }, (_, i) => ({ date: `2026-01-0${i + 1}`, close: 2600 + i }));
  const silver = gold.map((b) => ({ date: b.date, close: b.date === '2026-01-03' ? 0 : 50 }));
  const all = buildRatioSeries(gold, silver, 10);
  assert.equal(all.length, 4);
  assert.ok(!all.some((p) => p.date === '2026-01-03'));

  const recent = buildRatioSeries(gold, silver, 2);
  assert.deepEqual(recent.map((p) => p.date), ['2026-01-04', '2026-01-05']);
});

test('均值、标准差与分位：当前值在历史序列中的位置', () => {
  const series = [50, 60, 70, 80].map((value, i) => ({ date: `d${i}`, value }));
  const stats = summarizeRatio(series, 75);
  assert.equal(stats.mean, 65);
  assert.equal(stats.std, 11.18);
  assert.equal(stats.percentile, 75);
});

test('没有历史序列时统计量为空，不会得到 NaN', () => {
  assert.deepEqual(summarizeRatio([], 70), { mean: null, std: null, percentile: null });
});

// ---- 接口级：/api/ratio 返回历史序列与统计量

const intl = syntheticSeries(250, { start: 2600, drift: 0.0008, vol: 0.011, seed: 3 });
const domestic = domesticFrom(intl);
const fx = fxSeries(intl);
const baseEnv = { ADMIN_TOKEN: 'test-admin-token', PUSHPLUS_TOKEN: 'pp' };
const call = (path) => worker.fetch(new Request(`https://api.test${path}`), baseEnv, { waitUntil() {} });

const originalFetch = globalThis.fetch;

beforeEach(() => {
  resetCachesForTests();
  resetSourcesForTests();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('/api/ratio：返回当前金银比、历史序列、均值与分位', async () => {
  globalThis.fetch = makeUpstream({ intl, domestic, fx }).fn;
  const r = await call('/api/ratio?days=60');
  const body = await r.json();
  assert.equal(body.success, true);
  assert.ok(body.current > 0);
  assert.equal(body.series.length, 60);
  assert.ok(body.series.every((p) => typeof p.date === 'string' && p.value > 0));
  assert.ok(Number.isFinite(body.mean) && Number.isFinite(body.std));
  assert.ok(body.percentile >= 0 && body.percentile <= 100);
});

test('/api/ratio：白银历史不可用时仍返回当前金银比，序列为空', async () => {
  globalThis.fetch = makeUpstream({ intl, domestic, fx, fail: { stooqSilver: true } }).fn;
  const body = await (await call('/api/ratio?days=60')).json();
  assert.equal(body.success, true);
  assert.ok(body.current > 0);
  assert.deepEqual(body.series, []);
  assert.equal(body.mean, null);
});
