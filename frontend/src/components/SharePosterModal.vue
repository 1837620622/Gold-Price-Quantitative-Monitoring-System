<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="modal-head">
        <div class="head-title-wrap">
          <div class="share-icon">✦</div>
          <div>
            <h3 class="modal-title">{{ t('sharePoster.title') }}</h3>
            <p class="modal-sub">{{ t('sharePoster.desc') }}</p>
          </div>
        </div>
        <button type="button" class="close-btn" @click="$emit('close')">✕</button>
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
            <span>{{ t('sharePoster.verdict') }}<b>{{ quant.signal.label }}</b> {{ t('sharePoster.score', { score: quant.signal.score }) }}</span>
            <span class="v-trend">{{ quant.signal.trend }} · {{ quant.signal.volRegime }}</span>
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
          {{ copied ? t('sharePoster.copied') : t('sharePoster.copy') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { fmtNumber, fmtSigned } from '../format';
import { tField, useI18n } from '../i18n';

const { t, tLabel } = useI18n();

const props = defineProps({
  open: { type: Boolean, default: false },
  snapshot: { type: Object, default: null },
  quant: { type: Object, default: null },
});

defineEmits(['close']);

const copied = ref(false);

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

  const text = [
    t('sharePoster.copyHeader'),
    `⏰ ${t('sharePoster.copyTime', { time: timeText.value })}`,
    `--------------------------`,
    `🇨🇳 ${t('sharePoster.copyDomestic', { price: fmt(dom?.price), pct: `${dom?.changePercent > 0 ? '+' : ''}${fmt(dom?.changePercent)}` })}`,
    `🌍 ${t('sharePoster.copyIntl', { price: fmt(xau?.price), pct: `${xau?.changePercent > 0 ? '+' : ''}${fmt(xau?.changePercent)}` })}`,
    `⚖️ ${t('sharePoster.copyRatio', { ratio: fmt(ratio.value), premium: fmtSigned(props.snapshot?.premiumPercent) })}`,
    s ? `📊 ${t('sharePoster.copyRating', { label: tLabel(s.label), score: s.score, trend: tLabel(s.trend) })}` : '',
    l ? `🛡️ ${t('sharePoster.copyLevels', { support: l.support?.join('/'), resistance: l.resistance?.join('/') })}` : '',
    l ? `🎯 ${t('sharePoster.copyRange', { low: fmt(l.refLow), high: fmt(l.refHigh) })}` : '',
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
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 520px;
  background: var(--surface-card);
  border: 1px solid rgba(232, 199, 125, 0.3);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.head-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.share-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(232, 199, 125, 0.15);
  color: var(--gold-3);
  font-size: 18px;
  border: 1px solid rgba(232, 199, 125, 0.3);
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.modal-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-3);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.close-btn:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.1);
}

/* 海报卡片样式 */
.poster-preview {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
  background: #0c0e15;
  border: 1px solid rgba(232, 199, 125, 0.35);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  margin-bottom: 20px;
}

.poster-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
}

.poster-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.p-symbol {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--gold);
  color: var(--gold-ink);
  font-weight: 900;
  font-size: 16px;
  display: grid;
  place-items: center;
}

.p-brand {
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.06em;
}

.p-sub {
  font-size: 10px;
  color: var(--gold-3);
}

.p-time {
  font-size: 11px;
  font-family: var(--mono);
  color: var(--text-3);
}

.poster-prices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.p-price-box {
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.p-label {
  font-size: 11px;
  color: var(--text-2);
}

.p-val {
  font-size: 22px;
  font-weight: 800;
  font-family: var(--mono);
  color: #ffffff;
  margin: 4px 0 2px;
}

.p-chg {
  font-size: 12px;
  font-family: var(--mono);
  font-weight: 600;
}
.p-chg.up {
  color: var(--up);
}
.p-chg.down {
  color: var(--down);
}

.poster-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  font-size: 11px;
}
.poster-stats div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.poster-stats span {
  color: var(--text-3);
}
.poster-stats b {
  font-family: var(--mono);
  color: #ffffff;
}

.poster-verdict {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.poster-verdict.up {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
}
.poster-verdict.down {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.08);
}

.v-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
}
.v-trend {
  font-size: 11px;
  color: var(--gold-3);
}

.v-reason {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--text-2);
}

.poster-levels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(232, 199, 125, 0.06);
  border: 1px solid rgba(232, 199, 125, 0.2);
  font-size: 11px;
}
.poster-levels span {
  color: var(--gold-3);
}
.poster-levels b {
  font-family: var(--mono);
  color: #ffffff;
}

.poster-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-3);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 10px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
