<template>
  <section class="card ai-card" aria-labelledby="ai-title">
    <!-- 头部：标题与副标题 -->
    <header class="ai-head">
      <div class="ai-title-wrap">
        <h2 id="ai-title" class="ai-title">{{ t('aiCard.title') }}</h2>
        <span class="ai-subtitle">{{ t('aiCard.sub') }}</span>
      </div>
    </header>

    <!-- 可选模型下拉选择器（按上游厂商分组与新建栏目） -->
    <div class="model-select-group">
      <div class="select-header">
        <label class="select-label" for="model-selector">{{ t('aiCard.modelLabel') }}</label>
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
        <Icon name="chevron-up" :size="14" class="select-arrow" />
      </div>
      <div class="model-feature-tag">
        <span class="tag-desc">{{ currentModelDesc }}</span>
      </div>
    </div>

    <!-- 分析中状态：三个加载点 -->
    <div v-if="state === 'loading'" class="ai-analyzing-box">
      <div class="analyzing-dots" aria-hidden="true">
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
      <span>{{ buttonText }}</span>
    </button>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Icon from './icons/Icon.vue';
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
  box-shadow: none;
}

.ai-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-title-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ai-title {
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

:lang(zh) .ai-title {
  letter-spacing: 0;
}

.ai-subtitle {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-3);
}

/* 模型选择：发丝边容器，控件为方角 */
.model-select-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-2);
  transition: border-color 0.2s var(--ease-out);
}

.model-select-group:focus-within {
  border-color: var(--gold);
}

.select-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 8px;
}

.select-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
}

:lang(zh) .select-label {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.upstream-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text-2);
  white-space: nowrap;
}

/* 上游状态点：静态小圆点，不发光 */
.upstream-dot {
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
  padding: 0 34px 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--surface-card);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  transition: border-color 0.2s var(--ease-out), background-color 0.2s var(--ease-out);
}

.custom-select:focus {
  border-color: var(--gold);
}

.custom-select option {
  background: var(--surface-card);
  color: var(--text);
  padding: 8px;
}

/* 下拉箭头：复用向上的 chevron，旋转后朝下 */
.select-arrow {
  position: absolute;
  top: 50%;
  right: 12px;
  color: var(--text-2);
  pointer-events: none;
  transform: translateY(-50%) rotate(180deg);
}

.model-feature-tag {
  margin-top: 2px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
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
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

:lang(zh) .ai-desc {
  line-height: 1.75;
}

.ai-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ai-tags .tag {
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--text-2);
  white-space: nowrap;
}

/* 分析中：发丝边方框 + 三个加载点 */
.ai-analyzing-box {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
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
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold);
  animation: dot-fade 1.2s ease-in-out infinite both;
}

.analyzing-dots span:nth-child(1) { animation-delay: -0.24s; }
.analyzing-dots span:nth-child(2) { animation-delay: -0.12s; }

@keyframes dot-fade {
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
}

.analyzing-text {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}

.analyzing-sub {
  font-size: 13px;
  color: var(--text-3);
}

/* 主按钮：纯色金底，无渐变，无装饰字符 */
.ai-submit-btn {
  width: 100%;
  height: 44px;
  margin-top: auto;
  padding: 0 18px;
  border-color: var(--gold-btn);
  background: var(--gold-btn);
  color: var(--gold-ink);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

:lang(zh) .ai-submit-btn {
  letter-spacing: 0;
}

.ai-submit-btn .spinner {
  border-color: color-mix(in srgb, var(--gold-ink) 25%, transparent);
  border-top-color: var(--gold-ink);
}

@media (hover: hover) and (pointer: fine) {
  .ai-submit-btn:hover:not(:disabled) {
    background: var(--gold-btn-hover);
    border-color: var(--gold-btn-hover);
  }
}

/* ---------- 手机端 ---------- */
@media (max-width: 767px) {
  .ai-card {
    gap: 12px;
  }

  .ai-title {
    font-size: 18px;
  }

  .custom-select {
    height: 44px;
    padding: 0 36px 0 14px;
    font-size: 16px;
  }

  .select-arrow {
    right: 14px;
  }

  .ai-tags .tag {
    white-space: nowrap;
  }

  .analyzing-text {
    font-size: 15px;
  }

  .ai-submit-btn {
    height: 44px;
  }
}

/* 减少动效：加载点保持静止可见 */
@media (prefers-reduced-motion: reduce) {
  .analyzing-dots span {
    animation: none;
    opacity: 0.6;
  }
}
</style>
