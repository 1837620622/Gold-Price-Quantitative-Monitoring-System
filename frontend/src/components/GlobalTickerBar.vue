<template>
  <div class="ticker-bar" role="region" aria-label="实时多资产快报">
    <div class="container ticker-inner">
      <!-- 滚动走马灯 / 资产小卡片 -->
      <div class="ticker-scroll">
        <!-- AU9999 -->
        <div class="ticker-item" :class="toneClass(domestic?.changePercent)">
          <span class="ticker-tag cn">AU9999</span>
          <span class="ticker-price">¥{{ fmt(domestic?.price) }}</span>
          <span class="ticker-change">
            {{ domestic?.changePercent > 0 ? '+' : '' }}{{ fmt(domestic?.changePercent) }}%
          </span>
        </div>

        <div class="ticker-divider"></div>

        <!-- XAU/USD -->
        <div class="ticker-item" :class="toneClass(intl?.changePercent)">
          <span class="ticker-tag intl">XAU/USD</span>
          <span class="ticker-price">${{ fmt(intl?.price) }}</span>
          <span class="ticker-change">
            {{ intl?.changePercent > 0 ? '+' : '' }}{{ fmt(intl?.changePercent) }}%
          </span>
        </div>

        <div class="ticker-divider"></div>

        <!-- XAG/USD 白银 -->
        <div class="ticker-item">
          <span class="ticker-tag silver">XAG/USD</span>
          <span class="ticker-price">${{ fmt(intl?.silverPrice) }}</span>
        </div>

        <div class="ticker-divider"></div>

        <!-- 金银比 -->
        <div class="ticker-item">
          <span class="ticker-tag ratio">金银比</span>
          <span class="ticker-price">{{ ratioText }}</span>
        </div>

        <div class="ticker-divider"></div>

        <!-- 溢价率 -->
        <div class="ticker-item" :class="premiumTone">
          <span class="ticker-tag premium">国内溢价</span>
          <span class="ticker-price">{{ premiumText }}</span>
        </div>

        <div class="ticker-divider"></div>

        <!-- 汇率 -->
        <div class="ticker-item">
          <span class="ticker-tag fx">USD/CNY</span>
          <span class="ticker-price">{{ fmt(fx?.usdCny, 4) }}</span>
        </div>
      </div>

      <!-- 右侧：控制快捷工具 -->
      <div class="ticker-tools">
        <!-- 声音开关 -->
        <button
          type="button"
          class="tool-btn"
          :class="{ active: soundEnabled }"
          :title="soundEnabled ? '音效已开启（价格变动有轻微金融提示音）' : '点击开启行情变动音效'"
          @click="toggleSound"
        >
          <svg v-if="soundEnabled" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
          <span class="tool-label">{{ soundEnabled ? '音效开' : '静音' }}</span>
        </button>

        <!-- 价格预警弹窗按钮 -->
        <button
          type="button"
          class="tool-btn"
          :class="{ 'has-alerts': alertCount > 0 }"
          title="设置价格突破/跌破告警阈值"
          @click="$emit('open-alert')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span class="tool-label">预警{{ alertCount > 0 ? ` (${alertCount})` : '' }}</span>
        </button>

        <!-- 黄金计算器快捷开关 -->
        <button
          type="button"
          class="tool-btn"
          title="快速打开黄金持仓盈亏与变现计算器"
          @click="$emit('open-calc')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="2" width="16" height="20" rx="2"></rect>
            <line x1="8" y1="6" x2="16" y2="6"></line>
            <line x1="16" y1="14" x2="16" y2="18"></line>
            <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"></path>
          </svg>
          <span class="tool-label">计算器</span>
        </button>

        <!-- 刷新倒计时与下拉 -->
        <div class="refresh-control">
          <div class="countdown-badge" :title="`距离下次刷新还有 ${countdown} 秒`">
            <svg class="ring-svg" width="16" height="16" viewBox="0 0 24 24">
              <circle class="ring-bg" cx="12" cy="12" r="10" />
              <circle
                class="ring-progress"
                cx="12"
                cy="12"
                r="10"
                :stroke-dasharray="ringCircumference"
                :stroke-dashoffset="ringOffset"
              />
            </svg>
            <span class="countdown-num">{{ countdownText }}</span>
          </div>

          <select
            v-model="currentInterval"
            class="interval-select"
            title="选择自动刷新频率"
            @change="handleIntervalChange"
          >
            <option :value="10">10s (极速)</option>
            <option :value="30">30s (标准)</option>
            <option :value="60">60s (省流)</option>
            <option :value="0">手动 (暂停)</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { soundEnabled, toggleSound } from '../lib/sound';
import { fmtNumber } from '../format';

const props = defineProps({
  snapshot: { type: Object, default: null },
  countdown: { type: Number, default: 30 },
  pollInterval: { type: Number, default: 30 },
  alertCount: { type: Number, default: 0 },
});

const emit = defineEmits(['set-interval', 'open-alert', 'open-calc']);

const domestic = computed(() => props.snapshot?.domestic);
const intl = computed(() => props.snapshot?.international);
const fx = computed(() => props.snapshot?.fx);
const premium = computed(() => props.snapshot?.premiumPercent);

const currentInterval = computed({
  get: () => props.pollInterval,
  set: (val) => emit('set-interval', Number(val)),
});

function handleIntervalChange(e) {
  emit('set-interval', Number(e.target.value));
}

function fmt(v, d = 2) {
  return v !== null && v !== undefined ? fmtNumber(v, d) : '--';
}

function toneClass(change) {
  if (change === null || change === undefined) return '';
  return change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
}

const premiumText = computed(() => {
  if (premium.value === null || premium.value === undefined) return '--';
  const sign = premium.value > 0 ? '+' : '';
  return `${sign}${fmtNumber(premium.value, 2)}%`;
});

const premiumTone = computed(() => {
  if (premium.value === null) return '';
  return premium.value > 0 ? 'up' : 'down';
});

const ratioText = computed(() => {
  const g = intl.value?.price;
  const s = intl.value?.silverPrice;
  if (!g || !s) return '--';
  return fmtNumber(g / s, 2);
});

// 环形倒计时动画
const ringCircumference = 2 * Math.PI * 10;
const ringOffset = computed(() => {
  if (props.pollInterval <= 0) return 0;
  const progress = Math.max(0, Math.min(1, props.countdown / props.pollInterval));
  return ringCircumference * (1 - progress);
});

const countdownText = computed(() => {
  if (props.pollInterval <= 0) return '❚❚';
  return `${props.countdown}s`;
});
</script>

<style scoped>
.ticker-bar {
  background: rgba(13, 16, 24, 0.95);
  border-bottom: 1px solid rgba(251, 191, 36, 0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  font-size: 12px;
  position: sticky;
  top: 56px;
  z-index: 30;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.ticker-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  gap: 16px;
  overflow: hidden;
}

.ticker-scroll {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.ticker-scroll::-webkit-scrollbar {
  display: none;
}

.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.ticker-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-2);
}
.ticker-tag.cn {
  color: var(--gold-3);
  background: rgba(251, 191, 36, 0.12);
}
.ticker-tag.intl {
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.12);
}
.ticker-tag.silver {
  color: #cbd5e1;
}

.ticker-price {
  font-weight: 700;
  color: var(--text);
}

.ticker-change {
  font-size: 11px;
  font-weight: 600;
}

.ticker-item.up .ticker-price,
.ticker-item.up .ticker-change {
  color: var(--up);
}
.ticker-item.down .ticker-price,
.ticker-item.down .ticker-change {
  color: var(--down);
}

.ticker-divider {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.ticker-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-2);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tool-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
  border-color: rgba(251, 191, 36, 0.3);
}
.tool-btn.active {
  color: var(--gold-3);
  border-color: rgba(251, 191, 36, 0.4);
  background: rgba(251, 191, 36, 0.08);
}
.tool-btn.has-alerts {
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.4);
}

.refresh-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.countdown-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}
.ring-svg {
  transform: rotate(-90deg);
}
.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 2;
}
.ring-progress {
  fill: none;
  stroke: var(--gold-2);
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s linear;
}
.countdown-num {
  position: absolute;
  font-size: 8px;
  font-weight: 800;
  font-family: var(--mono);
  color: var(--text);
}

.interval-select {
  height: 26px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-2);
  font-size: 11px;
  cursor: pointer;
}
.interval-select:focus {
  outline: none;
  border-color: var(--gold-2);
}

@media (max-width: 768px) {
  .tool-label {
    display: none;
  }
}
</style>
