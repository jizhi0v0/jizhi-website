"use client";

import { useEffect, useState } from "react";

// 点击正文里的截图放大查看；点遮罩或按 Esc 关闭。
// 用事件委托监听 .post-img，无需改 MDX 里的每张图。
export function Lightbox() {
  const [img, setImg] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "IMG" && t.classList.contains("post-img")) {
        const el = t as HTMLImageElement;
        setImg({ src: el.currentSrc || el.src, alt: el.alt });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!img) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImg(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [img]);

  if (!img) return null;
  return (
    <div className="lightbox" onClick={() => setImg(null)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.src} alt={img.alt} />
    </div>
  );
}
