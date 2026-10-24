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
          <span class="line">{{ t('vault.hero.title2') }}</span>
        </h1>
        <div class="sub">
          <p v-for="(line, i) in subLines" :key="i">
            <span v-for="(seg, j) in line" :key="j" :class="{ num: seg.num }">{{ seg.text }}</span>
          </p>
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
        <span class="mob">{{ t('vault.footer.m1') }} · {{ t('vault.footer.m2') }}</span>
      </p>

      <canvas ref="coinEl" class="layer layer-coins" aria-hidden="true"></canvas>

      <!-- 无 WebGL：用扁平的静态金条代替三维场景，位置与三维金条一致，不用渐变 -->
      <svg v-if="noGL" class="nogl-ingot" viewBox="0 0 240 120" aria-hidden="true" focusable="false">
        <path d="M24 74 L44 46 H196 L216 74 Z" style="fill: var(--gold-3)" />
        <path d="M24 74 H216 V108 H24 Z" style="fill: var(--gold-2)" />
        <rect x="92" y="60" width="56" height="10" style="fill: var(--gold-deep)" />
      </svg>

      <div ref="anchorEl" class="pill-anchor">
        <div class="pill-shell">
          <button
            type="button"
            class="pill coin-pill"
            :class="{ 'is-on': hovered >= 0 }"
            :tabindex="hovered >= 0 ? 0 : -1"
            @click.stop="navigate"
          >
            {{ pillText }}
            <Icon name="arrow-up-right" :size="14" class="pill-arrow" />
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
import { gsap, ScrollTrigger, prefersReducedMotion, hasFinePointer, isPhoneWidth } from '../../lib/motion';
import { createVaultScene, webglAvailable } from '../../lib/vault/scene';
import { createCoinLayer, measureCapTop } from '../../lib/vault/coins';
import { prepareFonts } from '../../lib/vault/textures';
import Icon from '../icons/Icon.vue';

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
const anchorEl = ref(null);

// 运行模式在 setup 时确定
const reduced = prefersReducedMotion(); // 减少动态效果
const noGL = !webglAvailable(); // 无 WebGL：只显示文字
const mobile = isPhoneWidth(); // 手机：一屏静态首屏，不钉住、不做滚动驱动
const finePointer = hasFinePointer(); // 悬停型指针：视差与金币悬停
const isStatic = reduced || noGL;
// 桌面端滚动驱动（钉住 + scrub）；手机与静态模式不做滚动驱动
const scrubbed = !reduced && !noGL && !mobile;
// 减少动态时桌面保留静态金库构图；手机只渲染金条，不绘制金库
const sceneReduced = reduced && !mobile;

const { t } = useI18n();
const { resolved } = useTheme();

// 说明文字：数字与代码（AU9999、XAU/USD）用等宽体，其余为无衬线正文
const NUM_TOKEN = /([A-Z0-9]*\d[A-Z0-9./]*|[A-Z]{2,}\/[A-Z]{2,})/;
const subLines = computed(() =>
  [1, 2, 3, 4].map((n) =>
    String(t(`vault.hero.sub${n}`))
      .split(NUM_TOKEN)
      .map((text, i) => ({ text, num: i % 2 === 1 }))
      .filter((seg) => seg.text)
  )
);

// 昼夜切换：等 data-theme 写入后读取纸本底色（--bg），更新金库调色板，不重载页面
async function applyTheme() {
  await nextTick();
  const base = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f6f3ec';
  scene?.setTheme(resolved.value, base);
  wake();
}
watch(resolved, applyTheme);

// ---------------- 实时数值：数字滚动 + 涨跌闪色（只改颜色，不铺背景） ----------------
const tweened = reactive({ domestic: null, intl: null, premium: null });
const flashes = reactive({ domestic: '', intl: '', premium: '' });
const flashTimers = {};
let mounted = false;

const priceText = (v, prefix) =>
  v == null ? '--' : `${prefix}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const live = computed(() => ({
  domestic: priceText(tweened.domestic, '¥'),
  intl: priceText(tweened.intl, '$'),
  premium: tweened.premium == null ? '--' : `${tweened.premium >= 0 ? '+' : ''}${tweened.premium.toFixed(2)}%`,
}));

function flash(key, cls) {
  if (!mounted) return;
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
  wake();
});
const pillText = computed(() => {
  const values = [live.value.domestic, live.value.intl, live.value.premium];
  return `${COIN_LABELS[pillIndex.value]} ${values[pillIndex.value]}`;
});

function navigate() {
  document.getElementById('workspace')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

// ---------------- 场景与帧循环 ----------------
// 帧循环按需运行：只有滚动、指针、尺寸、昼夜或金币尚未落定时才请求下一帧。
// 离开视口、页面隐藏或全部静止后即停止，不做无用绘制。
let scene = null;
let coins = null;
let rafId = 0;
let lastNow = 0;
let inView = true;
let intersection = null;
let resizeObserver = null;
let ctx = null;
const listeners = [];

// progress：桌面端由 ScrollTrigger（scrub）驱动；手机与静态模式保持 0
const progress = { p: 0 };
const footer = { angle: 0, capOffset: 0 };
// 指针目标（-1..1）与三组平滑后的视差
const aim = { x: 0, y: 0 };
const look = {
  hero: { x: 0, y: 0 },
  footer: { x: 0, y: 0 },
  tunnel: { x: 0, y: 0 },
};
const LOOK_TAU = { hero: 0.22, footer: 0.16, tunnel: 0.2 };

// 指数逼近：每帧向目标靠近，足够近时取目标值，便于判断视差是否已经静止
function approach(current, target, dt, tau) {
  const next = current + (target - current) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 1e-3 ? target : next;
}

// 返回 true 表示视差仍在移动；进度超过 0.94 后视差回到中立
function stepLook(dt) {
  const stopped = progress.p >= 0.94;
  const tx = stopped ? 0 : aim.x;
  const ty = stopped ? 0 : aim.y;
  let moving = false;
  for (const key of ['hero', 'footer', 'tunnel']) {
    const g = look[key];
    const nx = approach(g.x, tx, dt, LOOK_TAU[key]);
    const ny = approach(g.y, ty, dt, LOOK_TAU[key]);
    if (nx !== g.x || ny !== g.y) moving = true;
    g.x = nx;
    g.y = ny;
  }
  return moving;
}

function setAim(x, y) {
  aim.x = x;
  aim.y = y;
  wake();
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

// 页脚视差（桌面）：translateX = lookX × −22px，rotate = lookX × 0.105 rad，translateY = lookY × −14px − 6px
// 手机保持原位：不位移、不倾斜
function applyFooter(strength) {
  const el = footerEl.value;
  if (!el) return;
  if (mobile) {
    el.style.transform = '';
    footer.angle = 0;
    return;
  }
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
  const dpr = window.devicePixelRatio || 1;
  // 金库画布跟随自身盒子：桌面为整屏，手机为首屏中的视觉区
  scene?.setSize(hallEl.value?.clientWidth || 1, hallEl.value?.clientHeight || 1, dpr);
  coins?.setSize(stage.clientWidth, stage.clientHeight, Math.min(dpr, mobile ? 1.5 : 2));
  measureFooter();
  // 金币已静止时，尺寸变化后重新贴到新的地面
  if (coins?.isSettled()) {
    const floor = floorFromFooter();
    coins.settle(0.6, floor);
    coins.frame(0, floor);
  }
  wake();
}

function coinStartXs() {
  const w = stageEl.value?.clientWidth ?? 1440;
  const fractions = mobile ? [0.22, 0.5, 0.78] : [0.18, 0.5, 0.82];
  return fractions.map((f) => f * w);
}

function updatePill() {
  const anchor = anchorEl.value;
  if (!coins || !anchor || hovered.value < 0) return;
  const pos = coins.positions()[hovered.value];
  if (!pos) return;
  anchor.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${(pos.y - pos.r - 14).toFixed(1)}px, 0)`;
}

// 退场：p 0.03 → 0.16 与金条同步；减少动态时不退场
function exitProgress(p) {
  return reduced ? 0 : smooth(0.03, 0.16, p);
}

// 一帧的全部绘制：文字淡出（仅桌面滚动）、页脚视差、金库、金币与悬停胶囊
function renderFrame(dt) {
  const p = mobile ? 0 : progress.p;

  if (scrubbed) {
    // 进度 0.04 → 0.16：HTML 标题、实时数值与页脚平滑淡出，避免突兀消失
    const alpha = clamp(1 - (p - 0.04) / 0.12, 0, 1);
    const shown = alpha > 0.005;
    for (const el of [copyEl.value, liveEl.value, footerEl.value]) {
      if (!el) continue;
      el.style.opacity = alpha.toFixed(3);
      el.style.visibility = shown ? 'visible' : 'hidden';
    }
  }

  const strength = scrubbed ? 1 - smooth(0.035, 0.11, p) : 0;
  applyFooter(strength);

  scene?.render({
    p,
    reduced: sceneReduced,
    look: { x: look.hero.x * strength, y: look.hero.y * strength },
    tunnelLook: { x: look.tunnel.x, y: look.tunnel.y },
  });

  if (coins) {
    coins.setExit(exitProgress(p));
    coins.frame(dt, floorFromFooter());
    updatePill();
  }
}

function canRun() {
  return (scene !== null || coins !== null) && inView && !document.hidden;
}

function tick(now) {
  rafId = 0;
  if (!canRun()) {
    lastNow = 0;
    return;
  }
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 1 / 60;
  lastNow = now;
  const moving = stepLook(dt);
  renderFrame(dt);
  if (moving || (coins && !coins.isSettled())) {
    rafId = requestAnimationFrame(tick);
  } else {
    lastNow = 0;
  }
}

// 请求一帧；已经排队或不可见时不重复请求
function wake() {
  if (rafId || !canRun()) return;
  rafId = requestAnimationFrame(tick);
}

// 悬停型指针：视差与金币悬停（触摸设备不启用）
function onPointerMove(event) {
  if (reduced || noGL) return;
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
  setAim(clamp((localX / rect.width) * 2 - 1, -1, 1), clamp(-((localY / rect.height) * 2 - 1), -1, 1));
  hovered.value = coins ? coins.hitTest(localX, localY) : -1;
}

function onPointerLeave() {
  setAim(0, 0);
  hovered.value = -1;
}

function onWindowOut(event) {
  if (!event.relatedTarget) onPointerLeave();
}

// 按下时检测命中的金币（触摸与鼠标共用），用于显示胶囊
function onStagePointerDown(event) {
  if (!coins || !stageEl.value) return;
  const rect = stageEl.value.getBoundingClientRect();
  hovered.value = coins.hitTest(event.clientX - rect.left, event.clientY - rect.top);
}

// 点击直接按坐标判断命中，不依赖悬停状态（触摸的 pointerleave 会先于 click 发生）
function onStageClick(event) {
  if (!coins || !stageEl.value) return;
  const rect = stageEl.value.getBoundingClientRect();
  if (coins.hitTest(event.clientX - rect.left, event.clientY - rect.top) >= 0) navigate();
}

function onVisibility() {
  if (!document.hidden) wake();
}

function on(target, type, fn, options) {
  target.addEventListener(type, fn, options);
  listeners.push(() => target.removeEventListener(type, fn, options));
}

watch(
  () => props.bars,
  (next) => {
    scene?.setBars(next);
    wake();
  }
);

onMounted(async () => {
  await prepareFonts();
  measureFooter();

  ctx = gsap.context(() => {
    if (scrubbed) {
      gsap.to(progress, {
        p: 1,
        ease: 'none',
        onUpdate: wake,
        scrollTrigger: { trigger: rootEl.value, start: 'top top', end: 'bottom bottom', scrub: 0.55 },
      });
    }
  }, rootEl.value);

  if (!noGL) {
    scene = createVaultScene(hallEl.value, { mobile, bars: props.bars });
    coins = createCoinLayer(coinEl.value, {
      labels: COIN_LABELS,
      radius: mobile ? 28 : 46,
      thickness: mobile ? 7 : 11,
      gravity: 1400,
      restitution: 0.16,
    });
    applyTheme();
    sizeAll();
    coins.spawn(coinStartXs());
    if (reduced) {
      // 减少动态效果：金币直接推演到静止，不播放落下过程
      const floor = floorFromFooter();
      coins.settle(6, floor);
      coins.frame(0, floor);
    }

    intersection = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) wake();
      },
      { threshold: 0 }
    );
    intersection.observe(rootEl.value);

    resizeObserver = new ResizeObserver(() => sizeAll());
    resizeObserver.observe(stageEl.value);

    on(document, 'visibilitychange', onVisibility);
    if (finePointer && !mobile && !reduced) {
      on(window, 'pointermove', onPointerMove, { passive: true });
      on(window, 'mouseout', onWindowOut);
      on(window, 'blur', onPointerLeave);
    }
    on(stageEl.value, 'pointerdown', onStagePointerDown);
    on(stageEl.value, 'click', onStageClick);
  }

  mounted = true;
  ScrollTrigger.refresh();
  wake();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  rafId = 0;
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
  height: 170vh;
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

.nogl-ingot {
  display: none;
}

.journey.is-nogl .nogl-ingot {
  display: block;
  position: absolute;
  left: 50%;
  top: 72%;
  width: min(62vw, 300px);
  height: auto;
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
}

@media (min-width: 768px) {
  .journey.is-nogl .nogl-ingot {
    left: 66%;
    top: 44%;
    width: min(26vw, 380px);
  }
}

/* 标题、说明为一列自上而下排布：说明永远在标题下方，不会互相覆盖 */
.hero-copy {
  position: absolute;
  left: var(--pad);
  top: clamp(80px, 10vh, 100px);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: min(46vw, 640px);
  pointer-events: none;
}

.eyebrow {
  margin: 0 0 clamp(12px, 1.8vh, 18px);
  color: var(--text-2);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  word-break: keep-all;
}

.title {
  margin: 0 0 clamp(18px, 3.4vh, 32px);
  font-family: var(--font-display);
  font-size: clamp(56px, 8vw, 112px);
  font-weight: 600;
  line-height: 1.02;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--text);
  white-space: nowrap;
}

.title .line {
  display: block;
}

.sub {
  max-width: 32em;
  padding: 14px 18px;
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-2);
  word-break: keep-all;
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  border: 1px solid var(--line);
}

.sub p {
  margin: 0;
}

.sub .num {
  font-family: var(--font-mono);
  font-size: 0.93em;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  color: var(--text);
}

:lang(zh) .sub {
  line-height: 1.75;
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
  background: var(--surface-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 14px 20px;
}

.live-row {
  display: grid;
  gap: 2px;
  justify-items: end;
}

.live dt {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-2);
}

.live dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: clamp(20px, 1.8vw, 28px);
  font-weight: 500;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
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
  font-family: var(--font-display);
  font-size: clamp(40px, 4.6vw, 64px);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--text);
  white-space: nowrap;
  transform-origin: 50% 50%;
  pointer-events: none;
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--gold);
  border-radius: 2px;
  background: color-mix(in srgb, var(--gold) 12%, var(--surface-card));
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.18s linear, visibility 0s linear 0.18s;
  pointer-events: none;
}

.coin-pill.is-on {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition-delay: 0s;
}

.pill-arrow {
  flex-shrink: 0;
}

/* 中文界面：标签不大写、不加字距；展示字保持衬线，界面字用无衬线 */
:lang(zh) .eyebrow,
:lang(zh) .live dt {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

:lang(zh) .title,
:lang(zh) .footer-line {
  letter-spacing: 0;
}

/* 手机：一屏静态首屏（无钉住、无滚动驱动）。自上而下：眉题 → 标题 → 实时数值 → 说明 → 金条 → 页脚 */
@media (max-width: 767px) {
  .journey,
  .journey.is-static {
    height: auto;
  }

  .journey-stage,
  .journey.is-static .journey-stage {
    position: relative;
    top: auto;
    height: auto;
    min-height: 100vh;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    padding: calc(var(--nav-h) + 14px) 16px calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .hero-copy {
    display: contents;
  }

  .eyebrow {
    order: 1;
    margin: 0 0 12px;
    font-size: 11px;
    line-height: 1.4;
    letter-spacing: 0.14em;
  }

  .title {
    order: 2;
    margin: 0 0 16px;
    font-size: 56px;
    line-height: 1;
  }

  .live {
    order: 3;
    position: static;
    margin: 0 0 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    padding: 10px 6px;
    text-align: center;
  }

  .live-row {
    justify-items: center;
    gap: 4px;
  }

  .live-row + .live-row {
    border-left: 1px solid var(--line);
  }

  .live dt {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-wrap: balance;
  }

  .live dd {
    font-size: clamp(15px, 4.6vw, 19px);
  }

  .sub {
    order: 4;
    position: static;
    max-width: none;
    margin: 0 0 16px;
    padding: 12px 14px;
    font-size: 15px;
    line-height: 1.6;
  }

  .sub p:nth-child(n + 3) {
    margin-top: 6px;
    font-size: 13px;
    line-height: 1.5;
  }

  /* 金条视觉：占满首屏剩余高度，最低 200px */
  .layer-hall {
    order: 5;
    position: relative;
    inset: auto;
    flex: 1 1 0;
    width: 100%;
    height: 0;
    min-height: 200px;
  }

  .footer-line {
    order: 6;
    position: relative;
    left: auto;
    bottom: auto;
    z-index: auto;
    width: 100%;
    margin: 0;
    font-size: clamp(34px, 9vw, 40px);
    line-height: 1.1;
    white-space: normal;
  }

  .footer-line .desk {
    display: none;
  }

  .footer-line .mob {
    display: inline;
  }

  /* 无 WebGL：金条占用 layer-hall 原来的位置（副标题与页脚之间），不再绝对定位覆盖说明与页脚 */
  .journey.is-nogl .nogl-ingot {
    order: 5;
    position: relative;
    left: auto;
    top: auto;
    transform: none;
    align-self: center;
    flex: 1 1 auto;
    min-height: 160px;
    width: min(62vw, 300px);
    z-index: auto;
  }
}
</style>
