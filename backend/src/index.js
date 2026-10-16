/**
 * ============================================================
 * 黄金价格检测系统 - Cloudflare Workers 入口
 * 职责：路由、鉴权、中间件、Cron 入口
 * 业务逻辑：market.js（行情与历史）、quant/（量化引擎）、ai.js（AI 分析）、push.js（推送与监控）
 * ============================================================
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { ALERT, DEFAULT_DAYS, MAX_DAYS, QUANT_DAYS } from './config.js';
import { clampDays, safeEqual } from './lib/util.js';
import { getState } from './lib/cache.js';
import { listSources } from './lib/sources.js';
import { getSnapshot, getDomesticKline, getQuant, getPremium } from './market.js';
import { getAnalysis } from './ai.js';
import { executePush, runMonitorCycle, isScheduledPushDue, readPushStatus } from './push.js';

const app = new Hono();

// ------------------------------------------------------------
// 中间件
// ------------------------------------------------------------
app.use('*', secureHeaders({
  // API 会被另一个域名（前端站点）跨域调用，不能沿用默认的 same-origin
  crossOriginResourcePolicy: 'cross-origin',
}));
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 管理接口：必须携带 Authorization: Bearer <ADMIN_TOKEN>；未配置时一律拒绝
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

// 获取 waitUntil（仅 HTTP 请求上下文可用）
function backgroundRunner(c) {
  try {
    const ctx = c.executionCtx;
    return (promise) => ctx.waitUntil(promise);
  } catch {
    return null;
  }
}

// 上游数据不可用：503，并记录日志；不把内部错误细节返回给客户端
function unavailable(c, message, error) {
  console.error(message, error);
  return c.json({ success: false, message, timestamp: new Date().toISOString() }, 503);
}

function serverError(c, message, error) {
  console.error(message, error);
  return c.json({ success: false, message, timestamp: new Date().toISOString() }, 500);
}

function priceSummary(snapshot) {
  return {
    international: snapshot.international && { price: snapshot.international.price, changePercent: snapshot.international.changePercent },
    domestic: snapshot.domestic && { price: snapshot.domestic.price, changePercent: snapshot.domestic.changePercent, estimated: snapshot.domestic.estimated },
    premiumPercent: snapshot.premiumPercent,
  };
}

// ------------------------------------------------------------
// 健康检查
// ------------------------------------------------------------
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: '黄金价格检测系统 API',
    version: '3.0.0',
    endpoints: [
      'GET /api/price/international - 国际金价（gold-api.com，Yahoo 双源校验）',
      'GET /api/price/domestic - 国内 AU9999（估算时 estimated=true）',
      'GET /api/price/all - 行情快照（汇率、溢价、交叉校验、数据源状态）',
      'GET /api/sources - 数据源健康状态',
      'GET /api/kline?days=30 - 国内日K原始数据（1-250 天）',
      'GET /api/quant/cn?days=250 - 国内量化结果（指标、信号、关键位、风险、回测、溢价）',
      'GET /api/quant/intl?days=250 - 国际量化结果（指标、信号、关键位、风险、回测）',
      'GET /api/premium?days=250 - 国内溢价序列与统计',
      'POST /api/analyze - AI 量化分析（基于量化结果，缓存 15 分钟）',
      'GET /api/push/status - 推送状态',
      'POST /api/push/test - 测试推送（需 ADMIN_TOKEN）',
      'POST /api/push/scheduled - 定时推送（需 ADMIN_TOKEN）',
      'POST /api/push/force - 强制推送（需 ADMIN_TOKEN）',
      'GET /api/monitor - 价格监控并按需推送（需 ADMIN_TOKEN）',
    ],
  });
});

// ------------------------------------------------------------
// 行情
// ------------------------------------------------------------
app.get('/api/price/international', async (c) => {
  const snapshot = await getSnapshot();
  if (!snapshot.international) {
    return c.json({ success: false, message: '国际金价暂不可用', errors: snapshot.errors }, 503);
  }
  return c.json(snapshot.international);
});

app.get('/api/price/domestic', async (c) => {
  const snapshot = await getSnapshot();
  if (!snapshot.domestic) {
    return c.json({ success: false, message: '国内金价暂不可用', errors: snapshot.errors }, 503);
  }
  return c.json(snapshot.domestic);
});

app.get('/api/price/all', async (c) => {
  const snapshot = await getSnapshot();
  const ok = Boolean(snapshot.domestic || snapshot.international);
  return c.json({ success: ok, ...snapshot, sources: listSources() }, ok ? 200 : 503);
});

app.get('/api/sources', (c) => {
  return c.json({ success: true, sources: listSources(), timestamp: new Date().toISOString() });
});

// ------------------------------------------------------------
// 历史与量化
// ------------------------------------------------------------
app.get('/api/kline', async (c) => {
  const days = clampDays(c.req.query('days'), DEFAULT_DAYS, MAX_DAYS);
  try {
    const data = await getDomesticKline(days);
    return c.json({ success: true, period: `${days}天`, data, timestamp: new Date().toISOString() });
  } catch (error) {
    return unavailable(c, 'K线数据获取失败', error);
  }
});

app.get('/api/quant/:market', async (c) => {
  const market = c.req.param('market');
  if (market !== 'cn' && market !== 'intl') {
    return c.json({ success: false, message: 'market 仅支持 cn 或 intl' }, 400);
  }
  const days = clampDays(c.req.query('days'), QUANT_DAYS, MAX_DAYS);
  try {
    const result = await getQuant(market, days);
    return c.json({ success: result.available, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    return unavailable(c, '量化数据获取失败', error);
  }
});

app.get('/api/premium', async (c) => {
  const days = clampDays(c.req.query('days'), QUANT_DAYS, MAX_DAYS);
  try {
    const premium = await getPremium(days);
    return c.json({ success: premium.available, premium, timestamp: new Date().toISOString() });
  } catch (error) {
    return unavailable(c, '溢价数据获取失败', error);
  }
});

// AI 分析：公开接口，结果缓存 15 分钟以控制模型调用成本
app.post('/api/analyze', async (c) => {
  try {
    const result = await getAnalysis(c.env);
    return c.json(result, result.success ? 200 : 503);
  } catch (error) {
    return serverError(c, 'AI 分析失败', error);
  }
});

// ------------------------------------------------------------
// 管理接口：推送与监控（需 ADMIN_TOKEN）
// ------------------------------------------------------------
app.post('/api/push/test', requireAdmin, async (c) => {
  try {
    const snapshot = await getSnapshot();
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
        message: `距离上次定时推送不足 ${Math.round(ALERT.scheduledMinGapMs / 60000)} 分钟`,
        lastPush: last ? new Date(last).toISOString() : null,
        timestamp: new Date().toISOString(),
      });
    }
    const snapshot = await getSnapshot();
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
    const snapshot = await getSnapshot();
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
  return c.json({
    success: true,
    status: await readPushStatus(c.env),
    config: {
      pushInterval: '30分钟',
      alertThreshold: `涨跌幅 ≥ ${ALERT.thresholdPercent}%`,
      stateStorage: c.env?.GOLD_KV ? 'KV' : 'memory',
    },
    timestamp: new Date().toISOString(),
  });
});

// ------------------------------------------------------------
// 兜底
// ------------------------------------------------------------
app.notFound((c) => c.json({ success: false, message: '接口不存在' }, 404));
app.onError((error, c) => serverError(c, '服务器内部错误', error));

// ------------------------------------------------------------
// Cloudflare 入口：HTTP + Cron Trigger（每 30 分钟）
// ------------------------------------------------------------
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
