/**
 * ============================================================
 * 昼夜判断：按经纬度计算日出与日落（NOAA 近似算法，误差约 1 分钟）
 * 纯函数，不依赖 DOM，便于测试；时间均以毫秒时间戳表示
 * ============================================================
 */

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const UNIX_JD = 2440587.5; // 1970-01-01T00:00Z 的儒略日

const mod = (v, m) => ((v % m) + m) % m;

// 时间戳 → 以 J2000 起算的整数日序（与 NOAA 公式中的 n 一致）
function solarDayIndex(ms) {
  const jd = ms / DAY_MS + UNIX_JD;
  return Math.floor(jd - 2451545 + 0.5);
}

// 某个日序在给定经纬度的日出、日落；极昼 / 极夜时返回 polar 标记
export function sunTimesForDay(n, lat, lon) {
  const jStar = n - lon / 360; // 经度向东为正：正午提前
  const M = mod(357.5291 + 0.98560028 * jStar, 360) * RAD;
  const C = 1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M);
  const lambda = mod(M / RAD + C + 180 + 102.9372, 360) * RAD;
  const jTransit = 2451545 + jStar + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * lambda);
  const sinDec = Math.sin(lambda) * Math.sin(23.4397 * RAD);
  const dec = Math.asin(sinDec);
  const phi = lat * RAD;
  const cosOmega = (Math.sin(-0.833 * RAD) - Math.sin(phi) * sinDec) / (Math.cos(phi) * Math.cos(dec));

  if (cosOmega > 1) return { polar: 'night' }; // 太阳整天不升起
  if (cosOmega < -1) return { polar: 'day' }; // 太阳整天不落下

  const omega = Math.acos(cosOmega) / RAD;
  const toMs = (j) => (j - UNIX_JD) * DAY_MS;
  return {
    polar: null,
    sunrise: toMs(jTransit - omega / 360),
    sunset: toMs(jTransit + omega / 360),
  };
}

// 判断某一时刻在给定位置是否为白天：取前后各两天的日出日落，找最近一次事件
export function isDaytimeAt(date, lat, lon) {
  const ms = date.getTime();
  const n0 = solarDayIndex(ms);
  const events = [];
  let polar = null;
  for (let n = n0 - 2; n <= n0 + 2; n += 1) {
    const t = sunTimesForDay(n, lat, lon);
    if (t.polar) {
      polar = t.polar;
      continue;
    }
    events.push({ at: t.sunrise, day: true }, { at: t.sunset, day: false });
  }
  if (events.length === 0) return polar === 'day';

  events.sort((a, b) => a.at - b.at);
  let last = null;
  for (const e of events) {
    if (e.at <= ms) last = e;
  }
  return last ? last.day : !events[0].day;
}

// 指定时区内的当地小时（0–23），时区无效时回退到浏览器本地时间
export function localHourIn(date, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    return Number.isFinite(hour) ? hour : date.getHours();
  } catch {
    return date.getHours();
  }
}
