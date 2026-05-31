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
// display:optional 而非 swap：每个切片只给 ~100ms 加载窗口，没赶上就用系统衬线
// 兜底、且本次浏览不再 swap——避免滚动长文时切片陆续到位反复回流（CLS 元凶）。
// 切片是 immutable 缓存，第二次浏览起即从缓存命中、立刻显示 Noto Serif SC。
const serif = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  display: "optional",
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
  // Telegram 等 WKWebView 内置浏览器的顶栏是半透明的：没有 theme-color 时它直接拿
  // 页面正文当背景采样，顶部就「透出」正文、显脏（纯 Safari 不走这条路，所以无此问题）。
  // 给出与纸色底（--paper）一致的不透明 hex（oklch 旧版 WebKit 不认，用 sRGB hex），
  // 顶栏即变成与页面同色的实色，消除透出。明暗各一条，跟随系统。
  // 这两个 hex 是 --paper 的 sRGB 等价值，改纸色时要同步更新——
  // mobile-chrome.spec.ts 会像素比对 theme-color 与实际背景，漂移即红，无需手动盯。
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#13110f" },
  ],
  // 同时声明明暗两套 color-scheme：让 iOS 的原生 UI（滚动指示条/橡皮筋回弹底色）
  // 跟随网页主题着色，而不是默认按系统设置乱配——否则深色页面上会出现浅色滚动指示条，
  // 滚动时在最右沿显示成一条竖线（WebKit #198772）。也让首帧 backdrop 用正确明暗色，
  // 减少刷新时先闪白再变暗的中间态。
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
