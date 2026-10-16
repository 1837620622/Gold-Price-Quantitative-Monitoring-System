<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="subscribe-title">
        <button
          ref="closeBtn"
          type="button"
          class="icon-btn modal-close"
          aria-label="关闭"
          @click="$emit('close')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h2 id="subscribe-title" class="modal-title">订阅金价推送</h2>
        <p class="modal-desc">扫码加入微信群组，实时接收行情与预警</p>

        <div class="qr-wrap">
          <img src="/qrcode.png" alt="订阅二维码" width="200" height="200" class="qr" />
        </div>

        <ul class="features">
          <li><span class="feature-dot"></span>每 30 分钟推送一次实时行情</li>
          <li><span class="feature-dot"></span>国内金价涨跌幅达 1% 立即预警</li>
          <li><span class="feature-dot"></span>附带 AI 智能分析摘要</li>
        </ul>

        <p class="modal-foot">二维码有效期：30 天。长按图片或点击下方按钮保存后，用微信扫一扫加入。</p>
        <a class="btn btn-primary modal-save" href="/qrcode.png" download="金价推送订阅二维码.png">保存二维码</a>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const closeBtn = ref(null);

function onKeydown(event) {
  if (event.key === 'Escape') emit('close');
}

function lockScroll(locked) {
  document.body.style.overflow = locked ? 'hidden' : '';
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown);
      lockScroll(true);
      await nextTick();
      closeBtn.value?.focus();
    } else {
      document.removeEventListener('keydown', onKeydown);
      lockScroll(false);
    }
  }
);

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  lockScroll(false);
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(5, 6, 9, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: fade-in 0.2s ease-out;
}

.modal {
  position: relative;
  width: min(400px, 100%);
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 28px 24px 24px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.55);
  text-align: center;
  animation: rise 0.25s ease-out;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.modal-desc {
  margin: 6px 0 18px;
  font-size: 14px;
  color: var(--text-2);
}

.qr-wrap {
  display: inline-block;
  padding: 12px;
  border-radius: 16px;
  background: #ffffff;
}

.qr {
  display: block;
  width: 200px;
  height: 200px;
  max-width: 100%;
  height: auto;
}

.features {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  text-align: left;
  display: grid;
  gap: 10px;
  font-size: 14px;
  color: var(--text);
}

.features li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.feature-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold);
  flex-shrink: 0;
}

.modal-foot {
  margin: 18px 0 14px;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.6;
}

.modal-save {
  width: 100%;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes rise {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
</style>
