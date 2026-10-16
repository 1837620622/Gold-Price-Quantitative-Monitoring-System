/**
 * ============================================================
 * 全局配置：数据源地址、缓存时长、校验范围、量化参数
 * 集中管理，便于调参与审计
 * ============================================================
 */

export const SOURCE_URLS = {
  goldSpot: 'https://api.gold-api.com/price',
  yahooChart: 'https://query1.finance.yahoo.com/v8/finance/chart/',
  stooq: 'https://stooq.com/q/d/l/',
  fxLatest: 'https://open.er-api.com/v6/latest/USD',
  frankfurter: 'https://api.frankfurter.app',
  eastmoneyQuote: 'https://push2.eastmoney.com/api/qt/stock/get',
  eastmoneyKline: 'https://push2his.eastmoney.com/api/qt/stock/kline/get',
  pushplus: 'https://www.pushplus.plus/send',
  modelscope: 'https://api-inference.modelscope.cn/v1/chat/completions',
};

export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
export const FETCH_TIMEOUT_MS = 8000;
export const AI_TIMEOUT_MS = 30000;
export const OZ_TO_GRAM = 31.1035;

export const MAX_DAYS = 250;
export const DEFAULT_DAYS = 30;
export const QUANT_DAYS = 250;

// 合理性校验范围：超出即视为数据异常（如单位错误），拒绝使用
export const SANE = {
  intlUsdPerOz: [100, 100000],
  domesticCnyPerGram: [100, 5000],
  usdCny: [1, 20],
};

// 溢价绝对值超过该阈值时，在交叉校验中标记为"需核对"
export const PREMIUM_ALERT_PERCENT = 8;

export const TTL = {
  snapshot: 15 * 1000,
  intlQuote: 15 * 1000,
  history: 60 * 60 * 1000,
  fx: 6 * 60 * 60 * 1000,
  kline: 5 * 60 * 1000,
  quant: 5 * 60 * 1000,
  analysis: 15 * 60 * 1000,
};

export const ALERT = {
  thresholdPercent: 1,
  repeatMovePercent: 0.5,
  scheduledMinGapMs: 28 * 60 * 1000,
};

// 量化参数（均为常用默认值）
export const QUANT = {
  emaFast: 12,
  emaSlow: 26,
  macdSignal: 9,
  rsiPeriod: 14,
  bollPeriod: 20,
  bollMultiplier: 2,
  atrPeriod: 14,
  volWindow: 20,
  periodsPerYear: 252,
  premiumWindow: 60,
  costPerSwitch: 0.0005, // 单边交易成本（每次仓位切换）
  longEntryScore: 20,    // 综合评分策略：评分 ≥ 20 开仓
  longExitScore: 0,      // 评分 ≤ 0 平仓（迟滞，减少频繁换仓）
  warmupBars: 35,        // 指标预热期，回测从此之后开始
  minBars: 40,           // 有效K线少于该数量时不输出量化结论
};
