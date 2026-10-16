/**
 * ============================================================
 * 黄金价格检测系统 - Cloudflare Workers 后端服务
 * ============================================================
 * 数据源（均为免费公共接口，无需 API Key）：
 * - 国际金价 XAU/USD：api.gold-api.com
 * - 美元兑人民币汇率：open.er-api.com（仅在国内金价获取失败时用于估算）
 * - 国内 AU9999 实时行情 / 日K线：东方财富 push2 / push2his
 *
 * 可选：
 * - AI 分析：ModelScope（配置 MODELSCOPE_API_KEY 后启用，否则使用规则摘要）
 * - 推送：PushPlus 微信推送
 *
 * 环境变量（用 wrangler secret 设置，切勿写入代码）：
 *   ADMIN_TOKEN          管理接口 Bearer Token；未配置则推送/监控接口全部禁用
 *   PUSHPLUS_TOKEN       PushPlus Token
 *   PUSHPLUS_TOPIC       PushPlus 群组编码（可选）
 *   MODELSCOPE_API_KEY   ModelScope API Key（可选）
 * 可选绑定：
 *   GOLD_KV              KV 命名空间，持久化推送/预警状态（未绑定时状态只存在内存）
 * ============================================================
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

const app = new Hono();

// ============================================================
// 常量配置
// ============================================================
const PUSHPLUS_API_URL = 'https://www.pushplus.plus/send';
const GOLD_API_URL = 'https://api.gold-api.com/price';
const FX_API_URL = 'https://open.er-api.com/v6/latest/USD';
const EASTMONEY_QUOTE_URL = 'https://push2.eastmoney.com/api/qt/stock/get';
const EASTMONEY_KLINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const MODELSCOPE_URL = 'https://api-inference.modelscope.cn/v1/chat/completions';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const FETCH_TIMEOUT_MS = 8000;
const AI_TIMEOUT_MS = 30000;
const OZ_TO_GRAM = 31.1035;
const MAX_KLINE_DAYS = 250;

// 合理性校验范围：超出即视为数据异常（如单位错误），拒绝使用
const SANE_INTL_RANGE = [100, 100000];   // 美元/盎司
const SANE_DOMESTIC_RANGE = [100, 5000]; // 元/克

// 预警参数
const ALERT_THRESHOLD_PERCENT = 1;       // 涨跌幅达到 1% 即预警（不设上限）
const ALERT_REPEAT_MOVE_PERCENT = 0.5;   // 同方向再次预警需价格相对上次预警价再变动 0.5%
// 定时推送间隔 30 分钟；Cron 实际触发有少量抖动，留 2 分钟容差避免漏推
const SCHEDULED_MIN_GAP_MS = 28 * 60 * 1000;
const ANALYSIS_CACHE_MS = 15 * 60 * 1000;

// ============================================================
// 工具函数：基础
// ============================================================
const round2 = (v) => Math.round(v * 100) / 100;
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const inRange = (v, [min, max]) => isFiniteNumber(v) && v >= min && v <= max;
const fmt = (v, digits = 2) => (isFiniteNumber(v) ? v.toFixed(digits) : '--');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 恒定时间比较，避免通过响应时间侧信道猜测 Token
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function clampDays(value, fallback = 30) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), MAX_KLINE_DAYS);
}

// 上海时区日期（YYYY-MM-DD），用于判断"同一天"
function shanghaiDate(ts) {
  return new Date(ts + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function fetchJson(url, { headers = {}, timeoutMs = FETCH_TIMEOUT_MS, ...init } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
    });
    if (!res.ok) throw new Error(`请求失败 HTTP ${res.status}: ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// 状态存储：优先使用 KV（持久化），未绑定时退回内存
// 注意：内存状态在 Worker 实例回收后会丢失，建议绑定 GOLD_KV
// ============================================================
const memoryState = {};

async function getState(env, key) {
  try {
    if (env?.GOLD_KV) return (await env.GOLD_KV.get(`state:${key}`, 'json')) ?? null;
  } catch (error) {
    console.error(`读取状态失败 [${key}]:`, error.message);
  }
  return memoryState[key] ?? null;
}

async function setState(env, key, value) {
  memoryState[key] = value;
  try {
    if (env?.GOLD_KV) await env.GOLD_KV.put(`state:${key}`, JSON.stringify(value));
  } catch (error) {
    console.error(`写入状态失败 [${key}]:`, error.message);
  }
}

// ============================================================
// 行情：国际金价（gold-api.com，免费无需 Key）
// ============================================================
async function fetchInternationalGoldPrice() {
  const data = await fetchJson(`${GOLD_API_URL}/XAU`);
  const price = Number(data?.price);
  if (!inRange(price, SANE_INTL_RANGE)) throw new Error(`国际金价数据异常: ${data?.price}`);

  // 白银为辅助信息，失败不影响主数据
  let silverPrice = null;
  try {
    const silver = await fetchJson(`${GOLD_API_URL}/XAG`);
    const s = Number(silver?.price);
    if (isFiniteNumber(s) && s > 0) silverPrice = round2(s);
  } catch (error) {
    console.error('白银价格获取失败:', error.message);
  }

  return {
    success: true,
    source: 'gold-api.com',
    currency: 'USD',
    unit: '盎司',
    price: round2(price),
    // 该接口不提供涨跌幅与昨收，返回 null 而不是伪造数值
    change: null,
    changePercent: null,
    previousClose: null,
    silverPrice,
    timestamp: data.updatedAt || new Date().toISOString(),
  };
}

// ============================================================
// 行情：美元兑人民币（open.er-api.com，免费无需 Key）
// ============================================================
async function fetchUsdCnyRate() {
  const data = await fetchJson(FX_API_URL);
  const rate = Number(data?.rates?.CNY);
  if (!isFiniteNumber(rate) || rate <= 0) throw new Error('汇率数据异常');
  return rate;
}

// ============================================================
// 行情：国内 AU9999 实时行情（东方财富，免费无需 Key）
// 东方财富价格字段为"放大100倍"的整数，需除以 100
// ============================================================
async function fetchEastmoneyAU9999() {
  const fields = 'f43,f44,f45,f46,f47,f48,f51,f52,f57,f58,f60,f169,f170';
  const result = await fetchJson(`${EASTMONEY_QUOTE_URL}?secid=118.AU9999&fields=${fields}`, {
    headers: { Referer: 'https://quote.eastmoney.com/' },
  });
  const d = result?.data;
  if (result?.rc !== 0 || !d) throw new Error('东方财富返回数据异常');

  const scaled = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? round2(n / 100) : null;
  };

  const price = scaled(d.f43);
  if (!inRange(price, SANE_DOMESTIC_RANGE)) throw new Error(`AU9999 最新价异常: ${d.f43}`);

  return {
    success: true,
    source: 'eastmoney',
    estimated: false,
    code: d.f57,
    name: d.f58,
    currency: 'CNY',
    unit: '克',
    price,
    open: scaled(d.f46),
    high: scaled(d.f44),
    low: scaled(d.f45),
    previousClose: scaled(d.f60),
    change: scaled(d.f169),
    changePercent: scaled(d.f170), // 涨跌幅（%）
    volume: Number(d.f47) || null, // 成交量（手）
    amount: Number(d.f48) || null, // 成交额（元）
    limitUp: scaled(d.f51),
    limitDown: scaled(d.f52),
    timestamp: new Date().toISOString(),
  };
}

// 国内行情不可用时：由国际金价 × 汇率 ÷ 31.1035 估算。
// 估算价不含国内溢价，且没有真实涨跌幅，因此标记 estimated，预警逻辑会忽略它。
function estimateDomesticPrice(intl, usdCny) {
  const price = round2((intl.price * usdCny) / OZ_TO_GRAM);
  return {
    success: true,
    source: 'estimated',
    estimated: true,
    code: 'AU9999',
    name: '黄金9999（估算）',
    currency: 'CNY',
    unit: '克',
    price,
    open: null,
    high: null,
    low: null,
    previousClose: null,
    change: null,
    changePercent: null,
    volume: null,
    amount: null,
    exchangeRate: usdCny,
    basePrice: intl.price,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// 行情快照：国际 + 国内并行获取，失败的一方返回 null，不伪造数据
// ============================================================
async function getMarketSnapshot() {
  const errors = [];
  const [intlResult, domResult] = await Promise.allSettled([
    fetchInternationalGoldPrice(),
    fetchEastmoneyAU9999(),
  ]);

  const international = intlResult.status === 'fulfilled' ? intlResult.value : null;
  if (!international) {
    errors.push(`国际金价: ${intlResult.reason?.message}`);
    console.error('国际金价获取失败:', intlResult.reason?.message);
  }

  let domestic = domResult.status === 'fulfilled' ? domResult.value : null;
  if (!domestic) {
    errors.push(`国内金价: ${domResult.reason?.message}`);
    console.error('国内金价获取失败:', domResult.reason?.message);
    if (international) {
      try {
        const rate = await fetchUsdCnyRate();
        domestic = estimateDomesticPrice(international, rate);
      } catch (error) {
        errors.push(`汇率: ${error.message}`);
        console.error('汇率获取失败:', error.message);
      }
    }
  }

  return { international, domestic, errors, timestamp: new Date().toISOString() };
}

// ============================================================
// 行情：国内 AU9999 日K线（东方财富，真实历史数据）
// 返回字段顺序：日期,开盘,收盘,最高,最低,成交量
// ============================================================
async function fetchDailyKline(days = 30) {
  const limit = clampDays(days);
  const result = await fetchJson(
    `${EASTMONEY_KLINE_URL}?secid=118.AU9999&fields1=f1,f2,f3,f4,f5,f6` +
      `&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=0&end=20500101&lmt=${limit}`,
    { headers: { Referer: 'https://quote.eastmoney.com/' } }
  );
  const lines = result?.data?.klines;
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('K线数据为空');

  return lines
    .map((line) => {
      const [date, open, close, high, low, volume] = String(line).split(',');
      return {
        timestamp: Date.parse(`${date}T00:00:00+08:00`),
        date,
        open: Number(open),
        close: Number(close),
        high: Number(high),
        low: Number(low),
        volume: Number(volume) || 0,
      };
    })
    .filter((k) => [k.open, k.close, k.high, k.low].every(isFiniteNumber));
}

// ============================================================
// 工具函数：DeepSeek（ModelScope）量化分析
// ============================================================
function buildRuleBasedAnalysis(snapshot, weekChange) {
  const intl = snapshot.international;
  const dom = snapshot.domestic;
  const pct = dom.changePercent ?? 0;
  const trend = pct >= 0 ? '上涨' : '下跌';
  const suggestion = Math.abs(pct) > 1 ? '波动较大，建议观望' : '波动平稳，可适量配置';

  return `【自动分析报告】

当前市场状态：${trend}
国际金价：${intl ? `${fmt(intl.price)} 美元/盎司` : '暂无数据'}
国内AU9999：${fmt(dom.price)} 元/克${dom.estimated ? '（估算价）' : ''}

技术面分析：
- 今日涨跌幅：${dom.changePercent == null ? 'N/A' : `${fmt(dom.changePercent)}%`}
- 近7日涨跌幅：${weekChange == null ? 'N/A' : `${fmt(weekChange)}%`}
- 今日区间：${dom.low == null || dom.high == null ? 'N/A' : `${fmt(dom.low)} - ${fmt(dom.high)} 元`}

投资建议：${suggestion}
风险提示：黄金投资有风险，以上分析仅供参考，不构成投资建议。`;
}

async function callModelScope(apiKey, model, messages, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(MODELSCOPE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, ...options }),
    });
    if (!res.ok) throw new Error(`${model} HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${model} 返回内容为空`);
    return content;
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeWithDeepSeek(env, snapshot, klineData) {
  const dom = snapshot.domestic;
  const intl = snapshot.international;
  const apiKey = env.MODELSCOPE_API_KEY;

  const recent = klineData.slice(-7);
  const weekChange = recent.length >= 2
    ? round2(((recent[recent.length - 1].close - recent[0].open) / recent[0].open) * 100)
    : null;

  if (!apiKey) {
    return {
      success: true,
      analysis: buildRuleBasedAnalysis(snapshot, weekChange),
      model: 'auto-analysis',
      timestamp: new Date().toISOString(),
    };
  }

  const estimateNote = dom.estimated
    ? '\n注意：国内价为根据国际金价与汇率估算，并非交易所实时价，请据此谨慎判断。'
    : '';

  const prompt = `作为专业的黄金量化分析师，请根据以下【实时数据】提供专业的量化分析报告。

【实时行情数据】（数据时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}）

▶ 国际金价 XAU/USD
  • 最新价格：${intl ? fmt(intl.price) : 'N/A'} 美元/盎司
  • 数据来源：${intl?.source || 'N/A'}

▶ 国内AU9999
  • 最新价格：${fmt(dom.price)} 元/克${dom.estimated ? '（估算）' : ''}
  • 今日开盘：${fmt(dom.open)} 元/克
  • 最高价：${fmt(dom.high)} 元/克
  • 最低价：${fmt(dom.low)} 元/克
  • 昨收价：${fmt(dom.previousClose)} 元/克
  • 涨跌额：${fmt(dom.change)} 元
  • 涨跌幅：${fmt(dom.changePercent)}%
  • 数据来源：${dom.source}
${estimateNote}

▶ 近7日走势（真实日K线）
  • 7日累计涨跌幅：${weekChange == null ? 'N/A' : `${fmt(weekChange)}%`}

═══════════════════════════════════════
请按以下格式输出专业分析报告，仅基于上述数据，不要编造未提供的数据：

## 黄金量化分析报告

### 1. 短期趋势判断
（明确给出：看涨/看跌/震荡，并说明判断依据）

### 2. 关键支撑位与压力位
- 国内金价压力位：
- 国内金价支撑位：

### 3. 技术指标信号
（基于日内振幅与近7日走势分析动量与波动）

### 4. 短线操作建议（1-5个交易日）

### 5. 中长期投资建议（1-3个月）

### 6. 风险提示
`;

  const system = '你是一位专业的黄金市场量化分析师，擅长技术分析和投资建议。请用中文回复。';
  const candidates = [
    { model: 'deepseek-ai/DeepSeek-V3.2', name: 'DeepSeek-V3.2', options: { temperature: 1.0, top_p: 0.95, max_tokens: 2000 } },
    { model: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', options: { temperature: 0.7, max_tokens: 1500 } },
  ];

  for (const candidate of candidates) {
    try {
      const content = await callModelScope(
        apiKey,
        candidate.model,
        [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        candidate.options
      );
      return { success: true, analysis: content, model: candidate.name, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('AI 模型调用失败:', error.message);
    }
  }

  return {
    success: true,
    analysis: buildRuleBasedAnalysis(snapshot, weekChange),
    model: 'auto-analysis',
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// 工具函数：推送 HTML 模板
// ============================================================

// AI 输出是不可信内容：先截断原文，再转义，最后做有限的排版替换
function toPushSummary(analysisText) {
  const raw = String(analysisText || '');
  const truncated = raw.length > 600;
  const text = escapeHtml(raw.slice(0, 600))
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/═+/g, '')
    .replace(/▶/g, '')
    .replace(/•/g, '-')
    .replace(/-{3,}/g, '<br><br>')
    .replace(/\r?\n\s*\r?\n/g, '<br><br>')
    .replace(/\r?\n/g, '<br>')
    .replace(/(\d+\.\s)/g, '<br><br>$1');
  return truncated ? `${text}...` : text;
}

function generatePushHtml(snapshot, analysisText, pushType = 'scheduled') {
  const intl = snapshot.international || {};
  const dom = snapshot.domestic;
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  const domChangePercent = dom.changePercent ?? 0;
  const intlChangePercent = intl.changePercent ?? 0;
  const domTrend = domChangePercent >= 0 ? 'up' : 'down';
  const intlTrend = intlChangePercent >= 0 ? 'up' : 'down';

  const pushTypeTitle = pushType === 'alert'
    ? `金价波动 涨跌${Math.abs(domChangePercent).toFixed(2)}%`
    : `实时金价 AU9999 ${fmt(dom.price)}元`;
  const pushTypeDesc = pushType === 'alert'
    ? `触发预警：国内金价涨跌幅达 ${Math.abs(domChangePercent).toFixed(2)}%`
    : '每30分钟自动推送 - 实时行情';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: linear-gradient(180deg, #0f0f23 0%, #1a1a2e 50%, #0d1117 100%); color: #fff; padding: 16px; font-size: 16px; line-height: 1.6; }
    .container { max-width: 420px; margin: 0 auto; background: rgba(255,255,255,0.03); border-radius: 16px; padding: 20px; border: 1px solid rgba(251,191,36,0.2); }
    .header { text-align: center; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 2px solid rgba(251,191,36,0.5); }
    .header h1 { font-size: 22px; color: #fbbf24; margin-bottom: 6px; font-weight: 700; text-shadow: 0 0 20px rgba(251,191,36,0.3); }
    .header .type-badge { display: inline-block; background: ${pushType === 'alert' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #3b82f6, #2563eb)'}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; margin-bottom: 8px; }
    .header .time { color: #a1a1aa; font-size: 13px; }
    .price-section { margin-bottom: 16px; }
    .price-card { background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%); border-radius: 14px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.1); }
    .price-card.intl { border-left: 5px solid #60a5fa; }
    .price-card.dom { border-left: 5px solid #fbbf24; }
    .price-label { font-size: 14px; color: #d1d5db; margin-bottom: 8px; font-weight: 500; }
    .price-value { font-size: 36px; font-weight: 800; margin-bottom: 4px; letter-spacing: -1px; }
    .price-value.up { color: #4ade80; text-shadow: 0 0 15px rgba(74,222,128,0.3); }
    .price-value.down { color: #f87171; text-shadow: 0 0 15px rgba(248,113,113,0.3); }
    .price-change { font-size: 16px; font-weight: 600; margin-bottom: 10px; }
    .price-change.up { color: #4ade80; }
    .price-change.down { color: #f87171; }
    .detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); }
    .detail-item { text-align: center; }
    .detail-item .label { font-size: 11px; color: #71717a; display: block; }
    .detail-item .value { font-size: 14px; color: #e4e4e7; font-weight: 600; }
    .analysis-section { background: linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.05) 100%); border-radius: 14px; padding: 16px; margin-bottom: 16px; border: 1px solid rgba(251,191,36,0.25); }
    .analysis-title { font-size: 15px; color: #fbbf24; margin-bottom: 12px; font-weight: 600; }
    .analysis-content { font-size: 14px; line-height: 1.8; color: #e4e4e7; }
    .footer { text-align: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
    .footer .brand { color: #fbbf24; font-weight: 700; font-size: 15px; margin-bottom: 6px; }
    .footer .contact { color: #a1a1aa; font-size: 12px; line-height: 1.8; }
    .footer .watermark { color: #52525b; font-size: 11px; margin-top: 8px; padding: 6px 12px; background: rgba(0,0,0,0.3); border-radius: 6px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="type-badge">${pushTypeDesc}</div>
      <h1>${escapeHtml(pushTypeTitle)}</h1>
      <div class="time">更新时间：${now}</div>
    </div>

    <div class="price-section">
      <div class="price-card dom">
        <div class="price-label">[国内] AU9999 ${dom.estimated ? '（估算价）' : '上海黄金交易所'}</div>
        <div class="price-value ${domTrend}">¥${fmt(dom.price)}</div>
        <div class="price-change ${domTrend}">${domChangePercent >= 0 ? '▲ +' : '▼ '}${domChangePercent.toFixed(2)}%（${domChangePercent >= 0 ? '+' : ''}${fmt(dom.change ?? 0)}元）</div>
        <div class="detail-grid">
          <div class="detail-item"><span class="label">开盘</span><span class="value">¥${fmt(dom.open)}</span></div>
          <div class="detail-item"><span class="label">最高</span><span class="value" style="color:#4ade80">¥${fmt(dom.high)}</span></div>
          <div class="detail-item"><span class="label">最低</span><span class="value" style="color:#f87171">¥${fmt(dom.low)}</span></div>
        </div>
      </div>

      <div class="price-card intl">
        <div class="price-label">[国际] XAU/USD 现货</div>
        <div class="price-value ${intlTrend}">$${fmt(intl.price)}</div>
        <div class="price-change ${intlTrend}">${intlChangePercent >= 0 ? '▲ +' : '▼ '}${intlChangePercent.toFixed(2)}%</div>
        <div class="detail-grid">
          <div class="detail-item"><span class="label">昨收</span><span class="value">$${fmt(intl.previousClose)}</span></div>
          <div class="detail-item"><span class="label">白银</span><span class="value">$${fmt(intl.silverPrice)}</span></div>
          <div class="detail-item"><span class="label">来源</span><span class="value">${escapeHtml(intl.source || '--')}</span></div>
        </div>
      </div>
    </div>

    <div class="analysis-section">
      <div class="analysis-title">AI 智能分析摘要</div>
      <div class="analysis-content">${toPushSummary(analysisText)}</div>
    </div>

    <div class="footer">
      <div class="brand">Gold Monitor - 黄金价格智能监控</div>
      <div class="contact">Vx: 1837620622 | 邮箱: 2040168455@qq.com</div>
      <div class="watermark">开发者：传康KK | 咸鱼/B站：万能程序员</div>
    </div>
  </div>
</body>
</html>`;
}

function generateQuickPriceHtml(snapshot, pushType = 'scheduled') {
  const intl = snapshot.international || {};
  const dom = snapshot.domestic;
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const domChangePercent = dom.changePercent ?? 0;
  const intlChangePercent = intl.changePercent ?? 0;
  const domTrend = domChangePercent >= 0 ? 'up' : 'down';
  const intlTrend = intlChangePercent >= 0 ? 'up' : 'down';
  const changeDir = domChangePercent >= 0 ? '上涨' : '下跌';
  const pushTypeTitle = pushType === 'alert'
    ? `黄金价格${changeDir} ${Math.abs(domChangePercent).toFixed(2)}%`
    : '黄金实时行情';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #0d1117; color: #fff; padding: 0; }
    .container { max-width: 100%; background: linear-gradient(180deg, #161b22 0%, #0d1117 100%); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px; text-align: center; border-bottom: 3px solid #fbbf24; }
    .header h1 { font-size: 24px; color: #fbbf24; font-weight: 800; margin-bottom: 8px; letter-spacing: 1px; }
    .header .subtitle { font-size: 13px; color: #8b949e; }
    .price-section { padding: 20px; }
    .price-card { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-bottom: 15px; border-left: 5px solid #fbbf24; }
    .price-card.intl { border-left-color: #58a6ff; }
    .price-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .price-label { font-size: 15px; color: #c9d1d9; font-weight: 600; }
    .price-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; background: rgba(251,191,36,0.2); color: #fbbf24; }
    .price-badge.intl { background: rgba(88,166,255,0.2); color: #58a6ff; }
    .price-main { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; }
    .price-value { font-size: 42px; font-weight: 900; letter-spacing: -2px; }
    .price-value.up { color: #3fb950; }
    .price-value.down { color: #f85149; }
    .price-unit { font-size: 16px; color: #8b949e; }
    .price-change { font-size: 18px; font-weight: 700; }
    .price-change.up { color: #3fb950; }
    .price-change.down { color: #f85149; }
    .footer { text-align: center; padding: 15px 20px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.1); }
    .footer-brand { color: #fbbf24; font-weight: 700; font-size: 14px; margin-bottom: 4px; }
    .footer-dev { color: #484f58; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(pushTypeTitle)}</h1>
      <div class="subtitle">${now} | Gold Monitor</div>
    </div>
    <div class="price-section">
      <div class="price-card">
        <div class="price-header">
          <span class="price-label">国内AU9999</span>
          <span class="price-badge">${dom.estimated ? '估算价' : '上海黄金'}</span>
        </div>
        <div class="price-main">
          <span class="price-value ${domTrend}">${fmt(dom.price)}</span>
          <span class="price-unit">元/克</span>
        </div>
        <div class="price-change ${domTrend}">${domChangePercent >= 0 ? '+' : ''}${domChangePercent.toFixed(2)}% ${changeDir}</div>
      </div>
      <div class="price-card intl">
        <div class="price-header">
          <span class="price-label">国际XAU/USD</span>
          <span class="price-badge intl">现货</span>
        </div>
        <div class="price-main">
          <span class="price-value ${intlTrend}">${fmt(intl.price)}</span>
          <span class="price-unit">美元/盎司</span>
        </div>
        <div class="price-change ${intlTrend}">${intlChangePercent >= 0 ? '+' : ''}${intlChangePercent.toFixed(2)}%</div>
      </div>
    </div>
    <div class="footer">
      <div class="footer-brand">Gold Monitor - 黄金价格监控</div>
      <div class="footer-dev">开发者：传康KK</div>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================
// PushPlus 推送（群组推送）
// ============================================================
async function sendPushPlusNotification(env, title, content, template = 'html') {
  const token = env.PUSHPLUS_TOKEN;
  if (!token) {
    console.error('PushPlus Token 未配置');
    return { success: false, msg: 'PUSHPLUS_TOKEN 未配置' };
  }

  const requestBody = { token, title, content, template, channel: 'wechat' };
  if (env.PUSHPLUS_TOPIC) requestBody.topic = env.PUSHPLUS_TOPIC;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(PUSHPLUS_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }).finally(() => clearTimeout(timer));

    const result = await response.json();
    if (result.code === 200) {
      console.log('PushPlus 推送成功:', result.msg);
      return { success: true, msg: result.msg, data: result.data };
    }
    console.error('PushPlus 推送失败:', result.msg);
    return { success: false, msg: result.msg };
  } catch (error) {
    console.error('PushPlus 推送异常:', error.message);
    return { success: false, msg: '推送请求异常' };
  }
}

// ============================================================
// 监控判定
// ============================================================

// 预警：仅对真实行情（非估算）判断。阈值 ≥1%，无上限；
// 同一天、同方向的重复预警需价格相对上次预警价再移动 0.5%。
function evaluateAlert(domestic, lastAlert) {
  if (!domestic || domestic.estimated || !isFiniteNumber(domestic.changePercent)) return false;
  const pct = domestic.changePercent;
  if (Math.abs(pct) < ALERT_THRESHOLD_PERCENT) return false;

  const direction = pct >= 0 ? 'up' : 'down';
  const today = shanghaiDate(Date.now());
  if (lastAlert && lastAlert.date === today && lastAlert.direction === direction) {
    const movePercent = Math.abs((domestic.price - lastAlert.price) / lastAlert.price) * 100;
    if (movePercent < ALERT_REPEAT_MOVE_PERCENT) return false;
  }
  return true;
}

async function isScheduledPushDue(env) {
  const last = await getState(env, 'lastScheduledPush');
  return !last || Date.now() - last >= SCHEDULED_MIN_GAP_MS;
}

async function recordPush(env, dom, pushType) {
  const now = Date.now();
  await setState(env, 'lastPush', { price: dom.price, time: now, type: pushType });
  if (pushType === 'scheduled') {
    await setState(env, 'lastScheduledPush', now);
  }
  if (pushType === 'alert') {
    await setState(env, 'lastAlert', {
      price: dom.price,
      direction: (dom.changePercent ?? 0) >= 0 ? 'up' : 'down',
      time: now,
      date: shanghaiDate(now),
    });
  }
}

// ============================================================
// 执行推送：先发价格，再异步发送 AI 分析
// waitUntil 可选：HTTP 请求和 Cron 都会传入，保证后台任务不被提前终止
// ============================================================
async function executePush(env, snapshot, pushType = 'scheduled', waitUntil = null) {
  const dom = snapshot.domestic;
  if (!dom) return { success: false, msg: '国内金价不可用，已跳过推送' };

  const changePercent = dom.changePercent ?? 0;
  const changeDir = changePercent >= 0 ? '上涨' : '下跌';
  const priceTitle = pushType === 'alert'
    ? `黄金${changeDir}${Math.abs(changePercent).toFixed(2)}% 触发预警`
    : `黄金实时行情 ${fmt(dom.price)}元/克`;

  const priceResult = await sendPushPlusNotification(env, priceTitle, generateQuickPriceHtml(snapshot, pushType), 'html');
  if (priceResult.success) {
    await recordPush(env, dom, pushType);
  }

  const aiTask = (async () => {
    try {
      const klineData = await fetchDailyKline(30).catch(() => []);
      const analysis = await analyzeWithDeepSeek(env, snapshot, klineData);
      const analysisHtml = generatePushHtml(snapshot, analysis.analysis, pushType);
      await sendPushPlusNotification(env, `AI智能分析 ${analysis.model}`, analysisHtml, 'html');
      console.log('AI分析推送完成');
    } catch (error) {
      console.error('AI分析推送失败:', error.message);
    }
  })();

  if (waitUntil) {
    waitUntil(aiTask);
  } else {
    await aiTask;
  }

  return priceResult;
}

// 一次完整的监控周期：判断预警/定时，需要时推送。Cron 与 /api/monitor 共用。
async function runMonitorCycle(env, waitUntil = null) {
  const snapshot = await getMarketSnapshot();
  if (!snapshot.domestic) {
    return { snapshot, alerts: [], pushTriggered: false, pushResult: null, reason: '行情不可用' };
  }

  const alerts = [];
  let pushType = null;
  if (evaluateAlert(snapshot.domestic, await getState(env, 'lastAlert'))) {
    pushType = 'alert';
    alerts.push({
      type: 'price_alert',
      message: `国内金价涨跌幅 ${Math.abs(snapshot.domestic.changePercent).toFixed(2)}%，触发预警`,
      price: snapshot.domestic.price,
      changePercent: snapshot.domestic.changePercent,
    });
  } else if (await isScheduledPushDue(env)) {
    pushType = 'scheduled';
    alerts.push({ type: 'scheduled', message: '满足定时推送条件（距上次推送超过30分钟）' });
  }

  const pushResult = pushType ? await executePush(env, snapshot, pushType, waitUntil) : null;
  return { snapshot, alerts, pushTriggered: pushType !== null, pushResult, reason: null };
}

// ============================================================
// 中间件
// ============================================================
app.use('*', secureHeaders());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 管理接口鉴权：必须携带 Authorization: Bearer <ADMIN_TOKEN>，未配置时一律拒绝
async function requireAdmin(c, next) {
  const token = c.env?.ADMIN_TOKEN;
  if (!token) {
    return c.json({ success: false, message: '管理接口未启用（ADMIN_TOKEN 未配置）' }, 503);
  }
  const header = c.req.header('Authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!safeEqual(provided, token)) {
    return c.json({ success: false, message: '未授权' }, 401);
  }
  await next();
}

// 获取 waitUntil 函数（仅在 Workers HTTP 请求中可用）
function backgroundRunner(c) {
  try {
    const ctx = c.executionCtx;
    return (promise) => ctx.waitUntil(promise);
  } catch {
    return null;
  }
}

const serverError = (c, message, error) => {
  console.error(message, error);
  return c.json({ success: false, message, timestamp: new Date().toISOString() }, 500);
};

// ============================================================
// API 路由：健康检查
// ============================================================
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: '黄金价格检测系统 API',
    version: '2.1.0',
    endpoints: [
      'GET /api/price/international - 获取国际金价',
      'GET /api/price/domestic - 获取国内AU9999价格',
      'GET /api/price/all - 获取所有价格数据',
      'GET /api/kline?days=30 - 获取真实日K线数据',
      'GET /api/chart/kline?days=30 - 获取K线图配置',
      'POST /api/analyze - 量化分析（结果缓存15分钟）',
      'GET /api/push/status - 获取推送状态',
      'POST /api/push/test - 测试推送（需 ADMIN_TOKEN）',
      'POST /api/push/scheduled - 定时推送（需 ADMIN_TOKEN）',
      'POST /api/push/force - 强制推送（需 ADMIN_TOKEN）',
      'GET /api/monitor - 价格监控并按需推送（需 ADMIN_TOKEN）',
    ],
  });
});

// ============================================================
// API 路由：价格
// ============================================================
app.get('/api/price/international', async (c) => {
  try {
    const data = await fetchInternationalGoldPrice();
    return c.json(data);
  } catch (error) {
    return serverError(c, '国际金价获取失败', error);
  }
});

app.get('/api/price/domestic', async (c) => {
  try {
    const data = await fetchEastmoneyAU9999().catch(async (error) => {
      console.error('国内金价获取失败:', error.message);
      const intl = await fetchInternationalGoldPrice();
      return estimateDomesticPrice(intl, await fetchUsdCnyRate());
    });
    return c.json(data);
  } catch (error) {
    return serverError(c, '国内金价获取失败', error);
  }
});

app.get('/api/price/all', async (c) => {
  const snapshot = await getMarketSnapshot();
  return c.json({ success: Boolean(snapshot.domestic || snapshot.international), ...snapshot });
});

// ============================================================
// API 路由：真实日K线
// ============================================================
app.get('/api/kline', async (c) => {
  const days = clampDays(c.req.query('days'));
  try {
    const data = await fetchDailyKline(days);
    return c.json({ success: true, period: `${days}天`, data, timestamp: new Date().toISOString() });
  } catch (error) {
    return serverError(c, 'K线数据获取失败', error);
  }
});

// ECharts K线图配置（基于真实日K线）
function buildKlineChartOption(klineData) {
  const dates = klineData.map((k) => k.date);
  return {
    title: { text: '黄金价格K线图', left: 'center', textStyle: { color: '#fff', fontSize: 16 } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#fbbf24',
      textStyle: { color: '#fff' },
    },
    legend: { data: ['K线', '成交量'], textStyle: { color: '#fff' } },
    grid: [
      { left: '10%', right: '8%', height: '60%' },
      { left: '10%', right: '8%', top: '75%', height: '16%' },
    ],
    xAxis: [
      { type: 'category', data: dates, scale: true, boundaryGap: false, axisLine: { onZero: false }, splitLine: { show: false }, axisLabel: { color: '#fff' } },
      { type: 'category', gridIndex: 1, data: dates, scale: true, boundaryGap: false, axisLine: { onZero: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false } },
    ],
    yAxis: [
      { scale: true, splitArea: { show: true }, axisLabel: { color: '#fff' } },
      { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } },
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: 50, end: 100 },
      { show: true, xAxisIndex: [0, 1], type: 'slider', top: '85%', start: 50, end: 100, textStyle: { color: '#fff' } },
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: klineData.map((k) => [k.open, k.close, k.low, k.high]),
        itemStyle: { color: '#ef4444', color0: '#22c55e', borderColor: '#ef4444', borderColor0: '#22c55e' },
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: klineData.map((k) => k.volume),
        itemStyle: { color: '#fbbf24' },
      },
    ],
  };
}

app.get('/api/chart/kline', async (c) => {
  const days = clampDays(c.req.query('days'));
  try {
    const klineData = await fetchDailyKline(days);
    return c.json({
      success: true,
      period: `${days}天`,
      chartOption: buildKlineChartOption(klineData),
      rawData: klineData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return serverError(c, 'K线数据获取失败', error);
  }
});

// ============================================================
// API 路由：AI 量化分析（公开，但结果缓存 15 分钟以控制 AI 调用成本）
// ============================================================
app.post('/api/analyze', async (c) => {
  try {
    const cached = await getState(c.env, 'analysisCache');
    if (cached && Date.now() - cached.at < ANALYSIS_CACHE_MS) {
      return c.json({ ...cached.payload, cached: true });
    }

    const snapshot = await getMarketSnapshot();
    if (!snapshot.domestic) {
      return c.json({ success: false, message: '行情暂不可用，请稍后重试', priceData: snapshot }, 503);
    }

    const klineData = await fetchDailyKline(30).catch(() => []);
    const analysis = await analyzeWithDeepSeek(c.env, snapshot, klineData);
    const payload = { success: true, priceData: snapshot, analysis, timestamp: new Date().toISOString() };
    await setState(c.env, 'analysisCache', { at: Date.now(), payload });
    return c.json({ ...payload, cached: false });
  } catch (error) {
    return serverError(c, 'AI 分析失败', error);
  }
});

// ============================================================
// 管理接口：推送
// ============================================================
function priceSummary(snapshot) {
  return {
    international: snapshot.international && { price: snapshot.international.price, changePercent: snapshot.international.changePercent },
    domestic: snapshot.domestic && { price: snapshot.domestic.price, changePercent: snapshot.domestic.changePercent, estimated: snapshot.domestic.estimated },
  };
}

app.post('/api/push/test', requireAdmin, async (c) => {
  try {
    const snapshot = await getMarketSnapshot();
    const result = await executePush(c.env, snapshot, 'scheduled', backgroundRunner(c));
    return c.json({
      success: result.success,
      message: result.success ? '测试推送成功' : '测试推送失败',
      detail: result.msg,
      priceData: priceSummary(snapshot),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return serverError(c, '推送异常', error);
  }
});

app.post('/api/push/scheduled', requireAdmin, async (c) => {
  try {
    if (!(await isScheduledPushDue(c.env))) {
      const last = await getState(c.env, 'lastScheduledPush');
      return c.json({
        success: false,
        message: '距离上次定时推送不足30分钟',
        lastPush: last ? new Date(last).toISOString() : null,
        timestamp: new Date().toISOString(),
      });
    }
    const snapshot = await getMarketSnapshot();
    const result = await executePush(c.env, snapshot, 'scheduled', backgroundRunner(c));
    return c.json({
      success: result.success,
      message: result.success ? '定时推送成功' : '定时推送失败',
      detail: result.msg,
      priceData: priceSummary(snapshot),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return serverError(c, '定时推送异常', error);
  }
});

app.post('/api/push/force', requireAdmin, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const pushType = body.type === 'alert' ? 'alert' : 'scheduled';
    const snapshot = await getMarketSnapshot();
    const result = await executePush(c.env, snapshot, pushType, backgroundRunner(c));
    return c.json({
      success: result.success,
      message: result.success ? '强制推送成功' : '强制推送失败',
      detail: result.msg,
      type: pushType,
      priceData: priceSummary(snapshot),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return serverError(c, '强制推送异常', error);
  }
});

app.get('/api/monitor', requireAdmin, async (c) => {
  try {
    const result = await runMonitorCycle(c.env, backgroundRunner(c));
    return c.json({
      success: result.snapshot.domestic !== null,
      monitoring: priceSummary(result.snapshot),
      errors: result.snapshot.errors,
      alerts: result.alerts,
      pushTriggered: result.pushTriggered,
      pushResult: result.pushResult,
      reason: result.reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return serverError(c, '监控异常', error);
  }
});

// 推送状态（只读，公开）
app.get('/api/push/status', async (c) => {
  const lastPush = await getState(c.env, 'lastPush');
  const lastScheduled = await getState(c.env, 'lastScheduledPush');
  const lastAlert = await getState(c.env, 'lastAlert');
  const now = Date.now();
  return c.json({
    success: true,
    status: {
      lastPushPrice: lastPush?.price ?? null,
      lastPushTime: lastPush ? new Date(lastPush.time).toISOString() : null,
      lastScheduledPush: lastScheduled ? new Date(lastScheduled).toISOString() : null,
      lastAlertPrice: lastAlert?.price ?? null,
      nextScheduledPush: lastScheduled ? new Date(lastScheduled + SCHEDULED_MIN_GAP_MS).toISOString() : '立即可推送',
      canScheduledPush: !lastScheduled || now - lastScheduled >= SCHEDULED_MIN_GAP_MS,
      timeSinceLastPush: lastPush ? `${Math.floor((now - lastPush.time) / 1000)}秒` : null,
    },
    config: {
      pushInterval: '30分钟',
      alertThreshold: `涨跌幅 ≥ ${ALERT_THRESHOLD_PERCENT}%`,
      stateStorage: c.env?.GOLD_KV ? 'KV' : 'memory',
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// 兜底：未知路由与异常
// ============================================================
app.notFound((c) => c.json({ success: false, message: '接口不存在' }, 404));
app.onError((error, c) => serverError(c, '服务器内部错误', error));

// ============================================================
// Cloudflare 入口：HTTP + Cron Trigger（每30分钟）
// ============================================================
export default {
  fetch: app.fetch,

  async scheduled(event, env, ctx) {
    console.log('Cron Trigger 触发:', new Date().toISOString());
    try {
      const result = await runMonitorCycle(env, (promise) => ctx.waitUntil(promise));
      if (result.reason) {
        console.error('Cron 跳过推送:', result.reason, result.snapshot.errors);
      } else if (!result.pushTriggered) {
        console.log('未满足推送条件，跳过本次推送');
      } else {
        console.log('Cron 推送结果:', result.pushResult?.success ? '成功' : '失败', result.pushResult?.msg);
      }
    } catch (error) {
      console.error('Cron Trigger 执行异常:', error);
    }
  },
};
