<template>
  <section id="modules" class="modules" data-reveal aria-labelledby="title-modules">
    <SectionHead
      index="00"
      :tag="t('modules.tag')"
      :title="t('modules.title')"
      title-id="title-modules"
      :sub="t('modules.sub')"
    />

    <div ref="listRef" class="modules-list">
      <ul class="rows" role="list">
        <li v-for="(item, i) in MODULES" :key="item.key">
          <button
            :ref="(el) => setRow(el, i)"
            type="button"
            class="row"
            :class="{ 'is-active': i === active }"
            :aria-current="i === active ? 'true' : undefined"
            @pointerenter="select(i)"
            @focus="select(i)"
            @click="go(i)"
          >
            <span class="row-index label">{{ item.index }}</span>
            <span class="row-name display">{{ t(item.nameKey) }}</span>
            <span class="row-meta">
              <span class="row-services label">{{ t(item.servicesKey) }}</span>
            </span>
            <span class="row-arrow" aria-hidden="true"><Icon name="arrow-up-right" :size="16" /></span>
          </button>
        </li>
      </ul>

      <figure ref="previewRef" class="preview" aria-hidden="true">
        <canvas ref="canvasRef" class="preview-canvas"></canvas>
        <figcaption class="label preview-caption">{{ t(MODULES[active].captionKey) }}</figcaption>
      </figure>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import SectionHead from './SectionHead.vue';
import Icon from './icons/Icon.vue';
import { gsap, prefersReducedMotion } from '../lib/motion';
import { useI18n } from '../i18n';
import { useTheme } from '../composables/useTheme';

const props = defineProps({
  // 量化结果（国内 AU9999），用于生成预览序列；为空时预览显示占位
  cn: { type: Object, default: null },
});

const { t, locale } = useI18n();
// 昼夜切换时重绘画布，使调色盘跟随主题
const { resolved } = useTheme();

// 每个模块对应一个仪表盘区块（target 为 section 的 id）；文案走 i18n 键
const MODULES = [
  {
    key: 'signal',
    index: '01',
    nameKey: 'modules.signal.name',
    servicesKey: 'modules.signal.services',
    captionKey: 'modules.signal.caption',
    target: 'sec-quant',
  },
  {
    key: 'basis',
    index: '02',
    nameKey: 'modules.basis.name',
    servicesKey: 'modules.basis.services',
    captionKey: 'modules.basis.caption',
    target: 'sec-charts',
  },
  {
    key: 'backtest',
    index: '03',
    nameKey: 'modules.backtest.name',
    servicesKey: 'modules.backtest.services',
    captionKey: 'modules.backtest.caption',
    target: 'sec-charts',
  },
  {
    key: 'position',
    index: '04',
    nameKey: 'modules.position.name',
    servicesKey: 'modules.position.services',
    captionKey: 'modules.position.caption',
    target: 'sec-tools',
  },
  {
    key: 'brief',
    index: '05',
    nameKey: 'modules.brief.name',
    servicesKey: 'modules.brief.services',
    captionKey: 'modules.brief.caption',
    target: 'sec-overview',
  },
];

const active = ref(0);
const listRef = ref(null);
const previewRef = ref(null);
const canvasRef = ref(null);
const rows = [];

function setRow(el, index) {
  if (el) rows[index] = el;
}

// 预览序列：信号用综合评分，溢价用溢价序列，其余用收盘价
const series = computed(() => {
  const q = props.cn;
  if (!q?.available) return [];
  const key = MODULES[active.value].key;
  let values;
  if (key === 'signal') values = (q.indicators?.score ?? []);
  else if (key === 'basis') values = (q.premium?.series ?? []).map((p) => p.value);
  else values = (q.bars ?? []).map((b) => b.close);
  return values.filter((v) => Number.isFinite(v)).slice(-90);
});

const cssVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

function paint() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const gold = cssVar('--gold', '#e8c77d');
  const hairline = cssVar('--line', 'rgba(232,199,125,0.12)');
  const muted = cssVar('--text-3', '#6e6a62');

  ctx.strokeStyle = hairline;
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    const y = Math.round((height / 4) * i) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const values = series.value;
  if (values.length < 2) {
    ctx.fillStyle = muted;
    // 占位文案是正文，用无衬线字体；画布不读取 CSS 变量，字体栈写定在此
    ctx.font = "11px 'IBM Plex Sans', 'Noto Sans SC', sans-serif";
    // 英文文案较长：窄画布下按 maxWidth 压缩，避免被裁切
    ctx.fillText(t('modulesPreview.empty'), 14, 24, width - 28);
    return;
  }

  const pad = 14;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v) => height - pad - ((v - min) / span) * (height - pad * 2);

  // 信号模块：0 轴虚线，正负一目了然
  if (MODULES[active.value].key === 'signal' && min < 0 && max > 0) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = muted;
    ctx.beginPath();
    ctx.moveTo(0, y(0));
    ctx.lineTo(width, y(0));
    ctx.stroke();
    ctx.restore();
  }

  // 面积与折线：单色填充，不使用渐变
  ctx.beginPath();
  values.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
  ctx.lineTo(x(values.length - 1), height - pad);
  ctx.lineTo(x(0), height - pad);
  ctx.closePath();
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  values.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x(values.length - 1), y(values[values.length - 1]), 3.5, 0, Math.PI * 2);
  ctx.fillStyle = gold;
  ctx.fill();
}

// 预览框跟随当前行上下移动：一个 GSAP y 补间，0.45s，power3.out
function movePreview(index) {
  const row = rows[index];
  const preview = previewRef.value;
  const list = listRef.value;
  if (!row || !preview || !list) return;
  const previewHeight = preview.offsetHeight;
  const target = Math.max(
    0,
    Math.min(list.offsetHeight - previewHeight, row.offsetTop + row.offsetHeight / 2 - previewHeight / 2)
  );
  if (prefersReducedMotion()) {
    gsap.set(preview, { y: target });
    return;
  }
  gsap.to(preview, { y: target, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
}

function select(index) {
  if (index === active.value) return;
  active.value = index;
  movePreview(index);
}

function go(index) {
  const target = document.getElementById(MODULES[index].target);
  if (target) target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

watch([series, active, locale, resolved], () => nextTick(paint));

let observer = null;
onMounted(() => {
  nextTick(() => {
    movePreview(active.value);
    paint();
  });
  if (typeof ResizeObserver !== 'undefined' && canvasRef.value) {
    observer = new ResizeObserver(() => paint());
    observer.observe(canvasRef.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (previewRef.value) gsap.killTweensOf(previewRef.value);
});
</script>

<style scoped>
.modules {
  padding-top: clamp(56px, 8vw, 104px);
  border-top: 1px solid var(--line);
  scroll-margin-top: calc(var(--nav-h) + var(--ticker-h) + 16px);
}

.modules-list {
  position: relative;
}

@media (min-width: 900px) {
  .modules-list {
    padding-right: calc(min(30vw, 440px) + 48px);
  }
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--line-strong);
}

.row {
  position: relative;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 28px;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 16px;
  row-gap: 6px;
  width: 100%;
  padding: clamp(14px, 1.6vw, 20px) 0;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--text-3);
  text-align: left;
  cursor: pointer;
  transition: color 0.2s ease;
}

.row-index {
  grid-column: 1;
  grid-row: 1 / span 2;
  align-self: start;
  padding-top: 0.3em;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

/* 模块名：展示字，保留原大小写，不用大写与渐变；中英文共用同一展示字 */
.row-name {
  grid-column: 2;
  grid-row: 1;
  font-family: var(--font-display);
  font-size: clamp(24px, 2.6vw, 42px);
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.01em;
  text-transform: none;
  color: inherit;
  transition: color 0.2s ease;
}

:lang(zh) .row-name {
  letter-spacing: 0;
}

.row.is-active {
  color: var(--text);
}

/* 激活行只用纯色金令牌标出，不做位移 */
.row.is-active .row-name {
  color: var(--gold-text);
}

.row-meta {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 16px;
  text-align: left;
}

.row-services {
  font-size: 11px;
  line-height: 1.6;
}

:lang(zh) .row-services {
  font-family: var(--font);
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.row-arrow {
  grid-column: 3;
  grid-row: 1 / span 2;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  transition: color 0.2s ease;
}

.row.is-active .row-arrow {
  color: var(--gold);
}

.preview {
  display: none;
  margin: 0;
  pointer-events: none;
  will-change: transform;
}

@media (min-width: 900px) {
  .preview {
    display: block;
    position: absolute;
    top: 0;
    right: 0;
    width: min(30vw, 440px);
  }
}

.preview-canvas {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
}

.preview-caption {
  display: block;
  margin-top: 10px;
}

:lang(zh) .preview-caption {
  font-family: var(--font);
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

/* 手机：模块行压缩到约 70px，名称 28–32px 单行，中文词不在中间断开 */
@media (max-width: 767px) {
  .modules {
    padding-top: 40px;
  }

  .row {
    grid-template-columns: 28px minmax(0, 1fr) 18px;
    column-gap: 10px;
    row-gap: 3px;
    padding: 9px 0;
  }

  .row-index {
    align-self: center;
    padding-top: 0;
    font-size: 12px;
  }

  .row-name {
    font-size: clamp(28px, 8vw, 32px);
    line-height: 1.1;
    word-break: keep-all;
  }

  .row-meta {
    display: block;
    min-width: 0;
  }

  .row-services {
    display: block;
    font-size: 11px;
    line-height: 1.4;
    letter-spacing: 0.04em;
  }

  .row-arrow {
    color: var(--text-3);
  }

  .row.is-active .row-arrow {
    color: var(--gold);
  }
}
</style>
