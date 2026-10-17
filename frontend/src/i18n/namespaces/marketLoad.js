/**
 * 行情加载：数据可用性、延迟与服务异常的状态提示
 * 显示时间与原始提示以 {变量} 占位
 */

export default {
  zh: {
    'marketLoad.unavailable': '行情暂不可用，请稍后刷新',
    'marketLoad.unavailableShort': '行情暂不可用',
    'marketLoad.intlUnavailable': '国际金价暂不可用',
    'marketLoad.domUnavailable': '国内金价暂不可用',
    'marketLoad.domEstimated': '国内价为汇率估算值，无涨跌数据，不触发预警',
    'marketLoad.noteSep': '；',
    'marketLoad.showingAt': '{text}，当前显示 {time} 的数据',
    'marketLoad.serviceError': '行情服务暂时异常',
    'marketLoad.connectError': '无法连接行情服务',
  },
  en: {
    'marketLoad.unavailable': 'Market data is unavailable; please refresh later',
    'marketLoad.unavailableShort': 'Market data unavailable',
    'marketLoad.intlUnavailable': 'International gold price unavailable',
    'marketLoad.domUnavailable': 'Domestic gold price unavailable',
    'marketLoad.domEstimated': 'The domestic price is an FX-based estimate with no change data, so it does not trigger alerts',
    'marketLoad.noteSep': '; ',
    'marketLoad.showingAt': '{text}; showing data as of {time}',
    'marketLoad.serviceError': 'Market service temporarily unavailable',
    'marketLoad.connectError': 'Cannot reach the market service',
  },
};
