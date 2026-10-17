<template>
  <section class="card report" aria-labelledby="report-title">
    <header class="card-head">
      <div class="head-info">
        <div class="title-with-badge">
          <h2 id="report-title" class="card-title">{{ t('analysisReport.title') }}</h2>
          <span class="report-badge">{{ t('analysisReport.deep') }}</span>
        </div>
        <p class="card-sub">{{ t('analysisReport.desc') }}</p>
      </div>

      <div class="head-actions">
        <ul v-if="state === 'done'" class="meta">
          <li v-if="signalChip" class="chip chip-signal" :class="signalTone">{{ signalChip }}</li>
          <li class="chip chip-gold">{{ modelLabel }}</li>
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
          <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--down)">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{{ copied ? t('analysisReport.copied') : t('analysisReport.copy') }}</span>
        </button>
      </div>
    </header>

    <div v-if="state === 'loading'" class="skeleton-block" :aria-label="t('analysisReport.busy')">
      <div class="loading-animation">
        <div class="loading-wave">
          <span></span><span></span><span></span><span></span>
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
      <div class="error-icon">⚠️</div>
      <div class="error-body">
        <p class="error-title">{{ t('analysisReport.errorTitle') }}</p>
        <p class="error-desc">{{ error || t('analysisReport.errorHint') }}</p>
      </div>
    </div>

    <div v-else-if="state === 'done'" class="report-content">
      <div class="md" :class="{ clamped: isLong && !expanded }" v-html="html"></div>
      <button v-if="isLong" type="button" class="btn btn-ghost btn-sm expand-btn" @click="expanded = !expanded">
        <span>{{ expanded ? t('analysisReport.collapse') : t('analysisReport.expand') }}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" :style="{ transform: expanded ? 'rotate(180deg)' : 'none' }">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from '../i18n';
const { t, tLabel } = useI18n();
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
  scroll-margin-top: 80px;
  background: var(--surface-card);
  border: 1px solid rgba(232, 199, 125, 0.22);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title {
  font-family: var(--font-display), var(--font);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}

.report-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--gold);
  color: var(--gold-ink);
}

.card-sub {
  margin-top: 4px;
  font-size: 12.5px;
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

.chip-signal.tone-up { color: var(--up); border-color: rgba(239, 68, 68, 0.3); }
.chip-signal.tone-down { color: var(--down); border-color: rgba(16, 185, 129, 0.3); }

.chip-muted {
  color: var(--text-3);
}

.copy-btn {
  height: 32px;
  padding: 0 10px;
  gap: 6px;
  font-size: 12px;
}

/* 载入状态波形动画 */
.skeleton-block {
  display: grid;
  gap: 12px;
  padding: 10px 0;
}

.loading-animation {
  padding: 24px;
  border-radius: 12px;
  background: rgba(232, 199, 125, 0.04);
  border: 1px dashed rgba(232, 199, 125, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  margin-bottom: 12px;
}

.loading-wave {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 24px;
}

.loading-wave span {
  width: 4px;
  height: 100%;
  border-radius: 2px;
  background: var(--gold);
  animation: wave 1.2s ease-in-out infinite;
}

.loading-wave span:nth-child(1) { animation-delay: 0.1s; }
.loading-wave span:nth-child(2) { animation-delay: 0.2s; }
.loading-wave span:nth-child(3) { animation-delay: 0.3s; }
.loading-wave span:nth-child(4) { animation-delay: 0.4s; }

@keyframes wave {
  0%, 100% { height: 6px; }
  50% { height: 24px; }
}

.loading-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--gold);
}

.loading-sub {
  font-size: 12px;
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

.report-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: var(--radius);
  background: var(--danger-bg);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: var(--danger);
}

.error-icon {
  font-size: 24px;
}

.error-title {
  font-weight: 700;
  font-size: 14px;
}

.error-desc {
  font-size: 12.5px;
  opacity: 0.85;
}

.expand-btn {
  margin-top: 16px;
  width: 100%;
}

.md.clamped {
  max-height: 500px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, #000 70%, transparent);
  mask-image: linear-gradient(to bottom, #000 70%, transparent);
}
</style>
