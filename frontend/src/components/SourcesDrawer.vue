<template>
  <Teleport to="body">
    <div v-if="open" class="drawer-backdrop" @click.self="$emit('close')">
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header class="drawer-head">
          <h2 id="drawer-title">{{ t('sourcesDrawer.title') }}</h2>
          <button ref="closeBtn" type="button" class="icon-btn" :aria-label="t('sourcesDrawer.close')" @click="$emit('close')">
            <Icon name="close" :size="18" />
          </button>
        </header>

        <section class="block">
          <h3>{{ t('sourcesDrawer.checks') }}</h3>
          <ul class="checks">
            <li v-for="c in checks" :key="c.name" class="check" :class="`st-${c.status}`">
              <span class="status-tag">{{ checkLabel(c.status) }}</span>
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
                <span class="status-tag" :class="`st-${s.status}`">{{ statusLabel(s.status) }}</span>
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
import Icon from './icons/Icon.vue';

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

// 视口由 html 决定滚动（style.css 给 html 设了 overflow-x，body 上的设置不会传到视口），两处都锁
function lockScroll(locked) {
  const value = locked ? 'hidden' : '';
  document.documentElement.style.overflow = value;
  document.body.style.overflow = value;
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
  animation: fade-in 0.2s ease-out;
}

/* 抽屉：纯色面板、发丝边，阴影使用弹层令牌 */
.drawer {
  width: min(460px, 100%);
  height: 100%;
  overflow-y: auto;
  padding: 22px 22px 32px;
  background: var(--surface-card);
  border-left: 1px solid var(--line-strong);
  box-shadow: var(--shadow-modal);
  animation: slide-in 0.24s ease-out;
}

.drawer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.drawer-head h2 {
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

:lang(zh) .drawer-head h2 {
  letter-spacing: 0;
}

.block {
  margin-top: 22px;
}

/* 分组标题：标签样式（英文小字大写加字距，中文 12px 不大写） */
.block h3 {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
}

:lang(zh) .block h3 {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
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
  border: 1px solid var(--line);
  font-size: 13px;
}

.check {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.check b,
.source b {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}

.check p {
  margin: 4px 0 0;
  color: var(--text-2);
  line-height: 1.6;
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

/* 数字与元信息用等宽体；中文界面改用界面字体 */
.meta {
  margin: 6px 0 0;
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

:lang(zh) .meta {
  font-family: var(--font);
  font-size: 13px;
  line-height: 1.75;
}

.error {
  margin: 6px 0 0;
  color: var(--danger);
  font-size: 13px;
  overflow-wrap: break-word;
}

/* 状态标签：发丝边框、无底色，颜色只落在文字上 */
.status-tag {
  display: inline-block;
  flex-shrink: 0;
  padding: 2px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  background: transparent;
  font-family: var(--font);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--text-2);
  white-space: nowrap;
}

.status-tag.st-ok,
.check.st-ok .status-tag {
  color: var(--down);
}

.status-tag.st-error,
.check.st-warn .status-tag {
  color: var(--warn);
}

.status-tag.st-error {
  color: var(--danger);
}

:lang(zh) .status-tag {
  font-size: 12px;
}

.empty,
.hint {
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.6;
}

.hint {
  margin: 12px 0 0;
  color: var(--text-2);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in {
  from { transform: translateX(12px); opacity: 0; }
  to { transform: none; opacity: 1; }
}

/* ---------- 手机端：底部弹出的全宽面板，内容在面板内滚动 ---------- */
@media (max-width: 767px) {
  .drawer-backdrop {
    align-items: flex-end;
    justify-content: center;
  }

  .drawer {
    width: 100%;
    height: auto;
    max-height: 88vh;
    max-height: 88dvh;
    padding: 18px 16px calc(24px + env(safe-area-inset-bottom));
    border-left: 0;
    border-top: 1px solid var(--line-strong);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    overscroll-behavior: contain;
    animation: sheet-in 0.24s ease-out;
  }

  .drawer-head .icon-btn {
    width: 44px;
    height: 44px;
  }

  .drawer-head h2 {
    font-size: 18px;
  }

  .check,
  .source {
    padding: 12px;
  }
}

@keyframes sheet-in {
  from { transform: translateY(12px); opacity: 0; }
  to { transform: none; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .drawer-backdrop,
  .drawer {
    animation: none;
  }
}
</style>
