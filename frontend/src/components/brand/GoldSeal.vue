<template>
  <svg
    class="gold-seal"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    :role="label ? 'img' : null"
    :aria-label="label || null"
    :aria-hidden="label ? null : 'true'"
  >
    <defs>
      <linearGradient :id="gid" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" style="stop-color: var(--gold-3)" />
        <stop offset="0.55" style="stop-color: var(--gold)" />
        <stop offset="1" style="stop-color: var(--gold-2)" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30.5" fill="none" :stroke="`url(#${gid})`" stroke-width="1" />
    <circle cx="32" cy="32" r="27.5" fill="none" :stroke="`url(#${gid})`" stroke-width="0.5" />
    <path :d="ROSETTE" fill="none" :stroke="`url(#${gid})`" stroke-width="0.45" />
    <text x="32" y="36.5" text-anchor="middle" class="gold-seal-mark" :fill="`url(#${gid})`">AU</text>
  </svg>
</template>

<script setup>
/**
 * 品牌印章：双圈细线 + 等距波纹（模拟钞票防伪的雕刻纹），中心为 AU 字标。
 * 金色只做线条与字标，渐变仅用于印章本身，界面其它地方不用金色渐变填充。
 */
defineProps({
  size: { type: [Number, String], default: 36 },
  label: { type: String, default: '' },
});

const gid = `gold-seal-${Math.random().toString(36).slice(2, 8)}`;

// 把波纹环预先算成一条 path，避免每次渲染都重算
const ROSETTE = (() => {
  const cx = 32;
  const cy = 32;
  const r = 23.5;
  const amp = 1.6;
  const waves = 48;
  const steps = 360;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r + amp * Math.sin(a * waves);
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')}Z`;
})();
</script>

<style scoped>
.gold-seal {
  display: block;
  flex-shrink: 0;
}

.gold-seal-mark {
  font-family: var(--font-serif, Georgia, 'Times New Roman', serif);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.04em;
}
</style>
