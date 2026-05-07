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
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveId(e.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
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
