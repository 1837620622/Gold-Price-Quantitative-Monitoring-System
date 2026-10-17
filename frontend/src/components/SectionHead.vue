<template>
  <header class="section-head">
    <div class="section-head-main">
      <p class="label section-kicker">
        <span class="section-index">{{ index }}</span>
        <span>/ {{ total }}</span>
        <span class="section-tag">{{ tag }}</span>
      </p>
      <h2 :id="titleId" class="section-title display">
        <span class="mask"><span>{{ title }}</span></span>
      </h2>
    </div>
    <p v-if="sub" class="section-sub" data-reveal-item>{{ sub }}</p>
    <div v-if="$slots.default" class="section-actions" data-reveal-item>
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
}

.section-title {
  font-size: clamp(56px, 9.4vw, 148px);
  color: var(--text);
  overflow-wrap: anywhere;
}

/* 遮罩入场：文字只在遮罩内上移，遮罩外不可见 */
.mask {
  display: block;
  overflow: hidden;
  padding-bottom: 0.04em;
}

.mask > span {
  display: block;
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

@media (max-width: 767px) {
  .section-head {
    grid-template-columns: minmax(0, 1fr);
  }

  .section-actions {
    justify-self: start;
  }
}
</style>
