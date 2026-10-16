/**
 * ============================================================
 * AI 量化分析
 * 原则：模型只负责解释，所有数值都由程序计算后传入；模型输出经前端消毒后展示
 * 模型链：DeepSeek-V3.2 → Qwen2.5-72B → 规则摘要（未配置 Key 或全部失败时）
 * ============================================================
 */

import { AI_TIMEOUT_MS, SOURCE_URLS, TTL } from './config.js';
import { getState, setState } from './lib/cache.js';
import { fmt, signed, signedPercent } from './lib/util.js';
import { getSnapshot, getQuant } from './market.js';

export const modelLabel = (model) => (model === 'auto-analysis' ? '规则摘要（未启用AI）' : model);

const MODELS = [
  { model: 'deepseek-ai/DeepSeek-V3.2', name: 'DeepSeek-V3.2', options: { temperature: 0.6, top_p: 0.95, max_tokens: 2200 } },
  { model: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', options: { temperature: 0.5, max_tokens: 1800 } },
];

const SYSTEM_PROMPT = '你是一位严谨的黄金市场量化分析师。请用中文回复，只基于用户提供的数据，不编造数值。';

const fmtStrategy = (st) =>
  `${st.name}：总收益 ${signedPercent(st.totalReturn)}，年化 ${signedPercent(st.cagr)}，最大回撤 ${fmt(st.maxDrawdown)}%，夏普 ${fmt(st.sharpe)}，换仓 ${st.trades} 次`;

function quantBlock(quant) {
  if (!quant?.available) return '（量化数据不可用：' + (quant?.reason ?? '未知原因') + '）';
  const { signal: s, levels: l, risk: r, backtest: bt, premium: p } = quant;
  const lines = [
    `信号：${s.label}（评分 ${signed(s.score, 1)}，置信度 ${s.confidence}%）`,
    `趋势状态：${s.trend}；波动状态：${s.volRegime}`,
    '评分构成（权重 × 分量得分，得分范围 -1 至 +1）：',
    ...s.components.map((c) => `  - ${c.label}：权重 ${c.weight}，得分 ${signed(c.score, 2)}，${c.reason}`),
    `关键位：支撑 ${l.support.join(' / ')}；阻力 ${l.resistance.join(' / ')}`,
    `ATR(14) ${fmt(l.atr)}（占价格 ${fmt(l.atrPercent)}%），参考区间 ${fmt(l.refLow)} - ${fmt(l.refHigh)}`,
    `风险：近20日年化波动 ${fmt(r.vol20)}%；样本最大回撤 ${fmt(r.maxDrawdown)}%；当前回撤 ${fmt(r.currentDrawdown)}%`,
  ];
  if (bt?.available) {
    lines.push(`回测区间 ${bt.startDate} 至 ${bt.endDate}（${bt.days} 个交易日，单边成本 ${bt.rules.costPerSwitchPercent}%）`);
    lines.push(`  ${fmtStrategy(bt.strategies.trend)}`);
    lines.push(`  ${fmtStrategy(bt.strategies.score)}`);
    lines.push(`  ${fmtStrategy(bt.strategies.buyHold)}`);
  }
  if (p?.available) {
    lines.push(`国内溢价：当前 ${signed(p.current, 3)}%，近60日均值 ${signed(p.mean60, 3)}%，Z=${p.z}，历史分位 ${p.percentile}%`);
  }
  return lines.join('\n');
}

function buildPrompt(snapshot, quant) {
  const intl = snapshot.international;
  const dom = snapshot.domestic;
  return `请基于以下程序计算的结果撰写黄金量化分析报告。
要求：严格引用数据；若趋势、动量与溢价信号相互矛盾，必须明确指出；给出情景分析（上行/下行的触发条件）而不做绝对预测；结尾说明本报告不构成投资建议。

【行情】
- 国内 AU9999：${fmt(dom.price)} 元/克${dom.estimated ? '（估算价，非交易所实时价）' : ''}，涨跌幅 ${signedPercent(dom.changePercent)}
- 国际 XAU/USD：${fmt(intl?.price)} 美元/盎司；美元兑人民币 ${fmt(snapshot.fx?.usdCny, 4)}；国内溢价 ${signedPercent(snapshot.premiumPercent)}

【量化结果】
${quantBlock(quant)}

请按以下结构输出 Markdown：
## 量化分析报告
### 1. 信号解读
（说明各评分分量的一致性与主要矛盾）
### 2. 关键位与情景分析
（支撑、阻力、突破或跌破的触发条件）
### 3. 风险提示
（波动、回撤、溢价偏离）
### 4. 回测的参考意义
（说明样本区间、交易成本假设与局限）`;
}

function ruleBased(snapshot, quant) {
  const dom = snapshot.domestic;
  const intl = snapshot.international;
  const lines = [
    '【规则摘要】',
    '',
    `国内 AU9999：${fmt(dom.price)} 元/克${dom.estimated ? '（估算价）' : ''}`,
    `国际 XAU/USD：${fmt(intl?.price)} 美元/盎司`,
    '',
  ];

  if (quant?.available) {
    const s = quant.signal;
    const l = quant.levels;
    lines.push(
      `量化信号：${s.label}（评分 ${signed(s.score, 1)}，置信度 ${s.confidence}%）`,
      `趋势：${s.trend}；波动：${s.volRegime}`,
      '主要依据：',
      ...s.reasons.map((reason) => `- ${reason}`),
      '',
      `关键位：支撑 ${l.support.join(' / ')}；阻力 ${l.resistance.join(' / ')}`,
      `参考波动区间：${fmt(l.refLow)} - ${fmt(l.refHigh)}`,
      ''
    );
    if (quant.backtest?.available) {
      const st = quant.backtest.strategies;
      lines.push(`回测（${quant.backtest.days} 日）：综合评分策略总收益 ${signedPercent(st.score.totalReturn)}，买入持有 ${signedPercent(st.buyHold.totalReturn)}`, '');
    }
  } else {
    lines.push('量化数据不足，无法给出信号。', '');
  }

  if (dom.estimated) lines.push('注意：国内价为估算值，本摘要不给出操作倾向。', '');
  lines.push('风险提示：黄金投资有风险，以上为程序计算的量化参考，不构成投资建议。');
  return lines.join('\n');
}

async function callModel(apiKey, candidate, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(SOURCE_URLS.modelscope, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: candidate.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        ...candidate.options,
      }),
    });
    if (!res.ok) throw new Error(`${candidate.name} HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${candidate.name} 返回内容为空`);
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateAnalysis(env, snapshot, quant) {
  const apiKey = env.MODELSCOPE_API_KEY;
  if (!apiKey) {
    return { success: true, analysis: ruleBased(snapshot, quant), model: 'auto-analysis', timestamp: new Date().toISOString() };
  }

  const prompt = buildPrompt(snapshot, quant);
  for (const candidate of MODELS) {
    try {
      const content = await callModel(apiKey, candidate, prompt);
      return { success: true, analysis: content, model: candidate.name, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('AI 模型调用失败:', error.message);
    }
  }
  return { success: true, analysis: ruleBased(snapshot, quant), model: 'auto-analysis', timestamp: new Date().toISOString() };
}

// 响应体只带摘要，完整序列留给图表接口
function summarizeQuant(quant) {
  if (!quant) return null;
  return {
    available: quant.available,
    asOf: quant.asOf ?? null,
    signal: quant.signal ?? null,
    levels: quant.levels ?? null,
    risk: quant.risk ?? null,
    backtest: quant.backtest?.available
      ? { days: quant.backtest.days, strategies: quant.backtest.strategies, rules: quant.backtest.rules }
      : null,
    premium: quant.premium?.available
      ? { current: quant.premium.current, z: quant.premium.z, percentile: quant.premium.percentile }
      : null,
  };
}

// ------------------------------------------------------------
// 分析入口：结果缓存 15 分钟（仅缓存真正调用了模型的结果），并发请求合并
// ------------------------------------------------------------
let inflight = null;

async function buildAnalysis(env) {
  const snapshot = await getSnapshot();
  if (!snapshot.domestic) {
    return { success: false, message: '行情暂不可用，请稍后重试', priceData: snapshot, timestamp: new Date().toISOString() };
  }
  const quant = await getQuant('cn').catch((error) => {
    console.error('量化计算失败:', error.message);
    return null;
  });
  const analysis = await generateAnalysis(env, snapshot, quant);
  const payload = {
    success: true,
    priceData: snapshot,
    quant: summarizeQuant(quant),
    analysis,
    timestamp: new Date().toISOString(),
  };
  if (analysis.model !== 'auto-analysis') {
    await setState(env, 'analysisCache', { at: Date.now(), payload });
  }
  return payload;
}

export async function getAnalysis(env) {
  const cached = await getState(env, 'analysisCache');
  if (cached && Date.now() - cached.at < TTL.analysis) {
    return { ...cached.payload, cached: true };
  }
  if (!inflight) {
    inflight = buildAnalysis(env).finally(() => {
      inflight = null;
    });
  }
  return { ...(await inflight), cached: false };
}
