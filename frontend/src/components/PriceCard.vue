<template>
  <article class="card price-card" :class="[`accent-${accent}`, { 'is-loading': loading }]" :aria-busy="loading">
    <!-- 头部：图标 + 代码 + 徽章 + 名称 -->
    <header class="price-head">
      <div class="head-left">
        <div class="market-icon" :class="accent">
          <svg v-if="code.includes('XAU')" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 3h12l3 7-9 11L3 10l3-7z"/>
            <path d="M12 3v18M3 10h18"/>
          </svg>
        </div>

        <div class="title-group">
          <div class="code-row">
            <span class="code">{{ code }}</span>
            <span v-if="tag" class="chip" :class="estimated ? 'chip-warn' : 'chip-gold'">{{ tag }}</span>
          </div>
          <p class="name">{{ name }}</p>
        </div>
      </div>

      <div class="unit-badge">{{ unit }}</div>
    </header>

    <!-- 价格大字与闪烁动效 -->
    <div class="price-main" :class="toneClass">
      <span v-if="loading" class="skeleton skeleton-price" aria-label="加载中"></span>
      <span v-else :key="flashKey" class="price-value" :class="{ flash: flashKey > 0, 'is-empty': !isNum(price) }">
        {{ priceText }}
      </span>
    </div>

    <!-- 涨跌幅 Pill 徽章 -->
    <div class="price-change-row">
      <template v-if="loading">
        <span class="skeleton skeleton-line"></span>
      </template>
      <template v-else-if="hasChange">
        <div class="change-pill" :class="toneClass">
          <span class="change-arrow">{{ changePercent > 0 ? '▲' : changePercent < 0 ? '▼' : '■' }}</span>
          <span class="change-abs">{{ fmtSigned(change) }}</span>
          <span class="change-pct">({{ fmtPercent(changePercent) }})</span>
        </div>
      </template>
      <span v-else-if="isNum(price)" class="change-none">暂无涨跌幅</span>
    </div>

    <!-- 迷你走势折线 -->
    <div v-if="sparkline.length && !loading" class="spark-wrapper">
      <SparkLine :values="sparkline" :tone="sparkTone" />
    </div>

    <p v-if="note" class="price-note">{{ note }}</p>

    <!-- 核心行情指标 2x2 网格 -->
    <div class="stats-grid">
      <div v-for="item in stats" :key="item.label" class="stat-item">
        <span class="stat-label">{{ item.label }}</span>
        <span class="stat-value" :class="item.tone ? `tone-${item.tone}` : ''">
          <span v-if="loading" class="skeleton skeleton-stat"></span>
          <template v-else>{{ item.value }}</template>
        </span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import SparkLine from './SparkLine.vue';
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
  sparkline: { type: Array, default: () => [] },
  accent: { type: String, default: 'gold' },
  estimated: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  note: { type: String, default: '' },
});

const symbol = computed(() => (props.currency === 'USD' ? '$' : '¥'));
const priceText = computed(() => (isNum(props.price) ? `${symbol.value}${fmtNumber(props.price)}` : '--'));
const toneClass = computed(() => `tone-${toneOf(props.changePercent)}`);
const hasChange = computed(() => isNum(props.change) || isNum(props.changePercent));
const sparkTone = computed(() => toneOf(props.changePercent));

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

/* 顶部金属高亮边框 */
.price-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  opacity: 0.7;
}

.price-card.accent-blue::before {
  background: linear-gradient(90deg, transparent, var(--info), transparent);
}

.price-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.market-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(251, 191, 36, 0.1);
  color: var(--gold);
  border: 1px solid rgba(251, 191, 36, 0.2);
  flex-shrink: 0;
}

.market-icon.accent-blue {
  background: rgba(96, 165, 250, 0.1);
  color: var(--info);
  border-color: rgba(96, 165, 250, 0.2);
}

.title-group {
  display: flex;
  flex-direction: column;
}

.code-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #ffffff;
  font-family: var(--mono);
}

.name {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-2);
}

.unit-badge {
  font-size: 11px;
  color: var(--text-3);
  font-family: var(--mono);
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

/* 大字现价 */
.price-main {
  margin-top: 18px;
  min-height: 48px;
  display: flex;
  align-items: baseline;
}

.price-value {
  display: inline-block;
  font-family: 'Archivo', var(--mono);
  font-stretch: 110%;
  font-size: clamp(36px, 4.2vw, 46px);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.02;
  font-variant-numeric: tabular-nums;
  color: #ffffff;
  transition: color 0.3s ease;
}

.price-main.tone-up .price-value {
  color: var(--up);
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

.price-main.tone-down .price-value {
  color: var(--down);
  text-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
}

.price-value.is-empty {
  color: var(--text-3);
}

.flash {
  animation: price-pulse 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes price-pulse {
  0% { transform: scale(1.035); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

/* 涨跌幅 Pill 胶囊 */
.price-change-row {
  margin-top: 8px;
  min-height: 28px;
  display: flex;
  align-items: center;
}

.change-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Archivo', var(--mono);
  letter-spacing: -0.01em;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.change-pill.tone-up {
  color: var(--up);
  background: var(--up-bg);
  border-color: rgba(239, 68, 68, 0.3);
}

.change-pill.tone-down {
  color: var(--down);
  background: var(--down-bg);
  border-color: rgba(16, 185, 129, 0.3);
}

.change-arrow {
  font-size: 10px;
}

.change-none {
  font-size: 12px;
  color: var(--text-3);
}

.spark-wrapper {
  margin-top: 14px;
  height: 38px;
}

.price-note {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-3);
}

/* 行情指标网格 */
.stats-grid {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 11px;
  color: var(--text-3);
}

.stat-value {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 700;
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
  color: var(--text);
  white-space: nowrap;
}

.stat-value.tone-up { color: var(--up); }
.stat-value.tone-down { color: var(--down); }

.skeleton-price {
  width: 200px;
  height: 42px;
}

.skeleton-line {
  width: 140px;
  height: 24px;
}

.skeleton-stat {
  width: 48px;
  height: 16px;
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
