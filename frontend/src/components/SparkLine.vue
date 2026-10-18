<template>
  <svg v-if="coords.length" class="spark" :class="resolvedTone" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
    <path class="spark-area" :d="area" />
    <polyline class="spark-line" :points="line" />
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  values: { type: Array, default: () => [] },
  // auto：按序列首尾判断；up/down/flat：由调用方指定（例如跟随当日涨跌）
  tone: { type: String, default: 'auto' },
});

const W = 100;
const H = 40;

const finite = computed(() => props.values.filter((v) => Number.isFinite(v)));

const resolvedTone = computed(() => {
  if (props.tone !== 'auto') return props.tone;
  const v = finite.value;
  if (v.length < 2) return 'flat';
  return v[v.length - 1] >= v[0] ? 'up' : 'down';
});

const coords = computed(() => {
  const v = finite.value;
  if (v.length < 2) return [];
  const min = Math.min(...v);
  const max = Math.max(...v);
  const span = max - min || 1;
  return v.map((y, i) => [(i / (v.length - 1)) * W, H - 3 - ((y - min) / span) * (H - 6)]);
});

const line = computed(() => coords.value.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '));

const area = computed(() => {
  if (!coords.value.length) return '';
  const path = coords.value.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L');
  return `M0,${H} L${path} L${W},${H} Z`;
});
</script>

<style scoped>
.spark {
  display: block;
  width: 100%;
  height: 40px;
  margin-top: 14px;
  overflow: visible;
}

/* 走势线与面积保持中性色：涨跌色只出现在数值与箭头上 */
.spark-line {
  fill: none;
  stroke: var(--text-2);
  stroke-width: 1.4;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.spark-area {
  fill: var(--text-2);
  opacity: 0.08;
}
</style>
