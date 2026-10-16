<template>
  <section class="card report" aria-labelledby="report-title">
    <header class="card-head">
      <div>
        <h2 id="report-title" class="card-title">AI 智能分析报告</h2>
        <p class="card-sub">模型基于程序计算的量化结果撰写，仅供参考，不构成投资建议</p>
      </div>
      <ul v-if="state === 'done'" class="meta">
        <li v-if="signalChip" class="chip chip-signal" :class="signalTone">{{ signalChip }}</li>
        <li class="chip">{{ modelLabel }}</li>
        <li v-if="cached" class="chip">缓存结果</li>
        <li v-if="timeText" class="chip chip-muted">{{ timeText }}</li>
      </ul>
    </header>

    <div v-if="state === 'loading'" class="skeleton-block" aria-label="分析生成中">
      <span class="skeleton skeleton-title"></span>
      <span class="skeleton skeleton-line"></span>
      <span class="skeleton skeleton-line short"></span>
      <span class="skeleton skeleton-line"></span>
      <span class="skeleton skeleton-line short"></span>
      <p class="loading-hint">正在汇总行情、量化指标与回测结果，请稍候…</p>
    </div>

    <div v-else-if="state === 'error'" class="report-error" role="alert">
      {{ error || '分析失败，请稍后重试' }}
    </div>

    <div v-else-if="state === 'done'">
      <div class="md" :class="{ clamped: isLong && !expanded }" v-html="html"></div>
      <button v-if="isLong" type="button" class="btn btn-ghost btn-sm expand" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开全文' }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import { renderMarkdown } from '../lib/markdown';
import { fmtDateTime } from '../format';

const props = defineProps({
  state: { type: String, default: 'idle' },
  text: { type: String, default: '' },
  model: { type: String, default: '' },
  timestamp: { type: String, default: '' },
  cached: { type: Boolean, default: false },
  error: { type: String, default: '' },
  quant: { type: Object, default: null },
});

const expanded = ref(false);
const LONG_TEXT = 1200;

const html = computed(() => renderMarkdown(props.text));
const isLong = computed(() => props.text.length > LONG_TEXT);
const timeText = computed(() => fmtDateTime(props.timestamp));

const MODEL_LABELS = { 'auto-analysis': '规则摘要（未启用AI）' };
const modelLabel = computed(() => MODEL_LABELS[props.model] ?? props.model ?? 'AI');

const signalChip = computed(() => {
  const s = props.quant?.signal;
  if (!s?.available) return '';
  return `量化信号 ${s.label} ${s.score >= 0 ? '+' : ''}${s.score}`;
});
const signalTone = computed(() => (props.quant?.signal?.score >= 0 ? 'tone-up' : 'tone-down'));
</script>

<style scoped>
.report {
  scroll-margin-top: 80px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.card-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.card-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
}

.chip-signal.tone-up { color: var(--up); }
.chip-signal.tone-down { color: var(--down); }

.chip-muted {
  color: var(--text-3);
}

.skeleton-block {
  display: grid;
  gap: 12px;
}

.skeleton-title {
  width: 40%;
  height: 22px;
}

.skeleton-line {
  width: 100%;
  height: 14px;
}

.skeleton-line.short {
  width: 65%;
}

.loading-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.report-error {
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--danger-bg);
  color: var(--danger);
  font-size: 14px;
}

.expand {
  margin-top: 12px;
}

.md.clamped {
  max-height: 340px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent);
  mask-image: linear-gradient(to bottom, #000 60%, transparent);
}
</style>
