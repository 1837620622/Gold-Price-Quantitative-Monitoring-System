/**
 * ============================================================
 * 后端 API 封装
 * 生产环境指向 Workers 域名；开发环境走 vite 代理（vite.config.js）
 * ============================================================
 */

import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? 'https://gold-backend.chuankangkk.top' : '');

const http = axios.create({ baseURL: API_BASE, timeout: 20000 });

export async function fetchPrices() {
  const { data } = await http.get('/api/price/all');
  return data;
}

// market: 'cn'（AU9999，含溢价与回测）| 'intl'（XAU/USD）
export async function fetchQuant(market, days = 250) {
  const { data } = await http.get(`/api/quant/${market}`, { params: { days }, timeout: 35000 });
  return data;
}

export async function fetchRatio(days = 120) {
  const { data } = await http.get('/api/ratio', { params: { days }, timeout: 15000 });
  return data;
}

export async function fetchSignals(market = 'cn', days = 60) {
  const { data } = await http.get('/api/signals', { params: { market, days }, timeout: 15000 });
  return data;
}

export async function requestAnalysis(options = {}) {
  // AI 分析放宽超时至 120 秒
  const { data } = await http.post('/api/analyze', options, { timeout: 120000 });
  return data;
}
