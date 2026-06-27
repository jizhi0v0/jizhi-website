"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";

/**
 * 返回链接：站内有来处（比如从另一篇 post 跳转过来）就回退到上一页，
 * 否则（新标签 / 外链直达 / 无 JS）按 href 兜底到首页。
 *
 * 仍渲染成真正的 <a href>，所以 SSR 和禁用 JS 时也能用。
 */
export function BackLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (
          typeof window !== "undefined" &&
          window.history.length > 1 &&
          // 普通左键、无修饰键时才接管；Cmd/Ctrl+点击等仍走原生新开
          e.button === 0 &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey
        ) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {children}
    </Link>
  );
}
