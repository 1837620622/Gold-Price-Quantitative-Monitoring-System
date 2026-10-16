<template>
  <div class="app">
    <a class="skip-link" href="#main">跳到主要内容</a>

    <AppHeader
      :status="status"
      :theme="resolved"
      :age-seconds="ageSeconds"
      :now="now"
      @refresh="refresh"
      @toggle-theme="toggle"
      @subscribe="showSubscribe = true"
    />

    <main id="main" class="container main">
      <div v-if="message && status !== 'live'" class="alert" :class="`alert-${status}`" role="status">
        {{ message }}
      </div>

      <section class="hero-grid" aria-label="实时行情">
        <PriceCard
          class="hero-cn"
          code="AU9999"
          name="上海黄金交易所 · 国内现货"
          :tag="domestic?.estimated ? '估算' : 'CNY'"
          unit="元 / 克"
          currency="CNY"
          :price="domestic?.price ?? null"
          :change="domestic?.change ?? null"
          :change-percent="domestic?.changePercent ?? null"
          :stats="domesticStats"
          :estimated="Boolean(domestic?.estimated)"
          :loading="loading"
          :note="domesticNote"
          accent="gold"
        />
        <PriceCard
          class="hero-intl"
          code="XAU/USD"
          name="伦敦现货黄金"
          tag="SPOT"
          unit="美元 / 盎司"
          currency="USD"
          :price="international?.price ?? null"
          :change="international?.change ?? null"
          :change-percent="international?.changePercent ?? null"
          :stats="internationalStats"
          :loading="loading"
          :note="internationalNote"
          accent="blue"
        />
        <AiCard
          class="hero-ai"
          :state="analysis.state"
          :timestamp="analysis.timestamp"
          :cached="analysis.cached"
          :error="analysis.error"
          :unavailable="aiUnavailable"
          @run="runAnalysis"
        />
      </section>

      <KlineCard class="section" :theme="resolved" />

      <AnalysisReport
        v-if="analysis.state !== 'idle'"
        id="report"
        class="section"
        :state="analysis.state"
        :text="analysis.text"
        :model="analysis.model"
        :timestamp="analysis.timestamp"
        :cached="analysis.cached"
        :error="analysis.error"
      />
    </main>

    <AppFooter />

    <SubscribeModal :open="showSubscribe" @close="showSubscribe = false" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import AppHeader from './components/AppHeader.vue';
import PriceCard from './components/PriceCard.vue';
import AiCard from './components/AiCard.vue';
import KlineCard from './components/KlineCard.vue';
import AnalysisReport from './components/AnalysisReport.vue';
import AppFooter from './components/AppFooter.vue';
import SubscribeModal from './components/SubscribeModal.vue';
import { useMarket } from './composables/useMarket';
import { useTheme } from './composables/useTheme';
import { requestAnalysis } from './api';
import { fmtNumber, fmtInt, fmtPercent, toneOf } from './format';

const { snapshot, status, message, ageSeconds, now, refresh } = useMarket();
const { resolved, toggle } = useTheme();

const showSubscribe = ref(false);

const domestic = computed(() => snapshot.value?.domestic ?? null);
const international = computed(() => snapshot.value?.international ?? null);
const loading = computed(() => status.value === 'loading');
// 国内价是 AI 分析的必要输入：没有任何行情时禁用分析按钮
const aiUnavailable = computed(() => !loading.value && !domestic.value);

const domesticNote = computed(() => {
  if (domestic.value?.estimated) return '由国际金价 × 汇率换算，并非交易所实时价，不触发涨跌预警';
  if (!domestic.value && !loading.value) return '国内金价暂不可用';
  return '';
});

const internationalNote = computed(() => {
  if (!international.value && !loading.value) return '国际金价暂不可用';
  return '';
});

const domesticStats = computed(() => {
  const d = domestic.value;
  return [
    { label: '开盘', value: fmtNumber(d?.open) },
    { label: '最高', value: fmtNumber(d?.high) },
    { label: '最低', value: fmtNumber(d?.low) },
    { label: '昨收', value: fmtNumber(d?.previousClose) },
    { label: '成交量', value: d?.volume != null ? `${fmtInt(d.volume)} 手` : '--' },
  ];
});

const internationalStats = computed(() => {
  const premium = snapshot.value?.premiumPercent ?? null;
  return [
    { label: '白银 XAG', value: intlSilver() },
    { label: 'USD / CNY', value: fmtNumber(snapshot.value?.fx?.usdCny, 4) },
    { label: '国内溢价', value: fmtPercent(premium), tone: toneOf(premium) },
  ];
});

function intlSilver() {
  const silver = international.value?.silverPrice;
  return silver == null ? '--' : `$${fmtNumber(silver)}`;
}

// ============================================================
// AI 分析：生成、展示与错误处理
// ============================================================
const analysis = ref({
  state: 'idle', // idle | loading | done | error
  text: '',
  model: '',
  timestamp: '',
  cached: false,
  error: '',
});

async function runAnalysis() {
  if (analysis.value.state === 'loading') return;
  analysis.value = { ...analysis.value, state: 'loading', error: '' };

  try {
    const data = await requestAnalysis();
    if (data.success && data.analysis?.analysis) {
      analysis.value = {
        state: 'done',
        text: data.analysis.analysis,
        model: data.analysis.model || '',
        timestamp: data.timestamp,
        cached: Boolean(data.cached),
        error: '',
      };
    } else {
      analysis.value = { ...analysis.value, state: 'error', error: data.message || '分析暂不可用，请稍后重试' };
    }
  } catch (error) {
    const text = error?.response?.data?.message || '分析请求失败，请检查网络后重试';
    analysis.value = { ...analysis.value, state: 'error', error: text };
  }
}
</script>

<style scoped>
.main {
  padding-top: 24px;
  padding-bottom: 8px;
}

.hero-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}

.hero-cn,
.hero-intl,
.hero-ai {
  grid-column: span 12;
}

.section {
  margin-top: 16px;
}

.alert {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: var(--radius);
  font-size: 14px;
  border: 1px solid transparent;
}

.alert-partial,
.alert-stale {
  background: var(--warn-bg);
  color: var(--warn);
}

.alert-error {
  background: var(--danger-bg);
  color: var(--danger);
}

@media (min-width: 768px) {
  .hero-cn,
  .hero-intl {
    grid-column: span 6;
  }
}

@media (min-width: 1024px) {
  .hero-cn {
    grid-column: span 5;
  }

  .hero-intl {
    grid-column: span 4;
  }

  .hero-ai {
    grid-column: span 3;
  }
}
</style>
