/**
 * 弹层滚动锁：多个弹层可以同时打开（例如数据源抽屉打开时再打开价格预警），
 * 因此用引用计数：每个弹层只释放自己的那一份，全部关闭后才恢复页面滚动。
 * 视口由 html 决定滚动（style.css 给 html 设了 overflow-x），所以 html 与 body 都要设置。
 */

let holders = 0;

function apply() {
  const value = holders > 0 ? 'hidden' : '';
  document.documentElement.style.overflow = value;
  document.body.style.overflow = value;
}

/**
 * 返回一个锁函数：传入 true 持有一份锁，传入 false 释放自己的那一份。
 * 重复调用同一状态不会重复计数。
 */
export function createScrollLock() {
  let held = false;
  return (locked) => {
    if (locked === held) return;
    held = locked;
    holders += locked ? 1 : -1;
    apply();
  };
}
