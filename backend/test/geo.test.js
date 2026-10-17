/**
 * 访客地理信息接口：字段来自 request.cf；边缘信息缺失时全部为 null；不返回 IP
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const env = {};
const ctx = { waitUntil() {} };

function geoRequest(cf) {
  const req = new Request('https://api.test/api/geo');
  if (cf) Object.defineProperty(req, 'cf', { value: cf });
  return worker.fetch(req, env, ctx);
}

test('访客地理：从 Cloudflare 边缘信息取得国家、时区与坐标，且不回显 IP', async () => {
  const r = await geoRequest({
    country: 'CN',
    city: 'Shanghai',
    timezone: 'Asia/Shanghai',
    latitude: '31.2304',
    longitude: '121.4737',
    ip: '203.0.113.9',
  });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'private, no-store');
  const body = await r.json();
  assert.deepEqual(body, {
    success: true,
    country: 'CN',
    city: 'Shanghai',
    timezone: 'Asia/Shanghai',
    latitude: 31.2304,
    longitude: 121.4737,
    source: 'cloudflare',
  });
  assert.equal('ip' in body, false);
});

test('访客地理：没有边缘信息时各字段为 null，不伪造数据', async () => {
  const r = await geoRequest(null);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.deepEqual(body, {
    success: true,
    country: null,
    city: null,
    timezone: null,
    latitude: null,
    longitude: null,
    source: 'unavailable',
  });
});
