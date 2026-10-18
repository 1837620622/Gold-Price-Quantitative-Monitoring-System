<template>
  <footer ref="footerRef" class="app-footer">
    <div class="container">
      <!-- 机构级实时系统运行状态条 (Terminal Status Dock)：桌面三列；手机端为一行可横滑的元信息 -->
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
          <div class="engine-badge">
            <span class="engine-spark" aria-hidden="true">✦</span>
            <span class="engine-full">{{ t('appFooter.engine') }}</span>
            <span class="engine-short">{{ t('chromeMobile.engineShort') }}</span>
          </div>
        </div>

        <div class="status-col right">
          <div class="status-metric">
            <span class="metric-label">{{ t('appFooter.persistence') }}</span>
            <span class="metric-val">{{ t('appFooter.kvSync') }}</span>
          </div>
          <div class="status-metric">
            <span class="metric-label">{{ t('appFooter.version') }}</span>
            <span class="metric-val gold">v3.5.0 PRO</span>
          </div>
        </div>
      </div>

      <!-- 身份卡：品牌、外链与联系方式；免责声明与信源放在下方 -->
      <div class="footer-main-card">
        <div class="footer-brand-section">
          <div class="footer-logo">
            <span class="logo-box" aria-hidden="true">Au</span>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>{{ t('appFooter.repo') }}</span>
            </a>

            <a
              href="https://www.chuankangkk.top"
              target="_blank"
              rel="noopener noreferrer"
              class="dev-pill"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>{{ t('appFooter.site') }}</span>
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
            <span>© 2026 GOLD MONITOR. All rights reserved. Designed for Institutional Quantitative Research.</span>
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    </Transition>
  </footer>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
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
  margin-top: 56px;
  padding: 0 0 48px;
  position: relative;
  border-top: 1px solid rgba(232, 199, 125, 0.14);
  background: var(--surface-card);
}

/* 顶部金融终端系统状态微条（桌面：三列） */
.terminal-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  margin: -1px 0 24px;
  background: var(--surface-card);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0 0 12px 12px;
  font-family: var(--mono);
  font-size: 11px;
  gap: 16px;
  flex-wrap: wrap;
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
  gap: 6px;
  white-space: nowrap;
}

/* 实时点：保留一个缓慢呼吸的绿点，去掉无限扩散的光环 */
.live-pulse-dot {
  flex: none;
  width: 7px;
  height: 7px;
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
  font-weight: 700;
  white-space: nowrap;
}

.indicator-sub {
  color: var(--text-3);
  font-size: 11px;
  white-space: nowrap;
}

.status-metric {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

/* 标签与数值各自不换行，列宽由内容决定，避免“网关延迟”被挤成竖排 */
.metric-label {
  flex: none;
  color: var(--text-3);
  white-space: nowrap;
  word-break: keep-all;
}

.metric-val {
  color: var(--text-2);
  font-weight: 600;
  white-space: nowrap;
}
.metric-val.gold {
  color: var(--gold-3);
  font-weight: 800;
}

.engine-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(232, 199, 125, 0.08);
  border: 1px solid rgba(232, 199, 125, 0.25);
  color: var(--gold-3);
  font-size: 11px;
  white-space: nowrap;
}

.engine-spark {
  color: var(--gold);
}

.engine-short {
  display: none;
}

/* 身份卡 */
.footer-main-card {
  padding: 28px;
  border-radius: 16px;
  background: var(--surface-card);
  border: 1px solid rgba(232, 199, 125, 0.15);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
}

.footer-brand-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 22px;
  flex-wrap: wrap;
  gap: 16px;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.logo-box {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  font-family: var(--mono);
  font-weight: 900;
  font-size: 17px;
  color: var(--gold-ink);
  background: var(--gold);
}

.brand-copy {
  min-width: 0;
}

.brand-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: 0.04em;
  word-break: keep-all;
}

.brand-tagline {
  font-size: 11px;
  color: var(--text-2);
  margin-top: 3px;
  word-break: keep-all;
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
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-family: var(--mono);
  text-decoration: none;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-2);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.dev-pill.static {
  cursor: default;
}

@media (hover: hover) and (pointer: fine) {
  .dev-pill:hover:not(.static) {
    background: rgba(232, 199, 125, 0.12);
    border-color: var(--gold-2);
    color: var(--gold-3);
  }
}

.footer-notes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-3);
}

.disclaimer b {
  color: var(--gold-3);
}

.sources-list {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.6;
}

.copyright-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 11px;
  flex-wrap: wrap;
  gap: 8px;
}

/* 返回顶部：44px 圆钮，右下角并避开安全区；只在滚过第一屏后出现 */
.back-to-top-btn {
  --btt-inset: 28px;
  position: fixed;
  right: calc(var(--btt-inset) + env(safe-area-inset-right, 0px));
  bottom: calc(var(--btt-inset) + env(safe-area-inset-bottom, 0px));
  z-index: 50;
  width: 44px;
  height: 44px;
  padding: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--surface-card) 90%, transparent);
  border: 1px solid var(--line-strong);
  color: var(--gold-3);
  box-shadow: var(--shadow);
  cursor: pointer;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

@media (hover: hover) and (pointer: fine) {
  .back-to-top-btn:hover {
    background: var(--gold-btn);
    color: var(--gold-ink);
    border-color: transparent;
  }
}

.btt-enter-active,
.btt-leave-active {
  transition: opacity 0.25s ease, transform 0.25s var(--ease-out);
}
.btt-enter-from,
.btt-leave-to {
  opacity: 0;
  transform: translateY(8px);
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
    justify-content: flex-start;
    flex-wrap: nowrap;
    gap: 0;
    margin: -1px 0 12px;
    padding: 10px 14px;
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
  .engine-full {
    display: none;
  }
  .engine-short {
    display: inline;
  }

  .footer-main-card {
    padding: 14px;
    border-radius: 12px;
  }

  .footer-brand-section {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding-bottom: 12px;
    margin-bottom: 12px;
  }

  .dev-pills {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .dev-pills > .dev-pill:not(.static) {
    justify-content: center;
    min-height: 44px;
    padding: 0 10px;
    font-size: 12px;
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
    font-size: 12px;
    color: var(--text-3);
  }

  .footer-notes {
    gap: 8px;
    line-height: 1.6;
    color: var(--text-2);
  }

  .sources-list {
    padding: 6px 10px;
  }

  .copyright-row {
    padding-top: 8px;
  }
}
</style>
