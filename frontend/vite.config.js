/**
 * ============================================================
 * Vite 配置文件
 * ============================================================
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  
  // 开发服务器配置
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },

  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
