/**
 * 图表配色：与 style.css 的 Vault Noir 令牌一致；红涨绿跌
 *
 * 分类色（MA / KDJ / 回测曲线）按固定顺序取用，不循环：
 *   1 金 · 2 蓝 · 3 玫红 · 4 紫 · 5 青 · 6 铜
 * 两套主题各自经 validate_palette.js 校验（亮度带、色度底线、相邻色 CVD 与常态辨识度、对比度）。
 * 评分线为单序列面板，使用香槟色作为强调；价格相关的涨跌色不参与分类色序列。
 * 填充一律为纯色加低透明度；提示框与滑块不使用阴影。
 */

// 图表字体：正文用 IBM Plex Sans（中文回退 Noto Sans SC），数字与刻度用 IBM Plex Mono。
// 画布无法读取 CSS 变量，因此字体栈写定在此，与 style.css 的 --font / --font-mono 保持一致。
const FONT_SANS = "'IBM Plex Sans', 'Noto Sans SC', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'SF Mono', Consolas, ui-monospace, monospace";

export function chartPalette(theme) {
  if (theme === 'dark') {
    return {
      up: '#ef4444',
      down: '#10b981',
      grid: 'rgba(232,199,125,0.08)',
      axis: 'rgba(232,199,125,0.20)',
      tipBorder: 'rgba(232,199,125,0.26)',
      muted: '#8b867b',
      text: '#f3efe6',
      tipBg: '#0e1116',
      font: FONT_SANS,
      mono: FONT_MONO,
      volume: 'rgba(139,134,123,0.45)',
      ma5: '#b8892e',
      ma10: '#3d7fe0',
      ma20: '#c45a7a',
      boll: '#8b8577',
      dif: '#b8892e',
      dea: '#3d7fe0',
      rsi: '#8b7ddb',
      kdjK: '#b8892e',
      kdjD: '#3d7fe0',
      kdjJ: '#c45a7a',
      score: '#f6dea4',
      ratio: '#3d7fe0',
      band: 'rgba(232,199,125,0.10)',
      mean: 'rgba(243,239,230,0.45)',
      equity: {
        trend: '#b8892e',
        trendFiltered: '#3d7fe0',
        score: '#c45a7a',
        bollRsi: '#8b7ddb',
        premiumArb: '#2a9d8f',
        buyHold: '#8b8577',
      },
      drawdown: 'rgba(239,68,68,0.26)',
      filler: 'rgba(232,199,125,0.12)',
      sliderBg: 'rgba(232,199,125,0.04)',
    };
  }
  return {
    up: '#dc2626',
    down: '#059669',
    grid: 'rgba(122,88,24,0.10)',
    axis: 'rgba(122,88,24,0.24)',
    tipBorder: 'rgba(122,88,24,0.32)',
    muted: '#6d6758',
    text: '#15130e',
    tipBg: '#ffffff',
    font: FONT_SANS,
    mono: FONT_MONO,
    volume: 'rgba(143,136,122,0.40)',
    ma5: '#9c7424',
    ma10: '#2563eb',
    ma20: '#c2416a',
    boll: '#8f887a',
    dif: '#9c7424',
    dea: '#2563eb',
    rsi: '#6d4fc7',
    kdjK: '#9c7424',
    kdjD: '#2563eb',
    kdjJ: '#c2416a',
    score: '#8c6a2b',
    ratio: '#2563eb',
    band: 'rgba(156,116,36,0.12)',
    mean: 'rgba(21,19,14,0.45)',
    equity: {
      trend: '#9c7424',
      trendFiltered: '#2563eb',
      score: '#c2416a',
      bollRsi: '#6d4fc7',
      premiumArb: '#0f8a7a',
      buyHold: '#8f887a',
    },
    drawdown: 'rgba(220,38,38,0.20)',
    filler: 'rgba(156,116,36,0.12)',
    sliderBg: 'rgba(122,88,24,0.04)',
  };
}

// 数值显示：null / NaN 统一为 "--"
export const fmtVal = (v, digits = 2) =>
  v === null || v === undefined || Number.isNaN(v) ? '--' : Number(v).toFixed(digits);
