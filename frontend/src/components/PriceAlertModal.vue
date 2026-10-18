<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="modal-head">
        <div class="head-title-wrap">
          <Icon name="bell" :size="20" class="head-icon" />
          <div>
            <h3 class="modal-title">{{ t('priceAlert.title') }}</h3>
            <p class="modal-sub">{{ t('priceAlert.desc') }}</p>
          </div>
        </div>
        <button type="button" class="icon-btn" @click="$emit('close')">
          <Icon name="close" :size="18" />
        </button>
      </header>

      <!-- 权限提醒提示条 -->
      <div v-if="notificationPermission === 'default'" class="perm-banner">
        <span>{{ t('priceAlert.permissionHint') }}</span>
        <button type="button" class="perm-btn" @click="requestPerm">{{ t('priceAlert.enableNotify') }}</button>
      </div>

      <!-- 添加新预警表单 -->
      <form class="alert-form" @submit.prevent="submitAlert">
        <div class="form-row">
          <div class="form-field">
            <label class="field-label">{{ t('priceAlert.target') }}</label>
            <select v-model="formTarget" class="field-select">
              <option value="cn">{{ t('priceAlert.optCn') }}</option>
              <option value="intl">{{ t('priceAlert.optIntl') }}</option>
            </select>
          </div>

          <div class="form-field">
            <label class="field-label">{{ t('priceAlert.condition') }}</label>
            <select v-model="formCondition" class="field-select">
              <option value="gte">{{ t('priceAlert.optGte') }}</option>
              <option value="lte">{{ t('priceAlert.optLte') }}</option>
            </select>
          </div>

          <div class="form-field">
            <label class="field-label">{{ t('priceAlert.targetPrice', { unit: formTarget === 'cn' ? t('priceAlert.unitCny') : t('priceAlert.unitUsd') }) }}</label>
            <input
              v-model.number="formPrice"
              type="number"
              step="any"
              :placeholder="formTarget === 'cn' ? t('priceAlert.phCn') : t('priceAlert.phIntl')"
              class="field-input"
              required
            />
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost btn-sm" @click="testSound">
            <Icon name="volume" :size="14" />
            {{ t('priceAlert.testSound') }}
          </button>
          <button type="submit" class="btn btn-primary btn-sm">
            {{ t('priceAlert.add') }}
          </button>
        </div>
      </form>

      <!-- 已设预警列表 -->
      <div class="alerts-list-box">
        <div class="list-head">
          <span class="list-title">{{ t('priceAlert.activeCount', { count: alerts.length }) }}</span>
          <button v-if="hasTriggered" type="button" class="clear-btn" @click="clearTriggered">
            {{ t('priceAlert.clearTriggered') }}
          </button>
        </div>

        <div v-if="!alerts.length" class="empty-state">
          {{ t('priceAlert.empty') }}
        </div>

        <div v-else class="alerts-items">
          <div
            v-for="a in alerts"
            :key="a.id"
            class="alert-row"
            :class="{ triggered: a.triggered }"
          >
            <div class="row-left">
              <span class="row-badge" :class="a.target">{{ a.target === 'cn' ? 'AU9999' : 'XAU/USD' }}</span>
              <span class="row-cond">{{ a.condition === 'gte' ? t('priceAlert.badgeGte') : t('priceAlert.badgeLte') }}</span>
              <span class="row-price">{{ a.target === 'cn' ? '¥' : '$' }}{{ a.price }}</span>
              <span v-if="a.triggered" class="status-tag triggered">{{ t('priceAlert.triggered') }}</span>
              <span v-else class="status-tag active">{{ t('priceAlert.monitoring') }}</span>
            </div>

            <div class="row-actions">
              <button
                v-if="a.triggered"
                type="button"
                class="row-btn reset"
                :title="t('priceAlert.resetTitle')"
                @click="toggleAlert(a.id)"
              >{{ t('priceAlert.reset') }}</button>
              <button
                type="button"
                class="row-btn del"
                :title="t('priceAlert.removeTitle')"
                @click="removeAlert(a.id)"
              >{{ t('priceAlert.remove') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { playAlertSound } from '../lib/sound';
import { useI18n } from '../i18n';
import Icon from './icons/Icon.vue';

const { t } = useI18n();

const props = defineProps({
  open: { type: Boolean, default: false },
  alerts: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'add', 'remove', 'toggle', 'clear']);

const formTarget = ref('cn');
const formCondition = ref('gte');
const formPrice = ref(null);

const notificationPermission = ref(
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
);

const hasTriggered = computed(() => props.alerts.some((a) => a.triggered));

// 弹层打开时锁住背后页面滚动（视口由 html 决定，见 SubscribeModal 同名注释）
function lockScroll(locked) {
  const value = locked ? 'hidden' : '';
  document.documentElement.style.overflow = value;
  document.body.style.overflow = value;
}
watch(() => props.open, (isOpen) => lockScroll(isOpen));
onUnmounted(() => lockScroll(false));

async function requestPerm() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const res = await Notification.requestPermission();
    notificationPermission.value = res;
  }
}

function submitAlert() {
  if (!formPrice.value) return;
  emit('add', {
    target: formTarget.value,
    condition: formCondition.value,
    price: formPrice.value,
  });
  formPrice.value = null;
}

function removeAlert(id) {
  emit('remove', id);
}

function toggleAlert(id) {
  emit('toggle', id);
}

function clearTriggered() {
  emit('clear');
}

function testSound() {
  playAlertSound();
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.72);
}

.modal-card {
  width: 100%;
  max-width: 580px;
  background: var(--surface-card);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  padding: 24px;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.head-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.head-icon {
  flex-shrink: 0;
  color: var(--gold);
}

.modal-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--text);
  word-break: keep-all;
  overflow-wrap: break-word;
}

:lang(zh) .modal-title {
  letter-spacing: 0;
}

.modal-sub {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

:lang(zh) .modal-sub {
  line-height: 1.75;
}

/* 权限提示：发丝边、无底色；启用按钮为纯金 */
.perm-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
  margin-bottom: 18px;
  gap: 10px;
}

.perm-btn {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--gold-ink);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .perm-btn:hover {
    background: color-mix(in srgb, var(--gold) 86%, #ffffff);
  }
}

.alert-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--surface-2);
  border: 1px solid var(--line);
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

@media (min-width: 520px) {
  .form-row {
    grid-template-columns: 1.2fr 1.2fr 1fr;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 表单标签：英文小字大写加字距；中文 12px 不大写 */
.field-label {
  font-family: var(--font);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-2);
}

:lang(zh) .field-label {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.field-select,
.field-input {
  height: 38px;
  padding: 0 10px;
  border-radius: var(--radius);
  border: 1px solid var(--line-strong);
  background: var(--surface-card);
  color: var(--text);
  font-size: 13px;
}

.field-select {
  font-family: var(--font);
}

.field-input {
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
}

.field-select:focus,
.field-input:focus {
  outline: none;
  border-color: var(--gold);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-actions .btn {
  height: 36px;
}

.alerts-list-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.list-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
}

.clear-btn {
  min-height: 36px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--text-2);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .clear-btn:hover {
    color: var(--gold);
  }
}

.empty-state {
  text-align: center;
  padding: 24px 16px;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.6;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.alerts-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
}

.alert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius);
  background: transparent;
  border: 1px solid var(--line);
  font-family: var(--font);
}

.alert-row.triggered {
  opacity: 0.6;
}

.row-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

/* 标的芯片：发丝边框、无底色；国内现货用金色字 */
.row-badge {
  padding: 2px 6px;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--text-2);
  white-space: nowrap;
}

.row-badge.cn {
  color: var(--gold);
}

.row-cond {
  color: var(--text-2);
  font-size: 12px;
}

.row-price {
  font-family: var(--mono);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

/* 状态标签：文字着色，无底色；已触发为金色 */
.status-tag {
  padding: 1px 6px;
  border: 1px solid var(--line);
  border-radius: 2px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
  white-space: nowrap;
}

.status-tag.triggered {
  color: var(--gold);
  border-color: var(--line-strong);
}

.row-actions {
  display: flex;
  gap: 6px;
}

.row-btn {
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-2);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .row-btn.reset:hover {
    border-color: var(--gold);
    color: var(--gold);
  }

  .row-btn.del:hover {
    border-color: var(--danger);
    color: var(--danger);
  }
}

/* ---------- 手机端：底部弹出的全宽面板；输入 16px 防止 iOS 缩放；按钮 44px ---------- */
@media (max-width: 767px) {
  .modal-backdrop {
    place-items: end center;
    padding: 0;
  }

  .modal-card {
    max-width: none;
    max-height: 88vh;
    max-height: 88dvh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .modal-head {
    margin-bottom: 16px;
  }

  .modal-title {
    font-size: 18px;
  }

  .modal-head .icon-btn {
    width: 44px;
    height: 44px;
  }

  .modal-sub {
    font-size: 13px;
  }

  .perm-banner {
    flex-wrap: wrap;
    padding: 10px 12px;
    font-size: 13px;
  }

  .perm-btn {
    min-height: 44px;
    padding: 0 14px;
    font-size: 13px;
  }

  .alert-form {
    padding: 14px;
    gap: 12px;
  }

  .field-select,
  .field-input {
    height: 44px;
    font-size: 16px;
  }

  .form-actions .btn {
    height: 44px;
  }

  .list-title {
    font-size: 14px;
  }

  .clear-btn {
    min-height: 44px;
    padding: 0 8px;
    font-size: 13px;
  }

  .alert-row {
    flex-wrap: wrap;
    gap: 8px 12px;
    padding: 10px 12px;
  }

  .row-left {
    flex-wrap: wrap;
    min-width: 0;
    gap: 6px 8px;
    font-size: 14px;
  }

  .row-cond {
    font-size: 13px;
  }

  .row-actions {
    margin-left: auto;
    gap: 8px;
  }

  .row-btn {
    min-height: 44px;
    padding: 0 12px;
    font-size: 13px;
  }
}
</style>
