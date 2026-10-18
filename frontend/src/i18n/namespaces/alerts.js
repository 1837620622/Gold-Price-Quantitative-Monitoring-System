/**
 * 价格预警通知：监控标的名称、触发条件文字与系统通知正文
 * 通知中的价格与目标以 {变量} 占位
 */

export default {
  zh: {
    'alerts.cnLabel': '国内 AU9999',
    'alerts.intlLabel': '国际 XAU/USD',
    'alerts.condGte': '突破上方目标',
    'alerts.condLte': '跌破下方防线',
    'alerts.title': '黄金价格预警：{label} 已达到 {price}',
    'alerts.body': '目标阈值：{target}（{cond}）。当前最新报价为 {current}。',
  },
  en: {
    'alerts.cnLabel': 'Domestic AU9999',
    'alerts.intlLabel': 'International XAU/USD',
    'alerts.condGte': 'breaks above the target',
    'alerts.condLte': 'breaks below the floor',
    'alerts.title': 'Gold price alert: {label} reached {price}',
    'alerts.body': 'Target: {target} ({cond}). Latest quote: {current}.',
  },
};
