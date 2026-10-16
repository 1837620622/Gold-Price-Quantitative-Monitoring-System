<template>
  <section class="card chart-card" aria-labelledby="chart-title">
    <header class="card-head">
      <div>
        <h2 id="chart-title" class="card-title">{{ tab === 'cn' ? 'AU9999 日K线' : 'XAU/USD 国际走势' }}</h2>
        <p class="card-sub">
          {{ tab === 'cn' ? '东方财富真实历史数据 · 红涨绿跌 · MA5 / MA10' : 'TradingView 实时图表（国内访问需科学上网）' }}
        </p>
      </div>
      <div class="seg" role="tablist" aria-label="行情图表">
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'cn'"
          :class="{ active: tab === 'cn' }"
          @click="tab = 'cn'"
        >国内</button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'intl'"
          :class="{ active: tab === 'intl' }"
          @click="tab = 'intl'"
        >国际</button>
      </div>
    </header>

    <!-- 国内日K：自有真实数据，移动端同样可用 -->
    <div v-show="tab === 'cn'">
      <div class="chart-toolbar">
        <div class="seg seg-sm" role="group" aria-label="K线周期">
          <button
            v-for="p in PERIODS"
            :key="p"
            type="button"
            :class="{ active: p === period }"
            :aria-pressed="p === period"
            @click="period = p"
          >{{ p }}日</button>
        </div>
        <dl v-if="summary" class="kstats">
          <div>
            <dt>区间涨跌</dt>
            <dd :class="`tone-${summary.tone}`">{{ summary.change }}</dd>
          </div>
          <div>
            <dt>区间最高</dt>
            <dd>{{ summary.high }}</dd>
          </div>
          <div>
            <dt>区间最低</dt>
            <dd>{{ summary.low }}</dd>
          </div>
        </dl>
      </div>

      <div class="chart-box">
        <div ref="chartEl" class="echart" role="img" :aria-label="`AU9999 ${period} 日K线图`"></div>
        <div v-if="loading" class="chart-overlay">
          <span class="spinner" aria-hidden="true"></span> 正在加载日K线…
        </div>
        <div v-else-if="error" class="chart-overlay chart-error">
          <span>{{ error }}</span>
          <button type="button" class="btn btn-ghost btn-sm" @click="load({ force: true })">重试</button>
        </div>
        <div v-else-if="!rows.length" class="chart-overlay">暂无K线数据</div>
      </div>
    </div>

    <!-- 国际走势：第三方组件，仅在选中时加载 -->
    <div v-if="tab === 'intl'" class="intl-box">
      <iframe
        class="tv-frame"
        src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_gold&symbol=OANDA%3AXAUUSD&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=1a1a24&studies=[]&theme=dark&style=1&timezone=Asia%2FShanghai&withdateranges=1&showpopupbutton=0&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=[]&disabled_features=[]&locale=zh_CN"
        title="TradingView XAU/USD 日线图"
        loading="lazy"
        allowfullscreen
      ></iframe>
      <p class="tv-note">移动端请使用电脑浏览器查看 TradingView 图表，国内访问需要科学上网工具。</p>
    </div>
  </section>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue';
import { fetchKline } from '../api';
import { fmtNumber, fmtPercent, toneOf } from '../format';

const props = defineProps({
  theme: { type: String, default: 'dark' },
});

const PERIODS = [7, 30, 90];
const CACHE_MS = 5 * 60 * 1000;

const tab = ref('cn');
const period = ref(30);
const rows = ref([]);
const loading = ref(false);
const error = ref('');
const chartEl = ref(null);
const chart = shallowRef(null);
let echarts = null;
let resizeObserver = null;
let refreshTimer = null;
let unmounted = false;

const cache = new Map(); // period -> { at, rows }

const summary = computed(() => {
  const data = rows.value;
  if (!data.length) return null;
  const first = data[0];
  const last = data[data.length - 1];
  const change = ((last.close - first.open) / first.open) * 100;
  return {
    change: fmtPercent(change),
    tone: toneOf(change),
    high: fmtNumber(Math.max(...data.map((r) => r.high))),
    low: fmtNumber(Math.min(...data.map((r) => r.low))),
  };
});

async function load({ force = false } = {}) {
  const requested = period.value;
  const hit = cache.get(requested);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) {
    rows.value = hit.rows;
    error.value = '';
    loading.value = false; // 切回已缓存的周期时，清除切换前未完成请求留下的加载状态
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const data = await fetchKline(requested);
    if (requested !== period.value) return; // 用户已切换周期，丢弃过期结果
    const list = Array.isArray(data.data) ? data.data : [];
    cache.set(requested, { at: Date.now(), rows: list });
    rows.value = list;
  } catch (err) {
    if (requested !== period.value) return;
    error.value = err?.response?.data?.message || '日K线获取失败';
    rows.value = [];
  } finally {
    if (requested === period.value) loading.value = false;
  }
}

function palette() {
  return props.theme === 'dark'
    ? {
        up: '#ff5b5f', down: '#34d399', grid: 'rgba(255,255,255,0.08)',
        muted: '#8d96a8', text: '#eceef3', tipBg: 'rgba(18,21,28,0.96)',
        ma5: '#e7b75b', ma10: '#60a5fa',
      }
    : {
        up: '#e0343c', down: '#0f9d58', grid: 'rgba(20,24,38,0.08)',
        muted: '#6b7386', text: '#151821', tipBg: 'rgba(255,255,255,0.98)',
        ma5: '#b7791f', ma10: '#2563eb',
      };
}

function movingAverage(values, n) {
  return values.map((_, i) => {
    if (i < n - 1) return null;
    const slice = values.slice(i - n + 1, i + 1);
    return Number((slice.reduce((sum, v) => sum + v, 0) / n).toFixed(2));
  });
}

function buildOption(list, c) {
  const dates = list.map((r) => r.date);
  const closes = list.map((r) => r.close);

  return {
    animationDuration: 300,
    legend: {
      top: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 3,
      textStyle: { color: c.muted },
      data: ['日K', 'MA5', 'MA10'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', lineStyle: { color: c.muted, type: 'dashed' } },
      backgroundColor: c.tipBg,
      borderColor: c.grid,
      textStyle: { color: c.text, fontSize: 12 },
      formatter: (params) => {
        const row = list[params[0].dataIndex];
        if (!row) return '';
        const color = row.close >= row.open ? c.up : c.down;
        return `<div style="font-weight:600;margin-bottom:4px">${row.date}</div>
          开 ${fmtNumber(row.open)} &nbsp; 高 ${fmtNumber(row.high)}<br/>
          低 ${fmtNumber(row.low)} &nbsp; 收 <b style="color:${color}">${fmtNumber(row.close)}</b><br/>
          成交量 ${Math.round(row.volume).toLocaleString('zh-CN')} 手`;
      },
    },
    grid: [
      { left: 56, right: 18, top: 36, height: '60%' },
      { left: 56, right: 18, top: '76%', height: '14%' },
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        boundaryGap: true,
        axisLine: { lineStyle: { color: c.grid } },
        axisTick: { show: false },
        axisLabel: { color: c.muted, hideOverlap: true },
        splitLine: { show: false },
      },
      {
        type: 'category',
        gridIndex: 1,
        data: dates,
        boundaryGap: true,
        axisLine: { lineStyle: { color: c.grid } },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
    ],
    yAxis: [
      {
        scale: true,
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLabel: { color: c.muted, formatter: (v) => fmtNumber(v, 0) },
        axisLine: { show: false },
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        // 成交量轴上限放大到约 2.2 倍，使柱子集中在副图区域
        max: (value) => value.max * 2.2,
      },
    ],
    series: [
      {
        name: '日K',
        type: 'candlestick',
        data: list.map((r) => [r.open, r.close, r.low, r.high]),
        itemStyle: { color: c.up, color0: c.down, borderColor: c.up, borderColor0: c.down },
      },
      {
        name: 'MA5',
        type: 'line',
        data: movingAverage(closes, 5),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color: c.ma5 },
        itemStyle: { color: c.ma5 },
      },
      {
        name: 'MA10',
        type: 'line',
        data: movingAverage(closes, 10),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color: c.ma10 },
        itemStyle: { color: c.ma10 },
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        barMaxWidth: 14,
        data: list.map((r) => ({
          value: r.volume,
          itemStyle: { color: r.close >= r.open ? c.up : c.down, opacity: 0.45 },
        })),
      },
    ],
  };
}

function render() {
  if (!chart.value) return;
  if (!rows.value.length) {
    chart.value.clear();
    return;
  }
  chart.value.setOption(buildOption(rows.value, palette()), { notMerge: true });
}

watch(rows, render);
watch(() => props.theme, render);
watch(period, () => load());

onMounted(async () => {
  load();
  refreshTimer = setInterval(() => {
    if (!document.hidden) load({ force: true });
  }, CACHE_MS);

  // ECharts 体积较大，挂载后再按需加载，不阻塞首屏行情渲染
  const module = await import('../lib/echarts');
  if (unmounted) return;
  echarts = module.default;
  chart.value = echarts.init(chartEl.value, null, { renderer: 'canvas' });
  resizeObserver = new ResizeObserver(() => chart.value?.resize());
  resizeObserver.observe(chartEl.value);
  render();
});

onUnmounted(() => {
  unmounted = true;
  clearInterval(refreshTimer);
  resizeObserver?.disconnect();
  chart.value?.dispose();
  chart.value = null;
});
</script>

<style scoped>
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.card-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.card-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.chart-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.kstats {
  margin: 0;
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

.kstats dt {
  font-size: 12px;
  color: var(--text-3);
}

.kstats dd {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.kstats dd.tone-up { color: var(--up); }
.kstats dd.tone-down { color: var(--down); }

.chart-box {
  position: relative;
  height: 430px;
}

.echart {
  width: 100%;
  height: 100%;
}

.chart-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-2);
  font-size: 14px;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  pointer-events: none;
}

.chart-overlay.chart-error {
  flex-direction: column;
  color: var(--danger);
  pointer-events: auto;
}

.chart-overlay.chart-error button {
  pointer-events: auto;
}

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--border-strong);
  border-top-color: var(--gold);
  animation: spin 0.9s linear infinite;
}

.intl-box {
  position: relative;
}

.tv-frame {
  display: block;
  width: 100%;
  height: 480px;
  border: 0;
  border-radius: var(--radius);
  background: var(--surface-2);
}

.tv-note {
  display: none;
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

@media (max-width: 767px) {
  .chart-box {
    height: 340px;
  }

  .tv-frame {
    display: none;
  }

  .tv-note {
    display: block;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
