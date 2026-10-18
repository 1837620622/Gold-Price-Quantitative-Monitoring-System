<template>
  <div class="lang-toggle" role="group" :aria-label="t('langToggle.label')">
    <button
      v-for="opt in OPTIONS"
      :key="opt.code"
      type="button"
      class="lang-toggle-btn"
      :class="{ 'is-on': locale === opt.code }"
      :lang="opt.lang"
      :aria-pressed="locale === opt.code ? 'true' : 'false'"
      :title="opt.title"
      @click="setLocale(opt.code)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup>
/**
 * 中文 / EN 直接切换。按钮用各语言的母语写法，不用国旗（国旗代表国家，不代表语言）。
 * 选择会写入本地存储，之后优先于 IP 推断的默认语言。
 */
import { useI18n } from '../i18n';

const { t, locale, setLocale } = useI18n();

const OPTIONS = [
  { code: 'zh', label: '中文', title: '简体中文', lang: 'zh-CN' },
  { code: 'en', label: 'EN', title: 'English', lang: 'en' },
];
</script>

<style scoped>
.lang-toggle {
  display: inline-flex;
  align-items: stretch;
  height: 34px;
  padding: 2px;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
}

.lang-toggle-btn {
  min-width: 44px;
  padding: 0 10px;
  border: 0;
  border-radius: 1px;
  background: transparent;
  color: var(--text-2);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  line-height: 1;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}

.lang-toggle-btn:hover {
  color: var(--text);
}

.lang-toggle-btn.is-on {
  color: var(--text);
  background: color-mix(in srgb, var(--gold) 16%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 70%, transparent);
}

.lang-toggle-btn:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

@media (max-width: 767px) {
  .lang-toggle {
    height: 40px;
  }

  .lang-toggle-btn {
    min-width: 48px;
    font-size: 13px;
  }
}
</style>
