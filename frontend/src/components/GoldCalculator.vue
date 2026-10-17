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
          <h3 class="calc-title">黄金持仓与变现盈亏计算器</h3>
          <p class="calc-sub">实时联动 AU9999 现价 · 实物/首饰/ETF变现残值测算</p>
        </div>
      </div>
      <div class="current-price-badge">
        <span>当前基准金价</span>
        <b>¥{{ fmt(currentPrice) }} / 克</b>
      </div>
    </header>

    <div class="calc-body">
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
      </div>

      <!-- 右栏：计算结果大看板 -->
      <div class="calc-results">
        <!-- 核心浮动盈亏大字 -->
        <div class="result-banner" :class="profitTone">
          <div class="banner-label">累计浮动盈亏 (按当前市值)</div>
          <div class="banner-value">
            <span class="val-sign">{{ profit >= 0 ? '+' : '' }}¥{{ fmt(profit, 2) }}</span>
            <span class="val-rate">({{ profitRate >= 0 ? '+' : '' }}{{ fmt(profitRate, 2) }}%)</span>
          </div>
        </div>

        <!-- 详细数据指标网格 -->
        <div class="result-grid">
          <div class="res-item">
            <span class="res-label">总投入本金</span>
            <span class="res-num">¥{{ fmt(totalCost, 2) }}</span>
            <span class="res-sub">均价 ¥{{ fmt(costPerGram, 2) }}/g</span>
          </div>

          <div class="res-item">
            <span class="res-label">当前持仓市值</span>
            <span class="res-num">¥{{ fmt(marketValue, 2) }}</span>
            <span class="res-sub">{{ weight || 0 }} 克 × ¥{{ fmt(currentPrice) }}</span>
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { fmtNumber } from '../format';

const props = defineProps({
  domesticPrice: { type: Number, default: 0 },
});

const currentPrice = computed(() => props.domesticPrice || 899);

const PRODUCT_TYPES = [
  { key: 'bar', name: '实物投资金条', defaultFee: 8, discount: 3 },
  { key: 'jewelry', name: '金店首饰黄金', defaultFee: 50, discount: 5 },
  { key: 'etf', name: '黄金 ETF / 纸黄金', defaultFee: 0, discount: 0 },
];

const PRESET_WEIGHTS = [10, 20, 50, 100, 200, 500, 1000];

const STORAGE_CALC = 'gold_monitor_calc_state';

// 响应式表单
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

// 计算公式
const costPerGram = computed(() => Number(buyPrice.value || 0) + Number(feePerGram.value || 0));
const totalCost = computed(() => Number(weight.value || 0) * costPerGram.value);
const marketValue = computed(() => Number(weight.value || 0) * currentPrice.value);
const profit = computed(() => marketValue.value - totalCost.value);
const profitRate = computed(() => (totalCost.value > 0 ? (profit.value / totalCost.value) * 100 : 0));
const profitTone = computed(() => (profit.value >= 0 ? 'tone-up' : 'tone-down'));

// 变现回收净值（回收克价 = 当前大盘价 - 回收折价，工费归零）
const recyclePricePerGram = computed(() => Math.max(0, currentPrice.value - recycleDiscount.value));
const liquidationValue = computed(() => Number(weight.value || 0) * recyclePricePerGram.value);
const liquidationProfit = computed(() => liquidationValue.value - totalCost.value);
const breakevenPrice = computed(() => costPerGram.value + recycleDiscount.value);

function fmt(v, d = 2) {
  return v !== null && v !== undefined ? fmtNumber(v, d) : '--';
}
</script>

<style scoped>
.calc-card {
  padding: 24px;
  background: linear-gradient(165deg, rgba(22, 26, 38, 0.95) 0%, rgba(13, 16, 24, 0.98) 100%);
  border: 1px solid rgba(251, 191, 36, 0.2);
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
  background: rgba(251, 191, 36, 0.12);
  color: var(--gold-3);
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.calc-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
}

.calc-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.current-price-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.25);
}
.current-price-badge span {
  font-size: 11px;
  color: var(--gold-3);
}
.current-price-badge b {
  font-size: 16px;
  font-family: var(--mono);
  color: #ffffff;
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
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
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
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.2s;
}
.type-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(251, 191, 36, 0.3);
}
.type-btn.active {
  background: rgba(251, 191, 36, 0.12);
  border-color: var(--gold-2);
  color: var(--gold-3);
}
.type-name {
  font-size: 12px;
  font-weight: 700;
}
.type-fee {
  font-size: 10px;
  margin-top: 2px;
  opacity: 0.8;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.weight-presets {
  display: flex;
  align-items: center;
  gap: 4px;
}

.preset-chip {
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  font-size: 10px;
  font-family: var(--mono);
  color: var(--text-2);
  cursor: pointer;
}
.preset-chip:hover {
  color: var(--text);
  border-color: rgba(251, 191, 36, 0.4);
}
.preset-chip.active {
  background: var(--gold-2);
  color: #000000;
  border-color: var(--gold);
  font-weight: 700;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.calc-input {
  width: 100%;
  height: 42px;
  padding: 0 54px 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: #ffffff;
  font-size: 15px;
  font-family: var(--mono);
  font-weight: 600;
}
.calc-input:focus {
  outline: none;
  border-color: var(--gold-2);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.25);
}

.input-unit {
  position: absolute;
  right: 12px;
  font-size: 12px;
  color: var(--text-3);
  pointer-events: none;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* 结果看板 */
.calc-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(0, 0, 0, 0.3);
  padding: 18px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.result-banner {
  padding: 16px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.result-banner.tone-up {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(239, 68, 68, 0.05) 100%);
  border: 1px solid rgba(239, 68, 68, 0.35);
}
.result-banner.tone-down {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0.05) 100%);
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.banner-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}

.banner-value {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: var(--mono);
}

.val-sign {
  font-size: 26px;
  font-weight: 800;
}
.result-banner.tone-up .val-sign {
  color: var(--up);
}
.result-banner.tone-down .val-sign {
  color: var(--down);
}

.val-rate {
  font-size: 16px;
  font-weight: 700;
  opacity: 0.9;
}
.result-banner.tone-up .val-rate {
  color: var(--up);
}
.result-banner.tone-down .val-rate {
  color: var(--down);
}

.result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.res-item {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.res-item.highlight {
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(251, 191, 36, 0.05);
}

.res-label {
  font-size: 11px;
  color: var(--text-2);
}

.res-num {
  font-size: 16px;
  font-weight: 700;
  font-family: var(--mono);
  color: #ffffff;
}

.res-sub {
  font-size: 10px;
  color: var(--text-3);
  font-family: var(--mono);
}

.calc-tip {
  margin: 0;
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.5;
}
</style>
