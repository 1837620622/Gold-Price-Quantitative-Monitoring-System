<template>
  <div class="card range-card">
    <header class="range-head">
      <div class="head-left">
        <div class="range-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </div>
        <div>
          <h3 class="range-title">{{ t('historicalRange.title') }}</h3>
          <p class="range-sub">{{ t('historicalRange.sub') }}</p>
        </div>
      </div>
    </header>

    <div class="range-body">
      <!-- 52 周区间标尺 -->
      <div class="range-slider-box">
        <div class="slider-meta">
          <div class="meta-item">
            <span class="meta-label">{{ t('historicalRange.low52') }}</span>
            <b class="meta-val">¥{{ fmt(low52) }}</b>
          </div>
          <div class="meta-current">
            <span class="meta-label">{{ t('historicalRange.now') }}</span>
            <b class="meta-val highlight">¥{{ fmt(currentPrice) }} ({{ fmt(percentile52, 1) }}%)</b>
          </div>
          <div class="meta-item right">
            <span class="meta-label">{{ t('historicalRange.high52') }}</span>
            <b class="meta-val">¥{{ fmt(high52) }}</b>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="track-bar">
          <div class="track-fill" :style="{ width: `${percentile52}%` }"></div>
          <div class="track-pointer" :style="{ left: `${percentile52}%` }" :title="t('historicalRange.percentile', { value: percentile52 })">
            <span class="pointer-dot"></span>
          </div>
        </div>

        <div class="ath-row">
          <span>{{ t('historicalRange.dropFromHigh') }}<b>-¥{{ fmt(athDiff) }} ({{ fmt(athDrawdown) }}%)</b></span>
          <span class="ath-tag">{{ athDrawdown > -2 ? t('historicalRange.hot') : t('historicalRange.pullback') }}</span>
        </div>
      </div>

      <!-- 多周期收益率阶梯 -->
      <div class="period-ladder">
        <div v-for="p in periods" :key="p.label" class="period-item">
          <span class="period-label">{{ p.label }}</span>
          <span class="period-badge" :class="toneClass(p.rate)">
            <span class="period-arrow">{{ p.rate > 0 ? '▲' : p.rate < 0 ? '▼' : '■' }}</span>
            <span class="period-num">{{ p.rate > 0 ? '+' : '' }}{{ fmt(p.rate) }}%</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { fmtNumber } from '../format';
import { useI18n } from '../i18n';

const { t } = useI18n();

const props = defineProps({
  bars: { type: Array, default: () => [] },
  currentPrice: { type: Number, default: 0 },
});

const b = computed(() => props.bars || []);

const low52 = computed(() => {
  if (!b.value.length) return props.currentPrice ? props.currentPrice * 0.75 : 550;
  return Math.min(...b.value.map((x) => x.low));
});

const high52 = computed(() => {
  if (!b.value.length) return props.currentPrice ? props.currentPrice * 1.05 : 910;
  return Math.max(...b.value.map((x) => x.high));
});

const percentile52 = computed(() => {
  const min = low52.value;
  const max = high52.value;
  const cur = props.currentPrice || min;
  if (max <= min) return 50;
  const pct = ((cur - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
});

const athDiff = computed(() => {
  const max = high52.value;
  const cur = props.currentPrice || max;
  return Math.max(0, max - cur);
});

const athDrawdown = computed(() => {
  const max = high52.value;
  if (!max) return 0;
  return -((athDiff.value / max) * 100);
});

// 计算各周期涨跌幅
const periods = computed(() => {
  const cur = props.currentPrice;
  const barsArr = b.value;
  if (!cur || !barsArr.length) return [];

  const getReturn = (daysAgo) => {
    if (barsArr.length <= daysAgo) return null;
    const targetBar = barsArr[barsArr.length - 1 - daysAgo];
    if (!targetBar || !targetBar.close) return null;
    return ((cur - targetBar.close) / targetBar.close) * 100;
  };

  return [
    { label: t('historicalRange.d1'), rate: getReturn(1) },
    { label: t('historicalRange.w1'), rate: getReturn(5) },
    { label: t('historicalRange.m1'), rate: getReturn(22) },
    { label: t('historicalRange.m3'), rate: getReturn(66) },
    { label: t('historicalRange.ytd'), rate: getReturn(120) },
    { label: t('historicalRange.y1'), rate: getReturn(240) },
  ];
});

function fmt(v, d = 2) {
  return v !== null && v !== undefined ? fmtNumber(v, d) : '--';
}

function toneClass(rate) {
  if (rate === null || rate === undefined) return 'flat';
  return rate > 0 ? 'up' : rate < 0 ? 'down' : 'flat';
}
</script>

<style scoped>
.range-card {
  padding: 24px;
  background: var(--surface-card);
  border: 1px solid rgba(232, 199, 125, 0.2);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.7);
}

.range-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(232, 199, 125, 0.12);
  color: var(--gold-3);
  border: 1px solid rgba(232, 199, 125, 0.3);
}

.range-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.range-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.range-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 900px) {
  .range-body {
    grid-template-columns: 1.1fr 1fr;
  }
}

.range-slider-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.slider-meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.meta-item.right {
  align-items: flex-end;
}
.meta-current {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.meta-label {
  font-size: 11px;
  color: var(--text-2);
}

.meta-val {
  font-size: 14px;
  font-family: var(--mono);
  color: var(--text);
}
.meta-val.highlight {
  color: var(--gold-3);
  font-weight: 800;
  font-size: 15px;
}

.track-bar {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: var(--surface-hover);
  margin: 8px 0;
}

.track-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #10b981 0%, #e8c77d 60%, #ef4444 100%);
}

.track-pointer {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  display: grid;
  place-items: center;
  transition: left 0.3s ease;
}

.pointer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold-2);
}

.ath-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-2);
  margin-top: 4px;
}
.ath-row b {
  font-family: var(--mono);
  color: var(--down);
}

.ath-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(232, 199, 125, 0.12);
  color: var(--gold-3);
}

.period-ladder {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

@media (min-width: 600px) {
  .period-ladder {
    grid-template-columns: repeat(3, 1fr);
  }
}

.period-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  gap: 4px;
}

.period-label {
  font-size: 11px;
  color: var(--text-2);
}

.period-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
}
.period-badge.up {
  color: var(--up);
}
.period-badge.down {
  color: var(--down);
}
.period-badge.flat {
  color: var(--text-3);
}

.period-arrow {
  font-size: 9px;
}
</style>
