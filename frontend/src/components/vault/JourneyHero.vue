<template>
  <section
    id="journey"
    ref="rootEl"
    class="journey"
    :class="{ 'is-static': isStatic, 'is-nogl': noGL }"
    aria-labelledby="journey-title"
  >
    <div ref="stageEl" class="journey-stage">
      <canvas ref="hallEl" class="layer layer-hall" aria-hidden="true"></canvas>

      <div ref="copyEl" class="hero-copy">
        <p class="label eyebrow">{{ t('vault.hero.eyebrow') }}</p>
        <h1 id="journey-title" class="display title">
          <span class="line">{{ t('vault.hero.title1') }}</span>
          <span class="line grad-text">{{ t('vault.hero.title2') }}</span>
        </h1>
        <div class="sub">
          <p>{{ t('vault.hero.sub1') }}</p>
          <p>{{ t('vault.hero.sub2') }}</p>
          <p>{{ t('vault.hero.sub3') }}</p>
          <p>{{ t('vault.hero.sub4') }}</p>
        </div>
      </div>

      <dl ref="liveEl" class="live" :aria-label="t('vault.hero.liveAria')">
        <div class="live-row">
          <dt class="label">{{ t('vault.live.domestic') }}</dt>
          <dd class="num" :class="flashes.domestic">{{ live.domestic }}</dd>
        </div>
        <div class="live-row">
          <dt class="label">{{ t('vault.live.intl') }}</dt>
          <dd class="num" :class="flashes.intl">{{ live.intl }}</dd>
        </div>
        <div class="live-row">
          <dt class="label">{{ t('vault.live.premium') }}</dt>
          <dd class="num" :class="flashes.premium">{{ live.premium }}</dd>
        </div>
      </dl>

      <p ref="footerEl" class="display footer-line" aria-hidden="true">
        <span class="desk">{{ t('vault.footer.desk') }}</span>
        <span class="mob">{{ t('vault.footer.m1') }}<br />{{ t('vault.footer.m2') }}</span>
      </p>

      <canvas ref="coinEl" class="layer layer-coins" aria-hidden="true"></canvas>

      <div ref="anchorEl" class="pill-anchor">
        <div class="pill-shell">
          <button
            type="button"
            class="pill coin-pill"
            :class="{ 'is-on': hovered >= 0 }"
            :tabindex="hovered >= 0 ? 0 : -1"
            @click.stop="navigate"
          >
            {{ pillText }} ↗
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from '../../i18n';
import { useTheme } from '../../composables/useTheme';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion';
import { createVaultScene, webglAvailable } from '../../lib/vault/scene';
import { createCoinLayer, measureCapTop } from '../../lib/vault/coins';
import { prepareFonts } from '../../lib/vault/textures';

const props = defineProps({
  domesticPrice: { type: Number, default: null },
  intlPrice: { type: Number, default: null },
  premiumPercent: { type: Number, default: null },
  bars: { type: Array, default: () => [] },
});

const COIN_LABELS = ['AU9999', 'XAU/USD', 'PREMIUM'];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const rootEl = ref(null);
const stageEl = ref(null);
const hallEl = ref(null);
const coinEl = ref(null);
const footerEl = ref(null);
const copyEl = ref(null);
const liveEl = ref(null);
let heroShown = true;
const anchorEl = ref(null);

// 运行模式在 setup 时确定：减少动态效果 / 无 WebGL / 移动端
const reduced = prefersReducedMotion();
const noGL = !webglAvailable();
const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
const isStatic = reduced || noGL;

// 文案随语言切换（t 读取 locale，模板中自动更新）；resolved 为 'light'（日间）或 'dark'（夜间）
const { t } = useI18n();
const { resolved } = useTheme();

// 昼夜切换：等 data-theme 写入后读取纸本底色（--bg），更新大厅调色板，不重载页面
async function applyTheme() {
  await nextTick();
  const base = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f6f3ec';
  scene?.setTheme(resolved.value, base);
}
watch(resolved, applyTheme);

// ---------------- 实时数值：数字滚动 + 涨跌闪色（只改颜色，不铺背景） ----------------
const tweened = reactive({ domestic: null, intl: null, premium: null });
const flashes = reactive({ domestic: '', intl: '', premium: '' });
const flashTimers = {};

const priceText = (v, prefix) =>
  v == null ? '--' : `${prefix}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const live = computed(() => ({
  domestic: priceText(tweened.domestic, '¥'),
  intl: priceText(tweened.intl, '$'),
  premium:
    tweened.premium == null ? '--' : `${tweened.premium >= 0 ? '+' : ''}${tweened.premium.toFixed(2)}%`,
}));

function flash(key, cls) {
  flashes[key] = cls;
  clearTimeout(flashTimers[key]);
  flashTimers[key] = setTimeout(() => {
    flashes[key] = '';
  }, 1200);
}

function animateValue(key, value, immediate) {
  if (value == null || Number.isNaN(value)) {
    tweened[key] = null;
    return;
  }
  const from = tweened[key];
  if (from == null || immediate || reduced) {
    tweened[key] = value;
    return;
  }
  if (value === from) return;
  flash(key, value > from ? 'flash-up' : 'flash-down');
  gsap.to(tweened, { [key]: value, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
}

animateValue('domestic', props.domesticPrice, true);
animateValue('intl', props.intlPrice, true);
animateValue('premium', props.premiumPercent, true);

watch(() => props.domesticPrice, (v) => animateValue('domestic', v, false));
watch(() => props.intlPrice, (v) => animateValue('intl', v, false));
watch(() => props.premiumPercent, (v) => animateValue('premium', v, false));

// ---------------- 金币悬停胶囊 ----------------
const hovered = ref(-1);
const pillIndex = ref(0);
watch(hovered, (v) => {
  if (v >= 0) pillIndex.value = v;
});
const pillText = computed(() => {
  const values = [live.value.domestic, live.value.intl, live.value.premium];
  return `${COIN_LABELS[pillIndex.value]} ${values[pillIndex.value]}`;
});

function navigate() {
  document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
}

// ---------------- 场景与生命周期 ----------------
let scene = null;
let coins = null;
let rafId = 0;
let lastNow = 0;
let inView = true;
let intersection = null;
let resizeObserver = null;
let ctx = null;
let quick = null;
let lookStopped = false;
let dragging = false;
let dragStartX = 0;
const listeners = [];

// progress 由 ScrollTrigger（scrub 0.55）驱动
const progress = { p: 0 };
const footer = { angle: 0, capOffset: 0 };
const pointer = { x: 0, y: 0 };
const look = {
  hero: { x: 0, y: 0 },
  footer: { x: 0, y: 0 },
  tunnel: { x: 0, y: 0 },
};

function setupQuick() {
  quick = {
    heroX: gsap.quickTo(look.hero, 'x', { duration: 0.75, ease: 'power2.out' }),
    heroY: gsap.quickTo(look.hero, 'y', { duration: 0.75, ease: 'power2.out' }),
    footerX: gsap.quickTo(look.footer, 'x', { duration: 0.55, ease: 'power2.out' }),
    footerY: gsap.quickTo(look.footer, 'y', { duration: 0.55, ease: 'power2.out' }),
    tunnelX: gsap.quickTo(look.tunnel, 'x', { duration: 0.65, ease: 'power2.out' }),
    tunnelY: gsap.quickTo(look.tunnel, 'y', { duration: 0.65, ease: 'power2.out' }),
  };
}

// 指针目标：进度超过 0.94 后停止响应，回到中立
function setPointerTargets(x, y) {
  if (!quick) return;
  const stop = progress.p >= 0.94;
  const tx = stop ? 0 : x;
  const ty = stop ? 0 : y;
  quick.heroX(tx);
  quick.heroY(ty);
  quick.footerX(tx);
  quick.footerY(ty);
  quick.tunnelX(tx);
  quick.tunnelY(ty);
}

function measureFooter() {
  const el = footerEl.value;
  if (!el) return;
  const cs = getComputedStyle(el);
  const fontSize = parseFloat(cs.fontSize);
  let lineHeight = parseFloat(cs.lineHeight);
  if (!Number.isFinite(lineHeight)) lineHeight = fontSize * 1.2;
  footer.capOffset = measureCapTop(fontSize, lineHeight);
}

// 页脚倾斜：translateX = lookX × −22px，rotate = lookX × 0.105 rad，translateY = lookY × −14px − 6px
function applyFooter(strength) {
  const el = footerEl.value;
  if (!el) return;
  const fx = look.footer.x * strength;
  const fy = look.footer.y * strength;
  const tx = -22 * fx;
  const ty = -14 * fy - 6;
  const rot = 0.105 * fx;
  footer.angle = rot;
  el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rot.toFixed(4)}rad)`;
}

// 页脚字母帽线的地面函数（画布坐标）：随页脚的位移与旋转移动
function floorFromFooter() {
  const el = footerEl.value;
  const cv = coinEl.value;
  if (!el || !cv) return null;
  const fr = el.getBoundingClientRect();
  const cr = cv.getBoundingClientRect();
  const cx = fr.left + fr.width / 2 - cr.left;
  const cy = fr.top + fr.height / 2 - cr.top;
  const tan = Math.tan(footer.angle);
  const cos = Math.cos(footer.angle);
  const vCap = footer.capOffset - el.offsetHeight / 2;
  return (x) => cy + (x - cx) * tan + vCap / cos;
}

function sizeAll() {
  const stage = stageEl.value;
  if (!stage) return;
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  scene?.setSize(w, h, dpr);
  coins?.setSize(w, h, Math.min(dpr, mobile ? 1.5 : 2));
  measureFooter();
}

function coinStartXs() {
  const w = stageEl.value?.clientWidth ?? 1440;
  const fractions = mobile ? [0.20, 0.50, 0.80] : [0.36, 0.52, 0.68];
  return fractions.map((f) => f * w);
}

function updatePill() {
  const anchor = anchorEl.value;
  if (!coins || !anchor || hovered.value < 0) return;
  const pos = coins.positions()[hovered.value];
  if (!pos) return;
  anchor.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${(pos.y - pos.r - 14).toFixed(1)}px, 0)`;
}

// 退场：p 0.025 → 0.115 与金条同步
function exitProgress(p) {
  return reduced ? 0 : smooth(0.025, 0.115, p);
}

function tick(now) {
  rafId = requestAnimationFrame(tick);
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 1 / 60;
  lastNow = now;
  if (!inView || document.hidden) return;

  const p = progress.p;

  // 进度 0.12：HTML 标题、实时数值与页脚在一帧内隐藏，让位给金库墙面
  const shown = reduced || p < 0.12;
  if (shown !== heroShown) {
    heroShown = shown;
    for (const el of [copyEl.value, liveEl.value, footerEl.value]) {
      if (el) el.style.visibility = shown ? 'visible' : 'hidden';
    }
  }

  const strength = reduced ? 0 : 1 - smooth(0.035, 0.11, p);
  const stopped = p >= 0.94;
  if (stopped !== lookStopped) {
    lookStopped = stopped;
    setPointerTargets(pointer.x, pointer.y);
  }

  applyFooter(strength);

  scene?.render({
    p,
    reduced,
    time: now / 1000,
    look: { x: look.hero.x * strength, y: look.hero.y * strength },
    tunnelLook: { x: look.tunnel.x, y: look.tunnel.y },
  });

  if (coins) {
    coins.setExit(exitProgress(p));
    coins.frame(dt, floorFromFooter());
    updatePill();
  }
}

// 指针：桌面端驱动倾斜与金条视差，并检测悬停的金币
function onPointerMove(event) {
  if (reduced || noGL || event.pointerType === 'touch') return;
  const stage = stageEl.value;
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (!inside) {
    onPointerLeave();
    return;
  }
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  pointer.x = clamp((localX / rect.width) * 2 - 1, -1, 1);
  pointer.y = clamp(-((localY / rect.height) * 2 - 1), -1, 1);
  setPointerTargets(pointer.x, pointer.y);
  hovered.value = coins ? coins.hitTest(localX, localY) : -1;
}

function onPointerLeave() {
  pointer.x = 0;
  pointer.y = 0;
  setPointerTargets(0, 0);
  hovered.value = -1;
}

function onWindowOut(event) {
  if (!event.relatedTarget) onPointerLeave();
}

// 触屏：页脚横向拖拽倾斜；轻点金币显示胶囊并导航
function onFooterDown(event) {
  if (event.pointerType !== 'touch') return;
  dragging = true;
  dragStartX = event.clientX;
}

function onWindowTouchMove(event) {
  if (!dragging || event.pointerType !== 'touch') return;
  quick?.footerX(clamp((event.clientX - dragStartX) / 180, -1, 1));
}

function onWindowTouchEnd() {
  if (!dragging) return;
  dragging = false;
  quick?.footerX(0);
}

function onStagePointerDown(event) {
  if (event.pointerType !== 'touch' || !coins || !stageEl.value) return;
  const rect = stageEl.value.getBoundingClientRect();
  hovered.value = coins.hitTest(event.clientX - rect.left, event.clientY - rect.top);
}

function onStageClick() {
  if (hovered.value >= 0) navigate();
}

function on(target, type, fn, options) {
  target.addEventListener(type, fn, options);
  listeners.push(() => target.removeEventListener(type, fn, options));
}

watch(
  () => props.bars,
  (next) => scene?.setBars(next)
);

onMounted(async () => {
  await prepareFonts();
  measureFooter();

  ctx = gsap.context(() => {
    if (!reduced && !noGL) {
      gsap.to(progress, {
        p: 1,
        ease: 'none',
        scrollTrigger: { trigger: rootEl.value, start: 'top top', end: 'bottom bottom', scrub: 0.55 },
      });
    }
  }, rootEl.value);

  setupQuick();

  if (!noGL) {
    scene = createVaultScene(hallEl.value, { mobile, bars: props.bars });
    applyTheme();
    coins = createCoinLayer(coinEl.value, {
      labels: COIN_LABELS,
      radius: mobile ? 28 : 52,
      thickness: mobile ? 7 : 12,
    });
    sizeAll();
    coins.spawn(coinStartXs());
    if (reduced) {
      // 减少动态效果：金币直接推演到静止，并渲染一帧
      const floor = floorFromFooter();
      coins.settle(6, floor);
      coins.frame(0, floor);
    }

    intersection = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    }, { threshold: 0 });
    intersection.observe(rootEl.value);

    resizeObserver = new ResizeObserver(() => sizeAll());
    resizeObserver.observe(stageEl.value);

    rafId = requestAnimationFrame(tick);

    if (!reduced) {
      on(window, 'pointermove', onPointerMove, { passive: true });
      on(window, 'pointermove', onWindowTouchMove, { passive: true });
      on(window, 'pointerup', onWindowTouchEnd);
      on(window, 'pointercancel', onWindowTouchEnd);
      on(window, 'mouseout', onWindowOut);
      on(window, 'blur', onPointerLeave);
      on(stageEl.value, 'pointerdown', onStagePointerDown);
      on(stageEl.value, 'click', onStageClick);
      on(footerEl.value, 'pointerdown', onFooterDown);
    }
  }

  ScrollTrigger.refresh();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  listeners.forEach((off) => off());
  listeners.length = 0;
  intersection?.disconnect();
  resizeObserver?.disconnect();
  ctx?.revert();
  scene?.dispose();
  scene = null;
  coins?.dispose();
  coins = null;
  Object.values(flashTimers).forEach((t) => clearTimeout(t));
});
</script>

<style scoped>
.journey {
  position: relative;
  height: 480vh;
  background: var(--bg);
  color: var(--text);
}

.journey.is-static {
  height: auto;
}

.journey-stage {
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100svh;
  min-height: 560px;
  overflow: hidden;
  isolation: isolate;
  background: var(--bg);
  touch-action: pan-y;
}

.journey.is-static .journey-stage {
  position: relative;
  height: 100vh;
  height: 100svh;
}

.layer {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.layer-hall {
  z-index: 0;
}

.layer-coins {
  z-index: 4;
  pointer-events: none;
}

.journey.is-nogl .layer {
  display: none;
}

.hero-copy {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.eyebrow {
  position: absolute;
  left: var(--pad);
  top: clamp(80px, 10vh, 100px);
  color: var(--gold-3);
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.title {
  position: absolute;
  left: var(--pad);
  top: clamp(108px, 14vh, 145px);
  margin: 0;
  font-size: clamp(75px, 12vw, 180px);
  line-height: 0.88;
  color: var(--text);
  white-space: nowrap;
}

.title .line {
  display: block;
}

.sub {
  position: absolute;
  left: var(--pad);
  top: clamp(340px, 48vh, 520px);
  max-width: 30em;
  font-size: clamp(13px, 1.05vw, 16px);
  line-height: 1.65;
  color: var(--text-2);
  backdrop-filter: blur(8px);
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  border-left: 2px solid var(--gold-3);
}

.sub p {
  margin: 0;
}

.live {
  position: absolute;
  right: var(--pad);
  top: clamp(84px, 11.5vh, 115px);
  z-index: 3;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: right;
  pointer-events: none;
  background: rgba(18, 14, 10, 0.75);
  border: 1px solid rgba(232, 199, 125, 0.22);
  border-radius: 14px;
  padding: 14px 20px;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

:root[data-theme="light"] .live {
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(184, 137, 46, 0.3);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}

.live-row {
  display: grid;
  gap: 2px;
  justify-items: end;
}

.live dt {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
}

.live dd {
  margin: 0;
  font-size: clamp(20px, 1.8vw, 28px);
  font-weight: 600;
  font-family: var(--mono);
  letter-spacing: -0.01em;
  color: var(--text);
}

.flash-up {
  animation: flash-up 1.2s var(--ease-out);
}

.flash-down {
  animation: flash-down 1.2s var(--ease-out);
}

.footer-line {
  position: absolute;
  left: var(--pad);
  bottom: clamp(14px, 2.8vh, 28px);
  z-index: 3;
  width: max-content;
  margin: 0;
  font-size: clamp(48px, 7.2vw, 116px);
  line-height: 0.9;
  color: var(--gold-3);
  white-space: nowrap;
  transform-origin: 50% 50%;
  pointer-events: none;
  opacity: 0.88;
  letter-spacing: 0.02em;
}

.footer-line .mob {
  display: none;
}

.pill-anchor {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 6;
  width: 0;
  height: 0;
  pointer-events: none;
}

.pill-shell {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -100%);
}

.coin-pill {
  height: 44px;
  padding: 0 20px;
  color: var(--gold-3);
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.04em;
  opacity: 0;
  transform: translateY(6px) scale(0.94);
  transition: opacity 0.18s linear, transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
  pointer-events: none;
}

.coin-pill.is-on {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

@media (max-width: 767px) {
  .journey {
    height: 360vh;
  }

  .journey.is-static {
    height: auto;
  }

  .eyebrow {
    left: 18px;
    top: clamp(68px, 9vh, 80px);
    max-width: 260px;
    line-height: 1.4;
    font-size: 11px;
  }

  .title {
    left: 16px;
    top: clamp(92px, 12.2vh, 112px);
    font-size: clamp(48px, 14vw, 70px);
    line-height: 0.92;
  }

  .sub {
    left: 16px;
    right: 16px;
    top: clamp(400px, 49vh, 440px);
    max-width: calc(100% - 32px);
    font-size: 12px;
    line-height: 1.5;
    padding: 8px 12px;
  }

  .live {
    left: 16px;
    right: 16px;
    top: clamp(208px, 25.5vh, 238px);
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    padding: 8px 12px;
    gap: 6px;
    text-align: center;
  }

  .live-row {
    justify-items: center;
  }

  .live dt {
    font-size: 10px;
  }

  .live dd {
    font-size: clamp(15px, 4.2vw, 19px);
  }

  .footer-line {
    left: 16px;
    bottom: clamp(16px, 3vh, 28px);
    font-size: clamp(42px, 13vw, 70px);
    line-height: 0.92;
    pointer-events: auto;
    touch-action: pan-y;
  }

  .footer-line .desk {
    display: none;
  }

  .footer-line .mob {
    display: inline;
  }
}
</style>
