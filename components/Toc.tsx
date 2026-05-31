"use client";

import { useEffect, useLayoutEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
}

// 「当前阅读线」对齐 h2 的 scroll-margin-top(桌面 280px，见 globals.css）：
// 点击目录跳转后标题顶部恰停在 280px 处，阅读线设在略低于该值，保证点击的标题
// 立即被判为 active、向下滚动时高亮无空档。必须用固定像素而非 viewport 百分比——
// scroll-margin-top 是固定值，按百分比在矮屏上会偏高（如 900px*0.2=180<280），
// 导致点第二项却高亮第一项、且要多滑一段才更新。
const ACTIVE_LINE = 290;

// useLayoutEffect 在 SSR 会告警；客户端用 layout 版本，使挂载时的 compute 在首帧前
// 完成定位，消除“刷新到中段先闪第一项”。
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Toc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useIsoLayoutEffect(() => {
    if (items.length === 0) return;

    // 基于滚动位置计算 active：取「最后一个顶部已越过阈值线的标题」。
    // IntersectionObserver 只在标题落入窄带时触发，触底刷新时所有标题都在带上方、
    // 回调不会被调用，导致 activeId 停在初始的第一项——这里改为直接按位置判定。
    // items 在 effect 生命周期内稳定，元素引用缓存一次，避免每帧重复 getElementById。
    const els = items.map((it) => document.getElementById(it.id));

    const compute = () => {
      const viewport = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      // 触底时强制高亮最后一项（末节常短于一屏，进不了阈值线以上的判定）。
      // 必须先确认文档真的溢出视口，否则短页面 scrollHeight≈innerHeight 会从一开始就误判触底、
      // 让顶部也高亮最后一项。
      const atBottom =
        docHeight > viewport && viewport + window.scrollY >= docHeight - 2;
      if (atBottom) {
        setActiveId(items[items.length - 1].id);
        return;
      }
      let current = items[0].id;
      for (let i = 0; i < items.length; i++) {
        const el = els[i];
        if (el && el.getBoundingClientRect().top <= ACTIVE_LINE) {
          current = items[i].id;
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
