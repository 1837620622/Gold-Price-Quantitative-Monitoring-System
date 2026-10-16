/**
 * ============================================================
 * 缓存与状态
 * - memo：进程内缓存 + 并发合并（同一 key 同时只发起一次上游请求，失败不缓存）
 * - getState/setState：优先 KV（跨实例持久化），未绑定时退回内存
 * ============================================================
 */

const memoCache = new Map();
const memoInflight = new Map();

export function memo(key, ttlMs, loader, isCacheable = () => true) {
  const hit = memoCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  if (memoInflight.has(key)) return memoInflight.get(key);

  const task = (async () => {
    try {
      const value = await loader();
      if (isCacheable(value)) memoCache.set(key, { at: Date.now(), value });
      return value;
    } finally {
      memoInflight.delete(key);
    }
  })();
  memoInflight.set(key, task);
  return task;
}

const memoryState = {};

export async function getState(env, key) {
  try {
    if (env?.GOLD_KV) return (await env.GOLD_KV.get(`state:${key}`, 'json')) ?? null;
  } catch (error) {
    console.error(`读取状态失败 [${key}]:`, error.message);
  }
  return memoryState[key] ?? null;
}

export async function setState(env, key, value) {
  memoryState[key] = value;
  try {
    if (env?.GOLD_KV) await env.GOLD_KV.put(`state:${key}`, JSON.stringify(value));
  } catch (error) {
    console.error(`写入状态失败 [${key}]:`, error.message);
  }
}

// 仅供测试：清空进程内缓存与内存状态，使各用例互不影响
export function resetCachesForTests() {
  memoCache.clear();
  memoInflight.clear();
  for (const key of Object.keys(memoryState)) delete memoryState[key];
}
