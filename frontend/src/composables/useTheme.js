/**
 * ============================================================
 * 昼夜主题
 * - 自动（默认）：有访客位置时按当地日出日落切换；没有位置时按访客时区的
 *   当地时间切换（06:00–18:00 为日间）；每分钟重新判断一次
 * - 手动：选择“日间 / 夜间”后记住选择；选择“自动”恢复自动判断
 * 结果写入 <html data-theme>，由 style.css 的浅色 / 深色令牌生效
 * ============================================================
 */

import { ref, computed, watch } from 'vue';
import { geo } from '../lib/geo';
import { isDaytimeAt, localHourIn } from '../lib/solar';

export const THEME_MODES = ['auto', 'day', 'night'];

const MODE_KEY = 'gold-monitor-theme-mode';
const AUTO_KEY = 'gold-monitor-theme-auto';
const REFRESH_MS = 60 * 1000;
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 18;

function readMode() {
  try {
    const value = localStorage.getItem(MODE_KEY);
    return THEME_MODES.includes(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 隐私模式或禁用存储时忽略
  }
}

const mode = ref(readMode());
const now = ref(Date.now());

const autoTheme = computed(() => {
  const at = new Date(now.value);
  const info = geo.value;
  if (info && Number.isFinite(info.latitude) && Number.isFinite(info.longitude)) {
    return isDaytimeAt(at, info.latitude, info.longitude) ? 'light' : 'dark';
  }
  const hour = localHourIn(at, info?.timezone || undefined);
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? 'light' : 'dark';
});

// 'light' = 日间，'dark' = 夜间
const resolved = computed(() => {
  if (mode.value === 'day') return 'light';
  if (mode.value === 'night') return 'dark';
  return autoTheme.value;
});

function apply(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f6f3ec' : '#050507');
}

let started = false;

function start() {
  if (started) return;
  started = true;
  setInterval(() => {
    now.value = Date.now();
  }, REFRESH_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) now.value = Date.now();
  });
  watch(resolved, apply, { immediate: true });
  // 自动结果不受手动模式影响：每次变化都保存，手动选择期间也保持最新，供下次首屏脚本读取
  watch(autoTheme, (value) => writeStorage(AUTO_KEY, value), { immediate: true });
}

export function useTheme() {
  start();

  function setMode(next) {
    if (!THEME_MODES.includes(next)) return;
    mode.value = next;
    writeStorage(MODE_KEY, next);
  }

  // 兼容旧调用：在日间与夜间之间手动切换
  function toggle() {
    setMode(resolved.value === 'dark' ? 'day' : 'night');
  }

  return { mode, modes: THEME_MODES, resolved, setMode, toggle };
}
