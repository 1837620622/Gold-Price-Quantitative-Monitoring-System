<template>
  <div class="plume-cinematic-track">
    <!-- 全局全景动态黄金粒子与量子能量波背景画布 -->
    <canvas ref="bgCanvasRef" class="global-gold-canvas"></canvas>

    <!-- ============================================================
         SECTION 1 — HERO (#hero, class "hero panel")
         ============================================================ -->
    <section class="hero panel" id="hero">
      <div class="hero-content panel-content">
        <!-- 主标题（两行剪裁字） -->
        <h1 class="display h-title">
          <span class="clip"><span>Pure as</span></span>
          <span class="clip"><span>Au 999.9</span></span>
        </h1>

        <!-- 右上材质/行情锁定位 -->
        <div class="h-mats rv">
          <div class="h-mat-line">SGE Physical Bullion.</div>
          <div class="h-mat-line">London Spot XAU/USD.</div>
          <div v-if="domesticPrice" class="h-mat-quote">
            <span class="quote-gold">AU9999 ¥{{ fmt(domesticPrice) }}</span>
            <span class="quote-sep">/</span>
            <span class="quote-intl">${{ fmt(intlPrice) }}</span>
            <span v-if="premiumRate" class="quote-premium">({{ premiumRate >= 0 ? '+' : '' }}{{ premiumRate }}%)</span>
          </div>
        </div>

        <!-- 第二标题 -->
        <h2 class="display h-strong">
          <span class="clip"><span>Quant by</span></span>
          <span class="clip"><span>Design</span></span>
        </h2>

        <!-- 模型标识 -->
        <p class="body-sm h-model rv">
          Demonstrated Asset —<br>
          “AU9999 / XAU Institutional Matrix v2.0”
        </p>

        <!-- 文案 1 -->
        <p class="body-sm h-copy-1 rv">
          Engineered for institutional precision, Gold Monitor eliminates execution latency and cross-border basis spread friction. The quantitative algorithms move effortlessly across Shanghai and London, leaving pure trading edge in their wake.
        </p>

        <!-- 文案 2 -->
        <p class="body-sm h-copy-2 rv">
          A physical 99.99% gold bullion backing forms the immutable backbone, reinforced by 12 quantitative factors, dual-source tick cross-checks, and AI scenario deductions without emotional bias.
        </p>

        <!-- 探索按钮 -->
        <button
          class="btn-solid h-scroll rv"
          type="button"
          @click="scrollTo('#recipe')"
        >
          Scroll to explore · 深入核心量化
        </button>
      </div>
    </section>

    <!-- ============================================================
         SECTION 2 — RECIPE (#recipe, class "recipe panel")
         ============================================================ -->
    <section class="recipe panel" id="recipe">
      <div class="recipe-content panel-content">
        <h2 class="display r-title">
          <span class="clip"><span>Recipe for</span></span>
          <span class="clip"><span class="grad-text">Alpha Edge</span></span>
        </h2>

        <p class="body-sm r-lede rv">
          Every quantitative factor and data feed is engineered to eliminate noise while preserving multi-market arbitrage precision and risk management.
        </p>

        <div class="callout co-steel">
          <h3 class="rv">Shanghai Physical Core</h3>
          <p class="body-sm rv">
            Physical bullion liquidity on the Shanghai Gold Exchange (AU9999), pricing renminbi purchasing power parity and genuine domestic sovereign reserve anchors.
          </p>
          <span class="co-line"></span>
        </div>

        <div class="callout co-core">
          <h3 class="rv">London Spot Matrix</h3>
          <p class="body-sm rv">
            Global benchmark spot gold (XAU/USD), pricing international macro shifts, real US Treasury yields, and systemic liquidity shocks.
          </p>
          <span class="co-line"></span>
        </div>
      </div>
    </section>

    <!-- ============================================================
         SECTION 3 — UNDENIABLE ADVANTAGES (NATIVE STICKY PIN 380vh)
         ============================================================ -->
    <section class="adv" id="adv" ref="advSectionRef">
      <div class="adv-stage" ref="advStageRef">
        <!-- 核心 3D 黄金金条 WebGL 渲染舞台 -->
        <canvas ref="adv3dCanvasRef" class="adv-3d-canvas"></canvas>

        <p class="adv-label"><span class="grad-text">Undeniable advantages · 核心量化优势</span></p>

        <div class="adv-slide" data-slide="0">
          <div class="adv-head">
            <div class="line l1" data-text="Structural"></div>
            <div class="line l2" data-text="Purity"></div>
          </div>
          <div class="adv-copy">
            <p class="body-sm">Physical Au999.9 sovereign bullion backing with sub-second tick feeds, eliminating counterparty friction and phantom spread noise.</p>
          </div>
        </div>

        <div class="adv-slide" data-slide="1">
          <div class="adv-head">
            <div class="line l1" data-text="Cross-Market"></div>
            <div class="line l2" data-text="Arbitrage"></div>
          </div>
          <div class="adv-copy">
            <p class="body-sm">Real-time Shanghai vs London basis tracking, Z-score spread anomaly detection, and automated non-deliverable risk-neutral parity locks.</p>
          </div>
        </div>

        <div class="adv-slide" data-slide="2">
          <div class="adv-head">
            <div class="line l1" data-text="12-Factor"></div>
            <div class="line l2" data-text="Convergence"></div>
          </div>
          <div class="adv-copy">
            <p class="body-sm">Multi-frequency trend, momentum, volatility, and volume indicators synchronized with DeepSeek-R1 deep reasoning AI game-theoretic models.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================================
         SECTION 4 — ESSENTIALS (#ess, class "ess panel")
         ============================================================ -->
    <section class="ess panel" id="ess">
      <div class="ess-content panel-content">
        <h2 class="display e-title">
          <span class="clip"><span>Only what</span></span>
          <span class="clip"><span class="grad-text">Really matters</span></span>
        </h2>

        <p class="body-sm e-lede rv">
          Stripped of speculative noise, refined to mathematical conviction. Engineered where every tick, factor, and basis point serves a purpose.
        </p>

        <button
          class="btn-solid e-cta rv"
          type="button"
          @click="scrollTo('#workspace')"
        >
          Enter Institutional Quantitative Terminal · 进入量化投研工作台
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

const props = defineProps({
  domesticPrice: { type: Number, default: null },
  intlPrice: { type: Number, default: null },
  premiumRate: { type: Number, default: 0.20 },
});

const bgCanvasRef = ref(null);
const advSectionRef = ref(null);
const advStageRef = ref(null);
const adv3dCanvasRef = ref(null);

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
let bgAnimId = null;

// Three.js 3D 黄金金条系统变量
let threeRenderer = null;
let threeScene = null;
let threeCamera = null;
let goldIngotMesh = null;
let sparklePoints = null;
let mouseX = 0.5;
let mouseY = 0.5;
let currentRotX = 0.38;
let currentRotY = 0.65;
let currentRotZ = 0.12;
let targetRotX = 0.38;
let targetRotY = 0.65;
let targetRotZ = 0.12;
let currentScale = 1.0;
let targetScale = 1.0;

// 创建经典梯形倒角 1000g 金条几何体
function createGoldIngotGeometry() {
  const shape = new THREE.Shape();
  const w = 1.45;
  const l = 3.65;
  const r = 0.14;

  shape.moveTo(-l / 2 + r, -w / 2);
  shape.lineTo(l / 2 - r, -w / 2);
  shape.quadraticCurveTo(l / 2, -w / 2, l / 2, -w / 2 + r);
  shape.lineTo(l / 2, w / 2 - r);
  shape.quadraticCurveTo(l / 2, w / 2, l / 2 - r, w / 2);
  shape.lineTo(-l / 2 + r, w / 2);
  shape.quadraticCurveTo(-l / 2, w / 2, -l / 2, w / 2 - r);
  shape.lineTo(-l / 2, -w / 2 + r);
  shape.quadraticCurveTo(-l / 2, -w / 2, -l / 2 + r, -w / 2);

  const extrudeSettings = {
    steps: 1,
    depth: 0.72,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.08,
    bevelOffset: 0,
    bevelSegments: 4,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();

  // 金条经典上窄下宽梯形放样 (Trapezoidal Ingot Draft Angle)
  const pos = geom.attributes.position;
  const depthTotal = 0.72;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const taper = 1.0 - (z / depthTotal) * 0.16;
    pos.setX(i, pos.getX(i) * taper);
    pos.setY(i, pos.getY(i) * taper);
  }
  geom.computeVertexNormals();
  return geom;
}

// 创建高精度激光微刻质感纹理（印压：SGE、AU 999.9、FINE GOLD 1000g）
function createGoldEngravingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 金属底色渐变
  const grad = ctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.25, '#fbbf24');
  grad.addColorStop(0.55, '#f59e0b');
  grad.addColorStop(0.85, '#d97706');
  grad.addColorStop(1, '#b45309');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // 细腻拉丝金属微噪
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 512; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // 铸造凹凸边框
  ctx.strokeStyle = 'rgba(120, 55, 5, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 960, 448);
  ctx.strokeRect(42, 42, 940, 428);

  // 四角金印防伪角花
  ctx.fillStyle = 'rgba(110, 50, 5, 0.7)';
  ctx.fillRect(48, 48, 16, 16);
  ctx.fillRect(960, 48, 16, 16);
  ctx.fillRect(48, 448, 16, 16);
  ctx.fillRect(960, 448, 16, 16);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. 上标：上海黄金交易所
  ctx.font = '600 24px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(95, 45, 5, 0.75)';
  ctx.fillText('SHANGHAI GOLD EXCHANGE · SGE PHYSICAL ANCHOR', 512, 100);

  // 2. 主标：AU 999.9 (宏伟粗衬线)
  ctx.font = '900 86px "Archivo", "Inter", sans-serif';
  ctx.fillStyle = 'rgba(80, 35, 5, 0.9)';
  ctx.fillText('AU 999.9', 512, 215);

  // 3. 副标：FINE GOLD 1000g
  ctx.font = '700 32px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(95, 45, 5, 0.8)';
  ctx.fillText('FINE GOLD 1000g · NET PURITY 99.99%', 512, 305);

  // 4. 底标：验金师印章与量化序列号
  ctx.font = '500 20px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(105, 50, 5, 0.65)';
  ctx.fillText('MELTER ASSAYER · NO. 2026-QUANT-ALPHA-001', 512, 385);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

// 初始化 3D 黄金金条展示场景
function initThreeGoldScene() {
  const canvas = adv3dCanvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width || window.innerWidth;
  const height = rect.height || window.innerHeight;

  threeScene = new THREE.Scene();
  threeCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  threeCamera.position.set(0, 0, 7.2);

  threeRenderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  threeRenderer.setSize(width, height, false);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeRenderer.toneMappingExposure = 1.25;

  // 3D 金条材质
  const engravingTex = createGoldEngravingTexture();
  const goldMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf5b835,
    emissive: 0x241400,
    metalness: 0.96,
    roughness: 0.16,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    map: engravingTex,
    reflectivity: 0.96,
  });

  const geom = createGoldIngotGeometry();
  goldIngotMesh = new THREE.Mesh(geom, goldMaterial);
  goldIngotMesh.castShadow = true;
  goldIngotMesh.receiveShadow = true;
  threeScene.add(goldIngotMesh);

  // 3D 悬浮金尘粒子系统 (160 颗闪耀微粒)
  const particleCount = 160;
  const particleGeom = new THREE.BufferGeometry();
  const posArray = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    posArray[i] = (Math.random() - 0.5) * 8.5;
    posArray[i + 1] = (Math.random() - 0.5) * 6.5;
    posArray[i + 2] = (Math.random() - 0.5) * 4.5;
  }
  particleGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.045,
    color: 0xfde047,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  });
  sparklePoints = new THREE.Points(particleGeom, particleMat);
  threeScene.add(sparklePoints);

  // 专业影棚级照明系统 (金黄主光 + 极客蓝边缘光 + 紫罗兰漫反射)
  const keyLight = new THREE.DirectionalLight(0xfffae8, 3.2);
  keyLight.position.set(4.5, 5.0, 5.0);
  threeScene.add(keyLight);

  const rimBlueLight = new THREE.DirectionalLight(0x38bdf8, 2.6);
  rimBlueLight.position.set(-5.5, 2.0, -2.5);
  threeScene.add(rimBlueLight);

  const fillPurpleLight = new THREE.DirectionalLight(0xa855f7, 1.8);
  fillPurpleLight.position.set(0.5, -4.5, 3.0);
  threeScene.add(fillPurpleLight);

  const ambient = new THREE.AmbientLight(0x281c0f, 1.2);
  threeScene.add(ambient);

  // 窗口重置自适应
  function onResize() {
    if (!canvas || !threeRenderer || !threeCamera) return;
    const r = canvas.getBoundingClientRect();
    const w = r.width || window.innerWidth;
    const h = r.height || window.innerHeight;
    threeCamera.aspect = w / h;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(w, h, false);
  }
  window.addEventListener('resize', onResize);
}

// 全局 2D/Canvas 黄金粒子与流体能量波
function initGlobalGoldCanvas() {
  const canvas = bgCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const particles = Array.from({ length: 48 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 2.2 + 0.8,
    speedX: (Math.random() - 0.5) * 0.45,
    speedY: -Math.random() * 0.55 - 0.2,
    alpha: Math.random() * 0.5 + 0.25,
    hue: Math.random() > 0.3 ? 42 : 210, // 金色为主，间杂微量冷蓝
  }));

  function render() {
    ctx.clearRect(0, 0, width, height);

    // 绘制暗夜金底流体光晕
    const g1 = ctx.createRadialGradient(
      width * 0.5,
      height * 0.35,
      10,
      width * 0.5,
      height * 0.35,
      width * 0.65
    );
    g1.addColorStop(0, 'rgba(245, 158, 11, 0.08)');
    g1.addColorStop(0.5, 'rgba(59, 130, 246, 0.03)');
    g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, width, height);

    // 粒子上浮动效
    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle =
        p.hue === 42
          ? `rgba(251, 191, 36, ${p.alpha})`
          : `rgba(96, 165, 250, ${p.alpha * 0.8})`;
      ctx.fill();
    });

    bgAnimId = requestAnimationFrame(render);
  }

  function handleResize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', handleResize);
  render();
}

onMounted(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. 初始化背景能量流
  initGlobalGoldCanvas();

  // 2. 初始化 Section 3 核心 3D 金条
  initThreeGoldScene();

  // 鼠标交互微幅视差倾角追踪
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
  });

  // 3. 逐字错峰动画拆分
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

  // 4. Panel Scroll & Reveal Management (#hero, #recipe, #ess)
  const panels = Array.from(document.querySelectorAll('.panel'));
  const revealedPanels = new WeakSet();

  function triggerPanelReveal(panel) {
    if (revealedPanels.has(panel)) return;
    revealedPanels.add(panel);
    panel.classList.add('revealed');

    if (prefersReducedMotion) {
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

  // 首屏立即激活
  const heroPanel = document.getElementById('hero');
  if (heroPanel) {
    heroPanel.classList.add('is-active');
    triggerPanelReveal(heroPanel);
  }

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
          const id = p.id;
          document.querySelectorAll('.nav-links a').forEach((a) => {
            a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
          });
        }
      } else {
        if (p.classList.contains('is-active')) {
          p.classList.remove('is-active');
        }
      }
    });
  }

  // 5. Section 3 原生粘性滚轨 3D 动力学与转场控制
  const advSection = advSectionRef.value;
  const slides = Array.from(document.querySelectorAll('.adv-slide'));
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
  }

  function updateAdv3D() {
    if (!advSection || !goldIngotMesh) return;
    const p = sectionProgress(advSection);

    // 0.0 ~ 0.22 为进入过渡，0.22 ~ 1.0 为 3 幕动态轮转
    const t = Math.min(1, Math.max(0, (p - 0.15) / 0.85));

    // 计算当前活动 Slide (0: 结构纯度, 1: 跨市套利, 2: 12因子共振)
    const slideIdx = t < 0.34 ? 0 : t < 0.67 ? 1 : 2;
    setSlide(slideIdx);

    // 基于滚动进度的 3D 黄金金条姿态渐变目标
    if (slideIdx === 0) {
      // 第一幕：经典 35° 等轴俯瞰金条，展现顶部 SGE 与纯金印标
      const sub = t / 0.34;
      targetRotX = 0.36 + sub * 0.08;
      targetRotY = 0.58 + sub * 0.25;
      targetRotZ = 0.1;
      targetScale = 1.05;
    } else if (slideIdx === 1) {
      // 第二幕：平滑切至水平轮廓侧刃视角，展现双市厚度与冷蓝切光
      const sub = (t - 0.34) / 0.33;
      targetRotX = 0.18 + sub * 0.05;
      targetRotY = 1.57 + (sub - 0.5) * 0.35; // 约 90 度侧视
      targetRotZ = -0.08;
      targetScale = 1.18;
    } else {
      // 第三幕：央行金库庄严正视角度，金色光环与粒子群环绕
      const sub = (t - 0.67) / 0.33;
      targetRotX = 0.55 + (sub - 0.5) * 0.12;
      targetRotY = 0.05 + (sub - 0.5) * 0.25;
      targetRotZ = 0.0;
      targetScale = 1.25;
    }

    // 叠加鼠标交互平滑倾角差
    const mouseTiltX = (mouseY - 0.5) * 0.32;
    const mouseTiltY = (mouseX - 0.5) * 0.42;

    currentRotX += (targetRotX + mouseTiltX - currentRotX) * 0.08;
    currentRotY += (targetRotY + mouseTiltY - currentRotY) * 0.08;
    currentRotZ += (targetRotZ - currentRotZ) * 0.08;
    currentScale += (targetScale - currentScale) * 0.08;

    goldIngotMesh.rotation.set(currentRotX, currentRotY, currentRotZ);
    goldIngotMesh.scale.set(currentScale, currentScale, currentScale);

    // 粒子群缓动旋转
    if (sparklePoints) {
      sparklePoints.rotation.y += 0.0025;
      sparklePoints.rotation.x = currentRotX * 0.3;
    }

    if (threeRenderer && threeScene && threeCamera) {
      threeRenderer.render(threeScene, threeCamera);
    }
  }

  function onFrame() {
    updateActivePanel();
    updateAdv3D();
    rafId = requestAnimationFrame(onFrame);
  }

  rafId = requestAnimationFrame(onFrame);
});

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
  if (bgAnimId) cancelAnimationFrame(bgAnimId);
  if (advObserver) advObserver.disconnect();
  if (threeRenderer) threeRenderer.dispose();
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
  position: relative;
}

@media (max-width: 900px), (max-height: 540px) {
  .plume-cinematic-track {
    --pad: 5.2vw;
  }
}

/* 全局全景动态金光背景画布 */
.global-gold-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
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
  background: transparent;
  z-index: 2;
}

/* ============================================================
   SECTION 1 — HERO
   ============================================================ */
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
  font-size: clamp(13px, 1.62vw, 24px);
  line-height: 1.42;
  letter-spacing: -0.005em;
  color: var(--dim);
}
.h-mat-line {
  white-space: nowrap;
}

.h-mat-quote {
  margin-top: 10px;
  font-family: var(--mono);
  font-size: clamp(12px, 1.05vw, 15px);
  color: var(--dimmer);
  font-variant-numeric: tabular-nums;
}
.quote-gold { color: var(--gold-3); font-weight: 600; }
.quote-sep { margin: 0 8px; color: var(--text-3); }
.quote-intl { color: var(--text); font-weight: 600; }
.quote-premium { margin-left: 8px; color: var(--up); font-weight: 600; font-size: 0.9em; }

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
  max-width: 28ch;
  color: var(--dim);
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
   SECTION 3 — UNDENIABLE ADVANTAGES (NATIVE STICKY PIN 380vh)
   ============================================================ */
.adv {
  position: relative;
  height: 380vh;
  background: transparent;
  overflow: visible; /* CRITICAL: 必须保持 visible，取消 position:sticky 拦截 */
  z-index: 5;
}
.adv-stage {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden; /* Section 3 唯一允许 overflow:hidden 的粘性外框 */
  background: radial-gradient(circle at 50% 50%, rgba(30, 20, 10, 0.85) 0%, #000000 80%);
}

/* 核心 3D 黄金 WebGL 视窗 */
.adv-3d-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
  display: block;
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
   DESKTOP GRID：用 12 栅格代替百分比绝对定位，文字对齐随视口比例稳定
   ============================================================ */
@media (min-width: 901px) and (min-height: 541px) {
  .hero-content,
  .recipe-content {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-rows: auto 1fr auto;
    column-gap: 24px;
    padding-top: 118px;
    padding-bottom: 56px;
  }

  .hero-content > *,
  .recipe-content > * {
    position: relative;
    inset: auto;
    margin: 0;
  }

  .h-title { grid-column: 1 / span 8; grid-row: 1; align-self: start; }
  .h-mats { grid-column: 9 / span 4; grid-row: 1; align-self: start; justify-self: end; }
  .h-model { grid-column: 1 / span 4; grid-row: 2; align-self: start; margin-top: 0.75rem; }
  .h-strong { grid-column: 5 / span 8; grid-row: 2; align-self: end; justify-self: end; }
  .h-copy-1 { grid-column: 1 / span 4; grid-row: 3; align-self: end; }
  .h-copy-2 { grid-column: 5 / span 4; grid-row: 3; align-self: end; }
  .h-scroll { grid-column: 9 / span 4; grid-row: 3; align-self: end; justify-self: end; }

  .r-title { grid-column: 1 / span 8; grid-row: 1; align-self: start; }
  .r-lede { grid-column: 9 / span 4; grid-row: 1; align-self: start; justify-self: end; text-align: right; }
  .co-core { grid-column: 1 / span 5; grid-row: 2; align-self: center; }
  .co-steel { grid-column: 7 / span 6; grid-row: 3; align-self: end; justify-self: end; text-align: right; }
  .callout {
    position: relative;
    padding-bottom: 3vh;
  }
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
    max-width: 24ch;
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
    text-align: center;
    padding: 1.1em 1.6em;
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
