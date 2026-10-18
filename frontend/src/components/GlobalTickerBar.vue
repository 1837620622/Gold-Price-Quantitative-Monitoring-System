<template>
  <div class="ticker-bar" role="region" :aria-label="t('globalTicker.aria')">
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
          <span class="ticker-tag ratio">{{ t('globalTicker.ratio') }}</span>
          <span class="ticker-price">{{ ratioText }}</span>
        </div>

        <div class="ticker-divider"></div>

        <!-- 溢价率 -->
        <div class="ticker-item" :class="premiumTone">
          <span class="ticker-tag premium">{{ t('globalTicker.premium') }}</span>
          <span class="ticker-price">{{ premiumText }}</span>
        </div>

        <div class="ticker-divider"></div>

        <!-- 汇率 -->
        <div class="ticker-item">
          <span class="ticker-tag fx">USD/CNY</span>
          <span class="ticker-price">{{ fmt(fx?.usdCny, 4) }}</span>
        </div>
      </div>

      <!-- 右侧：控制快捷工具。手机端行情条隐藏，这组控件挂到顶部 ☰ 菜单（AppHeader 的 #nav-tools-slot） -->
      <!-- defer：目标元素在首次挂载时还未插入文档，等挂载完成后再解析，避免移动时拿到 null -->
      <Teleport defer to="#nav-tools-slot" :disabled="!inMenu">
        <div class="ticker-tools" :class="{ 'in-menu': inMenu }">
          <!-- 声音开关 -->
          <button
            type="button"
            class="tool-btn"
            :class="{ active: soundEnabled }"
            :title="soundEnabled ? t('globalTicker.soundOn') : t('globalTicker.soundOff')"
            @click="toggleSound"
          >
            <svg v-if="soundEnabled" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
            <span class="tool-label">{{ inMenu ? t('chromeMobile.sound') : (soundEnabled ? t('globalTicker.soundOnShort') : t('globalTicker.muted')) }}</span>
            <span v-if="inMenu" class="tool-state">{{ soundEnabled ? t('chromeMobile.on') : t('chromeMobile.off') }}</span>
          </button>

          <!-- 价格预警弹窗按钮 -->
          <button
            type="button"
            class="tool-btn"
            :class="{ 'has-alerts': alertCount > 0 }"
            :title="t('globalTicker.alertThreshold')"
            @click="$emit('open-alert')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="tool-label">{{ t('globalTicker.alerts') }}{{ alertCount > 0 ? ` (${alertCount})` : '' }}</span>
          </button>

          <!-- 黄金计算器快捷开关（手机端菜单里已有这一项） -->
          <button
            v-if="!inMenu"
            type="button"
            class="tool-btn"
            :title="t('globalTicker.calcHint')"
            @click="$emit('open-calc')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="4" y="2" width="16" height="20" rx="2"></rect>
              <line x1="8" y1="6" x2="16" y2="6"></line>
              <line x1="16" y1="14" x2="16" y2="18"></line>
              <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"></path>
            </svg>
            <span class="tool-label">{{ t('globalTicker.calc') }}</span>
          </button>

          <!-- 刷新倒计时与下拉 -->
          <div class="refresh-control">
            <div class="countdown-badge" :title="t('globalTicker.nextRefresh', { countdown })">
              <svg class="ring-svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
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

            <span v-if="inMenu" class="menu-label">{{ t('chromeMobile.interval') }}</span>

            <select
              v-model="currentInterval"
              class="interval-select"
              :title="t('globalTicker.intervalHint')"
              :aria-label="t('globalTicker.intervalHint')"
            >
              <option :value="10">{{ t('globalTicker.fast') }}</option>
              <option :value="30">{{ t('globalTicker.standard') }}</option>
              <option :value="60">{{ t('globalTicker.saver') }}</option>
              <option :value="0">{{ t('globalTicker.paused') }}</option>
            </select>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { soundEnabled, toggleSound } from '../lib/sound';
import { fmtNumber } from '../format';
import { useI18n } from '../i18n';

const { t } = useI18n();

const props = defineProps({
  snapshot: { type: Object, default: null },
  countdown: { type: Number, default: 30 },
  pollInterval: { type: Number, default: 30 },
  alertCount: { type: Number, default: 0 },
});

const emit = defineEmits(['set-interval', 'open-alert', 'open-calc']);

// 手机端（767px 及以下）行情条隐藏，控件改挂到顶部菜单（AppHeader 提供 #nav-tools-slot）
const inMenu = ref(false);
let phoneQuery = null;

function onPhoneQuery(e) {
  inMenu.value = e.matches;
}

onMounted(() => {
  if (!window.matchMedia) return;
  phoneQuery = window.matchMedia('(max-width: 767px)');
  inMenu.value = phoneQuery.matches;
  phoneQuery.addEventListener('change', onPhoneQuery);
});

onUnmounted(() => {
  phoneQuery?.removeEventListener('change', onPhoneQuery);
});

const domestic = computed(() => props.snapshot?.domestic);
const intl = computed(() => props.snapshot?.international);
const fx = computed(() => props.snapshot?.fx);
const premium = computed(() => props.snapshot?.premiumPercent);

// v-model 的 change 事件已经会走这里，不再额外绑定 @change，避免重复发出 set-interval
const currentInterval = computed({
  get: () => props.pollInterval,
  set: (val) => emit('set-interval', Number(val)),
});

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
  background: color-mix(in srgb, var(--surface-card) 92%, transparent);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  font-size: 12px;
  position: sticky;
  top: var(--nav-h);
  z-index: 90;
  height: var(--ticker-h);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
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
  font-family: var(--font-display), var(--mono);
  font-stretch: 108%;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.ticker-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  color: var(--text-2);
}
.ticker-tag.cn {
  color: var(--gold-3);
  background: color-mix(in srgb, var(--gold) 12%, transparent);
}
.ticker-tag.intl {
  color: var(--info);
  background: var(--info-bg);
}
.ticker-tag.silver {
  color: var(--dim);
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
  background: color-mix(in srgb, var(--ink) 8%, transparent);
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
  border: 1px solid color-mix(in srgb, var(--ink) 8%, transparent);
  background: color-mix(in srgb, var(--ink) 3%, transparent);
  color: var(--text-2);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}
@media (hover: hover) and (pointer: fine) {
  .tool-btn:hover {
    background: color-mix(in srgb, var(--ink) 8%, transparent);
    color: var(--text);
    border-color: color-mix(in srgb, var(--gold) 30%, transparent);
  }
}
.tool-btn.active {
  color: var(--gold-3);
  border-color: color-mix(in srgb, var(--gold) 40%, transparent);
  background: color-mix(in srgb, var(--gold) 8%, transparent);
}
.tool-btn.has-alerts {
  color: var(--info);
  border-color: color-mix(in srgb, var(--info) 40%, transparent);
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
  stroke: color-mix(in srgb, var(--ink) 10%, transparent);
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
  border: 1px solid color-mix(in srgb, var(--ink) 8%, transparent);
  background: color-mix(in srgb, var(--ink) 4%, transparent);
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

/* 手机端：行情条隐藏（控件在顶部菜单里） */
@media (max-width: 767px) {
  .ticker-bar {
    display: none;
  }
}

/* 手机端菜单里的行情控件：按 44px 行排列，触控目标不小于 44px */
.ticker-tools.in-menu {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  width: 100%;
}
.ticker-tools.in-menu .tool-btn {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 14px;
  justify-content: flex-start;
}
.ticker-tools.in-menu .tool-label {
  display: inline;
}
.ticker-tools.in-menu .tool-state {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-3);
}
.ticker-tools.in-menu .tool-btn.active .tool-state {
  color: var(--gold-3);
}
.ticker-tools.in-menu .refresh-control {
  width: 100%;
  min-height: 48px;
  padding: 2px 6px 2px 12px;
  gap: 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--ink) 8%, transparent);
  background: color-mix(in srgb, var(--ink) 3%, transparent);
}
.ticker-tools.in-menu .countdown-badge {
  flex: none;
  width: auto;
  height: auto;
  gap: 6px;
}
.ticker-tools.in-menu .countdown-num {
  position: static;
  font-size: 12px;
}
.ticker-tools.in-menu .menu-label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 14px;
  color: var(--text-2);
}
.ticker-tools.in-menu .interval-select {
  flex: 0 1 50%;
  min-width: 0;
  height: 44px;
  padding: 0 8px;
  border-radius: 8px;
  font-size: 16px;
}
</style>
