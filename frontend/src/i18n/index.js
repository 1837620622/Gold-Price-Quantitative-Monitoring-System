/**
 * ============================================================
 * 中英文：语言默认由访客位置（IP 国家）决定，手动切换后记住选择
 * 文案按命名空间放在 i18n/namespaces/*.js，每个文件导出 { zh, en }
 * 组件中使用 t('命名空间.键')；后端返回的中文标签用 tLabel() 查表
 * ============================================================
 */

import { ref, watch } from 'vue';
import { geo } from '../lib/geo';

export const LOCALES = ['zh', 'en'];

const LOCALE_KEY = 'gold-monitor-locale';
// 港澳台与新加坡以中文为默认，其余国家/地区默认英文
const CHINESE_REGIONS = new Set(['CN', 'HK', 'MO', 'TW', 'SG']);

const modules = import.meta.glob('./namespaces/*.js', { eager: true });
const messages = { zh: {}, en: {} };
for (const mod of Object.values(modules)) {
  const dict = mod.default ?? mod;
  for (const lang of LOCALES) Object.assign(messages[lang], dict[lang] ?? {});
}

function readStored() {
  try {
    const value = localStorage.getItem(LOCALE_KEY);
    return LOCALES.includes(value) ? value : null;
  } catch {
    return null;
  }
}

// 优先使用访客国家；没有位置信息时看浏览器语言
export function guessLocale(info) {
  if (info?.country) return CHINESE_REGIONS.has(info.country) ? 'zh' : 'en';
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

const stored = ref(readStored());
export const locale = ref(stored.value ?? guessLocale(geo.value));

// 位置信息晚于首屏到达时，若用户没有手动选择，则更新默认语言
watch(geo, (info) => {
  if (!stored.value) locale.value = guessLocale(info);
});

export function setLocale(next) {
  if (!LOCALES.includes(next)) return;
  stored.value = next;
  locale.value = next;
  try {
    localStorage.setItem(LOCALE_KEY, next);
  } catch {
    // 忽略存储错误
  }
}

// t('ns.key', { name })：缺失的英文文案回退到中文，再缺失则显示键名
export function t(key, vars) {
  const dict = messages[locale.value] ?? messages.zh;
  let text = dict[key] ?? messages.zh[key] ?? key;
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
  }
  return text;
}

// 后端返回的中文标签（评分等级、指标名、状态等）：英文界面查表，缺失时原样显示
export function tLabel(text) {
  if (typeof text !== 'string' || !text) return text ?? '';
  if (locale.value === 'zh') return text;
  return messages.en[`label.${text}`] ?? text;
}

// 后端给出的中英文字段对：tField(item, 'reason') 在英文界面取 item.reasonEn，缺失时回退到 item.reason
export function tField(item, key) {
  if (!item) return '';
  const value = locale.value === 'en' ? item[`${key}En`] ?? item[key] : item[key];
  return value ?? '';
}

let documentBound = false;

// 同步 <html lang>、页面标题与 meta description；在组件中调用一次即可
export function useI18n() {
  if (!documentBound) {
    documentBound = true;
    watch(
      locale,
      (value) => {
        document.documentElement.lang = value === 'zh' ? 'zh-CN' : 'en';
        document.title = t('app.title');
        // index.html 中的中文 description 作为无 JS 时的回退，这里按当前语言覆盖
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.content = t('app.description');
      },
      { immediate: true }
    );
  }
  return { t, tLabel, locale, setLocale, LOCALES };
}
