/**
 * ============================================================
 * 金币层：独立的正交画布，只渲染金币与接触阴影
 * - 1 单位 = 1 CSS 像素，坐标系 y 向下，与 DOM 坐标一致
 * - 金币在屏幕平面内滚动（绕自身轴旋转），与物理的滚动角一致
 * - 退场：绕弧、旋转、缩小到 0（不做透明度渐隐）
 * ============================================================
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createWorld, createBody, stepWorld, allAsleep, SIM_STEP } from './physics';
import { paintCoinFace, paintShadow, DISPLAY_STACK } from './textures';

let measureCtx = null;

// 行盒顶部到大写字母顶部（帽线）的距离（px），用于让金币落在字母的帽线上
export function measureCapTop(fontSize, lineHeight, family = DISPLAY_STACK) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = `400 ${fontSize}px ${family}`;
  const m = measureCtx.measureText('H');
  const ascent = m.fontBoundingBoxAscent ?? fontSize * 0.9;
  const descent = m.fontBoundingBoxDescent ?? fontSize * 0.25;
  const cap = m.actualBoundingBoxAscent ?? fontSize * 0.72;
  const baseline = (lineHeight - (ascent + descent)) / 2 + ascent;
  return baseline - cap;
}

export function createCoinLayer(canvas, { labels = [], radius = 52, thickness = 12, gravity, restitution } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;

  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -400, 400);
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xfffae0, 2.2);
  key.position.set(-0.6, -0.9, 1.2);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0x45341c, 0.85));

  const coinGeo = new THREE.CylinderGeometry(radius, radius, thickness, 72, 1, false);
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xf5b835, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.1 });
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const shadowTex = new THREE.CanvasTexture(paintShadow(128));
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    toneMapped: false,
  });

  const faceTextures = [];
  const coins = labels.map((label, index) => {
    const tex = new THREE.CanvasTexture(paintCoinFace(label, 512));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.center.set(0.5, 0.5);
    tex.rotation = -Math.PI / 2; // 标签在圆面上正向显示
    faceTextures.push(tex);
    // 高饱和黄金材质，metalness 调为 0.15，彻底消除金属纯白镜面过曝，让 24K 纯金纹理与浮雕深字鲜明呈现
    const faceMat = new THREE.MeshStandardMaterial({
      map: tex,
      metalness: 0.15,
      roughness: 0.32,
      envMapIntensity: 0.25,
    });
    // 圆柱分组：0 侧面，1 顶面，2 底面；顶面朝向观众
    const mesh = new THREE.Mesh(coinGeo, [sideMat, faceMat, faceMat]);
    mesh.rotation.order = 'XYZ';
    mesh.rotation.x = Math.PI / 2;
    const group = new THREE.Group();
    group.add(mesh);
    scene.add(group);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    scene.add(shadow);
    return { index, group, mesh, shadow, faceMat, body: null, squash: 0 };
  });

  const world = createWorld({ gravity, restitution });
  let width = 1;
  let height = 1;
  let exitK = 0;
  let spawned = false;
  let needsRender = true; // 静止且无变化时跳过渲染，节省每帧的 GPU 开销
  const lastPos = coins.map(() => ({ x: -1e4, y: -1e4, scale: 0, visible: false }));

  function setSize(w, h, pixelRatio = 1) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.left = 0;
    camera.right = width;
    camera.top = 0;
    camera.bottom = height;
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  // xs：每枚硬币的起始 x（画布坐标）；从画布上方落下
  function spawn(xs) {
    world.bodies = coins.map((coin, i) => {
      const body = createBody({ x: xs[i] ?? width / 2, y: -radius * (2 + i * 2.4), r: radius, index: i });
      coin.body = body;
      coin.squash = 0;
      return body;
    });
    world.impacts.length = 0;
    spawned = true;
    needsRender = true;
  }

  // 减少动态效果或首帧：直接推演到静止，不播放落下过程
  function settle(seconds, floorFn) {
    world.floorFn = floorFn;
    const steps = Math.round(seconds / SIM_STEP);
    for (let i = 0; i < steps; i += 1) stepWorld(world, SIM_STEP);
    world.impacts.length = 0;
    needsRender = true;
  }

  function setExit(k) {
    const next = Math.min(1, Math.max(0, k));
    if (next !== exitK) needsRender = true;
    exitK = next;
  }

  // 每帧：推进物理、更新网格，然后渲染
  function frame(dt, floorFn, { draw = true } = {}) {
    world.floorFn = floorFn;
    stepWorld(world, dt);

    // 滚出两侧或落出画面的硬币从上方重新落下
    for (const b of world.bodies) {
      if (b.x < -2 * radius || b.x > width + 2 * radius || b.y > height + 4 * radius) {
        b.x = width * (0.3 + Math.random() * 0.4);
        b.y = -radius * 3;
        b.vx = 0;
        b.vy = 0;
        b.sleeping = false;
        b.rest = 0;
      }
    }

    for (const hit of world.impacts) {
      const coin = coins[hit.body.index];
      if (coin) coin.squash = Math.min(1, hit.speed / 900);
    }
    world.impacts.length = 0;

    const decay = Math.exp(-dt * 12);
    const arc = Math.sin(Math.PI * exitK);
    const s = Math.max(0.0001, 1 - exitK);
    const visible = exitK < 0.999;
    for (const coin of coins) {
      coin.squash *= decay;
      const b = coin.body;
      if (!b) continue;

      const x = b.x + (coin.index - 1) * 80 * arc;
      const y = b.y - arc * 150;
      coin.group.visible = visible;
      coin.group.position.set(x, y, 0);
      coin.group.scale.set(s * (1 + coin.squash * 0.18), s * (1 - coin.squash * 0.26), s);
      coin.mesh.rotation.set(Math.PI / 2, b.roll + exitK * Math.PI * 4, 0);

      const surface = floorFn ? floorFn(b.x) : b.y + radius;
      coin.shadow.visible = visible;
      coin.shadow.position.set(x, surface + 1.5, -4);
      coin.shadow.scale.set(radius * 2.5 * s, radius * 0.7 * s, 1);

      lastPos[coin.index] = { x, y, scale: s, visible };
    }

    if (draw && (needsRender || !allAsleep(world))) {
      renderer.render(scene, camera);
      needsRender = false;
    }
  }

  // 命中测试：圆形范围，随硬币形变与退场缩放
  function hitTest(x, y) {
    let best = -1;
    let bestDistance = Infinity;
    for (const coin of coins) {
      const p = lastPos[coin.index];
      if (!p.visible || p.scale <= 0) continue;
      const hitRadius = radius * p.scale * 1.08;
      const distance = Math.hypot(x - p.x, y - p.y);
      if (distance <= hitRadius && distance < bestDistance) {
        best = coin.index;
        bestDistance = distance;
      }
    }
    return best;
  }

  function positions() {
    return lastPos.map((p, index) => ({ index, x: p.x, y: p.y, r: radius * p.scale, visible: p.visible }));
  }

  function isSettled() {
    return spawned && allAsleep(world);
  }

  function dispose() {
    coinGeo.dispose();
    sideMat.dispose();
    shadowGeo.dispose();
    shadowTex.dispose();
    shadowMat.dispose();
    for (const coin of coins) coin.faceMat.dispose();
    for (const tex of faceTextures) tex.dispose();
    envTarget.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
  }

  return { setSize, spawn, settle, frame, setExit, hitTest, positions, isSettled, dispose, count: coins.length };
}
