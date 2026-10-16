/**
 * ============================================================
 * 行情数据：轮询、状态机与失败降级
 * - 失败时保留上一次成功的数据，并明确标注"数据延迟"，不假装是最新价
 * - 页面隐藏时暂停轮询，重新可见时立即刷新
 * - 同一时刻只允许一个请求在途，避免重叠
 * ============================================================
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { fetchPrices } from '../api';
import { fmtClock } from '../format';

const POLL_MS = 30_000;

// status: loading（首次加载）| live（完整）| partial（部分缺失或为估算）| stale（失败，沿用旧数据）| error（无可用数据）
function describe(data) {
  const hasIntl = Boolean(data.international);
  const hasDom = Boolean(data.domestic);
  if (!hasIntl && !hasDom) return { status: 'error', message: '行情暂不可用，请稍后刷新' };

  const notes = [];
  if (!hasIntl) notes.push('国际金价暂不可用');
  if (!hasDom) notes.push('国内金价暂不可用');
  if (hasDom && data.domestic.estimated) notes.push('国内价为汇率估算值，无涨跌数据，不触发预警');

  return notes.length ? { status: 'partial', message: notes.join('；') } : { status: 'live', message: '' };
}

export function useMarket() {
  const snapshot = ref(null);
  const status = ref('loading');
  const message = ref('');
  const updatedAt = ref(null);
  const latency = ref(null);
  const now = ref(Date.now());

  const ageSeconds = computed(() =>
    updatedAt.value ? Math.max(0, Math.floor((now.value - updatedAt.value.getTime()) / 1000)) : null
  );

  let pollTimer = null;
  let clockTimer = null;
  let inFlight = null;

  function fail(text) {
    if (snapshot.value) {
      status.value = 'stale';
      message.value = `${text}，当前显示 ${fmtClock(updatedAt.value)} 的数据`;
    } else {
      status.value = 'error';
      message.value = text;
    }
  }

  function refresh() {
    if (inFlight) return inFlight;

    const started = performance.now();
    inFlight = fetchPrices()
      .then((data) => {
        latency.value = Math.round(performance.now() - started);
        if (data.international || data.domestic) {
          snapshot.value = data;
          updatedAt.value = new Date();
          const state = describe(data);
          status.value = state.status;
          message.value = state.message;
        } else {
          fail('行情暂不可用');
        }
      })
      .catch((error) => {
        fail(error?.response ? '行情服务暂时异常' : '无法连接行情服务');
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  }

  const onVisibility = () => {
    if (!document.hidden) refresh();
  };

  onMounted(() => {
    refresh();
    pollTimer = setInterval(() => {
      if (!document.hidden) refresh();
    }, POLL_MS);
    clockTimer = setInterval(() => {
      now.value = Date.now();
    }, 1000);
    document.addEventListener('visibilitychange', onVisibility);
  });

  onUnmounted(() => {
    clearInterval(pollTimer);
    clearInterval(clockTimer);
    document.removeEventListener('visibilitychange', onVisibility);
  });

  return { snapshot, status, message, updatedAt, latency, ageSeconds, now, refresh };
}
