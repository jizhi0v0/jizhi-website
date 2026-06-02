"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

// 点击（或 Enter/Space）正文里的截图放大查看；点遮罩、按关闭按钮或 Esc 关闭。
// 用事件委托监听 .post-img，无需改 MDX 里的每张图。
//
// 模态结构：createPortal 把 <div.lightbox> 挂到 <body> 下，而不是留在 .app 内。
// 好处：对 .app 加 inert 封锁背景时，灯箱本身不受影响（inert 按子树传播）。
export function Lightbox() {
  const t = useTranslations("lightbox");
  const [img, setImg] = useState<{ src: string; alt: string } | null>(null);
  // 开灯箱前聚焦的元素——关闭后焦点还回来，屏幕阅读器不丢失位置。
  const triggerRef = useRef<Element | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // 鼠标点击 & 键盘（Enter/Space）打开
  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && target.classList.contains("post-img")) {
        triggerRef.current = target;
        setImg({
          src: (target as HTMLImageElement).currentSrc || (target as HTMLImageElement).src,
          alt: target.getAttribute("alt") ?? "",
        });
      }
    };
    const onKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        (e.key === "Enter" || e.key === " ") &&
        target.tagName === "IMG" &&
        target.classList.contains("post-img")
      ) {
        e.preventDefault();
        triggerRef.current = target;
        setImg({
          src: (target as HTMLImageElement).currentSrc || (target as HTMLImageElement).src,
          alt: target.getAttribute("alt") ?? "",
        });
      }
    };
    document.addEventListener("click", onPointer);
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("click", onPointer);
      document.removeEventListener("keydown", onKeydown);
    };
  }, []);

  const close = () => {
    // 先移除 inert，再 focus()——effect cleanup 在 commit 后才跑，
    // 若先 setImg(null) 再 focus()，.app 仍 inert，触发元素收不到焦点。
    document.querySelector(".app")?.removeAttribute("inert");
    setImg(null);
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  };

  // Esc 关闭 + 焦点移到关闭按钮 + inert 封锁背景 Tab 序列 + 禁止背景滚动
  useEffect(() => {
    if (!img) return;
    closeRef.current?.focus();
    // inert 加到 .app，把 Header/main/Footer 整体退出 Tab 序列。
    // Lightbox 经 createPortal 挂到 <body>，与 .app 平级，不受 inert 影响。
    const appEl = document.querySelector(".app");
    appEl?.setAttribute("inert", "");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      appEl?.removeAttribute("inert");
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  if (!img) return null;
  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={img.alt || t("previewFallback")}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.src} alt={img.alt} />
      <button
        ref={closeRef}
        className="lightbox-close"
        onClick={close}
        aria-label={t("close")}
      >
        ✕
      </button>
    </div>,
    document.body
  );
}
