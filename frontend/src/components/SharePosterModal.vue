<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="modal-head">
        <div class="head-title-wrap">
          <Icon name="poster" :size="20" class="head-icon" />
          <div>
            <h3 class="modal-title">{{ t('sharePoster.title') }}</h3>
            <p class="modal-sub">{{ t('sharePoster.desc') }}</p>
          </div>
        </div>
        <button type="button" class="icon-btn" :aria-label="t('sharePoster.close')" @click="$emit('close')">
          <Icon name="close" :size="18" />
        </button>
      </header>

      <!-- 海报预览区域 -->
      <div id="poster-canvas" class="poster-preview">
        <!-- 头部 Logo -->
        <div class="poster-head">
          <div class="poster-logo">
            <span class="p-symbol">Au</span>
            <div>
              <div class="p-brand">GOLD MONITOR</div>
              <div class="p-sub">{{ t('sharePoster.brandTag') }}</div>
            </div>
          </div>
          <div class="p-time">{{ timeText }}</div>
        </div>

        <!-- 价格大字对比 -->
        <div class="poster-prices">
          <div class="p-price-box">
            <span class="p-label">{{ t('sharePoster.domestic') }}</span>
            <div class="p-val">¥{{ fmt(domestic?.price) }}</div>
            <div class="p-chg" :class="toneClass(domestic?.changePercent)">
              {{ domestic?.changePercent > 0 ? '+' : '' }}{{ fmt(domestic?.changePercent) }}%
              ({{ fmtSigned(domestic?.change) }})
            </div>
          </div>
          <div class="p-price-box">
            <span class="p-label">{{ t('sharePoster.intl') }}</span>
            <div class="p-val">${{ fmt(intl?.price) }}</div>
            <div class="p-chg" :class="toneClass(intl?.changePercent)">
              {{ intl?.changePercent > 0 ? '+' : '' }}{{ fmt(intl?.changePercent) }}%
            </div>
          </div>
        </div>

        <!-- 关键因子与跨市场 -->
        <div class="poster-stats">
          <div><span>{{ t('sharePoster.ratio') }}</span><b>{{ fmt(ratio) }}</b></div>
          <div><span>{{ t('sharePoster.premium') }}</span><b>{{ fmtSigned(snapshot?.premiumPercent) }}%</b></div>
          <div><span>{{ t('sharePoster.fx') }}</span><b>{{ fmt(snapshot?.fx?.usdCny, 4) }}</b></div>
          <div><span>{{ t('sharePoster.atr') }}</span><b>¥{{ fmt(quant?.levels?.atr) }}</b></div>
        </div>

        <!-- 量化信号定调 -->
        <div v-if="quant?.signal" class="poster-verdict" :class="signalTone">
          <div class="v-title">
            <span>{{ t('sharePoster.verdict') }}<b>{{ tLabel(quant.signal.label) }}</b> {{ t('sharePoster.score', { score: quant.signal.score }) }}</span>
            <span class="v-trend">{{ tLabel(quant.signal.trend) }} · {{ tLabel(quant.signal.volRegime) }}</span>
          </div>
          <p class="v-reason">{{ tField(quant.signal, 'reasons')?.[0] || t('sharePoster.fallbackReason') }}</p>
        </div>

        <!-- 支撑阻力区间 -->
        <div v-if="quant?.levels" class="poster-levels">
          <div><span>{{ t('sharePoster.support') }}</span><b>¥{{ fmt(quant.levels.stopLongRef) }}</b></div>
          <div><span>{{ t('sharePoster.range') }}</span><b>¥{{ fmt(quant.levels.refLow) }} ~ ¥{{ fmt(quant.levels.refHigh) }}</b></div>
        </div>

        <!-- 底部水印 -->
        <div class="poster-foot">
          <span>{{ t('sharePoster.terminal') }}</span>
          <span>{{ t('sharePoster.disclaimer') }}</span>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" @click="$emit('close')">
          {{ t('sharePoster.close') }}
        </button>
        <button type="button" class="btn btn-primary" @click="copyText">
          <Icon v-if="copied" name="check" :size="14" />
          {{ copied ? t('sharePoster.copied') : t('sharePoster.copy') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { fmtNumber, fmtSigned } from '../format';
import { tField, useI18n } from '../i18n';
import Icon from './icons/Icon.vue';

const { t, tLabel } = useI18n();

const props = defineProps({
  open: { type: Boolean, default: false },
  snapshot: { type: Object, default: null },
  quant: { type: Object, default: null },
});

defineEmits(['close']);

const copied = ref(false);

// 弹层打开时锁住背后页面滚动（视口由 html 决定，见 SubscribeModal 同名注释）
function lockScroll(locked) {
  const value = locked ? 'hidden' : '';
  document.documentElement.style.overflow = value;
  document.body.style.overflow = value;
}
watch(() => props.open, (isOpen) => lockScroll(isOpen));
onUnmounted(() => lockScroll(false));

const domestic = computed(() => props.snapshot?.domestic);
const intl = computed(() => props.snapshot?.international);
const ratio = computed(() => {
  const g = intl.value?.price;
  const s = intl.value?.silverPrice;
  return g && s ? g / s : null;
});

const timeText = computed(() => new Date().toLocaleString('zh-CN', { hour12: false }));

const signalTone = computed(() => {
  const score = props.quant?.signal?.score;
  if (!score) return '';
  return score > 0 ? 'up' : score < 0 ? 'down' : '';
});

function fmt(v, d = 2) {
  return v !== null && v !== undefined ? fmtNumber(v, d) : '--';
}

function toneClass(change) {
  if (!change) return '';
  return change > 0 ? 'up' : change < 0 ? 'down' : '';
}

async function copyText() {
  const dom = domestic.value;
  const xau = intl.value;
  const s = props.quant?.signal;
  const l = props.quant?.levels;

  // 剪贴板为纯文本，不带表情符号；图标只用于界面
  const text = [
    t('sharePoster.copyHeader'),
    t('sharePoster.copyTime', { time: timeText.value }),
    `--------------------------`,
    t('sharePoster.copyDomestic', { price: fmt(dom?.price), pct: `${dom?.changePercent > 0 ? '+' : ''}${fmt(dom?.changePercent)}` }),
    t('sharePoster.copyIntl', { price: fmt(xau?.price), pct: `${xau?.changePercent > 0 ? '+' : ''}${fmt(xau?.changePercent)}` }),
    t('sharePoster.copyRatio', { ratio: fmt(ratio.value), premium: fmtSigned(props.snapshot?.premiumPercent) }),
    s ? t('sharePoster.copyRating', { label: tLabel(s.label), score: s.score, trend: tLabel(s.trend) }) : '',
    l ? t('sharePoster.copyLevels', { support: l.support?.join('/'), resistance: l.resistance?.join('/') }) : '',
    l ? t('sharePoster.copyRange', { low: fmt(l.refLow), high: fmt(l.refHigh) }) : '',
    `--------------------------`,
    t('sharePoster.copyTerminal'),
  ].filter(Boolean).join('\n');

  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  } catch {}
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.75);
}

.modal-card {
  width: 100%;
  max-width: 520px;
  background: var(--surface-card);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  padding: 24px;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.head-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.head-icon {
  flex-shrink: 0;
  color: var(--gold);
}

.modal-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--text);
}

:lang(zh) .modal-title {
  letter-spacing: 0;
}

.modal-sub {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

:lang(zh) .modal-sub {
  line-height: 1.75;
}

/* 海报画布：固定深色配色，不随日夜主题变化；无渐变、无阴影 */
.poster-preview {
  --p-text: #f3efe6;
  --p-dim: #a9a399;
  --p-faint: #8b867b;
  --p-gold: #e8c77d;
  --p-ink: #0a0907;
  --p-up: #ef4444;
  --p-down: #10b981;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: #0c0e15;
  border: 1px solid rgba(232, 199, 125, 0.35);
  margin-bottom: 20px;
}

.poster-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
}

.poster-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

/* 字标 Au：衬线字，纯金实心方块，圆角 3px */
.p-symbol {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius);
  background: var(--p-gold);
  color: var(--p-ink);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 500;
  line-height: 1;
}

.p-brand {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--p-text);
}

.p-sub {
  font-size: 12px;
  line-height: 1.5;
  color: var(--p-gold);
}

.p-time {
  font-family: var(--mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--p-faint);
}

.poster-prices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.p-price-box {
  padding: 12px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.p-label {
  font-size: 12px;
  color: var(--p-dim);
}

.p-val {
  margin: 4px 0 2px;
  font-family: var(--mono);
  font-size: 22px;
  font-weight: 500;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  color: var(--p-text);
}

/* 涨跌色只用于数值文字 */
.p-chg {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--p-dim);
}

.p-chg.up {
  color: var(--p-up);
}

.p-chg.down {
  color: var(--p-down);
}

.poster-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 10px;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.3);
  font-size: 12px;
}

.poster-stats div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.poster-stats span {
  color: var(--p-faint);
}

.poster-stats b {
  font-family: var(--mono);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--p-text);
  overflow-wrap: anywhere;
}

/* 定调框保持中性，涨跌色只落在标签文字上 */
.poster-verdict {
  padding: 12px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.poster-verdict.up .v-title b {
  color: var(--p-up);
}

.poster-verdict.down .v-title b {
  color: var(--p-down);
}

.v-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  color: var(--p-text);
}

.v-title b {
  font-weight: 500;
  color: var(--p-text);
}

.v-trend {
  font-size: 12px;
  color: var(--p-gold);
}

.v-reason {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--p-dim);
}

.poster-levels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius);
  background: rgba(232, 199, 125, 0.06);
  border: 1px solid rgba(232, 199, 125, 0.2);
  font-size: 12px;
}

.poster-levels span {
  color: var(--p-gold);
}

.poster-levels b {
  font-family: var(--mono);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--p-text);
}

.poster-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--p-faint);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 10px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* ---------- 手机端：底部弹出的全宽面板；海报两列排列；按钮 44px ---------- */
@media (max-width: 767px) {
  .modal-backdrop {
    place-items: end center;
    padding: 0;
  }

  .modal-card {
    max-width: none;
    max-height: 88vh;
    max-height: 88dvh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 18px 14px calc(16px + env(safe-area-inset-bottom));
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .modal-head {
    margin-bottom: 14px;
  }

  .modal-title {
    font-size: 18px;
  }

  .modal-head .icon-btn {
    width: 44px;
    height: 44px;
  }

  .poster-preview {
    gap: 12px;
    padding: 14px;
  }

  .p-val {
    font-size: 20px;
  }

  .poster-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .poster-levels {
    flex-wrap: wrap;
    gap: 6px 12px;
  }

  .v-title {
    flex-wrap: wrap;
    gap: 4px 10px;
  }

  .v-reason {
    font-size: 12px;
    line-height: 1.6;
  }

  .poster-foot {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .modal-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .modal-actions .btn {
    width: 100%;
    height: 44px;
  }
}
</style>
