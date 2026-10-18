<template>
  <svg
    class="icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="square"
    stroke-linejoin="miter"
    aria-hidden="true"
    focusable="false"
    v-html="PATHS[name] || ''"
  />
</template>

<script setup>
/**
 * 统一线性图标：1.5px 描边、方端点、尖角连接，全部用 currentColor 取色。
 * 替代界面里的 emoji 与符号字形（✦ ⚠ ✓ 等），保证日夜主题下的粗细一致。
 */
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
});

const PATHS = {
  volume: '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.3 6.5a7.5 7.5 0 0 1 0 11"/>',
  'volume-off': '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  bell: '<path d="M6 16.5v-5.2a6 6 0 0 1 12 0v5.2l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  calculator: '<rect x="5" y="3.5" width="14" height="17" rx="1"/><path d="M8.5 7.5h7M8.5 11.5h1.5M11.25 11.5h1.5M14 11.5h1.5M8.5 15.5h1.5M11.25 15.5h1.5M14 15.5h1.5"/>',
  poster: '<rect x="5" y="3.5" width="14" height="17" rx="1"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5V9H15"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/>',
  moon: '<path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.3 4.3L19 7.5"/>',
  alert: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  scale: '<path d="M12 4v15.5M7.5 19.5h9M4.5 7.5h15"/><path d="M4.5 7.5l-2.6 6.2a2.6 2.6 0 0 0 5.2 0zM19.5 7.5l-2.6 6.2a2.6 2.6 0 0 0 5.2 0z"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-4M11.5 16V8M16 16v-6"/>',
  shield: '<path d="M12 3.5l7.5 2.8v5.6c0 4.4-3.1 7.9-7.5 8.8-4.4-.9-7.5-4.4-7.5-8.8V6.3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.5 3.4 5.3 3.4 8.5s-1.1 6-3.4 8.5c-2.3-2.5-3.4-5.3-3.4-8.5S9.7 6 12 3.5z"/>',
  'arrow-up-right': '<path d="M7 17L17 7M9 7h8v8"/>',
  'chevron-up': '<path d="M6 14.5l6-6 6 6"/>',
  ingot: '<path d="M3.5 17.5l2.6-7h11.8l2.6 7z"/><path d="M6.1 10.5L8.5 6.5h7l2.4 4"/>',
  external: '<path d="M14 4.5h5.5V10M19.5 4.5L11 13"/><path d="M17 14v5.5H5V7.5h5.5"/>',
};
</script>

<style scoped>
.icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
</style>
