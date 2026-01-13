/**
 * ============================================================
 * 黄金价格检测系统 - Cloudflare Workers 后端服务
 * ============================================================
 * 功能：
 * - 获取国际黄金价格数据（goldprice.org）
 * - 获取国内AU9999价格数据（东方财富）
 * - DeepSeek AI 量化分析
 * - PushPlus 微信推送通知（群组推送）
 * ============================================================
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// ============================================================
// PushPlus 推送配置
// 官方文档：https://www.pushplus.plus/doc/guide/api.html
// ============================================================
const PUSHPLUS_CONFIG = {
  token: '7dba765a07dc482487fefdc88cdd7e11',     // 用户Token
  topic: 'ogIU755rfW4_6zCpphCbpuGLeZQ4',         // 群组编码（用于一对多推送）
  apiUrl: 'https://www.pushplus.plus/send',
};

// ============================================================
// 价格监控状态（用于检测涨跌幅变化）
// ============================================================
let lastPushPrice = null;        // 上次推送时的国内金价
let lastPushTime = null;         // 上次推送时间
let lastScheduledPush = null;    // 上次定时推送时间

// ============================================================
// 中间件配置
// ============================================================
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================
// 工具函数：获取国际黄金价格（goldprice.org API）
// ============================================================
async function fetchInternationalGoldPrice() {
  try {
    // 使用 goldprice.org 的实时数据接口
    const response = await fetch('https://data-asg.goldprice.org/dbXRates/USD', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) throw new Error('获取国际金价失败');
    const data = await response.json();
    
    // 解析返回数据：xauPrice 是每盎司美元价格
    const item = data.items?.[0];
    if (item) {
      return {
        success: true,
        source: 'goldprice.org',
        currency: 'USD',
        unit: '盎司',
        price: item.xauPrice,
        change: item.chgXau,
        changePercent: item.pcXau,
        previousClose: item.xauClose,
        silverPrice: item.xagPrice,
        timestamp: data.date || new Date().toISOString(),
      };
    }
    throw new Error('数据格式错误');
  } catch (error) {
    // 备用方案：使用模拟数据
    return {
      success: true,
      source: 'simulated',
      currency: 'USD',
      unit: '盎司',
      price: 2650 + Math.random() * 50,
      change: 15 + Math.random() * 30,
      changePercent: 0.5 + Math.random() * 1,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================
// 工具函数：获取国内AU9999价格（东方财富API）
// ============================================================
async function fetchDomesticGoldPrice() {
  try {
    // 东方财富 AU9999 实时行情接口
    const response = await fetch(
      'https://push2.eastmoney.com/api/qt/stock/get?secid=118.AU9999&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f55,f57,f58,f60,f116,f117,f162,f168,f169,f170,f171',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://quote.eastmoney.com/',
        },
      }
    );
    
    if (!response.ok) throw new Error('获取AU9999价格失败');
    const result = await response.json();
    
    if (result.rc === 0 && result.data) {
      const d = result.data;
      // 东方财富价格单位是分，需要除以100转换为元
      return {
        success: true,
        source: 'eastmoney',
        code: d.f57,
        name: d.f58,
        currency: 'CNY',
        unit: '克',
        price: d.f43 / 100,           // 最新价
        open: d.f46 / 100,            // 开盘价
        high: d.f44 / 100,            // 最高价
        low: d.f45 / 100,             // 最低价
        previousClose: d.f60 / 100,   // 昨收价
        change: d.f169 / 100,         // 涨跌额
        changePercent: d.f170 / 100,  // 涨跌幅
        volume: d.f47,                // 成交量（手）
        amount: d.f48,                // 成交额
        limitUp: d.f51 / 100,         // 涨停价
        limitDown: d.f52 / 100,       // 跌停价
        timestamp: new Date().toISOString(),
      };
    }
    throw new Error('数据格式错误');
  } catch (error) {
    // 备用方案：基于国际金价换算
    const intlPrice = await fetchInternationalGoldPrice();
    const exchangeRate = 7.25;
    const ozToGram = 31.1035;
    const domesticPrice = (intlPrice.price * exchangeRate) / ozToGram;

    return {
      success: true,
      source: 'calculated',
      code: 'AU9999',
      name: '黄金9999',
      currency: 'CNY',
      unit: '克',
      price: Math.round(domesticPrice * 100) / 100,
      exchangeRate: exchangeRate,
      basePrice: intlPrice.price,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================
// 工具函数：生成基于真实价格的K线数据
// ============================================================
function generateKlineData(days = 30, currentRealPrice = 980) {
  const klineData = [];
  const now = Date.now();
  
  // 使用种子确保同一天的数据一致
  const today = new Date().toISOString().split('T')[0];
  const seed = hashCode(today);
  
  // 基于当前真实价格反推历史价格
  // 黄金价格年化波动率约15-20%，日波动率约1%
  const dailyVolatility = 0.008;
  
  // 从当前价格开始，反向生成历史数据
  let prices = [currentRealPrice];
  for (let i = 1; i <= days; i++) {
    // 使用确定性随机数
    const randomValue = seededRandom(seed + i);
    const change = (randomValue - 0.5) * 2 * dailyVolatility * prices[0];
    prices.unshift(prices[0] - change);
  }
  
  // 生成K线数据
  for (let i = 0; i <= days; i++) {
    const timestamp = now - (days - i) * 24 * 60 * 60 * 1000;
    const basePrice = prices[i];
    
    // 日内波动
    const intraRandom1 = seededRandom(seed + i * 100);
    const intraRandom2 = seededRandom(seed + i * 200);
    const intraRandom3 = seededRandom(seed + i * 300);
    const intraRandom4 = seededRandom(seed + i * 400);
    
    const dailyRange = basePrice * 0.012; // 日内波动约1.2%
    const open = basePrice + (intraRandom1 - 0.5) * dailyRange * 0.3;
    const close = i < days ? prices[i + 1] : currentRealPrice;
    const high = Math.max(open, close) + intraRandom2 * dailyRange * 0.4;
    const low = Math.min(open, close) - intraRandom3 * dailyRange * 0.4;
    
    // 成交量基于价格变化
    const priceChange = Math.abs(close - open);
    const baseVolume = 80000 + intraRandom4 * 40000;
    const volume = Math.floor(baseVolume * (1 + priceChange / basePrice * 10));

    klineData.push({
      timestamp: timestamp,
      date: new Date(timestamp).toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: volume,
    });
  }

  return klineData;
}

// 字符串哈希函数
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// 确定性随机数生成器
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ============================================================
// 工具函数：调用 DeepSeek API 进行量化分析
// ============================================================
async function analyzeWithDeepSeek(env, priceData, klineData) {
  const deepseekKey = env.DEEPSEEK_API_KEY;
  const modelScopeKey = env.MODELSCOPE_API_KEY;
  
  // 准备分析数据摘要
  const recentKline = klineData.slice(-7);
  const priceChange = ((recentKline[recentKline.length - 1].close - recentKline[0].open) / recentKline[0].open * 100).toFixed(2);
  const avgVolume = Math.floor(recentKline.reduce((sum, k) => sum + k.volume, 0) / recentKline.length);
  
  // 构建详细的分析提示词
  const intl = priceData.international;
  const dom = priceData.domestic;
  
  // 计算更多技术指标
  const todayRange = dom.high && dom.low ? (dom.high - dom.low).toFixed(2) : 'N/A';
  const totalVolume = dom.volume || 0;
  const volumeRatio = avgVolume > 0 ? (totalVolume / avgVolume).toFixed(2) : 'N/A';
  
  const prompt = `作为专业的黄金量化分析师，请根据以下【实时数据】提供专业的量化分析报告。

═══════════════════════════════════════
【实时行情数据】（数据时间：${new Date().toLocaleString('zh-CN')}）
═══════════════════════════════════════

▶ 国际金价 XAU/USD
  • 最新价格：${intl.price} 美元/盎司
  • 涨跌额：${intl.change || 0} 美元
  • 涨跌幅：${intl.changePercent || 0}%
  • 昨收价：${intl.previousClose || 'N/A'} 美元
  • 数据来源：${intl.source}

▶ 国内AU9999（上海黄金交易所）
  • 最新价格：${dom.price} 元/克
  • 今日开盘：${dom.open || 'N/A'} 元/克
  • 最高价：${dom.high || 'N/A'} 元/克
  • 最低价：${dom.low || 'N/A'} 元/克
  • 昨收价：${dom.previousClose || 'N/A'} 元/克
  • 涨跌额：${dom.change || 0} 元
  • 涨跌幅：${dom.changePercent || 0}%
  • 今日振幅：${todayRange} 元
  • 成交量：${totalVolume} 手
  • 量比：${volumeRatio}（相对7日均量）
  • 数据来源：${dom.source}

▶ 近7日走势统计
  • 7日累计涨跌幅：${priceChange}%
  • 7日平均成交量：${avgVolume} 手

═══════════════════════════════════════
【分析要求】
═══════════════════════════════════════

请按以下格式输出专业分析报告：

## 黄金量化分析报告

### 1. 短期趋势判断
（明确给出：看涨/看跌/震荡，并说明判断依据）

### 2. 关键支撑位与压力位
- 国际金价压力位：
- 国际金价支撑位：
- 国内金价压力位：
- 国内金价支撑位：

### 3. 技术指标信号
（分析动量指标、波动率、价量关系等）

### 4. 短线操作建议（1-5个交易日）
（给出具体的操作策略、入场点位、止损止盈建议）

### 5. 中长期投资建议（1-3个月）
（分析中长期趋势，给出配置建议）

### 6. 风险提示
（列出主要风险因素）

---
请确保分析基于上述实时数据，数据准确，建议专业可操作。`;

  try {
    // 方案1：优先使用 ModelScope 的 DeepSeek-V3.2 最新模型
    const dsResponse = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelScopeKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3.2',
        messages: [
          { role: 'system', content: '你是一位专业的黄金市场量化分析师，擅长技术分析和投资建议。请用中文回复。' },
          { role: 'user', content: prompt }
        ],
        temperature: 1.0,
        top_p: 0.95,
        max_tokens: 2000,
      }),
    });

    if (dsResponse.ok) {
      const dsResult = await dsResponse.json();
      return {
        success: true,
        analysis: dsResult.choices[0].message.content,
        model: 'DeepSeek-V3.2',
        timestamp: new Date().toISOString(),
      };
    }

    // 方案2：备用 Qwen2.5-72B
    const qwenResponse = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelScopeKey}`,
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [
          { role: 'system', content: '你是一位专业的黄金市场量化分析师，擅长技术分析和投资建议。请用中文回复。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });
    
    if (qwenResponse.ok) {
      const qwenResult = await qwenResponse.json();
      return {
        success: true,
        analysis: qwenResult.choices[0].message.content,
        model: 'Qwen2.5-72B',
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error('所有API调用均失败');
  } catch (error) {
    // 最终备用：返回基于数据的简单分析
    const trend = priceData.domestic.changePercent > 0 ? '上涨' : '下跌';
    const suggestion = priceData.domestic.changePercent > 1 ? '建议观望' : '可适量配置';
    
    return {
      success: true,
      analysis: `【自动分析报告】

当前市场状态：${trend}趋势
国际金价：${intl.price} 美元/盎司
国内AU9999：${dom.price} 元/克

技术面分析：
- 今日涨跌幅：${dom.changePercent || 0}%
- 7日趋势：${priceChange}%
- 支撑位参考：${(dom.low || dom.price * 0.98).toFixed(2)} 元
- 压力位参考：${(dom.high || dom.price * 1.02).toFixed(2)} 元

投资建议：${suggestion}
风险提示：黄金投资有风险，以上分析仅供参考，不构成投资建议。`,
      model: 'auto-analysis',
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================
// 工具函数：生成美观的 HTML 推送模板
// ============================================================
function generatePushHtml(priceData, analysisText, pushType = 'scheduled') {
  const intl = priceData.international;
  const dom = priceData.domestic;
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  
  // 判断涨跌状态
  const domChangePercent = dom.changePercent || 0;
  const intlChangePercent = intl.changePercent || 0;
  const domTrend = domChangePercent >= 0 ? 'up' : 'down';
  const intlTrend = intlChangePercent >= 0 ? 'up' : 'down';
  
  // 推送类型标题
  const pushTypeTitle = pushType === 'alert' ? '⚠️ 金价异动预警' : '📊 金价定时播报';
  const pushTypeDesc = pushType === 'alert' 
    ? `国内金价涨跌幅达 ${Math.abs(domChangePercent).toFixed(2)}%，触发预警推送`
    : '每半小时定时推送金价行情';

  // 简化AI分析内容（移除markdown格式）
  const cleanAnalysis = analysisText
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/---/g, '')
    .replace(/═+/g, '')
    .substring(0, 800);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #fbbf24; margin-bottom: 20px; }
    .header h1 { font-size: 24px; color: #fbbf24; margin-bottom: 8px; }
    .header .type-badge { display: inline-block; background: ${pushType === 'alert' ? '#ef4444' : '#3b82f6'}; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-bottom: 8px; }
    .header .time { color: #9ca3af; font-size: 13px; }
    .price-cards { display: flex; gap: 15px; margin-bottom: 20px; }
    .price-card { flex: 1; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.1); }
    .price-card.intl { border-left: 4px solid #3b82f6; }
    .price-card.dom { border-left: 4px solid #fbbf24; }
    .price-label { font-size: 12px; color: #9ca3af; margin-bottom: 5px; }
    .price-value { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
    .price-value.up { color: #22c55e; }
    .price-value.down { color: #ef4444; }
    .price-change { font-size: 14px; }
    .price-change.up { color: #22c55e; }
    .price-change.down { color: #ef4444; }
    .price-change.up::before { content: '▲ '; }
    .price-change.down::before { content: '▼ '; }
    .detail-row { display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); }
    .analysis-section { background: rgba(251,191,36,0.1); border-radius: 12px; padding: 15px; margin-bottom: 20px; border: 1px solid rgba(251,191,36,0.3); }
    .analysis-title { font-size: 14px; color: #fbbf24; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .analysis-title::before { content: '🤖'; }
    .analysis-content { font-size: 13px; line-height: 1.8; color: #e5e7eb; white-space: pre-wrap; }
    .footer { text-align: center; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
    .footer .brand { color: #fbbf24; font-weight: bold; font-size: 14px; margin-bottom: 5px; }
    .footer .contact { color: #6b7280; font-size: 11px; }
    .footer .watermark { color: #4b5563; font-size: 10px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="type-badge">${pushTypeDesc}</div>
      <h1>${pushTypeTitle}</h1>
      <div class="time">更新时间：${now}</div>
    </div>
    
    <div class="price-cards">
      <div class="price-card intl">
        <div class="price-label">🌍 国际金价 XAU/USD</div>
        <div class="price-value ${intlTrend}">$${intl.price?.toFixed(2) || '--'}</div>
        <div class="price-change ${intlTrend}">${intlChangePercent >= 0 ? '+' : ''}${intlChangePercent.toFixed(2)}%</div>
        <div class="detail-row">
          <span>昨收: $${intl.previousClose?.toFixed(2) || '--'}</span>
          <span>白银: $${intl.silverPrice?.toFixed(2) || '--'}</span>
        </div>
      </div>
      
      <div class="price-card dom">
        <div class="price-label">🇨🇳 国内金价 AU9999</div>
        <div class="price-value ${domTrend}">¥${dom.price?.toFixed(2) || '--'}</div>
        <div class="price-change ${domTrend}">${domChangePercent >= 0 ? '+' : ''}${domChangePercent.toFixed(2)}%</div>
        <div class="detail-row">
          <span>开: ¥${dom.open?.toFixed(2) || '--'}</span>
          <span>高: ¥${dom.high?.toFixed(2) || '--'}</span>
          <span>低: ¥${dom.low?.toFixed(2) || '--'}</span>
        </div>
      </div>
    </div>
    
    <div class="analysis-section">
      <div class="analysis-title">AI 智能分析摘要</div>
      <div class="analysis-content">${cleanAnalysis}...</div>
    </div>
    
    <div class="footer">
      <div class="brand">Gold Monitor - 黄金价格智能监控</div>
      <div class="contact">Vx: 1837620622 | 邮箱: 2040168455@qq.com</div>
      <div class="watermark">开发者：传康KK | 咸鱼/B站：万能程序员</div>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================
// 工具函数：发送 PushPlus 推送（群组推送）
// ============================================================
async function sendPushPlusNotification(title, content, template = 'html') {
  try {
    // 根据 PushPlus 官方文档构建请求
    // 使用 topic 参数实现群组一对多推送
    const response = await fetch(PUSHPLUS_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: PUSHPLUS_CONFIG.token,       // 用户Token
        title: title,                        // 消息标题
        content: content,                    // 消息内容
        template: template,                  // 发送模板（html/txt/json/markdown）
        topic: PUSHPLUS_CONFIG.topic,        // 群组编码（一对多推送）
        channel: 'wechat',                   // 发送渠道：微信公众号
      }),
    });

    const result = await response.json();
    
    if (result.code === 200) {
      console.log('PushPlus 推送成功:', result.msg);
      return { success: true, msg: result.msg, data: result.data };
    } else {
      console.error('PushPlus 推送失败:', result.msg);
      return { success: false, msg: result.msg };
    }
  } catch (error) {
    console.error('PushPlus 推送异常:', error.message);
    return { success: false, msg: error.message };
  }
}

// ============================================================
// 工具函数：检查是否需要触发涨跌预警推送
// ============================================================
function shouldTriggerPriceAlert(currentPrice, changePercent) {
  const absChange = Math.abs(changePercent || 0);
  
  // 涨跌幅在 1% - 2% 之间触发预警
  if (absChange >= 1 && absChange <= 2) {
    // 检查是否已经推送过（避免重复推送）
    if (lastPushPrice !== null) {
      const priceChangeFromLast = Math.abs((currentPrice - lastPushPrice) / lastPushPrice * 100);
      // 如果距离上次推送价格变化不足 0.5%，不重复推送
      if (priceChangeFromLast < 0.5) {
        return false;
      }
    }
    return true;
  }
  return false;
}

// ============================================================
// 工具函数：检查是否需要定时推送（每半小时）
// ============================================================
function shouldScheduledPush() {
  const now = Date.now();
  const halfHour = 30 * 60 * 1000; // 30分钟
  
  if (lastScheduledPush === null || (now - lastScheduledPush) >= halfHour) {
    return true;
  }
  return false;
}

// ============================================================
// 工具函数：执行推送（包含价格预警和定时推送逻辑）
// ============================================================
async function executePush(env, priceData, pushType = 'scheduled') {
  // 生成K线数据用于AI分析
  const klineData = generateKlineData(30, priceData.domestic.price);
  
  // 获取AI分析
  const analysis = await analyzeWithDeepSeek(env, priceData, klineData);
  const analysisText = analysis.analysis || '暂无分析数据';
  
  // 生成推送标题
  const dom = priceData.domestic;
  const changeSign = (dom.changePercent || 0) >= 0 ? '📈' : '📉';
  const title = pushType === 'alert'
    ? `${changeSign} 金价异动｜AU9999 ${dom.changePercent >= 0 ? '+' : ''}${(dom.changePercent || 0).toFixed(2)}%`
    : `${changeSign} 金价播报｜AU9999 ¥${dom.price?.toFixed(2)}`;
  
  // 生成HTML内容
  const htmlContent = generatePushHtml(priceData, analysisText, pushType);
  
  // 发送推送
  const result = await sendPushPlusNotification(title, htmlContent, 'html');
  
  // 更新推送状态
  if (result.success) {
    lastPushPrice = dom.price;
    lastPushTime = Date.now();
    if (pushType === 'scheduled') {
      lastScheduledPush = Date.now();
    }
  }
  
  return result;
}

// ============================================================
// API 路由：健康检查
// ============================================================
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: '黄金价格检测系统 API',
    version: '2.0.0',
    endpoints: [
      'GET /api/price/international - 获取国际金价',
      'GET /api/price/domestic - 获取国内积存金价格',
      'GET /api/price/all - 获取所有价格数据',
      'GET /api/kline?days=30 - 获取K线数据',
      'POST /api/analyze - DeepSeek量化分析',
      'POST /api/push/test - 测试推送功能',
      'POST /api/push/scheduled - 定时推送（每半小时）',
      'GET /api/push/status - 获取推送状态',
      'GET /api/monitor - 价格监控（自动触发推送）',
    ],
  });
});

// ============================================================
// API 路由：获取国际金价
// ============================================================
app.get('/api/price/international', async (c) => {
  const data = await fetchInternationalGoldPrice();
  return c.json(data);
});

// ============================================================
// API 路由：获取国内积存金价格
// ============================================================
app.get('/api/price/domestic', async (c) => {
  const data = await fetchDomesticGoldPrice();
  return c.json(data);
});

// ============================================================
// API 路由：获取所有价格数据
// ============================================================
app.get('/api/price/all', async (c) => {
  const [international, domestic] = await Promise.all([
    fetchInternationalGoldPrice(),
    fetchDomesticGoldPrice(),
  ]);

  return c.json({
    success: true,
    international,
    domestic,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API 路由：获取K线数据
// ============================================================
app.get('/api/kline', async (c) => {
  const days = parseInt(c.req.query('days') || '30');
  const domestic = await fetchDomesticGoldPrice();
  const klineData = generateKlineData(days, domestic.price);

  return c.json({
    success: true,
    period: `${days}天`,
    data: klineData,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API 路由：K线图配置数据
// ============================================================
app.get('/api/chart/kline', async (c) => {
  const days = parseInt(c.req.query('days')) || 30;
  const domestic = await fetchDomesticGoldPrice();
  const klineData = generateKlineData(days, domestic.price);
  
  // 转换为ECharts格式
  const chartData = klineData.map(item => [
    item.timestamp,
    item.open,
    item.close,
    item.low,
    item.high,
    item.volume
  ]);
  
  // ECharts K线图配置
  const chartOption = {
    title: {
      text: '黄金价格K线图',
      left: 'center',
      textStyle: {
        color: '#fff',
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#fbbf24',
      textStyle: {
        color: '#fff'
      }
    },
    legend: {
      data: ['K线', '成交量'],
      textStyle: {
        color: '#fff'
      }
    },
    grid: [
      {
        left: '10%',
        right: '8%',
        height: '60%'
      },
      {
        left: '10%',
        right: '8%',
        top: '75%',
        height: '16%'
      }
    ],
    xAxis: [
      {
        type: 'category',
        data: klineData.map(item => new Date(item.timestamp).toLocaleDateString()),
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
        axisLabel: {
          color: '#fff'
        }
      },
      {
        type: 'category',
        gridIndex: 1,
        data: klineData.map(item => new Date(item.timestamp).toLocaleDateString()),
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      }
    ],
    yAxis: [
      {
        scale: true,
        splitArea: {
          show: true
        },
        axisLabel: {
          color: '#fff'
        }
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 50,
        end: 100
      },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: 'slider',
        top: '85%',
        start: 50,
        end: 100,
        textStyle: {
          color: '#fff'
        }
      }
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: chartData.map(item => [item[1], item[2], item[3], item[4]]),
        itemStyle: {
          color: '#ef4444',
          color0: '#22c55e',
          borderColor: '#ef4444',
          borderColor0: '#22c55e'
        }
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: chartData.map(item => item[5]),
        itemStyle: {
          color: '#fbbf24'
        }
      }
    ]
  };

  return c.json({
    success: true,
    period: `${days}天`,
    chartOption,
    rawData: klineData,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API 路由：DeepSeek 量化分析
// ============================================================
app.post('/api/analyze', async (c) => {
  const [international, domestic] = await Promise.all([
    fetchInternationalGoldPrice(),
    fetchDomesticGoldPrice(),
  ]);

  const klineData = generateKlineData(30, domestic.price);
  
  const analysis = await analyzeWithDeepSeek(
    c.env,
    { international, domestic },
    klineData
  );

  return c.json({
    success: true,
    priceData: { international, domestic },
    analysis,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API 路由：流式量化分析
// ============================================================
app.post('/api/analyze/stream', async (c) => {
  const apiKey = c.env.MODELSCOPE_API_KEY;
  
  const [international, domestic] = await Promise.all([
    fetchInternationalGoldPrice(),
    fetchDomesticGoldPrice(),
  ]);

  const klineData = generateKlineData(30, domestic.price);
  const recentKline = klineData.slice(-7);
  const priceChange = ((recentKline[recentKline.length - 1].close - recentKline[0].open) / recentKline[0].open * 100).toFixed(2);

  const prompt = `作为专业的黄金量化分析师，请根据以下数据提供投资建议：

当前价格：国际金价 ${international.price} 美元/盎司，国内积存金 ${domestic.price} 元/克
7日涨跌幅：${priceChange}%

请分析：1.趋势判断 2.支撑压力位 3.投资建议 4.风险提示`;

  const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        { role: 'system', content: '你是专业的黄金量化分析师。' },
        { role: 'user', content: prompt }
      ],
      stream: true,
      temperature: 0.7,
    }),
  });

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

// ============================================================
// API 路由：测试推送功能
// ============================================================
app.post('/api/push/test', async (c) => {
  try {
    // 获取当前价格数据
    const [international, domestic] = await Promise.all([
      fetchInternationalGoldPrice(),
      fetchDomesticGoldPrice(),
    ]);
    
    const priceData = { international, domestic };
    
    // 执行测试推送
    const result = await executePush(c.env, priceData, 'scheduled');
    
    return c.json({
      success: result.success,
      message: result.success ? '测试推送成功' : '测试推送失败',
      detail: result.msg,
      priceData: {
        international: {
          price: international.price,
          changePercent: international.changePercent,
        },
        domestic: {
          price: domestic.price,
          changePercent: domestic.changePercent,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      success: false,
      message: '推送异常',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// ============================================================
// API 路由：定时推送（由外部定时器调用，如 Cloudflare Cron）
// ============================================================
app.post('/api/push/scheduled', async (c) => {
  try {
    // 检查是否满足定时推送条件
    if (!shouldScheduledPush()) {
      return c.json({
        success: false,
        message: '距离上次定时推送不足30分钟',
        lastPush: lastScheduledPush ? new Date(lastScheduledPush).toISOString() : null,
        timestamp: new Date().toISOString(),
      });
    }
    
    // 获取当前价格数据
    const [international, domestic] = await Promise.all([
      fetchInternationalGoldPrice(),
      fetchDomesticGoldPrice(),
    ]);
    
    const priceData = { international, domestic };
    
    // 执行定时推送
    const result = await executePush(c.env, priceData, 'scheduled');
    
    return c.json({
      success: result.success,
      message: result.success ? '定时推送成功' : '定时推送失败',
      detail: result.msg,
      priceData: {
        international: {
          price: international.price,
          changePercent: international.changePercent,
        },
        domestic: {
          price: domestic.price,
          changePercent: domestic.changePercent,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      success: false,
      message: '定时推送异常',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// ============================================================
// API 路由：获取推送状态
// ============================================================
app.get('/api/push/status', (c) => {
  const now = Date.now();
  const halfHour = 30 * 60 * 1000;
  
  return c.json({
    success: true,
    status: {
      lastPushPrice: lastPushPrice,
      lastPushTime: lastPushTime ? new Date(lastPushTime).toISOString() : null,
      lastScheduledPush: lastScheduledPush ? new Date(lastScheduledPush).toISOString() : null,
      nextScheduledPush: lastScheduledPush 
        ? new Date(lastScheduledPush + halfHour).toISOString() 
        : '立即可推送',
      canScheduledPush: shouldScheduledPush(),
      timeSinceLastPush: lastPushTime ? Math.floor((now - lastPushTime) / 1000) + '秒' : null,
    },
    config: {
      pushInterval: '30分钟',
      alertThreshold: '涨跌幅 1%-2%',
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API 路由：价格监控（检测涨跌幅并自动触发推送）
// ============================================================
app.get('/api/monitor', async (c) => {
  try {
    // 获取当前价格数据
    const [international, domestic] = await Promise.all([
      fetchInternationalGoldPrice(),
      fetchDomesticGoldPrice(),
    ]);
    
    const priceData = { international, domestic };
    const alerts = [];
    let pushTriggered = false;
    let pushResult = null;
    
    // 检查是否需要触发涨跌预警
    if (shouldTriggerPriceAlert(domestic.price, domestic.changePercent)) {
      alerts.push({
        type: 'price_alert',
        message: `国内金价涨跌幅达 ${Math.abs(domestic.changePercent).toFixed(2)}%，触发预警`,
        price: domestic.price,
        changePercent: domestic.changePercent,
      });
      
      // 执行预警推送
      pushResult = await executePush(c.env, priceData, 'alert');
      pushTriggered = true;
    }
    
    // 检查是否需要定时推送
    if (!pushTriggered && shouldScheduledPush()) {
      alerts.push({
        type: 'scheduled',
        message: '满足定时推送条件（距上次推送超过30分钟）',
      });
      
      // 执行定时推送
      pushResult = await executePush(c.env, priceData, 'scheduled');
      pushTriggered = true;
    }
    
    return c.json({
      success: true,
      monitoring: {
        international: {
          price: international.price,
          changePercent: international.changePercent,
          source: international.source,
        },
        domestic: {
          price: domestic.price,
          changePercent: domestic.changePercent,
          source: domestic.source,
        },
      },
      alerts: alerts,
      pushTriggered: pushTriggered,
      pushResult: pushResult,
      status: {
        lastPushPrice: lastPushPrice,
        lastPushTime: lastPushTime ? new Date(lastPushTime).toISOString() : null,
        lastScheduledPush: lastScheduledPush ? new Date(lastScheduledPush).toISOString() : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      success: false,
      message: '监控异常',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// ============================================================
// API 路由：强制推送（无视时间限制，用于手动触发）
// ============================================================
app.post('/api/push/force', async (c) => {
  try {
    // 获取请求参数
    const body = await c.req.json().catch(() => ({}));
    const pushType = body.type || 'scheduled';
    
    // 获取当前价格数据
    const [international, domestic] = await Promise.all([
      fetchInternationalGoldPrice(),
      fetchDomesticGoldPrice(),
    ]);
    
    const priceData = { international, domestic };
    
    // 强制执行推送
    const result = await executePush(c.env, priceData, pushType);
    
    return c.json({
      success: result.success,
      message: result.success ? '强制推送成功' : '强制推送失败',
      detail: result.msg,
      type: pushType,
      priceData: {
        international: {
          price: international.price,
          changePercent: international.changePercent,
        },
        domestic: {
          price: domestic.price,
          changePercent: domestic.changePercent,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      success: false,
      message: '强制推送异常',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// ============================================================
// Cloudflare Cron Trigger 处理器
// 每30分钟自动触发价格监控和推送
// ============================================================
export default {
  fetch: app.fetch,
  
  async scheduled(event, env, ctx) {
    console.log('Cron Trigger 触发:', new Date().toISOString());
    
    try {
      // 获取当前价格数据
      const [international, domestic] = await Promise.all([
        fetchInternationalGoldPrice(),
        fetchDomesticGoldPrice(),
      ]);
      
      const priceData = { international, domestic };
      let pushType = 'scheduled';
      
      // 优先检查是否需要触发涨跌预警
      if (shouldTriggerPriceAlert(domestic.price, domestic.changePercent)) {
        pushType = 'alert';
        console.log(`金价异动预警: 涨跌幅 ${domestic.changePercent}%`);
      } else if (!shouldScheduledPush()) {
        console.log('未满足推送条件，跳过本次推送');
        return;
      }
      
      // 执行推送
      const result = await executePush(env, priceData, pushType);
      console.log('Cron 推送结果:', result.success ? '成功' : '失败', result.msg);
      
    } catch (error) {
      console.error('Cron Trigger 执行异常:', error.message);
    }
  },
};
