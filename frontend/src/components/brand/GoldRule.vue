<template>
  <div ref="rootEl" class="gold-rule" :class="{ 'is-drawn': drawn }" aria-hidden="true">
    <svg class="gold-rule-line" viewBox="0 0 100 2" preserveAspectRatio="none">
      <line x1="0" y1="1" x2="100" y2="1" pathLength="1" style="stroke: var(--gold)" vector-effect="non-scaling-stroke" />
    </svg>
    <svg class="gold-rule-mark" viewBox="0 0 9 9">
      <path d="M4.5 0.5L8.5 4.5L4.5 8.5L0.5 4.5Z" style="fill: var(--gold)" />
    </svg>
  </div>
</template>

<script setup>
/**
 * 金色细线分隔：中央一枚菱形，首次进入视口时线条描绘一次（之后静止）。
 * 减少动态效果时直接显示，不做描绘动画。
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';

const rootEl = ref(null);
const drawn = ref(false);
let observer = null;

onMounted(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    drawn.value = true;
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        drawn.value = true;
        observer.disconnect();
      }
    },
    { threshold: 0.6 }
  );
  observer.observe(rootEl.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<style scoped>
.gold-rule {
  position: relative;
  height: 9px;
  width: 100%;
}

.gold-rule-line {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.gold-rule-line line {
  fill: none;
  stroke-width: 1;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0.55;
}

.gold-rule.is-drawn .gold-rule-line line {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 1.1s var(--ease-out);
}

.gold-rule-mark {
  position: absolute;
  left: 50%;
  top: 0;
  width: 9px;
  height: 9px;
  margin-left: -4.5px;
  opacity: 0;
  transition: opacity var(--dur) var(--ease-out) 0.6s;
}

.gold-rule.is-drawn .gold-rule-mark {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .gold-rule-line line,
  .gold-rule.is-drawn .gold-rule-line line,
  .gold-rule-mark,
  .gold-rule.is-drawn .gold-rule-mark {
    transition: none;
  }

  .gold-rule-line line {
    stroke-dashoffset: 0;
  }

  .gold-rule-mark {
    opacity: 1;
  }
}
</style>
