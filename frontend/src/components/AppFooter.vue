<template>
  <footer class="app-footer">
    <div class="container">
      <p class="disclaimer">
        本站为量化研究与行情监控工具，所有信号、回测与 AI 分析均为程序计算或模型生成的参考结果，不构成任何投资建议。投资有风险，入市需谨慎。
      </p>
      <p class="sources">
        数据来源：国际现货 gold-api.com · 国际报价校验与备用日K Yahoo Finance · 历史日K与汇率 Stooq · 汇率 open.er-api.com / Frankfurter(ECB) · 国内 AU9999 东方财富
      </p>
      <p class="credit">
        开发者：传康KK · 咸鱼 / B站：万能程序员 · Vx：1837620622 ·
        <a href="https://github.com/1837620622" target="_blank" rel="noopener noreferrer">GitHub</a> ·
        <a href="https://www.chuankangkk.top" target="_blank" rel="noopener noreferrer">www.chuankangkk.top</a>
      </p>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  margin-top: 48px;
  padding: 28px 0 40px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.8;
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
</style>
