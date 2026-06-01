"use client";

import { useEffect, useLayoutEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
}

// TOC 仅在 ≥1080px 显示（见 globals.css），窄屏不挂监听、不做无用的滚动计算。
const TOC_QUERY = "(min-width: 1080px)";

// 「当前阅读线」从 CSS 变量 --h2-scroll-margin 推导（标题点击/锚点跳转后恰停在
// 该位置），再加少量余量让标题刚抵达就判为 active、向下滚动无空档。运行时读取而非
// 硬编码，确保与 globals.css 单一真源同步——避免「改了 scroll-margin、判定线没跟上」。
function readActiveLine() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--h2-scroll-margin",
  );
  const px = parseFloat(raw);
  return (Number.isFinite(px) ? px : 280) + 10;
}

// useLayoutEffect 在 SSR 会告警；客户端用 layout 版本，使挂载时的 compute 在首帧前
// 定位到正确章节。注意：仅此不足以消除“刷新到中段先闪第一项”——SSR HTML 的首绘早于
// hydration 与本 effect，根除闪烁靠下方 activeId 初始值为 null（见该处注释）。
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Toc({ items, title }: { items: TocItem[]; title: string }) {
  // 初始不预设高亮：SSR/预渲染 HTML 会按此初始值落地，若为 items[0] 则首屏 HTML 第一项
  // 就带 .active，浏览器首绘（早于 hydration 与 useLayoutEffect）即闪一下第一项。必须为
  // null——让 SSR HTML 不含任何 active，再由下方 effect 在首帧前补上当前章节。
  const [activeId, setActiveId] = useState<string | null>(null);

  // 首屏（SSR/未 hydration）走「可读保底」配色：此时 activeId 还是 null，若不处理则所有项
  // 都是非 active 的暗灰、在深色底上几乎不可见，看着像目录坏了。data-spy="off" 期间 CSS 把
  // 全部项提到可读色（既不全暗、也不闪第一项）；compute 一算出当前章节就切到 "on"，
  // 恢复正常的「一项高亮、其余暗」层次。两个 set 在同一次 effect 同步触发，不留中间帧。
  const [spyReady, setSpyReady] = useState(false);

  useIsoLayoutEffect(() => {
    if (items.length === 0) return;

    const mql = window.matchMedia(TOC_QUERY);
    let teardown: (() => void) | null = null;

    // 仅在 TOC 可见（≥1080px）时挂监听并计算；窄屏不做任何无用功。
    const activate = () => {
      // 基于滚动位置计算 active：取「最后一个顶部已越过阅读线的标题」。
      // 触底时强制高亮最后一项（末节常短于一屏，进不了阅读线以上的判定）。
      // items 在生命周期内稳定，元素引用与阅读线各缓存一次。
      const els = items.map((it) => document.getElementById(it.id));
      const activeLine = readActiveLine();

      const compute = () => {
        const viewport = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        // 必须先确认文档真的溢出视口，否则短页面 scrollHeight≈innerHeight 会从一开始
        // 就误判触底、让顶部也高亮最后一项。
        const atBottom =
          docHeight > viewport && viewport + window.scrollY >= docHeight - 2;
        if (atBottom) {
          setActiveId(items[items.length - 1].id);
          return;
        }
        let current = items[0].id;
        for (let i = 0; i < items.length; i++) {
          const el = els[i];
          if (el && el.getBoundingClientRect().top <= activeLine) {
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
      setSpyReady(true);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    };

    // 按当前断点决定是否激活；resize 跨过断点时重建（addEventListener 不重跑 effect）。
    const sync = () => {
      teardown?.();
      teardown = mql.matches ? activate() : null;
    };
    sync();
    mql.addEventListener("change", sync);
    return () => {
      mql.removeEventListener("change", sync);
      teardown?.();
    };
  }, [items]);

  if (items.length === 0) return null;
  return (
    <aside className="toc" data-spy={spyReady ? "on" : "off"}>
      <div className="toc-inner">
        <div className="toc-title">{title}</div>
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
