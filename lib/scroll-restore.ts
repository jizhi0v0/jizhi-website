// 内联到 <head> 的 boot 脚本字符串：处理 iOS Safari pull-to-refresh 时
// 「先闪一下顶部 → 再恢复滚动位置」的脏帧。
//
// 浏览器默认 scrollRestoration='auto' 在 iOS Safari reload 路径下的实际
// 时序是：浏览器先按 scrollTop=0 画一帧，再异步还原到上次位置；用户因此
// 看到「跳回顶部」→「跳回原位」的两帧抖动。
//
// 这里只在 reload + 有可还原位置时介入：改 manual + 同步给 <html> 打
// data-restoring 让 .app 走 visibility:hidden（globals.css 中的规则），
// DOMContentLoaded 后自己 scrollTo + 双 rAF 撤遮罩，用户视感是「刷新完直
// 接停在原位」。普通 SPA 跳转/首次进入/bfcache 不动浏览器默认行为，避免
// 干扰 Next.js router 的滚动管理。
//
// 兼容性：
//  - bfcache（pageshow event.persisted=true）：浏览器自己保滚动，performance
//    navigation type 也不是 'reload'，自然不会进入还原分支。
//  - sessionStorage 失败（Safari 隐私模式）：try/catch 兜底退化到默认。
//  - 3 秒兜底解锁，永不卡死页面。

const RAW = `
(function(){
  try {
    if (!('sessionStorage' in window)) return;
    var KEY = 'jz:y:' + location.pathname + location.search;
    var SS = sessionStorage;

    // 只在 reload 路径介入：普通 SPA 跳转、首次进入、点链接走的还是 Next.js
    // router 自己的滚动逻辑（保持 history.scrollRestoration 默认值）。
    var isReload = false;
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation');
      if (nav && nav[0] && nav[0].type === 'reload') isReload = true;
    } catch(e) {}

    var saved = parseInt(SS.getItem(KEY) || '0', 10) || 0;

    if (isReload && saved > 0) {
      // 改 manual + 标 data-restoring：浏览器不再用「scrollTop=0 画一帧、再异步
      // 还原」的默认时序；同步遮罩 .app（globals.css 有 visibility:hidden 规则），
      // DOMContentLoaded 后我们自己 scrollTo + 撤遮罩。
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      document.documentElement.setAttribute('data-restoring', '');
    }

    function restore() {
      if (isReload && saved > 0) {
        window.scrollTo(0, saved);
        // rAF 套两层：第一帧滚动生效后，第二帧再撤遮罩；避免「先看到顶部」一帧。
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){
            document.documentElement.removeAttribute('data-restoring');
          });
        });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', restore, { once: true });
    } else {
      restore();
    }

    // 兜底：3 秒内一定撤遮罩，永不因脚本/资源异常卡住整张页面。
    setTimeout(function(){
      document.documentElement.removeAttribute('data-restoring');
    }, 3000);

    // 滚动时节流写入；pagehide 兜底（iOS 不可靠的 beforeunload 用 pagehide 替代）。
    var t = 0;
    function save() {
      try { SS.setItem(KEY, String(window.scrollY|0)); } catch(e) {}
    }
    addEventListener('scroll', function(){
      if (t) return;
      t = setTimeout(function(){ t = 0; save(); }, 150);
    }, { passive: true });
    addEventListener('pagehide', save);
    addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'hidden') save();
    });
  } catch(e) {
    // 出错时静默：宁可回退到浏览器默认行为，也别因脚本异常黑屏。
    try { document.documentElement.removeAttribute('data-restoring'); } catch(_) {}
  }
})();
`;

// 去掉首尾换行与注释里的换行后压缩为单行，便于 inline 到 HTML
export const SCROLL_RESTORE_SCRIPT = RAW.trim();
