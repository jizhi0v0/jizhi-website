import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Serif_SC } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
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
// display:swap（曾用 optional）：optional 有 ~100ms 不可见期，刷新时衬线正文与
// 品牌字会闪一帧空白（FOIT，iOS Safari 上尤其明显）。改 swap 后文字立刻用兜底
// 衬线显示、字体到位再换，消除 FOIT。代价是切片到位时可能回流（CLS）——靠 next/font
// 的 adjustFontFallback（size-adjust 度量匹配）+ 字体栈里的系统衬线兜底压低；切片
// immutable 缓存，第二次浏览起基本即时命中。CJK 度量无法 100% 匹配，CLS 以真机为准。
const serif = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-noto-serif-sc",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: "%s · jizhi0v0",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "zh_CN",
    url: "/",
    images: ["/og/default.png"],
  },
  twitter: {
    card: "summary",
  },
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 给浏览器 chrome（含 Telegram/微信等 in-app 浏览器的顶栏）上色：不设时
  // 顶栏退化成半透明模糊，滚动的正文会从顶栏后透出来。取值 = body 背景实际渲染色。
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#13110f" },
  ],
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
      <body>
        {/* Telegram iOS 内嵌浏览器 UA 伪装成 Safari、无标识，但在 atDocumentStart
            注入 window.TelegramWebviewProxy（见 Telegram-iOS submodules/BrowserUI），
            故此脚本运行时它已存在。命中则打标，让 CSS 仅在该环境做收尾 hack；Safari
            无此对象、零影响。内联同步执行，在首帧前打标避免闪烁。 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if('scrollRestoration'in history)history.scrollRestoration='manual';if(window.TelegramWebviewProxy)document.documentElement.classList.add('tg-webview')}catch(e){}",
          }}
        />
        <ScrollRestoration />
        <div className="app">
          <Header />
          <main className="app-main">{children}</main>
          <Footer />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var n=performance.getEntriesByType('navigation')[0]?.type;if(n==='reload'||n==='back_forward'){var k='jizhi:scroll:'+location.pathname+location.search;var s=JSON.parse(sessionStorage.getItem(k)||'null');if(s&&typeof s.x==='number'&&typeof s.y==='number'&&typeof s.t==='number'&&Date.now()-s.t<18e5){scrollTo(s.x,Math.min(s.y,Math.max(0,document.documentElement.scrollHeight-document.documentElement.clientHeight)))}}}catch(e){}",
          }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
