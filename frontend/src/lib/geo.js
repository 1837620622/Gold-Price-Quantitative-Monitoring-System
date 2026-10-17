/**
 * ============================================================
 * 访客位置：由后端 /api/geo 提供（Cloudflare 边缘信息，不含 IP）
 * 用途只有两个：默认语言、昼夜主题。结果缓存 24 小时；
 * 不可用时回退到浏览器时区，且不伪造经纬度
 * ============================================================
 */

import { ref } from 'vue';
import { API_BASE } from '../api';

const CACHE_KEY = 'gold-monitor-geo';
const TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 3000;

const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

const unavailable = () => ({
  country: null,
  city: null,
  timezone: browserTimezone(),
  latitude: null,
  longitude: null,
  source: 'unavailable',
});

function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (raw && Date.now() - raw.savedAt < TTL_MS && raw.value?.source === 'cloudflare') return raw.value;
  } catch {
    // 存储不可用时忽略
  }
  return null;
}

function writeCache(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // 忽略存储错误
  }
}

// 启动时先用缓存（首屏即可判断昼夜），随后用接口结果刷新
export const geo = ref(readCache() ?? unavailable());

let inflight = null;

export function loadGeo() {
  if (inflight) return inflight;
  inflight = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE}/api/geo`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`geo ${response.status}`);
      const data = await response.json();
      if (data.source === 'cloudflare') {
        const value = {
          country: data.country,
          city: data.city,
          timezone: data.timezone ?? browserTimezone(),
          latitude: data.latitude,
          longitude: data.longitude,
          source: 'cloudflare',
        };
        writeCache(value);
        geo.value = value;
      } else {
        geo.value = geo.value?.source === 'cloudflare' ? geo.value : unavailable();
      }
    } catch {
      geo.value = geo.value?.source === 'cloudflare' ? geo.value : unavailable();
    } finally {
      clearTimeout(timer);
      inflight = null;
    }
    return geo.value;
  })();
  return inflight;
}
