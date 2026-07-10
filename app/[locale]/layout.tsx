import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { routing } from "@/i18n/routing";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "../globals.css";

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

// 正文衬线（Noto Serif SC）不走 next/font：它会把整套 CJK 拆成 300+ 条 unicode-range
// @font-face、生成一坨 ~279KB 的 render-blocking 样式表拖垮 FCP。改为自托管的内容子集版
// （见 scripts/build-fonts.mjs 与 globals.css 的 @font-face），@font-face 塌成 3 条、swap
// 懒加载不阻塞首绘。Inter / JetBrains Mono 只含 latin、体积小，仍留在 next/font。

// <html lang>：zh 用 zh-CN（屏幕阅读器走中文语音引擎），en 用 en。
function htmlLang(locale: string): string {
  return locale === "en" ? "en" : "zh-CN";
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_NAME,
      template: "%s · jizhi0v0",
    },
    description: SITE_DESCRIPTION,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: isEn ? "en_US" : "zh_CN",
      url: isEn ? "/en" : "/",
      images: ["/og/default.png"],
    },
    twitter: {
      card: "summary",
    },
    alternates: {
      types: {
        "application/rss+xml": isEn ? "/en/feed.xml" : "/feed.xml",
      },
    },
  };
}

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

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // 静态渲染必需：把当前 locale 注入 request 上下文，供 getTranslations/useTranslations 读取。
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html
      lang={htmlLang(locale)}
      className={`${sans.variable} ${mono.variable}`}
      // 下方引导 <script> 命中 Telegram 时给 documentElement 打 tg-webview 标，与
      // 服务端渲染的 class 不一致，抑制这一处的 hydration 警告（仅 Telegram 内命中）。
      suppressHydrationWarning
    >
      <body>
        {/* Telegram iOS 内嵌浏览器 UA 伪装成 Safari、无标识，但在 atDocumentStart
            注入 window.TelegramWebviewProxy（见 Telegram-iOS submodules/BrowserUI），
            故此脚本运行时它已存在。命中则打标，让 CSS 仅在该环境做收尾 hack；Safari
            无此对象、零影响。内联同步执行，在首帧前打标避免闪烁。
            内联 <script> 只需 SSR 首帧执行；语言切换走整页跳转（见 Header lang-switch）
            而非客户端导航，故根布局不会在客户端重渲染，也就不会触发 React 的
            "Encountered a script tag while rendering" 警告。 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if('scrollRestoration'in history)history.scrollRestoration='manual';if(window.TelegramWebviewProxy)document.documentElement.classList.add('tg-webview')}catch(e){}",
          }}
        />
        <ScrollRestoration />
        <NextIntlClientProvider>
          {/* 键盘/屏幕阅读器用户跳过导航直达正文；平时隐藏，Tab 聚焦时浮出。 */}
          <a href="#main-content" className="skip-link">
            {t("skipLink")}
          </a>
          <div className="app">
            <Header />
            <main id="main-content" className="app-main">{children}</main>
            <Footer />
          </div>
        </NextIntlClientProvider>
        {/* 刷新/前进后退时在首帧前粗略复位滚动，消除"先到顶再跳"的闪烁；精确复位
            由 <ScrollRestoration> 在字体/图片就位后兜底。置于 body 末尾，此时正文已解析、
            scrollHeight 有效。 */}
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
