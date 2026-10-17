<template>
  <section class="card workspace" aria-labelledby="workspace-title">
    <header class="head">
      <div>
        <h2 id="workspace-title" class="title">{{ t('chartWorkspace.title') }}</h2>
        <p class="sub">{{ subtitle }}</p>
      </div>
      <div class="seg" role="tablist" :aria-label="t('chartWorkspace.typeAria')">
        <button
          v-for="tb in tabItems"
          :key="tb.key"
          type="button"
          role="tab"
          :aria-selected="tab === tb.key"
          :class="{ active: tab === tb.key }"
          @click="tab = tb.key"
        >{{ tb.label }}</button>
      </div>
    </header>

    <!-- K 线：国内 / 国际 -->
    <template v-if="tab === 'cn' || tab === 'intl'">
      <div class="toolbar">
        <div class="seg seg-sm" role="group" :aria-label="t('chartWorkspace.periodAria')">
          <button
            v-for="p in periodItems"
            :key="p.key"
            type="button"
            :class="{ active: period === p.key }"
            :aria-pressed="period === p.key"
            @click="period = p.key"
          >{{ p.label }}</button>
        </div>
        <div class="toggles" role="group" :aria-label="t('chartWorkspace.indicatorAria')">
          <button
            v-for="g in toggleItems"
            :key="g.key"
            type="button"
            class="toggle"
            :class="{ on: toggles[g.key] }"
            :aria-pressed="toggles[g.key]"
            @click="toggleIndicator(g.key)"
          >{{ g.label }}</button>
        </div>
      </div>

      <div v-if="activeError" class="notice">{{ activeError }}</div>
      <KlineChart
        v-else
        :bars="activeQuant?.bars || []"
        :indicators="activeQuant?.indicators || null"
        :toggles="toggles"
        :theme="theme"
        :zoom-start="zoomStart"
        :name="tab === 'cn' ? 'AU9999' : 'XAU/USD'"
        :loading="activeLoading"
      />
    </template>

    <!-- 溢价 -->
    <template v-else-if="tab === 'premium'">
      <div v-if="premium?.available" class="premium-stats">
        <div><span>{{ t('chartWorkspace.premiumNow') }}</span><b :class="toneOf(premium.current)">{{ signedPct(premium.current) }}</b></div>
        <div><span>{{ t('chartWorkspace.premiumMean60') }}</span><b>{{ signedPct(premium.mean60) }}</b></div>
        <div><span>{{ t('chartWorkspace.premiumZ') }}</span><b>{{ fmt(premium.z) }}</b></div>
        <div><span>{{ t('chartWorkspace.premiumPercentile') }}</span><b>{{ fmt(premium.percentile, 0) }}%</b></div>
        <div><span>{{ t('chartWorkspace.sampleRange') }}</span><b>{{ t('chartWorkspace.sampleDays', { count: premium.count }) }}</b></div>
      </div>
      <PremiumChart :series="premiumSeries" :stats="premium" :theme="theme" />
      <p class="note">
        {{ t('chartWorkspace.premiumFormula') }}
        {{ t('chartWorkspace.premiumNote') }}
      </p>
    </template>

    <!-- 金银比率 -->
    <template v-else-if="tab === 'ratio'">
      <div v-if="ratioData" class="premium-stats">
        <div><span>{{ t('chartWorkspace.ratioNow') }}</span><b class="tone-up">{{ fmt(ratioData.current) }}</b></div>
        <div><span>{{ t('chartWorkspace.ratioMean') }}</span><b>{{ fmt(ratioData.mean) }}</b></div>
        <div><span>{{ t('chartWorkspace.premiumPercentile') }}</span><b>{{ fmt(ratioData.percentile, 0) }}%</b></div>
        <div><span>{{ t('chartWorkspace.regime') }}</span><b style="font-size: 14px">{{ tLabel(ratioData.label) }}</b></div>
        <div><span>{{ t('chartWorkspace.pairHint') }}</span><span style="font-size: 12px; margin-top: 4px; display: block; color: var(--text-2)">{{ ratioData.suggestion }}</span></div>
      </div>
      <div v-if="ratioLoading" class="notice">{{ t('chartWorkspace.ratioLoading') }}</div>
      <RatioChart v-else :series="ratioData?.series || []" :stats="ratioData" :theme="theme" />
      <p class="note">
        {{ t('chartWorkspace.ratioFormula') }}
        {{ t('chartWorkspace.ratioNote') }}
      </p>
    </template>

    <!-- TradingView 国际金价走势 -->
    <template v-else-if="tab === 'tradingview'">
      <div class="tradingview-container">
        <iframe 
          src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_gold&symbol=OANDA%3AXAUUSD&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=1a1a24&studies=[]&theme=dark&style=1&timezone=Asia%2FShanghai&withdateranges=1&showpopupbutton=0&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=[]&disabled_features=[]&locale=zh_CN"
          class="chart-iframe"
          frameborder="0"
          allowtransparency="true"
          scrolling="no"
          allowfullscreen
        ></iframe>
      </div>
      <p class="note">
        {{ t('chartWorkspace.tvSource') }}
      </p>
    </template>

    <!-- 回测 -->
    <template v-else>
      <div v-if="activeBacktest?.available">
        <BacktestPanel :backtest="activeBacktest" :theme="theme" />
      </div>
      <div v-else class="notice">{{ tField(activeBacktest, 'reason') || t('chartWorkspace.noBacktest') }}</div>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import KlineChart from './KlineChart.vue';
import PremiumChart from './PremiumChart.vue';
import RatioChart from './RatioChart.vue';
import BacktestPanel from './BacktestPanel.vue';
import { fetchRatio } from '../api';
import { tField, useI18n } from '../i18n';

const { t, tLabel } = useI18n();

const props = defineProps({
  cn: { type: Object, default: null },
  intl: { type: Object, default: null },
  cnError: { type: String, default: '' },
  intlError: { type: String, default: '' },
  loadingCn: { type: Boolean, default: false },
  loadingIntl: { type: Boolean, default: false },
  theme: { type: String, default: 'dark' },
});

// 标签文字按当前语言取值（labelKey），MA / MACD / KDJ / RSI 为通用缩写保持不变
const TABS = [
  { key: 'cn', labelKey: 'chartWorkspace.tabCn' },
  { key: 'tradingview', labelKey: 'chartWorkspace.tabTv' },
  { key: 'intl', labelKey: 'chartWorkspace.tabIntl' },
  { key: 'ratio', labelKey: 'chartWorkspace.tabRatio' },
  { key: 'premium', labelKey: 'chartWorkspace.tabPremium' },
  { key: 'backtest', labelKey: 'chartWorkspace.tabBacktest' },
];
const PERIODS = [
  { key: 30, labelKey: 'chartWorkspace.range30' },
  { key: 90, labelKey: 'chartWorkspace.range90' },
  { key: 180, labelKey: 'chartWorkspace.rangeHalf' },
  { key: 'all', labelKey: 'chartWorkspace.rangeAll' },
];
const TOGGLES = [
  { key: 'ma', label: 'MA' },
  { key: 'boll', labelKey: 'chartWorkspace.indBoll' },
  { key: 'vol', labelKey: 'chartWorkspace.indVolume' },
  { key: 'score', labelKey: 'chartWorkspace.indScore' },
  { key: 'macd', label: 'MACD' },
  { key: 'kdj', label: 'KDJ' },
  { key: 'rsi', label: 'RSI' },
];
const tabItems = computed(() => TABS.map((x) => ({ ...x, label: t(x.labelKey) })));
const periodItems = computed(() => PERIODS.map((x) => ({ ...x, label: t(x.labelKey) })));
const toggleItems = computed(() => TOGGLES.map((x) => ({ ...x, label: x.labelKey ? t(x.labelKey) : x.label })));

const tab = ref('cn');
const period = ref(90);
// 窄屏默认只开 MA 与量化评分，避免窗格过于拥挤；用户可手动增加
const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
const toggles = ref(
  narrow
    ? { ma: true, boll: false, vol: false, score: true, macd: false, kdj: false, rsi: false }
    : { ma: true, boll: false, vol: true, score: true, macd: true, kdj: false, rsi: false }
);

// 整体替换状态对象（而非原地修改），使 KlineChart 的 watch 能感知到变化
function toggleIndicator(key) {
  toggles.value = { ...toggles.value, [key]: !toggles.value[key] };
}

const ratioData = ref(null);
const ratioLoading = ref(false);

async function loadRatio() {
  if (ratioData.value) return;
  ratioLoading.value = true;
  try {
    const data = await fetchRatio(180);
    if (data.success) {
      ratioData.value = data;
    }
  } catch {
    // 降级使用静默模式
  } finally {
    ratioLoading.value = false;
  }
}

watch(tab, (key) => {
  if (key === 'ratio') loadRatio();
});

onMounted(() => {
  loadRatio();
});

const activeQuant = computed(() => (tab.value === 'intl' ? props.intl : props.cn));
const activeError = computed(() => {
  const err = tab.value === 'intl' ? props.intlError : props.cnError;
  if (err) return err;
  return activeQuant.value && !activeQuant.value.available ? (tField(activeQuant.value, 'reason') || t('chartWorkspace.insufficient')) : '';
});
const activeLoading = computed(() => (tab.value === 'intl' ? props.loadingIntl : props.loadingCn) && !activeQuant.value);

const premium = computed(() => props.cn?.premium ?? null);
const premiumSeries = computed(() => premium.value?.series ?? []);
const activeBacktest = computed(() => props.cn?.backtest ?? null);

// 周期：以 K 线条数换算为 dataZoom 起点百分比
const zoomStart = computed(() => {
  const total = activeQuant.value?.bars?.length || 0;
  if (!total || period.value === 'all') return 0;
  return Math.max(0, (1 - period.value / total) * 100);
});

const subtitle = computed(() => {
  const q = activeQuant.value;
  if (tab.value === 'tradingview') return t('chartWorkspace.aria.tv');
  if (tab.value === 'premium') return t('chartWorkspace.aria.premium');
  if (tab.value === 'ratio') return t('chartWorkspace.aria.ratio');
  if (tab.value === 'backtest') return t('chartWorkspace.aria.backtest');
  return q?.asOf ? t('chartWorkspace.asOf', { date: q.asOf }) : t('chartWorkspace.dailyLine');
});

const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '--');
const signedPct = (v) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(3)}%` : '--');
const toneOf = (v) => (Number.isFinite(v) ? (v >= 0 ? 'tone-up' : 'tone-down') : '');
</script>

<style scoped>
.workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tradingview-container {
  width: 100%;
  height: 540px;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface-2);
}

.chart-iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

@media (max-width: 767px) {
  .tradingview-container {
    height: 380px;
  }
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px 16px;
  flex-wrap: wrap;
}

.title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.toggle {
  height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.toggle.on {
  background: color-mix(in srgb, var(--gold) 16%, transparent);
  border-color: color-mix(in srgb, var(--gold) 55%, transparent);
  color: var(--text);
}

.notice {
  padding: 28px 16px;
  text-align: center;
  color: var(--text-2);
  font-size: 14px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
}

.premium-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
}

.premium-stats div {
  padding: 12px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.premium-stats span {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}

.premium-stats b {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.premium-stats .tone-up { color: var(--up); }
.premium-stats .tone-down { color: var(--down); }

.note {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.6;
}

.tradingview-container {
  height: 520px;
  width: 100%;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface-2);
  position: relative;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

.chart-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

@media (max-width: 768px) {
  .tradingview-container {
    height: 420px;
  }
}
</style>
