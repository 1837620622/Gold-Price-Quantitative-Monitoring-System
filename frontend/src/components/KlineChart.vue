<template>
  <div class="kline" :class="{ 'is-loading': loading }">
    <div ref="el" class="echart" role="img" :aria-label="ariaLabel"></div>
    <div v-if="!hasData" class="overlay">暂无K线数据</div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue';
import { chartPalette, fmtVal } from '../lib/chartTheme.js';

const props = defineProps({
  bars: { type: Array, default: () => [] },
  indicators: { type: Object, default: null },
  toggles: { type: Object, default: () => ({}) },
  theme: { type: String, default: 'dark' },
  zoomStart: { type: Number, default: 60 },
  name: { type: String, default: 'K线' },
  loading: { type: Boolean, default: false },
});

const el = ref(null);
const chart = shallowRef(null);
let unmounted = false;
let resizeObserver = null;

const hasData = computed(() => props.bars.length > 0);
const ariaLabel = computed(() => `${props.name} 日K线与技术指标图`);

// 窗格（pane）按开关动态生成：价格 → 成交量 → 评分 → MACD → RSI
function activePanes() {
  const t = props.toggles;
  const hasVolume = props.bars.some((b) => b.volume > 0);
  const panes = ['price'];
  if (t.vol && hasVolume) panes.push('volume');
  if (t.score && props.indicators) panes.push('score');
  if (t.macd && props.indicators) panes.push('macd');
  if (t.rsi && props.indicators) panes.push('rsi');
  return panes;
}

const WEIGHT = { price: 2.4, volume: 1.3, score: 1, macd: 1.1, rsi: 1 };

function yAxisOf(pane, gridIndex, pal) {
  const base = { gridIndex, axisLine: { show: false }, axisTick: { show: false }, splitNumber: 3 };
  const grid = { lineStyle: { color: pal.grid, type: 'dashed' } };
  const label = (show) => ({ show, color: pal.muted, fontSize: 11 });
  const configs = {
    price: { scale: true, axisLabel: { ...label(true), formatter: (v) => fmtVal(v, 0) }, splitLine: grid },
    volume: { min: 0, max: (v) => v.max * 3, axisLabel: label(false), splitLine: { show: false } },
    score: { min: -100, max: 100, interval: 50, axisLabel: label(true), splitLine: grid },
    macd: { scale: true, axisLabel: label(false), splitLine: { show: false } },
    rsi: { min: 0, max: 100, interval: 50, axisLabel: label(true), splitLine: grid },
  };
  return { ...base, ...configs[pane] };
}

function tooltipHtml(params, pal, bars, ind, t, panes) {
  const idx = params?.[0]?.dataIndex;
  if (idx === undefined || !bars[idx]) return '';
  const b = bars[idx];
  const up = b.close >= b.open;
  const v = (arr) => fmtVal(arr?.[idx]);
  const rows = [
    `<div style="font-weight:600;margin-bottom:4px">${b.date}</div>`,
    `开 ${fmtVal(b.open)} · 高 ${fmtVal(b.high)}`,
    `低 ${fmtVal(b.low)} · 收 <b style="color:${up ? pal.up : pal.down}">${fmtVal(b.close)}</b>`,
  ];
  if (ind) {
    if (t.ma) rows.push(`MA5 ${v(ind.ma5)} · MA10 ${v(ind.ma10)} · MA20 ${v(ind.ma20)}`);
    if (t.boll) rows.push(`布林 上 ${v(ind.bollUpper)} · 下 ${v(ind.bollLower)}`);
    if (panes.includes('volume')) rows.push(`成交量 ${Math.round(b.volume).toLocaleString('zh-CN')} 手`);
    if (panes.includes('score')) rows.push(`量化评分 <b>${v(ind.score)}</b>`);
    if (panes.includes('macd')) rows.push(`DIF ${v(ind.dif)} · DEA ${v(ind.dea)} · 柱 ${v(ind.hist)}`);
    if (panes.includes('rsi')) rows.push(`RSI ${v(ind.rsi14)}`);
  }
  return rows.join('<br/>');
}

function buildOption() {
  const pal = chartPalette(props.theme);
  const bars = props.bars;
  const ind = props.indicators;
  const t = props.toggles;
  const panes = activePanes();
  const dates = bars.map((b) => b.date);
  const paneIndex = (name) => panes.indexOf(name);

  // 布局：顶部留给图例，底部留给缩放滑块；窗格按权重分配高度
  const TOP = 9;
  const BOTTOM = 13;
  const available = 100 - TOP - BOTTOM;
  const weightSum = panes.reduce((s, p) => s + WEIGHT[p], 0);

  const grid = [];
  const xAxis = [];
  const yAxis = [];
  let cursor = TOP;
  panes.forEach((pane, i) => {
    const share = (WEIGHT[pane] / weightSum) * available;
    grid.push({ left: 60, right: 20, top: `${cursor}%`, height: `${share - 1.6}%` });
    cursor += share;
    xAxis.push({
      type: 'category',
      gridIndex: i,
      data: dates,
      boundaryGap: true,
      axisLine: { lineStyle: { color: pal.axis } },
      axisTick: { show: false },
      axisLabel: { show: i === panes.length - 1, color: pal.muted, fontSize: 11, hideOverlap: true },
      splitLine: { show: false },
    });
    yAxis.push(yAxisOf(pane, i, pal));
  });

  const series = [];
  const line = (name, data, xi, color, type = 'solid') => ({
    name,
    type: 'line',
    xAxisIndex: xi,
    yAxisIndex: xi,
    data,
    showSymbol: false,
    connectNulls: false,
    lineStyle: { width: 1.4, color, type },
    itemStyle: { color },
  });

  series.push({
    name: 'K线',
    type: 'candlestick',
    xAxisIndex: 0,
    yAxisIndex: 0,
    data: bars.map((b) => [b.open, b.close, b.low, b.high]),
    itemStyle: { color: pal.up, color0: pal.down, borderColor: pal.up, borderColor0: pal.down },
  });

  if (ind && t.ma) {
    series.push(line('MA5', ind.ma5, 0, pal.ma5));
    series.push(line('MA10', ind.ma10, 0, pal.ma10));
    series.push(line('MA20', ind.ma20, 0, pal.ma20));
  }
  if (ind && t.boll) {
    series.push(line('布林上轨', ind.bollUpper, 0, pal.boll, 'dashed'));
    series.push(line('布林下轨', ind.bollLower, 0, pal.boll, 'dashed'));
  }

  if (paneIndex('volume') >= 0) {
    const i = paneIndex('volume');
    series.push({
      name: '成交量',
      type: 'bar',
      xAxisIndex: i,
      yAxisIndex: i,
      barMaxWidth: 10,
      data: bars.map((b) => ({
        value: b.volume,
        itemStyle: { color: b.close >= b.open ? pal.up : pal.down, opacity: 0.45 },
      })),
    });
  }

  if (paneIndex('score') >= 0) {
    const i = paneIndex('score');
    series.push({
      ...line('量化评分', ind.score, i, pal.score),
      lineStyle: { width: 1.6, color: pal.score },
      areaStyle: { color: pal.score, opacity: 0.08 },
      markLine: {
        symbol: 'none',
        silent: true,
        label: { show: false },
        lineStyle: { color: pal.axis, type: 'dashed' },
        data: [{ yAxis: 20 }, { yAxis: 0 }, { yAxis: -20 }],
      },
    });
  }

  if (paneIndex('macd') >= 0) {
    const i = paneIndex('macd');
    series.push({
      name: 'MACD柱',
      type: 'bar',
      xAxisIndex: i,
      yAxisIndex: i,
      barMaxWidth: 8,
      data: ind.hist.map((v) => (v === null ? null : { value: v, itemStyle: { color: v >= 0 ? pal.up : pal.down, opacity: 0.6 } })),
    });
    series.push(line('DIF', ind.dif, i, pal.dif));
    series.push(line('DEA', ind.dea, i, pal.dea));
  }

  if (paneIndex('rsi') >= 0) {
    const i = paneIndex('rsi');
    series.push({
      ...line('RSI(14)', ind.rsi14, i, pal.rsi),
      markLine: {
        symbol: 'none',
        silent: true,
        label: { show: false },
        lineStyle: { color: pal.axis, type: 'dashed' },
        data: [{ yAxis: 30 }, { yAxis: 70 }],
      },
    });
  }

  const allAxes = panes.map((_, i) => i);
  return {
    animationDuration: 300,
    grid,
    xAxis,
    yAxis,
    series,
    legend: {
      type: 'scroll',
      top: 0,
      left: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 3,
      textStyle: { color: pal.muted, fontSize: 11 },
      data: series.map((s) => s.name),
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        link: [{ xAxisIndex: 'all' }],
        lineStyle: { color: pal.muted, type: 'dashed' },
      },
      backgroundColor: pal.tipBg,
      borderColor: pal.axis,
      textStyle: { color: pal.text, fontSize: 12 },
      formatter: (params) => tooltipHtml(params, pal, bars, ind, t, panes),
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: allAxes, start: props.zoomStart, end: 100, zoomOnMouseWheel: false, moveOnMouseWheel: false },
      {
        type: 'slider',
        xAxisIndex: allAxes,
        start: props.zoomStart,
        end: 100,
        bottom: 4,
        height: 18,
        borderColor: 'transparent',
        backgroundColor: pal.sliderBg,
        fillerColor: pal.filler,
        textStyle: { color: pal.muted, fontSize: 10 },
      },
    ],
  };
}

function render() {
  if (!chart.value) return;
  if (!hasData.value) {
    chart.value.clear();
    return;
  }
  chart.value.setOption(buildOption(), { notMerge: true });
}

watch([() => props.bars, () => props.indicators, () => props.toggles, () => props.theme, () => props.zoomStart], render);

onMounted(async () => {
  // ECharts 按需加载，不阻塞首屏
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
.kline {
  position: relative;
  height: 560px;
}

.echart {
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--text-3);
  font-size: 14px;
  pointer-events: none;
}

.kline.is-loading .echart {
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

@media (max-width: 767px) {
  .kline {
    height: 420px;
  }
}
</style>
