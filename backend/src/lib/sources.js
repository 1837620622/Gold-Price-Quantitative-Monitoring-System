/**
 * ============================================================
 * 数据源健康登记表
 * 每次真实的上游请求都会经过 track()，记录成功/失败、耗时与最近一次成功时间。
 * 注意：登记表保存在进程内，Worker 实例回收后会清空（用于观测，不用于决策持久化）。
 * ============================================================
 */

const registry = new Map();

function entryOf(name) {
  if (!registry.has(name)) {
    registry.set(name, {
      name,
      roles: [],
      status: 'idle',
      latencyMs: null,
      lastOkAt: null,
      lastError: null,
      okCount: 0,
      errCount: 0,
    });
  }
  return registry.get(name);
}

// 启动时声明数据源，使界面能展示"未调用"的源
export function declareSource(name, role) {
  const entry = entryOf(name);
  if (!entry.roles.includes(role)) entry.roles.push(role);
}

export async function track(name, role, task) {
  const entry = entryOf(name);
  if (!entry.roles.includes(role)) entry.roles.push(role);
  const started = Date.now();
  try {
    const value = await task();
    entry.status = 'ok';
    entry.okCount++;
    entry.lastOkAt = new Date().toISOString();
    entry.lastError = null;
    entry.latencyMs = Date.now() - started;
    return value;
  } catch (error) {
    entry.status = 'error';
    entry.errCount++;
    entry.lastError = error?.message ?? String(error);
    entry.latencyMs = Date.now() - started;
    throw error;
  }
}

export function listSources() {
  return [...registry.values()].map((e) => ({
    name: e.name,
    roles: [...e.roles],
    status: e.status,
    latencyMs: e.latencyMs,
    lastOkAt: e.lastOkAt,
    lastError: e.lastError,
    okCount: e.okCount,
    errCount: e.errCount,
  }));
}

// 仅供测试：清空数据源登记表
export function resetSourcesForTests() {
  registry.clear();
}
