/**
 * ============================================================
 * AI 报告 Markdown 渲染
 * 模型输出属于不可信内容：渲染后必须经 DOMPurify 消毒，再交给 v-html
 * ============================================================
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// 外链统一新窗口打开，并阻止 opener 泄露
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(text) {
  if (!text) return '';
  let str = String(text);
  // 彻底剔除 DeepSeek-R1 模型的 <think> 思考链标签，严禁泄漏思考过程
  str = str.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  str = str.replace(/^<think>[\s\S]*?(?=\n\n|##)/s, '').trim();
  const html = marked.parse(str, { async: false, gfm: true, breaks: true });
  return DOMPurify.sanitize(html);
}
