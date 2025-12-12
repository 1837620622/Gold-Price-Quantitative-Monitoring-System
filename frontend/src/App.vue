<template>
  <!-- ============================================================ -->
  <!-- 黄金价格检测系统 - 专业金融交易终端界面 -->
  <!-- ============================================================ -->
  <div class="terminal-container">
    <!-- 顶部导航栏 -->
    <header class="top-header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-symbol">Au</span>
          <span class="logo-text">GOLD MONITOR</span>
        </div>
        <div class="market-status">
          <span class="status-dot"></span>
          <span>实时行情</span>
        </div>
      </div>
      <div class="header-center">
        <span class="current-time">{{ currentTime }}</span>
      </div>
      <div class="header-right">
        <button class="refresh-btn" @click="refreshAllData" title="刷新数据">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- 主内容区域 - 新布局 -->
    <main class="main-content-new">
      <!-- 顶部价格卡片区域 -->
      <section class="price-cards-row">
        <!-- 国际金价卡片 -->
        <div class="price-card-new">
          <div class="card-icon intl">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
          <div class="card-info">
            <div class="card-label">XAU/USD <span class="badge">SPOT</span></div>
            <div class="card-price" :class="getPriceClass(priceData.international?.changePercent)">
              {{ formatPrice(priceData.international?.price, 'USD') }}
            </div>
            <div class="card-change" :class="getPriceClass(priceData.international?.changePercent)">
              {{ formatChange(priceData.international?.change) }} ({{ formatPercent(priceData.international?.changePercent) }})
            </div>
          </div>
          <div class="card-extra">
            <div class="extra-item"><span>昨收</span><span>{{ priceData.international?.previousClose?.toFixed(2) || '--' }}</span></div>
            <div class="extra-item"><span>白银</span><span>{{ priceData.international?.silverPrice?.toFixed(2) || '--' }}</span></div>
          </div>
        </div>

        <!-- 国内AU9999卡片 -->
        <div class="price-card-new domestic">
          <div class="card-icon cn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
          <div class="card-info">
            <div class="card-label">AU9999 <span class="badge cn">CNY</span></div>
            <div class="card-price" :class="getPriceClass(priceData.domestic?.changePercent)">
              {{ formatPrice(priceData.domestic?.price, 'CNY') }}
            </div>
            <div class="card-change" :class="getPriceClass(priceData.domestic?.changePercent)">
              {{ formatChange(priceData.domestic?.change) }} ({{ formatPercent(priceData.domestic?.changePercent) }})
            </div>
          </div>
          <div class="card-extra">
            <div class="extra-item"><span>开盘</span><span>{{ priceData.domestic?.open?.toFixed(2) || '--' }}</span></div>
            <div class="extra-item"><span>最高</span><span class="up">{{ priceData.domestic?.high?.toFixed(2) || '--' }}</span></div>
            <div class="extra-item"><span>最低</span><span class="down">{{ priceData.domestic?.low?.toFixed(2) || '--' }}</span></div>
            <div class="extra-item"><span>成交量</span><span>{{ priceData.domestic?.volume || '--' }}</span></div>
          </div>
        </div>

        <!-- AI分析按钮卡片 -->
        <div class="ai-card">
          <div class="ai-header">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-3 9a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z"/>
            </svg>
            <div>
              <div class="ai-title">AI 量化分析</div>
              <div class="ai-model">{{ analysisModel || 'DeepSeek-V3' }}</div>
            </div>
          </div>
          <button class="ai-btn" @click="runAnalysis" :disabled="analyzing">
            <span v-if="analyzing" class="spinner"></span>
            {{ analyzing ? '分析中...' : '开始分析' }}
          </button>
        </div>
      </section>

      <!-- K线图区域 - 电脑端显示TradingView -->
      <section class="chart-section desktop-only">
        <div class="chart-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
            XAU/USD 国际金价走势
          </h3>
          <span class="chart-source">TradingView</span>
        </div>
        <div class="chart-container tradingview-container">
          <iframe 
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_gold&symbol=OANDA%3AXAUUSD&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=1a1a24&studies=[]&theme=dark&style=1&timezone=Asia%2FShanghai&withdateranges=1&showpopupbutton=0&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=[]&disabled_features=[]&locale=zh_CN"
            class="chart-iframe"
            frameborder="0"
            allowtransparency="true"
            scrolling="no"
            allowfullscreen
          ></iframe>
        </div>
      </section>

      <!-- 手机端提示 -->
      <section class="chart-section mobile-only">
        <div class="mobile-chart-notice">
          <div class="notice-icon">📊</div>
          <h3>K线图仅支持电脑端访问</h3>
          <p>请使用电脑浏览器查看完整K线图</p>
          <div class="notice-tip">
            <span>🪜</span>
            <span>需要科学上网工具访问TradingView</span>
          </div>
        </div>
      </section>

      <!-- AI分析结果区域 -->
      <section class="analysis-section" v-if="analysisResult || analyzing">
        <div class="analysis-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
            </svg>
            AI 智能分析报告
          </h3>
          <span class="analysis-time">{{ analysisTimestamp }}</span>
        </div>
        <div class="analysis-body">
          <div v-if="analyzing" class="analyzing-state">
            <div class="analyzing-animation">
              <span></span><span></span><span></span>
            </div>
            <p class="analyzing-title">DeepSeek 深度分析中...</p>
            <p class="analyzing-hint">大概需要1-2分钟，请耐心等待</p>
          </div>
          <div v-else class="analysis-text markdown-body" v-html="renderedAnalysis"></div>
        </div>
      </section>
    </main>

    <!-- 底部状态栏 -->
    <footer class="status-bar">
      <div class="status-left">
        <span class="status-item">
          <span class="status-indicator online"></span>
          API 已连接
        </span>
        <span class="status-item">延迟: {{ latency }}ms</span>
      </div>
      <div class="status-center">
        Gold Monitor v1.0 | Powered by DeepSeek AI
      </div>
      <div class="status-right">
        <span>Vx: 1837620622</span>
      </div>
    </footer>

    <!-- 全屏水印 -->
    <div class="watermark-container">
      <div class="watermark-content">
        <div class="watermark-item" v-for="n in 20" :key="n">
          <span>GitHub: 万能程序员</span>
          <span>github.com/1837620622</span>
          <span>官网: www.chuankangkk.top</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ============================================================
 * 黄金价格检测系统 - 主应用逻辑
 * ============================================================
 */

import { ref, onMounted, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts';
import axios from 'axios';
import { marked } from 'marked';

// 配置marked选项
marked.setOptions({
  breaks: true,
  gfm: true,
});

// ============================================================
// 响应式数据定义
// ============================================================
const priceData = ref({
  international: null,
  domestic: null,
});

const klineData = ref([]);
const klineChart = ref(null);
const chartInstance = ref(null);

const periods = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];
const currentPeriod = ref(30);

const analyzing = ref(false);
const analysisResult = ref('');
const analysisTimestamp = ref('');
const analysisModel = ref('');
const currentTime = ref('');
const latency = ref(0);

// 计算属性：渲染Markdown
const renderedAnalysis = computed(() => {
  if (!analysisResult.value) return '';
  return marked(analysisResult.value);
});

// API 基础路径
const API_BASE = import.meta.env.PROD 
  ? 'https://gold-backend.chuankangkk.top' 
  : '';

// ============================================================
// 工具函数
// ============================================================
function formatPrice(price, currency) {
  if (!price) return '--';
  const formatted = price.toFixed(2);
  return currency === 'USD' ? `$${formatted}` : `¥${formatted}`;
}

function formatChange(change) {
  if (change === undefined || change === null) return '--';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

function formatPercent(percent) {
  if (percent === undefined || percent === null) return '--';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

function getPriceClass(changePercent) {
  if (changePercent === undefined || changePercent === null) return '';
  return changePercent >= 0 ? 'up' : 'down';
}

function updateTime() {
  const now = new Date();
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function refreshAllData() {
  fetchPriceData();
  fetchKlineData(currentPeriod.value);
}

function changePeriod(days) {
  currentPeriod.value = days;
  fetchKlineData(days);
}

// ============================================================
// 获取价格数据
// ============================================================
async function fetchPriceData() {
  try {
    const response = await axios.get(`${API_BASE}/api/price/all`);
    priceData.value = {
      international: response.data.international,
      domestic: response.data.domestic,
    };
  } catch (error) {
    console.error('获取价格数据失败:', error);
    // 使用模拟数据
    priceData.value = {
      international: { price: 2650 + Math.random() * 50, source: 'simulated' },
      domestic: { price: 620 + Math.random() * 10, source: 'simulated' },
    };
  }
}

// ============================================================
// 获取K线数据和图表配置
// ============================================================
async function fetchKlineData(days = 30) {
  try {
    const response = await axios.get(`${API_BASE}/api/chart/kline?days=${days}`);
    klineData.value = response.data.rawData;
    // 直接使用后端返回的图表配置
    if (chartInstance.value && response.data.chartOption) {
      chartInstance.value.setOption(response.data.chartOption);
    }
  } catch (error) {
    console.error('获取K线数据失败:', error);
    // 生成模拟数据
    generateMockKlineData(days);
  }
}

// ============================================================
// 生成模拟K线数据
// ============================================================
function generateMockKlineData(days) {
  const data = [];
  let price = 620;
  const now = Date.now();

  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const change = (Math.random() - 0.5) * 10;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;

    data.push({
      date: new Date(timestamp).toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.floor(Math.random() * 100000 + 50000),
    });

    price = close;
  }

  klineData.value = data;
  updateChart();
}

// ============================================================
// 初始化图表
// ============================================================
function initChart() {
  // 初始化K线图
  if (klineChart.value) {
    chartInstance.value = echarts.init(klineChart.value, 'dark');
  }
  
  window.addEventListener('resize', () => {
    chartInstance.value?.resize();
  });
}

// ============================================================
// 更新K线图
// ============================================================
function updateChart() {
  if (!chartInstance.value || !klineData.value.length) return;

  const dates = klineData.value.map(item => item.date);
  const ohlcData = klineData.value.map(item => [item.open, item.close, item.low, item.high]);
  const volumes = klineData.value.map((item, index) => {
    const color = item.close >= item.open ? '#26a69a' : '#ef5350';
    return { value: item.volume, itemStyle: { color } };
  });

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#fbbf24',
      textStyle: { color: '#fff' },
    },
    legend: {
      data: ['K线', '成交量'],
      textStyle: { color: '#9ca3af' },
    },
    grid: [
      { left: '10%', right: '8%', top: '10%', height: '55%' },
      { left: '10%', right: '8%', top: '72%', height: '18%' },
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        scale: true,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af' },
        splitLine: { show: false },
      },
      {
        type: 'category',
        gridIndex: 1,
        data: dates,
        scale: true,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
    ],
    yAxis: [
      {
        scale: true,
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af' },
        splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: ohlcData,
        itemStyle: {
          color: '#26a69a',
          color0: '#ef5350',
          borderColor: '#26a69a',
          borderColor0: '#ef5350',
        },
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
      },
    ],
  };

  chartInstance.value.setOption(option);
}


// ============================================================
// 运行AI量化分析
// ============================================================
async function runAnalysis() {
  analyzing.value = true;
  analysisResult.value = '';
  analysisTimestamp.value = '';
  analysisModel.value = '';

  try {
    const startTime = Date.now();
    const response = await axios.post(`${API_BASE}/api/analyze`);
    latency.value = Date.now() - startTime;
    
    if (response.data.success && response.data.analysis) {
      analysisResult.value = response.data.analysis.analysis || response.data.analysis;
      analysisModel.value = response.data.analysis.model || 'DeepSeek';
      analysisTimestamp.value = new Date().toLocaleString('zh-CN');
    } else {
      analysisResult.value = '分析结果获取失败，请稍后重试。';
    }
  } catch (error) {
    console.error('AI分析失败:', error);
    analysisResult.value = `分析请求失败: ${error.message}\n\n请检查后端服务是否正常运行，以及API密钥是否配置正确。`;
  } finally {
    analyzing.value = false;
  }
}

// ============================================================
// 生命周期钩子
// ============================================================
let priceUpdateInterval = null;
let timeUpdateInterval = null;

onMounted(() => {
  // 初始化时间
  updateTime();
  timeUpdateInterval = setInterval(updateTime, 1000);
  
  // 初始化图表
  initChart();
  
  // 获取初始数据
  fetchPriceData();
  fetchKlineData(currentPeriod.value);

  // 定时更新价格（每30秒）
  priceUpdateInterval = setInterval(fetchPriceData, 30000);
});

onUnmounted(() => {
  // 清理定时器
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
  }
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }
  
  // 销毁图表实例
  if (chartInstance.value) {
    chartInstance.value.dispose();
  }
  if (intlChartInstance.value) {
    intlChartInstance.value.dispose();
  }
});
</script>
