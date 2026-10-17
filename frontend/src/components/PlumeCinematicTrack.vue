<template>
  <div class="plume-cinematic-track">
    <!-- ============================================================
         SECTION 1 — HERO (#hero, class "hero panel")
         ============================================================ -->
    <section class="hero panel" id="hero">
      <video
        ref="heroVideoRef"
        class="hero-video video-cover"
        src="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/0a285ef6-17e3-443b-a3e3-bf043fcf6952.mp4"
        muted
        playsinline
        autoplay
        loop
        preload="auto"
      ></video>

      <div class="hero-content panel-content">
        <!-- 主标题（两行剪裁字） -->
        <h1 class="display h-title">
          <span class="clip"><span>Light as</span></span>
          <span class="clip"><span>a Feather.</span></span>
        </h1>

        <!-- 右上材质/行情锁定位 -->
        <div class="h-mats rv">
          <div class="h-mat-line"><span class="mat-pink">Titanium core.</span></div>
          <div class="h-mat-line">
            <span class="mat-blue">Steel</span>
            <span class="mat-pink"> outer Layer.</span>
          </div>
          <div v-if="domesticPrice" class="h-mat-quote">
            <span class="quote-gold">AU9999 ¥{{ fmt(domesticPrice) }}</span>
            <span class="quote-sep">/</span>
            <span class="quote-intl">${{ fmt(intlPrice) }}</span>
          </div>
        </div>

        <!-- 第二标题 -->
        <h2 class="display h-strong">
          <span class="clip"><span>Strong by</span></span>
          <span class="clip"><span>Design</span></span>
        </h2>

        <!-- 模型标识 -->
        <p class="body-sm h-model rv">
          Demonstrated model —<br>
          “Plume OnlyMetal 001”
        </p>

        <!-- 文案 1 -->
        <p class="body-sm h-copy-1 rv">
          Designed to feel weightless, PLUME reduces mass to the minimum necessary for control. The blade moves effortlessly, leaving only precision in its wake.
        </p>

        <!-- 文案 2 -->
        <p class="body-sm h-copy-2 rv">
          A titanium core forms the structural backbone of the knife, delivering exceptional rigidity and durability without adding unnecessary weight.
        </p>

        <!-- 探索按钮 -->
        <button
          class="btn-solid h-scroll rv"
          type="button"
          @click="scrollTo('#recipe')"
        >
          Scroll to explore
        </button>
      </div>
    </section>

    <!-- ============================================================
         SECTION 2 — RECIPE (#recipe, class "recipe panel")
         ============================================================ -->
    <section class="recipe panel" id="recipe">
      <video
        ref="recipeVideoRef"
        class="recipe-video video-cover"
        src="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/ddcebad8-6b75-40e2-b30e-83035b3f4d26.mp4"
        muted
        playsinline
        preload="auto"
      ></video>

      <div class="recipe-content panel-content">
        <h2 class="display r-title">
          <span class="clip"><span>Recipe for</span></span>
          <span class="clip"><span class="grad-text">Lightness</span></span>
        </h2>

        <p class="body-sm r-lede rv">
          Every detail is engineered to remove excess mass while preserving strength, balance, and control.
        </p>

        <div class="callout co-steel">
          <h3 class="rv">Steel Outer Layer</h3>
          <p class="body-sm rv">
            Outer steel layers provide cutting performance, edge retention, and protection against wear and corrosion.
          </p>
          <span class="co-line"></span>
        </div>

        <div class="callout co-core">
          <h3 class="rv">Titanium Core</h3>
          <p class="body-sm rv">
            A lightweight titanium layer runs through the center of the blade, absorbing stress while maintaining structural stability.
          </p>
          <span class="co-line"></span>
        </div>
      </div>
    </section>

    <!-- ============================================================
         SECTION 3 — UNDENIABLE ADVANTAGES (NATIVE STICKY PIN 460vh)
         ============================================================ -->
    <section class="adv" id="adv" ref="advSectionRef">
      <div class="adv-stage" ref="advStageRef">
        <video
          ref="advVideoRef"
          class="adv-video"
          src="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/5ce34dc5-db43-4b33-9cd0-82d9da44bf96.mp4"
          muted
          playsinline
          preload="auto"
        ></video>

        <div class="adv-shots">
          <img
            ref="shot1Ref"
            class="adv-shot"
            id="shot1"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_235551_d79382b3-319e-46ee-9be7-c434921ef3c7.png"
            alt="PLUME knife, skeletonised steel body"
          >
          <img
            ref="shot2Ref"
            class="adv-shot"
            id="shot2"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_235605_60056fc4-aca1-4e44-8b37-84cdd87761d0.png"
            alt="PLUME knife in profile"
          >
          <img
            ref="shot3Ref"
            class="adv-shot"
            id="shot3"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260923_002256_436731d2-c211-48a2-9793-a6c0be6d7906.png"
            alt="PLUME knife, blackened finish"
          >
        </div>

        <p class="adv-label"><span class="grad-text">Undeniable advantages</span></p>

        <div class="adv-slide" data-slide="0">
          <div class="adv-head">
            <div class="line l1" data-text="Structural"></div>
            <div class="line l2" data-text="Lightness"></div>
          </div>
          <div class="adv-copy">
            <p class="body-sm">Material is reduced at a structural level, lowering weight without sacrificing rigidity or stability.</p>
          </div>
        </div>

        <div class="adv-slide" data-slide="1">
          <div class="adv-head">
            <div class="line l1" data-text="Balanced"></div>
            <div class="line l2" data-text="Geometry"></div>
          </div>
          <div class="adv-copy">
            <p class="body-sm">Every curve and angle distributes mass evenly, ensuring control, balance, and predictable handling.</p>
          </div>
        </div>

        <div class="adv-slide" data-slide="2">
          <div class="adv-head">
            <div class="line l1" data-text="Controlled"></div>
            <div class="line l2" data-text="Edge"></div>
          </div>
          <div class="adv-copy">
            <p class="body-sm">The cutting edge is tuned for precision, maintaining sharpness while avoiding unnecessary material mass.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================================
         SECTION 4 — ESSENTIALS (#ess, class "ess panel")
         ============================================================ -->
    <section class="ess panel" id="ess">
      <video
        ref="essVideoRef"
        class="ess-video video-cover"
        src="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/8f758ee6-5736-4b37-9c66-db8e59a1f154.mp4"
        muted
        loop
        playsinline
        preload="auto"
      ></video>

      <div class="ess-content panel-content">
        <h2 class="display e-title">
          <span class="clip"><span>Only what</span></span>
          <span class="clip"><span class="grad-text">Really matters</span></span>
        </h2>

        <p class="body-sm e-lede rv">
          Stripped of excess, refined to essentials. PLUME is engineered where every gram, angle, and surface serves a purpose.
        </p>

        <button
          class="btn-solid e-cta rv"
          type="button"
          @click="scrollTo('#workspace')"
        >
          View Full Specification & Live Terminal
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  domesticPrice: { type: Number, default: null },
  intlPrice: { type: Number, default: null },
});

const heroVideoRef = ref(null);
const recipeVideoRef = ref(null);
const essVideoRef = ref(null);
const advSectionRef = ref(null);
const advStageRef = ref(null);
const advVideoRef = ref(null);
const shot1Ref = ref(null);
const shot2Ref = ref(null);
const shot3Ref = ref(null);

function fmt(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : '--';
}

function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

let rafId = null;
let advObserver = null;
let heroObserver = null;

onMounted(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Split character lines in Section 3
  document.querySelectorAll('.adv-head .line').forEach((line) => {
    const text = line.getAttribute('data-text') || '';
    line.innerHTML = '';
    Array.from(text).forEach((char, idx) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.innerHTML = char === ' ' ? '&nbsp;' : char;
      span.style.transitionDelay = `${idx * 26}ms`;
      line.appendChild(span);
    });
  });

  // 2. Panel Scroll & Reveal Management (#hero, #recipe, #ess)
  const panels = Array.from(document.querySelectorAll('.panel'));
  const revealedPanels = new WeakSet();

  function triggerPanelReveal(panel) {
    if (revealedPanels.has(panel)) return;
    revealedPanels.add(panel);
    panel.classList.add('revealed');

    if (prefersReducedMotion) {
      panel.classList.add('revealed');
      panel.querySelectorAll('.clip, .rv, .callout').forEach((el) => {
        el.classList.add('in');
        el.querySelectorAll?.('.rv')?.forEach((sub) => sub.classList.add('in'));
      });
      return;
    }

    const elements = panel.querySelectorAll('.clip, .rv, .callout');
    elements.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('in');
        if (el.classList.contains('callout')) {
          const innerRvs = el.querySelectorAll('.rv');
          if (innerRvs[0]) setTimeout(() => innerRvs[0].classList.add('in'), 80);
          if (innerRvs[1]) setTimeout(() => innerRvs[1].classList.add('in'), 170);
        }
      }, index * 110);
    });
  }

  // Immediately activate and reveal hero on load
  const heroPanel = document.getElementById('hero');
  if (heroPanel) {
    heroPanel.classList.add('is-active');
    triggerPanelReveal(heroPanel);
  }

  // Hero video loaded
  const heroVideo = heroVideoRef.value;
  if (heroVideo) {
    if (heroVideo.readyState >= 2) {
      heroVideo.classList.add('loaded');
    } else {
      heroVideo.addEventListener('loadeddata', () => {
        heroVideo.classList.add('loaded');
      }, { once: true });
    }

    heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          heroVideo.play().catch(() => {});
        } else {
          heroVideo.pause();
        }
      });
    }, { threshold: 0.1 });
    heroObserver.observe(heroVideo);
  }

  const recipeVideo = recipeVideoRef.value;
  const essVideo = essVideoRef.value;

  function updateActivePanel() {
    const vh = window.innerHeight;
    let bestPanel = null;
    let maxTop = -Infinity;

    panels.forEach((p) => {
      const rect = p.getBoundingClientRect();
      if (rect.top <= 88 && rect.bottom > vh * 0.42) {
        if (rect.top > maxTop) {
          maxTop = rect.top;
          bestPanel = p;
        }
      }
    });

    panels.forEach((p) => {
      if (p === bestPanel) {
        if (!p.classList.contains('is-active')) {
          p.classList.add('is-active');
          triggerPanelReveal(p);

          if (p.id === 'recipe' && recipeVideo) {
            recipeVideo.currentTime = 0;
            recipeVideo.playbackRate = 2;
            recipeVideo.play().catch(() => {});
          } else if (p.id === 'ess' && essVideo) {
            essVideo.play().catch(() => {});
          }

          const id = p.id;
          document.querySelectorAll('.nav-links a').forEach((a) => {
            a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
          });
        }
      } else {
        if (p.classList.contains('is-active')) {
          p.classList.remove('is-active');

          if (p.id === 'recipe' && recipeVideo) {
            recipeVideo.pause();
            recipeVideo.playbackRate = 1;
          } else if (p.id === 'ess' && essVideo) {
            essVideo.pause();
          }
        }
      }
    });
  }

  // 3. Section 3 Undeniable Advantages Sticky Scroll System
  const advSection = advSectionRef.value;
  const advStage = advStageRef.value;
  const advVideo = advVideoRef.value;
  const shots = [shot1Ref.value, shot2Ref.value, shot3Ref.value].filter(Boolean);
  const slides = Array.from(advSection.querySelectorAll('.adv-slide'));

  const ADV_VIDEO_END = 0.22;
  let advStarted = false;
  let advVideoDone = false;
  let activeSlide = -1;

  function sectionProgress(section) {
    const r = section.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  function setSlide(i) {
    if (i === activeSlide) return;
    activeSlide = i;
    slides.forEach((s, n) => s.classList.toggle('on', n === i));
    shots.forEach((s, n) => s.classList.toggle('on', n === i));
  }

  function resetAdvVideo() {
    advStarted = false;
    advVideoDone = false;
    if (advVideo) {
      advVideo.pause();
      advVideo.playbackRate = 1;
      advVideo.currentTime = 0;
      advVideo.style.opacity = '1';
    }
    setSlide(-1);
  }

  function startAdvVideo() {
    if (advStarted || !advVideo) return;
    advStarted = true;
    advVideoDone = false;
    advVideo.style.opacity = '1';
    advVideo.playbackRate = 2;
    const play = () => advVideo.play().catch(() => {});
    if (advVideo.readyState >= 2) play();
    else advVideo.addEventListener('canplay', play, { once: true });
  }

  if (advVideo) {
    advVideo.addEventListener('ended', () => {
      advVideo.style.opacity = '0';
      advVideoDone = true;
      const p = sectionProgress(advSection);
      const t = Math.min(1, Math.max(0, (p - ADV_VIDEO_END) / (1 - ADV_VIDEO_END)));
      setSlide(t < 0.34 ? 0 : t < 0.67 ? 1 : 2);
    });
  }

  if (advStage) {
    advObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          startAdvVideo();
          document.querySelectorAll('.nav-links a').forEach((a) => {
            a.classList.toggle('active', a.getAttribute('href') === '#adv');
          });
        } else if (e.boundingClientRect.top > 0) {
          resetAdvVideo();
        }
      });
    }, { threshold: 0.35 });
    advObserver.observe(advStage);
  }

  function updateAdv() {
    if (!advVideoDone || !advSection) return;
    const p = sectionProgress(advSection);
    const t = Math.min(1, Math.max(0, (p - ADV_VIDEO_END) / (1 - ADV_VIDEO_END)));
    setSlide(t < 0.34 ? 0 : t < 0.67 ? 1 : 2);
    const local = t < 0.34 ? t / 0.34 : t < 0.67 ? (t - 0.34) / 0.33 : (t - 0.67) / 0.33;
    const shot = shots[activeSlide];
    if (!shot) return;
    const clamped = Math.min(1, Math.max(0, local));
    const k = 1 + (1 - clamped) * 0.075;
    shot.style.transform = 'translate(-50%,-50%) scale(' + k.toFixed(4) + ') rotate(' + ((local - 0.5) * 1.1).toFixed(3) + 'deg)';
  }

  function onFrame() {
    updateActivePanel();
    updateAdv();
    rafId = requestAnimationFrame(onFrame);
  }

  rafId = requestAnimationFrame(onFrame);
});

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
  if (advObserver) advObserver.disconnect();
  if (heroObserver) heroObserver.disconnect();
});
</script>

<style scoped>
/* ============================================================
   PLUME CINEMATIC TRACK STYLING (EXACT PROMPT SPECIFICATION)
   ============================================================ */
.plume-cinematic-track {
  --ink: #ffffff;
  --dim: #c7c7c9;
  --dimmer: #8a8a8f;
  --bg: #000000;
  --blue: #4b4ce6;
  --pink: #ef5a7f;
  --pad: 3.6vw;
  --grad: linear-gradient(90deg, #3c3cf0 0%, #6a4cdd 22%, #a85ab4 42%, #df5473 62%, #ec4a4a 80%, #f2602c 100%);
  width: 100%;
  background: #000000;
  color: #ffffff;
}

@media (max-width: 900px), (max-height: 540px) {
  .plume-cinematic-track {
    --pad: 5.2vw;
  }
}

/* Gradient Text Utility */
.grad-text {
  background: var(--grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

/* Small Copy (.body-sm) */
.body-sm {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: clamp(12px, 1vw, 16px);
  line-height: 1.55;
  color: var(--dim);
  letter-spacing: 0.002em;
}

/* Button solid */
.btn-solid {
  background: #f1f1f2;
  color: #0b0b0b;
  border: none;
  border-radius: 6px;
  padding: 1.15em 2.1em;
  font-family: 'Inter', sans-serif;
  font-size: clamp(11px, 0.88vw, 14px);
  font-weight: 400;
  letter-spacing: 0.005em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.35s ease, transform 0.35s ease;
  text-decoration: none;
}
.btn-solid:hover {
  background: #ffffff;
  transform: translateY(-2px);
}

/* Full bleed video utility */
.video-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
  object-position: center;
}

/* Display Titles */
.display {
  font-family: 'Archivo', sans-serif;
  font-weight: 400;
  text-transform: uppercase;
  line-height: 0.94;
  letter-spacing: -0.022em;
}

/* Reveal Animations (Sections 1, 2, 4) */
.rv {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.9s cubic-bezier(0.22, 0.61, 0.36, 1), transform 0.9s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.rv.in {
  opacity: 1;
  transform: none;
}

.clip {
  display: block;
  overflow: hidden;
}
.clip > span {
  display: block;
  transform: translateY(105%);
  transition: transform 1.05s cubic-bezier(0.19, 1, 0.22, 1);
}
.clip.in > span {
  transform: none;
}

.panel-content {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.85s ease, visibility 0.85s ease;
}
.panel.revealed .panel-content {
  opacity: 1;
  visibility: visible;
}

/* Panels */
.panel {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background: #000000;
}

/* ============================================================
   SECTION 1 — HERO
   ============================================================ */
.hero .hero-video {
  z-index: 1;
  opacity: 0;
  transition: opacity 1.6s ease;
}
.hero .hero-video.loaded {
  opacity: 1;
}

.hero-content {
  position: relative;
  z-index: 10;
  height: 100%;
  padding: 0 var(--pad);
}

.h-title {
  position: absolute;
  left: var(--pad);
  top: 25.5%;
  font-size: clamp(36px, 7.4vw, 133px);
  margin: 0;
}

.h-mats {
  position: absolute;
  right: var(--pad);
  top: 24.5%;
  text-align: right;
  font-size: clamp(13px, 1.62vw, 26px);
  line-height: 1.42;
  letter-spacing: -0.005em;
}
.h-mat-line {
  white-space: nowrap;
}
.mat-pink { color: var(--pink); }
.mat-blue { color: var(--blue); }

.h-mat-quote {
  margin-top: 6px;
  font-family: 'Archivo', var(--mono);
  font-size: clamp(11px, 1.1vw, 15px);
  color: var(--dim);
}
.quote-gold { color: var(--gold-3); font-weight: 700; }
.quote-sep { margin: 0 4px; opacity: 0.4; }
.quote-intl { color: #60a5fa; font-weight: 700; }

.h-strong {
  position: absolute;
  right: var(--pad);
  top: 45.5%;
  text-align: right;
  font-size: clamp(36px, 7.4vw, 133px);
  margin: 0;
}

.h-model {
  position: absolute;
  left: 27%;
  top: 50.5%;
  max-width: 24ch;
}

.h-copy-1 {
  position: absolute;
  left: var(--pad);
  top: 65.5%;
  max-width: 40ch;
}

.h-copy-2 {
  position: absolute;
  left: 27%;
  top: 78.5%;
  max-width: 42ch;
}

.h-scroll {
  position: absolute;
  right: var(--pad);
  bottom: 7.5%;
}

/* ============================================================
   SECTION 2 — RECIPE
   ============================================================ */
.recipe .recipe-video {
  z-index: 1;
}

.recipe-content {
  position: relative;
  z-index: 10;
  height: 100%;
  padding: 0 var(--pad);
}

.r-title {
  position: absolute;
  left: var(--pad);
  top: 7.5%;
  font-size: clamp(38px, 7.8vw, 142px);
  margin: 0;
}

.r-lede {
  position: absolute;
  right: var(--pad);
  top: 7.5%;
  max-width: 37ch;
}

.callout h3 {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: clamp(16px, 2.15vw, 35px);
  letter-spacing: -0.012em;
  color: #efeff1;
  line-height: 1.1;
  margin-bottom: 0.72em;
}

.co-steel {
  position: absolute;
  right: var(--pad);
  top: 39%;
  text-align: right;
}
.co-steel p {
  max-width: 35ch;
  margin-left: auto;
}

.co-core {
  position: absolute;
  left: var(--pad);
  top: 66%;
  text-align: left;
}
.co-core p {
  max-width: 35ch;
}

.co-line {
  position: absolute;
  height: 1px;
  background: rgba(255, 255, 255, 0.4);
  transform: scaleX(0);
  transition: transform 1.1s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.co-line::after {
  content: '';
  position: absolute;
  top: -2.5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
}
.callout.in .co-line {
  transform: scaleX(1);
}

.co-steel .co-line {
  right: 0;
  top: calc(100% + 2.4vh);
  width: 31vw;
  transform-origin: right center;
}
.co-steel .co-line::after {
  left: 0;
}

.co-core .co-line {
  left: 0;
  top: calc(100% + 2.4vh);
  width: 26vw;
  transform-origin: left center;
}
.co-core .co-line::after {
  right: 0;
}

/* ============================================================
   SECTION 3 — UNDENIABLE ADVANTAGES (NATIVE STICKY PIN)
   ============================================================ */
.adv {
  position: relative;
  height: 460vh;
  background: #000000;
  overflow: visible; /* CRITICAL */
}
.adv-stage {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  background: #000000;
}
.adv-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
  object-position: center;
  z-index: 2;
  transition: opacity 0.75s ease;
}
.adv-shots {
  position: absolute;
  inset: 0;
  z-index: 3;
}
.adv-shot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(78vw, 1340px);
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.7s ease;
  filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.85));
  will-change: opacity, transform;
}
.adv-shot.on {
  opacity: 1;
}
.adv-label {
  position: absolute;
  left: 0;
  right: 0;
  top: 9.2%;
  z-index: 12;
  text-align: center;
  font-size: clamp(12px, 1.15vw, 19px);
  letter-spacing: 0.005em;
}
.adv-label span {
  display: inline-block;
}
.adv-head {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  z-index: 4;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  padding: 0 1.5vw;
}
.adv-head .line {
  display: flex;
  justify-content: center;
  font-family: 'Archivo', 'Inter', Helvetica, Arial, sans-serif;
  font-weight: 400;
  font-stretch: 122%;
  letter-spacing: -0.018em;
  font-size: clamp(36px, 10.8vw, 200px);
  line-height: 1.3;
  text-transform: uppercase;
  white-space: nowrap;
}
.adv-head .line.l2 {
  margin-top: 0.1em;
}
.adv-head .ch {
  display: inline-block;
  transform: translateY(0.42em) scaleY(0.6);
  opacity: 0;
  transition: transform 0.62s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.42s ease;
}
.adv-slide.on .adv-head .ch {
  transform: none;
  opacity: 1;
}
.adv-copy {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12.5%;
  z-index: 12;
  text-align: center;
}
.adv-copy p {
  margin: 0 auto;
  max-width: 58ch;
}
.adv-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
}
.adv-slide.on {
  opacity: 1;
}

/* ============================================================
   SECTION 4 — ESSENTIALS
   ============================================================ */
.ess .ess-video {
  z-index: 1;
}

.ess-content {
  position: relative;
  z-index: 10;
  height: 100%;
  padding: 0 var(--pad);
}

.e-title {
  position: absolute;
  left: var(--pad);
  top: 7.5%;
  font-size: clamp(38px, 7.8vw, 142px);
  margin: 0;
}

.e-lede {
  position: absolute;
  right: var(--pad);
  top: 7.5%;
  max-width: 41ch;
}

.e-cta {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 8.5%;
}

/* ============================================================
   RESPONSIVE BREAKPOINTS (max-width: 900px OR max-height: 540px)
   ============================================================ */
@media (max-width: 900px), (max-height: 540px) {
  .panel {
    height: auto;
    min-height: 100vh;
    min-height: 100svh;
    overflow: visible;
  }

  .hero-content,
  .recipe-content,
  .ess-content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    height: auto;
    min-height: 100vh;
    min-height: 100svh;
    gap: 0.85rem;
    padding-top: max(76px, calc(env(safe-area-inset-top) + 60px));
    padding-right: max(var(--pad), env(safe-area-inset-right));
    padding-left: max(var(--pad), env(safe-area-inset-left));
    padding-bottom: max(28px, env(safe-area-inset-bottom));
  }

  .h-title, .h-mats, .h-strong, .h-model, .h-copy-1, .h-copy-2, .h-scroll,
  .r-title, .r-lede, .co-steel, .co-core,
  .e-title, .e-lede, .e-cta {
    position: relative;
    top: auto;
    right: auto;
    bottom: auto;
    left: auto;
    text-align: left;
    max-width: 40ch;
  }

  .h-title, .h-strong, .r-title, .e-title {
    max-width: 100%;
    font-size: clamp(32px, 10.2vw, 80px);
  }

  .h-mats {
    order: -1;
    align-self: flex-end;
    text-align: right;
    max-width: 22ch;
    font-size: clamp(13px, 3.4vw, 20px);
  }

  .h-strong {
    align-self: flex-end;
    text-align: right;
  }

  .h-model {
    margin-top: 0.4rem;
  }

  .h-copy-1, .h-copy-2, .r-lede, .e-lede {
    max-width: 38ch;
  }

  .h-scroll {
    align-self: flex-end;
    margin-top: auto;
  }

  .r-lede {
    margin-bottom: 0.4rem;
  }

  .callout {
    width: min(100%, 38ch);
  }
  .co-steel {
    align-self: flex-end;
    text-align: right;
    margin-top: auto;
  }
  .co-steel p {
    margin-left: auto;
  }
  .co-core {
    align-self: flex-start;
    margin-top: 1.6rem;
  }

  .co-line {
    position: relative;
    display: block;
    width: min(34vw, 180px);
    margin-top: 1rem;
    top: auto;
  }
  .co-steel .co-line {
    margin-left: auto;
  }
  .co-core .co-line {
    margin-right: auto;
  }

  .e-cta {
    align-self: center;
    transform: none;
    margin-top: auto;
  }

  .adv-stage {
    height: 100vh;
    height: 100svh;
  }
  .adv-label, .adv-copy {
    padding: 0 6vw;
  }
  .adv-copy {
    bottom: max(8%, env(safe-area-inset-bottom));
  }
  .adv-head {
    padding: 0 5vw;
  }
  .adv-head .line {
    font-size: clamp(30px, 11vw, 78px);
    font-stretch: 100%;
    letter-spacing: -0.03em;
    line-height: 1.12;
  }
  .adv-shot {
    width: auto;
    max-width: min(88vw, 640px);
    max-height: 42vh;
    height: auto;
  }
}

/* Short landscape */
@media (max-height: 540px) and (min-width: 700px) {
  .hero-content {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    grid-template-rows: auto auto 1fr auto auto;
    column-gap: 4vw;
    row-gap: 0.28rem;
    align-items: start;
    padding-top: 66px;
    padding-bottom: 0;
  }
  .h-title {
    grid-column: 1;
    grid-row: 1 / span 2;
    align-self: end;
    font-size: clamp(24px, 4.6vw, 40px);
  }
  .h-mats {
    grid-column: 2;
    grid-row: 1;
    order: 0;
    align-self: start;
    justify-self: end;
  }
  .h-strong {
    grid-column: 2;
    grid-row: 2;
    align-self: start;
    justify-self: end;
    font-size: clamp(24px, 4.6vw, 40px);
  }
  .h-model {
    grid-column: 1;
    grid-row: 3;
    align-self: end;
    margin-top: 0;
  }
  .h-copy-1 {
    grid-column: 1;
    grid-row: 4;
  }
  .h-copy-2 {
    grid-column: 1;
    grid-row: 5;
  }
  .h-scroll {
    grid-column: 2;
    grid-row: 5;
    align-self: end;
    justify-self: end;
    margin-top: 0;
  }

  .recipe-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto 1fr;
    column-gap: 4vw;
  }
  .r-title {
    grid-column: 1;
    grid-row: 1;
  }
  .r-lede {
    grid-column: 1;
    grid-row: 2;
    margin-bottom: 0;
  }
  .co-core {
    grid-column: 1;
    grid-row: 3;
    align-self: end;
    margin-top: 0;
  }
  .co-steel {
    grid-column: 2;
    grid-row: 3;
    align-self: end;
    justify-self: end;
    margin-top: 0;
  }
}
</style>
