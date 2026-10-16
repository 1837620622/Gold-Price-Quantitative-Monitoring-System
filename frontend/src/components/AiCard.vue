<template>
  <section class="card ai-card" aria-labelledby="ai-title">
    <header class="ai-head">
      <span class="ai-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v3M5.6 6.6l2.1 2.1M18.4 6.6l-2.1 2.1M3 13h3M18 13h3" />
          <rect x="6" y="9" width="12" height="11" rx="3" />
          <circle cx="10" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="14" cy="14" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <div>
        <h2 id="ai-title" class="card-title">AI 量化分析</h2>
        <p class="card-sub">DeepSeek-V3.2 · 基于实时行情与日K线</p>
      </div>
    </header>

    <p class="ai-status" :class="`status-${state}`" aria-live="polite">{{ statusText }}</p>

    <ul class="ai-points" aria-label="报告包含的内容">
      <li>趋势判断</li>
      <li>支撑与压力</li>
      <li>操作建议</li>
      <li>风险提示</li>
    </ul>

    <button
      type="button"
      class="btn btn-primary ai-btn"
      :disabled="state === 'loading' || unavailable"
      @click="$emit('run')"
    >
      <span v-if="state === 'loading'" class="spinner spinner-ink" aria-hidden="true"></span>
      {{ buttonText }}
    </button>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  state: { type: String, default: 'idle' }, // idle | loading | done | error
  timestamp: { type: String, default: '' },
  cached: { type: Boolean, default: false },
  error: { type: String, default: '' },
  unavailable: { type: Boolean, default: false },
});

defineEmits(['run']);

const statusText = computed(() => {
  if (props.unavailable && props.state !== 'loading') return '行情暂不可用，暂时无法生成分析';
  switch (props.state) {
    case 'loading':
      return '正在分析，通常需要 1–2 分钟…';
    case 'done':
      return props.cached ? '已展示 15 分钟内的缓存结果' : '分析已生成，可随时重新分析';
    case 'error':
      return props.error || '分析失败，请稍后重试';
    default:
      return '生成当前行情的量化分析报告（结果缓存 15 分钟）';
  }
});

const buttonText = computed(() => {
  if (props.state === 'loading') return '分析中…';
  return props.state === 'done' ? '重新分析' : '生成分析';
});
</script>

<style scoped>
.ai-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--gold);
  background: color-mix(in srgb, var(--gold) 14%, transparent);
  flex-shrink: 0;
}

.card-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.card-sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.ai-status {
  margin: 0;
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.6;
}

.ai-status.status-error {
  color: var(--danger);
}

.ai-points {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ai-points li {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.ai-btn {
  margin-top: auto;
  width: 100%;
}

.spinner-ink {
  border-color: rgba(26, 19, 5, 0.25);
  border-top-color: #1a1305;
}
</style>
