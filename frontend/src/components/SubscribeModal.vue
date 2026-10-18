<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="subscribe-title">
        <button
          ref="closeBtn"
          type="button"
          class="icon-btn modal-close"
          :aria-label="t('subscribe.close')"
          @click="$emit('close')"
        >
          <Icon name="close" :size="18" />
        </button>

        <h2 id="subscribe-title" class="modal-title">{{ t('subscribe.title') }}</h2>
        <p class="modal-desc">{{ t('subscribe.desc') }}</p>

        <div class="qr-wrap">
          <img src="/qrcode.png" :alt="t('subscribe.qrAlt')" width="200" height="200" class="qr" />
        </div>

        <ul class="features">
          <li><span class="feature-dot"></span>{{ t('subscribe.feat1') }}</li>
          <li><span class="feature-dot"></span>{{ t('subscribe.feat2') }}</li>
          <li><span class="feature-dot"></span>{{ t('subscribe.feat3') }}</li>
        </ul>

        <p class="modal-foot">{{ t('subscribe.validity') }}</p>
        <a class="btn btn-primary modal-save" href="/qrcode.png" :download="t('subscribe.fileName')">{{ t('subscribe.save') }}</a>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue';
import { useI18n } from '../i18n';
import Icon from './icons/Icon.vue';

const { t } = useI18n();

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const closeBtn = ref(null);

function onKeydown(event) {
  if (event.key === 'Escape') emit('close');
}

// 视口由 html 决定滚动（style.css 给 html 设了 overflow-x，body 上的设置不会传到视口），两处都锁
function lockScroll(locked) {
  const value = locked ? 'hidden' : '';
  document.documentElement.style.overflow = value;
  document.body.style.overflow = value;
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
  animation: fade-in 0.2s ease-out;
}

/* 弹层：纯色面板、发丝边，阴影使用弹层令牌 */
.modal {
  position: relative;
  width: min(400px, 100%);
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 28px 24px 24px;
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-modal);
  text-align: center;
  animation: rise 0.24s ease-out;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
}

.modal-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--text);
}

:lang(zh) .modal-title {
  letter-spacing: 0;
}

.modal-desc {
  margin: 8px 0 20px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-2);
}

:lang(zh) .modal-desc {
  line-height: 1.75;
}

.qr-wrap {
  display: inline-block;
  padding: 12px;
  border-radius: var(--radius);
  background: #ffffff;
}

.qr {
  display: block;
  width: 200px;
  height: auto;
  max-width: 100%;
}

.features {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  text-align: left;
  display: grid;
  gap: 10px;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text);
}

.features li {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 列表前的小菱形，与金线分隔的菱形同形 */
.feature-dot {
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  background: var(--gold);
  transform: rotate(45deg);
}

.modal-foot {
  margin: 18px 0 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

:lang(zh) .modal-foot {
  line-height: 1.75;
}

.modal-save {
  width: 100%;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

/* ---------- 手机端：底部弹出的全宽面板，适配安全区 ---------- */
@media (max-width: 767px) {
  .modal-backdrop {
    place-items: end center;
    padding: 0;
  }

  .modal {
    width: 100%;
    max-height: 88vh;
    max-height: 88dvh;
    padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    overscroll-behavior: contain;
  }

  .modal-close {
    top: 8px;
    right: 8px;
    width: 44px;
    height: 44px;
  }

  .modal-title {
    font-size: 18px;
    word-break: keep-all;
    overflow-wrap: break-word;
  }

  .modal-save {
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-backdrop,
  .modal {
    animation: none;
  }
}
</style>
