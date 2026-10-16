<template>
  <div class="app">
    <a class="skip-link" href="#main">跳到主要内容</a>

    <AppHeader
      :status="status"
      :theme="resolved"
      :age-seconds="ageSeconds"
      :now="now"
      :sources-ok="sourcesOk"
      :sources-total="sourcesTotal"
      :snapshot="snapshot"
      :quant="cnQuant"
      @refresh="refreshAll"
      @toggle-theme="toggle"
      @subscribe="showSubscribe = true"
      @sources="showSources = true"
    />

    <main id="main" class="container main">
      <div v-if="message && status !== 'live'" class="alert" :class="`alert-${status}`" role="status">
        {{ message }}
      </div>

      <!-- 01 行情概览 -->
      <section class="block" aria-labelledby="sec-overview">
        <h2 id="sec-overview" class="section-title"><span>01</span>行情概览</h2>
        <div class="hero-grid">
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
            :sparkline="cnSpark"
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
            :sparkline="intlSpark"
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
        </div>
      </section>

      <!-- 02 量化信号与指标 -->
      <section class="block" aria-labelledby="sec-quant">
        <h2 id="sec-quant" class="section-title"><span>02</span>量化信号与指标</h2>
        <div class="analytics-grid">
          <SignalPanel
            v-if="cnQuant?.available"
            class="an-signal"
            :signal="cnQuant.signal"
            :levels="cnQuant.levels"
            :as-of="cnQuant.asOf"
          />
          <div v-else class="card notice-card an-signal">
            {{ cnError || '量化信号计算中…' }}
          </div>
          <RiskTiles v-if="cnQuant?.available" class="an-tiles" :quant="cnQuant" />
        </div>
      </section>

      <!-- 03 图表工作台 -->
      <section class="block" aria-labelledby="sec-charts">
        <h2 id="sec-charts" class="section-title"><span>03</span>图表与回测</h2>
        <ChartWorkspace
          :cn="cnQuant"
          :intl="intlQuant"
          :cn-error="cnError"
          :intl-error="intlError"
          :loading-cn="loadingCn"
          :loading-intl="loadingIntl"
          :theme="resolved"
        />
      </section>

      <!-- 04 AI 报告 -->
      <section v-if="analysis.state !== 'idle'" class="block" aria-labelledby="sec-report">
        <h2 id="sec-report" class="section-title"><span>04</span>AI 分析报告</h2>
        <AnalysisReport
          id="report"
          :state="analysis.state"
          :text="analysis.text"
          :model="analysis.model"
          :timestamp="analysis.timestamp"
          :cached="analysis.cached"
          :error="analysis.error"
          :quant="analysis.quant"
        />
      </section>
    </main>

    <AppFooter :latency="latency" />

    <SubscribeModal :open="showSubscribe" @close="showSubscribe = false" />
    <SourcesDrawer :open="showSources" :sources="sources" :checks="crossChecks" @close="showSources = false" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import AppHeader from './components/AppHeader.vue';
import PriceCard from './components/PriceCard.vue';
import AiCard from './components/AiCard.vue';
import SignalPanel from './components/SignalPanel.vue';
import RiskTiles from './components/RiskTiles.vue';
import ChartWorkspace from './components/ChartWorkspace.vue';
import AnalysisReport from './components/AnalysisReport.vue';
import SourcesDrawer from './components/SourcesDrawer.vue';
import AppFooter from './components/AppFooter.vue';
import SubscribeModal from './components/SubscribeModal.vue';
import { useMarket } from './composables/useMarket';
import { useQuant } from './composables/useQuant';
import { useTheme } from './composables/useTheme';
import { requestAnalysis } from './api';
import { fmtNumber, fmtInt, fmtPercent, toneOf } from './format';

const { snapshot, status, message, ageSeconds, now, latency, refresh: refreshPrices } = useMarket();
const { cn: cnQuant, intl: intlQuant, cnError, intlError, loadingCn, loadingIntl, refreshQuant } = useQuant();
const { resolved, toggle } = useTheme();

const showSubscribe = ref(false);
const showSources = ref(false);

function refreshAll() {
  refreshPrices();
  refreshQuant();
}

// ------------------------------------------------------------
// 派生数据
// ------------------------------------------------------------
const domestic = computed(() => snapshot.value?.domestic ?? null);
const international = computed(() => snapshot.value?.international ?? null);
const fx = computed(() => snapshot.value?.fx ?? null);
const premiumPercent = computed(() => snapshot.value?.premiumPercent ?? null);
const loading = computed(() => status.value === 'loading');
const aiUnavailable = computed(() => !loading.value && !domestic.value);

const cnSpark = computed(() => (cnQuant.value?.bars ?? []).slice(-60).map((b) => b.close));
const intlSpark = computed(() => (intlQuant.value?.bars ?? []).slice(-60).map((b) => b.close));

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
  const silver = international.value?.silverPrice;
  return [
    { label: '白银 XAG', value: silver != null ? `$${fmtNumber(silver)}` : '--' },
    { label: 'USD / CNY', value: fmtNumber(fx.value?.usdCny, 4) },
    { label: '国内溢价', value: fmtPercent(premiumPercent.value), tone: toneOf(premiumPercent.value) },
  ];
});

const sources = computed(() => snapshot.value?.sources ?? []);
const activeSources = computed(() => sources.value.filter((s) => s.status !== 'idle'));
const sourcesOk = computed(() => activeSources.value.filter((s) => s.status === 'ok').length);
const sourcesTotal = computed(() => activeSources.value.length);
const crossChecks = computed(() => snapshot.value?.crossChecks ?? []);

// ------------------------------------------------------------
// AI 分析：生成、展示与错误处理
// ------------------------------------------------------------
const analysis = ref({
  state: 'idle', // idle | loading | done | error
  text: '',
  model: '',
  timestamp: '',
  cached: false,
  error: '',
  quant: null,
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
        quant: data.quant ?? null,
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

.block {
  margin-top: 36px;
}

.block:first-child {
  margin-top: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-2);
}

.section-title span {
  display: inline-grid;
  place-items: center;
  min-width: 26px;
  height: 22px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--gold);
  background: color-mix(in srgb, var(--gold) 14%, transparent);
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
  min-width: 0;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.an-signal,
.an-tiles {
  grid-column: span 12;
  min-width: 0;
}

.notice-card {
  color: var(--text-2);
  font-size: 14px;
  text-align: center;
  padding: 36px 20px;
}

.alert {
  margin-bottom: 20px;
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

  .an-signal,
  .an-tiles {
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

  .an-signal {
    grid-column: span 5;
  }

  .an-tiles {
    grid-column: span 7;
  }
}
</style>
