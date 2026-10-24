<template>
  <div class="card calc-card" id="gold-calculator">
    <header class="calc-head">
      <div class="head-left">
        <div class="calc-icon">
          <Icon name="calculator" :size="20" />
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
          {{ t('goldCalc.modeArb') }}
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
            <span class="res-sub">{{ t('goldCalc.floatPnl') }}<b :class="profitTone"><span class="nowrap">{{ profit >= 0 ? '+' : '' }}¥{{ fmt(profit, 2) }}</span> ({{ fmt(profitRate, 2) }}%)</b></span>
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
            <div class="weight-presets weight-presets-five">
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
import Icon from './icons/Icon.vue';
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
/* 卡片：发丝边、纯色底，不用阴影与渐变 */
.calc-card {
  padding: 24px;
  background: var(--surface-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: none;
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
  min-width: 0;
}

/* 小方块图标：发丝边，不用阴影 */
.calc-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  border: 1px solid var(--line-strong);
  color: var(--gold-3);
}

/* 小标题：展示字 20px（手机 18px） */
.calc-title {
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

:lang(zh) .calc-title {
  letter-spacing: 0;
}

.calc-sub {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

/* 模式切换：发丝边分段条，激活项为金色发丝边加淡金底 */
.calc-tab-group {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.calc-tab-btn {
  min-height: 36px;
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.calc-tab-btn.active {
  border-color: var(--gold);
  background: color-mix(in srgb, var(--gold) 12%, transparent);
  color: var(--text);
}

/* 当前基准金价：发丝边小标签 */
.current-price-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 6px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  background: color-mix(in srgb, var(--gold) 6%, transparent);
}

.current-price-badge span {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold-3);
}

:lang(zh) .current-price-badge span {
  font-family: var(--font);
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.current-price-badge b {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
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
  font-size: 13px;
  line-height: 1.5;
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

/* 持仓类型：发丝边方块，选中项为金色发丝边加淡金底 */
.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 8px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--text);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.type-btn.active {
  background: color-mix(in srgb, var(--gold) 12%, transparent);
  border-color: var(--gold);
  color: var(--text);
}

.type-name {
  font-size: 13px;
  font-weight: 500;
}

.type-fee {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-3);
}

.weight-presets {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

/* 克重芯片：发丝边，2px 圆角；选中项为金色发丝边加淡金底 */
.preset-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  color: var(--text-2);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.preset-chip.active {
  border-color: var(--gold);
  background: color-mix(in srgb, var(--gold) 12%, transparent);
  color: var(--text);
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
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
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
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
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
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

/* 重点结果：纯色淡金底与金色发丝边 */
.res-item.highlight {
  background: color-mix(in srgb, var(--gold) 8%, var(--surface-2));
  border-color: var(--line-strong);
}

.res-label {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}

/* 结果数字：等宽、等宽对齐、500 字重 */
.res-num {
  margin: 6px 0 2px;
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  color: var(--text);
}

.res-num.gold {
  color: var(--gold-text);
}

.res-sub {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}

.res-sub b {
  font-family: var(--font-mono);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.res-sub .nowrap {
  white-space: nowrap;
}

/* 套利研判：边框与底色保持中性，涨跌色只用于标签文字 */
.arb-strategy-guide {
  padding: 14px 16px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--surface-2);
}

.arb-strategy-guide.action-positive .guide-tag {
  color: var(--up);
}

.arb-strategy-guide.action-negative .guide-tag {
  color: var(--down);
}

.arb-strategy-guide.action-neutral .guide-tag {
  color: var(--text-2);
}

.guide-tag {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold-3);
}

:lang(zh) .guide-tag {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.guide-title {
  margin: 4px 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--text);
}

.guide-desc {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-2);
}

.calc-tip {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-3);
}

/* 手机端：持仓类型改为紧凑列表，按钮与输入框达到 44px */
@media (max-width: 767px) {
  .calc-card {
    padding: 16px;
  }

  .calc-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-bottom: 18px;
  }

  .calc-title {
    font-size: 18px;
  }

  .calc-sub {
    font-size: 13px;
  }

  .calc-tab-group {
    width: 100%;
  }

  .calc-tab-btn {
    flex: 1 1 0;
    min-height: 44px;
    padding: 0 10px;
    font-size: 14px;
  }

  .current-price-badge {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
  }

  .current-price-badge span {
    font-size: 12px;
  }

  .calc-body {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .calc-form {
    gap: 14px;
  }

  .form-label {
    font-size: 13px;
  }

  .label-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .weight-presets {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    width: 100%;
  }

  .weight-presets.weight-presets-five {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .preset-chip {
    height: 40px;
    padding: 0 4px;
    font-size: 13px;
  }

  .type-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }

  .type-btn {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    min-height: 48px;
    padding: 10px 14px;
    text-align: left;
  }

  .type-name {
    font-size: 14px;
  }

  .type-fee {
    margin-top: 0;
    font-size: 12px;
    white-space: nowrap;
  }

  .form-row-2 {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px;
  }

  .calc-input {
    height: 44px;
    font-size: 16px;
  }

  .form-hint {
    font-size: 12px;
  }

  .calc-results {
    gap: 14px;
  }

  .res-card-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
  }

  .res-item {
    min-width: 0;
    padding: 12px;
  }

  .res-label {
    font-size: 12px;
  }

  .res-num {
    margin: 4px 0 2px;
    font-size: 18px;
    overflow-wrap: break-word;
  }

  .res-sub {
    font-size: 12px;
    line-height: 1.5;
  }

  .arb-strategy-guide {
    padding: 12px 14px;
  }

  .guide-title {
    font-size: 14px;
  }

  .guide-desc {
    font-size: 14px;
    line-height: 1.6;
  }

  .calc-tip {
    font-size: 12px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .type-btn:hover:not(.active) {
    background: var(--surface-hover);
    border-color: var(--line-strong);
  }
}
</style>
