<template>
  <div class="premium">
    <div ref="el" class="echart" role="img" :aria-label="t('premiumChart.aria')"></div>
    <div v-if="!hasData" class="overlay">{{ t('premiumChart.empty') }}</div>
  </div>
</template>

<script setup>
import { useI18n } from '../i18n';
const { t, tLabel } = useI18n();
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
  const mean = stats.mean60 ?? null;
  const sd = stats.std60 ?? null;
  const last = values.length - 1;

  const markArea = mean !== null && sd !== null
    ? {
        silent: true,
        itemStyle: { color: pal.band },
        data: [[{ yAxis: mean - sd }, { yAxis: mean + sd }]],
      }
    : undefined;

  return {
    animationDuration: 300,
    textStyle: { fontFamily: pal.font },
    grid: { left: 58, right: 24, top: 18, bottom: 34 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: pal.tipBg,
      borderColor: pal.tipBorder,
      textStyle: { color: pal.text, fontSize: 12 },
      valueFormatter: (v) => `${fmtVal(v, 3)}%`,
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
      axisLabel: { color: pal.muted, fontSize: 11, formatter: (v) => `${fmtVal(v, 1)}%` },
    },
    series: [
      {
        name: t('premiumChart.series'),
        type: 'line',
        data: values,
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1.8, color: pal.ma5 },
        itemStyle: { color: pal.ma5 },
        areaStyle: { color: pal.ma5, opacity: 0.06 },
        markArea,
        markLine: mean !== null
          ? {
              symbol: 'none',
              silent: true,
              label: { color: pal.muted, fontSize: 11, formatter: t('premiumChart.mean60'), position: 'insideStartTop' },
              lineStyle: { color: pal.mean, type: 'dashed' },
              data: [{ yAxis: mean }],
            }
          : undefined,
        markPoint: {
          symbol: 'circle',
          symbolSize: 9,
          itemStyle: { color: pal.up },
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
.premium {
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
  .premium {
    height: 320px;
  }
}
</style>
