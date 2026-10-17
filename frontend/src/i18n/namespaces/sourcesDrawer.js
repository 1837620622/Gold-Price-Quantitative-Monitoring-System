/**
 * 数据源抽屉：标题、交叉校验与数据源状态、统计文字
 */

export default {
  zh: {
    'sourcesDrawer.title': '数据源与交叉校验',
    'sourcesDrawer.close': '关闭',
    'sourcesDrawer.checks': '交叉校验',
    'sourcesDrawer.noChecks': '暂无校验结果',
    'sourcesDrawer.sources': '数据源',
    'sourcesDrawer.stats': '耗时 {latency} ms · 成功 {ok} 次 · 失败 {err} 次',
    'sourcesDrawer.lastOk': '· 最近成功 {time}',
    'sourcesDrawer.lastError': '最近错误：{error}',
    'sourcesDrawer.noSources': '暂无数据源记录',
    'sourcesDrawer.uncalledHint': '“未调用”表示本次会话中该数据源尚未被请求（例如备用源只在主源失败时调用）。',
    'sourcesDrawer.statusOk': '正常',
    'sourcesDrawer.statusError': '异常',
    'sourcesDrawer.statusIdle': '未调用',
    'sourcesDrawer.checkOk': '通过',
    'sourcesDrawer.checkWarn': '注意',
    'sourcesDrawer.checkInfo': '提示',
    'sourcesDrawer.checkSingle': '单源',
  },
  en: {
    'sourcesDrawer.title': 'Data sources & cross-checks',
    'sourcesDrawer.close': 'Close',
    'sourcesDrawer.checks': 'Cross-checks',
    'sourcesDrawer.noChecks': 'No cross-check results yet',
    'sourcesDrawer.sources': 'Data sources',
    'sourcesDrawer.stats': 'Latency {latency} ms · {ok} OK · {err} failed',
    'sourcesDrawer.lastOk': '· last OK {time}',
    'sourcesDrawer.lastError': 'Last error: {error}',
    'sourcesDrawer.noSources': 'No data-source records yet',
    'sourcesDrawer.uncalledHint': '“Not called” means this source has not been requested in the current session (for example, a backup source is only called when the primary fails).',
    'sourcesDrawer.statusOk': 'OK',
    'sourcesDrawer.statusError': 'Error',
    'sourcesDrawer.statusIdle': 'Not called',
    'sourcesDrawer.checkOk': 'Passed',
    'sourcesDrawer.checkWarn': 'Caution',
    'sourcesDrawer.checkInfo': 'Note',
    'sourcesDrawer.checkSingle': 'Single source',
  },
};
