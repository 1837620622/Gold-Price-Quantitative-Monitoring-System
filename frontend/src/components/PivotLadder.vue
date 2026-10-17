<template>
  <section class="card pivot-card" aria-labelledby="pivot-title">
    <header class="pivot-head">
      <div>
        <h3 id="pivot-title" class="pivot-title">日内枢轴阶梯</h3>
        <p class="pivot-sub">Pivot Points · 以最近一根日K 的高低收推算</p>
      </div>
      <div class="seg-xs" role="tablist" aria-label="枢轴算法">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'classic'"
          :class="{ active: mode === 'classic' }"
          @click="mode = 'classic'"
        >经典</button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'fibonacci'"
          :class="{ active: mode === 'fibonacci' }"
          @click="mode = 'fibonacci'"
        >斐波那契</button>
      </div>
    </header>

    <!-- 阶梯从上到下按价位排序，现价插入到对应位置 -->
    <ol class="ladder">
      <li v-for="row in rows" :key="row.key" class="rung" :class="`rung-${row.tone}`">
        <span class="rung-label">{{ row.label }}</span>
        <span class="rung-line" aria-hidden="true"></span>
        <span class="rung-value">{{ row.value }}</span>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import { fmtNumber } from '../format';

const props = defineProps({
  pivots: { type: Object, required: true },
  price: { type: Number, default: null },
});

const mode = ref('classic');

const LEVELS = [
  { key: 'r3', label: 'R3 阻力', tone: 'res' },
  { key: 'r2', label: 'R2 阻力', tone: 'res' },
  { key: 'r1', label: 'R1 阻力', tone: 'res' },
  { key: 'pivot', label: 'P 枢轴', tone: 'mid' },
  { key: 's1', label: 'S1 支撑', tone: 'sup' },
  { key: 's2', label: 'S2 支撑', tone: 'sup' },
  { key: 's3', label: 'S3 支撑', tone: 'sup' },
];

const rows = computed(() => {
  const active = props.pivots?.[mode.value];
  if (!active) return [];

  const items = LEVELS.filter((l) => Number.isFinite(active[l.key])).map((l) => ({
    key: l.key,
    label: l.label,
    tone: l.tone,
    num: active[l.key],
    value: fmtNumber(active[l.key]),
  }));
  if (Number.isFinite(props.price)) {
    items.push({ key: 'price', label: '现价', tone: 'now', num: props.price, value: fmtNumber(props.price) });
  }
  return items.sort((a, b) => b.num - a.num);
});
</script>

<style scoped>
.pivot-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pivot-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.pivot-title {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  color: var(--text);
}

.pivot-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.seg-xs {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.seg-xs button {
  padding: 4px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.seg-xs button:hover {
  color: var(--text);
}

.seg-xs button.active {
  background: var(--surface-hover);
  color: var(--text);
}

.ladder {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.rung {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.rung-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}

.rung-line {
  height: 1px;
  background: var(--border-strong);
}

.rung-value {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.rung-res .rung-label {
  color: var(--up);
}

.rung-sup .rung-label {
  color: var(--down);
}

.rung-mid .rung-label {
  color: var(--gold);
}

.rung-now {
  border-color: rgba(251, 191, 36, 0.45);
  background: rgba(251, 191, 36, 0.08);
}

.rung-now .rung-label,
.rung-now .rung-value {
  color: var(--gold-3);
}
</style>
