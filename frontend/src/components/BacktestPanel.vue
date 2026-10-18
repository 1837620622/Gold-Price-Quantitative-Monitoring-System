<template>
  <div class="backtest">
    <p class="meta">
      {{ t('backtestPanel.rangeLine', { start: backtest.startDate, end: backtest.endDate, days: backtest.days }) }}
      {{ t('backtestPanel.costLine', { cost: backtest.rules.costPerSwitchPercent }) }}
    </p>

    <div class="table-wrap">
      <table class="metrics">
        <thead>
          <tr>
            <th scope="col">{{ t('backtestPanel.strategy') }}</th>
            <th scope="col">{{ t('backtestPanel.totalReturn') }}</th>
            <th scope="col">{{ t('backtestPanel.annual') }}</th>
            <th scope="col">{{ t('backtestPanel.vol') }}</th>
            <th scope="col">{{ t('backtestPanel.sharpe') }}</th>
            <th scope="col">{{ t('backtestPanel.sortino') }}</th>
            <th scope="col">{{ t('backtestPanel.calmar') }}</th>
            <th scope="col">{{ t('backtestPanel.payoff') }}</th>
            <th scope="col">{{ t('backtestPanel.winRate') }}</th>
            <th scope="col">{{ t('backtestPanel.maxDd') }}</th>
            <th scope="col">{{ t('backtestPanel.switches') }}</th>
            <th scope="col">{{ t('backtestPanel.exposure') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <th scope="row">
              <span class="swatch" :style="{ background: colors[row.key] || '#888' }"></span>
              <span>{{ tLabel(row.name) }}</span>
              <span class="rule">{{ tLabel(backtest.rules?.[row.key]) }}</span>
            </th>
            <td :class="toneOf(row.totalReturn)">{{ signedPct(row.totalReturn) }}</td>
            <td :class="toneOf(row.cagr)">{{ signedPct(row.cagr) }}</td>
            <td>{{ fmt(row.vol) }}%</td>
            <td>{{ fmt(row.sharpe) }}</td>
            <td>{{ fmt(row.sortino) }}</td>
            <td>{{ fmt(row.calmar) }}</td>
            <td>{{ fmt(row.profitFactor) }}</td>
            <td>{{ fmt(row.winRate, 1) }}%</td>
            <td class="tone-down">{{ fmt(row.maxDrawdown) }}%</td>
            <td>{{ row.trades }}</td>
            <td>{{ fmt(row.exposure, 0) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div ref="el" class="echart" role="img" :aria-label="t('backtestPanel.aria')"></div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue';
import { chartPalette, fmtVal } from '../lib/chartTheme.js';
import { useI18n } from '../i18n';

const { t, tLabel, locale } = useI18n();

const props = defineProps({
  backtest: { type: Object, required: true },
  theme: { type: String, default: 'dark' },
});

const el = ref(null);
const chart = shallowRef(null);
let unmounted = false;
let resizeObserver = null;

const STRATEGY_ORDER = ['trend', 'trendFiltered', 'score', 'bollRsi', 'premiumArb', 'buyHold'];
const rows = computed(() => {
  const strats = props.backtest?.strategies || {};
  return STRATEGY_ORDER.filter((k) => strats[k]).map((key) => ({ key, ...strats[key] }));
});
const colors = computed(() => chartPalette(props.theme).equity);

const fmt = (v, d = 2) => fmtVal(v, d);
const signedPct = (v) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '--');
const toneOf = (v) => (Number.isFinite(v) ? (v >= 0 ? 'tone-up' : 'tone-down') : '');

function buildOption() {
  const pal = chartPalette(props.theme);
  const bt = props.backtest;
  const dates = bt.equity.dates;

  const series = [];
  STRATEGY_ORDER.forEach((key) => {
    if (bt.equity?.[key]) {
      const isDashed = key === 'buyHold';
      const stratName = tLabel(bt.strategies?.[key]?.name || key);
      const color = pal.equity[key] || pal.muted;
      series.push({
        name: stratName,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: bt.equity[key],
        showSymbol: false,
        lineStyle: { width: isDashed ? 1.4 : 1.7, color, type: isDashed ? 'dashed' : 'solid' },
        itemStyle: { color },
      });
    }
  });

  if (bt.drawdown?.score) {
    series.push({
      name: t('backtestPanel.scoreDd'),
      type: 'line',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: bt.drawdown.score,
      showSymbol: false,
      lineStyle: { width: 1, color: pal.equity.score },
      areaStyle: { color: pal.drawdown },
    });
  }
  if (bt.drawdown?.buyHold) {
    series.push({
      name: t('backtestPanel.holdDd'),
      type: 'line',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: bt.drawdown.buyHold,
      showSymbol: false,
      lineStyle: { width: 1, color: pal.equity.buyHold, type: 'dashed' },
    });
  }

  // 窄屏：图例改为单行可滚动，曲线区下移，避免与图例重叠
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
  return {
    animationDuration: 300,
    grid: [
      { left: 58, right: 20, top: narrow ? 52 : 40, height: '50%' },
      { left: 58, right: 20, top: '72%', height: '16%' },
    ],
    textStyle: { fontFamily: pal.font },
    legend: {
      type: narrow ? 'scroll' : 'plain',
      top: 0,
      left: narrow ? 0 : 'auto',
      right: 0,
      itemWidth: 14,
      itemHeight: 3,
      textStyle: { color: pal.muted, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'line', link: [{ xAxisIndex: 'all' }] },
      backgroundColor: pal.tipBg,
      borderColor: pal.tipBorder,
      textStyle: { color: pal.text, fontSize: 12 },
      valueFormatter: (v) => fmtVal(v, 2),
    },
    xAxis: [
      { type: 'category', gridIndex: 0, data: dates, axisLabel: { show: false }, axisLine: { lineStyle: { color: pal.axis } }, axisTick: { show: false } },
      { type: 'category', gridIndex: 1, data: dates, axisLabel: { color: pal.muted, fontSize: 11, hideOverlap: true }, axisLine: { lineStyle: { color: pal.axis } }, axisTick: { show: false } },
    ],
    yAxis: [
      {
        gridIndex: 0,
        scale: true,
        splitLine: { lineStyle: { color: pal.grid, type: 'dashed' } },
        axisLabel: { color: pal.muted, fontSize: 11 },
      },
      {
        gridIndex: 1,
        max: 0,
        min: (v) => Math.min(v.min, -5),
        splitNumber: 2,
        splitLine: { show: false },
        axisLabel: { color: pal.muted, fontSize: 11, formatter: (v) => `${v}%` },
      },
    ],
    series,
    dataZoom: [{ type: 'inside', xAxisIndex: [0, 1], zoomOnMouseWheel: false, moveOnMouseWheel: false }],
  };
}

function render() {
  if (!chart.value) return;
  chart.value.setOption(buildOption(), { notMerge: true });
}

watch([() => props.backtest, () => props.theme, () => locale.value], render);

onMounted(async () => {
  const { default: echarts } = await import('../lib/echarts.js');
  if (unmounted) return;
  chart.value = echarts.init(el.value, null, { renderer: 'canvas' });
  resizeObserver = new ResizeObserver(() => chart.value?.resize());
  resizeObserver.observe(el.value);
  render();
});

onUnmounted(() => {
  unmounted = true;
  resizeObserver?.disconnect();
  chart.value?.dispose();
  chart.value = null;
});
</script>

<style scoped>
.backtest {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.meta {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.6;
}

.table-wrap {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

.metrics {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.metrics th,
.metrics td {
  padding: 10px 12px;
  text-align: right;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.metrics thead th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
}

.metrics tbody th {
  text-align: left;
  font-weight: 600;
}

.metrics thead th:first-child {
  text-align: left;
}

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 8px;
  vertical-align: middle;
}

.rule {
  display: block;
  margin: 2px 0 0 18px;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-3);
}

.metrics .tone-up { color: var(--up); }
.metrics .tone-down { color: var(--down); }

.echart {
  width: 100%;
  height: 420px;
}

@media (max-width: 767px) {
  .echart {
    height: 340px;
  }
}

@media (max-width: 767px) {
  .backtest {
    gap: 12px;
  }

  .meta {
    font-size: 13px;
  }

  .metrics th,
  .metrics td {
    padding: 10px;
  }

  /* 策略名列固定，横向滚动表格时仍能看清每一行对应的策略 */
  .metrics tbody th,
  .metrics thead th:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--surface-card);
  }
}
</style>
