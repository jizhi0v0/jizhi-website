"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
}

export function Toc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (items.length === 0) return;

    // 基于滚动位置计算 active：取「最后一个顶部已越过阈值线的标题」。
    // IntersectionObserver 只在标题落入窄带时触发，触底刷新时所有标题都在带上方、
    // 回调不会被调用，导致 activeId 停在初始的第一项——这里改为直接按位置判定。
    const compute = () => {
      // 触底时强制高亮最后一项（最后一节往往短于一屏，永远进不了阈值线以上的判定）
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActiveId(items[items.length - 1].id);
        return;
      }
      const threshold = window.innerHeight * 0.2;
      let current = items[0].id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = it.id;
        }
      }
      setActiveId(current);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        compute();
        ticking = false;
      });
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  if (items.length === 0) return null;
  return (
    <aside className="toc">
      <div className="toc-inner">
        <div className="toc-title">目录</div>
        {items.map((it) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={"toc-item " + (activeId === it.id ? "active" : "")}
          >
            {it.text}
          </a>
        ))}
      </div>
    </aside>
  );
}
