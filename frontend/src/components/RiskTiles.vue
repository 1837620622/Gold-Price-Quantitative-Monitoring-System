<template>
  <section class="card tiles" aria-labelledby="tiles-title">
    <header class="head">
      <h2 id="tiles-title" class="title">指标速览</h2>
      <p class="sub">最新一根收盘后的指标读数</p>
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
        <span>量化评分走势（近 60 个交易日）</span>
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
  if (p >= 1) return '突破上轨';
  if (p <= 0) return '跌破下轨';
  if (p >= 0.8) return '上轨附近';
  if (p <= 0.2) return '下轨附近';
  return '位于带内';
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
  let status = '震荡区间';
  let tone = 'tone-flat';
  if (k >= 80 || d >= 80) {
    status = '超买区警戒';
    tone = 'tone-up';
  } else if (k <= 20 || d <= 20) {
    status = '超卖区蓄势';
    tone = 'tone-down';
  } else if (k > d) {
    status = '多头金叉';
    tone = 'tone-up';
  } else {
    status = '空头死叉';
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
    sub: r ? (r.value >= 70 ? '超买区' : r.value <= 30 ? '超卖区' : '中性区') : '数据不足',
    tone: rsiTone.value,
    gauge: r?.value ?? undefined,
  });

  const m = macdState.value;
  list.push({
    label: 'MACD 状态',
    value: m ? (m.bullish ? '多头' : '空头') : '--',
    sub: m ? `DIF-DEA ${fmtSigned(m.diff, 3)}，自 ${m.since} 起` : '数据不足',
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
    label: '布林 %B',
    value: dash(b?.value, 2),
    sub: b ? bandLabel(b.value) : '数据不足',
    tone: 'tone-flat',
    gauge: b ? b.value * 100 : undefined,
  });

  list.push({
    label: 'ATR 占比',
    value: atrPercent.value !== null ? `${dash(atrPercent.value)}%` : '--',
    sub: '近14日平均真实波幅 / 收盘价',
    tone: 'tone-flat',
  });

  list.push({
    label: '年化波动（20日）',
    value: props.quant.risk?.vol20 !== null && props.quant.risk?.vol20 !== undefined ? `${dash(props.quant.risk.vol20)}%` : '--',
    sub: props.quant.risk ? `波动状态：${props.quant.risk.volRegime}` : '数据不足',
    tone: 'tone-flat',
  });

  list.push({
    label: '样本最大回撤',
    value: props.quant.risk ? `${dash(props.quant.risk.maxDrawdown)}%` : '--',
    sub: props.quant.risk ? `当前回撤 ${dash(props.quant.risk.currentDrawdown)}%` : '数据不足',
    tone: 'tone-down',
  });

  if (premium.value) {
    const z = premium.value.z;
    list.push({
      label: '国内溢价 Z 分数',
      value: dash(z, 2),
      sub: `当前 ${fmtSigned(premium.value.current, 2)}%，历史分位 ${dash(premium.value.percentile, 0)}%`,
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
</style>
