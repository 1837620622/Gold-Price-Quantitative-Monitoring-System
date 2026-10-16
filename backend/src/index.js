/**
 * ============================================================
 * 黄金价格检测系统 - Cloudflare Workers 后端服务
 * ============================================================
 * 数据源（均为免费公共接口，无需 API Key）：
 * - 国际金价 XAU/USD / 白银：api.gold-api.com
 * - 美元兑人民币汇率：open.er-api.com（用于溢价计算，及国内价缺失时估算）
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
 *   GOLD_KV              KV 命名空间，持久化推送/预警/分析缓存（未绑定时只存在内存）
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
const DEFAULT_KLINE_DAYS = 30;

// 合理性校验范围：超出即视为数据异常（如单位错误），拒绝使用
const SANE_INTL_RANGE = [100, 100000];   // 美元/盎司
const SANE_DOMESTIC_RANGE = [100, 5000]; // 元/克
const SANE_FX_RANGE = [1, 20];           // 美元兑人民币

// 预警参数
const ALERT_THRESHOLD_PERCENT = 1;       // 涨跌幅达到 1% 即预警（不设上限）
const ALERT_REPEAT_MOVE_PERCENT = 0.5;   // 同日同方向再次预警需价格相对上次预警价再变动 0.5%
// 定时推送间隔 30 分钟；Cron 实际触发有少量抖动，留 2 分钟容差避免漏推
const SCHEDULED_MIN_GAP_MS = 28 * 60 * 1000;

// 缓存时长
const SNAPSHOT_TTL_MS = 15 * 1000;           // 行情快照：削弱前端轮询对上游的压力
const FX_TTL_MS = 6 * 60 * 60 * 1000;        // 汇率每日更新，缓存 6 小时
const KLINE_TTL_MS = 5 * 60 * 1000;          // 日K线
const ANALYSIS_CACHE_MS = 15 * 60 * 1000;    // AI 分析结果（写入 KV，跨实例共享）

// ============================================================
// 工具函数：基础
// ============================================================
const round2 = (v) => Math.round(v * 100) / 100;
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const inRange = (v, [min, max]) => isFiniteNumber(v) && v >= min && v <= max;
const fmt = (v, digits = 2) => (isFiniteNumber(v) ? v.toFixed(digits) : '--');
const signed = (v) => (isFiniteNumber(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}` : '--');
const signedPercent = (v) => (isFiniteNumber(v) ? `${signed(v)}%` : '--');
const toneOf = (v) => (!isFiniteNumber(v) ? 'tone-flat' : v >= 0 ? 'tone-up' : 'tone-down');
const arrowOf = (v) => (!isFiniteNumber(v) ? '' : v >= 0 ? '▲ ' : '▼ ');

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

function clampDays(value, fallback = DEFAULT_KLINE_DAYS) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), MAX_KLINE_DAYS);
}

// 上海时区日期（YYYY-MM-DD），用于判断"同一天"
function shanghaiDate(ts) {
  return new Date(ts + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function nowInShanghai() {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
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
// 进程内缓存 + 并发合并（同一个 key 同时只发起一次上游请求）
// 失败不缓存；isCacheable 返回 false 时也不缓存
// ============================================================
const memoCache = new Map();
const memoInflight = new Map();

function memo(key, ttlMs, loader, isCacheable = () => true) {
  const hit = memoCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  if (memoInflight.has(key)) return memoInflight.get(key);

  const task = (async () => {
    try {
      const value = await loader();
      if (isCacheable(value)) memoCache.set(key, { at: Date.now(), value });
      return value;
    } finally {
      memoInflight.delete(key);
    }
  })();
  memoInflight.set(key, task);
  return task;
}

// ============================================================
// 状态存储：优先使用 KV（跨实例持久化），未绑定时退回内存
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
// 注意：该接口不提供涨跌幅/昨收，相关字段返回 null，不伪造数值
// ============================================================
async function fetchInternationalGoldPrice() {
  const [goldR, silverR] = await Promise.allSettled([
    fetchJson(`${GOLD_API_URL}/XAU`),
    fetchJson(`${GOLD_API_URL}/XAG`),
  ]);
  if (goldR.status === 'rejected') throw goldR.reason;

  const price = Number(goldR.value?.price);
  if (!inRange(price, SANE_INTL_RANGE)) throw new Error(`国际金价数据异常: ${goldR.value?.price}`);

  // 白银为辅助信息，失败不影响主数据
  if (silverR.status === 'rejected') console.error('白银价格获取失败:', silverR.reason?.message);
  const silver = silverR.status === 'fulfilled' ? Number(silverR.value?.price) : NaN;

  return {
    success: true,
    source: 'gold-api.com',
    currency: 'USD',
    unit: '盎司',
    price: round2(price),
    change: null,
    changePercent: null,
    previousClose: null,
    silverPrice: isFiniteNumber(silver) && silver > 0 ? round2(silver) : null,
    timestamp: goldR.value?.updatedAt || new Date().toISOString(),
  };
}

// ============================================================
// 行情：美元兑人民币（open.er-api.com，免费无需 Key，每日更新，缓存 6 小时）
// ============================================================
function getUsdCnyRate() {
  return memo('fx', FX_TTL_MS, async () => {
    const data = await fetchJson(FX_API_URL);
    const rate = Number(data?.rates?.CNY);
    if (!inRange(rate, SANE_FX_RANGE)) throw new Error('汇率数据异常');
    return Math.round(rate * 10000) / 10000;
  });
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
  return {
    success: true,
    source: 'estimated',
    estimated: true,
    code: 'AU9999',
    name: '黄金9999（估算）',
    currency: 'CNY',
    unit: '克',
    price: round2((intl.price * usdCny) / OZ_TO_GRAM),
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

// 国内溢价（相对国际金价按汇率折算为元/克）；估算价没有意义，返回 null
function calcPremium(domestic, international, usdCny) {
  if (!domestic || domestic.estimated || !international || !isFiniteNumber(usdCny)) return null;
  const theoretical = (international.price * usdCny) / OZ_TO_GRAM;
  return round2((domestic.price / theoretical - 1) * 100);
}

function settle(result, label, errors) {
  if (result.status === 'fulfilled') return result.value;
  const message = result.reason?.message ?? '未知错误';
  errors.push(`${label}: ${message}`);
  console.error(`${label}获取失败:`, message);
  return null;
}

// ============================================================
// 行情快照：三路并行获取；失败的一方为 null，绝不伪造数据
// ============================================================
async function loadMarketSnapshot() {
  const [intlR, domR, fxR] = await Promise.allSettled([
    fetchInternationalGoldPrice(),
    fetchEastmoneyAU9999(),
    getUsdCnyRate(),
  ]);

  const errors = [];
  const international = settle(intlR, '国际金价', errors);
  let domestic = settle(domR, '国内金价', errors);
  const usdCny = settle(fxR, '汇率', errors);

  if (!domestic && international && usdCny) {
    domestic = estimateDomesticPrice(international, usdCny);
  }

  return {
    international,
    domestic,
    fx: usdCny ? { usdCny, source: 'open.er-api.com' } : null,
    premiumPercent: calcPremium(domestic, international, usdCny),
    errors,
    timestamp: new Date().toISOString(),
  };
}

function getMarketSnapshot() {
  return memo('snapshot', SNAPSHOT_TTL_MS, loadMarketSnapshot, (s) => Boolean(s.international || s.domestic));
}

// ============================================================
// 行情：国内 AU9999 日K线（东方财富，真实历史数据）
// 返回字段顺序：日期,开盘,收盘,最高,最低,成交量
// ============================================================
async function fetchDailyKline(days) {
  const result = await fetchJson(
    `${EASTMONEY_KLINE_URL}?secid=118.AU9999&fields1=f1,f2,f3,f4,f5,f6` +
      `&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=0&end=20500101&lmt=${days}`,
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

function getDailyKline(days) {
  return memo(`kline:${days}`, KLINE_TTL_MS, () => fetchDailyKline(days));
}

// ============================================================
// AI 量化分析（ModelScope：DeepSeek-V3.2 → Qwen2.5-72B → 规则摘要）
// ============================================================
const MODEL_LABELS = {
  'DeepSeek-V3.2': 'DeepSeek-V3.2',
  'Qwen2.5-72B': 'Qwen2.5-72B',
  'auto-analysis': '规则摘要（未启用AI）',
};

function buildRuleBasedAnalysis(snapshot, weekChange) {
  const { international: intl, domestic: dom, premiumPercent } = snapshot;
  const pct = dom.changePercent;
  const hasChange = isFiniteNumber(pct);
  const trend = !hasChange ? '暂无涨跌数据（估算价）' : pct >= 0 ? '上涨' : '下跌';
  const suggestion = !hasChange
    ? '国内价为估算值，暂不给出操作建议，请以交易所实时价为准'
    : Math.abs(pct) > 1 ? '波动较大，建议观望' : '波动平稳，可适量配置';
  const premiumLine = isFiniteNumber(premiumPercent) ? `国内溢价（参考）：${signed(premiumPercent)}%\n` : '';

  return `【自动分析报告】

当前市场状态：${trend}
国际金价：${intl ? `${fmt(intl.price)} 美元/盎司` : '暂无数据'}
国内AU9999：${fmt(dom.price)} 元/克${dom.estimated ? '（估算价）' : ''}
${premiumLine}
技术面分析：
- 今日涨跌幅：${hasChange ? signedPercent(pct) : 'N/A'}
- 近7日涨跌幅：${weekChange == null ? 'N/A' : signedPercent(weekChange)}
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
  const { international: intl, domestic: dom, premiumPercent } = snapshot;
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

  const prompt = `作为专业的黄金量化分析师，请根据以下【实时数据】提供量化分析报告。

【实时行情数据】（数据时间：${nowInShanghai()}）

▶ 国际金价 XAU/USD
  • 最新价格：${intl ? fmt(intl.price) : 'N/A'} 美元/盎司
  • 白银：${intl ? fmt(intl.silverPrice) : 'N/A'} 美元/盎司
  • 美元兑人民币：${snapshot.fx ? fmt(snapshot.fx.usdCny, 4) : 'N/A'}

▶ 国内AU9999
  • 最新价格：${fmt(dom.price)} 元/克${dom.estimated ? '（估算价，非交易所实时价）' : ''}
  • 今日开盘：${fmt(dom.open)} 元/克
  • 最高价：${fmt(dom.high)} 元/克
  • 最低价：${fmt(dom.low)} 元/克
  • 昨收价：${fmt(dom.previousClose)} 元/克
  • 涨跌额：${fmt(dom.change)} 元
  • 涨跌幅：${isFiniteNumber(dom.changePercent) ? `${signed(dom.changePercent)}%` : 'N/A'}
  • 国内溢价（相对国际金价折算）：${isFiniteNumber(premiumPercent) ? `${signed(premiumPercent)}%` : 'N/A'}

▶ 近7日走势（真实日K线）
  • 7日累计涨跌幅：${weekChange == null ? 'N/A' : signedPercent(weekChange)}

═══════════════════════════════════════
请按以下格式输出专业分析报告，仅基于上述数据，不要编造未提供的数据：

## 黄金量化分析报告

### 1. 短期趋势判断
（明确给出：看涨/看跌/震荡，并说明判断依据）

### 2. 关键支撑位与压力位
- 国内金价压力位：
- 国内金价支撑位：

### 3. 技术指标信号
（基于日内振幅、溢价与近7日走势分析动量与波动）

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

// 量化分析结果：统一入口，并发请求合并，成功调用 AI 的结果写入 KV 缓存
let analysisInflight = null;

async function buildAnalysis(env) {
  const snapshot = await getMarketSnapshot();
  if (!snapshot.domestic) {
    return { success: false, message: '行情暂不可用，请稍后重试', priceData: snapshot, timestamp: new Date().toISOString() };
  }

  const klineData = await getDailyKline(DEFAULT_KLINE_DAYS).catch(() => []);
  const analysis = await analyzeWithDeepSeek(env, snapshot, klineData);
  const payload = { success: true, priceData: snapshot, analysis, timestamp: new Date().toISOString() };

  if (analysis.model !== 'auto-analysis') {
    await setState(env, 'analysisCache', { at: Date.now(), payload });
  }
  return payload;
}

async function getAnalysis(env) {
  const cached = await getState(env, 'analysisCache');
  if (cached && Date.now() - cached.at < ANALYSIS_CACHE_MS) {
    return { ...cached.payload, cached: true };
  }
  if (!analysisInflight) {
    analysisInflight = buildAnalysis(env).finally(() => {
      analysisInflight = null;
    });
  }
  return { ...(await analysisInflight), cached: false };
}

// ============================================================
// 推送模板（PushPlus HTML）
// 配色：红涨绿跌（与国内行情习惯一致）；AI 输出先截断、再转义，防止注入
// ============================================================
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

const PUSH_BASE_CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #0d1117; color: #f5f5f5; padding: 12px; font-size: 15px; line-height: 1.6; }
    .tone-up { color: #ff5b5f; }
    .tone-down { color: #3ddc84; }
    .tone-flat { color: #a1a1aa; }
    .card { background: rgba(255,255,255,0.05); border-radius: 14px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.08); }
    .label { font-size: 13px; color: #c9d1d9; margin-bottom: 6px; }
    .value { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; }
    .change { font-size: 15px; font-weight: 600; margin-top: 4px; }
    .grid { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); }
    .grid div { text-align: center; flex: 1; }
    .grid .k { display: block; font-size: 11px; color: #8b949e; }
    .grid .v { font-size: 14px; font-weight: 600; color: #e4e4e7; }
    .footer { text-align: center; padding-top: 12px; font-size: 12px; color: #8b949e; }
`;

function generatePushHtml(snapshot, analysisText, pushType = 'scheduled') {
  const intl = snapshot.international;
  const dom = snapshot.domestic;
  const domPct = dom.changePercent;
  const intlPct = intl?.changePercent ?? null;
  const pushTypeTitle = pushType === 'alert'
    ? `金价波动 涨跌${isFiniteNumber(domPct) ? `${Math.abs(domPct).toFixed(2)}%` : '--'}`
    : `实时金价 AU9999 ${fmt(dom.price)}元`;
  const pushTypeDesc = pushType === 'alert'
    ? `触发预警：国内金价涨跌幅达 ${isFiniteNumber(domPct) ? Math.abs(domPct).toFixed(2) : '--'}%`
    : '每30分钟自动推送 - 实时行情';
  const badgeColor = pushType === 'alert' ? '#dc2626' : '#2563eb';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${PUSH_BASE_CSS}
    .badge { display: inline-block; background: ${badgeColor}; padding: 4px 12px; border-radius: 16px; font-size: 12px; margin-bottom: 8px; }
    .title { font-size: 20px; color: #fbbf24; font-weight: 700; margin-bottom: 4px; }
    .time { color: #8b949e; font-size: 12px; }
    .analysis { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.25); }
    .analysis h4 { color: #fbbf24; font-size: 14px; margin-bottom: 8px; }
    .analysis p { font-size: 14px; line-height: 1.8; color: #e4e4e7; }
  </style>
</head>
<body>
  <div class="card" style="text-align:center">
    <div class="badge">${escapeHtml(pushTypeDesc)}</div>
    <div class="title">${escapeHtml(pushTypeTitle)}</div>
    <div class="time">更新时间：${nowInShanghai()}</div>
  </div>

  <div class="card">
    <div class="label">[国内] AU9999 ${dom.estimated ? '（估算价）' : '上海黄金交易所'}</div>
    <div class="value ${toneOf(domPct)}">¥${fmt(dom.price)}</div>
    <div class="change ${toneOf(domPct)}">${arrowOf(domPct)}${signedPercent(domPct)}${isFiniteNumber(dom.change) ? `（${signed(dom.change)}元）` : ''}</div>
    <div class="grid">
      <div><span class="k">开盘</span><span class="v">¥${fmt(dom.open)}</span></div>
      <div><span class="k">最高</span><span class="v tone-up">¥${fmt(dom.high)}</span></div>
      <div><span class="k">最低</span><span class="v tone-down">¥${fmt(dom.low)}</span></div>
    </div>
  </div>

  <div class="card">
    <div class="label">[国际] XAU/USD 现货</div>
    <div class="value ${toneOf(intlPct)}">$${fmt(intl?.price)}</div>
    <div class="change ${toneOf(intlPct)}">${arrowOf(intlPct)}${signedPercent(intlPct)}</div>
    <div class="grid">
      <div><span class="k">白银</span><span class="v">$${fmt(intl?.silverPrice)}</span></div>
      <div><span class="k">溢价</span><span class="v">${signedPercent(snapshot.premiumPercent)}</span></div>
      <div><span class="k">来源</span><span class="v">${escapeHtml(intl?.source || '--')}</span></div>
    </div>
  </div>

  <div class="card analysis">
    <h4>AI 智能分析摘要</h4>
    <p>${toPushSummary(analysisText)}</p>
  </div>

  <div class="footer">
    <div>Gold Monitor - 黄金价格智能监控</div>
    <div>Vx: 1837620622 | 邮箱: 2040168455@qq.com</div>
    <div>开发者：传康KK | 咸鱼/B站：万能程序员</div>
  </div>
</body>
</html>`;
}

function generateQuickPriceHtml(snapshot, pushType = 'scheduled') {
  const intl = snapshot.international;
  const dom = snapshot.domestic;
  const domPct = dom.changePercent;
  const intlPct = intl?.changePercent ?? null;
  const changeDir = isFiniteNumber(domPct) && domPct < 0 ? '下跌' : '上涨';
  const pushTypeTitle = pushType === 'alert'
    ? `黄金价格${changeDir} ${isFiniteNumber(domPct) ? Math.abs(domPct).toFixed(2) : '--'}%`
    : '黄金实时行情';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${PUSH_BASE_CSS}
    .title { font-size: 20px; color: #fbbf24; font-weight: 800; text-align: center; margin-bottom: 4px; }
    .sub { font-size: 12px; color: #8b949e; text-align: center; margin-bottom: 12px; }
    .tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(251,191,36,0.2); color: #fbbf24; }
    .tag.intl { background: rgba(88,166,255,0.2); color: #58a6ff; }
    .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="title">${escapeHtml(pushTypeTitle)}</div>
  <div class="sub">${nowInShanghai()} | Gold Monitor</div>

  <div class="card">
    <div class="row"><span class="label">国内 AU9999</span><span class="tag">${dom.estimated ? '估算价' : '上海黄金'}</span></div>
    <div class="value ${toneOf(domPct)}">${fmt(dom.price)} <span style="font-size:14px;color:#8b949e">元/克</span></div>
    <div class="change ${toneOf(domPct)}">${arrowOf(domPct)}${signedPercent(domPct)}</div>
  </div>

  <div class="card">
    <div class="row"><span class="label">国际 XAU/USD</span><span class="tag intl">现货</span></div>
    <div class="value ${toneOf(intlPct)}">${fmt(intl?.price)} <span style="font-size:14px;color:#8b949e">美元/盎司</span></div>
    <div class="change ${toneOf(intlPct)}">${arrowOf(intlPct)}${signedPercent(intlPct)}</div>
  </div>

  <div class="footer">Gold Monitor - 黄金价格监控 | 开发者：传康KK</div>
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(PUSHPLUS_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
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
  } finally {
    clearTimeout(timer);
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
  if (lastAlert && lastAlert.date === shanghaiDate(Date.now()) && lastAlert.direction === direction) {
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
      direction: dom.changePercent >= 0 ? 'up' : 'down',
      time: now,
      date: shanghaiDate(now),
    });
  }
}

// ============================================================
// 执行推送：先发价格；价格发送成功后再异步发送 AI 分析
// waitUntil 可选：HTTP 请求和 Cron 都会传入，保证后台任务不被提前终止
// ============================================================
async function executePush(env, snapshot, pushType = 'scheduled', waitUntil = null) {
  const dom = snapshot.domestic;
  if (!dom) return { success: false, msg: '国内金价不可用，已跳过推送' };
  if (pushType === 'alert' && !isFiniteNumber(dom.changePercent)) {
    return { success: false, msg: '国内价为估算值，无涨跌幅，不发送预警' };
  }

  const pct = dom.changePercent;
  const priceTitle = pushType === 'alert'
    ? `黄金${pct >= 0 ? '上涨' : '下跌'}${Math.abs(pct).toFixed(2)}% 触发预警`
    : `黄金实时行情 ${fmt(dom.price)}元/克`;

  const priceResult = await sendPushPlusNotification(env, priceTitle, generateQuickPriceHtml(snapshot, pushType), 'html');
  if (!priceResult.success) return priceResult;
  await recordPush(env, dom, pushType);

  const aiTask = (async () => {
    try {
      const klineData = await getDailyKline(DEFAULT_KLINE_DAYS).catch(() => []);
      const analysis = await analyzeWithDeepSeek(env, snapshot, klineData);
      const title = `AI智能分析 ${MODEL_LABELS[analysis.model] ?? analysis.model}`;
      await sendPushPlusNotification(env, title, generatePushHtml(snapshot, analysis.analysis, pushType), 'html');
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
    return { snapshot, alerts: [], pushTriggered: false, pushResult: null, reason: '国内行情不可用' };
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
app.use('*', secureHeaders({
  // API 会被另一个域名（前端站点）跨域调用，不能沿用默认的 same-origin
  crossOriginResourcePolicy: 'cross-origin',
}));
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 管理接口鉴权：必须携带 Authorization: Bearer <ADMIN_TOKEN>，未配置时一律拒绝
async function requireAdmin(c, next) {
  c.header('Cache-Control', 'no-store');
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

function serverError(c, message, error) {
  console.error(message, error);
  return c.json({ success: false, message, timestamp: new Date().toISOString() }, 500);
}

// ============================================================
// API 路由：健康检查
// ============================================================
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: '黄金价格检测系统 API',
    version: '2.2.0',
    endpoints: [
      'GET /api/price/international - 国际金价（XAU/USD）',
      'GET /api/price/domestic - 国内AU9999价格（估算时 estimated=true）',
      'GET /api/price/all - 行情快照（含汇率与国内溢价）',
      'GET /api/kline?days=30 - 真实日K线（1-250天）',
      'GET /api/chart/kline?days=30 - K线图配置',
      'POST /api/analyze - 量化分析（结果缓存15分钟）',
      'GET /api/push/status - 推送状态',
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
  const snapshot = await getMarketSnapshot();
  if (!snapshot.international) {
    return c.json({ success: false, message: '国际金价暂不可用', errors: snapshot.errors }, 503);
  }
  return c.json(snapshot.international);
});

app.get('/api/price/domestic', async (c) => {
  const snapshot = await getMarketSnapshot();
  if (!snapshot.domestic) {
    return c.json({ success: false, message: '国内金价暂不可用', errors: snapshot.errors }, 503);
  }
  return c.json(snapshot.domestic);
});

app.get('/api/price/all', async (c) => {
  const snapshot = await getMarketSnapshot();
  const ok = Boolean(snapshot.domestic || snapshot.international);
  return c.json({ success: ok, ...snapshot }, ok ? 200 : 503);
});

// ============================================================
// API 路由：真实日K线
// ============================================================
app.get('/api/kline', async (c) => {
  const days = clampDays(c.req.query('days'));
  try {
    const data = await getDailyKline(days);
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
    const klineData = await getDailyKline(days);
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
// API 路由：AI 量化分析（公开，结果缓存 15 分钟以控制 AI 调用成本）
// ============================================================
app.post('/api/analyze', async (c) => {
  try {
    const result = await getAnalysis(c.env);
    return c.json(result, result.success ? 200 : 503);
  } catch (error) {
    return serverError(c, 'AI 分析失败', error);
  }
});

// ============================================================
// 管理接口：推送与监控（需 ADMIN_TOKEN）
// ============================================================
function priceSummary(snapshot) {
  return {
    international: snapshot.international && { price: snapshot.international.price, changePercent: snapshot.international.changePercent },
    domestic: snapshot.domestic && { price: snapshot.domestic.price, changePercent: snapshot.domestic.changePercent, estimated: snapshot.domestic.estimated },
    premiumPercent: snapshot.premiumPercent,
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
