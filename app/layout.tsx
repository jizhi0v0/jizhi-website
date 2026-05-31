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
