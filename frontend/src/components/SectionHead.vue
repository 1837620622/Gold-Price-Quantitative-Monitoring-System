<template>
  <header class="section-head">
    <div class="section-head-main">
      <p class="label section-kicker">
        <span class="section-index">{{ index }}</span>
        <span>/ {{ total }}</span>
        <span class="section-tag">{{ tag }}</span>
      </p>
      <h2 :id="titleId" class="section-title display">{{ title }}</h2>
    </div>
    <p v-if="sub" class="section-sub">{{ sub }}</p>
    <div v-if="$slots.default" class="section-actions">
      <slot />
    </div>
  </header>
</template>

<script setup>
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

.section-kicker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.section-index {
  color: var(--gold);
}

.section-tag {
  color: var(--text-2);
  word-break: keep-all;
}

.section-title {
  font-size: clamp(34px, 4.6vw, 68px);
  color: var(--text);
  word-break: keep-all;
  overflow-wrap: break-word;
  letter-spacing: 0.01em;
  line-height: 1.05;
}

/* 中文界面：Anton 不含中文字形，标题改用中文字体。
   注意：:global(html:lang(zh)) .x 会被编译成裸的 html:lang(zh)，丢掉后代选择器，故改用 :lang(zh) .x */
:lang(zh) .section-title {
  font-family: var(--font);
  text-transform: none;
}

.section-sub {
  max-width: 46ch;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-2);
}

.section-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-self: end;
}

/* 手机：标题 34–40px，分区节奏收紧，说明文字 14px */
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
    font-weight: 500;
    line-height: 1.12;
  }

  .section-actions {
    justify-self: start;
  }
}
</style>
