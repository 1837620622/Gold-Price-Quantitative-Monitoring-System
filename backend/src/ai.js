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

const SYSTEM_PROMPT = `你是一位拥有20年华尔街顶级宏观对冲基金与量化交易经验的贵金属首席策略师兼量化投研总监。
你的任务是根据经过严格程序计算的多源真实行情与量化因子数据，输出一份逻辑严密、数据确凿、具备实操指导价值的《黄金资产量化研判与实战策略报告》。

【核心输出原则】
1. 严禁泄漏思考过程：严禁输出任何思维链草稿或自言自语（严禁输出"好，我现在需要帮助用户"等思考语言），直接输出正式研报 Markdown 正文。
2. 报告必须 100% 完整收尾：绝不允许在中途截断，必须一气呵成完整输出包含【1. 宏观环境与跨市协同】、【2. 多周期技术形态与量化因子】、【3. 日内与波段关键博弈点位】、【4. 历史回测绩效与实盘仓位指引】、【5. 极端行情预案与免责声明】的全部内容。
3. 严禁空洞套话：所有多空研判必须紧扣给定的具体数值（如评分分量、均线排列、RSI/KDJ读数、布林带%B、枢轴点、ATR、金银比、溢价率Z分数等），严禁无数据依据的臆测。
4. 实操可落地性：明确给出操作定调（偏多/偏空/震荡观望）、建议仓位区间、关键入场防御点位及止损止盈纪律。
5. 语言风格：专业、严谨、客观、精炼，符合机构级金融研报与专业交易终端排版标准。`;

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
  const usdCny = snapshot.fx?.usdCny ? fmt(snapshot.fx.usdCny, 4) : '--';
  const premium = snapshot.premiumPercent != null ? signedPercent(snapshot.premiumPercent) : '--';

  return `请根据以下权威程序计算的黄金多源量化数据，生成一份结构完整、详实严谨的专业量化研判报告。

═══════════════════════════════════════════════════════
【一、 市场实时基准与跨市对冲数据】
═══════════════════════════════════════════════════════
- 国内现货 (AU9999)：${fmt(dom?.price)} 元/克${dom?.estimated ? '（注：国内交易所接口临时受限，此价格由国际现货经离岸汇率理论折算）' : ''}，日内涨跌幅 ${signedPercent(dom?.changePercent)}
  · 开盘: ${fmt(dom?.open)} | 最高: ${fmt(dom?.high)} | 最低: ${fmt(dom?.low)} | 昨收: ${fmt(dom?.previousClose)} | 成交量: ${dom?.volume ? dom.volume + ' 手' : '--'}
- 国际现货 (XAU/USD)：${fmt(intl?.price)} 美元/盎司，日内涨跌幅 ${signedPercent(intl?.changePercent)}，昨收: ${fmt(intl?.previousClose)} 美元
- 国际白银现货 (XAG/USD)：${fmt(intl?.silverPrice)} 美元/盎司
- 核心衍生比率与溢价：
  · 实时金银比 (Gold/Silver Ratio)：${ratio}
  · 美元兑人民币 (USD/CNY)：${usdCny}
  · 国内相对国际折算实际溢价率：${premium}

═══════════════════════════════════════════════════════
【二、 核心量化指标系统与多因子评分矩阵】
═══════════════════════════════════════════════════════
${quantBlock(quant)}

═══════════════════════════════════════════════════════
【撰写输出规范】
请严格按照以下专业标准 Markdown 框架输出详细完整的研报，语言精炼紧凑，各章节充实落地：

## 黄金量化研判：宏观脉络与多因子实战策略

### 1. 宏观环境与跨市协同研判
- 【金银比与估值锚】：结合当前金银比 ${ratio}（历史均衡区间 65-75），深入剖析当前是黄金避险属性溢价主导，还是白银具备均值回归补涨弹性，推演金银共振或套利机会。
- 【内外盘溢价与汇率机制】：结合当前国内溢价率 ${premium} 及历史 Z 分数，分析内外盘价差所反映的国内实际需求偏好与汇率隐形折价，提示跨市场套利可行性。

### 2. 多周期技术形态与量化因子共振
- 【多因子评分定调】：解读综合评分得分及主要得分分量归因，剖析趋势、动能、波动与溢价因子的协同度。
- 【均线与通道系统】：结合短中长期均线（MA5/MA20/MA60）排列格局与 EMA 趋势，研判多头波段结构或破位风险；结合布林带通道宽度与 %B 指标研判突破可能性。
- 【动量与超买超卖】：交叉比对 RSI(14) 强弱读数与 KDJ(9,3,3) 曲线位置，指出是否存在高位顶背离钝化或低位底背离超卖信号。

### 3. 日内与波段关键博弈点位推演
- 【日内枢轴体系】：列出经典与斐波那契枢轴点位（Pivot / R1 / R2 / S1 / S2），推演日内多空分水岭。
- 【ATR 动态波幅防护】：基于当前 ATR(14) 真实波动幅度，计算日内防御缓冲空间（向上突破追单阈值与向下破位防守红线）。

### 4. 历史回测绩效启示与实盘仓位指引
- 【策略回测对比】：对比 EMA 趋势策略、综合多因子评分策略与买入持有基准在样本期内的夏普比率、卡玛比率与最大回撤，总结当前行情下趋势跟踪策略的适用度与换仓磨损。
- 【实盘操作策略】：
  · 方向定调：【偏多 / 偏空 / 震荡中性 / 防御观望】
  · 仓位配置参考：明确建议仓位比例（例如：30%-50% 逢低分批吸筹 / 建议空仓轻仓观望）
  · 入场价格区间参考
  · 动态止损与防守底线（严格引用量化止损参考价）
  · 分批止盈目标位（第一阻力位与第二阻力位）

### 5. 极端行情预案与投资免责声明
- 提示黑天鹅地缘事件或突发重大经济数据公布时的动态止损应对原则。
- 完整包含投资风险警示与免责声明。`;
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

// 彻底去除 <think> 思维链与草稿，确保严禁泄漏思考过程
export function cleanAiReport(text) {
  if (!text || typeof text !== 'string') return '';
  // 1. 彻底剔除闭合的 <think>...</think>
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // 2. 剔除未闭合的 <think> 前缀
  cleaned = cleaned.replace(/^<think>[\s\S]*?(?=\n\n|##)/s, '').trim();
  // 3. 剔除常见的自言自语思考草稿开头（如“好，我现在需要帮助用户生成...”）
  cleaned = cleaned.replace(/^(好的?|首先)?，?我现在(需要|要|来)帮.*?(\n\n|##)/s, '$1').trim();
  return cleaned.trim();
}

// Cloudflare Workers AI 内置大模型矩阵（支持指定模型优先 + 智能容灾降级）
async function callWorkersAi(aiBinding, prompt, requestedModel = 'auto') {
  if (!aiBinding || typeof aiBinding.run !== 'function') throw new Error('Workers AI 未绑定');

  const MODEL_MAP = {
    'deepseek-r1': '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    'qwen-72b': '@cf/qwen/qwen2.5-72b-instruct',
    'llama-70b': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    'qwen-14b': '@cf/qwen/qwen2.5-14b-instruct',
    'qwen-7b': '@cf/qwen/qwen2.5-7b-instruct',
  };

  const candidateModel = MODEL_MAP[requestedModel] || (requestedModel?.startsWith('@cf/') ? requestedModel : null);

  // 1. 若用户指定了模型，优先调用该模型（提供充分 token 确保 5 大章节完整无截断）
  if (candidateModel) {
    try {
      const response = await aiBinding.run(candidateModel, {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 3500,
        temperature: 0.6,
      });
      const text = response?.response || response?.choices?.[0]?.message?.content || response?.text;
      const cleaned = cleanAiReport(text);
      if (cleaned && cleaned.length > 20) {
        const shortName = candidateModel.split('/').pop();
        return { content: cleaned, modelName: `Workers AI · ${shortName}` };
      }
    } catch (e) {
      console.warn(`指定的 Workers AI 模型 ${candidateModel} 失败，启用兜底梯队:`, e.message);
    }
  }

  // 2. 兜底梯队（按质量与配额平滑降级，保证输出完整）
  const fallbackList = [
    { model: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', name: 'deepseek-r1-distill-qwen-32b (深度推理)', maxTokens: 3500 },
    { model: '@cf/qwen/qwen2.5-72b-instruct', name: 'qwen2.5-72b-instruct (全能旗舰)', maxTokens: 2600 },
    { model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', name: 'llama-3.3-70b (顶尖研报)', maxTokens: 2600 },
    { model: '@cf/qwen/qwen2.5-14b-instruct', name: 'qwen2.5-14b-instruct (均衡低耗)', maxTokens: 2200 },
    { model: '@cf/qwen/qwen2.5-7b-instruct', name: 'qwen2.5-7b-instruct (极速兜底)', maxTokens: 1800 },
  ];

  for (const item of fallbackList) {
    if (item.model === candidateModel) continue; // 避免重复尝试已失败的模型
    try {
      const response = await aiBinding.run(item.model, {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: item.maxTokens,
        temperature: 0.6,
      });
      const text = response?.response || response?.choices?.[0]?.message?.content || response?.text;
      const cleaned = cleanAiReport(text);
      if (cleaned && cleaned.length > 20) {
        return { content: cleaned, modelName: `Workers AI · ${item.name}` };
      }
    } catch (e) {
      console.warn(`Workers AI 兜底模型 ${item.model} 失败:`, e.message);
      if (/quota|rate|limit|exceeded|10000|429/i.test(e.message)) {
        continue;
      }
    }
  }
  throw new Error('Workers AI 所有模型均未能成功响应');
}

export async function generateAnalysis(env, snapshot, quant, requestedModel = 'auto') {
  const prompt = buildPrompt(snapshot, quant);

  // 1. 首选：Cloudflare Workers AI 原生内置大模型（免 Key、零外部延迟、分级省流）
  if (env?.AI) {
    try {
      const result = await callWorkersAi(env.AI, prompt, requestedModel);
      return { success: true, analysis: result.content, model: result.modelName, timestamp: new Date().toISOString() };
    } catch (error) {
      console.warn('Cloudflare Workers AI 尝试后转入备用模型:', error.message);
    }
  }

  // 2. 备选：ModelScope（若配置 Key）
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

  // 3. 备选：DeepSeek 官方 API
  if (env?.DEEPSEEK_API_KEY) {
    try {
      const content = await callDeepSeek(env.DEEPSEEK_API_KEY, prompt);
      return { success: true, analysis: content, model: 'DeepSeek-V3 (Official)', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('DeepSeek 官方 API 失败:', error.message);
    }
  }

  // 4. 备选：硅基流动 SiliconFlow
  if (env?.SILICONFLOW_API_KEY) {
    try {
      const content = await callSiliconFlow(env.SILICONFLOW_API_KEY, prompt);
      return { success: true, analysis: content, model: 'SiliconFlow DeepSeek-V3', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('SiliconFlow 失败:', error.message);
    }
  }

  // 5. 备选：OpenRouter 免费模型
  if (env?.OPENROUTER_API_KEY) {
    try {
      const content = await callOpenRouter(env.OPENROUTER_API_KEY, prompt);
      return { success: true, analysis: content, model: 'OpenRouter Free AI', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('OpenRouter 失败:', error.message);
    }
  }

  // 6. 无缝降级：专业规则引擎摘要（零用量消耗、100% 高可用）
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
// 分析入口：支持指定模型与按模型缓存，并发请求合并
// ------------------------------------------------------------
let inflight = null;

async function buildAnalysis(env, { requestedModel = 'auto' } = {}) {
  const snapshot = await getSnapshot();
  if (!snapshot.domestic) {
    return { success: false, message: '行情暂不可用，请稍后重试', priceData: snapshot, timestamp: new Date().toISOString() };
  }
  const quant = await getQuant('cn').catch((error) => {
    console.error('量化计算失败:', error.message);
    return null;
  });
  const analysis = await generateAnalysis(env, snapshot, quant, requestedModel);
  const payload = {
    success: true,
    priceData: snapshot,
    quant: summarizeQuant(quant),
    analysis,
    timestamp: new Date().toISOString(),
  };
  if (analysis.model !== 'auto-analysis') {
    const cacheKey = `analysisCache:${requestedModel || 'auto'}`;
    await setState(env, cacheKey, { at: Date.now(), payload });
    await setState(env, 'analysisCache', { at: Date.now(), payload });
  }
  return payload;
}

export async function getAnalysis(env, { requestedModel = 'auto', force = false } = {}) {
  const cacheKey = `analysisCache:${requestedModel || 'auto'}`;
  const cached = await getState(env, cacheKey) || await getState(env, 'analysisCache');
  if (!force && cached && Date.now() - cached.at < TTL.analysis) {
    return { ...cached.payload, cached: true };
  }
  if (!inflight) {
    inflight = buildAnalysis(env, { requestedModel }).finally(() => {
      inflight = null;
    });
  }
  return { ...(await inflight), cached: false };
}
