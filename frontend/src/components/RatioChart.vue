<template>
  <div class="ratio-chart">
    <div ref="el" class="echart" role="img" aria-label="国际金银比率历史序列图"></div>
    <div v-if="!hasData" class="overlay">金银比样本数据加载中…</div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue';
import { chartPalette, fmtVal } from '../lib/chartTheme.js';

const props = defineProps({
  series: { type: Array, default: () => [] },
  stats: { type: Object, default: null },
  theme: { type: String, default: 'dark' },
});

const el = ref(null);
const chart = shallowRef(null);
let unmounted = false;
let resizeObserver = null;

const hasData = computed(() => props.series.length > 0);

function buildOption() {
  const pal = chartPalette(props.theme);
  const dates = props.series.map((s) => s.date);
  const values = props.series.map((s) => s.value);
  const stats = props.stats || {};
  const mean = stats.mean ?? null;
  const std = stats.std ?? null;
  const last = values.length - 1;

  const markArea = mean !== null && std !== null
    ? {
        silent: true,
        itemStyle: { color: pal.band },
        data: [[{ yAxis: mean - std }, { yAxis: mean + std }]],
      }
    : undefined;

  return {
    animationDuration: 300,
    grid: { left: 58, right: 24, top: 18, bottom: 34 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: pal.tipBg,
      borderColor: pal.axis,
      textStyle: { color: pal.text, fontSize: 12 },
      formatter: (params) => {
        const item = params[0];
        if (!item) return '';
        const v = item.value;
        return `<div style="font-weight:600;margin-bottom:4px">${item.axisValue}</div>金银比率: <b>${fmtVal(v, 2)}</b>`;
      },
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { lineStyle: { color: pal.axis } },
      axisTick: { show: false },
      axisLabel: { color: pal.muted, fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { lineStyle: { color: pal.grid, type: 'dashed' } },
      axisLabel: { color: pal.muted, fontSize: 11, formatter: (v) => fmtVal(v, 1) },
    },
    series: [
      {
        name: '金银比率',
        type: 'line',
        data: values,
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 2, color: '#38bdf8' },
        itemStyle: { color: '#38bdf8' },
        areaStyle: { color: '#38bdf8', opacity: 0.08 },
        markArea,
        markLine: mean !== null
          ? {
              symbol: 'none',
              silent: true,
              label: { color: pal.muted, fontSize: 11, formatter: `均值 ${fmtVal(mean, 1)}`, position: 'insideStartTop' },
              lineStyle: { color: pal.mean, type: 'dashed' },
              data: [{ yAxis: mean }, { yAxis: 80, lineStyle: { color: pal.axis, type: 'dotted' } }],
            }
          : undefined,
        markPoint: {
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: '#38bdf8' },
          label: { show: false },
          data: [{ coord: [last, values[last]] }],
        },
      },
    ],
    dataZoom: [{ type: 'inside', zoomOnMouseWheel: false, moveOnMouseWheel: false }],
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

watch([() => props.series, () => props.stats, () => props.theme], render);

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
.ratio-chart {
  position: relative;
  height: 420px;
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

@media (max-width: 767px) {
  .ratio-chart {
    height: 320px;
  }
}
</style>
