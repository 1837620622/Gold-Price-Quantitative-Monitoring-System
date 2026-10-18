/**
 * 金银比面板：按后端返回的 signal 取区间名称与建议，中英文各一套
 * signal 取值：neutral / silver-undervalued / gold-strong / silver-strong
 */

export default {
  zh: {
    'ratio.regime.neutral': '均衡中枢',
    'ratio.regime.silver-undervalued': '历史高位（白银相对低估）',
    'ratio.regime.gold-strong': '偏高区间（避险需求主导）',
    'ratio.regime.silver-strong': '偏低区间（工业与通胀驱动）',
    'ratio.suggestion.neutral': '金银比处于历史中枢区间（65–75），贵金属整体估值较为协调。',
    'ratio.suggestion.silver-undervalued': '金银比高于 85，处于历史高分位，白银相对黄金偏低，存在均值回归的可能。',
    'ratio.suggestion.gold-strong': '黄金相对白银偏强，避险买盘主导，警惕金银比冲高后动能衰竭。',
    'ratio.suggestion.silver-strong': '金银比处于低位，白银强于黄金，通常反映工业需求与通胀预期偏强。',
  },
  en: {
    'ratio.regime.neutral': 'Neutral range',
    'ratio.regime.silver-undervalued': 'Historic high (silver deeply undervalued)',
    'ratio.regime.gold-strong': 'Elevated (safe-haven led)',
    'ratio.regime.silver-strong': 'Depressed (industrial and inflation led)',
    'ratio.suggestion.neutral': 'The ratio sits in the historical 65–75 range; precious-metal valuations are aligned.',
    'ratio.suggestion.silver-undervalued': 'Above 85, in the historic top percentile; silver looks cheap against gold, so mean reversion is a live opportunity.',
    'ratio.suggestion.gold-strong': 'Gold is outperforming silver on safe-haven demand; watch for the ratio’s momentum to fade.',
    'ratio.suggestion.silver-strong': 'A low ratio: silver is outperforming gold, usually on stronger industrial demand and inflation expectations.',
  },
};
