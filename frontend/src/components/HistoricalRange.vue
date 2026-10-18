<template>
  <div class="card range-card">
    <header class="range-head">
      <div class="head-left">
        <div class="range-icon">
          <Icon name="chart" :size="20" />
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

        <!-- 进度条：实心轨道、实心填充、实心指针 -->
        <div class="track-bar">
          <div class="track-fill" :style="{ width: `${percentile52}%` }"></div>
          <div class="track-pointer" :style="{ left: `${percentile52}%` }" :title="t('historicalRange.percentile', { value: percentile52 })"></div>
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
            <span class="period-arrow" aria-hidden="true">
              <Icon v-if="p.rate > 0" name="chevron-up" :size="14" />
              <Icon v-else-if="p.rate < 0" name="chevron-up" :size="14" class="is-down" />
              <span v-else class="period-flat"></span>
            </span>
            <span class="period-num">{{ p.rate > 0 ? '+' : '' }}{{ fmt(p.rate) }}%</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Icon from './icons/Icon.vue';
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
  box-shadow: none;
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
  min-width: 0;
}

/* 图标方框：发丝边，金色图标 */
.range-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--gold);
}

.range-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--text);
  word-break: keep-all;
  overflow-wrap: break-word;
}

:lang(zh) .range-title {
  letter-spacing: 0;
}

.range-sub {
  margin: 4px 0 0;
  font-size: 13px;
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
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.slider-meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.meta-item.right {
  align-items: flex-end;
}

.meta-current {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.meta-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
}

:lang(zh) .meta-label {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.meta-val {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.meta-val.highlight {
  font-size: 16px;
}

/* 实心轨道、实心填充、实心指针：不使用渐变 */
.track-bar {
  position: relative;
  height: 6px;
  margin: 10px 0;
  border-radius: 2px;
  background: var(--line-strong);
}

.track-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--gold);
}

.track-pointer {
  position: absolute;
  top: 50%;
  width: 3px;
  height: 18px;
  border-radius: 1px;
  background: var(--text);
  transform: translate(-50%, -50%);
  transition: left 0.3s var(--ease-out);
}

.ath-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 8px;
  font-size: 13px;
  color: var(--text-2);
}

.ath-row b {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--down);
}

.ath-tag {
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
  white-space: nowrap;
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
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.period-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-2);
}

:lang(zh) .period-label {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.period-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
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
  display: inline-grid;
  place-items: center;
  width: 14px;
  height: 14px;
}

.period-arrow .is-down {
  transform: rotate(180deg);
}

.period-flat {
  display: block;
  width: 8px;
  height: 1px;
  background: currentColor;
}

@media (max-width: 767px) {
  .range-card {
    padding: 16px;
  }

  .range-title {
    font-size: 18px;
  }

  .range-head {
    margin-bottom: 16px;
  }

  .range-body {
    gap: 16px;
  }

  .range-slider-box {
    padding: 14px;
  }

  /* 当前价单独占一行，52 周高低点分列两侧，避免三段文字挤在一起 */
  .slider-meta {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px 12px;
    align-items: end;
  }

  .meta-current {
    grid-column: 1 / -1;
    order: -1;
    align-items: flex-start;
  }

  .meta-item.right {
    align-items: flex-end;
  }

  .meta-val.highlight {
    font-size: 16px;
  }

  .ath-row {
    gap: 6px;
  }

  .period-ladder {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .period-item {
    padding: 10px;
  }
}
</style>
