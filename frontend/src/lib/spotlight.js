/**
 * ============================================================
 * 卡片指针高光
 * 指针经过 .card 时，把指针相对卡片的坐标写入 --mx / --my，
 * 由 style.css 中 .card::before 绘制柔和的金色高光。只改颜色，不做位移。
 * 只在精确指针（鼠标、触控板）上启用：触屏与平板没有悬停，
 * 直接返回，不注册任何 pointermove 监听。
 * ============================================================
 */

export function initSpotlight() {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let frame = 0;
  let card = null;
  let x = 0;
  let y = 0;

  const flush = () => {
    frame = 0;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${x - rect.left}px`);
    card.style.setProperty('--my', `${y - rect.top}px`);
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      const target = event.target instanceof Element ? event.target.closest('.card') : null;
      card = target;
      if (!target) return;
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(flush);
    },
    { passive: true }
  );
}
