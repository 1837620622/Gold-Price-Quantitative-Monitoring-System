<template>
  <header class="top-nav">
    <!-- Left: Wordmark AURUM -->
    <a href="#hero" class="nav-logo" @click.prevent="scrollTo('#hero')">
      AURUM <span class="nav-logo-sub">QUANT</span>
    </a>

    <!-- Center: Links -->
    <ul class="nav-links" :class="{ open: mobileOpen }" ref="navLinksRef">
      <li><a href="#hero" :class="{ active: activeId === 'hero' }" @click.prevent="navClick('#hero')">Overview</a></li>
      <li><a href="#recipe" :class="{ active: activeId === 'recipe' }" @click.prevent="navClick('#recipe')">Dual Engine</a></li>
      <li><a href="#adv" :class="{ active: activeId === 'adv' }" @click.prevent="navClick('#adv')">Advantages</a></li>
      <li><a href="#ess" :class="{ active: activeId === 'ess' }" @click.prevent="navClick('#ess')">Synthesis</a></li>
      <li><a href="#workspace" :class="{ active: activeId === 'workspace' }" @click.prevent="navClick('#workspace')">Terminal</a></li>
      <li class="mobile-only-action"><a href="#workspace" class="pill mobile-pill" @click.prevent="navClick('#workspace')">Launch Terminal</a></li>
    </ul>

    <!-- Right: Actions & Pill -->
    <div class="nav-actions">
      <!-- 紧凑工具药丸（实时源与计算器） -->
      <button
        type="button"
        class="tool-pill"
        :title="t('appHeader.sourcesHealth', { ok: sourcesOk, total: sourcesTotal })"
        @click="$emit('sources')"
      >
        <span class="tool-dot" :class="{ ok: sourcesHealthy }"></span>
        <span class="tool-text">{{ sourcesOk }}/{{ sourcesTotal }}</span>
      </button>

      <button
        type="button"
        class="tool-icon-btn"
        :title="t('appHeader.calc')"
        @click="$emit('calc')"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="2" width="16" height="20" rx="2"></rect>
          <line x1="8" y1="6" x2="16" y2="6"></line>
          <line x1="16" y1="14" x2="16" y2="18"></line>
        </svg>
      </button>

      <button
        type="button"
        class="tool-icon-btn"
        :class="{ spinning: status === 'loading' }"
        :title="t('appHeader.refresh')"
        @click="$emit('refresh')"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-2.6-6.4"></path>
          <path d="M21 4v5h-5"></path>
        </svg>
      </button>

      <!-- Pill button label “Launch Terminal” -->
      <a
        href="#workspace"
        class="pill nav-pill"
        @click.prevent="navClick('#workspace')"
      >
        Launch Terminal
      </a>

      <!-- 显示与语言：按钮展开 PrefsMenu 面板，桌面与手机通用 -->
      <button
        ref="prefsBtnRef"
        type="button"
        class="tool-icon-btn prefs-toggle"
        :aria-expanded="prefsOpen ? 'true' : 'false'"
        aria-controls="prefs-panel"
        :title="t('appHeader.prefs')"
        @click.stop="prefsOpen = !prefsOpen"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>
        </svg>
        <span class="prefs-toggle-text">{{ t('appHeader.prefsShort') }}</span>
      </button>

      <!-- 44x44 Hamburger (.nav-toggle) -->
      <button
        class="nav-toggle"
        type="button"
        :aria-expanded="mobileOpen ? 'true' : 'false'"
        aria-label="Toggle Navigation"
        @click.stop="mobileOpen = !mobileOpen"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
    <div v-if="prefsOpen" id="prefs-panel" ref="prefsRef" class="prefs-panel" role="dialog" :aria-label="t('appHeader.prefs')">
      <PrefsMenu />
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
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
const navLinksRef = ref(null);
const prefsOpen = ref(false);
const prefsRef = ref(null);
const prefsBtnRef = ref(null);

const sourcesHealthy = computed(() => props.sourcesTotal > 0 && props.sourcesOk === props.sourcesTotal);

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

function onClickOutside(e) {
  if (navLinksRef.value && !navLinksRef.value.contains(e.target)) {
    mobileOpen.value = false;
  }
  const inPrefs = (prefsRef.value && prefsRef.value.contains(e.target)) || (prefsBtnRef.value && prefsBtnRef.value.contains(e.target));
  if (prefsOpen.value && !inPrefs) {
    prefsOpen.value = false;
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') prefsOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', onClickOutside);
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
/* ============================================================
   NAV (EXACT PROMPT SPECIFICATION)
   ============================================================ */
.top-nav {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 40;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2.6vh var(--pad) 0;
  box-sizing: border-box;
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

.nav-links a:hover,
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
  transition: all 0.25s ease;
}
.tool-pill:hover {
  background: color-mix(in srgb, var(--ink) 12%, transparent);
  color: var(--ink);
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
  cursor: pointer;
  transition: all 0.25s ease;
}
.tool-icon-btn:hover {
  background: color-mix(in srgb, var(--ink) 12%, transparent);
  color: var(--ink);
  border-color: var(--border-hover);
}

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
.nav-pill:hover {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
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

/* Mobile Dropdown */
@media (max-width: 900px), (max-height: 540px) {
  .top-nav {
    padding: max(2.6vh, env(safe-area-inset-top)) max(var(--pad), env(safe-area-inset-right)) 0 max(var(--pad), env(safe-area-inset-left));
  }
  .nav-toggle {
    display: flex;
  }
  .tool-pill,
  .tool-icon-btn,
  .nav-pill,
  .nav-toggle {
    min-height: 44px;
  }
  .nav-links {
    display: none;
    position: absolute;
    top: calc(100% + 10px);
    right: max(var(--pad), env(safe-area-inset-right));
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 180px;
    padding: 10px 16px;
    background: color-mix(in srgb, var(--surface-card) 96%, transparent);
    border: 1px solid var(--line-strong);
    border-radius: 16px;
    box-shadow: var(--shadow);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    margin: 0;
    z-index: 55;
  }
  .nav-links.open {
    display: flex;
  }
  .nav-links a {
    font-size: 16px;
    padding: 10px 4px;
  }
  .mobile-only-action {
    display: block;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--line);
    width: 100%;
    text-align: center;
  }
  .mobile-pill {
    width: 100%;
    font-size: 13px !important;
    padding: 10px 16px !important;
  }
}

.mobile-only-action {
  display: none;
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

@media (max-width: 1100px) {
  .prefs-toggle-text {
    display: none;
  }
}
</style>
