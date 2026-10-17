<template>
  <section class="card pivot-card" aria-labelledby="pivot-title">
    <header class="pivot-head">
      <div>
        <h3 id="pivot-title" class="pivot-title">{{ t('pivotLadder.title') }}</h3>
        <p class="pivot-sub">{{ t('pivotLadder.sub') }}</p>
      </div>
      <div class="seg-xs" role="tablist" :aria-label="t('pivotLadder.mode')">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'classic'"
          :class="{ active: mode === 'classic' }"
          @click="mode = 'classic'"
        >{{ t('pivotLadder.classic') }}</button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'fibonacci'"
          :class="{ active: mode === 'fibonacci' }"
          @click="mode = 'fibonacci'"
        >{{ t('pivotLadder.fibonacci') }}</button>
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
import { useI18n } from '../i18n';

const { t } = useI18n();

const props = defineProps({
  pivots: { type: Object, required: true },
  price: { type: Number, default: null },
});

const mode = ref('classic');

const LEVELS = [
  { key: 'r3', labelKey: 'pivotLadder.r3', tone: 'res' },
  { key: 'r2', labelKey: 'pivotLadder.r2', tone: 'res' },
  { key: 'r1', labelKey: 'pivotLadder.r1', tone: 'res' },
  { key: 'pivot', labelKey: 'pivotLadder.p', tone: 'mid' },
  { key: 's1', labelKey: 'pivotLadder.s1', tone: 'sup' },
  { key: 's2', labelKey: 'pivotLadder.s2', tone: 'sup' },
  { key: 's3', labelKey: 'pivotLadder.s3', tone: 'sup' },
];

const rows = computed(() => {
  const active = props.pivots?.[mode.value];
  if (!active) return [];

  const items = LEVELS.filter((l) => Number.isFinite(active[l.key])).map((l) => ({
    key: l.key,
    label: t(l.labelKey),
    tone: l.tone,
    num: active[l.key],
    value: fmtNumber(active[l.key]),
  }));
  if (Number.isFinite(props.price)) {
    items.push({ key: 'price', label: t('pivotLadder.now'), tone: 'now', num: props.price, value: fmtNumber(props.price) });
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
  border-color: rgba(232, 199, 125, 0.45);
  background: rgba(232, 199, 125, 0.08);
}

.rung-now .rung-label,
.rung-now .rung-value {
  color: var(--gold-3);
}
</style>
