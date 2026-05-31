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
              "try{if(window.TelegramWebviewProxy)document.documentElement.classList.add('tg-webview')}catch(e){}",
          }}
        />
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
