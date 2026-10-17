<template>
  <footer class="app-footer">
    <div class="container">
      <!-- 机构级实时系统运行状态条 (Terminal Status Dock) -->
      <div class="terminal-status-bar">
        <div class="status-col left">
          <div class="status-indicator">
            <span class="live-pulse-dot"></span>
            <span class="indicator-title">系统在线</span>
            <span class="indicator-sub">HTTP/2 · TLS 1.3</span>
          </div>
          <div class="status-metric">
            <span class="metric-label">网关延迟</span>
            <span class="metric-val">{{ latency || 52 }}ms</span>
          </div>
          <div class="status-metric">
            <span class="metric-label">边缘节点</span>
            <span class="metric-val">Cloudflare Global Edge</span>
          </div>
        </div>

        <div class="status-col center">
          <div class="engine-badge">
            <span class="engine-spark">✦</span>
            <span>Workers AI · DeepSeek-R1 / Qwen 2.5 混合算力引擎</span>
          </div>
        </div>

        <div class="status-col right">
          <div class="status-metric">
            <span class="metric-label">数据持久化</span>
            <span class="metric-val">Cloudflare KV 边缘同步</span>
          </div>
          <div class="status-metric">
            <span class="metric-label">终端版本</span>
            <span class="metric-val gold">v3.5.0 PRO</span>
          </div>
        </div>
      </div>

      <!-- 底部主体卡片 -->
      <div class="footer-main-card">
        <div class="footer-brand-section">
          <div class="footer-logo">
            <span class="logo-box">Au</span>
            <div>
              <div class="brand-name">GOLD MONITOR · 黄金量化投研终端</div>
              <div class="brand-tagline">全天候全球黄金现货、多因子量化推演与跨市套利监控系统</div>
            </div>
          </div>

          <div class="dev-pills">
            <a
              href="https://github.com/1837620622/Gold-Price-Quantitative-Monitoring-System"
              target="_blank"
              rel="noopener noreferrer"
              class="dev-pill"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>GitHub 开源仓库</span>
            </a>

            <a
              href="https://www.chuankangkk.top"
              target="_blank"
              rel="noopener noreferrer"
              class="dev-pill"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>官网 chuankangkk.top</span>
            </a>

            <a
              href="/plume.html"
              target="_blank"
              class="dev-pill"
              title="查看 PLUME 极简工艺与原生粘性滚动实现"
            >
              <span style="color: var(--gold-3)">✦</span>
              <span>PLUME 极致工艺</span>
            </a>

            <span class="dev-pill static">
              <span>微信: 1837620622</span>
            </span>

            <span class="dev-pill static">
              <span>B站 / 咸鱼: 万能程序员</span>
            </span>
          </div>
        </div>

        <div class="footer-notes">
          <p class="disclaimer">
            <b>免责声明</b>：本系统基于上海黄金交易所、伦敦金做市商连续报价及欧洲央行基准汇率等公开信源进行程序化量化推演。所有量化信号、多空评分、回测指标及 AI 分析报告仅供量化模型研究与学术交流参考，不构成任何实质性投资建议或操盘指令。贵金属杠杆与现货投资具备高波动性，投资有风险，决策需独立审慎。
          </p>
          <div class="sources-list">
            <span>信源审计：上海黄金交易所 · 东方财富 · 新浪财经 · 瑞士银行 Swissquote · gold-api.com · Frankfurter ECB · Cloudflare Workers AI</span>
          </div>
          <div class="copyright-row">
            <span>© 2026 GOLD MONITOR. All rights reserved. Designed for Institutional Quantitative Research.</span>
            <span>Developed by 传康KK</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 浮动返回顶部按钮 -->
    <transition name="fade">
      <button
        v-if="showBackTop"
        type="button"
        class="back-to-top-btn"
        title="返回顶部"
        @click="scrollToTop"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    </transition>
  </footer>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

defineProps({
  latency: { type: Number, default: 52 },
});

const showBackTop = ref(false);

function handleScroll() {
  if (typeof window !== 'undefined') {
    const ws = document.getElementById('workspace');
    if (ws) {
      const rect = ws.getBoundingClientRect();
      showBackTop.value = rect.top <= 160;
    } else {
      showBackTop.value = window.scrollY > 1500;
    }
  }
}

function scrollToTop() {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleScroll);
  }
});
</script>

<style scoped>
.app-footer {
  margin-top: 56px;
  padding: 0 0 48px;
  position: relative;
  border-top: 1px solid rgba(232, 199, 125, 0.14);
  background: var(--surface-card);
}

/* 顶部金融终端系统状态微条 */
.terminal-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  margin: -1px 0 24px;
  background: var(--surface-card);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0 0 12px 12px;
  font-family: var(--mono);
  font-size: 11px;
  gap: 16px;
  flex-wrap: wrap;
}

.status-col {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.live-pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--down);
  animation: pulse-ring 2s infinite;
}

.indicator-title {
  color: var(--text);
  font-weight: 700;
}

.indicator-sub {
  color: var(--text-3);
  font-size: 10px;
}

.status-metric {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.metric-label {
  color: var(--text-3);
}

.metric-val {
  color: var(--text-2);
  font-weight: 600;
}
.metric-val.gold {
  color: var(--gold-3);
  font-weight: 800;
}

.engine-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(232, 199, 125, 0.08);
  border: 1px solid rgba(232, 199, 125, 0.25);
  color: var(--gold-3);
  font-size: 11px;
}

.engine-spark {
  color: var(--gold);
}

/* 底部主体卡片 */
.footer-main-card {
  padding: 28px;
  border-radius: 16px;
  background: var(--surface-card);
  border: 1px solid rgba(232, 199, 125, 0.15);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
}

.footer-brand-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 22px;
  flex-wrap: wrap;
  gap: 16px;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-box {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  font-family: var(--mono);
  font-weight: 900;
  font-size: 17px;
  color: var(--gold-ink);
  background: var(--gold);
}

.brand-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: 0.04em;
}

.brand-tagline {
  font-size: 11px;
  color: var(--text-2);
  margin-top: 3px;
}

.dev-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dev-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-family: var(--mono);
  text-decoration: none;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-2);
  transition: all 0.2s ease;
}
.dev-pill:hover:not(.static) {
  background: rgba(232, 199, 125, 0.12);
  border-color: var(--gold-2);
  color: var(--gold-3);
}
.dev-pill.static {
  cursor: default;
}

.footer-notes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-3);
}

.disclaimer b {
  color: var(--gold-3);
}

.sources-list {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-3);
  font-size: 10px;
}

.copyright-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

/* 浮动返回顶部按钮 */
.back-to-top-btn {
  position: fixed;
  bottom: 28px;
  left: 28px;
  z-index: 50;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(20, 24, 36, 0.9);
  border: 1px solid rgba(232, 199, 125, 0.35);
  color: var(--gold-3);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(8px);
}
.back-to-top-btn:hover {
  background: var(--gold-btn);
  color: var(--gold-ink);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 768px) {
  .terminal-status-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  .status-col {
    width: 100%;
    justify-content: space-between;
  }
  .back-to-top-btn {
    bottom: 20px;
    left: 16px;
  }
}
</style>
