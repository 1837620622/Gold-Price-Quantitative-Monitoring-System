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
          <h3 class="calc-title">{{ t('goldCalc.title') }}</h3>
          <p class="calc-sub">{{ t('goldCalc.subtitle') }}</p>
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
          {{ t('goldCalc.modeHolding') }}
        </button>
        <button
          type="button"
          class="calc-tab-btn"
          :class="{ active: mode === 'arbitrage' }"
          @click="mode = 'arbitrage'"
        >
          ⚡ {{ t('goldCalc.modeArb') }}
        </button>
      </div>

      <div class="current-price-badge">
        <span>{{ t('goldCalc.benchmark') }}</span>
        <b>¥{{ fmt(currentPrice) }} {{ t('goldCalc.perGram') }}</b>
      </div>
    </header>

    <!-- 模式 1：实物与首饰持仓变现计算 -->
    <div v-if="mode === 'holding'" class="calc-body">
      <!-- 左栏：输入配置 -->
      <div class="calc-form">
        <!-- 产品类型选择 -->
        <div class="form-group">
          <label class="form-label">{{ t('goldCalc.typeLabel') }}</label>
          <div class="type-grid">
            <button
              v-for="pt in productTypes"
              :key="pt.key"
              type="button"
              class="type-btn"
              :class="{ active: productType === pt.key }"
              @click="selectType(pt)"
            >
              <span class="type-name">{{ pt.name }}</span>
              <span class="type-fee">{{ t('goldCalc.typeFee', { fee: pt.defaultFee }) }}</span>
            </button>
          </div>
        </div>

        <!-- 快捷克重选择 -->
        <div class="form-group">
          <div class="label-row">
            <label class="form-label">{{ t('goldCalc.weightLabel') }}</label>
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
              :placeholder="t('goldCalc.weightPh')"
              class="calc-input"
            />
            <span class="input-unit">{{ t('goldCalc.unitGram') }}</span>
          </div>
        </div>

        <!-- 买入成本单价与工费 -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">{{ t('goldCalc.buyLabel') }}</label>
            <div class="input-wrap">
              <input
                v-model.number="buyPrice"
                type="number"
                min="100"
                step="any"
                :placeholder="t('goldCalc.buyPh')"
                class="calc-input"
              />
              <span class="input-unit">{{ t('goldCalc.unitYuanGram') }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('goldCalc.feeLabel') }}</label>
            <div class="input-wrap">
              <input
                v-model.number="feePerGram"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                class="calc-input"
              />
              <span class="input-unit">{{ t('goldCalc.unitYuanGram') }}</span>
            </div>
          </div>
        </div>

        <!-- 回收折价设置 -->
        <div class="form-group">
          <label class="form-label">{{ t('goldCalc.discountLabel') }}</label>
          <div class="input-wrap">
            <input
              v-model.number="recycleDiscount"
              type="number"
              min="0"
              step="any"
              :placeholder="t('goldCalc.discountPh')"
              class="calc-input"
            />
            <span class="input-unit">{{ t('goldCalc.unitYuanGram') }}</span>
          </div>
          <span class="form-hint">{{ t('goldCalc.discountHint') }}</span>
        </div>
      </div>

      <!-- 右栏：精算报表卡片 -->
      <div class="calc-results">
        <div class="res-card-grid">
          <div class="res-item">
            <span class="res-label">{{ t('goldCalc.totalCost') }}</span>
            <span class="res-num">¥{{ fmt(totalCost, 2) }}</span>
            <span class="res-sub">{{ t('goldCalc.costPerGram', { value: fmt(costPerGram, 2) }) }}</span>
          </div>

          <div class="res-item">
            <span class="res-label">{{ t('goldCalc.marketValue') }}</span>
            <span class="res-num gold">¥{{ fmt(marketValue, 2) }}</span>
            <span class="res-sub">{{ t('goldCalc.floatPnl') }}<b :class="profitTone">{{ profit >= 0 ? '+' : '' }}¥{{ fmt(profit, 2) }} ({{ fmt(profitRate, 2) }}%)</b></span>
          </div>

          <div class="res-item highlight">
            <span class="res-label">{{ t('goldCalc.liquidation') }}</span>
            <span class="res-num">¥{{ fmt(liquidationValue, 2) }}</span>
            <span class="res-sub">{{ t('goldCalc.discountBasis', { discount: recycleDiscount }) }}</span>
          </div>

          <div class="res-item">
            <span class="res-label">{{ t('goldCalc.liquidationPnl') }}</span>
            <span class="res-num" :class="liquidationProfit >= 0 ? 'tone-up' : 'tone-down'">
              {{ liquidationProfit >= 0 ? '+' : '' }}¥{{ fmt(liquidationProfit, 2) }}
            </span>
            <span class="res-sub">{{ t('goldCalc.breakeven', { price: fmt(breakevenPrice, 2) }) }}</span>
          </div>
        </div>

        <p class="calc-tip">
          {{ t('goldCalc.tip') }}
        </p>
      </div>
    </div>

    <!-- 模式 2：内外盘跨市套利与基差推演 -->
    <div v-else class="calc-body">
      <!-- 左栏：套利对冲参数 -->
      <div class="calc-form">
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">{{ t('goldCalc.domPrice') }}</label>
            <div class="input-wrap">
              <input
                v-model.number="arbDomPrice"
                type="number"
                step="any"
                class="calc-input"
              />
              <span class="input-unit">{{ t('goldCalc.unitYuanGram') }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('goldCalc.intlPrice') }}</label>
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
            <label class="form-label">{{ t('goldCalc.fxLabel') }}</label>
            <div class="input-wrap">
              <input
                v-model.number="arbFxRate"
                type="number"
                step="0.0001"
                class="calc-input"
              />
              <span class="input-unit">{{ t('goldCalc.unitRate') }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('goldCalc.costLabel') }}</label>
            <div class="input-wrap">
              <input
                v-model.number="arbCostRate"
                type="number"
                step="0.01"
                class="calc-input"
              />
              <span class="input-unit">{{ t('goldCalc.unitCost') }}</span>
            </div>
          </div>
        </div>

        <!-- 对冲名义规模 -->
        <div class="form-group">
          <div class="label-row">
            <label class="form-label">{{ t('goldCalc.arbWeightLabel') }}</label>
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
            <span class="input-unit">{{ t('goldCalc.unitNotional') }}</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('goldCalc.holdLabel') }}</label>
          <div class="input-wrap">
            <input
              v-model.number="arbHoldingDays"
              type="number"
              min="1"
              max="365"
              class="calc-input"
            />
            <span class="input-unit">{{ t('goldCalc.unitDays') }}</span>
          </div>
        </div>
      </div>

      <!-- 右栏：跨市基差与套利收益推演卡片 -->
      <div class="calc-results">
        <div class="res-card-grid">
          <div class="res-item highlight">
            <span class="res-label">{{ t('goldCalc.parityLabel') }}</span>
            <span class="res-num">¥{{ fmt(theoreticalParity, 2) }}</span>
            <span class="res-sub">{{ t('goldCalc.parityFormula') }}</span>
          </div>

          <div class="res-item">
            <span class="res-label">{{ t('goldCalc.basisLabel') }}</span>
            <span class="res-num" :class="basisSpread >= 0 ? 'tone-up' : 'tone-down'">
              {{ basisSpread >= 0 ? '+' : '' }}¥{{ fmt(basisSpread, 2) }} {{ t('goldCalc.perGram') }}
            </span>
            <span class="res-sub">{{ t('goldCalc.premiumRate') }}<b>{{ premiumComputed >= 0 ? '+' : '' }}{{ fmt(premiumComputed, 2) }}%</b></span>
          </div>

          <div class="res-item">
            <span class="res-label">{{ t('goldCalc.netProfit', { weight: arbWeight }) }}</span>
            <span class="res-num" :class="netArbProfit >= 0 ? 'tone-up' : 'tone-down'">
              {{ netArbProfit >= 0 ? '+' : '' }}¥{{ fmt(netArbProfit, 2) }}
            </span>
            <span class="res-sub">{{ t('goldCalc.grossCost', { gross: fmt(grossArbProfit, 2), cost: fmt(arbCostTotal, 2) }) }}</span>
          </div>

          <div class="res-item">
            <span class="res-label">{{ t('goldCalc.aprLabel') }}</span>
            <span class="res-num gold">
              {{ netArbApr >= 0 ? '+' : '' }}{{ fmt(netArbApr, 2) }}%
            </span>
            <span class="res-sub">{{ t('goldCalc.aprBasis', { days: arbHoldingDays }) }}</span>
          </div>
        </div>

        <!-- 套利信号指引 -->
        <div class="arb-strategy-guide" :class="arbActionClass">
          <div class="guide-tag">{{ t('goldCalc.guideTag') }}</div>
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
import { useI18n } from '../i18n';

const { t } = useI18n();

const props = defineProps({
  domesticPrice: { type: Number, default: 899 },
  intlPrice: { type: Number, default: 4166.1 },
  fxRate: { type: Number, default: 6.6985 },
  premiumPercent: { type: Number, default: 0.2 },
});

const mode = ref('holding');
const currentPrice = computed(() => props.domesticPrice || 899);

const PRODUCT_TYPES = [
  { key: 'bar', labelKey: 'goldCalc.typeBar', defaultFee: 8, discount: 3 },
  { key: 'jewelry', labelKey: 'goldCalc.typeJewelry', defaultFee: 50, discount: 5 },
  { key: 'etf', labelKey: 'goldCalc.typeEtf', defaultFee: 0, discount: 0 },
];
const productTypes = computed(() => PRODUCT_TYPES.map((p) => ({ ...p, name: t(p.labelKey) })));

const PRESET_WEIGHTS = [10, 20, 50, 100, 200, 500, 1000];
const STORAGE_CALC = 'gold_monitor_calc_state';

// 模式 1：持仓表单
const productType = ref('bar');
const weight = ref(50);
const buyPrice = ref(560);
const feePerGram = ref(8);
const recycleDiscount = ref(3);

function selectType(pt) {
  productType.value = pt.key;
  feePerGram.value = pt.defaultFee;
  recycleDiscount.value = pt.discount;
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
  if (p > 0.65) return t('goldCalc.arbPositive');
  if (p < -0.25) return t('goldCalc.arbNegative');
  return t('goldCalc.arbNeutral');
});

const arbActionDesc = computed(() => {
  const p = premiumComputed.value;
  if (p > 0.65) {
    return t('goldCalc.arbPositiveDesc', { pct: p.toFixed(2) });
  }
  if (p < -0.25) {
    return t('goldCalc.arbNegativeDesc', { pct: p.toFixed(2) });
  }
  return t('goldCalc.arbNeutralDesc', { pct: p.toFixed(2) });
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
