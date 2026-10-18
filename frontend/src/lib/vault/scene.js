/**
 * ============================================================
 * 金库场景（Three.js r186）
 * - 大厅：金库走廊。建筑在 p 0.16→0.45 之间由背景色渐显（与页面背景同色起步）
 * - 远墙：最近 60 根日K 画布贴图（夜间深色监控屏，日间浅色纸本面板），p 0.42→0.66 渐显
 * - 墙面投影字：p 0.12 起渐显，深度测试开启
 * - 金条：程序化圆角金条，位于独立的透视通道，p 0.025→0.115 折叠退场
 * - 昼夜：夜间为 #050507 黑色调；日间以纸本背景（--bg）为底、淡色石材
 *   金条与金币保持金色材质，setTheme() 可在运行时切换而无需重载
 * 同一画布两遍渲染：先大厅（清屏），再金条（只清深度）
 * ============================================================
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { paintCandleChart, paintIngotLabel, paintLettering, GOLD } from './textures';

const GOLD_BAR = new THREE.Color(0xf5b835);

// 夜间调色板：建筑从 #050507 渐显到石材色
const NIGHT = {
  base: new THREE.Color(0x050507),
  floor: new THREE.Color(0x17130d),
  wall: new THREE.Color(0x120f0a),
  ceiling: new THREE.Color(0x0c0a07),
  shelf: new THREE.Color(0x1e180f),
  light: new THREE.Color(0xfff1d0),
  line: new THREE.Color(GOLD),
  letter: GOLD,
};

// 日间调色板：底色取运行时读取的 --bg（纸本色），墙面与地面为淡色石材
function dayPalette(baseHex) {
  return {
    base: new THREE.Color(baseHex),
    floor: new THREE.Color(0xe4dccb),
    wall: new THREE.Color(0xdcd3bf),
    ceiling: new THREE.Color(0xefe8d8),
    shelf: new THREE.Color(0xd6cbb2),
    light: new THREE.Color(0xfffaf0),
    line: new THREE.Color(0xb8892e),
    letter: '#8c6a2b',
  };
}

const HERO_FOV = 30;
const HERO_DIST = 10;
const TRAVEL_START = 0.16;
const TRAVEL_END = 0.985;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const sineEase = (t) => (1 - Math.cos(Math.PI * clamp01(t))) / 2;

// 探测 WebGL 是否可用（使用临时画布，不占用正式画布）
export function webglAvailable() {
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

export function createVaultScene(canvas, { mobile = false, bars = [] } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.autoClear = false;
  renderer.setClearColor(NIGHT.base, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  const env = envTarget.texture;

  const disposables = [];
  const track = (obj) => {
    disposables.push(obj);
    return obj;
  };

  let palette = NIGHT;
  const archMats = []; // [{ mat, key }]：随建筑进度从底色渐变到调色板中对应的色调
  const arch = (mat, key) => {
    mat.toneMapped = false;
    archMats.push({ mat, key });
    return mat;
  };

  // ---------------- 金库大厅 ----------------
  const hall = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 140);

  const floorMat = arch(track(new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 })), 'floor');
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(12.6, 110)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.2, -36);
  hall.add(floor);

  const wallMat = arch(track(new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0 })), 'wall');
  const wallGeo = track(new THREE.BoxGeometry(0.4, 7.4, 110));
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(side * 6.2, 2.5, -36);
    hall.add(wall);
  }

  const ceilingMat = arch(track(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 })), 'ceiling');
  const ceiling = new THREE.Mesh(track(new THREE.PlaneGeometry(12.6, 110)), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 6.2, -36);
  hall.add(ceiling);

  const stripMat = track(new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }));
  for (const x of [-2.6, 2.6]) {
    const strip = new THREE.Mesh(track(new THREE.BoxGeometry(0.22, 0.05, 100)), stripMat);
    strip.position.set(x, 6.14, -36);
    hall.add(strip);
  }

  // 货架与金条：实例化渲染，数量固定，不随滚动增加
  const boardMat = arch(track(new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 })), 'shelf');
  const barMat = track(
    new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 1, roughness: 0.28, envMap: env, envMapIntensity: 0 })
  );
  const bays = [];
  for (let z = 12; z > -78; z -= 2.2) bays.push(z);
  const levels = [-0.55, 0.7, 1.95];
  const boardCount = bays.length * levels.length * 2;
  const boards = track(new THREE.InstancedMesh(track(new THREE.BoxGeometry(1.3, 0.1, 2.1)), boardMat, boardCount));
  const bars3d = track(
    new THREE.InstancedMesh(track(new RoundedBoxGeometry(0.5, 0.26, 1.7, 2, 0.04)), barMat, boardCount * 2)
  );
  const dummy = new THREE.Object3D();
  let boardIndex = 0;
  let barIndex = 0;
  for (const side of [-1, 1]) {
    for (const z of bays) {
      for (const y of levels) {
        const x = side * 5.45;
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        boards.setMatrixAt(boardIndex++, dummy.matrix);
        for (const dx of [-0.34, 0.34]) {
          dummy.position.set(x + dx, y + 0.18, z);
          dummy.updateMatrix();
          bars3d.setMatrixAt(barIndex++, dummy.matrix);
        }
      }
    }
  }
  boards.instanceMatrix.needsUpdate = true;
  bars3d.instanceMatrix.needsUpdate = true;
  hall.add(boards, bars3d);

  // 地面金线网格：透明度随建筑渐显，颜色随昼夜切换
  const gridMat = track(new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const gridPoints = [];
  for (let z = 14; z >= -80; z -= 2) gridPoints.push(-6, -1.19, z, 6, -1.19, z);
  for (let x = -6; x <= 6; x += 2) gridPoints.push(x, -1.19, 14, x, -1.19, -80);
  const gridGeo = track(new THREE.BufferGeometry());
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
  hall.add(new THREE.LineSegments(gridGeo, gridMat));

  const ambient = new THREE.AmbientLight(0x2c2317, 0);
  const key = new THREE.DirectionalLight(0xfff1d0, 0);
  key.position.set(-3, 9, 7);
  key.target.position.set(0, 0, -20);
  const warmA = new THREE.PointLight(0xfff1d0, 0, 70, 1.6);
  warmA.position.set(0, 5.6, -6);
  const warmB = new THREE.PointLight(0xfff1d0, 0, 70, 1.6);
  warmB.position.set(0, 5.6, -40);
  hall.add(ambient, key, key.target, warmA, warmB);

  // 远墙：K 线画布贴图；夜间为深色监控屏，日间为浅色纸本面板（setTheme 时重绘）
  const chartCanvas = document.createElement('canvas');
  let chartMode = 'dark';
  let chartBars = bars || [];
  paintCandleChart(chartBars, 1024, 512, chartCanvas, chartMode);
  const chartTex = track(new THREE.CanvasTexture(chartCanvas));
  chartTex.colorSpace = THREE.SRGBColorSpace;
  const farMat = track(new THREE.MeshBasicMaterial({ map: chartTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const far = new THREE.Mesh(track(new THREE.PlaneGeometry(13.6, 10)), farMat);
  far.position.set(0, 2.2, -80);
  hall.add(far);

  // 墙面投影字：贴在墙内侧 0.02 处，避免与墙面 z-fighting；颜色随昼夜重绘
  const letters = [
    { word: 'Shanghai', x: -5.96, z: -16, ry: Math.PI / 2 },
    { word: 'London', x: 5.96, z: -30, ry: -Math.PI / 2 },
    { word: 'Basis', x: -5.96, z: -44, ry: Math.PI / 2 },
    { word: 'Signal', x: 5.96, z: -58, ry: -Math.PI / 2 },
  ].map(({ word, x, z, ry }) => {
    const letterCanvas = document.createElement('canvas');
    paintLettering(word, 1024, 256, letterCanvas, NIGHT.letter);
    const tex = track(new THREE.CanvasTexture(letterCanvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(4.2, 1.05)), mat);
    mesh.position.set(x, 2, z);
    mesh.rotation.y = ry;
    hall.add(mesh);
    return { word, canvas: letterCanvas, tex, mat };
  });

  // ---------------- 金条（Hero 通道） ----------------
  const heroScene = new THREE.Scene();
  const heroCam = new THREE.PerspectiveCamera(HERO_FOV, 1, 0.1, 100);
  heroCam.position.set(0, 2.4, HERO_DIST);
  heroCam.lookAt(0, 0, 0);

  // 专业摄影棚 3 点照明：金黄主光 + 极客冷蓝轮廓光 + 柔和暖金环境
  heroScene.add(new THREE.AmbientLight(0x3a2610, 0.9));
  const heroKey = new THREE.DirectionalLight(0xfff8e8, 3.2);
  heroKey.position.set(-3.5, 7.5, 7.5);
  heroScene.add(heroKey);

  const heroRim = new THREE.DirectionalLight(0x38bdf8, 2.2);
  heroRim.position.set(5.5, 3.5, -4.5);
  heroScene.add(heroRim);

  const heroFill = new THREE.DirectionalLight(0xf59e0b, 1.4);
  heroFill.position.set(1.5, -4.0, 3.5);
  heroScene.add(heroFill);

  const ingotMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xf5b835,
      emissive: 0x241400,
      metalness: 0.96,
      roughness: 0.16,
      clearcoat: 0.55,
      clearcoatRoughness: 0.1,
      reflectivity: 0.96,
      envMap: env,
      envMapIntensity: 1.5,
    })
  );
  const ingot = new THREE.Mesh(track(new RoundedBoxGeometry(2.2, 0.9, 1.25, 4, 0.08)), ingotMat);
  const labelTex = track(new THREE.CanvasTexture(paintIngotLabel('AU 999.9')));
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = 8;
  const labelMat = track(new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false, toneMapped: false }));
  const label = new THREE.Mesh(track(new THREE.PlaneGeometry(1.55, 0.72)), labelMat);
  label.rotation.x = -Math.PI / 2; // 铭牌朝上，文字顶部朝远离观众的方向
  label.position.y = 0.455;
  ingot.add(label);
  const ingotGroup = new THREE.Group();
  ingotGroup.add(ingot);
  heroScene.add(ingotGroup);

  // ---------------- 尺寸与布局 ----------------
  let width = 1;
  let height = 1;
  const pixelCap = mobile ? 1.5 : 2;
  let heroPerPx = 1;
  let heroBaseX = 0;
  let heroBaseY = 0;
  let heroBaseScale = 1;

  function layoutHero() {
    heroPerPx = (2 * Math.tan(THREE.MathUtils.degToRad(HERO_FOV / 2)) * HERO_DIST) / height;
    const cx = mobile ? width * 0.5 : width * 0.66;
    const cy = mobile ? height * 0.5 : height * 0.44;
    heroBaseX = (cx - width / 2) * heroPerPx;
    heroBaseY = (height / 2 - cy) * heroPerPx;
    // 手机：金条居中于首屏视觉区，宽度约为视觉区的 60%
    const targetPx = mobile ? Math.min(width * 0.6, height * 0.8) : Math.min(width * 0.34, height * 0.5);
    heroBaseScale = (targetPx * heroPerPx) / 2.2;
  }

  function setSize(w, h, dpr = 1) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setPixelRatio(Math.min(dpr, pixelCap));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    heroCam.aspect = width / height;
    heroCam.updateProjectionMatrix();
    layoutHero();
  }

  function setBars(next) {
    chartBars = next || [];
    paintCandleChart(chartBars, 1024, 512, chartCanvas, chartMode);
    chartTex.needsUpdate = true;
  }

  // 昼夜切换：mode 为 'light'（日间）或 'dark'（夜间）；baseHex 为日间底色（--bg 的运行时值）
  // 只更新颜色与贴图，不重建几何体，因此无需重载页面
  function setTheme(mode, baseHex) {
    palette = mode === 'light' ? dayPalette(baseHex) : NIGHT;
    // 日间以同一张环境贴图提供柔和的环境光；夜间不挂载，保持纯黑调
    hall.environment = palette === NIGHT ? null : env;
    renderer.setClearColor(palette.base, 1);
    gridMat.color.copy(palette.line);
    chartMode = mode === 'light' ? 'light' : 'dark';
    paintCandleChart(chartBars, 1024, 512, chartCanvas, chartMode);
    chartTex.needsUpdate = true;
    for (const letter of letters) {
      paintLettering(letter.word, 1024, 256, letter.canvas, palette.letter);
      letter.tex.needsUpdate = true;
    }
  }

  // ---------------- 每帧渲染 ----------------
  const target = new THREE.Vector3();

  // state: { p, reduced, look: {x,y}（已乘动效强度）, tunnelLook: {x,y}（-1..1，y 向上为正） }
  // 画面只由进度 p 与指针决定，没有随时间持续变化的动画，因此不需要常驻的帧循环
  function render(state = {}) {
    const p = clamp01(state.p ?? 0);
    const reduced = Boolean(state.reduced);
    const look = state.look ?? { x: 0, y: 0 };
    const tunnelLook = state.tunnelLook ?? { x: 0, y: 0 };

    // 建筑渐显：p 0.16 → 0.45；减少动态时固定为 0.6
    const a = reduced ? 0.6 : smooth(0.16, 0.45, p);
    // 未点亮时以底色自发光：建筑从背景色渐显，首帧不会出现黑块
    for (const { mat, key: tone } of archMats) {
      mat.color.copy(palette.base).lerp(palette[tone], a);
      mat.emissive.copy(palette.base);
      mat.emissiveIntensity = 1 - a;
    }
    barMat.color.copy(palette.base).lerp(GOLD_BAR, a);
    barMat.emissive.copy(palette.base);
    barMat.emissiveIntensity = 1 - a;
    barMat.envMapIntensity = a * 1.25;
    // 日间环境光随建筑渐显（夜间无环境贴图，此项不生效）
    hall.environmentIntensity = 0.9 * a;
    stripMat.color.copy(palette.base).lerp(palette.light, a * 0.5);
    gridMat.opacity = 0.18 * a;
    ambient.intensity = 0.5 * a;
    key.intensity = 1.6 * a;
    // 日间的暖光减弱，避免淡色墙面被染成黄色
    const warm = palette === NIGHT ? 1 : 0.45;
    warmA.intensity = 90 * a * warm;
    warmB.intensity = 90 * a * warm;

    // 远墙与投影字
    farMat.opacity = reduced ? 1 : smooth(0.42, 0.66, p);
    const letter = reduced ? 1 : smooth(0.12, 0.3, p);
    for (const item of letters) item.mat.opacity = letter;

    // 相机路径：travel 沿 p 0.16 → 0.985 缓动；turn 负责小幅偏航
    const travelRaw = reduced ? 0.5 : clamp01((p - TRAVEL_START) / (TRAVEL_END - TRAVEL_START));
    const travel = sineEase(travelRaw);
    const turn = reduced ? 0.3 : smooth(0.16, 0.52, p);
    const tunnelW = reduced ? 0 : smooth(0.2, 0.42, p) * (1 - smooth(0.72, 0.94, p));
    const yaw = 0.035 * Math.sin(turn * Math.PI) + tunnelLook.x * THREE.MathUtils.degToRad(14) * tunnelW;
    const pitch = tunnelLook.y * THREE.MathUtils.degToRad(8) * tunnelW;
    const camX = Math.sin(travel * Math.PI) * 0.75;
    const camY = 4 - 0.15 * Math.sin(travel * Math.PI);
    const camZ = 14 + (-72 - 14) * travel;
    camera.position.set(camX, camY, camZ);
    const dist = 12;
    target.set(camX + Math.sin(yaw) * dist, camY - 0.9 + Math.sin(pitch) * dist, camZ - Math.cos(yaw) * dist);
    camera.lookAt(target);
    if (mobile) {
      const fov = 44 + 20 * smooth(0.16, 0.3, p);
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }

    // 金条：p 0.025 → 0.115 折叠（缩小、绕 Y 旋转、后退），不做透明度渐隐
    const k = reduced ? 0 : smooth(0.025, 0.115, p);
    ingotGroup.visible = k < 0.999;
    ingotGroup.scale.setScalar(Math.max(0.0001, 1 - k) * heroBaseScale);
    ingotGroup.position.set(
      heroBaseX + look.x * 32 * heroPerPx,
      heroBaseY + look.y * 24 * heroPerPx,
      -2.5 * k
    );
    ingotGroup.rotation.set(
      0.10 + look.y * 0.08,
      0.20 + look.x * 0.18 - 1.4 * Math.PI * k,
      0.03 - look.x * 0.016
    );

    // 建筑、远墙与投影字都不可见时跳过大厅绘制（首屏常态），只绘制金条
    renderer.clear(true, true, true);
    if (a > 0 || letter > 0 || farMat.opacity > 0) renderer.render(hall, camera);
    renderer.clearDepth();
    renderer.render(heroScene, heroCam);
  }

  function dispose() {
    for (const obj of disposables) obj.dispose?.();
    envTarget.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
  }

  setBars(bars);
  setSize(1, 1, 1);

  return { setSize, setBars, setTheme, render, dispose };
}
