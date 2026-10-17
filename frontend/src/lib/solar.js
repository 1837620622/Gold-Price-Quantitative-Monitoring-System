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

// 某个日序的太阳赤纬与正午凌日时刻（儒略日），日出日落与任一时刻的太阳高度共用
function solarDayParams(n, lon) {
  const jStar = n - lon / 360; // 经度向东为正：正午提前
  const M = mod(357.5291 + 0.98560028 * jStar, 360) * RAD;
  const C = 1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M);
  const lambda = mod(M / RAD + C + 180 + 102.9372, 360) * RAD;
  const jTransit = 2451545 + jStar + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * lambda);
  const sinDec = Math.sin(lambda) * Math.sin(23.4397 * RAD);
  return { jTransit, sinDec, dec: Math.asin(sinDec) };
}

// 某个日序在给定经纬度的日出、日落；极昼 / 极夜时返回 polar 标记
export function sunTimesForDay(n, lat, lon) {
  const { jTransit, sinDec, dec } = solarDayParams(n, lon);
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

// 某一时刻的太阳高度角（度）：用该时刻所在日序的赤纬与凌日时刻求时角，极昼 / 极夜同样适用
export function solarAltitudeAt(ms, lat, lon) {
  const { jTransit, dec } = solarDayParams(solarDayIndex(ms), lon);
  const hourAngle = (ms / DAY_MS + UNIX_JD - jTransit) * 360 * RAD;
  const phi = lat * RAD;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle);
  return Math.asin(sinAlt) / RAD;
}

// 判断某一时刻在给定位置是否为白天：太阳高度角高于 -0.833°（与日出日落的定义一致）
export function isDaytimeAt(date, lat, lon) {
  return solarAltitudeAt(date.getTime(), lat, lon) > -0.833;
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
