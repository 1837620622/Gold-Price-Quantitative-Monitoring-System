/**
 * ============================================================
 * 后端 API 封装
 * 生产环境指向 Workers 域名；开发环境走 vite 代理（vite.config.js）
 * ============================================================
 */

import axios from 'axios';

export const API_BASE = import.meta.env.PROD ? 'https://gold-backend.chuankangkk.top' : '';

const http = axios.create({ baseURL: API_BASE, timeout: 15000 });

export async function fetchPrices() {
  const { data } = await http.get('/api/price/all');
  return data;
}

export async function fetchKline(days) {
  const { data } = await http.get('/api/kline', { params: { days } });
  return data;
}

export async function requestAnalysis() {
  // AI 分析需要 1-2 分钟，单独放宽超时
  const { data } = await http.post('/api/analyze', null, { timeout: 120000 });
  return data;
}
