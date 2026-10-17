/**
 * ============================================================
 * 动效基础：GSAP 与 ScrollTrigger 只在这里注册一次
 * 所有需要滚动驱动或补间动画的组件都从这里引入，避免重复注册
 * ============================================================
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

// 用户开启“减少动态效果”时，所有滚动驱动与循环动画都应退化为静态呈现
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
