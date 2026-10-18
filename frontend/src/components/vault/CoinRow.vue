<template>
  <section
    id="coin-row"
    ref="rootEl"
    class="coin-row"
    :class="{ 'is-static': reduced, 'is-nogl': noGL }"
    :aria-label="t('vault.row.aria')"
  >
    <div
      ref="stageEl"
      class="coin-stage"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerleave="onLeave"
      @click="onClick"
    >
      <canvas ref="canvasEl" class="layer" aria-hidden="true"></canvas>

      <ul ref="rowEl" class="row-labels">
        <li v-for="label in labels" :key="label">{{ label }}</li>
      </ul>

      <div ref="anchorEl" class="pill-anchor">
        <div class="pill-shell">
          <button
            type="button"
            class="pill coin-pill"
            :class="{ 'is-on': hovered >= 0 }"
            :tabindex="hovered >= 0 ? 0 : -1"
            @click.stop="emitSelect(pillIndex)"
          >
            {{ pillText }} ↗
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from '../../i18n';
import { useTheme } from '../../composables/useTheme';
import { ScrollTrigger, prefersReducedMotion, isPhoneWidth } from '../../lib/motion';
import { createCoinLayer, measureCapTop } from '../../lib/vault/coins';
import { prepareFonts } from '../../lib/vault/textures';
import { webglAvailable } from '../../lib/vault/scene';

const props = defineProps({
  labels: { type: Array, default: () => [] },
});
const emit = defineEmits(['select']);

const reduced = prefersReducedMotion();

// 文案随语言切换；昼夜由 useTheme 写入 data-theme，舞台背景通过 var(--bg) 即时跟随
const { t } = useI18n();
useTheme();
const noGL = !webglAvailable();
const mobile = isPhoneWidth();
const radius = mobile ? 24 : 40;
const thickness = mobile ? 6 : 9;

const rootEl = ref(null);
const stageEl = ref(null);
const canvasEl = ref(null);
const rowEl = ref(null);
const anchorEl = ref(null);

const hovered = ref(-1);
const pillIndex = ref(0);
const pillText = computed(() => props.labels[pillIndex.value] ?? '');

let coins = null;
let rafId = 0;
let lastNow = 0;
let inView = true;
let dropped = false;
let capOffset = 0;
let trigger = null;
let intersection = null;
let resizeObserver = null;
const listeners = [];

function emitSelect(index) {
  if (index >= 0) emit('select', index);
}

function setHover(index) {
  hovered.value = index;
  if (index >= 0) pillIndex.value = index;
  updatePill();
}

function measureRow() {
  const row = rowEl.value;
  if (!row) return;
  const item = row.querySelector('li') ?? row;
  const cs = getComputedStyle(item);
  const fontSize = parseFloat(cs.fontSize);
  let lineHeight = parseFloat(cs.lineHeight);
  if (!Number.isFinite(lineHeight)) lineHeight = fontSize * 1.2;
  capOffset = measureCapTop(fontSize, lineHeight);
}

// 地面：标签行的帽线（画布坐标），没有倾斜
function rowFloorFn() {
  const canvas = canvasEl.value;
  const row = rowEl.value;
  if (!canvas || !row) return null;
  const level = row.getBoundingClientRect().top - canvas.getBoundingClientRect().top + capOffset;
  return () => level;
}

// 每枚金币落在自己标签的正上方：取各标签中心的横坐标
function spawnXs() {
  const stage = stageEl.value;
  if (!stage) return [];
  const items = rowEl.value ? [...rowEl.value.querySelectorAll('li')] : [];
  if (items.length === 0) {
    const w = stage.clientWidth;
    return props.labels.map((_, i) => ((i + 0.5) / props.labels.length) * w);
  }
  const origin = stage.getBoundingClientRect().left;
  return items.map((li) => {
    const r = li.getBoundingClientRect();
    return r.left + r.width / 2 - origin;
  });
}

function sizeAll() {
  const stage = stageEl.value;
  if (!stage || !coins) return;
  const dpr = window.devicePixelRatio || 1;
  coins.setSize(stage.clientWidth, stage.clientHeight, Math.min(dpr, mobile ? 1.5 : 2));
  measureRow();
  // 金币已静止时，尺寸变化后重新贴到新的标签线上
  if (coins.isSettled()) {
    const floor = rowFloorFn();
    coins.settle(0.6, floor);
    coins.frame(0, floor);
  }
  wake();
}

function updatePill() {
  const anchor = anchorEl.value;
  if (!coins || !anchor || hovered.value < 0) return;
  const pos = coins.positions()[hovered.value];
  if (!pos) return;
  anchor.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${(pos.y - pos.r - 14).toFixed(1)}px, 0)`;
}

// 循环只在“已落下、在视口内、页面可见、金币未静止”时运行
function canRun() {
  return coins !== null && dropped && inView && !document.hidden;
}

function tick(now) {
  rafId = 0;
  if (!canRun()) {
    lastNow = 0;
    return;
  }
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 1 / 60;
  lastNow = now;
  coins.frame(dt, rowFloorFn());
  updatePill();
  // 全部落定即停止循环，最后一帧已经渲染，金币保持在标签上
  if (coins.isSettled()) {
    lastNow = 0;
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function wake() {
  if (rafId || !canRun() || coins.isSettled()) return;
  rafId = requestAnimationFrame(tick);
}

// 区块顶部到达视口 35% 时落下，只落一次
function drop() {
  if (dropped || !coins) return;
  dropped = true;
  coins.spawn(spawnXs());
  lastNow = 0;
  wake();
}

function onDown(event) {
  // 触摸没有悬停：按下时检测命中，点击时再据坐标确认
  if (!coins || !stageEl.value) return;
  const rect = stageEl.value.getBoundingClientRect();
  setHover(coins.hitTest(event.clientX - rect.left, event.clientY - rect.top));
}

function onMove(event) {
  if (!coins || !stageEl.value || event.pointerType === 'touch') return;
  const rect = stageEl.value.getBoundingClientRect();
  setHover(coins.hitTest(event.clientX - rect.left, event.clientY - rect.top));
}

function onLeave() {
  setHover(-1);
}

// 点击按坐标判断命中，不依赖悬停状态（触摸的 pointerleave 先于 click 发生）
function onClick(event) {
  if (!coins || !stageEl.value) return;
  const rect = stageEl.value.getBoundingClientRect();
  emitSelect(coins.hitTest(event.clientX - rect.left, event.clientY - rect.top));
}

onMounted(async () => {
  await prepareFonts();
  if (noGL || props.labels.length === 0) return;

  coins = createCoinLayer(canvasEl.value, {
    labels: props.labels,
    radius,
    thickness,
  });
  sizeAll();

  if (reduced) {
    // 减少动态效果：直接落定在标签行上，不播放下落过程
    const floor = rowFloorFn();
    coins.spawn(spawnXs());
    coins.settle(6, floor);
    coins.frame(0, floor);
  } else {
    trigger = ScrollTrigger.create({
      trigger: rootEl.value,
      start: 'top 35%',
      once: true,
      onEnter: drop,
    });
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

  const onVisibility = () => {
    if (!document.hidden) wake();
  };
  document.addEventListener('visibilitychange', onVisibility);
  listeners.push(() => document.removeEventListener('visibilitychange', onVisibility));

  ScrollTrigger.refresh();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  rafId = 0;
  listeners.forEach((off) => off());
  listeners.length = 0;
  trigger?.kill();
  intersection?.disconnect();
  resizeObserver?.disconnect();
  coins?.dispose();
  coins = null;
});
</script>

<style scoped>
.coin-row {
  position: relative;
}

/* 桌面：约 1/3 屏高，不超过 340px；手机见下方媒体查询 */
.coin-stage {
  position: relative;
  height: clamp(280px, 36vh, 340px);
  overflow: hidden;
  isolation: isolate;
  background: var(--bg);
  touch-action: pan-y;
}

.layer {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.coin-row.is-nogl .layer {
  display: none;
}

/* 标签贴在舞台底部；金币落在标签的帽线上，并位于各自标签的正上方 */
.row-labels {
  position: absolute;
  left: var(--pad);
  right: var(--pad);
  bottom: 22px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-display);
  font-size: clamp(26px, 3.1vw, 44px);
  line-height: 0.9;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--text);
  pointer-events: none;
}

.row-labels li {
  margin: 0;
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
  visibility: hidden;
  transform: translateY(6px) scale(0.94);
  transition: opacity 0.18s linear, transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s linear 0.18s;
  pointer-events: none;
}

.coin-pill.is-on {
  opacity: 1;
  visibility: visible;
  transform: none;
  pointer-events: auto;
  transition-delay: 0s;
}

/* 无 WebGL：不占用舞台高度，标签按文字流排列 */
.coin-row.is-nogl .coin-stage {
  height: auto;
  padding: 28px 0 22px;
}

.coin-row.is-nogl .row-labels {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  margin: 0 var(--pad);
}

@media (max-width: 767px) {
  .coin-stage {
    height: clamp(220px, 30vh, 250px);
  }

  .row-labels {
    bottom: 16px;
    font-size: clamp(20px, 6vw, 26px);
  }
}
</style>
