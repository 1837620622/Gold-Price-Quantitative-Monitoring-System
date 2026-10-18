<template>
  <div class="card matrix-card">
    <header class="matrix-head">
      <div class="matrix-intro">
        <h3 class="matrix-title">{{ t('technicalMatrix.title') }}</h3>
        <p class="matrix-sub">{{ t('technicalMatrix.sub') }}</p>
      </div>

      <!-- 多空综合博弈力量 -->
      <div class="power-summary">
        <div class="power-text">
          <span class="power-bull">{{ t('technicalMatrix.bull', { pct: bullPct }) }}</span>
          <span class="power-vs">VS</span>
          <span class="power-bear">{{ t('technicalMatrix.bear', { pct: bearPct }) }}</span>
        </div>
        <div class="power-bar">
          <span class="power-bull-fill" :style="{ width: `${bullPct}%` }"></span>
          <span class="power-bear-fill" :style="{ width: `${bearPct}%` }"></span>
        </div>
      </div>
    </header>

    <!-- 因子矩阵网格 -->
    <div class="factor-grid">
      <article
        v-for="item in factors"
        :key="item.name"
        class="factor-item"
        :class="`tone-${item.bias}`"
      >
        <div class="factor-top">
          <span class="factor-name">{{ item.name }}</span>
          <span class="factor-badge" :class="item.bias">
            {{ item.status }}
          </span>
        </div>
        <div class="factor-val">{{ item.value }}</div>
        <p class="factor-detail">{{ item.detail }}</p>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { fmtNumber } from '../format';
import { useI18n } from '../i18n';

const { t } = useI18n();

const props = defineProps({
  quant: { type: Object, default: null },
});

const ind = computed(() => props.quant?.indicators || {});
const bars = computed(() => props.quant?.bars || []);
const signal = computed(() => props.quant?.signal || {});
const levels = computed(() => props.quant?.levels || {});

// 取数组最后有效非空值
function lastVal(arr) {
  if (!arr || !Array.isArray(arr)) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null && arr[i] !== undefined) return arr[i];
  }
  return null;
}

// 因子解析计算
const factors = computed(() => {
  const result = [];
  const b = bars.value;
  if (!b || b.length < 10) return result;

  const lastBar = b[b.length - 1];
  const close = lastBar.close;

  // 1. 均线系统 (MA5 / MA10 / MA20 / MA60)
  const ma5 = lastVal(ind.value.ma5);
  const ma20 = lastVal(ind.value.ma20);
  const ma60 = lastVal(ind.value.ma60);
  let maStatus = t('technicalMatrix.maTangled');
  let maBias = 'flat';
  let maDetail = t('technicalMatrix.maTangledDetail');
  if (ma5 && ma20 && ma60) {
    if (close > ma5 && ma5 > ma20 && ma20 > ma60) {
      maStatus = t('technicalMatrix.maPerfect');
      maBias = 'bull';
      maDetail = t('technicalMatrix.maAbove', { price: fmtNumber(close) });
    } else if (close < ma5 && ma5 < ma20 && ma20 < ma60) {
      maStatus = t('technicalMatrix.maBearish');
      maBias = 'bear';
      maDetail = t('technicalMatrix.maPressure', { ma20: fmtNumber(ma20) });
    } else if (close > ma20) {
      maStatus = t('technicalMatrix.maBullish');
      maBias = 'bull';
      maDetail = t('technicalMatrix.maLifeline', { ma20: fmtNumber(ma20) });
    } else {
      maStatus = t('technicalMatrix.maBroken');
      maBias = 'bear';
      maDetail = t('technicalMatrix.maBreak', { ma20: fmtNumber(ma20) });
    }
  }
  result.push({
    name: t('technicalMatrix.maName'),
    status: maStatus,
    bias: maBias,
    value: ma20 ? `MA20 ¥${fmtNumber(ma20)}` : '--',
    detail: maDetail,
  });

  // 2. EMA 趋势系统 (EMA12 / EMA26)
  const ema12 = lastVal(ind.value.ema12);
  const ema26 = lastVal(ind.value.ema26);
  let emaStatus = t('technicalMatrix.emaNeutral');
  let emaBias = 'flat';
  if (ema12 && ema26) {
    if (ema12 > ema26) {
      emaStatus = t('technicalMatrix.emaGolden');
      emaBias = 'bull';
    } else {
      emaStatus = t('technicalMatrix.emaDead');
      emaBias = 'bear';
    }
  }
  result.push({
    name: t('technicalMatrix.emaName'),
    status: emaStatus,
    bias: emaBias,
    value: ema12 && ema26 ? t('technicalMatrix.emaGap', { gap: fmtNumber(ema12 - ema26, 2) }) : '--',
    detail: emaBias === 'bull' ? t('technicalMatrix.emaUpDetail') : t('technicalMatrix.emaDownDetail'),
  });

  // 3. RSI 相对强弱 (14)
  const rsi = lastVal(ind.value.rsi14);
  let rsiStatus = t('technicalMatrix.rsiNormal');
  let rsiBias = 'flat';
  let rsiDetail = t('technicalMatrix.rsiNormalDetail');
  if (rsi !== null) {
    if (rsi >= 75) {
      rsiStatus = t('technicalMatrix.rsiSevereOb');
      rsiBias = 'bear'; // 超买可能回调
      rsiDetail = t('technicalMatrix.rsiObDetail');
    } else if (rsi >= 60) {
      rsiStatus = t('technicalMatrix.rsiStrong');
      rsiBias = 'bull';
      rsiDetail = t('technicalMatrix.rsiStrongDetail');
    } else if (rsi <= 25) {
      rsiStatus = t('technicalMatrix.rsiSevereOs');
      rsiBias = 'bull'; // 超卖有反弹动能
      rsiDetail = t('technicalMatrix.rsiOsDetail');
    } else if (rsi <= 40) {
      rsiStatus = t('technicalMatrix.rsiWeak');
      rsiBias = 'bear';
      rsiDetail = t('technicalMatrix.rsiWeakDetail');
    }
  }
  result.push({
    name: t('technicalMatrix.rsiName'),
    status: rsiStatus,
    bias: rsiBias,
    value: rsi !== null ? `${fmtNumber(rsi, 1)}` : '--',
    detail: rsiDetail,
  });

  // 4. KDJ 随机摆动 (9,3,3)
  const kdj = ind.value.kdj;
  const k = lastVal(kdj?.k);
  const d = lastVal(kdj?.d);
  const j = lastVal(kdj?.j);
  let kdjStatus = t('technicalMatrix.kdjNeutral');
  let kdjBias = 'flat';
  if (k !== null && d !== null && j !== null) {
    if (k > d && j > 50) {
      kdjStatus = t('technicalMatrix.kdjGolden');
      kdjBias = 'bull';
    } else if (k < d && j < 50) {
      kdjStatus = t('technicalMatrix.kdjDead');
      kdjBias = 'bear';
    } else if (j > 85) {
      kdjStatus = t('technicalMatrix.kdjBlunt');
      kdjBias = 'bear';
    }
  }
  result.push({
    name: t('technicalMatrix.kdjName'),
    status: kdjStatus,
    bias: kdjBias,
    value: k !== null ? `K ${fmtNumber(k, 1)} · D ${fmtNumber(d, 1)}` : '--',
    detail: t('technicalMatrix.kdjDetail', { j: fmtNumber(j, 1) }),
  });

  // 5. MACD 柱与离差 (12,26,9)：柱线取 hist 序列（后端字段 indicators.hist）
  const dif = lastVal(ind.value.dif);
  const dea = lastVal(ind.value.dea);
  const macdHist = lastVal(ind.value.hist);
  let macdStatus = t('technicalMatrix.macdNeutral');
  let macdBias = 'flat';
  if (dif !== null && dea !== null) {
    if (dif > dea && dif > 0) {
      macdStatus = t('technicalMatrix.macdRedUp');
      macdBias = 'bull';
    } else if (dif > dea && dif <= 0) {
      macdStatus = t('technicalMatrix.macdLowGold');
      macdBias = 'bull';
    } else if (dif < dea && dif > 0) {
      macdStatus = t('technicalMatrix.macdHighDead');
      macdBias = 'bear';
    } else {
      macdStatus = t('technicalMatrix.macdGreenDown');
      macdBias = 'bear';
    }
  }
  result.push({
    name: t('technicalMatrix.macdName'),
    status: macdStatus,
    bias: macdBias,
    value: macdHist !== null ? t('technicalMatrix.histValue', { hist: fmtNumber(macdHist, 2) }) : '--',
    detail: `DIF ${fmtNumber(dif, 2)} / DEA ${fmtNumber(dea, 2)}`,
  });

  // 6. 布林带轨道位置 (%B)
  const pctB = lastVal(ind.value.pctB);
  let bbStatus = t('technicalMatrix.bollMid');
  let bbBias = 'flat';
  let bbDetail = t('technicalMatrix.bollMidDetail');
  if (pctB !== null) {
    if (pctB >= 1.0) {
      bbStatus = t('technicalMatrix.bollPierce');
      bbBias = 'bull';
      bbDetail = t('technicalMatrix.bollPierceDetail');
    } else if (pctB >= 0.75) {
      bbStatus = t('technicalMatrix.bollUpStrong');
      bbBias = 'bull';
      bbDetail = t('technicalMatrix.bollUpStrongDetail');
    } else if (pctB <= 0) {
      bbStatus = t('technicalMatrix.bollBreak');
      bbBias = 'bear';
      bbDetail = t('technicalMatrix.bollBreakDetail');
    } else if (pctB <= 0.25) {
      bbStatus = t('technicalMatrix.bollLowTest');
      bbBias = 'bear';
      bbDetail = t('technicalMatrix.bollLowTestDetail');
    }
  }
  result.push({
    name: t('technicalMatrix.bollName'),
    status: bbStatus,
    bias: bbBias,
    value: pctB !== null ? `%B ${(pctB * 100).toFixed(1)}%` : '--',
    detail: bbDetail,
  });

  // 7. ATR(14) 真实波幅
  const atr = levels.value?.atr;
  const atrPct = levels.value?.atrPercent;
  result.push({
    name: t('technicalMatrix.atrName'),
    status: atrPct > 2 ? t('technicalMatrix.atrHigh') : t('technicalMatrix.atrNarrow'),
    bias: 'flat',
    value: atr ? t('technicalMatrix.atrValue', { atr: fmtNumber(atr) }) : '--',
    detail: t('technicalMatrix.atrDetail', { pct: fmtNumber(atrPct) }),
  });

  // 8. 经典枢轴位 (Pivots)
  const p = levels.value?.pivots?.classic;
  let pStatus = t('technicalMatrix.pivotAbove');
  let pBias = 'bull';
  if (p && close < p.pivot) {
    pStatus = t('technicalMatrix.pivotBelow');
    pBias = 'bear';
  }
  result.push({
    name: t('technicalMatrix.pivotName'),
    status: pStatus,
    bias: pBias,
    value: p ? `P ¥${fmtNumber(p.pivot)}` : '--',
    detail: p ? t('technicalMatrix.pivotDetail', { r1: fmtNumber(p.r1), s1: fmtNumber(p.s1) }) : t('technicalMatrix.pivotPending'),
  });

  return result;
});

// 计算多空比例（结合量化综合评分与因子多空阵列）
const bullPct = computed(() => {
  const score = signal.value?.score;
  if (typeof score === 'number' && Number.isFinite(score)) {
    // 评分范围 -100 到 +100，映射到 0% 到 100%
    const mapped = Math.round((score + 100) / 2);
    return Math.max(5, Math.min(95, mapped));
  }

  const f = factors.value;
  if (!f.length) return 50;
  let bullCount = 0;
  let bearCount = 0;
  for (const item of f) {
    if (item.bias === 'bull') bullCount += 1;
    else if (item.bias === 'bear') bearCount += 1;
    else {
      bullCount += 0.5;
      bearCount += 0.5;
    }
  }
  const total = bullCount + bearCount;
  return total > 0 ? Math.round((bullCount / total) * 100) : 50;
});

const bearPct = computed(() => 100 - bullPct.value);
</script>

<style scoped>
.matrix-card {
  padding: 22px;
}

.matrix-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 24px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.matrix-title {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  color: var(--text);
  word-break: keep-all;
  overflow-wrap: break-word;
}

.matrix-sub {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--text-2);
}

.power-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 220px;
}

.power-text {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.power-bull {
  color: var(--up);
}

.power-bear {
  color: var(--down);
}

.power-vs {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--text-3);
}

.power-bar {
  display: flex;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--surface-2);
}

.power-bull-fill {
  background: var(--up);
  transition: width 0.4s ease;
}

.power-bear-fill {
  background: var(--down);
  transition: width 0.4s ease;
}

.factor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

@media (min-width: 640px) {
  .factor-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .factor-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.factor-item {
  --tone: var(--text-3);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 14px 14px 14px 16px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  box-shadow: inset 3px 0 0 var(--tone);
}

.factor-item.tone-bull {
  --tone: var(--up);
}

.factor-item.tone-bear {
  --tone: var(--down);
}

.factor-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.factor-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}

.factor-badge {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.factor-badge.bull {
  color: var(--up);
  background: var(--up-bg);
}

.factor-badge.bear {
  color: var(--down);
  background: var(--down-bg);
}

.factor-badge.flat {
  color: var(--text-2);
  background: var(--surface-hover);
}

.factor-val {
  font-family: var(--mono);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.factor-detail {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--text-3);
}

@media (max-width: 767px) {
  .matrix-card {
    padding: 16px;
  }

  .matrix-sub {
    font-size: 13px;
  }

  .power-summary {
    min-width: 0;
    width: 100%;
  }

  .factor-item {
    padding: 12px 12px 12px 14px;
  }

  .factor-name {
    font-size: 13px;
  }

  .factor-detail {
    font-size: 12px;
  }
}
</style>
