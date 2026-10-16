<template>
  <header class="app-header">
    <div class="container header-inner">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">Au</span>
        <div class="brand-text">
          <strong>Gold Monitor</strong>
          <span class="brand-sub">黄金价格监控</span>
        </div>
      </div>

      <div class="status" :class="`status-${status}`" role="status" aria-live="polite">
        <span class="dot" aria-hidden="true"></span>
        <span class="status-label">{{ label }}</span>
        <span class="status-clock">{{ clock }}</span>
        <span v-if="ageText" class="status-age">{{ ageText }}</span>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="icon-btn"
          :aria-label="themeLabel"
          :title="themeLabel"
          @click="$emit('toggle-theme')"
        >
          <svg v-if="theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>

        <button
          type="button"
          class="icon-btn"
          :class="{ spinning: status === 'loading' }"
          aria-label="刷新行情"
          title="刷新行情"
          @click="$emit('refresh')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.6-6.4" />
            <path d="M21 4v5h-5" />
          </svg>
        </button>

        <button type="button" class="btn btn-primary btn-sm subscribe" @click="$emit('subscribe')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <span>订阅推送</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { fmtClock, fmtAgo } from '../format';

const props = defineProps({
  status: { type: String, default: 'loading' },
  theme: { type: String, default: 'dark' },
  ageSeconds: { type: Number, default: null },
  now: { type: Number, default: () => Date.now() },
});

defineEmits(['refresh', 'subscribe', 'toggle-theme']);

const LABELS = {
  loading: '连接中',
  live: '实时',
  partial: '部分数据',
  stale: '数据延迟',
  error: '暂不可用',
};

const label = computed(() => LABELS[props.status] ?? '未知');
const clock = computed(() => fmtClock(props.now));
const ageText = computed(() => fmtAgo(props.ageSeconds));
const themeLabel = computed(() => (props.theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'));
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 64px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 14px;
  color: var(--gold-ink);
  background: linear-gradient(135deg, var(--gold-2), var(--gold));
  box-shadow: 0 6px 16px -8px var(--gold);
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  min-width: 0;
}

.brand-text strong {
  font-size: 15px;
  letter-spacing: 0.01em;
}

.brand-sub {
  font-size: 12px;
  color: var(--text-3);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  color: var(--text-2);
  background: var(--surface);
  border: 1px solid var(--border);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--flat);
}

.status-live .dot { background: var(--down); box-shadow: 0 0 0 0 var(--down); animation: pulse 2s infinite; }
.status-loading .dot { background: var(--info); }
.status-partial .dot,
.status-stale .dot { background: var(--warn); }
.status-error .dot { background: var(--danger); }

.status-label {
  font-weight: 600;
  color: var(--text);
}

.status-clock,
.status-age {
  color: var(--text-3);
}

.status-clock::before {
  content: '·';
  margin-right: 8px;
}

.status-age::before {
  content: '·';
  margin-right: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subscribe span {
  white-space: nowrap;
}

.spinning svg {
  animation: spin 0.9s linear infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--down) 55%, transparent); }
  70% { box-shadow: 0 0 0 6px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 767px) {
  .header-inner {
    height: auto;
    padding-top: 12px;
    padding-bottom: 12px;
    flex-wrap: wrap;
  }

  .brand-sub,
  .status-clock,
  .status-age::before,
  .status-clock::before {
    display: none;
  }

  .status {
    order: 3;
    width: 100%;
    justify-content: center;
  }

  .header-actions {
    margin-left: auto;
  }
}

@media (max-width: 480px) {
  .subscribe span {
    display: none;
  }
}
</style>
