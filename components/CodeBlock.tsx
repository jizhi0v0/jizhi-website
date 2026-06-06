"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { createPortal } from "react-dom";
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

// 复制按钮：两个图标常驻、原地堆叠，由 CSS 按 data-copied 交叉淡入淡出。
// 不用 {copied ? A : B} 条件渲染：那样图标会在 copied 翻转的瞬间硬切换，
// 而按钮淡出（opacity 0.15s）尚未结束，会闪出一帧「复制」图标。CSS 给复原方向
// 加了 transition-delay，让图标等按钮淡出后再切回，消除这一帧闪烁。
function CopyButton({
  copied,
  onClick,
  label,
  className,
}: {
  copied: boolean;
  onClick: () => void;
  label: string;
  className: string;
}) {
  return (
    // aria-label 保持「复制」不变（不随状态切换）：焦点已在按钮上时切名字读屏不会主动播报，
    // 且会让 AT「忘记当前按钮是什么」。复制成功的反馈交给下方 aria-live 状态节点。
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={label}
      data-copied={copied ? "" : undefined}
    >
      <svg className="icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      <svg className="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>
  );
}

export function CodeBlock({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"pre">) {
  const ref = useRef<HTMLPreElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const mounted = useRef(true);
  const expandTriggerRef = useRef<HTMLButtonElement>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("code");

  // 卸载时停掉回退计时器、标记已卸载，避免 async 复制 resolve 后对已卸载组件 setState。
  useEffect(() => {
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    // 始终读内联的 pre（展开时它仍在 DOM 里，只是被 .app 的 inert 屏蔽，textContent 照常可取）。
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

  const closeModal = () => {
    // 先移除 inert，再 focus()——若先 setExpanded(false) 触发卸载 effect 之前 .app 仍 inert，
    // 触发元素收不到焦点（镜像 Lightbox 的处理）。
    document.querySelector(".app")?.removeAttribute("inert");
    setExpanded(false);
    expandTriggerRef.current?.focus();
  };

  // 展开时：焦点移到关闭按钮 + inert 封锁背景 Tab 序列 + Esc 关闭 + 禁止背景滚动。
  // 模态经 createPortal 挂到 <body>，与 .app 平级，故对 .app 加 inert 不会波及模态本身。
  useEffect(() => {
    if (!expanded) return;
    modalCloseRef.current?.focus();
    const appEl = document.querySelector(".app");
    appEl?.setAttribute("inert", "");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      appEl?.removeAttribute("inert");
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  return (
    <div className="code-block">
      <pre ref={ref} className={className} {...props}>
        {children}
      </pre>
      <CopyButton copied={copied} onClick={copy} label={t("copy")} className="code-copy" />
      {/* 移动端横向滚动看长配置体验差：提供「展开」按钮把代码放进居中卡片、长行自动换行完整呈现。 */}
      <button
        ref={expandTriggerRef}
        type="button"
        className="code-expand"
        onClick={() => setExpanded(true)}
        aria-label={t("expand")}
        aria-haspopup="dialog"
        aria-expanded={expanded}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>
      {/* 复制成功的读屏播报：常驻 live region，copied 时填入文案触发 polite 播报。
          模态打开时 .app 被加 inert（整棵子树移出无障碍树），这份会被屏蔽——
          那种情形改由下方 portal 内的同款节点播报；此份服务「模态关闭时」的复制。 */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? t("copied") : ""}
      </span>

      {expanded &&
        createPortal(
          <div
            className="code-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("expandedLabel")}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div className="code-modal-panel">
              {/* 复用同一份高亮后的 children；带上 rehype 注入的 className/style(--shiki-* 变量)，
                  配色与内联代码块一致。白底换行由 .code-modal-pre 的 CSS 接管（覆盖内联的 nowrap）。 */}
              <pre className={`code-modal-pre ${className ?? ""}`} {...props}>
                {children}
              </pre>
            </div>
            <CopyButton
              copied={copied}
              onClick={copy}
              label={t("copy")}
              className="code-copy code-modal-copy"
            />
            <button
              ref={modalCloseRef}
              type="button"
              className="lightbox-close code-modal-close"
              onClick={closeModal}
              aria-label={t("close")}
            >
              ✕
            </button>
            {/* 模态版 live region：随 portal 挂在 <body>、不在 inert 的 .app 子树内，
                故模态内点复制时 polite 播报能正常发出（内联那份此时被 inert 屏蔽）。 */}
            <span className="sr-only" role="status" aria-live="polite">
              {copied ? t("copied") : ""}
            </span>
          </div>,
          document.body,
        )}
    </div>
  );
}
