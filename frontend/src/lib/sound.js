/**
 * 金融音效合成引擎（基于原生 Web Audio API，无需加载外部音频文件，零依赖毫秒级触发）
 */

import { ref } from 'vue';

const SOUND_KEY = 'gold_monitor_sound_enabled';
const isBrowser = typeof window !== 'undefined';

function getStoredSound() {
  if (!isBrowser) return false;
  return localStorage.getItem(SOUND_KEY) === 'true';
}

export const soundEnabled = ref(getStoredSound());

export function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  if (isBrowser) {
    localStorage.setItem(SOUND_KEY, soundEnabled.value ? 'true' : 'false');
    if (soundEnabled.value) {
      playTickSound(true); // 试听一次
    }
  }
}

let audioCtx = null;
function getAudioContext() {
  if (!isBrowser) return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * 价格变动微提示音
 * @param {boolean} isUp - true 涨（清亮高音），false 跌（温和低音）
 */
export function playTickSound(isUp = true) {
  if (!soundEnabled.value) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = isUp ? 880 : 440; // 涨 A5 (880Hz), 跌 A4 (440Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // 平滑包络，避免杂音
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (e) {
    // 忽略音频受阻
  }
}

/**
 * 价格突破告警提示音（清脆三和弦）
 */
export function playAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  } catch (e) {
    // 忽略
  }
}
