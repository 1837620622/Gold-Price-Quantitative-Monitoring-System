<template>
  <header class="top-header">
    <div class="container header-inner">
      <!-- 左侧：品牌 Logo + 实时状态 -->
      <div class="header-left">
        <div class="logo">
          <span class="logo-symbol">Au</span>
          <div class="logo-info">
            <span class="logo-text">GOLD MONITOR</span>
            <span class="logo-sub">专业金融量化终端</span>
          </div>
        </div>

        <div class="market-status" :class="`status-${status}`">
          <span class="status-dot"></span>
          <span class="status-text">{{ label }}</span>
        </div>
      </div>

      <!-- 中间：高精度数字终端时钟 -->
      <div class="header-center">
        <div class="clock-display">
          <svg class="clock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="clock-time">{{ clock }}</span>
          <span v-if="ageText" class="clock-age">{{ ageText }}</span>
        </div>
      </div>

      <!-- 右侧：快捷操作区 -->
      <div class="header-right">
        <!-- 数据源健康度 -->
        <button
          type="button"
          class="sources-pill"
          :class="sourcesHealthy ? 'ok' : 'warn'"
          title="查看数据源连接与交叉校验"
          @click="$emit('sources')"
        >
          <span class="sources-dot"></span>
          <span class="sources-text">数据源 {{ sourcesOk }}/{{ sourcesTotal }}</span>
        </button>

        <!-- 黄金计算器快捷键 -->
        <button
          type="button"
          class="icon-btn"
          title="黄金投资盈亏与变现计算器"
          @click="$emit('calc')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="2" width="16" height="20" rx="2"></rect>
            <line x1="8" y1="6" x2="16" y2="6"></line>
            <line x1="16" y1="14" x2="16" y2="18"></line>
            <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"></path>
          </svg>
        </button>

        <!-- 海报卡片分享 -->
        <button
          type="button"
          class="icon-btn"
          title="生成并分享精美量化研报海报"
          @click="$emit('poster')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        </button>

        <!-- 一键复制快报 -->
        <button
          type="button"
          class="icon-btn"
          :class="{ copied }"
          :title="copied ? '快报已复制到剪贴板！' : '一键复制行情与信号快报'"
          @click="copySnapshot"
        >
          <svg v-if="!copied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--down)">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>

        <!-- 主题切换 -->
        <button
          type="button"
          class="icon-btn"
          :title="theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'"
          @click="$emit('toggle-theme')"
        >
          <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>

        <!-- 刷新数据 -->
        <button
          type="button"
          class="icon-btn refresh-btn"
          :class="{ spinning: status === 'loading' }"
          title="立即刷新行情数据"
          @click="$emit('refresh')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-2.6-6.4" />
            <path d="M21 4v5h-5" />
          </svg>
        </button>

        <!-- 订阅推送主按钮 -->
        <button
          type="button"
          class="btn btn-primary btn-sm subscribe-btn"
          @click="$emit('subscribe')"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <span>订阅推送</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue';
import { fmtClock, fmtAgo, fmtDateTime, fmtNumber, fmtSigned } from '../format';

const props = defineProps({
  status: { type: String, default: 'loading' },
  theme: { type: String, default: 'dark' },
  ageSeconds: { type: Number, default: null },
  now: { type: Number, default: () => Date.now() },
  sourcesOk: { type: Number, default: 0 },
  sourcesTotal: { type: Number, default: 0 },
  snapshot: { type: Object, default: null },
  quant: { type: Object, default: null },
});

defineEmits(['refresh', 'subscribe', 'toggle-theme', 'sources', 'poster', 'calc']);

const copied = ref(false);

function copySnapshot() {
  const dom = props.snapshot?.domestic;
  const intl = props.snapshot?.international;
  const prem = props.snapshot?.premiumPercent;
  const ratio = props.snapshot?.ratio?.current || (intl?.price && intl?.silverPrice ? (intl.price / intl.silverPrice).toFixed(1) : null);
  const sig = props.quant?.signal;
  const time = fmtDateTime(props.now);

  const lines = [
    `【黄金量化监控快报】`,
    `⏰ 时间: ${time}`,
    dom ? `🇨🇳 国内 AU9999: ¥${fmtNumber(dom.price)} (${fmtSigned(dom.changePercent)}%)` : null,
    intl ? `🌍 国际 XAU/USD: $${fmtNumber(intl.price)} (${fmtSigned(intl.changePercent)}%)` : null,
    intl?.silverPrice ? `🪙 国际白银 XAG: $${fmtNumber(intl.silverPrice)}` : null,
    prem != null ? `⚖️ 国内溢价: ${fmtSigned(prem)}%` : null,
    ratio ? `📈 金银比率: ${ratio}` : null,
    sig ? `🎯 量化信号: ${sig.label} (评分 ${sig.score > 0 ? '+' : ''}${sig.score?.toFixed(1)}, 置信度 ${sig.confidence}%)` : null,
    `🔗 监控终端: https://gold.chuankangkk.top`,
  ].filter(Boolean);

  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      copied.value = true;
      setTimeout(() => { copied.value = false; }, 2500);
    });
  }
}

const LABELS = {
  loading: '连接中…',
  live: '实时行情',
  partial: '部分在线',
  stale: '数据延迟',
  error: '接口故障',
};

const label = computed(() => LABELS[props.status] ?? '实时行情');
const clock = computed(() => fmtClock(props.now));
const ageText = computed(() => fmtAgo(props.ageSeconds));
const sourcesHealthy = computed(() => props.sourcesTotal > 0 && props.sourcesOk === props.sourcesTotal);
</script>

<style scoped>
.top-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(10, 12, 18, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  gap: 16px;
}

/* 左侧 Logo */
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.logo-symbol {
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #fef08a 0%, #fbbf24 50%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.4));
  font-family: var(--mono);
}

.logo-info {
  display: flex;
  flex-direction: column;
}

.logo-text {
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2px;
  line-height: 1.2;
}

.logo-sub {
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.5px;
}

.market-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  font-size: 12px;
  font-weight: 600;
  color: var(--down);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--down);
  animation: pulse-ring 2s infinite;
}

.market-status.status-loading {
  background: rgba(96, 165, 250, 0.08);
  border-color: rgba(96, 165, 250, 0.25);
  color: var(--info);
}
.market-status.status-loading .status-dot { background: var(--info); }

.market-status.status-partial,
.market-status.status-stale {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.25);
  color: var(--warn);
}
.market-status.status-partial .status-dot,
.market-status.status-stale .status-dot { background: var(--warn); }

.market-status.status-error {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.25);
  color: var(--danger);
}
.market-status.status-error .status-dot { background: var(--danger); }

/* 中间时钟 */
.header-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.clock-display {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.15);
  font-family: var(--mono);
  font-size: 13px;
  color: var(--gold);
}

.clock-icon {
  color: var(--gold);
  opacity: 0.85;
}

.clock-age {
  font-size: 11px;
  color: var(--text-3);
}
.clock-age::before {
  content: '·';
  margin-right: 6px;
}

/* 右侧操作区 */
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sources-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sources-pill:hover {
  border-color: var(--gold);
  color: #fff;
}

.sources-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--down);
}

.sources-pill.warn .sources-dot {
  background: var(--warn);
}

.subscribe-btn {
  box-shadow: 0 4px 14px rgba(251, 191, 36, 0.35);
}

.spinning svg {
  animation: spin 0.8s linear infinite;
}

@media (max-width: 960px) {
  .logo-sub {
    display: none;
  }
}

@media (max-width: 820px) {
  .header-center {
    display: none;
  }
}

@media (max-width: 640px) {
  .market-status {
    display: none;
  }
  .subscribe-btn span {
    display: none;
  }
  .subscribe-btn {
    padding: 0 10px;
  }
}
</style>
