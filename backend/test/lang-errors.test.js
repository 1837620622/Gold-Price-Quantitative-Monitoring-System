/**
 * 错误响应的语言：英文界面下，/api/analyze 的异常分支与全局兜底都返回英文可读的消息
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

const call = (path, init = {}, env = {}) =>
  worker.fetch(new Request(`https://api.test${path}`, init), env, { waitUntil() {} });
const post = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const originalFetch = globalThis.fetch;

beforeEach(() => {
  resetCachesForTests();
  resetSourcesForTests();
  globalThis.fetch = makeUpstream({ intl, domestic, fx }).fn;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

// AI 绑定读取抛错：generateAnalysis 在自身 try 之外读取 env.AI，异常会冒泡到 getAnalysis，再进入 /api/analyze 的 catch
const brokenAiEnv = () => ({
  get AI() {
    throw new Error('ai binding broken');
  },
});

test('AI 分析异常：英文界面返回英文错误消息', async () => {
  const r = await call('/api/analyze', post({ lang: 'en' }), brokenAiEnv());
  const body = await r.json();
  assert.equal(r.status, 500);
  assert.equal(body.success, false);
  assert.equal(body.message, 'AI analysis failed');
});

test('AI 分析异常：中文界面（默认）保持中文错误消息', async () => {
  const r = await call('/api/analyze', post({}), brokenAiEnv());
  const body = await r.json();
  assert.equal(r.status, 500);
  assert.equal(body.message, 'AI 分析失败');
});

test('全局异常兜底：消息中英双语，两种语言都可读', async () => {
  // /api/push/status 在响应对象中读取 env.GOLD_KV，抛错后进入 app.onError
  const env = {
    get GOLD_KV() {
      throw new Error('kv broken');
    },
  };
  const r = await call('/api/push/status', {}, env);
  const body = await r.json();
  assert.equal(r.status, 500);
  assert.equal(body.success, false);
  assert.equal(body.message, '服务器内部错误 · Internal server error');
});
