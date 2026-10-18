<template>
  <section class="card tiles" aria-labelledby="tiles-title">
    <header class="head">
      <h2 id="tiles-title" class="title">{{ t('riskTiles.title') }}</h2>
      <p class="sub">{{ t('riskTiles.sub') }}</p>
    </header>
    <div class="grid">
      <article v-for="tile in tiles" :key="tile.label" class="tile">
        <p class="label">{{ tile.label }}</p>
        <p class="value" :class="tile.tone">{{ tile.value }}</p>
        <p class="sub-line">{{ tile.sub }}</p>
        <div v-if="tile.gauge !== undefined" class="gauge" aria-hidden="true">
          <span class="gauge-fill" :class="tile.tone" :style="{ width: `${clampPct(tile.gauge)}%` }"></span>
        </div>
      </article>
    </div>
    <div v-if="scoreSeries.length" class="trend">
      <div class="trend-head">
        <span>{{ t('riskTiles.scoreTrend') }}</span>
        <b :class="scoreTone">{{ scoreText }}</b>
      </div>
      <SparkLine :values="scoreSeries" :tone="scoreNow !== null && scoreNow >= 0 ? 'up' : 'down'" />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { fmtNumber, fmtSigned } from '../format';
import SparkLine from './SparkLine.vue';
import { useI18n } from '../i18n';

const { t, tLabel } = useI18n();

const props = defineProps({
  quant: { type: Object, required: true },
});

const ind = computed(() => props.quant.indicators || {});
const bars = computed(() => props.quant.bars || []);

// 取最后一个非空值
function lastValue(arr) {
  if (!arr) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null && arr[i] !== undefined) return { value: arr[i], index: i };
  }
  return null;
}

const clampPct = (v) => Math.max(0, Math.min(100, v));
const dash = (v, digits = 2) => (v === null || v === undefined ? '--' : fmtNumber(v, digits));

const rsi = computed(() => lastValue(ind.value.rsi14));
const rsiTone = computed(() => {
  const v = rsi.value?.value;
  if (v === undefined) return 'tone-flat';
  return v >= 70 ? 'tone-up' : v <= 30 ? 'tone-down' : 'tone-flat';
});

const pctB = computed(() => lastValue(ind.value.pctB));
function bandLabel(p) {
  if (p >= 1) return t('riskTiles.breakUpper');
  if (p <= 0) return t('riskTiles.breakLower');
  if (p >= 0.8) return t('riskTiles.nearUpper');
  if (p <= 0.2) return t('riskTiles.nearLower');
  return t('riskTiles.inBand');
}

// MACD 状态：DIF 与 DEA 的符号，以及当前符号开始的日期
const macdState = computed(() => {
  const dif = ind.value.dif;
  const dea = ind.value.dea;
  if (!dif || !dea) return null;
  const diff = dif.map((v, i) => (v !== null && dea[i] !== null ? v - dea[i] : null));
  let j = diff.length - 1;
  while (j >= 0 && diff[j] === null) j--;
  if (j < 0) return null;
  const sign = Math.sign(diff[j]);
  let k = j;
  while (k > 0 && diff[k - 1] !== null && Math.sign(diff[k - 1]) === sign) k--;
  return { bullish: sign >= 0, diff: diff[j], since: bars.value[k]?.date ?? '' };
});

const atrPercent = computed(() => props.quant.levels?.atrPercent ?? null);
const premium = computed(() => (props.quant.premium?.available ? props.quant.premium : null));

const kdj = computed(() => {
  const kObj = lastValue(ind.value.kdj?.k);
  const dObj = lastValue(ind.value.kdj?.d);
  const jObj = lastValue(ind.value.kdj?.j);
  if (!kObj || !dObj || !jObj) return null;
  const k = kObj.value;
  const d = dObj.value;
  const j = jObj.value;
  let status = t('riskTiles.range');
  let tone = 'tone-flat';
  if (k >= 80 || d >= 80) {
    status = t('riskTiles.overbought');
    tone = 'tone-up';
  } else if (k <= 20 || d <= 20) {
    status = t('riskTiles.oversold');
    tone = 'tone-down';
  } else if (k > d) {
    status = t('riskTiles.goldenCross');
    tone = 'tone-up';
  } else {
    status = t('riskTiles.deathCross');
    tone = 'tone-down';
  }
  return { k, d, j, status, tone };
});

// 近 60 个交易日的量化评分走势
const scoreSeries = computed(() => (ind.value.score || []).filter((v) => v !== null && v !== undefined).slice(-60));
const scoreNow = computed(() => (scoreSeries.value.length ? scoreSeries.value[scoreSeries.value.length - 1] : null));
const scoreText = computed(() => (scoreNow.value === null ? '--' : `${scoreNow.value >= 0 ? '+' : ''}${scoreNow.value.toFixed(1)}`));
const scoreTone = computed(() => (scoreNow.value === null ? 'tone-flat' : scoreNow.value >= 0 ? 'tone-up' : 'tone-down'));

const tiles = computed(() => {
  const list = [];
  const r = rsi.value;
  list.push({
    label: 'RSI(14)',
    value: dash(r?.value, 1),
    sub: r ? (r.value >= 70 ? t('riskTiles.zoneOverbought') : r.value <= 30 ? t('riskTiles.zoneOversold') : t('riskTiles.zoneNeutral')) : t('riskTiles.insufficient'),
    tone: rsiTone.value,
    gauge: r?.value ?? undefined,
  });

  const m = macdState.value;
  list.push({
    label: t('riskTiles.macdState'),
    value: m ? (m.bullish ? t('riskTiles.bull') : t('riskTiles.bear')) : '--',
    sub: m ? t('riskTiles.macdDetail', { diff: fmtSigned(m.diff, 3), since: m.since }) : t('riskTiles.insufficient'),
    tone: m ? (m.bullish ? 'tone-up' : 'tone-down') : 'tone-flat',
  });

  if (kdj.value) {
    const k = kdj.value;
    list.push({
      label: 'KDJ(9,3,3)',
      value: `${dash(k.k, 1)} / ${dash(k.d, 1)}`,
      sub: `J ${dash(k.j, 1)} · ${k.status}`,
      tone: k.tone,
      gauge: clampPct(k.k),
    });
  }

  const b = pctB.value;
  list.push({
    label: t('riskTiles.bollPctB'),
    value: dash(b?.value, 2),
    sub: b ? bandLabel(b.value) : t('riskTiles.insufficient'),
    tone: 'tone-flat',
    gauge: b ? b.value * 100 : undefined,
  });

  list.push({
    label: t('riskTiles.atrShare'),
    value: atrPercent.value !== null ? `${dash(atrPercent.value)}%` : '--',
    sub: t('riskTiles.atrHint'),
    tone: 'tone-flat',
  });

  list.push({
    label: t('riskTiles.vol20'),
    value: props.quant.risk?.vol20 !== null && props.quant.risk?.vol20 !== undefined ? `${dash(props.quant.risk.vol20)}%` : '--',
    sub: props.quant.risk ? t('riskTiles.volState', { regime: tLabel(props.quant.risk.volRegime) }) : t('riskTiles.insufficient'),
    tone: 'tone-flat',
  });

  list.push({
    label: t('riskTiles.maxDrawdown'),
    value: props.quant.risk ? `${dash(props.quant.risk.maxDrawdown)}%` : '--',
    sub: props.quant.risk ? t('riskTiles.drawdownNow', { value: dash(props.quant.risk.currentDrawdown) }) : t('riskTiles.insufficient'),
    tone: 'tone-down',
  });

  if (premium.value) {
    const z = premium.value.z;
    list.push({
      label: t('riskTiles.premiumZ'),
      value: dash(z, 2),
      sub: t('riskTiles.premiumNow', { current: fmtSigned(premium.value.current, 2), percentile: dash(premium.value.percentile, 0) }),
      tone: z >= 1 ? 'tone-up' : z <= -1 ? 'tone-down' : 'tone-flat',
    });
  }
  return list;
});
</script>

<style scoped>
.tiles {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.tile {
  padding: 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  min-width: 0;
}

.label {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.value {
  margin: 6px 0 4px;
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.value.tone-up { color: var(--up); }
.value.tone-down { color: var(--down); }
.value.tone-flat { color: var(--text); }

.sub-line {
  margin: 0;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}

.gauge {
  margin-top: 10px;
  height: 4px;
  border-radius: 999px;
  background: var(--border-strong);
  overflow: hidden;
}

.gauge-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--text-2);
}

.gauge-fill.tone-up { background: var(--up); }
.gauge-fill.tone-down { background: var(--down); }

.trend {
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.trend-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  color: var(--text-3);
}

.trend-head b {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.trend-head b.tone-up { color: var(--up); }
.trend-head b.tone-down { color: var(--down); }

@media (max-width: 767px) {
  .tiles {
    gap: 12px;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .tile {
    padding: 12px;
  }

  .value {
    font-size: 20px;
  }
}
</style>
