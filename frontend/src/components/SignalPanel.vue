<template>
  <section class="card signal" aria-labelledby="signal-title">
    <header class="head">
      <div>
        <h2 id="signal-title" class="title">量化信号</h2>
        <p class="sub">多因子评分 · 基于截至 {{ asOf }} 的日K</p>
      </div>
      <div class="chips">
        <span class="chip">趋势 {{ signal.trend }}</span>
        <span class="chip">波动 {{ signal.volRegime }}</span>
      </div>
    </header>

    <div class="verdict" :class="`tone-${toneKey}`">
      <span class="verdict-label">{{ signal.label }}</span>
      <span class="verdict-score">{{ scoreText }}</span>
      <span class="verdict-conf">置信度 {{ signal.confidence }}%</span>
    </div>

    <div class="meter" role="img" :aria-label="`量化评分 ${scoreText}，范围 -100 到 +100`">
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
          <span class="comp-name">{{ c.label }}</span>
          <span class="comp-meta">权重 {{ c.weight }} · {{ signedScore(c.score) }}</span>
        </div>
        <div class="comp-bar" aria-hidden="true">
          <span class="comp-fill" :class="c.score >= 0 ? 'pos' : 'neg'" :style="fillStyle(c.score)"></span>
        </div>
        <p class="comp-reason">{{ c.reason }}</p>
      </li>
    </ul>

    <dl v-if="levels" class="levels">
      <div>
        <dt>支撑</dt>
        <dd>{{ levels.support.join(' / ') }}</dd>
      </div>
      <div>
        <dt>阻力</dt>
        <dd>{{ levels.resistance.join(' / ') }}</dd>
      </div>
      <div>
        <dt>参考区间</dt>
        <dd>{{ fmt(levels.refLow) }} – {{ fmt(levels.refHigh) }}</dd>
      </div>
      <div>
        <dt>ATR(14)</dt>
        <dd>{{ fmt(levels.atr) }}（{{ fmt(levels.atrPercent) }}%）</dd>
      </div>
    </dl>

    <p class="disclaimer">
      量化参考，不构成投资建议。参考区间与止损参考位由 ATR 及枢轴点推算，仅用于风险控制讨论。
    </p>
  </section>
</template>

<script setup>
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
  font-size: 16px;
  font-weight: 650;
  color: var(--text);
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

.verdict {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.verdict-label {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.verdict-score {
  font-family: 'Archivo', var(--mono);
  font-stretch: 110%;
  font-size: 21px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.verdict-conf {
  font-size: 13px;
  color: var(--text-2);
}

.verdict.tone-up .verdict-label,
.verdict.tone-up .verdict-score { color: var(--up); }
.verdict.tone-down .verdict-label,
.verdict.tone-down .verdict-score { color: var(--down); }

.meter {
  position: relative;
  padding-bottom: 18px;
}

.meter-track {
  display: flex;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.meter-zone {
  flex: 1;
}

.zone-down { background: linear-gradient(90deg, rgba(16, 185, 129, 0.85), rgba(16, 185, 129, 0.35)); }
.zone-mid { background: var(--surface-2); flex: 0.8; }
.zone-up { background: linear-gradient(90deg, rgba(239, 68, 68, 0.35), rgba(239, 68, 68, 0.85)); }

.meter-marker {
  position: absolute;
  top: -5px;
  width: 4px;
  height: 20px;
  margin-left: -2px;
  border-radius: 2px;
  background: var(--text);
  box-shadow: 0 0 0 3px var(--surface);
  transition: left 0.4s ease;
}

.meter-scale {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.components {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.comp-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.comp-name {
  font-weight: 600;
}

.comp-meta {
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.comp-bar {
  position: relative;
  height: 6px;
  margin: 6px 0 4px;
  border-radius: 999px;
  background: var(--surface-2);
}

.comp-bar::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -2px;
  bottom: -2px;
  width: 1px;
  background: var(--border-strong);
}

.comp-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
}

.comp-fill.pos { background: var(--up); }
.comp-fill.neg { background: var(--down); }

.comp-reason {
  margin: 0;
  font-size: 12px;
  color: var(--text-2);
}

.levels {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.levels dt {
  font-size: 12px;
  color: var(--text-3);
}

.levels dd {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.disclaimer {
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.6;
}
</style>
