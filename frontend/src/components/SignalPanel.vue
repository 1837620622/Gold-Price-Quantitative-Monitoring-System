<template>
  <section class="card signal" aria-labelledby="signal-title">
    <header class="head">
      <div>
        <h2 id="signal-title" class="title">{{ t('signalPanel.title') }}</h2>
        <p class="sub">{{ t('signalPanel.asOf', { asOf }) }}</p>
      </div>
      <div class="chips">
        <span class="chip">{{ t('signalPanel.trend', { trend: tLabel(signal.trend) }) }}</span>
        <span class="chip">{{ t('signalPanel.regime', { regime: tLabel(signal.volRegime) }) }}</span>
      </div>
    </header>

    <div class="verdict" :class="`tone-${toneKey}`">
      <span class="verdict-label">{{ tLabel(signal.label) }}</span>
      <span class="verdict-score">{{ scoreText }}</span>
      <span class="verdict-conf">{{ t('signalPanel.confidence', { confidence: signal.confidence }) }}</span>
    </div>

    <div class="meter" role="img" :aria-label="t('signalPanel.scoreAria', { score: scoreText })">
      <div class="meter-track">
        <span class="meter-zone zone-down"></span>
        <span class="meter-zone zone-mid"></span>
        <span class="meter-zone zone-up"></span>
      </div>
      <span class="meter-marker" :style="{ left: markerLeft }"></span>
      <div class="meter-scale" aria-hidden="true"><span>-100</span><span>-40</span><span>0</span><span>+40</span><span>+100</span></div>
    </div>

    <ul class="components">
      <li v-for="c in signal.components" :key="c.key" class="comp">
        <div class="comp-head">
          <span class="comp-name">{{ tLabel(c.label) }}</span>
          <span class="comp-meta">{{ t('signalPanel.weight', { weight: c.weight, score: signedScore(c.score) }) }}</span>
        </div>
        <div class="comp-bar" aria-hidden="true">
          <span class="comp-fill" :class="c.score >= 0 ? 'pos' : 'neg'" :style="fillStyle(c.score)"></span>
        </div>
        <p class="comp-reason">{{ tField(c, 'reason') }}</p>
      </li>
    </ul>

    <dl v-if="levels" class="levels">
      <div>
        <dt>{{ t('signalPanel.support') }}</dt>
        <dd>{{ levels.support.join(' / ') }}</dd>
      </div>
      <div>
        <dt>{{ t('signalPanel.resistance') }}</dt>
        <dd>{{ levels.resistance.join(' / ') }}</dd>
      </div>
      <div>
        <dt>{{ t('signalPanel.range') }}</dt>
        <dd>{{ fmt(levels.refLow) }} – {{ fmt(levels.refHigh) }}</dd>
      </div>
      <div>
        <dt>ATR(14)</dt>
        <dd>{{ t('signalPanel.atr', { atr: fmt(levels.atr), percent: fmt(levels.atrPercent) }) }}</dd>
      </div>
    </dl>

    <p class="disclaimer">
      {{ t('signalPanel.disclaimer') }}
    </p>
  </section>
</template>

<script setup>
import { tField, useI18n } from '../i18n';
const { t, tLabel } = useI18n();
import { computed } from 'vue';
import { fmtNumber } from '../format';

const props = defineProps({
  signal: { type: Object, required: true },
  levels: { type: Object, default: null },
  asOf: { type: String, default: '' },
});

const score = computed(() => (Number.isFinite(props.signal.score) ? props.signal.score : 0));
const scoreText = computed(() => `${score.value >= 0 ? '+' : ''}${score.value.toFixed(1)}`);
const markerLeft = computed(() => `${((score.value + 100) / 200) * 100}%`);
const toneKey = computed(() => (score.value >= 0 ? 'up' : 'down'));

const fmt = (v) => fmtNumber(v);
const signedScore = (v) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}` : '--');

// 分量得分为 [-1, 1]，以中线为原点的双向条形图
function fillStyle(value) {
  const magnitude = Math.min(1, Math.abs(value)) * 50;
  return value >= 0
    ? { left: '50%', width: `${magnitude}%` }
    : { left: `${50 - magnitude}%`, width: `${magnitude}%` };
}

</script>

<style scoped>
.signal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: none;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.title {
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

:lang(zh) .title {
  letter-spacing: 0;
}

.sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 结论：展示字；涨跌色作用于结论与分数 */
.verdict {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.verdict-label {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--text);
}

:lang(zh) .verdict-label {
  letter-spacing: 0;
}

.verdict-score {
  font-family: var(--font-mono);
  font-size: 21px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: var(--text);
}

.verdict-conf {
  font-size: 13px;
  color: var(--text-2);
}

.verdict.tone-up .verdict-label,
.verdict.tone-up .verdict-score {
  color: var(--up);
}

.verdict.tone-down .verdict-label,
.verdict.tone-down .verdict-score {
  color: var(--down);
}

/* 评分刻度：中性轨道，中段略亮；金色指针 */
.meter {
  position: relative;
  padding-bottom: 18px;
}

.meter-track {
  display: flex;
  height: 6px;
  border: 1px solid var(--line);
  border-radius: 2px;
  overflow: hidden;
  background: var(--surface-2);
}

.meter-zone {
  flex: 1;
}

.zone-down { background: var(--surface-2); }
.zone-mid { background: var(--surface-hover); flex: 0.8; }
.zone-up { background: var(--surface-2); }

.meter-marker {
  position: absolute;
  top: -6px;
  width: 3px;
  height: 18px;
  margin-left: -1.5px;
  border-radius: 1px;
  background: var(--gold);
  transition: left 0.4s var(--ease-out);
}

.meter-scale {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-3);
}

.components {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}

.comp-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
}

.comp-name {
  font-weight: 500;
  color: var(--text);
  word-break: keep-all;
  overflow-wrap: break-word;
}

.comp-meta {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
  white-space: nowrap;
}

.comp-bar {
  position: relative;
  height: 4px;
  margin: 8px 0 6px;
  border-radius: 2px;
  background: var(--surface-2);
}

.comp-bar::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -3px;
  bottom: -3px;
  width: 1px;
  background: var(--line-strong);
}

/* 分量条从中线向两侧延伸，方向由位置表达，颜色保持中性 */
.comp-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 2px;
  background: var(--text-2);
}

.comp-reason {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

.levels {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.levels dt {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
}

:lang(zh) .levels dt {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.levels dd {
  margin: 4px 0 0;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.disclaimer {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

@media (max-width: 767px) {
  .signal {
    gap: 14px;
  }

  .title {
    font-size: 18px;
  }

  .verdict-label {
    font-size: 24px;
  }

  .verdict-score {
    font-size: 19px;
  }

  .components {
    gap: 8px;
  }

  /* 因子卡片：标题、权重与理由上下堆叠，发丝边收紧 */
  .comp {
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: transparent;
  }

  .comp-head {
    flex-wrap: wrap;
    align-items: baseline;
    row-gap: 2px;
    font-size: 14px;
  }

  .levels {
    gap: 10px 12px;
  }
}
</style>
