"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// 点击（或 Enter/Space）正文里的截图放大查看；点遮罩、按关闭按钮或 Esc 关闭。
// 用事件委托监听 .post-img，无需改 MDX 里的每张图。
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
    setImg(null);
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  };

  // Esc 关闭 + inert 封锁背景 Tab 序列（让 aria-modal 承诺成立）+ 禁止背景滚动
  useEffect(() => {
    if (!img) return;
    // 打开后把焦点移到关闭按钮
    closeRef.current?.focus();
    // inert 让 .app 内所有元素退出 Tab 序列，彻底封闭对话框外的焦点——
    // 比手动 Tab 循环更稳健，将来 Lightbox 增加可聚焦元素也不需要改这里。
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
  return (
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
    </div>
  );
}
