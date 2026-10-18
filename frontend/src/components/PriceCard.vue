<template>
  <article class="card price-card" :class="[`accent-${accent}`, { 'is-loading': loading }]" :aria-busy="loading">
    <!-- 头部：图标 + 代码 + 徽章 + 名称 -->
    <header class="price-head">
      <div class="head-left">
        <div class="market-icon" :class="accent">
          <Icon :name="code.includes('XAU') ? 'globe' : 'ingot'" :size="22" />
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
      <span v-if="loading" class="skeleton skeleton-price" :aria-label="t('priceCard.loading')"></span>
      <span v-else :key="flashKey" class="price-value" :class="{ flash: flashKey > 0, 'is-empty': !isNum(price) }">
        {{ priceText }}
      </span>
    </div>

    <!-- 涨跌幅标签：箭头用图标，持平用短横线 -->
    <div class="price-change-row">
      <template v-if="loading">
        <span class="skeleton skeleton-line"></span>
      </template>
      <template v-else-if="hasChange">
        <div class="change-pill" :class="toneClass">
          <span class="change-arrow" aria-hidden="true">
            <Icon v-if="changePercent > 0" name="chevron-up" :size="14" />
            <Icon v-else-if="changePercent < 0" name="chevron-up" :size="14" class="is-down" />
            <span v-else class="change-flat"></span>
          </span>
          <span class="change-abs">{{ fmtSigned(change) }}</span>
          <span class="change-pct">({{ fmtPercent(changePercent) }})</span>
        </div>
      </template>
      <span v-else-if="isNum(price)" class="change-none">{{ t('priceCard.noChange') }}</span>
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
import Icon from './icons/Icon.vue';
import { isNum, fmtNumber, fmtSigned, fmtPercent, toneOf } from '../format';
import { useI18n } from '../i18n';

const { t } = useI18n();

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
  display: flex;
  flex-direction: column;
  box-shadow: none;
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
  min-width: 0;
}

/* 图标方框：发丝边、无底色，图标用金色 */
.market-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--gold);
}

.title-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.code-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.code {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text);
}

/* 金色标签：激活态的金色发丝边 + 淡金底 */
.code-row .chip-gold {
  background: color-mix(in srgb, var(--gold) 12%, transparent);
  border-color: var(--gold);
  color: var(--gold-3);
  font-weight: 500;
}

.code-row .chip-warn {
  background: transparent;
  border-color: var(--line);
  color: var(--warn);
}

.name {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-2);
  word-break: keep-all;
  overflow-wrap: break-word;
}

.unit-badge {
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text-3);
  white-space: nowrap;
}

/* 大字现价：等宽数字 */
.price-main {
  --price-color: var(--text);
  margin-top: 18px;
  min-height: 48px;
  display: flex;
  align-items: baseline;
}

.price-main.tone-up {
  --price-color: var(--up);
}

.price-main.tone-down {
  --price-color: var(--down);
}

.price-value {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: clamp(36px, 4.2vw, 46px);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--price-color);
  transition: color 0.3s ease;
}

.price-main.tone-up .price-value {
  color: var(--up);
}

.price-main.tone-down .price-value {
  color: var(--down);
}

.price-value.is-empty {
  color: var(--text-3);
}

/* 价格变化只闪一次（组件用 key 重建节点）；终点回到当前涨跌色，避免结束时跳色 */
.flash {
  animation: price-pulse 0.8s var(--ease-out) 1;
}

@keyframes price-pulse {
  0% { color: var(--gold-3); }
  100% { color: var(--price-color); }
}

/* 涨跌幅标签：发丝边方角，涨跌色只作用于文字与箭头 */
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
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  color: var(--text-2);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.change-pill.tone-up {
  color: var(--up);
}

.change-pill.tone-down {
  color: var(--down);
}

.change-arrow {
  display: inline-grid;
  place-items: center;
  width: 14px;
  height: 14px;
}

.change-arrow .is-down {
  transform: rotate(180deg);
}

.change-flat {
  display: block;
  width: 8px;
  height: 1px;
  background: currentColor;
}

.change-none {
  font-size: 13px;
  color: var(--text-3);
}

.spark-wrapper {
  margin-top: 14px;
  height: 38px;
}

.price-note {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-3);
}

/* 行情指标网格：发丝分隔线 */
.stats-grid {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
  gap: 12px 10px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
}

.stat-value {
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  white-space: nowrap;
}

.stat-value.tone-up { color: var(--up); }
.stat-value.tone-down { color: var(--down); }

:lang(zh) .stat-label {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

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
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .flash {
    animation: none;
  }
}
</style>
