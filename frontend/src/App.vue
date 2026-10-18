<template>
  <div class="app">
    <a class="skip-link" href="#main">{{ t('app.skip') }}</a>

    <!-- 页面滚动进度：顶部一条金色细线 -->
    <div class="scroll-meter" aria-hidden="true">
      <span ref="meterRef" class="scroll-meter-fill"></span>
    </div>

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

    <!-- 金库开场：首屏只有大字与金条/金币，向下滚动进入金库，远墙为实时 K 线 -->
    <JourneyHero
      :domestic-price="domestic?.price ?? null"
      :intl-price="international?.price ?? null"
      :premium-percent="premiumPercent"
      :bars="cnQuant?.bars ?? []"
    />

    <!-- 模块索引：每个模块对应下方一个仪表盘区块 -->
    <div class="container">
      <ModulesIndex :cn="cnQuant" />
    </div>

    <!-- 仪表盘工作台 (#workspace) -->
    <div id="workspace" class="workspace-section">
      <!-- 实时跑马灯与快捷控制条 -->
      <GlobalTickerBar
        :snapshot="snapshot"
        :countdown="countdown"
        :poll-interval="pollInterval"
        :alert-count="alerts.length"
        @set-interval="setPollInterval"
        @open-alert="showAlerts = true"
        @open-calc="scrollToCalc"
      />

      <!-- 浮动实时告警 -->
      <transition name="toast-fade">
        <div v-if="activeNotice" class="toast-alert" role="alert">
          <span class="toast-dot" aria-hidden="true"></span>
          <div class="toast-content">
            <b class="toast-title">{{ activeNotice.title }}</b>
            <p class="toast-desc">{{ activeNotice.body }}</p>
          </div>
          <button type="button" class="toast-close" :aria-label="t('app.toastClose')" @click="activeNotice = null">
            <Icon name="close" :size="14" />
          </button>
        </div>
      </transition>

      <main id="main" class="container main">
        <div v-if="message && status !== 'live'" class="alert" :class="`alert-${status}`" role="status">
          {{ message }}
        </div>

        <!-- 01 实时行情 -->
        <section id="sec-overview" class="block" data-reveal aria-labelledby="title-overview">
          <SectionHead
            index="01"
            :tag="t('section.marketTag')"
            :title="t('section.market')"
            title-id="title-overview"
            :sub="t('section.marketSub')"
          >
            <button type="button" class="btn btn-ghost btn-sm" @click="showPoster = true">{{ t('action.poster') }}</button>
          </SectionHead>

          <div class="hero-grid">
            <PriceCard
              class="hero-cn"
              code="AU9999"
              :name="t('quote.domesticName')"
              :tag="domestic?.estimated ? t('quote.estimated') : 'CNY'"
              :unit="t('quote.unitCnyGram')"
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
              :name="t('quote.intlName')"
              tag="SPOT"
              :unit="t('quote.unitUsdOunce')"
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
              id="sec-ai"
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

        <!-- AI 研报（运行分析后出现） -->
        <section v-if="analysis.state !== 'idle'" id="sec-report" class="block" aria-labelledby="title-report">
          <SectionHead
            index="AI"
            :tag="t('section.briefTag')"
            :title="t('section.brief')"
            title-id="title-report"
            :sub="t('section.briefSub')"
          />
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

        <!-- 02 技术矩阵与信号 -->
        <section id="sec-quant" class="block" data-reveal aria-labelledby="title-quant">
          <SectionHead
            index="02"
            :tag="t('section.signalsTag')"
            :title="t('section.signals')"
            title-id="title-quant"
            :sub="t('section.signalsSub')"
          />

          <TechnicalMatrix :quant="cnQuant" />

          <div class="analytics-grid">
            <SignalPanel
              v-if="cnQuant?.available"
              class="an-signal"
              :signal="cnQuant.signal"
              :levels="cnQuant.levels"
              :as-of="cnQuant.asOf"
            />
            <div v-else class="card notice-card an-signal">
              {{ cnError || t('quant.computing') }}
            </div>
            <div v-if="cnQuant?.available" class="an-side">
              <RiskTiles :quant="cnQuant" />
              <PivotLadder
                v-if="cnQuant.levels?.pivots"
                :pivots="cnQuant.levels.pivots"
                :price="domestic?.price ?? null"
              />
            </div>
          </div>
        </section>

        <!-- 03 图表与回测 -->
        <section id="sec-charts" class="block" data-reveal aria-labelledby="title-charts">
          <SectionHead
            index="03"
            :tag="t('section.chartsTag')"
            :title="t('section.charts')"
            title-id="title-charts"
            :sub="t('section.chartsSub')"
          />
          <div>
            <ChartWorkspace
              :cn="cnQuant"
              :intl="intlQuant"
              :cn-error="cnError"
              :intl-error="intlError"
              :loading-cn="loadingCn"
              :loading-intl="loadingIntl"
              :theme="resolved"
            />
          </div>
        </section>

        <!-- 04 实战工具 -->
        <section id="sec-tools" class="block" data-reveal aria-labelledby="title-tools">
          <SectionHead
            index="04"
            :tag="t('section.toolsTag')"
            :title="t('section.tools')"
            title-id="title-tools"
            :sub="t('section.toolsSub')"
          />

          <div class="tools-grid">
            <GoldCalculator
              :domestic-price="domestic?.price"
              :intl-price="international?.price"
              :fx-rate="snapshot?.fx?.usdCny"
              :premium-percent="snapshot?.premiumPercent"
            />
            <HistoricalRange :bars="cnQuant?.bars" :current-price="domestic?.price" />
          </div>
        </section>

        <!-- 05 提醒与推送：金币落在一行上，点击即设置预警 -->
        <section id="contact" class="block contact" data-reveal aria-labelledby="title-contact">
          <SectionHead
            index="05"
            :tag="t('section.alertsTag')"
            :title="t('section.alerts')"
            title-id="title-contact"
            :sub="t('section.alertsSub')"
          />
          <div class="contact-actions">
            <button type="button" class="pill pill-gold" @click="showAlerts = true">{{ t('contact.setAlert') }}</button>
            <button type="button" class="pill" @click="showSubscribe = true">{{ t('contact.subscribe') }}</button>
          </div>
          <CoinRow :labels="COIN_LABELS" @select="showAlerts = true" />
        </section>
      </main>
    </div>

    <!-- 底部状态与版权 -->
    <AppFooter :latency="latency" />

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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import AppHeader from './components/AppHeader.vue';
import JourneyHero from './components/vault/JourneyHero.vue';
import CoinRow from './components/vault/CoinRow.vue';
import ModulesIndex from './components/ModulesIndex.vue';
import SectionHead from './components/SectionHead.vue';
import GlobalTickerBar from './components/GlobalTickerBar.vue';
import PriceCard from './components/PriceCard.vue';
import AiCard from './components/AiCard.vue';
import SignalPanel from './components/SignalPanel.vue';
import RiskTiles from './components/RiskTiles.vue';
import PivotLadder from './components/PivotLadder.vue';
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
import Icon from './components/icons/Icon.vue';

import { useMarket } from './composables/useMarket';
import { useQuant } from './composables/useQuant';
import { useTheme } from './composables/useTheme';
import { useAlerts } from './composables/useAlerts';
import { requestAnalysis } from './api';
import { fmtNumber, fmtInt, fmtPercent, toneOf } from './format';
import { gsap, ScrollTrigger, prefersReducedMotion } from './lib/motion';
import { useI18n } from './i18n';
import { loadGeo } from './lib/geo';

const { t, locale } = useI18n();

const COIN_LABELS = ['AU9999', 'XAU/USD', 'USD/CNY'];

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
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
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
  if (domestic.value?.estimated) return t('quote.estimatedNote');
  if (!domestic.value && !loading.value) return t('quote.domesticMissing');
  return '';
});

const internationalNote = computed(() => {
  if (!international.value && !loading.value) return t('quote.intlMissing');
  return '';
});

const domesticStats = computed(() => {
  const d = domestic.value;
  return [
    { label: t('stats.open'), value: fmtNumber(d?.open) },
    { label: t('stats.high'), value: fmtNumber(d?.high) },
    { label: t('stats.low'), value: fmtNumber(d?.low) },
    { label: t('stats.prevClose'), value: fmtNumber(d?.previousClose) },
    { label: t('stats.volume'), value: d?.volume != null ? t('stats.lots', { n: fmtInt(d.volume) }) : '--' },
  ];
});

const internationalStats = computed(() => {
  const silver = international.value?.silverPrice;
  return [
    { label: t('stats.silver'), value: silver != null ? `$${fmtNumber(silver)}` : '--' },
    { label: 'USD / CNY', value: fmtNumber(fx.value?.usdCny, 4) },
    { label: t('stats.premium'), value: fmtPercent(premiumPercent.value), tone: toneOf(premiumPercent.value) },
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
    const data = await requestAnalysis({ model: requestedModel || 'deepseek-r1', force: true, lang: locale.value });
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
        if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }, 100);
    } else {
      analysis.value = { ...analysis.value, state: 'error', error: data.message || t('app.analysisUnavailable') };
    }
  } catch (error) {
    const text = error?.response?.data?.message || t('app.analysisFailed');
    analysis.value = { ...analysis.value, state: 'error', error: text };
  }
}

// 内容区高度变化（行情到达、研报插入、图表加载）后，重新计算各分区的触发位置
watch(
  () => [loading.value, loadingCn.value, loadingIntl.value, analysis.value.state],
  () => nextTick(() => ScrollTrigger.refresh())
);

// ------------------------------------------------------------
// 滚动进度条与分区入场动效（只播放一次，不做滚动联动）
// ------------------------------------------------------------
const meterRef = ref(null);
let meterFrame = 0;

function updateMeter() {
  meterFrame = 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
  if (meterRef.value) meterRef.value.style.transform = `scaleX(${ratio})`;
}

function onScrollMeter() {
  // 手机端隐藏进度线，不做随滚动变化的效果
  if (window.matchMedia('(max-width: 767px)').matches) return;
  if (!meterFrame) meterFrame = requestAnimationFrame(updateMeter);
}

// 每个分区只淡入一次并上移 12px，不逐项错峰；顶边到达视口 90% 处即播放
function setupReveals() {
  if (prefersReducedMotion()) return;
  document.querySelectorAll('[data-reveal]').forEach((section) => {
    gsap.fromTo(
      section,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
        scrollTrigger: { trigger: section, start: 'top 90%', once: true },
      }
    );
  });
}

// 切换语言时，若已有研报则按新语言重新生成（后端按语言分别缓存）
watch(locale, () => {
  if (analysis.value.state === 'done') runAnalysis();
});

onMounted(async () => {
  // 位置信息用于默认语言与昼夜主题，取到后自动更新
  loadGeo();
  window.addEventListener('scroll', onScrollMeter, { passive: true });
  updateMeter();
  await nextTick();
  setupReveals();
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScrollMeter);
  if (meterFrame) cancelAnimationFrame(meterFrame);
});
</script>

<style scoped>
.scroll-meter {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 120;
  pointer-events: none;
}

.scroll-meter-fill {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--gold);
  transform-origin: 0 50%;
  transform: scaleX(0);
}

.main {
  padding: 0;
}

/* 锚点滚动：分区顶边落在固定页头（及桌面行情条）之下 16px */
.block {
  padding-top: clamp(48px, 6vw, 84px);
  scroll-margin-top: calc(var(--nav-h) + var(--ticker-h) + 16px);
}

.workspace-section {
  scroll-margin-top: calc(var(--nav-h) + var(--ticker-h));
}

#sec-ai,
#report {
  scroll-margin-top: calc(var(--nav-h) + var(--ticker-h) + 16px);
}

.block + .block {
  border-top: 1px solid var(--line);
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
  margin-top: 16px;
  align-items: start;
}

.an-signal,
.an-side {
  grid-column: span 12;
  min-width: 0;
}

.an-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tools-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.notice-card {
  color: var(--text-2);
  font-size: 13px;
  text-align: center;
  padding: 36px 20px;
}

.contact-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: -4px 0 clamp(24px, 3vw, 40px);
}

/* 行情异常提示：单行紧凑，普通文档流（不吸顶、不遮挡内容） */
.alert {
  position: relative;
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  line-height: 1.6;
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

/* 浮动预警：纯色面板 + 发丝边；浮层阴影使用弹层令牌；入场由 transition 完成 */
.toast-alert {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  right: 20px;
  z-index: 99;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 380px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-modal);
}

/* 预警标记：静态金色小点，不做循环动画 */
.toast-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--gold);
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  display: block;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text);
  word-break: keep-all;
}

.toast-desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

/* 中文界面：标题用界面字体、不加字距；说明行高 1.75 */
:lang(zh) .toast-title {
  font-family: var(--font);
  letter-spacing: 0;
}

:lang(zh) .toast-desc {
  line-height: 1.75;
}

/* 关闭钮：36px 触控区，图标 14px，无底色、无边框 */
.toast-close {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  margin: -8px -8px -8px 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  transition: color 0.2s var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .toast-close:hover {
    color: var(--text);
  }
}

/* 预警入场：淡入 + 12px 上移，240ms，只播放一次 */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.24s var(--ease-out), transform 0.24s var(--ease-out);
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (min-width: 768px) {
  .hero-cn,
  .hero-intl {
    grid-column: span 6;
  }
}

@media (min-width: 1024px) {
  .hero-cn,
  .hero-intl,
  .hero-ai {
    grid-column: span 4;
  }

  .an-signal {
    grid-column: span 5;
  }

  .an-side {
    grid-column: span 7;
  }
}

/* ---------- 手机端（767px 及以下）：节奏收紧，进度线让位，预警浮层避开返回顶部按钮 ---------- */
@media (max-width: 767px) {
  .scroll-meter {
    display: none;
  }

  .block {
    padding-top: 40px;
  }

  .notice-card {
    padding: 24px 16px;
  }

  /* 预警浮层：两侧 16px，底边位于返回顶部按钮（底部 20px、高 40px）之上 */
  .toast-alert {
    left: 16px;
    right: auto;
    width: calc(100vw - 32px);
    max-width: none;
    bottom: calc(76px + env(safe-area-inset-bottom, 0px));
    padding: 12px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast-fade-enter-from,
  .toast-fade-leave-to {
    transform: none;
  }
}
</style>
