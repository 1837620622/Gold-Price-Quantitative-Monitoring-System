/**
 * 英文研报：提示词与规则摘要不得残留中文字符，且保留固定结构
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPromptEn, ruleBasedEn, SYSTEM_PROMPT_EN } from '../src/ai-en.js';
import { analyzeMarket } from '../src/quant/engine.js';
import { syntheticSeries, domesticFrom, fxSeries } from './helpers.js';

const CJK = /[㐀-鿿]/;

const snapshot = {
  domestic: { price: 620.74, open: 620.87, high: 623.56, low: 617.37, previousClose: 620.56, changePercent: 0.03, volume: 1234, estimated: false },
  international: { price: 2696, previousClose: 2696.55, changePercent: -0.02, silverPrice: 50.2 },
  fx: { usdCny: 7.1114 },
  premiumPercent: 0.7,
};

test('英文研报：没有量化数据时，提示词与摘要只含英文', () => {
  assert.equal(CJK.test(buildPromptEn(snapshot, null)), false);
  const text = ruleBasedEn(snapshot, null);
  assert.equal(CJK.test(text), false);
  assert.match(text, /## Gold quant assessment/);
  assert.match(text, /Risk warning/);
});

test('英文研报：有量化数据时，信号、因子、回测名称都有英文对应', () => {
  const intl = syntheticSeries(250, { start: 2600, drift: 0.0008, vol: 0.011, seed: 3 });
  const domestic = domesticFrom(intl);
  const fx = fxSeries(intl);
  const quant = analyzeMarket(domestic, { premiumByDate: new Map(domestic.map((b, i) => [b.date, 0.5 + 0.1 * Math.sin(i / 7)])) });
  assert.equal(quant.available, true);
  const prompt = buildPromptEn(snapshot, quant);
  const text = ruleBasedEn(snapshot, quant);
  assert.equal(CJK.test(prompt), false, 'prompt has Chinese text');
  assert.equal(CJK.test(text), false, 'summary has Chinese text');
  assert.match(text, /Quant signal:/);
  assert.match(text, /Backtest comparison/);
  void fx;
});

test('英文研报：系统提示要求以英文输出完整的五段结构', () => {
  assert.match(SYSTEM_PROMPT_EN, /Write the entire report in English/);
  assert.match(SYSTEM_PROMPT_EN, /all five sections/);
});
