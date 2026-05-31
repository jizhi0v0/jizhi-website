import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Serif_SC } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SCROLL_RESTORE_SCRIPT } from "@/lib/scroll-restore";
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
//
// display:swap 而非 optional：optional 自带 ~100ms 不可见的 block period，移动端
// reload 时正文（Noto Serif SC）会整体留白、只有等宽（display:swap）的代码块可见——
// 用户看到的就是 issue 3「只剩代码块、其余空白」那一帧。swap 让 block period=0、
// 首帧用 next/font 自动注入的 metric-matched fallback 立刻可见。
//
// 滚动长文时新切片到位的 swap 不会引发 CLS：
//   - CJK 字符（正文主体）等宽，系统衬线 (Songti SC/STSong) 与 Noto Serif SC 字符
//     宽度均为 1em，切片到位时字形换、宽度不变；
//   - 拉丁字符走 next/font 注入的 "Noto Serif SC Fallback"（local Times +
//     size-adjust:121% / ascent-override:95%），度量已对齐目标字体。
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

// themeColor 双值（light/dark）会落地为 <meta name="theme-color">，
// 解决 Telegram in-app browser（WKWebView 内核）顶部 toolbar 半透明、
// 透出页面正文的脏感 —— WKWebView 在 iOS 16+ 会读这个 meta 把 toolbar
// 染成实色（chatgpt.com 之所以「整条实色」就是因为有这个 meta）。
// 取 --paper 对应的近似 sRGB hex，与正文底色保持一致即可。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1a16" },
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
      // 内联 boot 脚本会在 hydration 之前给 <html> 同步打 data-restoring 属性，
      // 触发 React hydration mismatch 警告；这里抑制掉。脚本本身在 reload 路径
      // 双 rAF 之后会撤掉属性，hydration 后 <html> 干净。
      suppressHydrationWarning
    >
      <head>
        {/* iOS Safari reload 抖动修复脚本：必须 inline 在 <head>、阻塞解析,
            才能在首帧之前把 data-restoring 挂上 <html>、由 CSS 同步遮罩 .app。
            放在 body/末尾就晚于浏览器首绘，反而看见「跳顶部」那一帧。 */}
        <script
          dangerouslySetInnerHTML={{ __html: SCROLL_RESTORE_SCRIPT }}
        />
      </head>
      <body>
        <div className="app">
          <Header />
          <main className="app-main">{children}</main>
          <Footer />
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
