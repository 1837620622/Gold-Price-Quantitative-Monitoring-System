/**
 * 图表配色：与 style.css 的设计令牌保持一致；红涨绿跌
 */

export function chartPalette(theme) {
  if (theme === 'dark') {
    return {
      up: '#ff5b5f',
      down: '#34d399',
      grid: 'rgba(255,255,255,0.07)',
      axis: 'rgba(255,255,255,0.14)',
      muted: '#8d96a8',
      text: '#eceef3',
      tipBg: 'rgba(18,21,28,0.96)',
      ma5: '#e7b75b',
      ma10: '#60a5fa',
      ma20: '#c084fc',
      boll: '#94a3b8',
      dif: '#f5d08a',
      dea: '#60a5fa',
      rsi: '#c084fc',
      score: '#e7b75b',
      band: 'rgba(231,183,91,0.12)',
      mean: 'rgba(236,238,243,0.45)',
      equity: { trend: '#e7b75b', score: '#60a5fa', buyHold: '#9aa3b5' },
      drawdown: 'rgba(255,91,95,0.28)',
      filler: 'rgba(231,183,91,0.14)',
      sliderBg: 'rgba(255,255,255,0.03)',
    };
  }
  return {
    up: '#e0343c',
    down: '#0f9d58',
    grid: 'rgba(20,24,38,0.08)',
    axis: 'rgba(20,24,38,0.16)',
    muted: '#6b7386',
    text: '#151821',
    tipBg: 'rgba(255,255,255,0.98)',
    ma5: '#b7791f',
    ma10: '#2563eb',
    ma20: '#7c3aed',
    boll: '#64748b',
    dif: '#b7791f',
    dea: '#2563eb',
    rsi: '#7c3aed',
    score: '#b7791f',
    band: 'rgba(183,121,31,0.10)',
    mean: 'rgba(21,24,33,0.45)',
    equity: { trend: '#b7791f', score: '#2563eb', buyHold: '#6b7386' },
    drawdown: 'rgba(224,52,60,0.22)',
    filler: 'rgba(183,121,31,0.12)',
    sliderBg: 'rgba(20,24,38,0.03)',
  };
}

// 数值显示：null / NaN 统一为 "--"
export const fmtVal = (v, digits = 2) =>
  v === null || v === undefined || Number.isNaN(v) ? '--' : Number(v).toFixed(digits);
