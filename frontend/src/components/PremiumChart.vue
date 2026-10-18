<template>
  <div class="premium">
    <div ref="el" class="echart" role="img" :aria-label="t('premiumChart.aria')"></div>
    <div v-if="!hasData" class="overlay">{{ t('premiumChart.empty') }}</div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue';
import { chartPalette, fmtVal } from '../lib/chartTheme.js';
import { useI18n } from '../i18n';

const { t, locale } = useI18n();

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

  // 窄屏：绘图区留白更小
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
  return {
    animationDuration: 300,
    textStyle: { fontFamily: pal.font },
    grid: { left: narrow ? 48 : 58, right: narrow ? 12 : 24, top: 18, bottom: narrow ? 30 : 34 },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: pal.tipBg,
      borderColor: pal.tipBorder,
      borderWidth: 1,
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowColor: 'transparent',
      textStyle: { color: pal.text, fontSize: 12, fontFamily: pal.font },
      valueFormatter: (v) => `<span style="font-family:${pal.mono};font-variant-numeric:tabular-nums">${fmtVal(v, 3)}%</span>`,
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { lineStyle: { color: pal.axis } },
      axisTick: { show: false },
      axisLabel: { color: pal.muted, fontSize: 11, hideOverlap: true, fontFamily: pal.mono },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { lineStyle: { color: pal.grid, type: 'dashed' } },
      axisLabel: { color: pal.muted, fontSize: 11, fontFamily: pal.mono, formatter: (v) => `${fmtVal(v, 1)}%` },
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

watch([() => props.series, () => props.stats, () => props.theme, () => locale.value], render);

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
    height: 280px;
  }
}
</style>
