<template>
  <article class="card price-card" :class="`accent-${accent}`" :aria-busy="loading">
    <header class="price-head">
      <div class="price-title">
        <div class="price-code">
          <span class="code">{{ code }}</span>
          <span v-if="tag" class="chip" :class="{ 'chip-warn': estimated }">{{ tag }}</span>
        </div>
        <p class="price-name">{{ name }}</p>
      </div>
      <span class="price-unit">{{ unit }}</span>
    </header>

    <div class="price-main" :class="toneClass">
      <span v-if="loading" class="skeleton skeleton-price" aria-label="加载中"></span>
      <span v-else :key="flashKey" class="price-value" :class="{ flash: flashKey > 0, 'is-empty': !isNum(price) }">
        {{ priceText }}
      </span>
    </div>

    <div class="price-change" :class="toneClass">
      <template v-if="loading">
        <span class="skeleton skeleton-line"></span>
      </template>
      <template v-else-if="hasChange">
        <span class="change-abs">{{ fmtSigned(change) }}</span>
        <span class="change-pct">{{ fmtPercent(changePercent) }}</span>
      </template>
      <span v-else-if="isNum(price)" class="change-none">暂无涨跌数据</span>
    </div>

    <p v-if="note" class="price-note">{{ note }}</p>

    <dl class="stats">
      <div v-for="item in stats" :key="item.label" class="stat">
        <dt>{{ item.label }}</dt>
        <dd :class="item.tone ? `tone-${item.tone}` : ''">
          <span v-if="loading" class="skeleton skeleton-line"></span>
          <template v-else>{{ item.value }}</template>
        </dd>
      </div>
    </dl>
  </article>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { isNum, fmtNumber, fmtSigned, fmtPercent, toneOf } from '../format';

const props = defineProps({
  code: { type: String, required: true },
  name: { type: String, default: '' },
  tag: { type: String, default: '' },
  unit: { type: String, default: '' },
  currency: { type: String, default: 'CNY' },
  price: { type: Number, default: null },
  change: { type: Number, default: null },
  changePercent: { type: Number, default: null },
  stats: { type: Array, default: () => [] },
  accent: { type: String, default: 'gold' },
  estimated: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  note: { type: String, default: '' },
});

const symbol = computed(() => (props.currency === 'USD' ? '$' : '¥'));
const priceText = computed(() => (isNum(props.price) ? `${symbol.value}${fmtNumber(props.price)}` : '--'));
const toneClass = computed(() => `tone-${toneOf(props.changePercent)}`);
const hasChange = computed(() => isNum(props.change) || isNum(props.changePercent));

// 价格变化时用 key 重新挂载元素，触发一次短暂的高亮动画
const flashKey = ref(0);
watch(
  () => props.price,
  (next, prev) => {
    if (isNum(next) && isNum(prev) && next !== prev) flashKey.value++;
  }
);
</script>

<style scoped>
.price-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 顶部细色条区分两类行情 */
.price-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: var(--accent-line, var(--gold));
  opacity: 0.85;
}
.accent-blue { --accent-line: var(--info); }

.price-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.price-code {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.code {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.price-name {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.price-unit {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  padding-top: 2px;
}

.price-main {
  margin-top: 18px;
  min-height: 1.2em;
}

.price-value {
  display: inline-block;
  font-size: clamp(34px, 4.4vw, 46px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.price-value.is-empty {
  color: var(--text-3);
}

.price-main.tone-up .price-value { color: var(--up); }
.price-main.tone-down .price-value { color: var(--down); }

.flash {
  animation: flash-pulse 0.8s ease-out;
}

@keyframes flash-pulse {
  from { opacity: 0.35; }
  to { opacity: 1; }
}

.price-change {
  margin-top: 6px;
  display: flex;
  gap: 12px;
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.price-change.tone-up { color: var(--up); }
.price-change.tone-down { color: var(--down); }
.price-change.tone-flat { color: var(--text-2); }

.change-none {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
}

.price-note {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.stats {
  margin: 18px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(78px, 1fr));
  gap: 12px;
}

.stat dt {
  font-size: 12px;
  color: var(--text-3);
}

.stat dd {
  margin: 3px 0 0;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  min-height: 1.3em;
}

.stat dd.tone-up { color: var(--up); }
.stat dd.tone-down { color: var(--down); }
.stat dd.tone-flat { color: var(--text-2); }

.skeleton-price {
  width: 220px;
  height: 46px;
  max-width: 80%;
}

.skeleton-line {
  width: 120px;
  height: 14px;
}
</style>
