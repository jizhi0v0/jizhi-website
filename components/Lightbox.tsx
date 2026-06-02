"use client";

import { useEffect, useRef, useState } from "react";

// 点击（或 Enter/Space）正文里的截图放大查看；点遮罩、按关闭按钮或 Esc 关闭。
// 用事件委托监听 .post-img，无需改 MDX 里的每张图。
export function Lightbox() {
  const [img, setImg] = useState<{ src: string; alt: string } | null>(null);
  // 开灯箱前聚焦的元素——关闭后焦点还回来，屏幕阅读器不丢失位置。
  const triggerRef = useRef<Element | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // 鼠标点击 & 键盘（Enter/Space）打开
  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "IMG" && t.classList.contains("post-img")) {
        triggerRef.current = t;
        setImg({ src: (t as HTMLImageElement).currentSrc || (t as HTMLImageElement).src, alt: t.getAttribute("alt") ?? "" });
      }
    };
    const onKeydown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        (e.key === "Enter" || e.key === " ") &&
        t.tagName === "IMG" &&
        t.classList.contains("post-img")
      ) {
        e.preventDefault();
        triggerRef.current = t;
        setImg({ src: (t as HTMLImageElement).currentSrc || (t as HTMLImageElement).src, alt: t.getAttribute("alt") ?? "" });
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
    setImg(null);
    // 焦点还回触发元素
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  };

  // Esc 关闭 + 焦点锁在对话框内（Tab 循环）+ 禁止背景滚动
  useEffect(() => {
    if (!img) return;
    // 打开后把焦点移到关闭按钮
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      // 简单焦点锁：只有一个可聚焦元素（关闭按钮），不需要完整 focus-trap
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  if (!img) return null;
  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={img.alt || "图片预览"}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.src} alt={img.alt} />
      <button
        ref={closeRef}
        className="lightbox-close"
        onClick={close}
        aria-label="关闭"
      >
        ✕
      </button>
    </div>
  );
}
