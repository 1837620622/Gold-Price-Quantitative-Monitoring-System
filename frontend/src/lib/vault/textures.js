/**
 * ============================================================
 * 金库贴图：所有 Canvas 绘制集中在这里
 * - 金币面标签、金条顶部铭牌、远墙 K 线画布、墙面投影字（Anton）
 * - 画布文字依赖字体，使用前先 await prepareFonts()
 * ============================================================
 */

export const DISPLAY_STACK = "Anton, Impact, 'Arial Narrow Bold', sans-serif";
export const MONO_STACK = "'JetBrains Mono', 'SF Mono', Consolas, monospace";
export const GOLD = '#e8c77d';
export const GOLD_HI = '#f6dea4';
export const GOLD_DEEP = '#8c6a2b';
export const UP = '#ef4444'; // 红涨
export const DOWN = '#10b981'; // 绿跌

const MA_PERIOD = 20;

export async function prepareFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([document.fonts.load('400 120px Anton'), document.fonts.load("500 16px 'JetBrains Mono'")]);
  } catch {
    // 字体加载失败时使用回退字体，不影响主流程
  }
}

export function makeCanvas(width, height, canvas) {
  const target = canvas || document.createElement('canvas');
  target.width = width;
  target.height = height;
  return target;
}

// 按宽度上限缩小字号，保证文字不溢出
function fitFont(ctx, text, maxWidth, baseSize, weight = 400, family = DISPLAY_STACK) {
  let size = Math.round(baseSize);
  ctx.font = `${weight} ${size}px ${family}`;
  const measured = ctx.measureText(text).width;
  if (measured > maxWidth && measured > 0) {
    size = Math.floor(size * (maxWidth / measured));
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 金币正反面：径向金色 + 双层刻边 + 深色压印标签
export function paintCoinFace(label, size = 512, canvas) {
  const c = makeCanvas(size, size, canvas);
  const ctx = c.getContext('2d');
  const r = size / 2;
  ctx.clearRect(0, 0, size, size);

  const body = ctx.createRadialGradient(r * 0.72, r * 0.64, r * 0.08, r, r, r);
  body.addColorStop(0, GOLD_HI);
  body.addColorStop(0.58, GOLD);
  body.addColorStop(1, GOLD_DEEP);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = 'rgba(92, 64, 18, 0.85)';
  ctx.beginPath();
  ctx.arc(r, r, r * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = size * 0.012;
  ctx.strokeStyle = 'rgba(255, 241, 199, 0.6)';
  ctx.beginPath();
  ctx.arc(r, r, r * 0.8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#17110a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, label, size * 0.74, size * 0.24);
  ctx.fillText(label, r, r * 1.03);
  return c;
}

// 金条顶部铭牌：深色底、金色边框与字
export function paintIngotLabel(text = 'AU 999.9', width = 1024, height = 512, canvas) {
  const c = makeCanvas(width, height, canvas);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const pad = height * 0.12;
  roundRect(ctx, pad, pad, width - pad * 2, height - pad * 2, height * 0.12);
  ctx.fillStyle = 'rgba(5, 5, 7, 0.92)';
  ctx.fill();
  ctx.lineWidth = height * 0.018;
  ctx.strokeStyle = 'rgba(232, 199, 125, 0.7)';
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, text, width * 0.72, height * 0.5);
  ctx.fillText(text, width / 2, height / 2 + height * 0.02);
  return c;
}

// 接触阴影：中心深、边缘透明的径向渐变
export function paintShadow(size = 128, canvas) {
  const c = makeCanvas(size, size, canvas);
  const ctx = c.getContext('2d');
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  g.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

// 墙面投影字：透明底上的金色 Anton 大写
export function paintLettering(word, width = 1024, height = 256, canvas) {
  const c = makeCanvas(width, height, canvas);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, word, width * 0.92, height * 0.78);
  ctx.fillText(word, width / 2, height / 2 + height * 0.03);
  return c;
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = 'rgba(232, 199, 125, 0.09)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 6; i += 1) {
    const y = Math.round((height * i) / 6) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  for (let i = 1; i < 12; i += 1) {
    const x = Math.round((width * i) / 12) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  ctx.stroke();
}

// 远墙 K 线：最近 60 根日K，红涨绿跌，MA20 为金线（MA 基于完整序列计算）
export function paintCandleChart(bars, width = 1024, height = 512, canvas) {
  const c = makeCanvas(width, height, canvas);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#07080b';
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, width, height);

  const valid = (bars || []).filter((b) => [b.open, b.high, b.low, b.close].every(Number.isFinite));
  if (valid.length < 2) {
    ctx.fillStyle = 'rgba(243, 239, 230, 0.4)';
    ctx.font = `500 ${Math.round(height * 0.07)}px ${MONO_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NO DATA', width / 2, height / 2);
    return c;
  }

  const count = Math.min(60, valid.length);
  const start = valid.length - count;
  const slice = valid.slice(start);
  let lo = Math.min(...slice.map((b) => b.low));
  let hi = Math.max(...slice.map((b) => b.high));
  const pad = (hi - lo) * 0.1 || 1;
  lo -= pad;
  hi += pad;
  const yOf = (v) => height - ((v - lo) / (hi - lo)) * height;
  const step = width / count;
  const bodyWidth = Math.max(3, step * 0.56);

  const closes = valid.map((b) => b.close);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  for (let i = start; i < valid.length; i += 1) {
    if (i < MA_PERIOD - 1) continue;
    let sum = 0;
    for (let k = i - MA_PERIOD + 1; k <= i; k += 1) sum += closes[k];
    const x = step * (i - start) + step / 2;
    const y = yOf(sum / MA_PERIOD);
    if (started) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    started = true;
  }
  ctx.stroke();

  slice.forEach((b, i) => {
    const x = step * i + step / 2;
    const color = b.close >= b.open ? UP : DOWN;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, yOf(b.high));
    ctx.lineTo(x, yOf(b.low));
    ctx.stroke();
    const top = yOf(Math.max(b.open, b.close));
    const bottom = yOf(Math.min(b.open, b.close));
    ctx.fillStyle = color;
    ctx.fillRect(x - bodyWidth / 2, top, bodyWidth, Math.max(2, bottom - top));
  });
  return c;
}
