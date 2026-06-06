"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { useTranslations } from "next-intl";

// rehype-pretty-code 把每行渲染为 <span data-line>（display:block，但 textContent 不含换行）。
// 直接取 code.textContent 会把所有行连成一行，故按 data-line 逐行取再用 \n 拼回；
// 没有 data-line 时（理论上不会）回退到整段 textContent。
function codeText(pre: HTMLElement): string {
  const lines = pre.querySelectorAll("code [data-line]");
  if (lines.length) return Array.from(lines, (l) => l.textContent ?? "").join("\n");
  return pre.querySelector("code")?.textContent ?? "";
}

export function CodeBlock({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  const ref = useRef<HTMLPreElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const t = useTranslations("code");

  // 卸载时清掉未触发的回退计时器，避免对已卸载组件 setState。
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const pre = ref.current;
    if (!pre) return;
    try {
      await navigator.clipboard.writeText(codeText(pre));
      setCopied(true);
      // 连点时重置 1.5s 窗口，而非叠加多个计时器。
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard 在非安全上下文 / 无权限时不可用，静默失败。
    }
  };

  return (
    <div className="code-block">
      <pre ref={ref} {...props}>
        {children}
      </pre>
      <button
        type="button"
        className="code-copy"
        onClick={copy}
        aria-label={copied ? t("copied") : t("copy")}
        data-copied={copied ? "" : undefined}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
