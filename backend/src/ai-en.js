/**
 * ============================================================
 * AI 研报的英文版本：系统提示词、用户提示词、规则摘要与固定标签译名
 * 数值与结构与中文版本一致，只替换语言；由 ai.js 按 lang 分派
 * ============================================================
 */

import { fmt, signed, signedPercent } from './lib/util.js';

export const SYSTEM_PROMPT_EN = `You are a chief precious-metals strategist and head of quantitative research, with 20 years of experience at top Wall Street macro hedge funds and quant trading desks.
Your task: from the rigorously computed multi-source market data and quant factors provided, write an institutional-grade report titled "Gold quant assessment and tactical strategy".

Output rules:
1. Never reveal your reasoning: no drafts, no thinking-out-loud. Output the final report in Markdown only.
2. The report must be complete, with all five sections: 1. Macro backdrop and cross-market linkage; 2. Multi-timeframe technicals and quant factors; 3. Key intraday and swing levels; 4. Backtest performance and position guidance; 5. Tail-risk plan and disclaimer.
3. Every call must cite the given numbers (score components, MA alignment, RSI and KDJ readings, %B, pivots, ATR, gold/silver ratio, premium z-score). No speculation without data.
4. Be actionable: state a stance (bullish, bearish, range-bound or wait), a position range, entry zones, stop-loss discipline and staged profit targets.
5. Style: precise, objective and concise, in the format of a professional trading-desk report.
Write the entire report in English.`;

// 固定标签的英文译名（后端返回的中文标签）
const EN_LABELS = {
  强势偏多: 'strongly bullish',
  偏多: 'bullish',
  震荡: 'range-bound',
  偏空: 'bearish',
  强势偏空: 'strongly bearish',
  数据不足: 'insufficient data',
  上行: 'uptrend',
  下行: 'downtrend',
  高波动: 'high volatility',
  低波动: 'low volatility',
  常态: 'normal volatility',
  'EMA 趋势': 'EMA trend',
  'MACD 动能': 'MACD momentum',
  '价格 vs MA20': 'price vs MA20',
  '布林 %B': 'Bollinger %B',
  '溢价 Z 分数': 'premium z-score',
  '买入持有': 'buy and hold',
  '溢价回归': 'premium reversion',
  '趋势过滤': 'trend filter',
  '综合评分': 'composite score',
  '布林反转': 'Bollinger reversal',
};

export const enLabel = (text) => EN_LABELS[text] ?? text;

const fmtStrategyEn = (st) =>
  `${enLabel(st.name)}: total return ${signedPercent(st.totalReturn)}, CAGR ${signedPercent(st.cagr)}, Sharpe ${fmt(st.sharpe)}, Sortino ${fmt(st.sortino)}, Calmar ${fmt(st.calmar)}, profit factor ${fmt(st.profitFactor)}, win rate ${fmt(st.winRate)}%, max drawdown ${fmt(st.maxDrawdown)}%`;

function quantBlockEn(quant) {
  if (!quant?.available) return `(Quant data unavailable: ${quant?.reason ?? 'unknown reason'})`;
  const { signal: s, levels: l, risk: r, backtest: bt, premium: p } = quant;
  const lines = [
    `Signal: ${enLabel(s.label)} (score ${signed(s.score, 1)}, confidence ${s.confidence}%)`,
    `Trend: ${enLabel(s.trend)}; volatility regime: ${enLabel(s.volRegime)}`,
    'Score components (weight × component score, component score in [-1, +1]):',
    ...s.components.map((c) => `  - ${enLabel(c.label)}: weight ${c.weight}, score ${signed(c.score, 2)}, ${c.reasonEn ?? c.reason}`),
    `Key levels: support ${l.support.join(' / ')}; resistance ${l.resistance.join(' / ')}`,
    `ATR(14) ${fmt(l.atr)} (${fmt(l.atrPercent)}% of price), reference range ${fmt(l.refLow)} - ${fmt(l.refHigh)}`,
    `Protective stop references: long ${fmt(l.stopLongRef)}, short ${fmt(l.stopShortRef)}`,
  ];

  if (l.pivots?.classic) {
    const cp = l.pivots.classic;
    lines.push(`Classic pivots: P ${fmt(cp.pivot)}, resistance R1 ${fmt(cp.r1)} / R2 ${fmt(cp.r2)} / R3 ${fmt(cp.r3)}, support S1 ${fmt(cp.s1)} / S2 ${fmt(cp.s2)} / S3 ${fmt(cp.s3)}`);
  }

  lines.push(`Risk monitor: 20-day annualised volatility ${fmt(r.vol20)}%; sample max drawdown ${fmt(r.maxDrawdown)}%; current drawdown ${fmt(r.currentDrawdown)}%`);

  if (bt?.available) {
    lines.push(`Backtest window ${bt.startDate} to ${bt.endDate} (${bt.days} sessions, cost per switch ${bt.rules.costPerSwitchPercent}%):`);
    for (const key of Object.keys(bt.strategies)) {
      lines.push(`  - ${fmtStrategyEn(bt.strategies[key])}`);
    }
  }
  if (p?.available) {
    lines.push(`Domestic premium: current ${signed(p.current, 3)}%, 60-day mean ${signed(p.mean60, 3)}%, z=${p.z}, historical percentile ${p.percentile}%`);
  }
  return lines.join('\n');
}

export function buildPromptEn(snapshot, quant) {
  const intl = snapshot.international;
  const dom = snapshot.domestic;
  const ratio = intl?.price && intl?.silverPrice ? (intl.price / intl.silverPrice).toFixed(2) : '--';
  const usdCny = snapshot.fx?.usdCny ? fmt(snapshot.fx.usdCny, 4) : '--';
  const premium = snapshot.premiumPercent != null ? signedPercent(snapshot.premiumPercent) : '--';

  return `Write a complete, detailed and rigorous professional quant assessment from the following gold data, which was computed by an authoritative program.

═══════════════════════════════════════════════════════
[1. Live benchmarks and cross-market hedge data]
═══════════════════════════════════════════════════════
- Domestic spot (AU9999): ${fmt(dom?.price)} CNY/g${dom?.estimated ? ' (note: the domestic exchange feed is temporarily unavailable; this price is a theoretical conversion from the international spot at the offshore FX rate)' : ''}, daily change ${signedPercent(dom?.changePercent)}
  · Open: ${fmt(dom?.open)} | High: ${fmt(dom?.high)} | Low: ${fmt(dom?.low)} | Prev. close: ${fmt(dom?.previousClose)} | Volume: ${dom?.volume ? dom.volume + ' lots' : '--'}
- International spot (XAU/USD): ${fmt(intl?.price)} USD/oz, daily change ${signedPercent(intl?.changePercent)}, previous close ${fmt(intl?.previousClose)} USD
- International spot silver (XAG/USD): ${fmt(intl?.silverPrice)} USD/oz
- Derived ratios and premium:
  · Gold/silver ratio (live): ${ratio}
  · USD/CNY: ${usdCny}
  · Realised domestic premium over the international price converted at FX: ${premium}

═══════════════════════════════════════════════════════
[2. Quant indicator system and multi-factor score matrix]
═══════════════════════════════════════════════════════
${quantBlockEn(quant)}

═══════════════════════════════════════════════════════
[Output specification]
═══════════════════════════════════════════════════════
Follow this professional Markdown structure exactly. Keep the language tight and make every section concrete.

## Gold quant assessment: macro backdrop and multi-factor tactics

### 1. Macro backdrop and cross-market linkage
- [Gold/silver anchor]: use the live gold/silver ratio ${ratio} (historical balance roughly 65-75). Judge whether gold's safe-haven premium or silver's mean-reversion catch-up dominates, and outline any joint or arbitrage opportunity.
- [Premium and FX mechanism]: use the domestic premium ${premium} and its historical z-score to explain the domestic demand preference and the hidden FX discount, and state whether cross-market arbitrage is feasible.

### 2. Multi-timeframe technicals and factor confluence
- [Composite score]: interpret the composite score and its main component attributions; assess how trend, momentum, volatility and premium factors agree.
- [Moving averages and channels]: use the MA5 / MA20 / MA60 alignment and the EMA trend to judge the bull-leg structure or breakdown risk; use the Bollinger width and %B to judge breakout potential.
- [Momentum and overbought or oversold]: compare RSI(14) with the KDJ(9,3,3) position and say whether there is a high-level divergence or a low-level oversold signal.

### 3. Key intraday and swing levels
- [Intraday pivots]: list the classic and Fibonacci pivots (P / R1 / R2 / S1 / S2) and the intraday bull-bear dividing line.
- [ATR buffer]: based on the current ATR(14), set the intraday buffer: the chase trigger above and the defence line below.

### 4. Backtest lessons and position guidance
- [Strategy comparison]: compare the EMA trend strategy, the composite-score strategy and buy-and-hold on Sharpe, Calmar and max drawdown over the sample; judge how suitable trend following is now and what switching costs.
- [Trade plan]:
  · Stance: [bullish / bearish / range-bound and neutral / defensive wait]
  · Position guidance: state a percentage range (for example 30%-50% accumulated in tranches on weakness, or a light position and wait)
  · Entry zone reference
  · Dynamic stop-loss and defence floor (cite the quant stop reference prices)
  · Staged profit targets (first and second resistance)

### 5. Tail-risk plan and disclaimer
- Give the response rules for black-swan geopolitical events or major economic data releases, including dynamic stop-loss discipline.
- Include a full investment-risk warning and disclaimer.`;
}

export function ruleBasedEn(snapshot, quant) {
  const dom = snapshot.domestic;
  const intl = snapshot.international;
  const ratio = intl?.price && intl?.silverPrice ? (intl.price / intl.silverPrice).toFixed(2) : '--';
  const lines = [
    '## Gold quant assessment (rule-engine summary)',
    '',
    '### 1. Market and benchmark data',
    `- Domestic AU9999: ${fmt(dom.price)} CNY/g${dom.estimated ? ' (estimated)' : ''}, change ${signedPercent(dom.changePercent)}`,
    `- International XAU/USD: ${fmt(intl?.price)} USD/oz, change ${signedPercent(intl?.changePercent)}`,
    `- Silver XAG/USD: ${fmt(intl?.silverPrice)} USD/oz; live gold/silver ratio: ${ratio}`,
    `- Domestic premium: ${signedPercent(snapshot.premiumPercent)}; USD/CNY: ${fmt(snapshot.fx?.usdCny, 4)}`,
    '',
  ];

  if (quant?.available) {
    const s = quant.signal;
    const l = quant.levels;
    lines.push(
      '### 2. Core quant signal',
      `- Quant signal: **${enLabel(s.label)}** (score ${signed(s.score, 1)}, confidence ${s.confidence}%)`,
      `- Trend: ${enLabel(s.trend)}; volatility regime: ${enLabel(s.volRegime)}`,
      'Main factor attributions:',
      ...(s.reasonsEn ?? s.reasons).map((reason) => `- ${reason}`),
      '',
      '### 3. Support, resistance and reference range',
      `- Support: ${l.support.join(' / ')} CNY/g`,
      `- Resistance: ${l.resistance.join(' / ')} CNY/g`,
      `- ATR(14): ${fmt(l.atr)} CNY (${fmt(l.atrPercent)}% of the close)`,
      `- Reference range today: ${fmt(l.refLow)} - ${fmt(l.refHigh)} CNY/g`,
      `- Long stop reference: ${fmt(l.stopLongRef)} CNY/g`
    );

    if (l.pivots?.classic) {
      const cp = l.pivots.classic;
      lines.push(`- Classic pivots: P ${fmt(cp.pivot)} | R1 ${fmt(cp.r1)} / R2 ${fmt(cp.r2)} | S1 ${fmt(cp.s1)} / S2 ${fmt(cp.s2)}`);
    }
    lines.push('');

    if (quant.backtest?.available) {
      const st = quant.backtest.strategies;
      lines.push(
        '### 4. Backtest comparison',
        `- Sample window: ${quant.backtest.startDate} to ${quant.backtest.endDate} (${quant.backtest.days} sessions)`,
        `- EMA trend strategy: total return ${signedPercent(st.trend?.totalReturn)}, max drawdown ${fmt(st.trend?.maxDrawdown)}%, Sharpe ${fmt(st.trend?.sharpe)}`,
        `- Composite score strategy: total return ${signedPercent(st.score?.totalReturn)}, max drawdown ${fmt(st.score?.maxDrawdown)}%, Sharpe ${fmt(st.score?.sharpe)}`,
        `- Buy-and-hold benchmark: total return ${signedPercent(st.buyHold?.totalReturn)}, max drawdown ${fmt(st.buyHold?.maxDrawdown)}%`,
        ''
      );
    }
  } else {
    lines.push('Quant sample is too short; no score was produced.', '');
  }

  if (dom.estimated) lines.push('> **Note**: the domestic exchange feed is temporarily unavailable; the domestic price is a theoretical estimate. Please verify.', '');
  lines.push('**Risk warning**: precious-metal markets are volatile. This analysis was generated by a rule-based quant engine for reference only and is not investment advice.');
  return lines.join('\n');
}
