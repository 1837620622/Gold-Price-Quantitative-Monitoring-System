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
  // 优雅转化 DeepSeek-R1 模型的 <think> 思考链标签为专业推演引用框
  str = str.replace(/<think>([\s\S]*?)<\/think>/gi, (_, thinkContent) => {
    const cleanContent = thinkContent.trim().replace(/\n/g, '\n> ');
    return `\n\n> 🧠 **AI 深度量化推理过程**\n>\n> ${cleanContent}\n\n`;
  });
  const html = marked.parse(str, { async: false, gfm: true, breaks: true });
  return DOMPurify.sanitize(html);
}
