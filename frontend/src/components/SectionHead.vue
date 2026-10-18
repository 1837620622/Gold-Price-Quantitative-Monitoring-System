<template>
  <header class="section-head">
    <div class="section-head-main">
      <p class="section-kicker">
        <span class="section-index">{{ index }}</span>
        <span class="section-total">/ {{ total }}</span>
        <span class="section-tag">{{ tag }}</span>
      </p>
      <h2 :id="titleId" class="section-title display">{{ title }}</h2>
    </div>
    <p v-if="sub" class="section-sub">{{ sub }}</p>
    <div v-if="$slots.default" class="section-actions">
      <slot />
    </div>
    <GoldRule class="section-rule" />
  </header>
</template>

<script setup>
import GoldRule from './brand/GoldRule.vue';

defineProps({
  index: { type: String, required: true },
  total: { type: String, default: '05' },
  tag: { type: String, default: '' },
  title: { type: String, required: true },
  titleId: { type: String, default: '' },
  sub: { type: String, default: '' },
});
</script>

<style scoped>
.section-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 14px 24px;
  margin-bottom: clamp(24px, 3vw, 36px);
}

.section-head-main {
  grid-column: 1 / -1;
  min-width: 0;
}

/* 标签行：英文小字大写加字距；序号与总数用等宽数字，标签文字用界面字体 */
.section-kicker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-family: var(--font);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
}

.section-index,
.section-total {
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
}

.section-index {
  color: var(--gold);
}

.section-tag {
  color: var(--text-2);
  word-break: keep-all;
}

/* 区块标题：衬线展示字，保持原大小写，不用大写与重字距 */
.section-title {
  font-family: var(--font-display);
  font-size: clamp(40px, 4.6vw, 64px);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--text);
  word-break: keep-all;
  overflow-wrap: break-word;
}

.section-sub {
  max-width: 46ch;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-2);
}

.section-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-self: end;
}

/* 标题与内容之间的金线分隔，横跨整行 */
.section-rule {
  grid-column: 1 / -1;
}

/* 中文界面：标签不大写、不加字距；标题行高 1.25，说明行高 1.75 */
:lang(zh) .section-kicker {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

:lang(zh) .section-title {
  line-height: 1.25;
  letter-spacing: 0;
}

:lang(zh) .section-sub {
  line-height: 1.75;
}

/* 手机：标题 34–40px，分区节奏收紧 */
@media (max-width: 767px) {
  .section-head {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }

  .section-kicker {
    margin-bottom: 8px;
  }

  .section-title {
    font-size: clamp(34px, 10vw, 40px);
    line-height: 1.12;
  }

  .section-actions {
    justify-self: start;
  }
}
</style>
