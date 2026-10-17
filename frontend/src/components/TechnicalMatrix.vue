<template>
  <div class="card matrix-card">
    <header class="matrix-head">
      <div class="head-left">
        <div class="matrix-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <div>
          <h3 class="matrix-title">多因子量化技术全景矩阵</h3>
          <p class="matrix-sub">12 核心维度因子审计 · 均线 / 动量 / 动能 / 波动与资金流向</p>
        </div>
      </div>

      <!-- 多空综合博弈力量胶囊 -->
      <div class="power-summary">
        <div class="power-text">
          <span class="power-bull">多头 {{ bullPct }}%</span>
          <span class="power-vs">VS</span>
          <span class="power-bear">空头 {{ bearPct }}%</span>
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
  let maStatus = '均线纠缠';
  let maBias = 'flat';
  let maDetail = '多空均线交织震荡';
  if (ma5 && ma20 && ma60) {
    if (close > ma5 && ma5 > ma20 && ma20 > ma60) {
      maStatus = '多头完美排列';
      maBias = 'bull';
      maDetail = `收盘 ¥${fmtNumber(close)} 站稳所有均线上方`;
    } else if (close < ma5 && ma5 < ma20 && ma20 < ma60) {
      maStatus = '空头空头排列';
      maBias = 'bear';
      maDetail = `受 MA20 (¥${fmtNumber(ma20)}) 持续反压`;
    } else if (close > ma20) {
      maStatus = '生命线偏多';
      maBias = 'bull';
      maDetail = `站上 MA20 (¥${fmtNumber(ma20)}) 生命线`;
    } else {
      maStatus = '破位承压';
      maBias = 'bear';
      maDetail = `跌破 MA20 (¥${fmtNumber(ma20)}) 短期防线`;
    }
  }
  result.push({
    name: 'MA 趋势均线',
    status: maStatus,
    bias: maBias,
    value: ma20 ? `MA20 ¥${fmtNumber(ma20)}` : '--',
    detail: maDetail,
  });

  // 2. EMA 趋势系统 (EMA12 / EMA26)
  const ema12 = lastVal(ind.value.ema12);
  const ema26 = lastVal(ind.value.ema26);
  let emaStatus = '中性震荡';
  let emaBias = 'flat';
  if (ema12 && ema26) {
    if (ema12 > ema26) {
      emaStatus = '金叉扩张';
      emaBias = 'bull';
    } else {
      emaStatus = '死叉收敛';
      emaBias = 'bear';
    }
  }
  result.push({
    name: 'EMA 快慢通道',
    status: emaStatus,
    bias: emaBias,
    value: ema12 && ema26 ? `差值 ${fmtNumber(ema12 - ema26, 2)}` : '--',
    detail: emaBias === 'bull' ? '快线在慢线上方延伸，中期偏强' : '慢线压制快线，中期调整格局',
  });

  // 3. RSI 相对强弱 (14)
  const rsi = lastVal(ind.value.rsi14);
  let rsiStatus = '常态中枢';
  let rsiBias = 'flat';
  let rsiDetail = '处于 40-60 均衡常态区间';
  if (rsi !== null) {
    if (rsi >= 75) {
      rsiStatus = '严重超买';
      rsiBias = 'bear'; // 超买可能回调
      rsiDetail = '技术指标进入极值超买警戒区';
    } else if (rsi >= 60) {
      rsiStatus = '多头强势';
      rsiBias = 'bull';
      rsiDetail = '买盘动能活跃，保持强势上攻';
    } else if (rsi <= 25) {
      rsiStatus = '严重超卖';
      rsiBias = 'bull'; // 超卖有反弹动能
      rsiDetail = '指标严重超卖，具备修复弹性';
    } else if (rsi <= 40) {
      rsiStatus = '空头承压';
      rsiBias = 'bear';
      rsiDetail = '动能走弱，处于相对弱势区';
    }
  }
  result.push({
    name: 'RSI(14) 动量',
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
  let kdjStatus = '中位徘徊';
  let kdjBias = 'flat';
  if (k !== null && d !== null && j !== null) {
    if (k > d && j > 50) {
      kdjStatus = '金叉共振';
      kdjBias = 'bull';
    } else if (k < d && j < 50) {
      kdjStatus = '死叉下行';
      kdjBias = 'bear';
    } else if (j > 85) {
      kdjStatus = '高位钝化';
      kdjBias = 'bear';
    }
  }
  result.push({
    name: 'KDJ 摆动指标',
    status: kdjStatus,
    bias: kdjBias,
    value: k !== null ? `K:${fmtNumber(k, 1)} D:${fmtNumber(d, 1)}` : '--',
    detail: `J线读数 ${fmtNumber(j, 1)}，短线进出节奏指示`,
  });

  // 5. MACD 柱与离差 (12,26,9)
  const dif = lastVal(ind.value.dif);
  const dea = lastVal(ind.value.dea);
  const macdHist = lastVal(ind.value.macd);
  let macdStatus = '中性离差';
  let macdBias = 'flat';
  if (dif !== null && dea !== null) {
    if (dif > dea && dif > 0) {
      macdStatus = '零上红柱扩张';
      macdBias = 'bull';
    } else if (dif > dea && dif <= 0) {
      macdStatus = '低位金叉修复';
      macdBias = 'bull';
    } else if (dif < dea && dif > 0) {
      macdStatus = '高位死叉走弱';
      macdBias = 'bear';
    } else {
      macdStatus = '零下绿柱承压';
      macdBias = 'bear';
    }
  }
  result.push({
    name: 'MACD 离差趋势',
    status: macdStatus,
    bias: macdBias,
    value: macdHist !== null ? `柱线 ${fmtNumber(macdHist, 2)}` : '--',
    detail: `DIF ${fmtNumber(dif, 2)} / DEA ${fmtNumber(dea, 2)}`,
  });

  // 6. 布林带轨道位置 (%B)
  const pctB = lastVal(ind.value.pctB);
  let bbStatus = '轨道中枢';
  let bbBias = 'flat';
  let bbDetail = '价格在布林中轨与上下轨间运行';
  if (pctB !== null) {
    if (pctB >= 1.0) {
      bbStatus = '向上刺破上轨';
      bbBias = 'bull';
      bbDetail = '强趋势单边加速，谨防乖离过大';
    } else if (pctB >= 0.75) {
      bbStatus = '上轨通道偏强';
      bbBias = 'bull';
      bbDetail = '沿布林上轨推升，多头控盘';
    } else if (pctB <= 0) {
      bbStatus = '向下击穿下轨';
      bbBias = 'bear';
      bbDetail = '空头砸盘超跌，注意寻找支撑';
    } else if (pctB <= 0.25) {
      bbStatus = '下轨支撑测试';
      bbBias = 'bear';
      bbDetail = '考验下轨防守韧性';
    }
  }
  result.push({
    name: 'Bollinger 布林带',
    status: bbStatus,
    bias: bbBias,
    value: pctB !== null ? `%B: ${(pctB * 100).toFixed(1)}%` : '--',
    detail: bbDetail,
  });

  // 7. ATR(14) 真实波幅
  const atr = levels.value?.atr;
  const atrPct = levels.value?.atrPercent;
  result.push({
    name: 'ATR(14) 波动率',
    status: atrPct > 2 ? '高振幅活跃' : '窄幅收敛',
    bias: 'flat',
    value: atr ? `¥${fmtNumber(atr)} / 克` : '--',
    detail: `日均振幅占金价比重约 ${fmtNumber(atrPct)}%`,
  });

  // 8. 经典枢轴位 (Pivots)
  const p = levels.value?.pivots?.classic;
  let pStatus = '枢轴上方';
  let pBias = 'bull';
  if (p && close < p.pivot) {
    pStatus = '枢轴下方';
    pBias = 'bear';
  }
  result.push({
    name: '枢轴点多空界河',
    status: pStatus,
    bias: pBias,
    value: p ? `P: ¥${fmtNumber(p.pivot)}` : '--',
    detail: p ? `上方第一阻力 R1 ¥${fmtNumber(p.r1)} | 支撑 S1 ¥${fmtNumber(p.s1)}` : '计算中',
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
  padding: 24px;
  background: linear-gradient(165deg, rgba(22, 26, 38, 0.95) 0%, rgba(13, 16, 24, 0.98) 100%);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.7);
}

.matrix-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.matrix-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.12);
  color: var(--gold-3);
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.matrix-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
}

.matrix-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.power-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.power-text {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  font-family: 'Archivo', var(--mono);
  font-weight: 700;
  letter-spacing: -0.01em;
}
.power-bull {
  color: var(--up);
}
.power-bear {
  color: var(--down);
}
.power-vs {
  font-size: 10px;
  color: var(--text-3);
}

.power-bar {
  display: flex;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}
.power-bull-fill {
  background: linear-gradient(90deg, #ef4444, #f87171);
  transition: width 0.4s ease;
}
.power-bear-fill {
  background: linear-gradient(90deg, #34d399, #10b981);
  transition: width 0.4s ease;
}

.factor-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 12px;
}

@media (min-width: 640px) {
  .factor-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1024px) {
  .factor-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.factor-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}
.factor-item:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(251, 191, 36, 0.3);
  transform: translateY(-2px);
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
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.factor-badge.bull {
  background: rgba(239, 68, 68, 0.15);
  color: var(--up);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.factor-badge.bear {
  background: rgba(16, 185, 129, 0.15);
  color: var(--down);
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.factor-badge.flat {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.factor-val {
  font-size: 15px;
  font-weight: 700;
  font-family: 'Archivo', var(--mono);
  font-stretch: 110%;
  letter-spacing: -0.015em;
  color: #ffffff;
}

.factor-detail {
  margin: 0;
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.4;
}
</style>
