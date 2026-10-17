<template>
  <section id="hero" class="cinematic-hero panel" aria-label="黄金量化终端全景全屏视界">
    <!-- 全屏边缘贴合视频背景 -->
    <video
      ref="videoRef"
      class="hero-video video-cover"
      src="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/0a285ef6-17e3-443b-a3e3-bf043fcf6952.mp4"
      muted
      playsinline
      autoplay
      loop
      preload="auto"
      :class="{ loaded: videoLoaded }"
      @loadeddata="onVideoLoaded"
    ></video>

    <!-- 电影感黑金径向暗角与流光层 -->
    <div class="video-overlay" aria-hidden="true"></div>

    <!-- 顶部状态浮动胶囊 -->
    <div class="hero-top-bar">
      <div class="hero-brand">
        <span class="gold-box">Au</span>
        <span class="brand-text">PLUME × GOLD QUANTUM</span>
      </div>

      <div class="hero-live-pill">
        <span class="live-pulse"></span>
        <span class="live-title">LIVE FEED</span>
        <span class="live-sep">·</span>
        <span class="live-data">
          AU9999 ¥{{ fmtPrice(domesticPrice) }}
          <span :class="toneOf(domesticChange)">({{ fmtSigned(domesticChange) }}%)</span>
        </span>
      </div>
    </div>

    <!-- 核心文字排版（桌面端绝对定位，移动端流式自适应） -->
    <div class="hero-content panel-content">
      <!-- 主标题 -->
      <h1 class="display h-title">
        <span class="clip in"><span>Pure Gold.</span></span>
        <span class="clip in"><span class="grad-text">Precision Quant.</span></span>
      </h1>

      <!-- 实时双源锁定位与溢价 -->
      <div class="h-mats rv in">
        <div class="mat-line">
          <span class="mat-label">AU9999 现货</span>
          <span class="mat-val gold">¥{{ fmtPrice(domesticPrice) }} /g</span>
        </div>
        <div class="mat-line">
          <span class="mat-label">XAU/USD 国际</span>
          <span class="mat-val blue">${{ fmtPrice(intlPrice) }} /oz</span>
        </div>
        <div class="mat-line sub">
          <span class="mat-label">内外盘溢价</span>
          <span class="mat-val" :class="premiumPercent >= 0 ? 'pink' : 'blue'">
            {{ premiumPercent !== null ? (premiumPercent >= 0 ? '+' : '') + premiumPercent + '%' : '--' }}
          </span>
        </div>
      </div>

      <!-- 次标题 -->
      <h2 class="display h-strong">
        <span class="clip in"><span>Strong by</span></span>
        <span class="clip in"><span>Algorithm</span></span>
      </h2>

      <!-- 模型说明 -->
      <p class="body-sm h-model rv in">
        Demonstrated Engine —<br>
        <span class="model-highlight">“DeepSeek-R1 / Qwen 2.5 Hybrid”</span>
      </p>

      <!-- 核心文案 1 -->
      <p class="body-sm h-copy-1 rv in">
        Designed to feel weightless yet razor-sharp. PLUME transforms complex multi-factor macroeconomic dynamics, domestic premiums, and silver ratios into real-time executable trading signals.
      </p>

      <!-- 核心文案 2 -->
      <p class="body-sm h-copy-2 rv in">
        A 12-factor quantitative matrix forms the structural backbone of the terminal, delivering millisecond parity tracking, volatility hedging, and risk-adjusted alpha.
      </p>

      <!-- 行动操作区 -->
      <div class="h-scroll rv in">
        <button
          type="button"
          class="btn-solid hero-btn-main"
          @click="scrollTo('#sec-overview')"
        >
          <span>进入交易工作台</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        <button
          type="button"
          class="pill hero-pill-ai"
          @click="$emit('run-ai')"
        >
          <span class="pill-sparkle">✦</span>
          <span>运行 AI 深度研报</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  domesticPrice: { type: Number, default: null },
  domesticChange: { type: Number, default: null },
  intlPrice: { type: Number, default: null },
  intlChange: { type: Number, default: null },
  premiumPercent: { type: Number, default: null },
  quantScore: { type: Number, default: null },
});

const emit = defineEmits(['run-ai']);

const videoRef = ref(null);
const videoLoaded = ref(false);

function onVideoLoaded() {
  videoLoaded.value = true;
}

function fmtPrice(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : '--';
}

function fmtSigned(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '--';
  return (v >= 0 ? '+' : '') + v.toFixed(2);
}

function toneOf(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '';
  return v >= 0 ? 'tone-up' : 'tone-down';
}

function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

onMounted(() => {
  if (videoRef.value && videoRef.value.readyState >= 2) {
    videoLoaded.value = true;
  }
});
</script>

<style scoped>
/* ============================================================
   CINEMATIC HERO (PLUME 电影级全出血视效)
   ============================================================ */
.cinematic-hero {
  position: relative;
  height: 94vh;
  min-height: 640px;
  overflow: hidden;
  background: #000000;
  border-bottom: 1px solid rgba(251, 191, 36, 0.2);
}

.hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
  object-position: center;
  z-index: 1;
  opacity: 0;
  transition: opacity 1.6s ease;
}

.hero-video.loaded {
  opacity: 0.65;
}

.video-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  background:
    radial-gradient(1000px 600px at 50% 30%, rgba(251, 191, 36, 0.08), transparent 70%),
    linear-gradient(180deg, rgba(6, 7, 10, 0.5) 0%, rgba(6, 7, 10, 0.8) 75%, #06070a 100%);
  pointer-events: none;
}

/* 顶部状态浮动条 */
.hero-top-bar {
  position: absolute;
  top: 24px;
  left: var(--pad);
  right: var(--pad);
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: auto;
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gold-box {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: var(--gold-btn);
  color: #000000;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 13px;
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.4);
}

.brand-text {
  font-family: 'Inter', sans-serif;
  font-weight: 300;
  font-size: 13px;
  letter-spacing: 0.35em;
  color: #ffffff;
  text-transform: uppercase;
}

.hero-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(10, 12, 18, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px);
  font-size: 12px;
  font-family: 'Archivo', var(--mono);
  color: #ffffff;
}

.live-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--down);
  box-shadow: 0 0 8px var(--down);
  animation: pulse-ring 2s infinite;
}

.live-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--dimmer);
  letter-spacing: 0.1em;
}

.live-sep {
  color: rgba(255, 255, 255, 0.2);
}

.live-data {
  font-weight: 600;
}

/* 核心内容区 */
.hero-content {
  position: relative;
  z-index: 10;
  height: 100%;
  padding: 0 var(--pad);
}

/* Display Titles */
.display {
  font-family: 'Archivo', sans-serif;
  font-weight: 400;
  text-transform: uppercase;
  line-height: 0.94;
  letter-spacing: -0.022em;
}

.h-title {
  position: absolute;
  left: var(--pad);
  top: 22%;
  font-size: clamp(34px, 6.2vw, 110px);
  color: #ffffff;
}

.h-mats {
  position: absolute;
  right: var(--pad);
  top: 22%;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mat-line {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 10px;
  font-family: 'Archivo', var(--mono);
  font-size: clamp(13px, 1.5vw, 24px);
}
.mat-line.sub {
  font-size: clamp(11px, 1.1vw, 16px);
  margin-top: 4px;
}

.mat-label {
  font-size: 0.65em;
  color: var(--dimmer);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.mat-val.gold { color: var(--gold-3); }
.mat-val.blue { color: #60a5fa; }
.mat-val.pink { color: var(--pink); }

.h-strong {
  position: absolute;
  right: var(--pad);
  top: 43%;
  text-align: right;
  font-size: clamp(34px, 6.2vw, 110px);
  color: #ffffff;
}

.h-model {
  position: absolute;
  left: 27%;
  top: 48%;
  max-width: 26ch;
}

.model-highlight {
  color: var(--gold-3);
  font-weight: 600;
}

.h-copy-1 {
  position: absolute;
  left: var(--pad);
  top: 64%;
  max-width: 40ch;
}

.h-copy-2 {
  position: absolute;
  left: 27%;
  top: 76%;
  max-width: 44ch;
}

.h-scroll {
  position: absolute;
  right: var(--pad);
  bottom: 8%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-btn-main {
  background: var(--gold-btn);
  color: #000000;
  border-radius: 8px;
  padding: 1em 2em;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 6px 24px rgba(251, 191, 36, 0.35);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.hero-btn-main:hover {
  background: var(--gold-btn-hover);
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(251, 191, 36, 0.55);
}

.hero-pill-ai {
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.08);
  color: var(--gold-3);
  font-weight: 600;
  padding: 0.85em 1.6em;
}
.hero-pill-ai:hover {
  background: rgba(251, 191, 36, 0.18);
  border-color: var(--gold);
  color: #ffffff;
  transform: translateY(-2px);
}
.pill-sparkle {
  color: var(--gold);
}

/* ============================================================
   RESPONSIVE (<= 900px 或短屏幕)
   ============================================================ */
@media (max-width: 900px), (max-height: 540px) {
  .cinematic-hero {
    height: auto;
    min-height: 100vh;
    padding-bottom: 40px;
  }

  .hero-top-bar {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    padding: 24px var(--pad) 0;
    flex-wrap: wrap;
    gap: 12px;
  }

  .hero-content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    height: auto;
    min-height: auto;
    gap: 1rem;
    padding-top: 24px;
    padding-bottom: 24px;
  }

  .h-title, .h-mats, .h-strong, .h-model, .h-copy-1, .h-copy-2, .h-scroll {
    position: relative;
    top: auto;
    right: auto;
    bottom: auto;
    left: auto;
    text-align: left;
    max-width: 100%;
  }

  .h-title, .h-strong {
    font-size: clamp(32px, 9vw, 68px);
  }

  .h-mats {
    order: -1;
    align-self: flex-start;
    text-align: left;
  }
  .mat-line {
    justify-content: flex-start;
  }

  .h-scroll {
    align-self: flex-start;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }
}
</style>
