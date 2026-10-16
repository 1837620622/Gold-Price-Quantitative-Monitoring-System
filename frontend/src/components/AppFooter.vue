<template>
  <footer class="app-footer">
    <div class="container">
      <div class="terminal-status-bar">
        <div class="status-left">
          <span class="status-item">
            <span class="status-dot"></span>
            API 已连接
          </span>
          <span class="status-item">延迟: {{ latency || 68 }}ms</span>
        </div>
        <div class="status-center">
          Gold Monitor v3.2 | Powered by Cloudflare Workers AI & DeepSeek-R1
        </div>
        <div class="status-right">
          <span>Vx: 1837620622</span>
          <span>万能程序员</span>
        </div>
      </div>

      <p class="disclaimer">
        本站为量化研究与行情监控工具，所有信号、回测与 AI 分析均为程序计算或模型生成的参考结果，不构成任何投资建议。投资有风险，入市需谨慎。
      </p>
      <p class="sources">
        数据来源：新浪财经 · 瑞士银行 Swissquote · gold-api.com · 东方财富 · open.er-api.com · Cloudflare Workers AI
      </p>
      <p class="credit">
        开发者：传康KK · 咸鱼 / B站：万能程序员 · Vx：1837620622 ·
        <a href="https://github.com/1837620622" target="_blank" rel="noopener noreferrer">GitHub</a> ·
        <a href="https://www.chuankangkk.top" target="_blank" rel="noopener noreferrer">www.chuankangkk.top</a>
      </p>
    </div>

    <!-- 全屏防伪水印 -->
    <div class="watermark-container" aria-hidden="true">
      <div class="watermark-content">
        <div class="watermark-item" v-for="n in 16" :key="n">
          <span>GitHub: 万能程序员</span>
          <span>github.com/1837620622</span>
          <span>官网: www.chuankangkk.top</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
defineProps({
  latency: { type: Number, default: 68 },
});
</script>

<style scoped>
.app-footer {
  margin-top: 48px;
  padding: 24px 0 40px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.8;
  position: relative;
}

.terminal-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 18px;
  margin-bottom: 20px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 12px;
  font-family: var(--mono);
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--down);
  animation: pulse-ring 2s infinite;
}

.status-center {
  color: var(--gold);
  font-weight: 700;
  letter-spacing: 0.5px;
}

.app-footer p {
  margin: 0 0 6px;
}

.disclaimer {
  color: var(--text-2);
}

.credit a {
  color: var(--text-2);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.credit a:hover {
  color: var(--gold);
}

.watermark-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  opacity: 0.035;
}

.watermark-content {
  position: absolute;
  top: -40%;
  left: -40%;
  width: 180%;
  height: 180%;
  display: flex;
  flex-wrap: wrap;
  transform: rotate(-25deg);
  justify-content: space-around;
  align-content: space-around;
}

.watermark-item {
  width: 280px;
  height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--gold);
  font-weight: 700;
  gap: 4px;
}
</style>
