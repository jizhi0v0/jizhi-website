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
      {/* aria-label 保持「复制」不变（不随状态切换）：焦点已在按钮上时切名字读屏不会主动播报，
          且会让 AT「忘记当前按钮是什么」。复制成功的反馈交给下方 aria-live 状态节点。 */}
      <button
        type="button"
        className="code-copy"
        onClick={copy}
        aria-label={t("copy")}
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
      {/* 复制成功的读屏播报：常驻 live region，copied 时填入文案触发 polite 播报。 */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? t("copied") : ""}
      </span>
    </div>
  );
}
