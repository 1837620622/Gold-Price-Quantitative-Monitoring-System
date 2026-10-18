<template>
  <header class="top-nav" :class="{ scrolled: isScrolled }">
    <!-- 左：字标。印章 + AURUM，QUANT 小字在下 -->
    <a href="#journey" class="nav-logo" @click.prevent="scrollTo('#journey')">
      <GoldSeal :size="26" class="nav-seal" />
      <span class="nav-wordmark">
        <span class="nav-name">AURUM</span>
        <span class="nav-logo-sub">QUANT</span>
      </span>
    </a>

    <!-- 中间：页内导航。1120px 及以下与手机端收进 ☰ 菜单 -->
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

      <!-- 手机端工具区：计算器、数据源、主题；行情控件由 GlobalTickerBar 挂到 #nav-tools-slot -->
      <li class="menu-tools">
        <p class="menu-title">{{ t('chromeMobile.tools') }}</p>
        <button type="button" class="menu-row" @click="$emit('calc')">
          <Icon name="calculator" :size="16" />
          <span>{{ t('appHeader.calc') }}</span>
        </button>
        <button type="button" class="menu-row" @click="$emit('sources')">
          <span class="tool-dot" :class="{ ok: sourcesHealthy }" aria-hidden="true"></span>
          <span>{{ sourcesLabel }}</span>
        </button>
        <button
          type="button"
          class="menu-row"
          :aria-expanded="prefsOpen ? 'true' : 'false'"
          aria-controls="prefs-panel"
          @click.stop="togglePrefs"
        >
          <Icon :name="themeIcon" :size="16" />
          <span>{{ t('prefs.theme') }}</span>
        </button>
        <div id="nav-tools-slot" class="nav-tools-slot"></div>
      </li>

      <li class="mobile-only-action">
        <a href="#workspace" class="pill mobile-pill" @click.prevent="navClick('#workspace')">{{ t('appHeader.navTerminal') }}</a>
      </li>
    </ul>

    <!-- 右：状态与快捷操作。手机端的数据源与主题收进 ☰ 菜单，语言切换始终在页头 -->
    <div class="nav-actions">
      <button
        type="button"
        class="tool-pill bar-tool"
        :title="sourcesLabel"
        :aria-label="sourcesLabel"
        @click="$emit('sources')"
      >
        <span class="tool-dot" :class="{ ok: sourcesHealthy }" aria-hidden="true"></span>
        <span class="tool-text">{{ sourcesOk }}/{{ sourcesTotal }}</span>
      </button>

      <button
        type="button"
        class="tool-icon-btn calc-btn"
        :title="t('appHeader.calc')"
        :aria-label="t('appHeader.calc')"
        @click="$emit('calc')"
      >
        <Icon name="calculator" :size="16" />
      </button>

      <button
        type="button"
        class="tool-icon-btn refresh-btn"
        :class="{ spinning: status === 'loading' }"
        :title="t('appHeader.refresh')"
        :aria-label="t('appHeader.refresh')"
        @click="$emit('refresh')"
      >
        <Icon name="refresh" :size="16" />
      </button>

      <!-- 主题按钮：展开 PrefsMenu 面板；图标随当前主题变化 -->
      <button
        ref="prefsBtnRef"
        type="button"
        class="tool-icon-btn prefs-toggle bar-tool"
        :aria-expanded="prefsOpen ? 'true' : 'false'"
        aria-controls="prefs-panel"
        :title="t('prefs.theme')"
        :aria-label="t('prefs.theme')"
        @click.stop="togglePrefs"
      >
        <Icon :name="themeIcon" :size="16" />
      </button>

      <LangToggle class="nav-lang" />

      <a href="#workspace" class="pill nav-pill" @click.prevent="navClick('#workspace')">
        {{ t('appHeader.navTerminal') }}
      </a>

      <!-- 手机菜单按钮：关闭时三条线，打开时显示 close 图标 -->
      <button
        ref="navToggleRef"
        type="button"
        class="nav-toggle"
        :aria-expanded="mobileOpen ? 'true' : 'false'"
        aria-controls="nav-links"
        :aria-label="t('chromeMobile.menu')"
        @click.stop="toggleNav"
      >
        <Icon v-if="mobileOpen" name="close" :size="18" />
        <template v-else>
          <span></span>
          <span></span>
          <span></span>
        </template>
      </button>
    </div>

    <div
      v-if="prefsOpen"
      id="prefs-panel"
      ref="prefsRef"
      class="prefs-panel"
      role="dialog"
      :aria-label="t('prefs.group')"
      @focusout="onPrefsFocusOut"
    >
      <PrefsMenu />
    </div>
  </header>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import PrefsMenu from './PrefsMenu.vue';
import LangToggle from './LangToggle.vue';
import GoldSeal from './brand/GoldSeal.vue';
import Icon from './icons/Icon.vue';
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
const sourcesLabel = computed(() => t('appHeader.sourcesHealth', { ok: props.sourcesOk, total: props.sourcesTotal }));
// 日间显示太阳，夜间显示月亮（theme 由 App 传入已解析的 light / dark）
const themeIcon = computed(() => (props.theme === 'light' ? 'sun' : 'moon'));

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
   页头：静止时透明；滚动后一条发丝底边 + 纯色底（轻模糊，无阴影）
   ============================================================ */
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  box-sizing: border-box;
  width: 100%;
  height: var(--nav-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 var(--pad);
  background: transparent;
}

.top-nav::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: color-mix(in srgb, var(--bg) 90%, transparent);
  border-bottom: 1px solid var(--line);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.top-nav.scrolled::before {
  opacity: 1;
}

/* ---------- 字标：印章 + AURUM，QUANT 小字在下 ---------- */
.nav-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 0;
  color: var(--ink);
  text-decoration: none;
  cursor: pointer;
}

.nav-wordmark {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.nav-name {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: 0.12em;
  color: var(--ink);
  white-space: nowrap;
}

.nav-logo-sub {
  margin-top: 5px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold-2);
  white-space: nowrap;
}

/* ---------- 页内导航（桌面） ---------- */
.nav-links {
  display: flex;
  align-items: center;
  gap: clamp(16px, 2vw, 32px);
  margin: 0 clamp(16px, 2.6vw, 40px) 0 auto;
  padding: 0;
  list-style: none;
}

.nav-links a {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-2);
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--dur-fast) var(--ease-out);
}

/* 当前栏目：文字变亮，下方一条金色发丝线 */
.nav-links a::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 7px;
  height: 1px;
  background: var(--gold);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--dur) var(--ease-out);
}

.nav-links a.active {
  color: var(--ink);
}

.nav-links a.active::after {
  transform: scaleX(1);
}

/* ---------- 右侧工具 ---------- */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 数据源健康度：状态点 + 数字 */
.tool-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  background: transparent;
  color: var(--text-2);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.tool-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warn);
}

.tool-dot.ok {
  background: var(--down);
}

.tool-icon-btn {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

/* 刷新中的加载指示：仅在数据请求期间旋转 */
.tool-icon-btn.spinning .icon {
  animation: spin 0.8s linear infinite;
}

/* 语言切换沿用共享组件，这里只把外框放到 40px 以上的触控高度 */
.top-nav .nav-lang {
  height: 42px;
  padding: 0;
}

/* 主按钮：进入终端（发丝边框，悬停只改描边与颜色） */
.nav-pill {
  height: 40px;
  padding: 0 18px;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

/* 悬停只在精确指针上启用，只改描边与颜色 */
@media (hover: hover) and (pointer: fine) {
  .nav-links a:hover {
    color: var(--ink);
  }

  .tool-pill:hover,
  .tool-icon-btn:hover {
    border-color: var(--border-hover);
    color: var(--ink);
  }

  .nav-pill:hover {
    border-color: var(--gold);
    color: var(--gold-3);
  }
}

/* 手机菜单按钮：44px，三条线 */
.nav-toggle {
  display: none;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}

.nav-toggle span {
  display: block;
  width: 16px;
  height: 1.5px;
  background: currentColor;
}

.mobile-only-action {
  display: none;
}

/* 手机工具区：默认隐藏，只在 767px 及以下显示 */
.menu-tools {
  display: none;
}

/* 显示偏好面板：挂在页头下方，是弹层，保留一层阴影 */
.prefs-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: var(--pad);
  z-index: 50;
  width: min(360px, calc(100vw - 2 * var(--pad)));
  padding: 16px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  box-shadow: var(--shadow-modal);
}

/* 图标按钮的读屏名称放在 aria-label 上，不再需要隐藏文字 */
.nav-tools-slot {
  display: contents;
}

/* 中等宽度与手机：☰ 菜单接管导航链接，横屏手机也走这一套 */
@media (max-width: 1120px), (max-height: 540px) {
  .top-nav {
    padding: 0 max(var(--pad), env(safe-area-inset-right)) 0 max(var(--pad), env(safe-area-inset-left));
  }

  .nav-toggle {
    display: inline-flex;
  }

  .nav-links {
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    left: max(var(--pad), env(safe-area-inset-left));
    right: max(var(--pad), env(safe-area-inset-right));
    z-index: 55;
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
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-modal);
  }

  .nav-links.open {
    display: grid;
  }

  .nav-links a::after {
    display: none;
  }

  .nav-links > li > a:not(.pill) {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid transparent;
    border-radius: var(--radius);
    font-size: 15px;
    font-weight: 500;
    color: var(--text);
  }

  /* 当前栏目：金色发丝边 + 淡金底 */
  .nav-links > li > a.active:not(.pill) {
    color: var(--gold-3);
    border-color: var(--line-strong);
    background: color-mix(in srgb, var(--gold) 8%, transparent);
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
    background: transparent;
    font-size: 14px;
    color: var(--text);
  }
}

@media (max-width: 767px) {
  /* 数据源与主题收进菜单，计算器本来就在菜单里 */
  .bar-tool,
  .calc-btn {
    display: none;
  }

  .nav-actions {
    gap: 6px;
  }

  .tool-icon-btn {
    width: 44px;
    height: 44px;
  }

  .nav-name {
    font-size: 18px;
  }

  .top-nav .nav-lang {
    height: 44px;
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
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-2);
  }

  /* 英文菜单标题：11px 大写，字距 .14em；中文不大写、不加字距 */
  :lang(en) .menu-title {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
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
    border-radius: var(--radius);
    background: transparent;
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
  }

  .menu-row .icon {
    flex: none;
    color: var(--gold);
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

/* 极窄屏（320–359px）：压缩字标与语言按钮，保证页头不超出视口 */
@media (max-width: 359px) {
  .top-nav {
    gap: 8px;
  }

  .nav-name {
    font-size: 16px;
  }

  .nav-actions {
    gap: 4px;
  }

  .tool-icon-btn,
  .nav-toggle {
    width: 40px;
    height: 40px;
  }

  .top-nav .nav-lang :deep(.lang-toggle-btn) {
    min-width: 42px;
    padding: 0 8px;
  }
}
</style>
