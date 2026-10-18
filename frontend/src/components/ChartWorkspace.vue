<template>
  <section class="card workspace" aria-labelledby="workspace-title">
    <header class="head">
      <div>
        <h2 id="workspace-title" class="title">{{ t('chartWorkspace.title') }}</h2>
        <p class="sub">{{ subtitle }}</p>
      </div>
      <div class="seg seg-tabs" role="tablist" :aria-label="t('chartWorkspace.typeAria')">
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
        <div class="seg seg-sm seg-range" role="group" :aria-label="t('chartWorkspace.periodAria')">
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
        <div><span class="stat-label">{{ t('chartWorkspace.premiumNow') }}</span><b :class="toneOf(premium.current)">{{ signedPct(premium.current) }}</b></div>
        <div><span class="stat-label">{{ t('chartWorkspace.premiumMean60') }}</span><b>{{ signedPct(premium.mean60) }}</b></div>
        <div><span class="stat-label">{{ t('chartWorkspace.premiumZ') }}</span><b>{{ fmt(premium.z) }}</b></div>
        <div><span class="stat-label">{{ t('chartWorkspace.premiumPercentile') }}</span><b>{{ fmt(premium.percentile, 0) }}%</b></div>
        <div><span class="stat-label">{{ t('chartWorkspace.sampleRange') }}</span><b>{{ t('chartWorkspace.sampleDays', { count: premium.count }) }}</b></div>
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
        <div><span class="stat-label">{{ t('chartWorkspace.ratioNow') }}</span><b class="tone-up">{{ fmt(ratioData.current) }}</b></div>
        <div><span class="stat-label">{{ t('chartWorkspace.ratioMean') }}</span><b>{{ fmt(ratioData.mean) }}</b></div>
        <div><span class="stat-label">{{ t('chartWorkspace.premiumPercentile') }}</span><b>{{ fmt(ratioData.percentile, 0) }}%</b></div>
        <div><span class="stat-label">{{ t('chartWorkspace.regime') }}</span><b class="stat-text">{{ tLabel(ratioData.label) }}</b></div>
        <div><span class="stat-label">{{ t('chartWorkspace.pairHint') }}</span><span class="stat-note">{{ ratioData.suggestion }}</span></div>
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
          :src="tvSrc"
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

// TradingView 嵌入跟随主题：日间用浅色图表与纸白工具栏，夜间保持金库暗色
const tvSrc = computed(() => {
  const light = props.theme === 'light';
  return `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_gold&symbol=OANDA%3AXAUUSD&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=${light ? 'ffffff' : '1a1a24'}&studies=[]&theme=${light ? 'light' : 'dark'}&style=1&timezone=Asia%2FShanghai&withdateranges=1&showpopupbutton=0&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=[]&disabled_features=[]&locale=zh_CN`;
});

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
  box-shadow: none;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px 16px;
  flex-wrap: wrap;
}

/* 小标题：展示字 20px（手机 18px），不用大写与字距 */
.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.01em;
  word-break: keep-all;
}

:lang(zh) .title {
  letter-spacing: 0;
}

.sub {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

.tradingview-container {
  width: 100%;
  height: 520px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface-2);
  position: relative;
}

.chart-iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

/* 标签页：发丝分隔线；激活项为 1px 金色下划线，不做填充，不用阴影 */
.seg-tabs {
  gap: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.seg-tabs button {
  padding: 10px 14px;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
  color: var(--text-2);
  font-family: var(--font);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.4;
  box-shadow: none;
  transition: color 0.2s ease, border-color 0.2s ease;
}

@media (hover: hover) and (pointer: fine) {
  .seg-tabs button:hover {
    color: var(--text);
  }
}

.seg-tabs button.active,
.seg-tabs button[aria-selected="true"] {
  border-bottom-color: var(--gold);
  background: transparent;
  color: var(--text);
  box-shadow: none;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 区间：发丝边芯片，2px 圆角；激活项为金色发丝边加淡金底 */
.seg-range {
  gap: 6px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.seg-range button {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  color: var(--text-2);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  box-shadow: none;
}

.seg-range button.active,
.seg-range button[aria-pressed="true"] {
  border-color: var(--gold);
  background: color-mix(in srgb, var(--gold) 12%, transparent);
  color: var(--text);
  box-shadow: none;
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 指标开关：发丝边芯片，2px 圆角；开启项为金色发丝边加淡金底 */
.toggle {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.toggle.on {
  background: color-mix(in srgb, var(--gold) 12%, transparent);
  border-color: var(--gold);
  color: var(--text);
}

.notice {
  padding: 28px 16px;
  text-align: center;
  color: var(--text-2);
  font-size: 14px;
  border: 1px solid var(--line);
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
  border: 1px solid var(--line);
}

/* 统计标签：英文 11px 大写加字距，中文 12px 不大写不加字距 */
.stat-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
}

:lang(zh) .stat-label {
  font-family: var(--font);
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

/* 读数：等宽数字，不加粗 */
.premium-stats b {
  display: block;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.premium-stats .stat-text {
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.4;
}

.premium-stats .stat-note {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}

.premium-stats .tone-up { color: var(--up); }
.premium-stats .tone-down { color: var(--down); }

.note {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-3);
}

/* 手机：标签条单行横向滑动（只有它横向滚动），区间与指标按钮不低于 36px */
@media (max-width: 767px) {
  .head {
    gap: 12px;
  }

  .head > div:first-child {
    min-width: 0;
  }

  .title {
    font-size: 18px;
  }

  .seg-tabs {
    display: flex;
    flex-wrap: nowrap;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .seg-tabs::-webkit-scrollbar {
    display: none;
  }

  .seg-tabs button {
    flex: 0 0 auto;
    min-height: 44px;
    padding: 0 14px;
    font-size: 13px;
    white-space: nowrap;
    word-break: keep-all;
    scroll-snap-align: start;
  }

  .seg-range {
    display: flex;
    width: 100%;
  }

  .seg-range button {
    flex: 1 1 0;
    min-height: 40px;
    padding: 0 6px;
    font-size: 12px;
  }

  .toolbar {
    gap: 10px;
  }

  .toggles {
    width: 100%;
    gap: 8px;
  }

  .toggle {
    min-height: 36px;
    padding: 0 12px;
  }

  .tradingview-container {
    height: 380px;
  }
}
</style>
