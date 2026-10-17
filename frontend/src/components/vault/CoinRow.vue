<template>
  <section
    id="coin-row"
    ref="rootEl"
    class="coin-row"
    :class="{ 'is-static': reduced, 'is-nogl': noGL }"
    :aria-label="t('vault.row.aria')"
  >
    <div ref="stageEl" class="coin-stage" @pointermove="onMove" @pointerleave="onLeave" @click="onClick">
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
import { ScrollTrigger, prefersReducedMotion } from '../../lib/motion';
import { createCoinLayer, measureCapTop } from '../../lib/vault/coins';
import { prepareFonts } from '../../lib/vault/textures';
import { webglAvailable } from '../../lib/vault/scene';

const props = defineProps({
  labels: { type: Array, default: () => [] },
});
const emit = defineEmits(['select']);

const reduced = prefersReducedMotion();

// 文案随语言切换；昼夜由 useTheme 写入 data-theme，舞台背景通过 var(--bg) 即时跟随，无需重载
const { t } = useI18n();
useTheme();
const noGL = !webglAvailable();
const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

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
let loopRunning = false;
let inView = true;
let dropped = false;
let capOffset = 0;
let trigger = null;
let intersection = null;
let resizeObserver = null;

function emitSelect(index) {
  if (index >= 0) emit('select', index);
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

function spawnXs() {
  const w = stageEl.value?.clientWidth ?? 1200;
  return [0.28, 0.5, 0.72].map((f) => f * w);
}

function sizeAll() {
  const stage = stageEl.value;
  if (!stage || !coins) return;
  const dpr = window.devicePixelRatio || 1;
  coins.setSize(stage.clientWidth, stage.clientHeight, Math.min(dpr, mobile ? 1.5 : 2));
  measureRow();
}

function updatePill() {
  const anchor = anchorEl.value;
  if (!coins || !anchor || hovered.value < 0) return;
  const pos = coins.positions()[hovered.value];
  if (!pos) return;
  anchor.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${(pos.y - pos.r - 14).toFixed(1)}px, 0)`;
}

function tick(now) {
  rafId = requestAnimationFrame(tick);
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 1 / 60;
  lastNow = now;
  if (!inView || document.hidden || !coins) return;

  const floor = rowFloorFn();
  coins.frame(dt, floor);
  updatePill();

  // 全部落定后停止循环，最后一帧已经渲染；金币不回收
  if (coins.isSettled()) {
    cancelAnimationFrame(rafId);
    rafId = 0;
    loopRunning = false;
  }
}

function startLoop() {
  if (loopRunning || !coins) return;
  loopRunning = true;
  lastNow = 0;
  rafId = requestAnimationFrame(tick);
}

// 区块顶部到达视口 35% 时落下
function drop() {
  if (dropped || !coins) return;
  dropped = true;
  coins.spawn(spawnXs());
  startLoop();
}

function onMove(event) {
  if (!coins || !stageEl.value) return;
  const rect = stageEl.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  hovered.value = coins.hitTest(x, y);
  if (hovered.value >= 0) {
    pillIndex.value = hovered.value;
    updatePill();
  }
}

function onLeave() {
  hovered.value = -1;
}

function onClick() {
  if (hovered.value >= 0) emitSelect(hovered.value);
}

onMounted(async () => {
  await prepareFonts();
  if (noGL || props.labels.length === 0) return;

  coins = createCoinLayer(canvasEl.value, {
    labels: props.labels,
    radius: mobile ? 30 : 44,
    thickness: 10,
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
      if (inView && dropped && !loopRunning && !coins.isSettled()) startLoop();
    },
    { threshold: 0 }
  );
  intersection.observe(rootEl.value);

  resizeObserver = new ResizeObserver(() => sizeAll());
  resizeObserver.observe(stageEl.value);

  ScrollTrigger.refresh();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
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

.coin-stage {
  position: relative;
  height: 72vh;
  min-height: 440px;
  overflow: hidden;
  isolation: isolate;
  background: var(--bg);
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

.row-labels {
  position: absolute;
  left: var(--pad);
  right: var(--pad);
  bottom: 7vh;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 56px);
  line-height: 0.9;
  text-transform: uppercase;
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
  .coin-stage {
    height: 64vh;
  }

  .row-labels {
    bottom: 6vh;
    font-size: clamp(22px, 7vw, 36px);
  }
}
</style>
