/**
 * 价格预警与通知系统（支持本地阈值比对、Web Audio 警报、浏览器系统桌面通知）
 */

import { ref, watch } from 'vue';
import { playAlertSound } from '../lib/sound';
import { t } from '../i18n';

const STORAGE_KEY = 'gold_monitor_price_alerts';

function loadAlerts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAlerts(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function useAlerts() {
  const alerts = ref(loadAlerts());
  const activeNotice = ref(null);

  function addAlert({ target, condition, price, label }) {
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      target, // 'cn' | 'intl'
      condition, // 'gte' (>=) | 'lte' (<=)
      price: Number(price),
      label: label || (target === 'cn' ? t('alerts.cnLabel') : t('alerts.intlLabel')),
      createdAt: new Date().toISOString(),
      triggered: false,
    };
    alerts.value.push(item);
    saveAlerts(alerts.value);
    requestNotificationPermission();
    return item;
  }

  function removeAlert(id) {
    alerts.value = alerts.value.filter((a) => a.id !== id);
    saveAlerts(alerts.value);
  }

  function toggleAlert(id) {
    const it = alerts.value.find((a) => a.id === id);
    if (it) {
      it.triggered = false;
      saveAlerts(alerts.value);
    }
  }

  function clearTriggered() {
    alerts.value = alerts.value.filter((a) => !a.triggered);
    saveAlerts(alerts.value);
  }

  async function requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }

  function checkPrice(snapshot) {
    if (!snapshot) return;
    const cnPrice = snapshot.domestic?.price;
    const intlPrice = snapshot.international?.price;

    for (const a of alerts.value) {
      if (a.triggered) continue;

      const current = a.target === 'cn' ? cnPrice : intlPrice;
      if (!current || typeof current !== 'number') continue;

      let hit = false;
      if (a.condition === 'gte' && current >= a.price) hit = true;
      if (a.condition === 'lte' && current <= a.price) hit = true;

      if (hit) {
        a.triggered = true;
        saveAlerts(alerts.value);

        const sym = a.target === 'cn' ? '¥' : '$';
        const condText = a.condition === 'gte' ? t('alerts.condGte') : t('alerts.condLte');
        const title = t('alerts.title', { label: a.label, price: `${sym}${current}` });
        const body = t('alerts.body', { target: `${sym}${a.price}`, cond: condText, current: `${sym}${current}` });

        // 1. 播放高可用提示音
        playAlertSound();

        // 2. 页面内弹窗提示
        activeNotice.value = { title, body, timestamp: new Date().toLocaleTimeString() };
        setTimeout(() => {
          activeNotice.value = null;
        }, 8000);

        // 3. 浏览器桌面通知
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body,
              icon: '/favicon.svg',
            });
          } catch {}
        }
      }
    }
  }

  return {
    alerts,
    activeNotice,
    addAlert,
    removeAlert,
    toggleAlert,
    clearTriggered,
    checkPrice,
    requestNotificationPermission,
  };
}
