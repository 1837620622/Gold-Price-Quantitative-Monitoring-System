/**
 * ============================================================
 * 行情数据：轮询、状态机、多频自动刷新与声效联动
 * - 失败时保留上一次成功的数据，并明确标注"数据延迟"，不假装是最新价
 * - 页面隐藏时暂停轮询，重新可见时立即刷新
 * - 同一时刻只允许一个请求在途，避免重叠
 * - 支持自定义刷新频率（10s / 30s / 60s / 手动暂停）
 * ============================================================
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { fetchPrices } from '../api';
import { fmtClock } from '../format';
import { playTickSound } from '../lib/sound';
import { t } from '../i18n';

const STORAGE_INTERVAL_KEY = 'gold_monitor_poll_interval';

function getStoredInterval() {
  try {
    const v = localStorage.getItem(STORAGE_INTERVAL_KEY);
    return v !== null ? Number(v) : 30; // 默认 30 秒
  } catch {
    return 30;
  }
}

// status: loading（首次加载）| live（完整）| partial（部分缺失或为估算）| stale（失败，沿用旧数据）| error（无可用数据）
function describe(data) {
  const hasIntl = Boolean(data.international);
  const hasDom = Boolean(data.domestic);
  if (!hasIntl && !hasDom) return { status: 'error', message: t('marketLoad.unavailable') };

  const notes = [];
  if (!hasIntl) notes.push(t('marketLoad.intlUnavailable'));
  if (!hasDom) notes.push(t('marketLoad.domUnavailable'));
  if (hasDom && data.domestic.estimated) notes.push(t('marketLoad.domEstimated'));

  return notes.length ? { status: 'partial', message: notes.join(t('marketLoad.noteSep')) } : { status: 'live', message: '' };
}

export function useMarket() {
  const snapshot = ref(null);
  const status = ref('loading');
  const message = ref('');
  const updatedAt = ref(null);
  const latency = ref(null);
  const now = ref(Date.now());

  // 轮询控制：秒数（0 表示暂停）
  const pollInterval = ref(getStoredInterval());
  const countdown = ref(pollInterval.value);

  const ageSeconds = computed(() =>
    updatedAt.value ? Math.max(0, Math.floor((now.value - updatedAt.value.getTime()) / 1000)) : null
  );

  let pollTimer = null;
  let clockTimer = null;
  let inFlight = null;
  let prevDomesticPrice = null;

  function fail(text) {
    if (snapshot.value) {
      status.value = 'stale';
      message.value = t('marketLoad.showingAt', { text, time: fmtClock(updatedAt.value) });
    } else {
      status.value = 'error';
      message.value = text;
    }
  }

  function setPollInterval(secs) {
    pollInterval.value = secs;
    countdown.value = secs;
    try {
      localStorage.setItem(STORAGE_INTERVAL_KEY, String(secs));
    } catch {}
    resetPollTimer();
  }

  function refresh() {
    if (inFlight) return inFlight;

    const started = performance.now();
    inFlight = fetchPrices()
      .then((data) => {
        latency.value = Math.round(performance.now() - started);
        if (data.international || data.domestic) {
          const newPrice = data.domestic?.price || data.international?.price;
          if (prevDomesticPrice !== null && newPrice !== null && newPrice !== prevDomesticPrice) {
            playTickSound(newPrice > prevDomesticPrice);
          }
          prevDomesticPrice = newPrice;

          snapshot.value = data;
          updatedAt.value = new Date();
          countdown.value = pollInterval.value;
          const state = describe(data);
          status.value = state.status;
          message.value = state.message;
        } else {
          fail(t('marketLoad.unavailableShort'));
        }
      })
      .catch((error) => {
        fail(error?.response ? t('marketLoad.serviceError') : t('marketLoad.connectError'));
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  }

  function resetPollTimer() {
    if (pollTimer) clearInterval(pollTimer);
    if (pollInterval.value <= 0) return;

    pollTimer = setInterval(() => {
      if (!document.hidden && pollInterval.value > 0) {
        refresh();
      }
    }, pollInterval.value * 1000);
  }

  const onVisibility = () => {
    if (!document.hidden) refresh();
  };

  onMounted(() => {
    refresh();
    resetPollTimer();

    clockTimer = setInterval(() => {
      now.value = Date.now();
      if (pollInterval.value > 0 && countdown.value > 0) {
        countdown.value--;
      }
    }, 1000);

    document.addEventListener('visibilitychange', onVisibility);
  });

  onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer);
    if (clockTimer) clearInterval(clockTimer);
    document.removeEventListener('visibilitychange', onVisibility);
  });

  return {
    snapshot,
    status,
    message,
    updatedAt,
    latency,
    ageSeconds,
    now,
    pollInterval,
    countdown,
    setPollInterval,
    refresh,
  };
}
