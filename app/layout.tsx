import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Serif_SC } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

// CJK 字体被切成 300+ 个 unicode-range 切片，必须 preload:false（否则全量预载）。
// display:swap 而非 optional：optional 在首屏有 ~100ms 的 block 期（文本不可见，
// 同步加载的 mono 块在该期间「单独可见」），iOS Safari pull-to-refresh 复现非常
// 明显——pre 块亮着、正文与头部一片空白，再恢复滚动位置，连闪三态。
// swap 的 block 期实测接近 0：fallback（Songti SC / Source Han Serif）即时上屏，
// 切片到位后再 swap。首次访问滚动长文时切片陆续 swap 仍会有少量 CLS，但相比
// pull-to-refresh 的视觉断裂，这是更可接受的折中（缓存命中后零 swap 零 CLS）。
const serif = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-noto-serif-sc",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.jizhiovo.com"),
  title: {
    default: "jizhi0v0 / keep_thinking",
    template: "%s · jizhi0v0",
  },
  description: "一个写得不勤、但还在写的小角落。",
  openGraph: {
    type: "website",
    siteName: "jizhi0v0 / keep_thinking",
    locale: "zh_CN",
    url: "/",
    images: ["/og/default.png"],
  },
  twitter: {
    card: "summary",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // theme-color：决定 iOS Safari 顶部地址栏、Telegram in-app browser 半透明工具栏的
  // 底色。不设 Telegram 工具栏会用透明默认，正文滚到顶部时会从工具栏背后透出，
  // 看起来脏。light/dark 两份各自匹配 --paper，保证滚顶时背景与工具栏无缝衔接。
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f1" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1c19" },
  ],
  // 声明页面同时支持深浅两套——iOS Safari/WKWebView 据此选择滚动条、表单控件、
  // overscroll 背景色等系统 UI 的对比方向。不声明时 UA 默认按 light 渲染滚动条
  // 拇指（深色），在深色页面上滚动时表现为右侧一道深色细线（issue #2 复现）。
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${sans.variable} ${mono.variable} ${serif.variable}`}
    >
      <head>
        {/*
          iOS Safari pull-to-refresh 时浏览器的滚动位置恢复在首帧之后才执行：
            t≈0    : 首帧画在 scrollY=0（用户看到"跳到顶"）
            t≈50ms : 浏览器读 history scroll 恢复到原位（第二帧）
          中间那一帧的「跳到顶」就是 issue #3.1 的根因。手工接管恢复：
            1) scrollRestoration = "manual"，关掉浏览器的延迟恢复，避免后续与
               用户滚动冲突。
            2) head 同步脚本：在解析完 body 后插入的兄弟脚本会在 body 解析过程中
               读取 sessionStorage 的 Y、立即 scrollTo；首帧就落在正确位置。
            3) pagehide/visibilitychange/beforeunload 三个事件覆盖移动端 Safari
               不同退出路径，保证刷新前一定写过最新 Y。
          这段必须 inline，且必须先于 React hydration——hydration 在 first paint
          之后才跑，来不及阻止那一帧的跳顶。dangerouslySetInnerHTML 是 React 提供
          的唯一不让框架"理解"脚本内容的口子，正好满足我们要"裸 JS 同步执行"。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    // 带 hash 的链接（#section-foo）必须让浏览器跳到锚点，不能强制恢复 Y。
    // 这种 URL 大多是别处分享过来的，本会话内的 sessionStorage 值无意义。
    var hasHash = !!location.hash;
    var KEY = 'sy:' + location.pathname + location.search;
    var raw = hasHash ? null : sessionStorage.getItem(KEY);
    var y = raw ? parseInt(raw, 10) : 0;
    // 仅当存有非 0 位置时才接管——首次进入页面（无记录）让浏览器走默认 0。
    if (y > 0) {
      // 把浏览器的延迟恢复关掉，避免它在我们手工恢复之后又跳回 history Y。
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.__restoreY = y;
      // body 收尾的同步脚本会真正调用 scrollTo（彼时 document.body 已存在）。
    }
    var save = function(){
      try { sessionStorage.setItem(KEY, String(window.scrollY|0)); } catch(e){}
    };
    // pagehide 覆盖 bfcache 退出；visibilitychange→hidden 覆盖切 tab/锁屏；
    // beforeunload 覆盖普通跳转/刷新。任一触发即时落盘。
    addEventListener('pagehide', save, {capture:true});
    addEventListener('visibilitychange', function(){ if (document.visibilityState==='hidden') save(); }, {capture:true});
    addEventListener('beforeunload', save, {capture:true});
    // 滚动期间也写一份（节流到 rAF），保证强杀场景也有近似值。
    var pending = false;
    addEventListener('scroll', function(){
      if (pending) return;
      pending = true;
      requestAnimationFrame(function(){ pending = false; save(); });
    }, {passive:true, capture:true});
  } catch(e){}
})();
`,
          }}
        />
      </head>
      <body>
        <div className="app">
          <Header />
          <main className="app-main">{children}</main>
          <Footer />
        </div>
        {/*
          紧贴 body 收尾的同步恢复脚本：HTML 解析器到达此处时 body 子树已完成，
          documentElement.scrollHeight 可用、scrollTo 立即生效。此刻还没发生首帧，
          浏览器随后的第一帧就直接落在恢复后的 Y，从根本上消除"先画到顶再跳回去"
          的中间态。任何错误都吞掉——恢复失败也只是降级到浏览器默认行为。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var y = window.__restoreY;
    if (typeof y === 'number' && y > 0) {
      window.scrollTo(0, y);
    }
  } catch(e){}
})();
`,
          }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
