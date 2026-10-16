/**
 * ============================================================
 * PushPlus 推送模板（HTML）
 * 配色：红涨绿跌；AI 输出先截断、再转义，防止注入
 * ============================================================
 */

import { escapeHtml, fmt, isNum, signed, signedPercent, toneOf, arrowOf, nowInShanghai } from './lib/util.js';

const BASE_CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #0d1117; color: #f5f5f5; padding: 12px; font-size: 15px; line-height: 1.6; }
    .tone-up { color: #ff5b5f; }
    .tone-down { color: #3ddc84; }
    .tone-flat { color: #a1a1aa; }
    .card { background: rgba(255,255,255,0.05); border-radius: 14px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.08); }
    .label { font-size: 13px; color: #c9d1d9; margin-bottom: 6px; }
    .value { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; }
    .change { font-size: 15px; font-weight: 600; margin-top: 4px; }
    .grid { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); }
    .grid div { text-align: center; flex: 1; }
    .grid .k { display: block; font-size: 11px; color: #8b949e; }
    .grid .v { font-size: 14px; font-weight: 600; color: #e4e4e7; }
    .chip { display: inline-block; font-size: 12px; padding: 3px 10px; border-radius: 12px; background: rgba(251,191,36,0.15); color: #fbbf24; margin-top: 8px; }
    .footer { text-align: center; padding-top: 12px; font-size: 12px; color: #8b949e; }
`;

// 量化信号标签（无信号时返回空串）
function signalChip(signal) {
  if (!signal?.available) return '';
  return `<div class="chip">量化信号：${escapeHtml(signal.label)}（评分 ${signed(signal.score, 1)}，置信度 ${signal.confidence}%）</div>`;
}

export function toPushSummary(analysisText) {
  const raw = String(analysisText || '');
  const truncated = raw.length > 600;
  const text = escapeHtml(raw.slice(0, 600))
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/═+/g, '')
    .replace(/▶/g, '')
    .replace(/•/g, '-')
    .replace(/-{3,}/g, '<br><br>')
    .replace(/\r?\n\s*\r?\n/g, '<br><br>')
    .replace(/\r?\n/g, '<br>')
    .replace(/(\d+\.\s)/g, '<br><br>$1');
  return truncated ? `${text}...` : text;
}

export function generatePushHtml(snapshot, analysisText, pushType = 'scheduled', signal = null) {
  const intl = snapshot.international;
  const dom = snapshot.domestic;
  const domPct = dom.changePercent;
  const intlPct = intl?.changePercent ?? null;
  const pushTypeTitle = pushType === 'alert'
    ? `金价波动 涨跌${isNum(domPct) ? `${Math.abs(domPct).toFixed(2)}%` : '--'}`
    : `实时金价 AU9999 ${fmt(dom.price)}元`;
  const pushTypeDesc = pushType === 'alert'
    ? `触发预警：国内金价涨跌幅达 ${isNum(domPct) ? Math.abs(domPct).toFixed(2) : '--'}%`
    : '每30分钟自动推送 - 实时行情';
  const badgeColor = pushType === 'alert' ? '#dc2626' : '#2563eb';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_CSS}
    .badge { display: inline-block; background: ${badgeColor}; padding: 4px 12px; border-radius: 16px; font-size: 12px; margin-bottom: 8px; }
    .title { font-size: 20px; color: #fbbf24; font-weight: 700; margin-bottom: 4px; }
    .time { color: #8b949e; font-size: 12px; }
    .analysis { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.25); }
    .analysis h4 { color: #fbbf24; font-size: 14px; margin-bottom: 8px; }
    .analysis p { font-size: 14px; line-height: 1.8; color: #e4e4e7; }
  </style>
</head>
<body>
  <div class="card" style="text-align:center">
    <div class="badge">${escapeHtml(pushTypeDesc)}</div>
    <div class="title">${escapeHtml(pushTypeTitle)}</div>
    <div class="time">更新时间：${nowInShanghai()}</div>
    ${signalChip(signal)}
  </div>

  <div class="card">
    <div class="label">[国内] AU9999 ${dom.estimated ? '（估算价）' : '上海黄金交易所'}</div>
    <div class="value ${toneOf(domPct)}">¥${fmt(dom.price)}</div>
    <div class="change ${toneOf(domPct)}">${arrowOf(domPct)}${signedPercent(domPct)}${isNum(dom.change) ? `（${signed(dom.change)}元）` : ''}</div>
    <div class="grid">
      <div><span class="k">开盘</span><span class="v">¥${fmt(dom.open)}</span></div>
      <div><span class="k">最高</span><span class="v">¥${fmt(dom.high)}</span></div>
      <div><span class="k">最低</span><span class="v">¥${fmt(dom.low)}</span></div>
    </div>
  </div>

  <div class="card">
    <div class="label">[国际] XAU/USD 现货</div>
    <div class="value ${toneOf(intlPct)}">$${fmt(intl?.price)}</div>
    <div class="change ${toneOf(intlPct)}">${arrowOf(intlPct)}${signedPercent(intlPct)}</div>
    <div class="grid">
      <div><span class="k">白银</span><span class="v">$${fmt(intl?.silverPrice)}</span></div>
      <div><span class="k">溢价</span><span class="v">${signedPercent(snapshot.premiumPercent)}</span></div>
      <div><span class="k">来源</span><span class="v">${escapeHtml(intl?.source || '--')}</span></div>
    </div>
  </div>

  <div class="card analysis">
    <h4>AI 智能分析摘要</h4>
    <p>${toPushSummary(analysisText)}</p>
  </div>

  <div class="footer">
    <div>Gold Monitor - 黄金价格智能监控</div>
    <div>Vx: 1837620622 | 邮箱: 2040168455@qq.com</div>
    <div>开发者：传康KK | 咸鱼/B站：万能程序员</div>
  </div>
</body>
</html>`;
}

export function generateQuickPriceHtml(snapshot, pushType = 'scheduled', signal = null) {
  const intl = snapshot.international;
  const dom = snapshot.domestic;
  const domPct = dom.changePercent;
  const intlPct = intl?.changePercent ?? null;
  const changeDir = isNum(domPct) && domPct < 0 ? '下跌' : '上涨';
  const pushTypeTitle = pushType === 'alert'
    ? `黄金价格${changeDir} ${isNum(domPct) ? Math.abs(domPct).toFixed(2) : '--'}%`
    : '黄金实时行情';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_CSS}
    .title { font-size: 20px; color: #fbbf24; font-weight: 800; text-align: center; margin-bottom: 4px; }
    .sub { font-size: 12px; color: #8b949e; text-align: center; margin-bottom: 12px; }
    .tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(251,191,36,0.2); color: #fbbf24; }
    .tag.intl { background: rgba(88,166,255,0.2); color: #58a6ff; }
    .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="title">${escapeHtml(pushTypeTitle)}</div>
  <div class="sub">${nowInShanghai()} | Gold Monitor</div>

  <div class="card">
    <div class="row"><span class="label">国内 AU9999</span><span class="tag">${dom.estimated ? '估算价' : '上海黄金'}</span></div>
    <div class="value ${toneOf(domPct)}">${fmt(dom.price)} <span style="font-size:14px;color:#8b949e">元/克</span></div>
    <div class="change ${toneOf(domPct)}">${arrowOf(domPct)}${signedPercent(domPct)}</div>
  </div>

  <div class="card">
    <div class="row"><span class="label">国际 XAU/USD</span><span class="tag intl">现货</span></div>
    <div class="value ${toneOf(intlPct)}">${fmt(intl?.price)} <span style="font-size:14px;color:#8b949e">美元/盎司</span></div>
    <div class="change ${toneOf(intlPct)}">${arrowOf(intlPct)}${signedPercent(intlPct)}</div>
  </div>

  ${signalChip(signal)}
  <div class="footer">Gold Monitor - 黄金价格监控 | 开发者：传康KK</div>
</body>
</html>`;
}
