/**
 * ============================================================
 * 金币物理：固定步长 120 Hz 的二维圆盘模拟（屏幕坐标，y 向下）
 * - 重力、回弹（阻尼恢复）、圆盘之间的接触
 * - 可倾斜的地面：floorFn(x) 返回地面的 y 坐标
 * - 静止且速度很小时休眠；地面移动或被撞击时自动唤醒
 * 只负责数据，渲染与交互在 coins.js
 * ============================================================
 */

export const SIM_HZ = 120;
export const SIM_STEP = 1 / SIM_HZ;

const MAX_STEPS_PER_FRAME = 12;
const SLEEP_TIME = 0.35; // 连续静止超过该时长（秒）后休眠
const SLEEP_SPEED = 6; // 低于该速度（px/s）视为静止
const IMPACT_MIN = 90; // 高于该速度的落地记为冲击，用于挤压动画
const BOUNCE_MIN = 40; // 低于该速度的落地直接停住，避免无限抖动
const WAKE_GAP = 0.5; // 圆底与地面的间隙超过该值（px）时唤醒

export function createWorld({ gravity = 2400, restitution = 0.5 } = {}) {
  return {
    bodies: [],
    gravity,
    restitution,
    floorFn: null,
    impacts: [],
    accumulator: 0,
  };
}

export function createBody({ x, y, r, vx = 0, vy = 0, index = 0 }) {
  return { x, y, r, vx, vy, roll: 0, rest: 0, sleeping: false, index };
}

// 以固定步长推进。帧间隔限制在 0.1 s 内，切换标签页后不会一次性跳很多步
export function stepWorld(world, dt) {
  world.accumulator += Math.min(Math.max(dt, 0), 0.1);
  let steps = 0;
  while (world.accumulator >= SIM_STEP && steps < MAX_STEPS_PER_FRAME) {
    integrate(world, SIM_STEP);
    world.accumulator -= SIM_STEP;
    steps += 1;
  }
  if (steps >= MAX_STEPS_PER_FRAME) world.accumulator = 0;
  return steps;
}

export function allAsleep(world) {
  return world.bodies.length > 0 && world.bodies.every((b) => b.sleeping);
}

export function wakeAll(world) {
  for (const b of world.bodies) {
    b.sleeping = false;
    b.rest = 0;
  }
}

function integrate(world, h) {
  const { bodies, gravity } = world;
  for (const b of bodies) {
    if (b.sleeping) continue;
    b.vy += gravity * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    // 滚动角由水平位移决定：圆盘沿地面滚动时的旋转
    b.roll += (b.vx * h) / b.r;
  }
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      collideBodies(bodies[i], bodies[j], world);
    }
  }
  for (const b of bodies) collideFloor(b, world, h);
}

function wake(b) {
  b.sleeping = false;
  b.rest = 0;
}

// 圆盘之间：按重叠量分开，并沿法线交换速度（等质量，带回弹）
function collideBodies(a, b, world) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const minDist = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= minDist * minDist) return;

  const d = Math.sqrt(d2) || 1e-4;
  const nx = dx / d;
  const ny = dy / d;
  const push = (minDist - d) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  wake(a);
  wake(b);

  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel < 0) {
    const j = (-(1 + world.restitution) * rel) / 2;
    a.vx -= j * nx;
    a.vy -= j * ny;
    b.vx += j * nx;
    b.vy += j * ny;
  }
}

// 地面：穿入时推回地面；落地时回弹并记录冲击；沿坡度加速，并有滚动阻力
function collideFloor(b, world, h) {
  const floor = world.floorFn;
  if (!floor) return;

  const surface = floor(b.x);
  const gap = surface - (b.y + b.r); // 负值表示圆底已经穿入地面

  if (b.sleeping) {
    if (Math.abs(gap) > WAKE_GAP) {
      wake(b);
    } else {
      b.y = surface - b.r;
      return;
    }
  }

  if (gap >= 0) {
    b.rest = 0;
    return;
  }

  b.y += gap;
  if (b.vy > 0) {
    const impact = b.vy;
    if (impact > IMPACT_MIN) world.impacts.push({ body: b, speed: impact });
    b.vy = impact > BOUNCE_MIN ? -impact * world.restitution : 0;
  }

  const slope = (floor(b.x + 4) - floor(b.x - 4)) / 8;
  b.vx += ((world.gravity * slope) / (1 + slope * slope)) * h;
  b.vx *= Math.max(0, 1 - 3.2 * h);

  const still = Math.abs(b.vy) < SLEEP_SPEED && Math.abs(b.vx) < SLEEP_SPEED;
  b.rest = still ? b.rest + h : 0;
  if (b.rest > SLEEP_TIME) {
    b.sleeping = true;
    b.vx = 0;
    b.vy = 0;
    b.y = surface - b.r;
  }
}
