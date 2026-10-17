<template>
  <div class="card calc-card" id="gold-calculator">
    <header class="calc-head">
      <div class="head-left">
        <div class="calc-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="2" width="16" height="20" rx="2"></rect>
            <line x1="8" y1="6" x2="16" y2="6"></line>
            <line x1="16" y1="14" x2="16" y2="18"></line>
            <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"></path>
          </svg>
        </div>
        <div>
          <h3 class="calc-title">黄金量化与投资盈亏精算中心</h3>
          <p class="calc-sub">实物持仓变现测算 · 内外盘跨市无风险套利与基差推演</p>
        </div>
      </div>

      <!-- 模式切换 Tabs -->
      <div class="calc-tab-group">
        <button
          type="button"
          class="calc-tab-btn"
          :class="{ active: mode === 'holding' }"
          @click="mode = 'holding'"
        >
          实物持仓盈亏
        </button>
        <button
          type="button"
          class="calc-tab-btn"
          :class="{ active: mode === 'arbitrage' }"
          @click="mode = 'arbitrage'"
        >
          ⚡ 内外盘跨市套利
        </button>
      </div>

      <div class="current-price-badge">
        <span>当前基准金价</span>
        <b>¥{{ fmt(currentPrice) }} / 克</b>
      </div>
    </header>

    <!-- 模式 1：实物与首饰持仓变现计算 -->
    <div v-if="mode === 'holding'" class="calc-body">
      <!-- 左栏：输入配置 -->
      <div class="calc-form">
        <!-- 产品类型选择 -->
        <div class="form-group">
          <label class="form-label">黄金持仓类型</label>
          <div class="type-grid">
            <button
              v-for="t in PRODUCT_TYPES"
              :key="t.key"
              type="button"
              class="type-btn"
              :class="{ active: productType === t.key }"
              @click="selectType(t)"
            >
              <span class="type-name">{{ t.name }}</span>
              <span class="type-fee">工费约 ¥{{ t.defaultFee }}/g</span>
            </button>
          </div>
        </div>

        <!-- 快捷克重选择 -->
        <div class="form-group">
          <div class="label-row">
            <label class="form-label">持仓克重 (g)</label>
            <div class="weight-presets">
              <button
                v-for="w in PRESET_WEIGHTS"
                :key="w"
                type="button"
                class="preset-chip"
                :class="{ active: Number(weight) === w }"
                @click="weight = w"
              >{{ w }}g</button>
            </div>
          </div>
          <div class="input-wrap">
            <input
              v-model.number="weight"
              type="number"
              min="0.1"
              step="any"
              placeholder="输入克重，如 50"
              class="calc-input"
            />
            <span class="input-unit">克 (g)</span>
          </div>
        </div>

        <!-- 买入成本单价与工费 -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">买入基础克价 (元/克)</label>
            <div class="input-wrap">
              <input
                v-model.number="buyPrice"
                type="number"
                min="100"
                step="any"
                placeholder="如 560"
                class="calc-input"
              />
              <span class="input-unit">元/克</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">每克工费/溢价 (元/克)</label>
            <div class="input-wrap">
              <input
                v-model.number="feePerGram"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                class="calc-input"
              />
              <span class="input-unit">元/克</span>
            </div>
          </div>
        </div>

        <!-- 回收折价设置 -->
        <div class="form-group">
          <label class="form-label">回收折价扣减 (元/克，相对现货大盘)</label>
          <div class="input-wrap">
            <input
              v-model.number="recycleDiscount"
              type="number"
              min="0"
              step="any"
              placeholder="如 3"
              class="calc-input"
            />
            <span class="input-unit">元/克</span>
          </div>
          <span class="form-hint">投资金条通常扣 2~3 元/克，首饰回收通常扣 5~10 元/克且不返还工费</span>
        </div>
      </div>

      <!-- 右栏：精算报表卡片 -->
      <div class="calc-results">
        <div class="res-card-grid">
          <div class="res-item">
            <span class="res-label">总持仓综合成本 (本金)</span>
            <span class="res-num">¥{{ fmt(totalCost, 2) }}</span>
            <span class="res-sub">综合成本 ¥{{ fmt(costPerGram, 2) }}/g</span>
          </div>

          <div class="res-item">
            <span class="res-label">当前盘面市值 (无折价)</span>
            <span class="res-num gold">¥{{ fmt(marketValue, 2) }}</span>
            <span class="res-sub">浮动盈亏：<b :class="profitTone">{{ profit >= 0 ? '+' : '' }}¥{{ fmt(profit, 2) }} ({{ fmt(profitRate, 2) }}%)</b></span>
          </div>

          <div class="res-item highlight">
            <span class="res-label">变现回收估算 (净到手现金)</span>
            <span class="res-num">¥{{ fmt(liquidationValue, 2) }}</span>
            <span class="res-sub">按回收折价 -¥{{ recycleDiscount }}/g 测算</span>
          </div>

          <div class="res-item">
            <span class="res-label">变现净盈亏 (扣除工费与折价)</span>
            <span class="res-num" :class="liquidationProfit >= 0 ? 'tone-up' : 'tone-down'">
              {{ liquidationProfit >= 0 ? '+' : '' }}¥{{ fmt(liquidationProfit, 2) }}
            </span>
            <span class="res-sub">保本所需金价：¥{{ fmt(breakevenPrice, 2) }}/g</span>
          </div>
        </div>

        <p class="calc-tip">
          注：实物回收通常扣除品牌首饰工费并按大盘折价 3~5 元/克，计算结果供投资与变现参考。
        </p>
      </div>
    </div>

    <!-- 模式 2：内外盘跨市套利与基差推演 -->
    <div v-else class="calc-body">
      <!-- 左栏：套利对冲参数 -->
      <div class="calc-form">
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">国内现货金价 AU9999 (元/克)</label>
            <div class="input-wrap">
              <input
                v-model.number="arbDomPrice"
                type="number"
                step="any"
                class="calc-input"
              />
              <span class="input-unit">元/克</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">国际现货金价 XAU/USD (美元/盎司)</label>
            <div class="input-wrap">
              <input
                v-model.number="arbIntlPrice"
                type="number"
                step="any"
                class="calc-input"
              />
              <span class="input-unit">$/oz</span>
            </div>
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">实时基准汇率 USD/CNY</label>
            <div class="input-wrap">
              <input
                v-model.number="arbFxRate"
                type="number"
                step="0.0001"
                class="calc-input"
              />
              <span class="input-unit">汇率</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">综合摩擦成本费率 (%)</label>
            <div class="input-wrap">
              <input
                v-model.number="arbCostRate"
                type="number"
                step="0.01"
                class="calc-input"
              />
              <span class="input-unit">% (换汇+交易)</span>
            </div>
          </div>
        </div>

        <!-- 对冲名义规模 -->
        <div class="form-group">
          <div class="label-row">
            <label class="form-label">对冲名义克重规模 (g)</label>
            <div class="weight-presets">
              <button
                v-for="w in [100, 500, 1000, 5000, 10000]"
                :key="w"
                type="button"
                class="preset-chip"
                :class="{ active: Number(arbWeight) === w }"
                @click="arbWeight = w"
              >{{ w >= 1000 ? w / 1000 + 'kg' : w + 'g' }}</button>
            </div>
          </div>
          <div class="input-wrap">
            <input
              v-model.number="arbWeight"
              type="number"
              min="10"
              step="any"
              class="calc-input"
            />
            <span class="input-unit">克 (名义头寸)</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">预估套利对冲持有周期 (天)</label>
          <div class="input-wrap">
            <input
              v-model.number="arbHoldingDays"
              type="number"
              min="1"
              max="365"
              class="calc-input"
            />
            <span class="input-unit">天 (用于年化折算)</span>
          </div>
        </div>
      </div>

      <!-- 右栏：跨市基差与套利收益推演卡片 -->
      <div class="calc-results">
        <div class="res-card-grid">
          <div class="res-item highlight">
            <span class="res-label">理论国际平价折算 (元/克)</span>
            <span class="res-num">¥{{ fmt(theoreticalParity, 2) }}</span>
            <span class="res-sub">折算公式：XAU × 汇率 ÷ 31.1034768</span>
          </div>

          <div class="res-item">
            <span class="res-label">内外盘实时绝对基差</span>
            <span class="res-num" :class="basisSpread >= 0 ? 'tone-up' : 'tone-down'">
              {{ basisSpread >= 0 ? '+' : '' }}¥{{ fmt(basisSpread, 2) }} / 克
            </span>
            <span class="res-sub">溢价率：<b>{{ premiumComputed >= 0 ? '+' : '' }}{{ fmt(premiumComputed, 2) }}%</b></span>
          </div>

          <div class="res-item">
            <span class="res-label">套利扣费净利润 (名义 {{ arbWeight }}g)</span>
            <span class="res-num" :class="netArbProfit >= 0 ? 'tone-up' : 'tone-down'">
              {{ netArbProfit >= 0 ? '+' : '' }}¥{{ fmt(netArbProfit, 2) }}
            </span>
            <span class="res-sub">毛空间 ¥{{ fmt(grossArbProfit, 2) }} · 扣费 ¥{{ fmt(arbCostTotal, 2) }}</span>
          </div>

          <div class="res-item">
            <span class="res-label">推演年化无风险收益率 (APR)</span>
            <span class="res-num gold">
              {{ netArbApr >= 0 ? '+' : '' }}{{ fmt(netArbApr, 2) }}%
            </span>
            <span class="res-sub">基于 {{ arbHoldingDays }} 天基差收敛回归周期测算</span>
          </div>
        </div>

        <!-- 套利信号指引 -->
        <div class="arb-strategy-guide" :class="arbActionClass">
          <div class="guide-tag">🎯 机构套利评级</div>
          <div class="guide-title">{{ arbActionTitle }}</div>
          <div class="guide-desc">{{ arbActionDesc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { fmtNumber } from '../format';

const props = defineProps({
  domesticPrice: { type: Number, default: 899 },
  intlPrice: { type: Number, default: 4166.1 },
  fxRate: { type: Number, default: 6.6985 },
  premiumPercent: { type: Number, default: 0.2 },
});

const mode = ref('holding');
const currentPrice = computed(() => props.domesticPrice || 899);

const PRODUCT_TYPES = [
  { key: 'bar', name: '实物投资金条', defaultFee: 8, discount: 3 },
  { key: 'jewelry', name: '金店首饰黄金', defaultFee: 50, discount: 5 },
  { key: 'etf', name: '黄金 ETF / 纸黄金', defaultFee: 0, discount: 0 },
];

const PRESET_WEIGHTS = [10, 20, 50, 100, 200, 500, 1000];
const STORAGE_CALC = 'gold_monitor_calc_state';

// 模式 1：持仓表单
const productType = ref('bar');
const weight = ref(50);
const buyPrice = ref(560);
const feePerGram = ref(8);
const recycleDiscount = ref(3);

function selectType(t) {
  productType.value = t.key;
  feePerGram.value = t.defaultFee;
  recycleDiscount.value = t.discount;
}

// 模式 2：跨市套利表单
const arbDomPrice = ref(props.domesticPrice || 899);
const arbIntlPrice = ref(props.intlPrice || 4166.1);
const arbFxRate = ref(props.fxRate || 6.6985);
const arbCostRate = ref(0.15); // 0.15%
const arbWeight = ref(1000); // 1000g
const arbHoldingDays = ref(14); // 14天

watch(
  () => props.domesticPrice,
  (v) => {
    if (v && (!arbDomPrice.value || arbDomPrice.value === 899)) {
      arbDomPrice.value = v;
    }
  }
);
watch(
  () => props.intlPrice,
  (v) => {
    if (v && (!arbIntlPrice.value || arbIntlPrice.value === 4166.1)) {
      arbIntlPrice.value = v;
    }
  }
);
watch(
  () => props.fxRate,
  (v) => {
    if (v && (!arbFxRate.value || arbFxRate.value === 6.6985)) {
      arbFxRate.value = v;
    }
  }
);

// 模式 1 计算
const costPerGram = computed(() => Number(buyPrice.value || 0) + Number(feePerGram.value || 0));
const totalCost = computed(() => Number(weight.value || 0) * costPerGram.value);
const marketValue = computed(() => Number(weight.value || 0) * currentPrice.value);
const profit = computed(() => marketValue.value - totalCost.value);
const profitRate = computed(() => (totalCost.value > 0 ? (profit.value / totalCost.value) * 100 : 0));
const profitTone = computed(() => (profit.value >= 0 ? 'tone-up' : 'tone-down'));

const recyclePricePerGram = computed(() => Math.max(0, currentPrice.value - recycleDiscount.value));
const liquidationValue = computed(() => Number(weight.value || 0) * recyclePricePerGram.value);
const liquidationProfit = computed(() => liquidationValue.value - totalCost.value);
const breakevenPrice = computed(() => costPerGram.value + recycleDiscount.value);

// 模式 2 套利计算
const theoreticalParity = computed(() => {
  const p = Number(arbIntlPrice.value || 0);
  const fx = Number(arbFxRate.value || 6.6985);
  return (p * fx) / 31.1034768;
});

const basisSpread = computed(() => {
  return Number(arbDomPrice.value || 0) - theoreticalParity.value;
});

const premiumComputed = computed(() => {
  if (theoreticalParity.value <= 0) return 0;
  return (basisSpread.value / theoreticalParity.value) * 100;
});

const grossArbProfit = computed(() => {
  return Math.abs(basisSpread.value) * Number(arbWeight.value || 0);
});

const arbCapital = computed(() => {
  return theoreticalParity.value * Number(arbWeight.value || 0);
});

const arbCostTotal = computed(() => {
  return arbCapital.value * (Number(arbCostRate.value || 0) / 100);
});

const netArbProfit = computed(() => {
  return grossArbProfit.value - arbCostTotal.value;
});

const netArbApr = computed(() => {
  if (arbCapital.value <= 0 || arbHoldingDays.value <= 0) return 0;
  const singleReturn = netArbProfit.value / arbCapital.value;
  return singleReturn * (365 / Number(arbHoldingDays.value || 14)) * 100;
});

// 套利状态研判
const arbActionClass = computed(() => {
  const p = premiumComputed.value;
  if (p > 0.65) return 'action-positive';
  if (p < -0.25) return 'action-negative';
  return 'action-neutral';
});

const arbActionTitle = computed(() => {
  const p = premiumComputed.value;
  if (p > 0.65) return '正向溢价套利窗口开启（卖内盘 / 买外盘对冲）';
  if (p < -0.25) return '反向折价套利窗口开启（买内盘现货 / 抛补外盘）';
  return '内外盘无套利均衡常态区间（适合网格统计对冲）';
});

const arbActionDesc = computed(() => {
  const p = premiumComputed.value;
  if (p > 0.65) {
    return `国内价格相对国际平价大幅溢价 +${p.toFixed(2)}%，理论套利空间显著。机构可做空国内近月/卖出现货，同时做多伦敦现货并锁汇。`;
  }
  if (p < -0.25) {
    return `国内现货相对国际平价折价 ${p.toFixed(2)}%，国内黄金性价比极高，适合低吸实物交割金条并在国际对冲流动性。`;
  }
  return `当前价差处于 ${p.toFixed(2)}% 常态波动通道内，跨市套利利润无法充分覆盖摩擦成本，建议依托 EMA/布林带进行基差网格交易。`;
});

function fmt(v, d = 2) {
  return v !== null && v !== undefined && Number.isFinite(v) ? fmtNumber(v, d) : '--';
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_CALC);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.weight) weight.value = data.weight;
      if (data.buyPrice) buyPrice.value = data.buyPrice;
      if (data.feePerGram !== undefined) feePerGram.value = data.feePerGram;
      if (data.productType) productType.value = data.productType;
      if (data.recycleDiscount !== undefined) recycleDiscount.value = data.recycleDiscount;
    }
  } catch {}
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_CALC,
      JSON.stringify({
        weight: weight.value,
        buyPrice: buyPrice.value,
        feePerGram: feePerGram.value,
        productType: productType.value,
        recycleDiscount: recycleDiscount.value,
      })
    );
  } catch {}
}

onMounted(loadState);
watch([weight, buyPrice, feePerGram, productType, recycleDiscount], saveState);
</script>

<style scoped>
.calc-card {
  padding: 24px;
  background: var(--surface-card);
  border: 1px solid rgba(232, 199, 125, 0.2);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.7);
}

.calc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.calc-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(232, 199, 125, 0.12);
  color: var(--gold-3);
  border: 1px solid rgba(232, 199, 125, 0.3);
}

.calc-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.calc-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.calc-tab-group {
  display: flex;
  gap: 6px;
  background: var(--surface-2);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.calc-tab-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}
.calc-tab-btn.active {
  background: var(--gold-btn);
  color: var(--gold-ink);
  font-weight: 700;
}

.current-price-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(232, 199, 125, 0.08);
  border: 1px solid rgba(232, 199, 125, 0.25);
}
.current-price-badge span {
  font-size: 11px;
  color: var(--gold-3);
}
.current-price-badge b {
  font-size: 16px;
  font-family: var(--mono);
  color: var(--text);
}

.calc-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 900px) {
  .calc-body {
    grid-template-columns: 1.1fr 1fr;
  }
}

.calc-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  color: var(--text-2);
  font-weight: 500;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 8px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
}
.type-btn:hover {
  background: var(--surface-hover);
  border-color: var(--border-hover);
}
.type-btn.active {
  background: rgba(232, 199, 125, 0.12);
  border-color: var(--gold);
  color: var(--gold-3);
}

.type-name {
  font-size: 12px;
  font-weight: 600;
}
.type-fee {
  font-size: 10px;
  color: var(--text-3);
  margin-top: 2px;
}

.weight-presets {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.preset-chip {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 11px;
  cursor: pointer;
  font-family: var(--mono);
}
.preset-chip.active {
  background: var(--gold);
  color: var(--gold-ink);
  border-color: var(--gold);
  font-weight: 700;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.calc-input {
  width: 100%;
  height: 40px;
  padding: 0 48px 0 12px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--mono);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}
.calc-input:focus {
  border-color: var(--gold);
}

.input-unit {
  position: absolute;
  right: 12px;
  font-size: 12px;
  color: var(--text-3);
  pointer-events: none;
}

.form-hint {
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.4;
}

.calc-results {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
}

.res-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.res-item {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.res-item.highlight {
  background: rgba(232, 199, 125, 0.08);
  border-color: rgba(232, 199, 125, 0.35);
}

.res-label {
  font-size: 11px;
  color: var(--text-3);
}

.res-num {
  font-size: 20px;
  font-weight: 700;
  font-family: var(--mono);
  color: var(--text);
  margin: 6px 0 2px;
}
.res-num.gold {
  color: var(--gold-3);
}

.res-sub {
  font-size: 11px;
  color: var(--text-3);
}

.arb-strategy-guide {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: var(--surface-2);
}
.arb-strategy-guide.action-positive {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.08);
}
.arb-strategy-guide.action-negative {
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.08);
}
.arb-strategy-guide.action-neutral {
  border-color: rgba(96, 165, 250, 0.3);
  background: rgba(96, 165, 250, 0.06);
}

.guide-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gold-3);
}

.guide-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin: 4px 0;
}

.guide-desc {
  font-size: 11px;
  color: var(--text-2);
  line-height: 1.5;
}

.calc-tip {
  font-size: 11px;
  color: var(--text-3);
  margin: 0;
  line-height: 1.5;
}
</style>
