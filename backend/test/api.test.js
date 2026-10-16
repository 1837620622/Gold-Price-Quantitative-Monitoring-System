/**
 * 接口级测试：通过 worker.fetch 调用真实路由，上游全部由 mock 提供
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { resetCachesForTests } from '../src/lib/cache.js';
import { resetSourcesForTests } from '../src/lib/sources.js';
import { syntheticSeries, domesticFrom, fxSeries, makeUpstream } from './helpers.js';

const intl = syntheticSeries(250, { start: 2600, drift: 0.0008, vol: 0.011, seed: 3 });
const domestic = domesticFrom(intl);
const fx = fxSeries(intl);

const baseEnv = { ADMIN_TOKEN: 'test-admin-token', PUSHPLUS_TOKEN: 'pp' };
const admin = { Authorization: 'Bearer test-admin-token' };
const call = (path, init = {}, env = baseEnv, ctx = { waitUntil() {} }) =>
  worker.fetch(new Request(`https://api.test${path}`, init), env, ctx);

const originalFetch = globalThis.fetch;
let upstream;

function useUpstream(options = {}) {
  upstream = makeUpstream({ intl, domestic, fx, ...options });
  globalThis.fetch = upstream.fn;
  return upstream;
}

beforeEach(() => {
  resetCachesForTests();
  resetSourcesForTests();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('行情快照：双源报价、汇率、溢价与交叉校验齐全', async () => {
  useUpstream();
  const r = await call('/api/price/all');
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.domestic.source, '东方财富');
  assert.equal(body.domestic.estimated, false);
  assert.equal(body.international.source, 'gold-api.com');
  assert.equal(body.fx.usdCny, fx.at(-1).close);
  assert.ok(Number.isFinite(body.premiumPercent));
  const check = body.crossChecks.find((c) => c.name === '国际金价双源校验');
  assert.equal(check.status, 'ok');
  assert.ok(body.sources.some((s) => s.name === 'gold-api.com' && s.status === 'ok'));
  assert.ok(body.sources.some((s) => s.name === '东方财富' && s.status === 'ok'));
});

test('国内量化：指标长度与K线一致，信号、回测、溢价均可用', async () => {
  useUpstream();
  const r = await call('/api/quant/cn?days=250');
  const q = await r.json();
  assert.equal(r.status, 200);
  assert.equal(q.available, true);
  assert.equal(q.indicators.ma20.length, q.bars.length);
  assert.equal(q.indicators.score.length, q.bars.length);
  assert.ok(q.signal.available);
  assert.ok(q.backtest.available);
  assert.ok(q.premium.available);
  assert.ok(q.premium.series.length > 200);
});

test('国际量化：独立计算，不依赖国内溢价', async () => {
  useUpstream();
  const q = await (await call('/api/quant/intl?days=250')).json();
  assert.equal(q.available, true);
  assert.equal(q.market, 'intl');
  assert.equal(q.premium, null);
});

test('溢价接口：返回序列与统计', async () => {
  useUpstream();
  const p = await (await call('/api/premium?days=250')).json();
  assert.equal(p.success, true);
  assert.ok(Number.isFinite(p.premium.z));
  assert.ok(p.premium.percentile >= 0 && p.premium.percentile <= 100);
});

test('非法市场参数返回 400', async () => {
  useUpstream();
  assert.equal((await call('/api/quant/xx')).status, 400);
});

test('管理接口：未携带或错误的 Token 返回 401；未配置 ADMIN_TOKEN 返回 503', async () => {
  useUpstream();
  assert.equal((await call('/api/monitor')).status, 401);
  assert.equal((await call('/api/monitor', { headers: { Authorization: 'Bearer nope' } })).status, 401);
  assert.equal((await call('/api/monitor', { headers: admin }, {})).status, 503);
});

test('东方财富行情故障：国内价降级为估算并标注，量化（基于日K）仍可用', async () => {
  useUpstream({ fail: { domestic: true } });
  const body = await (await call('/api/price/all')).json();
  assert.equal(body.domestic.estimated, true);
  assert.equal(body.domestic.changePercent, null);
  assert.ok(body.crossChecks.some((c) => c.name === '国内价来源' && c.status === 'warn'));
  const q = await (await call('/api/quant/cn?days=250')).json();
  assert.equal(q.available, true);
});

test('Stooq 故障：国际日K 回退到 Yahoo，并在数据源中记录', async () => {
  useUpstream({ fail: { stooq: true } });
  const q = await (await call('/api/quant/intl?days=250')).json();
  assert.equal(q.available, true);
  assert.ok(upstream.log.some((u) => u.includes('query1.finance.yahoo.com') && u.includes('range=2y')));
});

test('国际历史双源均失败：返回 503，不伪造数据', async () => {
  useUpstream({ fail: { stooq: true, yahoo: true } });
  const r = await call('/api/quant/intl?days=250');
  const body = await r.json();
  assert.equal(r.status, 503);
  assert.equal(body.success, false);
  assert.match(body.message, /量化数据获取失败/);
});

test('量化结果缓存：多次请求只访问一次上游K线', async () => {
  useUpstream();
  await call('/api/quant/cn?days=250');
  await call('/api/quant/cn?days=250');
  const klineCalls = upstream.log.filter((u) => u.includes('push2his.eastmoney.com')).length;
  assert.equal(klineCalls, 1);
});

test('AI 分析：未配置 Key 时使用规则摘要，且摘要引用量化信号', async () => {
  useUpstream();
  const body = await (await call('/api/analyze', { method: 'POST' }, { ADMIN_TOKEN: 'x' })).json();
  assert.equal(body.analysis.model, 'auto-analysis');
  assert.match(body.analysis.analysis, /量化信号：/);
  assert.ok(body.quant.signal);
  assert.equal(body.quant.backtest.strategies.trend.name, 'EMA 趋势');
});

test('AI 分析：模型成功后缓存生效，二次请求不再调用模型', async () => {
  useUpstream({ aiOk: true });
  const env = { ...baseEnv, MODELSCOPE_API_KEY: 'k' };
  const first = await (await call('/api/analyze', { method: 'POST' }, env)).json();
  const second = await (await call('/api/analyze', { method: 'POST' }, env)).json();
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(upstream.log.filter((u) => u.includes('modelscope')).length, 1);
});

test('强制推送：价格消息与 AI 消息各发送一次（AI 失败时使用规则摘要）', async () => {
  useUpstream({ pushOk: true });
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };
  const r = await call('/api/push/force', { method: 'POST', headers: admin }, baseEnv, ctx);
  assert.equal((await r.json()).success, true);
  await Promise.all(waits);
  assert.equal(upstream.log.filter((u) => u.includes('pushplus.plus')).length, 2);
});

test('价格推送失败：不再发送 AI 消息', async () => {
  useUpstream({ pushOk: false });
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };
  const body = await (await call('/api/push/force', { method: 'POST', headers: admin }, baseEnv, ctx)).json();
  assert.equal(body.success, false);
  await Promise.all(waits);
  assert.equal(upstream.log.filter((u) => u.includes('pushplus.plus')).length, 1);
});

test('安全响应头：API 允许跨域读取，管理接口响应不缓存', async () => {
  useUpstream();
  const r = await call('/api/price/all');
  assert.equal(r.headers.get('cross-origin-resource-policy'), 'cross-origin');
  const denied = await call('/api/monitor');
  assert.equal(denied.headers.get('cache-control'), 'no-store');
});

test('未知路由返回 JSON 404', async () => {
  useUpstream();
  const r = await call('/api/nope');
  assert.equal(r.status, 404);
  assert.equal((await r.json()).success, false);
});
