/**
 * ============================================================
 * 金库场景（Three.js r186）
 * - 大厅：金库走廊。建筑在 p 0.16→0.45 之间由背景色渐显（与页面背景同色起步）
 * - 远墙：最近 60 根日K 画布贴图，p 0.42→0.66 渐显
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

const GOLD_BAR = new THREE.Color(0xd9b26a);

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

  // 远墙：K 线画布贴图（监控屏保持深色，与昼夜无关）
  const chartCanvas = document.createElement('canvas');
  paintCandleChart(bars, 1024, 512, chartCanvas);
  const chartTex = track(new THREE.CanvasTexture(chartCanvas));
  chartTex.colorSpace = THREE.SRGBColorSpace;
  const farMat = track(new THREE.MeshBasicMaterial({ map: chartTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const far = new THREE.Mesh(track(new THREE.PlaneGeometry(13.6, 10)), farMat);
  far.position.set(0, 2.2, -80);
  hall.add(far);

  // 墙面投影字：贴在墙内侧 0.02 处，避免与墙面 z-fighting；颜色随昼夜重绘
  const letters = [
    { word: 'SHANGHAI', x: -5.96, z: -16, ry: Math.PI / 2 },
    { word: 'LONDON', x: 5.96, z: -30, ry: -Math.PI / 2 },
    { word: 'BASIS', x: -5.96, z: -44, ry: Math.PI / 2 },
    { word: 'SIGNAL', x: 5.96, z: -58, ry: -Math.PI / 2 },
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
  heroScene.add(new THREE.AmbientLight(0x3a2f20, 0.6));
  const heroKey = new THREE.DirectionalLight(0xfff3dc, 1.6);
  heroKey.position.set(-4, 7, 8);
  heroScene.add(heroKey);

  const ingotMat = track(
    new THREE.MeshStandardMaterial({ color: 0xd9b26a, metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 1.2 })
  );
  const ingot = new THREE.Mesh(track(new RoundedBoxGeometry(2.2, 0.9, 1.25, 3, 0.08)), ingotMat);
  const labelTex = track(new THREE.CanvasTexture(paintIngotLabel('AU 999.9')));
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const labelMat = track(new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false, toneMapped: false }));
  const label = new THREE.Mesh(track(new THREE.PlaneGeometry(1.5, 0.62)), labelMat);
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
    const cy = mobile ? height * 0.49 : height * 0.44;
    heroBaseX = (cx - width / 2) * heroPerPx;
    heroBaseY = (height / 2 - cy) * heroPerPx;
    const targetPx = mobile ? Math.min(width * 0.5, height * 0.24) : Math.min(width * 0.34, height * 0.5);
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
    paintCandleChart(next || [], 1024, 512, chartCanvas);
    chartTex.needsUpdate = true;
  }

  // 昼夜切换：mode 为 'light'（日间）或 'dark'（夜间）；baseHex 为日间底色（--bg 的运行时值）
  // 只更新颜色与贴图，不重建几何体，因此无需重载页面
  function setTheme(mode, baseHex) {
    palette = mode === 'light' ? dayPalette(baseHex) : NIGHT;
    renderer.setClearColor(palette.base, 1);
    gridMat.color.copy(palette.line);
    for (const letter of letters) {
      paintLettering(letter.word, 1024, 256, letter.canvas, palette.letter);
      letter.tex.needsUpdate = true;
    }
  }

  // ---------------- 每帧渲染 ----------------
  const target = new THREE.Vector3();

  // state: { p, reduced, time, look: {x,y}（已乘动效强度）, tunnelLook: {x,y}（-1..1，y 向上为正） }
  function render(state = {}) {
    const p = clamp01(state.p ?? 0);
    const reduced = Boolean(state.reduced);
    const time = state.time ?? 0;
    const look = state.look ?? { x: 0, y: 0 };
    const tunnelLook = state.tunnelLook ?? { x: 0, y: 0 };

    // 建筑渐显：p 0.16 → 0.45；减少动态时固定为 0.6
    const a = reduced ? 0.6 : smooth(0.16, 0.45, p);
    for (const { mat, key: tone } of archMats) mat.color.copy(palette.base).lerp(palette[tone], a);
    barMat.color.copy(palette.base).lerp(GOLD_BAR, a);
    barMat.envMapIntensity = a * 1.25;
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
      look.y * 0.1,
      0.32 * Math.sin(time * 0.35) + look.x * 0.2 - 1.4 * Math.PI * k,
      -look.x * 0.018
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
