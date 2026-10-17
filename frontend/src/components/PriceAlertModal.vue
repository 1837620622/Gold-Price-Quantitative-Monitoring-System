<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="modal-head">
        <div class="head-title-wrap">
          <div class="alert-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <div>
            <h3 class="modal-title">{{ t('priceAlert.title') }}</h3>
            <p class="modal-sub">{{ t('priceAlert.desc') }}</p>
          </div>
        </div>
        <button type="button" class="close-btn" @click="$emit('close')">✕</button>
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
import { ref, computed } from 'vue';
import { playAlertSound } from '../lib/sound';
import { useI18n } from '../i18n';

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
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 580px;
  background: var(--surface-card);
  border: 1px solid rgba(232, 199, 125, 0.3);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.head-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(56, 189, 248, 0.15);
  color: var(--info);
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.modal-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-3);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.close-btn:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.1);
}

.perm-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  font-size: 12px;
  color: var(--gold-3);
  margin-bottom: 18px;
  gap: 10px;
}

.perm-btn {
  padding: 4px 10px;
  background: var(--gold-2);
  color: var(--gold-ink);
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
}

.alert-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid rgba(255, 255, 255, 0.08);
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

.field-label {
  font-size: 11px;
  color: var(--text-2);
  font-weight: 600;
}

.field-select,
.field-input {
  height: 38px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  font-family: var(--mono);
}
.field-select:focus,
.field-input:focus {
  outline: none;
  border-color: var(--gold-2);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
}

.list-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-2);
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-3);
  font-size: 11px;
  cursor: pointer;
}
.clear-btn:hover {
  color: var(--gold-3);
}

.empty-state {
  text-align: center;
  padding: 24px 16px;
  color: var(--text-3);
  font-size: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 8px;
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
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--mono);
}
.alert-row.triggered {
  opacity: 0.6;
  border-color: rgba(239, 68, 68, 0.3);
}

.row-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.row-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
}
.row-badge.cn {
  background: rgba(232, 199, 125, 0.15);
  color: var(--gold-3);
}
.row-badge.intl {
  background: rgba(59, 130, 246, 0.15);
  color: var(--info);
}

.row-cond {
  color: var(--text-2);
  font-size: 12px;
}

.row-price {
  font-weight: 700;
  color: var(--text);
}

.status-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
}
.status-tag.active {
  background: rgba(16, 185, 129, 0.15);
  color: var(--down);
}
.status-tag.triggered {
  background: rgba(239, 68, 68, 0.15);
  color: var(--up);
}

.row-actions {
  display: flex;
  gap: 6px;
}

.row-btn {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-2);
}
.row-btn.reset:hover {
  background: var(--gold-2);
  color: var(--gold-ink);
}
.row-btn.del:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--up);
  border-color: var(--up);
}
</style>
