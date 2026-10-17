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

// 金币正反面：径向黄金质感 + 同心防伪机镂纹 + 双层精铸边缘 + 浮雕压印标签
export function paintCoinFace(label, size = 512, canvas) {
  const c = makeCanvas(size, size, canvas);
  const ctx = c.getContext('2d');
  const r = size / 2;
  ctx.clearRect(0, 0, size, size);

  // 1. 24K 纯金底色渐变
  const body = ctx.createRadialGradient(r * 0.65, r * 0.55, r * 0.06, r, r, r);
  body.addColorStop(0, '#fff4b8');
  body.addColorStop(0.25, '#fcd34d');
  body.addColorStop(0.65, '#f59e0b');
  body.addColorStop(0.9, '#d97706');
  body.addColorStop(1, '#92400e');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();

  // 2. 防伪精铸同心微纹（Guilloché Rings）
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  for (let i = 1; i <= 6; i++) {
    ctx.beginPath();
    ctx.arc(r, r, r * (0.28 + i * 0.085), 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. 外层精铸滚齿边圈
  ctx.lineWidth = size * 0.038;
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.88)';
  ctx.beginPath();
  ctx.arc(r, r, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  // 4. 内层高光棱线
  ctx.lineWidth = size * 0.015;
  ctx.strokeStyle = 'rgba(255, 248, 220, 0.75)';
  ctx.beginPath();
  ctx.arc(r, r, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  // 4.5 外沿精铸滚花齿纹（48 齿 Milled Reeded Edge）
  ctx.save();
  ctx.translate(r, r);
  ctx.fillStyle = 'rgba(120, 53, 15, 0.42)';
  const teeth = 48;
  const toothWidth = size * 0.012;
  const toothDepth = size * 0.024;
  for (let i = 0; i < teeth; i++) {
    ctx.rotate((Math.PI * 2) / teeth);
    ctx.fillRect(r * 0.95 - toothDepth, -toothWidth / 2, toothDepth, toothWidth);
  }
  ctx.restore();

  // 5. 压印文字与阴影（高对比立体雕刻感）
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, label, size * 0.72, size * 0.24, 700);

  // 下层浅色高光（雕刻内边缘反光）
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillText(label, r, r * 1.045);

  // 上层深色主字体（深凹下沉字）
  ctx.fillStyle = '#451a03';
  ctx.fillText(label, r, r * 1.015);

  return c;
}

// 金条顶部铭牌：上海黄金交易所官方精铸钢印质感
export function paintIngotLabel(text = 'AU 999.9', width = 1024, height = 512, canvas) {
  const c = makeCanvas(width, height, canvas);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  // 底色渐变
  const pad = height * 0.08;
  roundRect(ctx, pad, pad, width - pad * 2, height - pad * 2, height * 0.1);
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.3, '#f59e0b');
  grad.addColorStop(0.7, '#d97706');
  grad.addColorStop(1, '#78350f');
  ctx.fillStyle = grad;
  ctx.fill();

  // 金属拉丝微纹
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let y = pad; y < height - pad; y += 4) {
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }

  // 双重凹凸防伪外框
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(69, 26, 3, 0.65)';
  roundRect(ctx, pad + 10, pad + 10, width - (pad + 10) * 2, height - (pad + 10) * 2, height * 0.06);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 248, 220, 0.4)';
  roundRect(ctx, pad + 16, pad + 16, width - (pad + 16) * 2, height - (pad + 16) * 2, height * 0.05);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. 上标：上海黄金交易所
  ctx.font = `600 ${Math.round(height * 0.075)}px ${DISPLAY_STACK}`;
  ctx.fillStyle = 'rgba(69, 26, 3, 0.85)';
  ctx.fillText('SHANGHAI GOLD EXCHANGE · SGE PHYSICAL ANCHOR', width / 2, height * 0.23);

  // 2. 主标：AU 999.9 纯金粗衬线雕印
  ctx.font = `900 ${Math.round(height * 0.28)}px ${DISPLAY_STACK}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillText(text, width / 2, height * 0.51);
  ctx.fillStyle = 'rgba(69, 26, 3, 0.95)';
  ctx.fillText(text, width / 2, height * 0.495);

  // 3. 中副标：FINE GOLD 1000g
  ctx.font = `700 ${Math.round(height * 0.085)}px ${MONO_STACK}`;
  ctx.fillStyle = 'rgba(69, 26, 3, 0.85)';
  ctx.fillText('FINE GOLD 1000g · NET PURITY 99.99%', width / 2, height * 0.72);

  // 4. 底标：验金师印章与量化序列号
  ctx.font = `500 ${Math.round(height * 0.055)}px ${MONO_STACK}`;
  ctx.fillStyle = 'rgba(120, 53, 15, 0.7)';
  ctx.fillText('MELTER ASSAYER · NO. 2026-QUANT-ALPHA-001', width / 2, height * 0.87);

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

// 墙面投影字：透明底上的 Anton 大写，颜色由昼夜调色板决定（夜间金色，日间深金）
export function paintLettering(word, width = 1024, height = 256, canvas, color = GOLD) {
  const c = makeCanvas(width, height, canvas);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
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

// 远墙 K 线：高科技指挥中心终端屏，集成标头、实时标识与 60 根日 K 线
export function paintCandleChart(bars, width = 1024, height = 512, canvas) {
  const c = makeCanvas(width, height, canvas);
  const ctx = c.getContext('2d');

  // 深邃科技黑底色
  ctx.fillStyle = '#06070a';
  ctx.fillRect(0, 0, width, height);

  // 屏幕外边框与科幻荧光四角
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // 顶栏高科技 HUD 标头
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(6, 6, width - 12, 38);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, 44);
  ctx.lineTo(width - 6, 44);
  ctx.stroke();

  // 顶栏文字与指示灯
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(24, 25, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `600 14px ${MONO_STACK}`;
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('LIVE QUANTITATIVE TERMINAL · SGE AU9999 · 60-BAR KLINE', 38, 25);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#10b981';
  ctx.fillText('[REALTIME FEED · CONNECTED]', width - 24, 25);

  // 绘制图表背景网格
  drawGrid(ctx, width, height);

  const valid = (bars || []).filter((b) => [b.open, b.high, b.low, b.close].every(Number.isFinite));
  if (valid.length < 2) {
    ctx.fillStyle = 'rgba(243, 239, 230, 0.5)';
    ctx.font = `500 ${Math.round(height * 0.07)}px ${MONO_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SYNCHRONIZING FEED...', width / 2, height / 2);
    return c;
  }

  const count = Math.min(60, valid.length);
  const start = valid.length - count;
  const slice = valid.slice(start);
  let lo = Math.min(...slice.map((b) => b.low));
  let hi = Math.max(...slice.map((b) => b.high));
  const pad = (hi - lo) * 0.12 || 1;
  lo -= pad;
  hi += pad;
  const chartTop = 50;
  const chartHeight = height - chartTop - 12;
  const yOf = (v) => chartTop + chartHeight - ((v - lo) / (hi - lo)) * chartHeight;
  const step = (width - 16) / count;
  const bodyWidth = Math.max(4, step * 0.58);

  // 绘制 MA20 均线（金色发光）
  const closes = valid.map((b) => b.close);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  let started = false;
  for (let i = start; i < valid.length; i += 1) {
    if (i < MA_PERIOD - 1) continue;
    let sum = 0;
    for (let k = i - MA_PERIOD + 1; k <= i; k += 1) sum += closes[k];
    const x = 8 + step * (i - start) + step / 2;
    const y = yOf(sum / MA_PERIOD);
    if (started) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    started = true;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 绘制 K 线实体与上下影线
  slice.forEach((b, i) => {
    const x = 8 + step * i + step / 2;
    const isUp = b.close >= b.open;
    const color = isUp ? UP : DOWN;
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
