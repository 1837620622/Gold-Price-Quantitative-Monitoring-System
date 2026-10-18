<template>
  <header class="top-nav" :class="{ scrolled: isScrolled }">
    <!-- Left: Wordmark AURUM -->
    <a href="#journey" class="nav-logo" @click.prevent="scrollTo('#journey')">
      AURUM <span class="nav-logo-sub">QUANT</span>
    </a>

    <!-- Center: Links。手机端收进 ☰ 菜单；工具区只在 767px 及以下显示 -->
    <ul
      id="nav-links"
      ref="navLinksRef"
      class="nav-links"
      :class="{ open: mobileOpen }"
      @click="onMenuClick"
      @focusout="onMenuFocusOut"
    >
      <li><a href="#journey" :class="{ active: activeId === 'journey' }" @click.prevent="navClick('#journey')">{{ t('appHeader.navOverview') }}</a></li>
      <li><a href="#sec-overview" :class="{ active: activeId === 'sec-overview' }" @click.prevent="navClick('#sec-overview')">{{ t('appHeader.navMarket') }}</a></li>
      <li><a href="#sec-quant" :class="{ active: activeId === 'sec-quant' }" @click.prevent="navClick('#sec-quant')">{{ t('appHeader.navSignals') }}</a></li>
      <li><a href="#sec-charts" :class="{ active: activeId === 'sec-charts' }" @click.prevent="navClick('#sec-charts')">{{ t('appHeader.navCharts') }}</a></li>
      <li><a href="#sec-tools" :class="{ active: activeId === 'sec-tools' }" @click.prevent="navClick('#sec-tools')">{{ t('appHeader.navArbitrage') }}</a></li>
      <li><a href="#sec-ai" :class="{ active: activeId === 'sec-ai' }" @click.prevent="navClick('#sec-ai')">{{ t('appHeader.navAi') }}</a></li>

      <!-- 手机端工具区：计算器 + 行情控件（音效 / 预警 / 刷新频率由 GlobalTickerBar 挂到 #nav-tools-slot） -->
      <li class="menu-tools">
        <p class="menu-title">{{ t('chromeMobile.tools') }}</p>
        <button type="button" class="menu-row" @click="$emit('calc')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="4" y="2" width="16" height="20" rx="2"></rect>
            <line x1="8" y1="6" x2="16" y2="6"></line>
            <line x1="16" y1="14" x2="16" y2="18"></line>
          </svg>
          <span>{{ t('appHeader.calc') }}</span>
        </button>
        <div id="nav-tools-slot" class="nav-tools-slot"></div>
      </li>

      <li class="mobile-only-action">
        <a href="#workspace" class="pill mobile-pill" @click.prevent="navClick('#workspace')">{{ t('appHeader.navTerminal') }}</a>
      </li>
    </ul>

    <!-- Right: status & quick actions -->
    <div class="nav-actions">
      <!-- 紧凑工具药丸（实时源） -->
      <button
        type="button"
        class="tool-pill"
        :title="t('appHeader.sourcesHealth', { ok: sourcesOk, total: sourcesTotal })"
        @click="$emit('sources')"
      >
        <span class="tool-dot" :class="{ ok: sourcesHealthy }"></span>
        <span class="tool-text">{{ sourcesOk }}/{{ sourcesTotal }}</span>
      </button>

      <!-- 计算器：手机端移入 ☰ 菜单 -->
      <button type="button" class="tool-icon-btn calc-btn" :title="t('appHeader.calc')" @click="$emit('calc')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2"></rect>
          <line x1="8" y1="6" x2="16" y2="6"></line>
          <line x1="16" y1="14" x2="16" y2="18"></line>
        </svg>
      </button>

      <button
        type="button"
        class="tool-icon-btn refresh-btn"
        :class="{ spinning: status === 'loading' }"
        :title="t('appHeader.refresh')"
        @click="$emit('refresh')"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-2.6-6.4"></path>
          <path d="M21 4v5h-5"></path>
        </svg>
      </button>

      <!-- Pill button label “Launch Terminal” -->
      <a href="#workspace" class="pill nav-pill" @click.prevent="navClick('#workspace')">
        {{ t('appHeader.navTerminal') }}
      </a>

      <!-- 显示与语言：按钮展开 PrefsMenu 面板，桌面与手机通用 -->
      <button
        ref="prefsBtnRef"
        type="button"
        class="tool-icon-btn prefs-toggle"
        :aria-expanded="prefsOpen ? 'true' : 'false'"
        aria-controls="prefs-panel"
        :title="t('appHeader.prefs')"
        @click.stop="togglePrefs"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>
        </svg>
        <span class="prefs-toggle-text">{{ t('appHeader.prefsShort') }}</span>
      </button>

      <!-- 44x44 Hamburger (.nav-toggle) -->
      <button
        ref="navToggleRef"
        class="nav-toggle"
        type="button"
        :aria-expanded="mobileOpen ? 'true' : 'false'"
        aria-controls="nav-links"
        :aria-label="t('chromeMobile.menu')"
        @click.stop="toggleNav"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>

    <div
      v-if="prefsOpen"
      id="prefs-panel"
      ref="prefsRef"
      class="prefs-panel"
      role="dialog"
      :aria-label="t('appHeader.prefs')"
      @focusout="onPrefsFocusOut"
    >
      <PrefsMenu />
    </div>
  </header>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import PrefsMenu from './PrefsMenu.vue';
import { useI18n } from '../i18n';

const { t } = useI18n();

const props = defineProps({
  status: { type: String, default: 'live' },
  theme: { type: String, default: 'dark' },
  ageSeconds: { type: Number, default: 0 },
  now: { type: Number, default: () => Date.now() },
  sourcesOk: { type: Number, default: 0 },
  sourcesTotal: { type: Number, default: 0 },
});

const emit = defineEmits(['refresh', 'subscribe', 'sources', 'poster', 'calc', 'alert']);

const mobileOpen = ref(false);
const activeId = ref('hero');
const isScrolled = ref(false);
const navLinksRef = ref(null);
const navToggleRef = ref(null);
const prefsOpen = ref(false);
const prefsRef = ref(null);
const prefsBtnRef = ref(null);

const sourcesHealthy = computed(() => props.sourcesTotal > 0 && props.sourcesOk === props.sourcesTotal);

// 滚动后才显示底栏；带滞后区间，贴近阈值时不会反复切换
function onScroll() {
  const y = window.scrollY;
  if (y > 40) isScrolled.value = true;
  else if (y < 8) isScrolled.value = false;
}

function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function navClick(selector) {
  mobileOpen.value = false;
  scrollTo(selector);
}

function toggleNav() {
  prefsOpen.value = false;
  mobileOpen.value = !mobileOpen.value;
}

function togglePrefs() {
  mobileOpen.value = false;
  prefsOpen.value = !prefsOpen.value;
}

// 菜单里的按钮（计算器、音效、预警等）点完即收起；下拉框保持打开
function onMenuClick(e) {
  if (e.target.closest('button, a')) mobileOpen.value = false;
}

// 焦点离开菜单 / 面板时收起；指针点击外部由 onClickOutside 处理
function onMenuFocusOut(e) {
  const next = e.relatedTarget;
  if (!next || navLinksRef.value?.contains(next) || navToggleRef.value?.contains(next)) return;
  mobileOpen.value = false;
}

function onPrefsFocusOut(e) {
  const next = e.relatedTarget;
  if (!next || prefsRef.value?.contains(next) || prefsBtnRef.value?.contains(next)) return;
  prefsOpen.value = false;
}

// 打开偏好面板后把焦点交给当前选中的选项，键盘用户可以直接操作
watch(prefsOpen, (open) => {
  if (!open) return;
  nextTick(() => {
    prefsRef.value?.querySelector('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true });
  });
});

function onClickOutside(e) {
  if (navLinksRef.value && !navLinksRef.value.contains(e.target)) {
    mobileOpen.value = false;
  }
  const inPrefs = (prefsRef.value && prefsRef.value.contains(e.target)) || (prefsBtnRef.value && prefsBtnRef.value.contains(e.target));
  if (prefsOpen.value && !inPrefs) {
    prefsOpen.value = false;
  }
}

// Escape 关闭面板；焦点原本在面板内时还给对应的按钮
function onKeydown(e) {
  if (e.key !== 'Escape') return;
  if (prefsOpen.value) {
    const hadFocus = prefsRef.value?.contains(document.activeElement);
    prefsOpen.value = false;
    if (hadFocus) prefsBtnRef.value?.focus();
  }
  if (mobileOpen.value) {
    const hadFocus = navLinksRef.value?.contains(document.activeElement);
    mobileOpen.value = false;
    if (hadFocus) navToggleRef.value?.focus();
  }
}

let sectionObserver = null;

onMounted(() => {
  document.addEventListener('click', onClickOutside);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const sectionIds = ['journey', 'sec-overview', 'sec-quant', 'sec-charts', 'sec-tools', 'sec-ai'];
  sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        activeId.value = entry.target.id;
      }
    }
  }, { rootMargin: '-20% 0px -60% 0px' });

  sectionIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });
});

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('scroll', onScroll);
  if (sectionObserver) sectionObserver.disconnect();
});
</script>

<style scoped>
/* ============================================================
   NAV (EXACT PROMPT SPECIFICATION)
   ============================================================ */
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: var(--nav-h);
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--pad);
  box-sizing: border-box;
  background: transparent;
}

/* 滚动后的底栏：伪元素淡入淡出，不切换 backdrop-filter，避免闪烁；模糊保持轻量 */
.top-nav::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 6px 18px -14px rgba(0, 0, 0, 0.5);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.top-nav.scrolled::before {
  opacity: 1;
}

.nav-logo {
  font-family: 'Inter', sans-serif;
  font-weight: 300;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--ink);
  font-size: clamp(15px, 1.45vw, 23px);
  text-decoration: none;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}
.nav-logo-sub {
  font-size: 0.52em;
  letter-spacing: 0.18em;
  color: var(--gold-3);
  font-weight: 700;
  margin-left: -2px;
  vertical-align: super;
}

.nav-links {
  display: flex;
  gap: 2.1vw;
  margin-left: auto;
  margin-right: 2.6vw;
  list-style: none;
  padding: 0;
  align-items: center;
}

.nav-links a {
  font-family: 'Inter', sans-serif;
  font-size: clamp(11px, 0.88vw, 14px);
  color: var(--text-2);
  text-decoration: none;
  transition: color 0.3s ease;
  white-space: nowrap;
}

.nav-links a.active {
  color: var(--ink);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.tool-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 5%, transparent);
  border: 1px solid var(--line-strong);
  color: var(--dim);
  font-size: 11px;
  font-family: var(--font-display), var(--mono);
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease;
}

.tool-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warn);
}
.tool-dot.ok {
  background: var(--down);
}

.tool-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ink) 4%, transparent);
  border: 1px solid var(--line-strong);
  color: var(--dim);
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
}

/* 刷新中的加载指示：仅在数据请求期间旋转 */
.tool-icon-btn.spinning svg {
  animation: spin 0.8s linear infinite;
}

.nav-pill {
  background: transparent;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  padding: 0.85em 1.55em;
  font-size: clamp(11px, 0.88vw, 14px);
  color: var(--ink);
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.35s ease, border-color 0.35s ease, color 0.35s ease;
}

/* 悬停效果只给有鼠标的设备 */
@media (hover: hover) and (pointer: fine) {
  .nav-links a:hover {
    color: var(--ink);
  }
  .tool-pill:hover {
    background: color-mix(in srgb, var(--ink) 12%, transparent);
    color: var(--ink);
  }
  .tool-icon-btn:hover {
    background: color-mix(in srgb, var(--ink) 12%, transparent);
    color: var(--ink);
    border-color: var(--border-hover);
  }
  .nav-pill:hover {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
}

/* 44x44 Hamburger */
.nav-toggle {
  display: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
  background: transparent;
  cursor: pointer;
  padding: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  z-index: 50;
}
.nav-toggle span {
  display: block;
  width: 16px;
  height: 1.5px;
  background: var(--ink);
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.nav-toggle[aria-expanded="true"] span:nth-child(1) {
  transform: translateY(5.5px) rotate(45deg);
}
.nav-toggle[aria-expanded="true"] span:nth-child(2) {
  opacity: 0;
}
.nav-toggle[aria-expanded="true"] span:nth-child(3) {
  transform: translateY(-5.5px) rotate(-45deg);
}

.mobile-only-action {
  display: none;
}

/* 手机工具区：默认隐藏，只在 767px 及以下显示 */
.menu-tools {
  display: none;
}

/* 中等宽度与手机：☰ 菜单接管导航链接 */
@media (max-width: 900px), (max-height: 540px) {
  .top-nav {
    padding: 0 max(var(--pad), env(safe-area-inset-right)) 0 max(var(--pad), env(safe-area-inset-left));
  }
  .nav-toggle {
    display: flex;
  }
  .tool-pill,
  .nav-pill {
    min-height: 44px;
  }
  .tool-icon-btn {
    width: 44px;
    height: 44px;
  }
  .nav-links {
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    left: max(var(--pad), env(safe-area-inset-left));
    right: max(var(--pad), env(safe-area-inset-right));
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    margin: 0;
    padding: 8px;
    max-height: calc(100vh - var(--nav-h) - 24px);
    max-height: calc(100dvh - var(--nav-h) - 24px);
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--surface-card);
    border: 1px solid var(--line-strong);
    border-radius: 14px;
    box-shadow: var(--shadow);
    z-index: 55;
  }
  .nav-links.open {
    display: grid;
  }
  .nav-links > li > a:not(.pill) {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 10px;
    font-size: 15px;
    color: var(--text);
    background: color-mix(in srgb, var(--ink) 3%, transparent);
  }
  .nav-links > li > a.active:not(.pill) {
    color: var(--gold-3);
    box-shadow: inset 2px 0 0 var(--gold);
  }
  .mobile-only-action {
    display: block;
    grid-column: 1 / -1;
    margin-top: 6px;
  }
  .nav-links .mobile-pill {
    width: 100%;
    min-height: 44px;
    height: auto;
    padding: 0 16px;
    font-size: 14px;
    color: var(--text);
  }
}

/* 显示与语言面板：挂在导航栏下方，颜色跟随主题令牌 */
.prefs-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: var(--pad);
  z-index: 50;
  width: min(360px, calc(100vw - 2 * var(--pad)));
  padding: 14px 16px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  box-shadow: var(--shadow);
}

.prefs-panel :deep(.prefs) {
  flex-direction: column;
  align-items: stretch;
}

/* 图标按钮只保留读屏文本，避免桌面端文字挤出 36px 圆形按钮 */
.prefs-toggle-text {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 767px) {
  .calc-btn {
    display: none;
  }
  .nav-actions {
    gap: 6px;
  }
  .tool-pill {
    height: 44px;
    min-width: 44px;
    padding: 0 12px;
    font-size: 12px;
  }
  .menu-tools {
    display: block;
    grid-column: 1 / -1;
    margin-top: 6px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .menu-title {
    margin: 0 4px 8px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .menu-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    margin-bottom: 6px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ink) 3%, transparent);
    color: var(--text);
    font: inherit;
    font-size: 15px;
    text-align: left;
    cursor: pointer;
  }
  .menu-row svg {
    flex: none;
    color: var(--gold-3);
  }
  .prefs-panel {
    top: calc(100% + 8px);
    left: max(var(--pad), env(safe-area-inset-left));
    right: max(var(--pad), env(safe-area-inset-right));
    width: auto;
    max-height: calc(100vh - var(--nav-h) - 24px);
    max-height: calc(100dvh - var(--nav-h) - 24px);
    overflow-y: auto;
  }
}

@media (max-width: 680px) {
  .nav-pill {
    display: none;
  }
}

@media (max-width: 420px) {
  .nav-actions {
    gap: 6px;
  }
}
</style>
