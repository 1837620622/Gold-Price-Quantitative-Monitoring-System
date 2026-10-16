/**
 * 测试辅助：确定性的合成行情与上游 mock
 * 仅用于测试，不进入生产代码路径
 */

export const DAY = 86400000;
const BASE = Date.UTC(2025, 0, 1);
const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 10000) / 10000;

export function rng(seed = 7) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// 带趋势与噪声的合成日K（OHLC 关系恒成立）
export function syntheticSeries(n, { start = 1000, drift = 0.0006, vol = 0.012, seed = 7 } = {}) {
  const rnd = rng(seed);
  const bars = [];
  let p = start;
  for (let i = 0; i < n; i++) {
    const open = r2(p);
    const close = r2(open * (1 + drift + (rnd() - 0.5) * 2 * vol));
    const high = Math.max(open, close, r2(Math.max(open, close) * (1 + rnd() * vol * 0.5)));
    const low = Math.min(open, close, r2(Math.min(open, close) * (1 - rnd() * vol * 0.5)));
    bars.push({
      date: new Date(BASE + i * DAY).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: Math.round(1000 + rnd() * 500),
    });
    p = close;
  }
  return bars;
}

// 由国际序列生成国内序列：国内 = 国际 × 汇率 ÷ 31.1035 × (1 + 溢价)，溢价约 1% 并带周期波动
export function domesticFrom(intl, fx = 7.1) {
  return intl.map((b, i) => {
    const premium = 0.01 + 0.003 * Math.sin(i / 5);
    const factor = (fx / 31.1035) * (1 + premium);
    const open = r2(b.open * factor);
    const close = r2(b.close * factor);
    return {
      date: b.date,
      open,
      close,
      high: Math.max(open, close, r2(b.high * factor)),
      low: Math.min(open, close, r2(b.low * factor)),
      volume: b.volume,
    };
  });
}

// 与国际序列同日期的汇率序列（窄幅波动）
export function fxSeries(intl) {
  return intl.map((b, i) => {
    const c = r4(7.1 + 0.02 * Math.sin(i / 9));
    return { date: b.date, open: c, high: r4(c + 0.001), low: r4(c - 0.001), close: c, volume: 0 };
  });
}

export const toKlineLines = (bars) =>
  bars.map((b) => `${b.date},${b.open},${b.close},${b.high},${b.low},${b.volume}`);

export function toStooqCsv(bars) {
  const rows = bars.map((b) => `${b.date},${b.open},${b.high},${b.low},${b.close},${b.volume}`);
  return ['Date,Open,High,Low,Close,Volume', ...rows].join('\n');
}

export function toYahooChart(bars) {
  const timestamp = bars.map((b) => Date.parse(`${b.date}T00:00:00Z`) / 1000);
  const last = bars[bars.length - 1];
  return {
    chart: {
      error: null,
      result: [
        {
          meta: { regularMarketPrice: last.close, regularMarketTime: timestamp[timestamp.length - 1] },
          timestamp,
          indicators: {
            quote: [{
              open: bars.map((b) => b.open),
              high: bars.map((b) => b.high),
              low: bars.map((b) => b.low),
              close: bars.map((b) => b.close),
              volume: bars.map((b) => b.volume),
            }],
          },
        },
      ],
    },
  };
}

// 构造上游 mock：fail 中为 true 的数据源返回 HTTP 错误
export function makeUpstream({ intl, domestic, fx, fail = {}, pushOk = true, aiOk = false }) {
  const log = [];
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const text = (body, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/csv' } });

  const fn = async (input) => {
    const u = String(input);
    log.push(u);

    if (u.startsWith('https://api.gold-api.com/price/XAU')) {
      return fail.gold ? text('err', 503) : json({ price: intl.at(-1).close, updatedAt: '2026-10-16T01:00:00Z' });
    }
    if (u.startsWith('https://api.gold-api.com/price/XAG')) return json({ price: 50.2 });

    if (u.startsWith('https://query1.finance.yahoo.com/')) {
      if (fail.yahoo) return json({ chart: { result: null, error: { description: 'mock failure' } } }, 500);
      const range = new URL(u).searchParams.get('range');
      return json(toYahooChart(range === '5d' ? intl.slice(-5) : intl));
    }

    if (u.startsWith('https://stooq.com/q/d/l/')) {
      const symbol = new URL(u).searchParams.get('s');
      if (symbol === 'xauusd') return fail.stooq ? text('No data') : text(toStooqCsv(intl));
      if (symbol === 'usdcny') return fail.stooqFx ? text('No data') : text(toStooqCsv(fx));
      return text('No data');
    }

    if (u.startsWith('https://open.er-api.com/')) {
      if (fail.fx) return text('err', 500);
      return json({ result: 'success', rates: { CNY: fx.at(-1).close }, time_last_update_utc: '2026-10-16' });
    }

    if (u.startsWith('https://api.frankfurter.app/')) {
      return json({ rates: Object.fromEntries(fx.map((b) => [b.date, { CNY: b.close }])) });
    }

    if (u.includes('push2his.eastmoney.com')) {
      if (fail.domesticKline) return text('err', 500);
      return json({ data: { klines: toKlineLines(domestic) } });
    }

    if (u.includes('push2.eastmoney.com/api/qt/stock/get')) {
      if (fail.domestic) return text('err', 500);
      const last = domestic.at(-1);
      const prev = domestic.at(-2);
      return json({
        rc: 0,
        data: {
          f43: Math.round(last.close * 100),
          f44: Math.round(last.high * 100),
          f45: Math.round(last.low * 100),
          f46: Math.round(last.open * 100),
          f47: 1234,
          f48: 1,
          f57: 'AU9999',
          f58: '黄金9999',
          f60: Math.round(prev.close * 100),
          f169: Math.round((last.close - prev.close) * 100),
          f170: Math.round(((last.close - prev.close) / prev.close) * 10000),
        },
      });
    }

    if (u.includes('hq.sinajs.cn')) {
      if (fail.sina || fail.domestic) return text('err', 500);
      const last = domestic.at(-1);
      const prev = domestic.at(-2);
      const lastIntl = intl.at(-1);
      const lastFx = fx.at(-1);
      return text([
        `var hq_str_gds_AU9999="${last.close},0,${last.close},${last.close},${last.high},${last.low},00:00:00,${prev.close},${last.open},1000,0,0,${last.date}";`,
        `var hq_str_gds_AUTD="${last.close},0,${last.close},${last.close},${last.high},${last.low},00:00:00,${prev.close},${last.open},1000,0,0,${last.date}";`,
        `var hq_str_hf_XAU="${lastIntl.close},${lastIntl.close},${lastIntl.close},0,${lastIntl.high},${lastIntl.low},00:00:00,${lastIntl.close},${lastIntl.open},0,0,0,${lastIntl.date}";`,
        `var hq_str_hf_XAG="50.2,50.2,50.2,0,51,49,00:00:00,50.2,50.2,0,0,0,${lastIntl.date}";`,
        `var hq_str_fx_susdcny="00:00:00,${lastFx.close},${lastFx.close},${lastFx.close},0,0,0,0,0,0,0,0,0,0,0,0,,${lastFx.date}";`,
      ].join('\n'));
    }

    if (u.includes('swissquote.com')) {
      if (fail.swissquote) return text('err', 500);
      const isXag = u.includes('XAG');
      const p = isXag ? 50.2 : intl.at(-1).close;
      return json([{ spreadProfilePrices: [{ bid: p - 0.5, ask: p + 0.5 }], ts: Date.now() }]);
    }

    if (u.includes('pushplus.plus')) {
      return json({ code: pushOk ? 200 : 500, msg: pushOk ? 'ok' : '限流', data: null });
    }

    if (u.includes('modelscope')) {
      if (!aiOk) return text('err', 500);
      return json({ choices: [{ message: { content: '## 量化分析报告\n\n### 1. 信号解读\n评分偏多。' } }] });
    }

    return text(`unexpected ${u}`, 599);
  };

  return { fn, log };
}
