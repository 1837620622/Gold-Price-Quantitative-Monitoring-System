/**
 * 量化信号面板：评分、置信度、支撑阻力与免责声明
 * 注意：后端给出的信号等级、趋势与波动词汇用 tLabel() 查 labels.js，不在这里
 */

export default {
  zh: {
    'signalPanel.title': '量化信号',
    'signalPanel.asOf': '多因子评分 · 基于截至 {asOf} 的日K',
    'signalPanel.trend': '趋势 {trend}',
    'signalPanel.regime': '波动 {regime}',
    'signalPanel.confidence': '置信度 {confidence}%',
    'signalPanel.scoreAria': '量化评分 {score}，范围 -100 到 +100',
    'signalPanel.weight': '权重 {weight} · {score}',
    'signalPanel.support': '支撑',
    'signalPanel.resistance': '阻力',
    'signalPanel.range': '参考区间',
    'signalPanel.atr': '{atr}（{percent}%）',
    'signalPanel.disclaimer': '量化参考，不构成投资建议。参考区间与止损参考位由 ATR 及枢轴点推算，仅用于风险控制讨论。',
  },
  en: {
    'signalPanel.title': 'Quant signal',
    'signalPanel.asOf': 'Multi-factor score · daily bars through {asOf}',
    'signalPanel.trend': 'Trend {trend}',
    'signalPanel.regime': 'Vol {regime}',
    'signalPanel.confidence': 'Confidence {confidence}%',
    'signalPanel.scoreAria': 'Quant score {score}, range -100 to +100',
    'signalPanel.weight': 'Weight {weight} · {score}',
    'signalPanel.support': 'Support',
    'signalPanel.resistance': 'Resistance',
    'signalPanel.range': 'Reference range',
    'signalPanel.atr': '{atr} ({percent}%)',
    'signalPanel.disclaimer': 'For quantitative reference only, not investment advice. Reference ranges and stop levels come from ATR and pivot points, for risk-control discussion only.',
  },
};
