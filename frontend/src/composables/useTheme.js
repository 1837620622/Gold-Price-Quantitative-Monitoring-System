/**
 * ============================================================
 * 主题：默认跟随系统（CSS 媒体查询），用户手动切换后记住选择
 * ============================================================
 */

import { ref, computed, watch } from 'vue';

const STORAGE_KEY = 'gold-monitor-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; // 隐私模式或禁用存储时忽略
  }
}

function writeStored(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略存储错误
  }
}

const explicit = ref(readStored());        // null = 跟随系统
const systemDark = ref(media.matches);
media.addEventListener('change', (event) => {
  systemDark.value = event.matches;
});

const resolved = computed(() => explicit.value ?? (systemDark.value ? 'dark' : 'light'));

watch(
  explicit,
  (value) => {
    if (value) document.documentElement.dataset.theme = value;
    else delete document.documentElement.dataset.theme;
    writeStored(value);
  },
  { immediate: true }
);

export function useTheme() {
  function toggle() {
    explicit.value = resolved.value === 'dark' ? 'light' : 'dark';
  }
  return { resolved, toggle };
}
