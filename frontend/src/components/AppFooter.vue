<template>
  <footer ref="footerRef" class="app-footer">
    <div class="container">
      <!-- 页脚顶部：金色细线分隔 -->
      <GoldRule class="footer-rule" />

      <!-- 系统运行状态：桌面三列；手机端为一行可横滑的元信息 -->
      <div class="terminal-status-bar">
        <div class="status-col left">
          <div class="status-indicator">
            <span class="live-pulse-dot" aria-hidden="true"></span>
            <span class="indicator-title">{{ t('appFooter.online') }}</span>
            <span class="indicator-sub">HTTP/2 · TLS 1.3</span>
          </div>
          <div class="status-metric">
            <span class="metric-label">{{ t('appFooter.gateway') }}</span>
            <span class="metric-val">{{ latency || 52 }}ms</span>
          </div>
          <div class="status-metric">
            <span class="metric-label">{{ t('appFooter.edge') }}</span>
            <span class="metric-val">Cloudflare Global Edge</span>
          </div>
        </div>

        <div class="status-col center">
          <div class="engine-badge">{{ t('appFooter.engine') }}</div>
        </div>

        <div class="status-col right">
          <div class="status-metric">
            <span class="metric-label">{{ t('appFooter.persistence') }}</span>
            <span class="metric-val">{{ t('appFooter.kvSync') }}</span>
          </div>
          <div class="status-metric">
            <span class="metric-label">{{ t('appFooter.version') }}</span>
            <span class="metric-val gold">v3.5.0</span>
          </div>
        </div>
      </div>

      <!-- 身份卡：字标、外链与联系方式；免责声明与信源放在下方 -->
      <div class="footer-main-card">
        <div class="footer-brand-section">
          <div class="footer-logo">
            <GoldSeal :size="40" />
            <div class="brand-copy">
              <div class="brand-name">{{ t('appFooter.brand') }}</div>
              <div class="brand-tagline">{{ t('appFooter.tagline') }}</div>
            </div>
          </div>

          <div class="dev-pills">
            <a
              href="https://github.com/1837620622/Gold-Price-Quantitative-Monitoring-System"
              target="_blank"
              rel="noopener noreferrer"
              class="dev-pill"
            >
              <span>{{ t('appFooter.repo') }}</span>
              <Icon name="arrow-up-right" :size="14" />
            </a>

            <a
              href="https://www.chuankangkk.top"
              target="_blank"
              rel="noopener noreferrer"
              class="dev-pill"
            >
              <span>{{ t('appFooter.site') }}</span>
              <Icon name="arrow-up-right" :size="14" />
            </a>

            <!-- 联系方式：桌面端保留两枚静态徽章，手机端折成一行文字 -->
            <div class="contacts">
              <span class="dev-pill static">
                <span>{{ t('appFooter.wechat') }}</span>
              </span>
              <span class="dev-pill static">
                <span>{{ t('appFooter.bilibili') }}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="footer-notes">
          <p class="disclaimer">
            <b>{{ t('appFooter.disclaimerTitle') }}</b>{{ t('appFooter.disclaimerBody') }}
          </p>
          <div class="sources-list">
            <span>{{ t('appFooter.sources') }}</span>
          </div>
          <div class="copyright-row">
            <span>© 2026 GOLD MONITOR. All rights reserved. Designed for quantitative research.</span>
            <span>Developed by 传康KK</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 浮动返回顶部按钮：滚过第一屏、页脚尚未进入视口时才出现 -->
    <Transition name="btt">
      <button
        v-if="showBackTop"
        type="button"
        class="back-to-top-btn"
        :title="t('appFooter.backTop')"
        :aria-label="t('appFooter.backTop')"
        @click="scrollToTop"
      >
        <Icon name="chevron-up" :size="18" />
      </button>
    </Transition>
  </footer>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import GoldSeal from './brand/GoldSeal.vue';
import GoldRule from './brand/GoldRule.vue';
import Icon from './icons/Icon.vue';
import { useI18n } from '../i18n';

const { t } = useI18n();

defineProps({
  latency: { type: Number, default: 52 },
});

const footerRef = ref(null);
const showBackTop = ref(false);
let frame = 0;

// 滚过第一屏，且页脚还没进入视口时才显示，避免浮钮压住页脚文字
function updateBackTop() {
  frame = 0;
  const footerTop = footerRef.value ? footerRef.value.getBoundingClientRect().top : Infinity;
  const next = window.scrollY > window.innerHeight && footerTop > window.innerHeight;
  if (next !== showBackTop.value) showBackTop.value = next;
}

// 滚动与缩放合并到下一帧计算一次
function onScroll() {
  if (!frame) frame = requestAnimationFrame(updateBackTop);
}

function scrollToTop() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateBackTop();
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onScroll);
  if (frame) cancelAnimationFrame(frame);
});
</script>

<style scoped>
.app-footer {
  position: relative;
  margin-top: 56px;
  padding: 0 0 48px;
  background: var(--surface-card);
}

/* 页脚顶部的金色细线分隔（GoldRule） */
.footer-rule {
  margin-bottom: 16px;
}

/* ---------- 系统运行状态条：等宽元信息，桌面三列 ---------- */
.terminal-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 20px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.4;
}

.status-col {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

/* 实时点：保留一个缓慢呼吸的绿点，只做透明度 */
.live-pulse-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--down);
  animation: live-breathe 3.2s ease-in-out infinite;
}

@keyframes live-breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.indicator-title {
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
}

.indicator-sub {
  color: var(--text-2);
  white-space: nowrap;
}

.status-metric {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}

.metric-label {
  flex: none;
  color: var(--text-2);
  white-space: nowrap;
}

.metric-val {
  color: var(--text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.metric-val.gold {
  color: var(--gold-2);
  font-weight: 500;
}

/* 英文标签：11px 大写，字距 .14em；中文标签 12px，不大写、不加字距 */
:lang(en) .metric-label,
:lang(en) .indicator-sub {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* 模型标签：发丝边框的小芯片，不发光 */
.engine-badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  color: var(--text-2);
  white-space: nowrap;
}

/* ---------- 身份卡：发丝边、纯色底，无阴影 ---------- */
.footer-main-card {
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
}

.footer-brand-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 22px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.brand-copy {
  min-width: 0;
}

.brand-name {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--text);
  word-break: keep-all;
}

.brand-tagline {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
  word-break: keep-all;
}

:lang(zh) .brand-tagline {
  line-height: 1.75;
}

.dev-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 桌面端让联系方式的两枚徽章直接参与外层的 flex 排列 */
.contacts {
  display: contents;
}

.dev-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  background: transparent;
  color: var(--text-2);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.dev-pill.static {
  cursor: default;
  border-color: var(--line);
}

/* 悬停只改描边与颜色 */
@media (hover: hover) and (pointer: fine) {
  .dev-pill:hover:not(.static) {
    border-color: var(--gold);
    color: var(--gold-3);
  }
}

/* ---------- 免责声明、信源与版权 ---------- */
.footer-notes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-2);
}

:lang(zh) .footer-notes {
  line-height: 1.75;
}

.disclaimer b {
  color: var(--gold-2);
  font-weight: 600;
}

.sources-list {
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.6;
}

.copyright-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  font-size: 12px;
}

/* 返回顶部：44px 方钮，发丝边、无阴影；右下角并避开安全区；只在滚过第一屏后出现 */
.back-to-top-btn {
  --btt-inset: 28px;
  position: fixed;
  right: calc(var(--btt-inset) + env(safe-area-inset-right, 0px));
  bottom: calc(var(--btt-inset) + env(safe-area-inset-bottom, 0px));
  z-index: 50;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  background: var(--surface-card);
  color: var(--gold);
  cursor: pointer;
}

/* 悬停：纯色金底，文字用 gold-ink */
@media (hover: hover) and (pointer: fine) {
  .back-to-top-btn:hover {
    background: var(--gold);
    border-color: var(--gold);
    color: var(--gold-ink);
  }
}

.btt-enter-active,
.btt-leave-active {
  transition: opacity 0.24s ease, transform 0.24s var(--ease-out);
}

.btt-enter-from,
.btt-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .btt-enter-from,
  .btt-leave-to {
    transform: none;
  }
}

@media (max-width: 767px) {
  .back-to-top-btn {
    --btt-inset: 16px;
  }

  .app-footer {
    margin-top: 40px;
    padding: 0 0 calc(14px + env(safe-area-inset-bottom, 0px));
  }

  /* 状态条：一行可横滑的元信息，所有条目保留 */
  .terminal-status-bar {
    flex-wrap: nowrap;
    justify-content: flex-start;
    gap: 0;
    margin-bottom: 14px;
    padding-bottom: 2px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .terminal-status-bar::-webkit-scrollbar {
    display: none;
  }

  .status-col {
    flex: none;
    flex-wrap: nowrap;
    gap: 14px;
  }

  .status-col + .status-col {
    margin-left: 14px;
  }

  .footer-main-card {
    padding: 16px;
  }

  .footer-brand-section {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding-bottom: 14px;
    margin-bottom: 14px;
  }

  .dev-pills {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .dev-pills > .dev-pill:not(.static) {
    justify-content: center;
    height: 44px;
    padding: 0 10px;
  }

  .contacts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    grid-column: 1 / -1;
  }

  .contacts .dev-pill.static {
    padding: 0;
    border: 0;
    background: none;
    font-size: 13px;
    color: var(--text-2);
  }

  .footer-notes {
    gap: 10px;
    font-size: 13px;
  }

  .sources-list {
    padding: 8px 10px;
  }

  .copyright-row {
    padding-top: 10px;
  }
}
</style>
