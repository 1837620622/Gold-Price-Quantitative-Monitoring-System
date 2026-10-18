<template>
  <div class="prefs" role="group" :aria-label="t('prefs.group')">
    <div class="pref">
      <span class="pref-label">{{ t('prefs.theme') }}</span>
      <div class="seg" role="radiogroup" :aria-label="t('prefs.theme')">
        <button
          v-for="m in modes"
          :key="m"
          type="button"
          role="radio"
          :aria-checked="mode === m ? 'true' : 'false'"
          :class="{ active: mode === m }"
          @click="setMode(m)"
        >
          {{ t(`prefs.${m}`) }}
        </button>
      </div>
    </div>

    <p class="prefs-now" aria-live="polite">{{ nowText }}</p>
  </div>
</template>

<script setup>
/**
 * 显示偏好面板：只保留主题单选（自动 / 日间 / 夜间）。
 * 语言切换已常驻在页头的 LangToggle 中，这里不再重复。
 */
import { computed } from 'vue';
import { useTheme } from '../composables/useTheme';
import { useI18n } from '../i18n';
import { geo } from '../lib/geo';

const { t } = useI18n();
const { mode, modes, resolved, setMode } = useTheme();

const basis = computed(() => {
  if (mode.value !== 'auto') return t('prefs.basisManual');
  const info = geo.value;
  return info && Number.isFinite(info.latitude) ? t('prefs.basisSun') : t('prefs.basisClock');
});

const nowText = computed(() =>
  t('prefs.now', {
    theme: resolved.value === 'light' ? t('prefs.day') : t('prefs.night'),
    basis: basis.value,
  })
);
</script>

<style scoped>
.prefs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pref {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pref-label {
  flex: none;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-2);
  white-space: nowrap;
}

/* 英文标签：11px 大写，字距 .14em；中文标签不大写、不加字距 */
:lang(en) .pref-label {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.pref .seg {
  gap: 2px;
  padding: 2px;
  border-radius: var(--radius);
}

.pref .seg button {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 2px;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.prefs-now {
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

/* 手机：标签在上，分段控件铺满面板宽度，每个选项 44px 高 */
@media (max-width: 767px) {
  .prefs {
    gap: 14px;
  }

  .pref {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .pref .seg {
    display: flex;
  }

  .pref .seg button {
    flex: 1 1 0;
    min-width: 0;
    min-height: 44px;
    padding: 0 8px;
  }
}
</style>
