<template>
  <div class="backtest">
    <p class="meta">
      回测区间 {{ backtest.startDate }} 至 {{ backtest.endDate }}，共 {{ backtest.days }} 个交易日；
      单边交易成本 {{ backtest.rules.costPerSwitchPercent }}%。信号收盘产生，次日生效，避免前视偏差。
    </p>

    <div class="table-wrap">
      <table class="metrics">
        <thead>
          <tr>
            <th scope="col">策略</th>
            <th scope="col">总收益</th>
            <th scope="col">年化</th>
            <th scope="col">年化波动</th>
            <th scope="col">夏普</th>
            <th scope="col">最大回撤</th>
            <th scope="col">换仓</th>
            <th scope="col">持仓占比</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <th scope="row">
              <span class="swatch" :style="{ background: colors[row.key] }"></span>
              <span>{{ row.name }}</span>
              <span class="rule">{{ backtest.rules[row.key] }}</span>
            </th>
            <td :class="toneOf(row.totalReturn)">{{ signedPct(row.totalReturn) }}</td>
            <td :class="toneOf(row.cagr)">{{ signedPct(row.cagr) }}</td>
            <td>{{ fmt(row.vol) }}%</td>
            <td>{{ fmt(row.sharpe) }}</td>
            <td class="tone-down">{{ fmt(row.maxDrawdown) }}%</td>
            <td>{{ row.trades }}</td>
            <td>{{ fmt(row.exposure, 0) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div ref="el" class="echart" role="img" aria-label="策略权益曲线与回撤图"></div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue';
import { chartPalette, fmtVal } from '../lib/chartTheme.js';

const props = defineProps({
  backtest: { type: Object, required: true },
  theme: { type: String, default: 'dark' },
});

const el = ref(null);
const chart = shallowRef(null);
let unmounted = false;
let resizeObserver = null;

const rows = computed(() => ['trend', 'score', 'buyHold'].map((key) => ({ key, ...props.backtest.strategies[key] })));
const colors = computed(() => chartPalette(props.theme).equity);

const fmt = (v, d = 2) => fmtVal(v, d);
const signedPct = (v) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '--');
const toneOf = (v) => (Number.isFinite(v) ? (v >= 0 ? 'tone-up' : 'tone-down') : '');

function buildOption() {
  const pal = chartPalette(props.theme);
  const bt = props.backtest;
  const dates = bt.equity.dates;
  return {
    animationDuration: 300,
    grid: [
      { left: 58, right: 20, top: 40, height: '50%' },
      { left: 58, right: 20, top: '72%', height: '16%' },
    ],
    legend: {
      top: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 3,
      textStyle: { color: pal.muted, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', link: [{ xAxisIndex: 'all' }] },
      backgroundColor: pal.tipBg,
      borderColor: pal.axis,
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
    series: [
      { name: 'EMA 趋势', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: bt.equity.trend, showSymbol: false, lineStyle: { width: 1.6, color: pal.equity.trend }, itemStyle: { color: pal.equity.trend } },
      { name: '综合评分', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: bt.equity.score, showSymbol: false, lineStyle: { width: 1.6, color: pal.equity.score }, itemStyle: { color: pal.equity.score } },
      { name: '买入持有', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: bt.equity.buyHold, showSymbol: false, lineStyle: { width: 1.4, color: pal.equity.buyHold, type: 'dashed' }, itemStyle: { color: pal.equity.buyHold } },
      { name: '综合评分回撤', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: bt.drawdown.score, showSymbol: false, lineStyle: { width: 1, color: pal.equity.score }, areaStyle: { color: pal.drawdown } },
      { name: '买入持有回撤', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: bt.drawdown.buyHold, showSymbol: false, lineStyle: { width: 1, color: pal.equity.buyHold, type: 'dashed' } },
    ],
    dataZoom: [{ type: 'inside', xAxisIndex: [0, 1], zoomOnMouseWheel: false, moveOnMouseWheel: false }],
  };
}

function render() {
  if (!chart.value) return;
  chart.value.setOption(buildOption(), { notMerge: true });
}

watch([() => props.backtest, () => props.theme], render);

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
}

.meta {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.6;
}

.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.metrics {
  width: 100%;
  border-collapse: collapse;
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
</style>
