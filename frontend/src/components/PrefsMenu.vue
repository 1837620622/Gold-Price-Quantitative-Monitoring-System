<template>
  <div class="prefs" role="group" :aria-label="t('prefs.group')">
    <div class="pref">
      <span class="label pref-label">{{ t('prefs.theme') }}</span>
      <div class="seg seg-sm" role="radiogroup" :aria-label="t('prefs.theme')">
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

    <div class="pref">
      <span class="label pref-label">{{ t('prefs.language') }}</span>
      <div class="seg seg-sm" role="radiogroup" :aria-label="t('prefs.language')">
        <button
          type="button"
          role="radio"
          :aria-checked="locale === 'zh' ? 'true' : 'false'"
          :class="{ active: locale === 'zh' }"
          @click="setLocale('zh')"
        >
          {{ t('prefs.zh') }}
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="locale === 'en' ? 'true' : 'false'"
          :class="{ active: locale === 'en' }"
          @click="setLocale('en')"
        >
          EN
        </button>
      </div>
    </div>

    <p class="label prefs-now" aria-live="polite">{{ nowText }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTheme } from '../composables/useTheme';
import { useI18n } from '../i18n';
import { geo } from '../lib/geo';

const { t, locale, setLocale } = useI18n();
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
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 20px;
}

.pref {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pref-label {
  flex: none;
  color: var(--text-3);
  white-space: nowrap;
}

.prefs-now {
  flex-basis: 100%;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-3);
}

@media (min-width: 768px) {
  .prefs-now {
    flex-basis: auto;
  }
}

/* 手机：标签在上，分段控件铺满面板宽度，每个选项 44px 高，面板不会超出 390px 视口 */
@media (max-width: 767px) {
  .prefs {
    gap: 14px;
  }

  .pref {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    width: 100%;
  }

  .pref-label {
    font-size: 12px;
  }

  .pref .seg {
    display: flex;
    width: 100%;
  }

  .pref .seg button {
    flex: 1 1 0;
    min-width: 0;
    min-height: 44px;
    padding: 0 8px;
    font-size: 13px;
  }

  .prefs-now {
    font-size: 12px;
    line-height: 1.6;
  }
}
</style>
