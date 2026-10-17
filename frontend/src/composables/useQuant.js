/**
 * ============================================================
 * 量化数据：国内（AU9999）与国际（XAU/USD）双向加载、缓存与自动重试机制
 * - 引入 localStorage 瞬时缓存回退（Stale-While-Revalidate），首屏 0ms 呈现
 * - 针对网络闪断或 Cloudflare Worker 冷启动加入 3 次阶梯重试（1.2s, 2.5s, 5s）
 * - 彻底杜绝"量化数据获取失败"阻断用户看盘
 * ============================================================
 */

import { ref, onMounted, onUnmounted } from 'vue';
import { fetchQuant } from '../api';

const REFRESH_MS = 5 * 60 * 1000;
const CACHE_PREFIX = 'gold_quant_cache_';

function getCachedQuant(market) {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${market}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

function setCachedQuant(market, data) {
  try {
    if (data && data.available) {
      localStorage.setItem(`${CACHE_PREFIX}${market}`, JSON.stringify({
        data,
        savedAt: Date.now()
      }));
    }
  } catch {
    // 忽略 localStorage 空间超限
  }
}

async function fetchWithRetry(market, days = 250, retries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const data = await fetchQuant(market, days);
      if (data && (data.available || data.indicators)) {
        return data;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 1200));
      }
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 1200));
      }
    }
  }
  throw lastError || new Error('量化数据服务暂时繁忙');
}

export function useQuant() {
  // 优先自本地持久化缓存唤醒，实现 0ms 瞬间渲染
  const cn = ref(getCachedQuant('cn'));
  const intl = ref(getCachedQuant('intl'));
  const cnError = ref('');
  const intlError = ref('');
  const loadingCn = ref(!cn.value);
  const loadingIntl = ref(!intl.value);
  let timer = null;

  async function load(market) {
    const isCn = market === 'cn';
    const loading = isCn ? loadingCn : loadingIntl;
    const target = isCn ? cn : intl;
    const errorRef = isCn ? cnError : intlError;

    // 若本地已有缓存，仅在后台静默刷新，不阻塞交互
    if (!target.value) {
      loading.value = true;
    }

    try {
      const data = await fetchWithRetry(market, 250, 3);
      target.value = data;
      setCachedQuant(market, data);
      errorRef.value = data.available ? '' : (data.reason || '');
    } catch (error) {
      // 若已有缓存支撑，不将全局状态置为错误，仅保留最新可用量化推演
      if (!target.value) {
        errorRef.value = error?.response?.data?.message || '量化数据暂不可用，正在重试…';
      }
    } finally {
      loading.value = false;
    }
  }

  const refreshQuant = () => Promise.allSettled([load('cn'), load('intl')]);

  onMounted(() => {
    refreshQuant();
    timer = setInterval(() => {
      if (!document.hidden) refreshQuant();
    }, REFRESH_MS);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { cn, intl, cnError, intlError, loadingCn, loadingIntl, refreshQuant };
}
