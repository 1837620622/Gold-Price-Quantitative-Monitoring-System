/**
 * ============================================================
 * AI 量化分析
 * 原则：模型只负责解释与情景推理，所有数值都由程序严格计算后传入；模型输出经前端消毒后展示
 * 多模型容灾链：
 *   1. ModelScope（魔搭社区，DeepSeek-V3.2 / Qwen2.5-72B）
 *   2. DeepSeek 官方 API（deepseek-chat）
 *   3. OpenRouter 免费/聚合模型（deepseek-r1:free / llama-3.3-70b）
 *   4. 硅基流动 SiliconFlow（DeepSeek-V3 / Qwen2.5-72B）
 *   5. Cloudflare Workers AI 内置免费大模型（@cf/deepseek-ai / @cf/qwen）
 *   6. 规则引擎（未配置任何 Key 或全部失败时无缝兜底）
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

const SYSTEM_PROMPT = '你是一位兼具华尔街宏观对冲基金经理与资深量化交易员视角的黄金市场首席分析师。请用专业、严谨、客观的中文回复，严格基于用户提供的程序量化数据，不编造数值。';

const fmtStrategy = (st) =>
  `${st.name}：总收益 ${signedPercent(st.totalReturn)}，年化 ${signedPercent(st.cagr)}，夏普 ${fmt(st.sharpe)}，索提诺 ${fmt(st.sortino)}，卡玛 ${fmt(st.calmar)}，盈亏比 ${fmt(st.profitFactor)}，胜率 ${fmt(st.winRate)}%，最大回撤 ${fmt(st.maxDrawdown)}%`;

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
    `防守止损参考：多头参考 ${fmt(l.stopLongRef)}，空头参考 ${fmt(l.stopShortRef)}`,
  ];

  if (l.pivots?.classic) {
    const cp = l.pivots.classic;
    lines.push(`经典枢轴点：枢轴 P ${fmt(cp.pivot)}，阻力 R1 ${fmt(cp.r1)} / R2 ${fmt(cp.r2)} / R3 ${fmt(cp.r3)}，支撑 S1 ${fmt(cp.s1)} / S2 ${fmt(cp.s2)} / S3 ${fmt(cp.s3)}`);
  }

  lines.push(`风险监控：近20日年化波动 ${fmt(r.vol20)}%；样本最大回撤 ${fmt(r.maxDrawdown)}%；当前回撤 ${fmt(r.currentDrawdown)}%`);

  if (bt?.available) {
    lines.push(`回测区间 ${bt.startDate} 至 ${bt.endDate}（${bt.days} 个交易日，单边成本 ${bt.rules.costPerSwitchPercent}%）：`);
    for (const key of Object.keys(bt.strategies)) {
      lines.push(`  - ${fmtStrategy(bt.strategies[key])}`);
    }
  }
  if (p?.available) {
    lines.push(`国内溢价：当前 ${signed(p.current, 3)}%，近60日均值 ${signed(p.mean60, 3)}%，Z=${p.z}，历史分位 ${p.percentile}%`);
  }
  return lines.join('\n');
}

function buildPrompt(snapshot, quant) {
  const intl = snapshot.international;
  const dom = snapshot.domestic;
  const ratio = intl?.price && intl?.silverPrice ? (intl.price / intl.silverPrice).toFixed(2) : '--';
  return `请基于以下经过严格程序计算的黄金多源数据撰写一份专业量化分析报告。
要求：
1. 严格基于数据展开，杜绝空泛套话；若趋势、动量与溢价分量出现背离或矛盾，必须重点指出；
2. 结合枢轴点与 ATR 提供清晰的多空情景预案（如放量突破第一阻力位的跟进空间，或跌破关键支撑位的防守止损点）；
3. 结合金银比与内外盘溢价给出跨市协同与宏观情绪评估；
4. 结尾必须包含明确的风险警示与投资免责声明。

【实时市场快照】
- 国内现货 AU9999：${fmt(dom.price)} 元/克${dom.estimated ? '（注：东方财富接口故障，由汇率估算）' : ''}，涨跌幅 ${signedPercent(dom.changePercent)}
- 国际现货 XAU/USD：${fmt(intl?.price)} 美元/盎司，涨跌幅 ${signedPercent(intl?.changePercent)}
- 现货白银 XAG/USD：${fmt(intl?.silverPrice)} 美元/盎司；实时金银比：${ratio}
- 美元兑人民币汇率：${fmt(snapshot.fx?.usdCny, 4)}；国内相对国际折算溢价：${signedPercent(snapshot.premiumPercent)}

【量化指标与回测矩阵】
${quantBlock(quant)}

请按以下专业结构输出格式清晰规范的 Markdown 报告：
## 黄金量化研判报告
### 1. 多因子信号与市场状态研判
（解读综合评分、EMA/MA60趋势形态、KDJ/MACD动量状态，指出主要共振点或潜在背离）
### 2. 关键点位与多空博弈场景
（基于经典枢轴点 R1/R2/R3、S1/S2/S3 以及 ATR 动态通道，推演多头向上突破与空头破位的触发条件）
### 3. 宏观对冲与跨市溢价分析
（结合当前金银比、内外盘溢价 Z 分数，评估估值高低与跨市套利/均值回归概率）
### 4. 量化策略回测绩效启示
（分析趋势跟踪与多因子评分策略的夏普比率、索提诺比率、卡玛比率与最大回撤表现，提示交易成本磨损）
### 5. 风险控制与免责声明
（标明关键风控阈值与免责说明）`;
}

function ruleBased(snapshot, quant) {
  const dom = snapshot.domestic;
  const intl = snapshot.international;
  const ratio = intl?.price && intl?.silverPrice ? (intl.price / intl.silverPrice).toFixed(2) : '--';
  const lines = [
    '## 黄金量化研判报告（规则引擎摘要）',
    '',
    '### 1. 行情与基准数据',
    `- 国内 AU9999：${fmt(dom.price)} 元/克${dom.estimated ? '（估算价）' : ''}，涨跌幅 ${signedPercent(dom.changePercent)}`,
    `- 国际 XAU/USD：${fmt(intl?.price)} 美元/盎司，涨跌幅 ${signedPercent(intl?.changePercent)}`,
    `- 白银 XAG/USD：${fmt(intl?.silverPrice)} 美元/盎司；实时金银比：${ratio}`,
    `- 国内溢价率：${signedPercent(snapshot.premiumPercent)}；USD/CNY 汇率：${fmt(snapshot.fx?.usdCny, 4)}`,
    '',
  ];

  if (quant?.available) {
    const s = quant.signal;
    const l = quant.levels;
    lines.push(
      '### 2. 核心量化信号',
      `- 量化信号：**${s.label}**（评分 ${signed(s.score, 1)}，置信度 ${s.confidence}%）`,
      `- 趋势格局：${s.trend}；波动状态：${s.volRegime}`,
      '主要因子归因：',
      ...s.reasons.map((reason) => `- ${reason}`),
      '',
      '### 3. 支撑阻力与参考区间',
      `- 支撑区间：${l.support.join(' / ')} 元/克`,
      `- 阻力区间：${l.resistance.join(' / ')} 元/克`,
      `- ATR(14) 波动率：${fmt(l.atr)} 元（占收盘价 ${fmt(l.atrPercent)}%）`,
      `- 当日参考波动区间：${fmt(l.refLow)} - ${fmt(l.refHigh)} 元/克`,
      `- 多头止损参考：${fmt(l.stopLongRef)} 元/克`
    );

    if (l.pivots?.classic) {
      const cp = l.pivots.classic;
      lines.push(
        `- 经典枢轴位：P ${fmt(cp.pivot)} | R1 ${fmt(cp.r1)} / R2 ${fmt(cp.r2)} | S1 ${fmt(cp.s1)} / S2 ${fmt(cp.s2)}`
      );
    }
    lines.push('');

    if (quant.backtest?.available) {
      const st = quant.backtest.strategies;
      lines.push(
        '### 4. 策略回测对比',
        `- 样本区间：${quant.backtest.startDate} 至 ${quant.backtest.endDate}（${quant.backtest.days} 个交易日）`,
        `- EMA 趋势策略：总收益 ${signedPercent(st.trend?.totalReturn)}，最大回撤 ${fmt(st.trend?.maxDrawdown)}%，夏普 ${fmt(st.trend?.sharpe)}`,
        `- 综合评分策略：总收益 ${signedPercent(st.score?.totalReturn)}，最大回撤 ${fmt(st.score?.maxDrawdown)}%，夏普 ${fmt(st.score?.sharpe)}`,
        `- 买入持有基准：总收益 ${signedPercent(st.buyHold?.totalReturn)}，最大回撤 ${fmt(st.buyHold?.maxDrawdown)}%`,
        ''
      );
    }
  } else {
    lines.push('量化数据样本不足，暂未输出量化评分。', '');
  }

  if (dom.estimated) lines.push('> **提示**：国内实时交易所行情源暂不可用，国内价格为理论换算估算值，请注意核实。', '');
  lines.push('**风险提示**：大宗商品与贵金属市场波动较大，以上分析由量化规则引擎程序计算生成，仅供参考，不构成任何投资建议。');
  return lines.join('\n');
}

async function fetchChatCompletion(url, apiKey, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('返回内容为空');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

// ModelScope 调用
async function callModelScope(apiKey, candidate, prompt) {
  return fetchChatCompletion(SOURCE_URLS.modelscope, apiKey, {
    model: candidate.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    ...candidate.options,
  });
}

// DeepSeek 官方 API
async function callDeepSeek(apiKey, prompt) {
  return fetchChatCompletion('https://api.deepseek.com/v1/chat/completions', apiKey, {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 2200,
  });
}

// OpenRouter 免费/聚合模型
async function callOpenRouter(apiKey, prompt) {
  const models = ['deepseek/deepseek-r1:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen-2.5-72b-instruct:free'];
  for (const m of models) {
    try {
      return await fetchChatCompletion('https://openrouter.ai/api/v1/chat/completions', apiKey, {
        model: m,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 2000,
      });
    } catch {
      continue;
    }
  }
  throw new Error('OpenRouter 模型无响应');
}

// 硅基流动 SiliconFlow API
async function callSiliconFlow(apiKey, prompt) {
  return fetchChatCompletion('https://api.siliconflow.cn/v1/chat/completions', apiKey, {
    model: 'deepseek-ai/DeepSeek-V3',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 2000,
  });
}

// Cloudflare Workers AI 内置免费大模型调用
async function callWorkersAi(aiBinding, prompt) {
  if (!aiBinding || typeof aiBinding.run !== 'function') throw new Error('Workers AI 未绑定');
  const candidates = [
    '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    '@cf/qwen/qwen2.5-72b-instruct',
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  ];
  for (const model of candidates) {
    try {
      const response = await aiBinding.run(model, {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
      });
      const text = response?.response || response?.choices?.[0]?.message?.content;
      if (text) return { content: text, modelName: `Workers AI (${model.split('/').pop()})` };
    } catch (e) {
      console.warn(`Workers AI 模型 ${model} 失败:`, e.message);
    }
  }
  throw new Error('Workers AI 尝试均失败');
}

export async function generateAnalysis(env, snapshot, quant) {
  const prompt = buildPrompt(snapshot, quant);

  // 1. 优先尝试 ModelScope（若配置 Key）
  if (env?.MODELSCOPE_API_KEY) {
    for (const candidate of MODELS) {
      try {
        const content = await callModelScope(env.MODELSCOPE_API_KEY, candidate, prompt);
        return { success: true, analysis: content, model: candidate.name, timestamp: new Date().toISOString() };
      } catch (error) {
        console.error('ModelScope 模型失败:', error.message);
      }
    }
  }

  // 2. 尝试 DeepSeek 官方 API
  if (env?.DEEPSEEK_API_KEY) {
    try {
      const content = await callDeepSeek(env.DEEPSEEK_API_KEY, prompt);
      return { success: true, analysis: content, model: 'DeepSeek-V3 (Official)', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('DeepSeek 官方 API 失败:', error.message);
    }
  }

  // 3. 尝试 硅基流动 SiliconFlow
  if (env?.SILICONFLOW_API_KEY) {
    try {
      const content = await callSiliconFlow(env.SILICONFLOW_API_KEY, prompt);
      return { success: true, analysis: content, model: 'SiliconFlow DeepSeek-V3', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('SiliconFlow 失败:', error.message);
    }
  }

  // 4. 尝试 OpenRouter 免费模型
  if (env?.OPENROUTER_API_KEY) {
    try {
      const content = await callOpenRouter(env.OPENROUTER_API_KEY, prompt);
      return { success: true, analysis: content, model: 'OpenRouter Free AI', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('OpenRouter 失败:', error.message);
    }
  }

  // 5. 尝试 Cloudflare Workers AI 内置免费大模型
  if (env?.AI) {
    try {
      const result = await callWorkersAi(env.AI, prompt);
      return { success: true, analysis: result.content, model: result.modelName, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('Cloudflare Workers AI 失败:', error.message);
    }
  }

  // 6. 无缝降级：专业规则引擎摘要
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
