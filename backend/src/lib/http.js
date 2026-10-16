/**
 * HTTP 工具：统一超时、UA 与错误信息（错误只暴露主机名，不泄露查询参数）
 */

import { FETCH_TIMEOUT_MS, USER_AGENT } from '../config.js';

async function request(url, { timeoutMs = FETCH_TIMEOUT_MS, headers = {}, ...init } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, ...headers },
    });
    if (!res.ok) {
      let host = 'upstream';
      try {
        host = new URL(url).host;
      } catch {}
      throw new Error(`HTTP ${res.status} (${host})`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, options = {}) {
  const res = await request(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
  });
  return res.json();
}

export async function fetchText(url, options = {}) {
  const res = await request(url, {
    ...options,
    headers: { Accept: 'text/csv,text/plain,*/*', ...(options.headers || {}) },
  });
  return res.text();
}
