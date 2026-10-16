/**
 * ============================================================
 * 推送与监控：PushPlus 发送、预警判定、定时推送、状态记录
 * ============================================================
 */

import { ALERT, FETCH_TIMEOUT_MS, SOURCE_URLS } from './config.js';
import { getState, setState } from './lib/cache.js';
import { isNum, shanghaiDate } from './lib/util.js';
import { getSnapshot, getQuant } from './market.js';
import { generateAnalysis, modelLabel } from './ai.js';
import { generatePushHtml, generateQuickPriceHtml } from './templates.js';
import { track, declareSource } from './lib/sources.js';

const PUSH_SOURCE = 'PushPlus';
declareSource(PUSH_SOURCE, '微信群组推送');

export async function sendPush(env, title, content) {
  const token = env.PUSHPLUS_TOKEN;
  if (!token) {
    console.error('PushPlus Token 未配置');
    return { success: false, msg: 'PUSHPLUS_TOKEN 未配置' };
  }

  const body = { token, title, content, template: 'html', channel: 'wechat' };
  if (env.PUSHPLUS_TOPIC) body.topic = env.PUSHPLUS_TOPIC;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const result = await track(PUSH_SOURCE, 'push', async () => {
      const response = await fetch(SOURCE_URLS.pushplus, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (json.code !== 200) throw new Error(json.msg || 'PushPlus 返回失败');
      return json;
    });
    console.log('PushPlus 推送成功:', result.msg);
    return { success: true, msg: result.msg, data: result.data };
  } catch (error) {
    console.error('PushPlus 推送失败:', error.message);
    return { success: false, msg: error.message || '推送请求异常' };
  } finally {
    clearTimeout(timer);
  }
}

// 预警：仅对真实行情（非估算）判断；阈值 ≥1% 无上限；
// 同一天、同方向的重复预警需价格相对上次预警价再移动 0.5%
export function evaluateAlert(domestic, lastAlert) {
  if (!domestic || domestic.estimated || !isNum(domestic.changePercent)) return false;
  const pct = domestic.changePercent;
  if (Math.abs(pct) < ALERT.thresholdPercent) return false;

  const direction = pct >= 0 ? 'up' : 'down';
  if (lastAlert && lastAlert.date === shanghaiDate(Date.now()) && lastAlert.direction === direction) {
    const move = Math.abs((domestic.price - lastAlert.price) / lastAlert.price) * 100;
    if (move < ALERT.repeatMovePercent) return false;
  }
  return true;
}

export async function isScheduledPushDue(env) {
  const last = await getState(env, 'lastScheduledPush');
  return !last || Date.now() - last >= ALERT.scheduledMinGapMs;
}

async function recordPush(env, dom, pushType) {
  const now = Date.now();
  await setState(env, 'lastPush', { price: dom.price, time: now, type: pushType });
  if (pushType === 'scheduled') await setState(env, 'lastScheduledPush', now);
  if (pushType === 'alert') {
    await setState(env, 'lastAlert', {
      price: dom.price,
      direction: dom.changePercent >= 0 ? 'up' : 'down',
      time: now,
      date: shanghaiDate(now),
    });
  }
}

// 先发价格（附量化信号）；价格发送成功后再异步发送 AI 分析
export async function executePush(env, snapshot, pushType = 'scheduled', waitUntil = null) {
  const dom = snapshot.domestic;
  if (!dom) return { success: false, msg: '国内金价不可用，已跳过推送' };
  if (pushType === 'alert' && !isNum(dom.changePercent)) {
    return { success: false, msg: '国内价为估算值，无涨跌幅，不发送预警' };
  }

  const quant = await getQuant('cn').catch(() => null);
  const pct = dom.changePercent;
  const priceTitle = pushType === 'alert'
    ? `黄金${pct >= 0 ? '上涨' : '下跌'}${Math.abs(pct).toFixed(2)}% 触发预警`
    : `黄金实时行情 ${isNum(dom.price) ? dom.price.toFixed(2) : '--'}元/克`;

  const priceResult = await sendPush(env, priceTitle, generateQuickPriceHtml(snapshot, pushType, quant?.signal));
  if (!priceResult.success) return priceResult;
  await recordPush(env, dom, pushType);

  const aiTask = (async () => {
    try {
      const analysis = await generateAnalysis(env, snapshot, quant);
      const title = `AI智能分析 ${modelLabel(analysis.model)}`;
      await sendPush(env, title, generatePushHtml(snapshot, analysis.analysis, pushType, quant?.signal));
    } catch (error) {
      console.error('AI分析推送失败:', error.message);
    }
  })();

  if (waitUntil) waitUntil(aiTask);
  else await aiTask;
  return priceResult;
}

// 一次完整的监控周期（Cron 与 /api/monitor 共用）
export async function runMonitorCycle(env, waitUntil = null) {
  const snapshot = await getSnapshot();
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

export async function readPushStatus(env) {
  const lastPush = await getState(env, 'lastPush');
  const lastScheduled = await getState(env, 'lastScheduledPush');
  const lastAlert = await getState(env, 'lastAlert');
  const now = Date.now();
  return {
    lastPushPrice: lastPush?.price ?? null,
    lastPushTime: lastPush ? new Date(lastPush.time).toISOString() : null,
    lastScheduledPush: lastScheduled ? new Date(lastScheduled).toISOString() : null,
    lastAlertPrice: lastAlert?.price ?? null,
    nextScheduledPush: lastScheduled ? new Date(lastScheduled + ALERT.scheduledMinGapMs).toISOString() : '立即可推送',
    canScheduledPush: !lastScheduled || now - lastScheduled >= ALERT.scheduledMinGapMs,
    timeSinceLastPush: lastPush ? `${Math.floor((now - lastPush.time) / 1000)}秒` : null,
  };
}

