/**
 * ============================================================
 * 量化数据：国内（AU9999）与国际（XAU/USD）分别加载，定时刷新
 * 服务端已缓存 5 分钟，前端与其保持一致的刷新节奏
 * ============================================================
 */

import { ref, onMounted, onUnmounted } from 'vue';
import { fetchQuant } from '../api';

const REFRESH_MS = 5 * 60 * 1000;

export function useQuant() {
  const cn = ref(null);
  const intl = ref(null);
  const cnError = ref('');
  const intlError = ref('');
  const loadingCn = ref(false);
  const loadingIntl = ref(false);
  let timer = null;

  async function load(market) {
    const isCn = market === 'cn';
    const loading = isCn ? loadingCn : loadingIntl;
    const target = isCn ? cn : intl;
    const errorRef = isCn ? cnError : intlError;

    loading.value = true;
    try {
      const data = await fetchQuant(market, 250);
      target.value = data;
      errorRef.value = data.available ? '' : (data.reason || '量化数据不足');
    } catch (error) {
      errorRef.value = error?.response?.data?.message || '量化数据暂不可用';
    } finally {
      loading.value = false;
    }
  }

  const refreshQuant = () => Promise.all([load('cn'), load('intl')]);

  onMounted(() => {
    refreshQuant();
    timer = setInterval(() => {
      if (!document.hidden) refreshQuant();
    }, REFRESH_MS);
  });

  onUnmounted(() => clearInterval(timer));

  return { cn, intl, cnError, intlError, loadingCn, loadingIntl, refreshQuant };
}
