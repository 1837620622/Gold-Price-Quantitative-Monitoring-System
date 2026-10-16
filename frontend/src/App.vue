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
        <button class="subscribe-btn" @click="showQrModal = true" title="订阅金价推送">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span class="btn-text">订阅推送</span>
        </button>
        <button class="refresh-btn" @click="refreshAllData" title="刷新数据">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="main-content-new">
      <!-- 行情错误提示 -->
      <div class="price-error-banner" v-if="priceError">{{ priceError }}</div>

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
            <div class="extra-item"><span>昨收</span><span>{{ fmtNum(priceData.international?.previousClose) }}</span></div>
            <div class="extra-item"><span>白银</span><span>{{ fmtNum(priceData.international?.silverPrice) }}</span></div>
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
            <div class="card-label">
              AU9999 <span class="badge cn">CNY</span>
              <span class="badge estimate" v-if="priceData.domestic?.estimated">估算</span>
            </div>
            <div class="card-price" :class="getPriceClass(priceData.domestic?.changePercent)">
              {{ formatPrice(priceData.domestic?.price, 'CNY') }}
            </div>
            <div class="card-change" :class="getPriceClass(priceData.domestic?.changePercent)">
              {{ formatChange(priceData.domestic?.change) }} ({{ formatPercent(priceData.domestic?.changePercent) }})
            </div>
          </div>
          <div class="card-extra">
            <div class="extra-item"><span>开盘</span><span>{{ fmtNum(priceData.domestic?.open) }}</span></div>
            <div class="extra-item"><span>最高</span><span class="up">{{ fmtNum(priceData.domestic?.high) }}</span></div>
            <div class="extra-item"><span>最低</span><span class="down">{{ fmtNum(priceData.domestic?.low) }}</span></div>
            <div class="extra-item"><span>成交量</span><span>{{ priceData.domestic?.volume ?? '--' }}</span></div>
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
      <section class="analysis-section" v-if="analysisResult || analyzing || analysisError">
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
          <div v-else-if="analysisError" class="analysis-text">{{ analysisError }}</div>
          <div v-else class="analysis-text markdown-body" v-html="renderedAnalysis"></div>
        </div>
      </section>
    </main>

    <!-- 底部状态栏 -->
    <footer class="status-bar">
      <div class="status-left">
        <span class="status-item">
          <span class="status-indicator" :class="apiOnline ? 'online' : 'offline'"></span>
          {{ apiOnline ? 'API 已连接' : 'API 连接失败' }}
        </span>
        <span class="status-item">行情请求耗时: {{ latency }}ms</span>
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

    <!-- 二维码订阅弹窗 -->
    <div class="qr-modal-overlay" v-if="showQrModal" @click.self="showQrModal = false">
      <div class="qr-modal">
        <button class="qr-close-btn" @click="showQrModal = false">&times;</button>
        <div class="qr-header">
          <h2>订阅金价推送</h2>
          <p>扫码加入群组，实时接收金价行情通知</p>
        </div>
        <div class="qr-body">
          <div class="qr-image-wrapper">
            <img src="/qrcode.png" alt="订阅二维码" class="qr-image" />
          </div>
          <div class="qr-info">
            <div class="qr-feature">
              <span class="feature-icon">⏰</span>
              <span>每30分钟自动推送金价行情</span>
            </div>
            <div class="qr-feature">
              <span class="feature-icon">📊</span>
              <span>涨跌幅超1%自动预警</span>
            </div>
            <div class="qr-feature">
              <span class="feature-icon">🤖</span>
              <span>AI智能分析摘要</span>
            </div>
          </div>
        </div>
        <div class="qr-footer">
          <p class="qr-expire">二维码有效期：30天</p>
          <p class="qr-tip">长按图片保存到手机，使用微信扫一扫加入</p>
          <a class="qr-download-btn" href="/qrcode.png" download="金价推送订阅二维码.png">
            保存二维码到本地
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ============================================================
 * 黄金价格检测系统 - 主应用逻辑
 * 注意：页面不再使用任何模拟/随机数据。接口失败时显示错误，而不是假价格。
 * ============================================================
 */

import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

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
const priceError = ref('');
const apiOnline = ref(true);
const latency = ref(0);

const analyzing = ref(false);
const analysisResult = ref('');
const analysisError = ref('');
const analysisTimestamp = ref('');
const analysisModel = ref('');

const currentTime = ref('');
const showQrModal = ref(false);

// AI 输出来自外部模型，渲染前必须消毒，防止 XSS
const renderedAnalysis = computed(() => {
  if (!analysisResult.value) return '';
  return DOMPurify.sanitize(marked.parse(String(analysisResult.value)));
});

// API 基础路径
const API_BASE = import.meta.env.PROD
  ? 'https://gold-backend.chuankangkk.top'
  : '';

// ============================================================
// 工具函数
// ============================================================
function formatPrice(price, currency) {
  if (typeof price !== 'number' || !Number.isFinite(price)) return '--';
  const formatted = price.toFixed(2);
  return currency === 'USD' ? `$${formatted}` : `¥${formatted}`;
}

function fmtNum(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '--';
}

function formatChange(change) {
  if (typeof change !== 'number' || !Number.isFinite(change)) return '--';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

function formatPercent(percent) {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return '--';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

function getPriceClass(changePercent) {
  if (typeof changePercent !== 'number' || !Number.isFinite(changePercent)) return '';
  return changePercent >= 0 ? 'up' : 'down';
}

function updateTime() {
  currentTime.value = new Date().toLocaleString('zh-CN', {
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
}

// ============================================================
// 获取价格数据
// ============================================================
async function fetchPriceData() {
  const start = Date.now();
  try {
    const { data } = await axios.get(`${API_BASE}/api/price/all`, { timeout: 15000 });
    latency.value = Date.now() - start;
    apiOnline.value = true;
    priceData.value = {
      international: data.international ?? null,
      domestic: data.domestic ?? null,
    };
    priceError.value = data.domestic
      ? (data.international ? '' : '国际金价暂不可用，仅显示国内行情')
      : '行情暂不可用，请稍后刷新';
  } catch (error) {
    console.error('获取价格数据失败:', error);
    apiOnline.value = false;
    priceError.value = '行情接口暂时无法连接，请稍后刷新';
  }
}

// ============================================================
// 运行AI量化分析
// ============================================================
async function runAnalysis() {
  analyzing.value = true;
  analysisResult.value = '';
  analysisError.value = '';
  analysisTimestamp.value = '';
  analysisModel.value = '';

  try {
    const { data } = await axios.post(`${API_BASE}/api/analyze`, null, { timeout: 120000 });

    if (data.success && data.analysis?.analysis) {
      analysisResult.value = data.analysis.analysis;
      analysisModel.value = data.analysis.model || 'DeepSeek';
      analysisTimestamp.value = new Date(data.timestamp).toLocaleString('zh-CN');
    } else {
      analysisError.value = data.message || '分析结果获取失败，请稍后重试。';
    }
  } catch (error) {
    console.error('AI分析失败:', error);
    analysisError.value = '分析请求失败，请稍后重试。';
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
  updateTime();
  timeUpdateInterval = setInterval(updateTime, 1000);

  fetchPriceData();
  // 每30秒刷新行情
  priceUpdateInterval = setInterval(fetchPriceData, 30000);
});

onUnmounted(() => {
  clearInterval(priceUpdateInterval);
  clearInterval(timeUpdateInterval);
});
</script>
