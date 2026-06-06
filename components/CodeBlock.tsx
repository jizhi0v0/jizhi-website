"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { useTranslations } from "next-intl";

// rehype-pretty-code 把每行渲染为 <span data-line>（display:block，但 textContent 不含换行）。
// 直接取 code.textContent 会把所有行连成一行，故按 data-line 逐行取再用 \n 拼回；
// 没有 data-line 时（理论上不会）回退到整段 textContent。
// 约束：依赖「data-line 内只有代码文本」。若将来在 lib/mdx.ts 的 prettyCodeOptions 里启用
// transformers（行号 gutter、diff +/- 标注等），那些注入节点会被一并 textContent 进剪贴板，
// 届时需改成读 MDX source 原文或在此过滤。
function codeText(pre: HTMLElement): string {
  const lines = pre.querySelectorAll("code [data-line]");
  if (lines.length) return Array.from(lines, (l) => l.textContent ?? "").join("\n");
  return pre.querySelector("code")?.textContent ?? "";
}

// navigator.clipboard.writeText 会在「文档未聚焦」(NotAllowedError)、非安全上下文、
// 被 Permissions-Policy 拦截等情况下拒绝——此时复制其实没发生、按钮却拿不到成功反馈。
// 退回 execCommand("copy")：它只需选区 + 用户手势（点击即满足），不要求文档聚焦，
// 覆盖前者失败的场景（典型即 iOS 上 Telegram/微信等内嵌 webview）。返回是否真的复制成功。
function legacyCopy(text: string): boolean {
  // select() 会抢走焦点与用户当前选区，复制后还原：键盘用户不丢「复制」按钮焦点，
  // 正在别处划选的文字也不被清掉。
  const prevFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const sel = document.getSelection();
  const savedRange =
    sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

  let ok = false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", ""); // 防止 iOS 弹软键盘
    ta.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(ta);

    // iOS Safari / 内嵌 webview：单纯 readonly+select() 常 execCommand 返回 true 但剪贴板为空
    // （误报成功，比没反馈更难排查）。需 contentEditable + Range + setSelectionRange 才稳。
    if (/ipad|iphone|ipod/i.test(navigator.userAgent)) {
      ta.contentEditable = "true";
      const range = document.createRange();
      range.selectNodeContents(ta);
      sel?.removeAllRanges();
      sel?.addRange(range);
      ta.setSelectionRange(0, text.length);
    } else {
      ta.select();
    }

    ok = document.execCommand("copy");
    ta.remove();
  } catch {
    ok = false;
  }

  if (savedRange && sel) {
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
  prevFocus?.focus({ preventScroll: true }); // preventScroll：避免 (0,0) 的 textarea 把短页滚到顶
  return ok;
}

export function CodeBlock({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  const ref = useRef<HTMLPreElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const mounted = useRef(true);
  const [copied, setCopied] = useState(false);
  const t = useTranslations("code");

  // 卸载时停掉回退计时器、标记已卸载，避免 async 复制 resolve 后对已卸载组件 setState。
  useEffect(() => {
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    const pre = ref.current;
    if (!pre) return;
    const text = codeText(pre);
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      // 安全上下文里也可能因「文档未聚焦」等被拒，落到下面的 execCommand 兜底。
    }
    if (!ok) ok = legacyCopy(text);
    if (!ok || !mounted.current) return; // 真失败不给假反馈；已卸载不 setState
    setCopied(true);
    // 连点时重置 1.5s 窗口，而非叠加多个计时器。
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-block">
      <pre ref={ref} {...props}>
        {children}
      </pre>
      {/* aria-label 保持「复制」不变（不随状态切换）：焦点已在按钮上时切名字读屏不会主动播报，
          且会让 AT「忘记当前按钮是什么」。复制成功的反馈交给下方 aria-live 状态节点。 */}
      <button
        type="button"
        className="code-copy"
        onClick={copy}
        aria-label={t("copy")}
        data-copied={copied ? "" : undefined}
      >
        {/* 两个图标常驻、原地堆叠，由 CSS 按 data-copied 交叉淡入淡出。
            不用 {copied ? A : B} 条件渲染：那样图标会在 copied 翻转的瞬间硬切换，
            而按钮淡出（opacity 0.15s）尚未结束，会闪出一帧「复制」图标。CSS 给复原方向
            加了 transition-delay，让图标等按钮淡出后再切回，消除这一帧闪烁。 */}
        <svg className="icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <svg className="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </button>
      {/* 复制成功的读屏播报：常驻 live region，copied 时填入文案触发 polite 播报。 */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? t("copied") : ""}
      </span>
    </div>
  );
}
