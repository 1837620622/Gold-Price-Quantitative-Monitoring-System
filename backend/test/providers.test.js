import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseStooqCsv, fetchStooqDaily } from '../src/providers/stooq.js';
import { parseEastmoneyKline } from '../src/providers/eastmoney.js';
import { fetchYahooSpot, fetchYahooDaily } from '../src/providers/yahoo.js';
import { fetchUsdCnyHistory } from '../src/providers/fx.js';
import { resetSourcesForTests, listSources } from '../src/lib/sources.js';
import { syntheticSeries, toYahooChart } from './helpers.js';

const originalFetch = globalThis.fetch;
beforeEach(() => resetSourcesForTests());
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const mockFetch = (handler) => {
  globalThis.fetch = async (url) => handler(String(url));
};

test('Stooq CSV：跳过非法行、按日期升序返回', () => {
  const csv = [
    'Date,Open,High,Low,Close,Volume',
    '2026-01-03,4010,4030,4000,4020,0',
    '2026-01-01,4000,4010,3990,4005,0',
    'bad-row,1,2,3,4,5',
    '2026-01-02,-1,2,1,1.5,0',          // 非正价格
    '2026-01-02,4005,4020,4001,4015,0',
  ].join('\n');
  const rows = parseStooqCsv(csv);
  assert.deepEqual(rows.map((r) => r.date), ['2026-01-01', '2026-01-02', '2026-01-03']);
  assert.equal(rows[0].close, 4005);
});

test('Stooq CSV：格式不正确（如 No data）抛出异常', () => {
  assert.throws(() => parseStooqCsv('No data'), /格式异常/);
});

test('东方财富 K 线字符串解析：日期,开,收,高,低,量', () => {
  const rows = parseEastmoneyKline(['2026-10-14,978.10,979.50,980.00,976.20,1234']);
  assert.deepEqual(rows[0], { date: '2026-10-14', open: 978.1, close: 979.5, high: 980, low: 976.2, volume: 1234 });
});

test('Yahoo 现价与昨收：昨收取倒数第二个有效收盘（而非 chartPreviousClose）', async () => {
  const bars = syntheticSeries(5, { start: 4000, seed: 3 });
  const chart = toYahooChart(bars);
  chart.chart.result[0].meta.chartPreviousClose = 3900; // 区间起点之前的收盘，不应被采用
  chart.chart.result[0].indicators.quote[0].close[3] = null; // 非交易日 null 应被忽略
  mockFetch(() => new Response(JSON.stringify(chart), { status: 200, headers: { 'content-type': 'application/json' } }));

  const q = await fetchYahooSpot();
  assert.equal(q.price, bars.at(-1).close);
  const valid = bars.map((b) => b.close).filter((_, i) => i !== 3);
  assert.equal(q.previousClose, valid.at(-2));
});

test('Yahoo 日K：丢弃 null 的 K 线，时间戳转为 UTC 日期', async () => {
  const bars = syntheticSeries(4, { start: 4000, seed: 5 });
  const chart = toYahooChart(bars);
  chart.chart.result[0].indicators.quote[0].open[1] = null;
  mockFetch(() => new Response(JSON.stringify(chart), { status: 200, headers: { 'content-type': 'application/json' } }));

  const rows = await fetchYahooDaily(30);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].date, bars[0].date);
});

test('国际日K：Stooq 失败时由调用方回退（此处验证失败被正确标记为 error）', async () => {
  mockFetch(() => new Response('No data', { status: 200 }));
  await assert.rejects(fetchStooqDaily('xauusd'), /格式异常|无数据/);
  const s = listSources().find((x) => x.name === 'Stooq');
  assert.equal(s.status, 'error');
  assert.ok(s.errCount >= 1);
});

test('汇率历史：Stooq 失败后回退到 Frankfurter（ECB）', async () => {
  const fx = syntheticSeries(10, { start: 7.1, drift: 0, vol: 0.001, seed: 9 });
  mockFetch((url) => {
    if (url.startsWith('https://stooq.com/')) return new Response('No data', { status: 200 });
    if (url.startsWith('https://api.frankfurter.app/')) {
      return new Response(JSON.stringify({ rates: Object.fromEntries(fx.map((b) => [b.date, { CNY: b.close }])) }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('x', { status: 599 });
  });

  const rows = await fetchUsdCnyHistory(5);
  assert.equal(rows.length, 5);
  assert.ok(rows.every((r) => r.close > 7));
  assert.equal(listSources().find((x) => x.name === 'Frankfurter (ECB)').status, 'ok');
});
