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
        <h2 id="ai-title" class="ai-title">{{ t('aiCard.title') }}</h2>
        <span class="ai-subtitle">{{ t('aiCard.sub') }}</span>
      </div>
    </header>

    <!-- 可选模型下拉选择器（按上游厂商分组与新建栏目） -->
    <div class="model-select-group">
      <div class="select-header">
        <label class="select-label" for="model-selector">
          <span class="label-dot"></span>
          <span>{{ t('aiCard.modelLabel') }}</span>
        </label>
        <span class="upstream-badge">
          <span class="upstream-dot"></span>
          <span>{{ currentModelUpstream }}</span>
        </span>
      </div>
      <div class="select-wrapper">
        <select
          id="model-selector"
          v-model="selectedModel"
          class="custom-select"
          :disabled="state === 'loading'"
          @change="onModelChange"
        >
          <optgroup v-for="group in modelGroups" :key="group.id" :label="group.name">
            <option v-for="m in group.models" :key="m.id" :value="m.id">
              {{ m.label }}
            </option>
          </optgroup>
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
      <p class="analyzing-text">{{ t('aiCard.reasoning', { model: currentModelShortName }) }}</p>
      <span class="analyzing-sub">{{ t('aiCard.reasoningHint') }}</span>
    </div>

    <!-- 正常/空闲状态描述 -->
    <div v-else class="ai-body">
      <p class="ai-desc">{{ statusText }}</p>
      <div class="ai-tags">
        <span class="tag">{{ t('aiCard.tagTone') }}</span>
        <span class="tag">{{ t('aiCard.tagPivot') }}</span>
        <span class="tag">{{ t('aiCard.tagRatio') }}</span>
        <span class="tag">{{ t('aiCard.tagSize') }}</span>
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
import { useI18n } from '../i18n';

const { t } = useI18n();

const props = defineProps({
  state: { type: String, default: 'idle' }, // idle | loading | done | error
  timestamp: { type: String, default: '' },
  cached: { type: Boolean, default: false },
  error: { type: String, default: '' },
  unavailable: { type: Boolean, default: false },
});

const emit = defineEmits(['run']);

// 模型按上游厂商分组配置（按语言动态获取名称与说明）
const RAW_GROUPS = [
  {
    id: 'deepseek',
    nameKey: 'aiCard.group.deepseek',
    models: [
      { id: 'deepseek-r1', labelKey: 'aiCard.model.deepseek', short: 'DeepSeek-R1', descKey: 'aiCard.model.deepseekDesc' },
      { id: 'deepseek-v4-flash', labelKey: 'aiCard.model.deepseekV4', short: 'DeepSeek-V4.1', descKey: 'aiCard.model.deepseekV4Desc' },
      { id: 'deepseek-v3', labelKey: 'aiCard.model.deepseekV3', short: 'DeepSeek-V3.2', descKey: 'aiCard.model.deepseekV3Desc' },
    ],
  },
  {
    id: 'kimi',
    nameKey: 'aiCard.group.kimi',
    models: [
      { id: 'kimi-k3', labelKey: 'aiCard.model.kimiK3', short: 'Kimi K3', descKey: 'aiCard.model.kimiK3Desc' },
      { id: 'kimi-k2.5', labelKey: 'aiCard.model.kimiK25', short: 'Kimi K2.5', descKey: 'aiCard.model.kimiK25Desc' },
    ],
  },
  {
    id: 'glm',
    nameKey: 'aiCard.group.glm',
    models: [
      { id: 'glm-5.3', labelKey: 'aiCard.model.glm53', short: 'GLM 5.3', descKey: 'aiCard.model.glm53Desc' },
      { id: 'glm-4.7-flash', labelKey: 'aiCard.model.glmFlash', short: 'GLM 4.7 Flash', descKey: 'aiCard.model.glmFlashDesc' },
    ],
  },
  {
    id: 'qwen',
    nameKey: 'aiCard.group.qwen',
    models: [
      { id: 'qwen-72b', labelKey: 'aiCard.model.qwen72', short: 'Qwen 72B', descKey: 'aiCard.model.qwen72Desc' },
      { id: 'qwen-14b', labelKey: 'aiCard.model.qwen14', short: 'Qwen 14B', descKey: 'aiCard.model.qwen14Desc' },
    ],
  },
  {
    id: 'kilo',
    nameKey: 'aiCard.group.kilo',
    models: [
      { id: 'kilo-auto-free', labelKey: 'aiCard.model.kiloAuto', short: 'Kilo Free', descKey: 'aiCard.model.kiloAutoDesc' },
      { id: 'nemotron-3.5', labelKey: 'aiCard.model.nemotron', short: 'Nemotron', descKey: 'aiCard.model.nemotronDesc' },
    ],
  },
  {
    id: 'other',
    nameKey: 'aiCard.group.other',
    models: [
      { id: 'llama-70b', labelKey: 'aiCard.model.llama', short: 'Llama 70B', descKey: 'aiCard.model.llamaDesc' },
      { id: 'auto', labelKey: 'aiCard.model.auto', shortKey: 'aiCard.model.autoShort', descKey: 'aiCard.model.autoDesc' },
    ],
  },
];

const modelGroups = computed(() =>
  RAW_GROUPS.map((g) => ({
    id: g.id,
    name: t(g.nameKey),
    models: g.models.map((m) => ({
      ...m,
      label: t(m.labelKey),
      desc: t(m.descKey),
      short: m.shortKey ? t(m.shortKey) : m.short,
      upstream: t(g.nameKey),
    })),
  }))
);

const allModels = computed(() => modelGroups.value.flatMap((g) => g.models));

const selectedModel = ref('deepseek-r1');

onMounted(() => {
  const saved = localStorage.getItem('gold_ai_model');
  if (saved && allModels.value.some((m) => m.id === saved)) {
    selectedModel.value = saved;
  }
});

function onModelChange() {
  localStorage.setItem('gold_ai_model', selectedModel.value);
}

const currentModelDesc = computed(() => {
  const found = allModels.value.find((m) => m.id === selectedModel.value);
  return found ? found.desc : t('aiCard.reportTitle');
});

const currentModelShortName = computed(() => {
  const found = allModels.value.find((m) => m.id === selectedModel.value);
  return found ? found.short : t('aiCard.modelBadge');
});

const currentModelUpstream = computed(() => {
  const found = allModels.value.find((m) => m.id === selectedModel.value);
  return found ? found.upstream : 'Cloudflare Workers AI';
});

const statusText = computed(() => {
  if (props.unavailable && props.state !== 'loading') return t('aiCard.noMarket');
  switch (props.state) {
    case 'done':
      return props.cached ? t('aiCard.cachedHint') : t('aiCard.doneHint');
    case 'error':
      return props.error || t('aiCard.error');
    default:
      return t('aiCard.powered');
  }
});

const buttonText = computed(() => {
  if (props.state === 'loading') return t('aiCard.inferring');
  return props.state === 'done' ? t('aiCard.regenerate') : t('aiCard.start');
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
  background: var(--surface-card);
  border-color: rgba(232, 199, 125, 0.22);
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
  background: rgba(232, 199, 125, 0.12);
  color: var(--gold);
  border: 1px solid rgba(232, 199, 125, 0.35);
  flex-shrink: 0;
}

.ai-title-wrap {
  display: flex;
  flex-direction: column;
}

.ai-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
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
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: border-color 0.2s ease;
}

.model-select-group:focus-within {
  border-color: var(--gold);
}

.select-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.upstream-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-family: var(--mono);
  color: var(--gold-3);
  background: rgba(232, 199, 125, 0.1);
  border: 1px solid rgba(232, 199, 125, 0.22);
  padding: 2px 7px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}

.upstream-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
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
  color: var(--text);
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
}

.custom-select option {
  background: var(--surface-card);
  color: var(--text);
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
  background: rgba(232, 199, 125, 0.05);
  border: 1px dashed rgba(232, 199, 125, 0.3);
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
