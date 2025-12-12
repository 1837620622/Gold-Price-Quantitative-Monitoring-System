<div align="center">

# 🏆 Gold Monitor - 黄金价格智能监控系统

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.x-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue 3">
  <img src="https://img.shields.io/badge/DeepSeek-V3.2-FF6B6B?style=for-the-badge&logo=openai&logoColor=white" alt="DeepSeek">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare">
  <img src="https://img.shields.io/badge/TradingView-Charts-131722?style=for-the-badge&logo=tradingview&logoColor=white" alt="TradingView">
</p>

<p align="center">
  <strong>🚀 实时金价监控 | 📊 专业K线图表 | 🤖 AI量化分析 | ☁️ 云端部署</strong>
</p>

<p align="center">
  基于 Vue3 + Hono + DeepSeek AI 构建的专业级黄金价格实时监控与智能量化分析平台
</p>

</div>

---

## 📸 系统预览

<div align="center">
  <img src="./docs/preview-1.png" alt="系统主界面" width="100%">
  <p><em>▲ 系统主界面 - 实时价格监控与K线走势</em></p>
</div>

<div align="center">
  <img src="./docs/preview-2.png" alt="AI分析报告" width="100%">
  <p><em>▲ AI智能分析报告 - DeepSeek V3.2 量化分析</em></p>
</div>

---

## ✨ 核心功能

<table>
<tr>
<td width="50%">

### 📈 实时价格监控
- 国际金价 XAU/USD 实时行情
- 国内 AU9999 上海黄金交易所数据
- 白银价格同步显示
- 涨跌幅实时计算

</td>
<td width="50%">

### 📊 专业图表展示
- TradingView 国际金价K线图
- 金投网 AU9999 走势图
- 支持多周期切换
- 专业技术指标

</td>
</tr>
<tr>
<td width="50%">

### 🤖 AI量化分析
- DeepSeek V3.2 最新模型
- 短期趋势判断
- 支撑位/压力位分析
- 操作建议与风险提示

</td>
<td width="50%">

### 🎨 专业UI设计
- 金融终端风格界面
- 深色主题护眼设计
- 响应式布局适配
- Markdown格式报告

</td>
</tr>
</table>

---

## 🛠️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Gold Monitor                            │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Vue 3 + Vite)                                    │
│  ├── TailwindCSS 样式框架                                    │
│  ├── ECharts 图表库                                          │
│  ├── TradingView 嵌入图表                                    │
│  └── Marked Markdown渲染                                     │
├─────────────────────────────────────────────────────────────┤
│  Backend (Hono + Cloudflare Workers)                        │
│  ├── 实时价格API聚合                                         │
│  ├── DeepSeek V3.2 AI分析                                    │
│  └── CORS跨域处理                                            │
├─────────────────────────────────────────────────────────────┤
│  Data Sources                                                │
│  ├── GoldPrice.org (国际金价)                                │
│  ├── 东方财富 (国内AU9999)                                   │
│  └── 金投网 (走势图表)                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 环境要求

- Node.js 18.0+
- npm 或 pnpm
- Cloudflare 账号（部署用）

### 本地开发

```bash
# 克隆项目
git clone https://github.com/1837620622/gold-monitor.git
cd gold-monitor

# 启动后端
cd backend
npm install
npm run dev

# 启动前端（新终端）
cd frontend
npm install
npm run dev
```

访问 `http://localhost:3000` 即可查看系统

---

## 📦 部署指南

### Mac / Linux

```bash
# ========== 后端部署 ==========
cd backend

# 安装依赖
npm install

# 配置API密钥
echo "MODELSCOPE_API_KEY=你的密钥" > .dev.vars

# 部署到Cloudflare
npx wrangler login
npx wrangler secret put MODELSCOPE_API_KEY
npm run deploy

# ========== 前端部署 ==========
cd ../frontend

# 安装依赖
npm install

# 修改API地址（src/App.vue中的API_BASE）

# 构建并部署
npm run build
npx wrangler pages deploy dist --project-name=gold-monitor
```

### Windows

```powershell
# ========== 后端部署 ==========
cd backend

# 安装依赖
npm install

# 配置API密钥（编辑.dev.vars文件）

# 部署到Cloudflare
npx wrangler login
npx wrangler secret put MODELSCOPE_API_KEY
npm run deploy

# ========== 前端部署 ==========
cd ..\frontend

# 安装依赖
npm install

# 构建并部署
npm run build
npx wrangler pages deploy dist --project-name=gold-monitor
```

---

## 📡 API 接口

| 接口 | 方法 | 描述 |
|:-----|:----:|:-----|
| `/api/price/all` | GET | 获取所有价格数据 |
| `/api/price/international` | GET | 获取国际金价 |
| `/api/price/domestic` | GET | 获取国内AU9999价格 |
| `/api/kline?days=30` | GET | 获取K线历史数据 |
| `/api/analyze` | POST | DeepSeek AI量化分析 |

---

## 📁 项目结构

```
gold-monitor/
├── 📂 backend/                    # 后端服务
│   ├── 📂 src/
│   │   └── 📄 index.js           # API核心逻辑
│   ├── 📄 package.json
│   ├── 📄 wrangler.toml          # Cloudflare配置
│   └── 📄 .dev.vars              # 环境变量
│
├── 📂 frontend/                   # 前端应用
│   ├── 📂 src/
│   │   ├── 📄 App.vue            # 主组件
│   │   ├── 📄 main.js            # 入口文件
│   │   └── 📄 style.css          # 样式文件
│   ├── 📄 index.html
│   ├── 📄 package.json
│   ├── 📄 vite.config.js
│   └── 📄 tailwind.config.js
│
├── 📂 docs/                       # 文档资源
│   ├── 📷 preview-1.png          # 预览图1
│   └── 📷 preview-2.png          # 预览图2
│
└── 📄 README.md
```

---

## ⚙️ 配置说明

### DeepSeek API

本项目使用 ModelScope 的 DeepSeek V3.2 模型：

```javascript
// API配置
{
  endpoint: "https://api-inference.modelscope.cn/v1/chat/completions",
  model: "deepseek-ai/DeepSeek-V3.2",
  apiKey: "ms-xxxxxxxx"  // 在ModelScope获取
}
```

### 数据源配置

| 数据类型 | 来源 | 更新频率 |
|:--------|:-----|:--------|
| 国际金价 | GoldPrice.org | 实时 |
| 国内AU9999 | 东方财富 | 实时 |
| 国际图表 | TradingView | 实时 |
| 国内图表 | 金投网 | 实时 |

---

## 🤝 联系作者

<div align="center">

| 平台 | 联系方式 |
|:----:|:--------|
| 💬 微信 | `1837620622`（传康kk） |
| 📧 邮箱 | `2040168455@qq.com` |
| 🐟 咸鱼 | 万能程序员 |
| 📺 B站 | 万能程序员 |
| 🌐 官网 | [www.chuankangkk.top](https://www.chuankangkk.top) |
| 💻 GitHub | [github.com/1837620622](https://github.com/1837620622) |

</div>

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！**

<p>
  <img src="https://img.shields.io/github/stars/1837620622/gold-monitor?style=social" alt="GitHub Stars">
  <img src="https://img.shields.io/github/forks/1837620622/gold-monitor?style=social" alt="GitHub Forks">
</p>

Made with ❤️ by 万能程序员

</div>
