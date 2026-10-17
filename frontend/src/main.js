/**
 * ============================================================
 * 黄金价格检测系统 - Vue 应用入口
 * ============================================================
 */

import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { initSpotlight } from './lib/spotlight';

const app = createApp(App);
app.mount('#app');
initSpotlight();
