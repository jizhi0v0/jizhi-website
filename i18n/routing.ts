import { defineRouting } from "next-intl/routing";

// 站点的 locale 路由：
// - 默认 zh，URL 不带前缀（/、/about、/posts/x），与历史 URL 完全一致。
// - en 走 /en 前缀（localePrefix: "as-needed" → 仅非默认 locale 加前缀）。
// - localeDetection: false —— 不按 Accept-Language 自动跳转，保持「/ 永远是中文」的旧行为。
export const routing = defineRouting({
  locales: ["zh", "en"],
  defaultLocale: "zh",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
