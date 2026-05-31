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
  /* Telegram / 其他 in-app WKWebView 的半透明工具栏会读取 theme-color 作为
     顶部栏底色。缺省时工具栏透明，页面正文透出来显得脏。匹配 --paper 的 oklch
     值（浏览器会做色彩空间转换），light/dark 各给一个。 */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#13110f" },
  ],
};

/* iOS Safari 刷新时的滚动恢复脚本——以内联 <script> 注入 <body> 最顶部，
   在 .app 渲染前执行，来得及遮挡闪烁中间态。
   流程：beforeunload 存位置 → 重载时立即接管 scrollRestoration、隐藏
   内容层 → DOM ready 后恢复位置 → 揭幕。整段做成字符串常量供
   dangerouslySetInnerHTML 使用（next/script beforeInteractive 在 App Router
   中走 RSC payload、hydration 后才执行，来不及）。 */
const SCROLL_RESTORE_SCRIPT = `(function(){
  try {
    if(history.scrollRestoration) history.scrollRestoration='manual';
    var k='__sr',s=sessionStorage,v=s.getItem(k);
    if(v){
      /* 同一个 pathname 才恢复——切页不误跳 */
      var o=JSON.parse(v);
      if(o.p===location.pathname){
        document.documentElement.classList.add('sr-loading');
        var done=function(){
          window.scrollTo(0,o.y);
          /* rAF 确保滚动生效后再揭幕，避免一帧白屏 */
          requestAnimationFrame(function(){
            document.documentElement.classList.remove('sr-loading');
          });
        };
        if(document.readyState==='loading'){
          document.addEventListener('DOMContentLoaded',done);
        } else { done(); }
      }
      s.removeItem(k);
    }
    window.addEventListener('beforeunload',function(){
      if(window.scrollY>0) s.setItem(k,JSON.stringify({p:location.pathname,y:window.scrollY}));
      else s.removeItem(k);
    });
  }catch(e){}
})()`;

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
        <script dangerouslySetInnerHTML={{ __html: SCROLL_RESTORE_SCRIPT }} />
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
