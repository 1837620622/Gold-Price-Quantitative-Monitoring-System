<template>
  <section class="card report" aria-labelledby="report-title">
    <header class="card-head">
      <div class="head-info">
        <div class="title-with-badge">
          <h2 id="report-title" class="card-title">{{ t('analysisReport.title') }}</h2>
        </div>
        <p class="card-sub">{{ t('analysisReport.desc') }}</p>
      </div>

      <div class="head-actions">
        <ul v-if="state === 'done'" class="meta">
          <li v-if="signalChip" class="chip chip-signal" :class="signalTone">{{ signalChip }}</li>
          <li class="chip">{{ modelLabel }}</li>
          <li v-if="cached" class="chip chip-muted">{{ t('analysisReport.cached') }}</li>
          <li v-if="timeText" class="chip chip-muted">{{ timeText }}</li>
        </ul>

        <button
          v-if="state === 'done'"
          type="button"
          class="pill copy-pill"
          :class="{ copied }"
          @click="copyReport"
        >
          <Icon v-if="copied" name="check" :size="14" />
          <span>{{ copied ? t('analysisReport.copied') : t('analysisReport.copy') }}</span>
        </button>
      </div>
    </header>

    <div v-if="state === 'loading'" class="skeleton-block" :aria-label="t('analysisReport.busy')">
      <div class="loading-animation">
        <div class="loading-dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <p class="loading-title">{{ t('analysisReport.loading1') }}</p>
        <span class="loading-sub">{{ t('analysisReport.loading2') }}</span>
      </div>
      <span class="skeleton skeleton-title"></span>
      <span class="skeleton skeleton-line"></span>
      <span class="skeleton skeleton-line short"></span>
      <span class="skeleton skeleton-line"></span>
      <span class="skeleton skeleton-line short"></span>
    </div>

    <div v-else-if="state === 'error'" class="report-error" role="alert">
      <Icon name="alert" :size="20" class="error-icon" />
      <div class="error-body">
        <p class="error-title">{{ t('analysisReport.errorTitle') }}</p>
        <p class="error-desc">{{ error || t('analysisReport.errorHint') }}</p>
      </div>
    </div>

    <div v-else-if="state === 'done'" class="report-content">
      <div class="md" :class="{ clamped: isLong && !expanded }" v-html="html"></div>
      <button v-if="isLong" type="button" class="btn btn-ghost btn-sm expand-btn" @click="expanded = !expanded">
        <span>{{ expanded ? t('analysisReport.collapse') : t('analysisReport.expand') }}</span>
        <Icon name="chevron-up" :size="14" class="expand-icon" :class="{ 'is-collapsed': !expanded }" />
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import Icon from './icons/Icon.vue';
import { renderMarkdown } from '../lib/markdown';
import { fmtDateTime } from '../format';
import { useI18n } from '../i18n';

const { t, tLabel } = useI18n();

const props = defineProps({
  state: { type: String, default: 'idle' },
  text: { type: String, default: '' },
  model: { type: String, default: '' },
  timestamp: { type: String, default: '' },
  cached: { type: Boolean, default: false },
  error: { type: String, default: '' },
  quant: { type: Object, default: null },
});

const expanded = ref(true);
const LONG_TEXT = 3500;
const copied = ref(false);

const html = computed(() => renderMarkdown(props.text));
const isLong = computed(() => props.text.length > LONG_TEXT);
const timeText = computed(() => fmtDateTime(props.timestamp));

const MODEL_LABELS = { 'auto-analysis': t('analysisReport.ruleSummary') };
const modelLabel = computed(() => MODEL_LABELS[props.model] ?? props.model ?? 'Workers AI');

const signalChip = computed(() => {
  const s = props.quant?.signal;
  if (!s?.available) return '';
  return `${t('analysisReport.score')} ${tLabel(s.label)} (${s.score >= 0 ? '+' : ''}${s.score})`;
});
const signalTone = computed(() => (props.quant?.signal?.score >= 0 ? 'tone-up' : 'tone-down'));

function copyReport() {
  if (!props.text) return;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(props.text).then(() => {
      copied.value = true;
      setTimeout(() => { copied.value = false; }, 2500);
    });
  }
}
</script>

<style scoped>
.report {
  scroll-margin-top: calc(var(--nav-h) + var(--ticker-h) + 16px);
  box-shadow: none;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 20px;
}

.title-with-badge {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.card-title {
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

:lang(zh) .card-title {
  letter-spacing: 0;
}

/* 标题旁的标签：发丝边、无底色 */
.report-badge {
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  color: var(--text-2);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  line-height: 1.5;
  text-transform: uppercase;
  white-space: nowrap;
}

:lang(zh) .report-badge {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.card-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* 信号标签：涨跌色只作用于文字 */
.chip-signal.tone-up {
  color: var(--up);
}

.chip-signal.tone-down {
  color: var(--down);
}

.chip-muted {
  color: var(--text-3);
}

/* 复制按钮：发丝边方角，复制成功后金色描边 */
.copy-pill {
  height: 36px;
  padding: 0 12px;
  gap: 6px;
  border-color: var(--line-strong);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.copy-pill.copied {
  border-color: var(--gold);
  color: var(--gold-3);
}

/* 载入：三个加载点，无循环波形 */
.skeleton-block {
  display: grid;
  gap: 12px;
  padding: 10px 0;
}

.loading-animation {
  padding: 24px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  margin-bottom: 12px;
}

.loading-dots {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 8px;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold);
  animation: dot-fade 1.2s ease-in-out infinite both;
}

.loading-dots span:nth-child(2) { animation-delay: -0.4s; }
.loading-dots span:nth-child(3) { animation-delay: -0.8s; }

@keyframes dot-fade {
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
}

.loading-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}

.loading-sub {
  font-size: 13px;
  color: var(--text-3);
}

.skeleton-title {
  width: 35%;
  height: 22px;
}

.skeleton-line {
  width: 100%;
  height: 14px;
}

.skeleton-line.short {
  width: 60%;
}

/* 错误提示：发丝边方框，警示图标用危险色 */
.report-error {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
}

.error-icon {
  margin-top: 1px;
  color: var(--danger);
}

.error-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}

.error-desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
  overflow-wrap: break-word;
}

/* 展开/收起：发丝边，全宽 */
.expand-btn {
  width: 100%;
  height: 36px;
  margin-top: 16px;
  padding: 0 12px;
  gap: 6px;
  border-color: var(--line-strong);
  background: transparent;
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
}

.expand-icon {
  transition: transform 0.2s var(--ease-out);
}

.expand-icon.is-collapsed {
  transform: rotate(180deg);
}

/* 长文截断：直接裁切，不做渐变遮罩 */
.md.clamped {
  max-height: 500px;
  overflow: hidden;
}

/* Markdown 排版：正文 15px，标题用展示字，无侧边色条 */
.md {
  font-size: 15px;
  line-height: 1.6;
}

:lang(zh) .md {
  line-height: 1.75;
}

.md :deep(h1),
.md :deep(h2),
.md :deep(h3) {
  font-family: var(--font-display);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--text);
}

:lang(zh) .md :deep(h1),
:lang(zh) .md :deep(h2),
:lang(zh) .md :deep(h3) {
  letter-spacing: 0;
}

.md :deep(h2) {
  font-size: 20px;
  line-height: 1.3;
}

.md :deep(h3) {
  padding-left: 0;
  border-left: 0;
  font-size: 17px;
}

.md :deep(strong) {
  color: var(--text);
  font-weight: 600;
}

.md :deep(blockquote) {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-2);
}

/* ---------- 手机端 ---------- */
@media (max-width: 767px) {
  .card-title {
    font-size: 18px;
  }

  .card-head {
    margin-bottom: 14px;
    padding-bottom: 14px;
  }

  .head-actions {
    width: 100%;
  }

  .copy-pill {
    height: 44px;
    width: 100%;
    justify-content: center;
  }

  .expand-btn {
    height: 44px;
  }

  .md {
    overflow-wrap: break-word;
  }

  .md :deep(h2) {
    font-size: 18px;
  }

  .md :deep(h1),
  .md :deep(h2),
  .md :deep(h3) {
    word-break: keep-all;
    overflow-wrap: break-word;
  }

  .md :deep(table) {
    overscroll-behavior-x: contain;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-dots span {
    animation: none;
    opacity: 0.6;
  }
}
</style>
