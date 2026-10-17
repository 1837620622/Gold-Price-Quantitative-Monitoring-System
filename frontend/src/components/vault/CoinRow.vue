<template>
  <section class="coin-row" aria-label="提醒金币（占位，3D 实现中）"></section>
</template>

<script setup>
// 占位组件：由金币物理实现替换，接口保持不变
defineProps({
  labels: { type: Array, default: () => [] },
});
defineEmits(['select']);
</script>

<style scoped>
.coin-row {
  min-height: 120px;
}
</style>
