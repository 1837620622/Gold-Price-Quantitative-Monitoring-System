<template>
  <Teleport to="body">
    <div v-if="open" class="drawer-backdrop" @click.self="$emit('close')">
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header class="drawer-head">
          <h2 id="drawer-title">{{ t('sourcesDrawer.title') }}</h2>
          <button ref="closeBtn" type="button" class="icon-btn" :aria-label="t('sourcesDrawer.close')" @click="$emit('close')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <section class="block">
          <h3>{{ t('sourcesDrawer.checks') }}</h3>
          <ul class="checks">
            <li v-for="c in checks" :key="c.name" class="check" :class="`st-${c.status}`">
              <span class="pill">{{ checkLabel(c.status) }}</span>
              <div>
                <b>{{ tLabel(c.name) }}</b>
                <p>{{ tLabel(c.detail) }}</p>
              </div>
            </li>
            <li v-if="!checks.length" class="empty">{{ t('sourcesDrawer.noChecks') }}</li>
          </ul>
        </section>

        <section class="block">
          <h3>{{ t('sourcesDrawer.sources') }}</h3>
          <ul class="sources">
            <li v-for="s in sources" :key="s.name" class="source">
              <div class="source-head">
                <b>{{ s.name }}</b>
                <span class="pill" :class="`st-${s.status}`">{{ statusLabel(s.status) }}</span>
              </div>
              <p class="roles">{{ s.roles.map((r) => tLabel(r)).join(' · ') }}</p>
              <p class="meta">
                {{ t('sourcesDrawer.stats', { latency: s.latencyMs ?? '--', ok: s.okCount, err: s.errCount }) }}
                <template v-if="s.lastOkAt"> {{ t('sourcesDrawer.lastOk', { time: fmtDateTime(s.lastOkAt) }) }}</template>
              </p>
              <p v-if="s.lastError" class="error">{{ t('sourcesDrawer.lastError', { error: s.lastError }) }}</p>
            </li>
            <li v-if="!sources.length" class="empty">{{ t('sourcesDrawer.noSources') }}</li>
          </ul>
          <p class="hint">{{ t('sourcesDrawer.uncalledHint') }}</p>
        </section>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue';
import { fmtDateTime } from '../format';
import { useI18n } from '../i18n';

const { t, tLabel } = useI18n();

const props = defineProps({
  open: { type: Boolean, default: false },
  sources: { type: Array, default: () => [] },
  checks: { type: Array, default: () => [] },
});
const emit = defineEmits(['close']);

const closeBtn = ref(null);

const STATUS = { ok: 'sourcesDrawer.statusOk', error: 'sourcesDrawer.statusError', idle: 'sourcesDrawer.statusIdle' };
const CHECK = { ok: 'sourcesDrawer.checkOk', warn: 'sourcesDrawer.checkWarn', info: 'sourcesDrawer.checkInfo', single: 'sourcesDrawer.checkSingle' };
const statusLabel = (s) => (STATUS[s] ? t(STATUS[s]) : s);
const checkLabel = (s) => (CHECK[s] ? t(CHECK[s]) : s);

function onKeydown(event) {
  if (event.key === 'Escape') emit('close');
}

function lockScroll(locked) {
  document.body.style.overflow = locked ? 'hidden' : '';
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown);
      lockScroll(true);
      await nextTick();
      closeBtn.value?.focus();
    } else {
      document.removeEventListener('keydown', onKeydown);
      lockScroll(false);
    }
  }
);

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  lockScroll(false);
});
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  justify-content: flex-end;
  background: rgba(5, 6, 9, 0.5);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  animation: fade-in 0.2s ease-out;
}

.drawer {
  width: min(460px, 100%);
  height: 100%;
  overflow-y: auto;
  padding: 22px 22px 32px;
  background: var(--surface);
  border-left: 1px solid var(--border-strong);
  box-shadow: -30px 0 60px -30px rgba(0, 0, 0, 0.5);
  animation: slide-in 0.25s ease-out;
}

.drawer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.drawer-head h2 {
  margin: 0;
  font-size: 18px;
}

.block {
  margin-top: 22px;
}

.block h3 {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-3);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.checks,
.sources {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.check,
.source {
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 13px;
}

.check {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.check b,
.source b {
  font-size: 14px;
}

.check p {
  margin: 4px 0 0;
  color: var(--text-2);
  line-height: 1.5;
}

.source-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.roles {
  margin: 4px 0 0;
  color: var(--text-2);
}

.meta {
  margin: 6px 0 0;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}

.error {
  margin: 6px 0 0;
  color: var(--danger);
  font-size: 12px;
  word-break: break-all;
}

.pill {
  display: inline-block;
  flex-shrink: 0;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-2);
  background: var(--border);
}

.pill.st-ok,
.check.st-ok .pill {
  color: var(--down);
  background: color-mix(in srgb, var(--down) 14%, transparent);
}

.pill.st-error,
.check.st-warn .pill {
  color: var(--warn);
  background: var(--warn-bg);
}

.pill.st-error {
  color: var(--danger);
  background: var(--danger-bg);
}

.empty,
.hint {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;
}

.hint {
  margin: 12px 0 0;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in {
  from { transform: translateX(24px); opacity: 0; }
  to { transform: none; opacity: 1; }
}
</style>
