<template>
  <div class="app">
    <a class="skip-link" href="#main">跳到主要内容</a>

    <!-- 顶部主导航栏 -->
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
      @poster="showPoster = true"
      @calc="scrollToCalc"
      @alert="showAlerts = true"
    />

    <!-- 四幕电影级全景叙事与粘性滚轨 (Hero -> Recipe -> Adv 460vh 粘性滚轨 -> Essentials) -->
    <PlumeCinematicTrack
      :domestic-price="domestic?.price"
      :intl-price="international?.price"
    />

    <!-- 第五部分：实盘量化投研终端工作台 (#workspace) -->
    <div id="workspace" class="workspace-section">
      <!-- 实时全景跑马灯与快捷控制条 -->
      <GlobalTickerBar
        :snapshot="snapshot"
        :countdown="countdown"
        :poll-interval="pollInterval"
        :alert-count="alerts.length"
        @set-interval="setPollInterval"
        @open-alert="showAlerts = true"
        @open-calc="scrollToCalc"
      />

      <!-- 浮动实时告警 Toast -->
      <transition name="toast-fade">
        <div v-if="activeNotice" class="toast-alert" role="alert">
          <div class="toast-icon">🚨</div>
          <div class="toast-content">
            <b class="toast-title">{{ activeNotice.title }}</b>
            <p class="toast-desc">{{ activeNotice.body }}</p>
          </div>
          <button type="button" class="toast-close" @click="activeNotice = null">✕</button>
        </div>
      </transition>

      <main id="main" class="container main">
      <div v-if="message && status !== 'live'" class="alert" :class="`alert-${status}`" role="status">
        {{ message }}
      </div>

      <!-- 01 行情全景看板 -->
      <section id="sec-overview" class="block" aria-labelledby="sec-overview">
        <div class="section-header">
          <div class="section-title">
            <span class="sec-badge">01</span>
            <h2>实时行情矩阵 · MARKET OVERVIEW</h2>
          </div>
          <div class="header-action-row">
            <button type="button" class="btn btn-ghost btn-xs" @click="showPoster = true">
              ✦ 分享研报海报
            </button>
          </div>
        </div>

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

      <!-- 02 AI 量化深度研报（分析运行后展示） -->
      <section v-if="analysis.state !== 'idle'" class="block" aria-labelledby="sec-report">
        <div class="section-header">
          <div class="section-title">
            <span class="sec-badge">AI</span>
            <h2>机构级量化推演与实战策略报告</h2>
          </div>
        </div>
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

      <!-- 03 多因子量化技术面全景矩阵 -->
      <section class="block" aria-labelledby="sec-quant">
        <div class="section-header">
          <div class="section-title">
            <span class="sec-badge">02</span>
            <h2>多因子量化技术矩阵 · TECHNICAL MATRIX</h2>
          </div>
        </div>

        <TechnicalMatrix :quant="cnQuant" />

        <div class="analytics-grid" style="margin-top: 16px;">
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

      <!-- 04 图表工作台与实盘回测 -->
      <section class="block" aria-labelledby="sec-charts">
        <div class="section-header">
          <div class="section-title">
            <span class="sec-badge">03</span>
            <h2>交互图表与实盘回测 · CHARTS & BACKTESTING</h2>
          </div>
        </div>
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

      <!-- 05 黄金投资变现计算器与 52 周极值 -->
      <section class="block" aria-labelledby="sec-tools">
        <div class="section-header">
          <div class="section-title">
            <span class="sec-badge">04</span>
            <h2>实战工具与周期极值 · TOOLS & RANGE</h2>
          </div>
        </div>

        <div class="tools-grid">
          <!-- 黄金计算器 -->
          <GoldCalculator :domestic-price="domestic?.price" />
          <!-- 52周区间与多周期收益率阶梯 -->
          <HistoricalRange :bars="cnQuant?.bars" :current-price="domestic?.price" />
        </div>
      </section>
    </main>

    <!-- 底部状态与版权 -->
    <AppFooter :latency="latency" />
    </div>

    <!-- 弹窗组件群 -->
    <SubscribeModal :open="showSubscribe" @close="showSubscribe = false" />
    <SourcesDrawer :open="showSources" :sources="sources" :checks="crossChecks" @close="showSources = false" />
    <PriceAlertModal
      :open="showAlerts"
      :alerts="alerts"
      @close="showAlerts = false"
      @add="addAlert"
      @remove="removeAlert"
      @toggle="toggleAlert"
      @clear="clearTriggered"
    />
    <SharePosterModal
      :open="showPoster"
      :snapshot="snapshot"
      :quant="cnQuant"
      @close="showPoster = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import AppHeader from './components/AppHeader.vue';
import PlumeCinematicTrack from './components/PlumeCinematicTrack.vue';
import GlobalTickerBar from './components/GlobalTickerBar.vue';
import PriceCard from './components/PriceCard.vue';
import AiCard from './components/AiCard.vue';
import SignalPanel from './components/SignalPanel.vue';
import RiskTiles from './components/RiskTiles.vue';
import TechnicalMatrix from './components/TechnicalMatrix.vue';
import GoldCalculator from './components/GoldCalculator.vue';
import HistoricalRange from './components/HistoricalRange.vue';
import ChartWorkspace from './components/ChartWorkspace.vue';
import AnalysisReport from './components/AnalysisReport.vue';
import SourcesDrawer from './components/SourcesDrawer.vue';
import AppFooter from './components/AppFooter.vue';
import SubscribeModal from './components/SubscribeModal.vue';
import PriceAlertModal from './components/PriceAlertModal.vue';
import SharePosterModal from './components/SharePosterModal.vue';

import { useMarket } from './composables/useMarket';
import { useQuant } from './composables/useQuant';
import { useTheme } from './composables/useTheme';
import { useAlerts } from './composables/useAlerts';
import { requestAnalysis } from './api';
import { fmtNumber, fmtInt, fmtPercent, toneOf } from './format';

const {
  snapshot,
  status,
  message,
  ageSeconds,
  now,
  latency,
  pollInterval,
  countdown,
  setPollInterval,
  refresh: refreshPrices,
} = useMarket();

const { cn: cnQuant, intl: intlQuant, cnError, intlError, loadingCn, loadingIntl, refreshQuant } = useQuant();
const { resolved, toggle } = useTheme();
const { alerts, activeNotice, addAlert, removeAlert, toggleAlert, clearTriggered, checkPrice } = useAlerts();

// 自动对碰价格预警规则
watch(snapshot, (val) => {
  if (val) checkPrice(val);
}, { immediate: true });

const showSubscribe = ref(false);
const showSources = ref(false);
const showAlerts = ref(false);
const showPoster = ref(false);

function refreshAll() {
  refreshPrices();
  refreshQuant();
}

function scrollToCalc() {
  const el = document.getElementById('gold-calculator');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
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

async function runAnalysis(requestedModel) {
  if (analysis.value.state === 'loading') return;
  analysis.value = { ...analysis.value, state: 'loading', error: '' };

  try {
    const data = await requestAnalysis({ model: requestedModel || 'deepseek-r1', force: true });
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
      // 平滑滚到研报区域
      setTimeout(() => {
        const el = document.getElementById('report');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
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
  padding-bottom: 24px;
}

.block {
  margin-top: 36px;
}
.block:first-child {
  margin-top: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  gap: 16px;
  flex-wrap: wrap;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sec-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  font-stretch: 115%;
  font-family: 'Archivo', var(--mono);
  color: #000000;
  background: var(--gold-btn);
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.35);
}

.section-title h2 {
  margin: 0;
  font-family: 'Archivo', var(--font);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #ffffff;
}

.btn-xs {
  height: 28px;
  padding: 0 10px;
  font-size: 11px;
  border-radius: 6px;
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

.tools-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 1024px) {
  .tools-grid {
    grid-template-columns: 1.15fr 1fr;
  }
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

/* 浮动预警 Toast */
.toast-alert {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 99;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(30, 20, 20, 0.98), rgba(20, 10, 10, 0.98));
  border: 1px solid rgba(239, 68, 68, 0.45);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(239, 68, 68, 0.25);
  backdrop-filter: blur(12px);
  max-width: 420px;
}

.toast-icon {
  font-size: 24px;
  animation: pulse-ring 1s infinite;
}

.toast-content {
  flex: 1;
}

.toast-title {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
}

.toast-desc {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--text-2);
}

.toast-close {
  background: transparent;
  border: none;
  color: var(--text-3);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
}
.toast-close:hover {
  color: #ffffff;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(16px);
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
    grid-column: span 4;
  }

  .hero-intl {
    grid-column: span 4;
  }

  .hero-ai {
    grid-column: span 4;
  }

  .an-signal {
    grid-column: span 5;
  }

  .an-tiles {
    grid-column: span 7;
  }
}
</style>
