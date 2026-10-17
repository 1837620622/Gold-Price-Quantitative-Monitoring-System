<template>
  <section class="card ai-card" aria-labelledby="ai-title">
    <!-- 头部：AI 智能体图标 + 标题 -->
    <header class="ai-head">
      <div class="ai-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-3 9a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z" fill="currentColor"/>
        </svg>
      </div>
      <div class="ai-title-wrap">
        <h2 id="ai-title" class="ai-title">AI 量化深度研报</h2>
        <span class="ai-subtitle">多因子量化推演与实盘策略指引</span>
      </div>
    </header>

    <!-- 可选模型下拉选择器（金融终端风格） -->
    <div class="model-select-group">
      <label class="select-label" for="model-selector">
        <span class="label-dot"></span>
        <span>推理引擎模型</span>
      </label>
      <div class="select-wrapper">
        <select
          id="model-selector"
          v-model="selectedModel"
          class="custom-select"
          :disabled="state === 'loading'"
          @change="onModelChange"
        >
          <option v-for="m in MODELS" :key="m.id" :value="m.id">
            {{ m.label }}
          </option>
        </select>
        <span class="select-arrow" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </div>
      <div class="model-feature-tag">
        <span class="tag-desc">{{ currentModelDesc }}</span>
      </div>
    </div>

    <!-- 分析中状态动画 -->
    <div v-if="state === 'loading'" class="ai-analyzing-box">
      <div class="analyzing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p class="analyzing-text">{{ currentModelShortName }} 推理链计算中…</p>
      <span class="analyzing-sub">正在结合 250 日K线与多因子矩阵推演</span>
    </div>

    <!-- 正常/空闲状态描述 -->
    <div v-else class="ai-body">
      <p class="ai-desc">{{ statusText }}</p>
      <div class="ai-tags">
        <span class="tag">多空定调</span>
        <span class="tag">关键枢轴点</span>
        <span class="tag">金银比研判</span>
        <span class="tag">仓位建议</span>
      </div>
    </div>

    <!-- 启动分析主按钮 -->
    <button
      type="button"
      class="btn btn-primary ai-submit-btn"
      :disabled="state === 'loading' || unavailable"
      @click="handleRun"
    >
      <span v-if="state === 'loading'" class="spinner" aria-hidden="true"></span>
      <span v-else class="btn-sparkle">✦</span>
      <span>{{ buttonText }}</span>
    </button>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  state: { type: String, default: 'idle' }, // idle | loading | done | error
  timestamp: { type: String, default: '' },
  cached: { type: Boolean, default: false },
  error: { type: String, default: '' },
  unavailable: { type: Boolean, default: false },
});

const emit = defineEmits(['run']);

const MODELS = [
  { id: 'deepseek-r1', label: 'DeepSeek-R1 (深度推理 · 默认)', short: 'DeepSeek-R1', desc: '具备思维链推理能力，擅长宏观归因与矛盾点博弈' },
  { id: 'qwen-72b', label: 'Qwen 2.5 72B (全能旗舰)', short: 'Qwen 72B', desc: '阿里千问顶尖旗舰模型，中文金融理解与回测研判极强' },
  { id: 'llama-70b', label: 'Llama 3.3 70B (顶尖研报)', short: 'Llama 70B', desc: 'Meta 最新旗舰开源模型，宏观视野宽广、逻辑严密' },
  { id: 'qwen-14b', label: 'Qwen 2.5 14B (均衡低耗)', short: 'Qwen 14B', desc: '性价比卓越，消耗神经元少，快速输出专业报告' },
  { id: 'qwen-7b', label: 'Qwen 2.5 7B (轻量极速)', short: 'Qwen 7B', desc: '极速毫秒级响应，超低额度开销，平滑稳定' },
  { id: 'auto', label: '智能调度 (自动多源容灾)', short: '智能调度', desc: '根据配额与健康度自动调度最优可用模型，无缝降级' },
];

const selectedModel = ref('deepseek-r1');

onMounted(() => {
  const saved = localStorage.getItem('gold_ai_model');
  if (saved && MODELS.some((m) => m.id === saved)) {
    selectedModel.value = saved;
  }
});

function onModelChange() {
  localStorage.setItem('gold_ai_model', selectedModel.value);
}

const currentModelDesc = computed(() => {
  const found = MODELS.find((m) => m.id === selectedModel.value);
  return found ? found.desc : '金融大模型深度解析';
});

const currentModelShortName = computed(() => {
  const found = MODELS.find((m) => m.id === selectedModel.value);
  return found ? found.short : '大模型';
});

const statusText = computed(() => {
  if (props.unavailable && props.state !== 'loading') return '行情暂不可用，无法生成深度研报';
  switch (props.state) {
    case 'done':
      return props.cached ? '已展示 15 分钟内缓存报告，切换模型或点击可重新生成' : '研报已生成，可下拉切换模型重新分析';
    case 'error':
      return props.error || '分析调用异常，已自动触发多源兜底机制，请重试';
    default:
      return '由 Cloudflare Workers AI 驱动，严格基于真实行情与量化因子深度推演';
  }
});

const buttonText = computed(() => {
  if (props.state === 'loading') return '模型推理中…';
  return props.state === 'done' ? '重新生成研报' : '开始深度分析';
});

function handleRun() {
  emit('run', selectedModel.value);
}
</script>

<style scoped>
.ai-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  background: linear-gradient(145deg, rgba(26, 30, 48, 0.95) 0%, rgba(14, 17, 28, 0.98) 100%);
  border-color: rgba(251, 191, 36, 0.22);
  position: relative;
}

.ai-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%);
  color: var(--gold);
  border: 1px solid rgba(251, 191, 36, 0.35);
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.15);
  flex-shrink: 0;
}

.ai-title-wrap {
  display: flex;
  flex-direction: column;
}

.ai-title {
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.ai-subtitle {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-3);
}

/* 模型选择器 (金融暗色下拉控件) */
.model-select-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(10, 12, 18, 0.6);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: border-color 0.2s ease;
}

.model-select-group:focus-within {
  border-color: var(--gold);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.15);
}

.select-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 6px var(--gold);
}

.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.custom-select {
  width: 100%;
  height: 36px;
  padding: 0 32px 0 14px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  color: #ffffff;
  font-family: var(--font);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.custom-select:hover {
  border-color: var(--gold);
  background: var(--surface-hover);
}

.custom-select:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.25);
}

.custom-select option {
  background: #141824;
  color: #f3f4f6;
  padding: 8px;
}

.select-arrow {
  position: absolute;
  right: 10px;
  pointer-events: none;
  color: var(--gold);
  display: grid;
  place-items: center;
}

.model-feature-tag {
  font-size: 11px;
  color: var(--text-2);
  line-height: 1.4;
  margin-top: 2px;
}

.tag-desc {
  color: var(--text-2);
}

.ai-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-desc {
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.55;
}

.ai-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ai-tags .tag {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
}

/* 分析中动画 */
.ai-analyzing-box {
  padding: 14px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.05);
  border: 1px dashed rgba(251, 191, 36, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.analyzing-dots {
  display: flex;
  gap: 6px;
  margin-bottom: 2px;
}

.analyzing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold);
  animation: bounce 1.4s ease-in-out infinite both;
}

.analyzing-dots span:nth-child(1) { animation-delay: -0.32s; }
.analyzing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

.analyzing-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--gold);
}

.analyzing-sub {
  font-size: 11px;
  color: var(--text-3);
}

.ai-submit-btn {
  width: 100%;
  margin-top: auto;
}

.btn-sparkle {
  font-size: 13px;
  margin-right: 2px;
}
</style>
