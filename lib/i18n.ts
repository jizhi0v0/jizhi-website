// 站点只做「界面 UI 双语」：导航、页面标题、footer 等 chrome 文案随 locale 切换，
// 文章正文保持原文。中文走现有 URL（/、/about…），英文走 /en 前缀（/en、/en/about…）。

export type Locale = "zh" | "en";

export const LOCALES: readonly Locale[] = ["zh", "en"] as const;
export const DEFAULT_LOCALE: Locale = "zh";

export interface Dict {
  nav: { posts: string; archive: string; tags: string; about: string };
  avatarTitle: string;
  homeIntro: string;
  aboutTitle: string;
  archiveTitle: string;
  archiveSub: (posts: number, years: number) => string;
  tagsTitle: string;
  tagsEmpty: string;
  tagDetail: (tag: string, count: number) => string;
  postBack: string;
  postWords: (n: number) => string;
  postRead: (n: number) => string;
  postPrev: string;
  postNext: string;
  // 切到「另一种语言」时显示的标签
  switchLabel: string;
  switchTitle: string;
  // 页面 <title>（套用 layout 的模板 "%s · jizhi0v0"）
  metaAbout: string;
  metaArchive: string;
  metaTags: string;
  metaTag: (tag: string) => string;
}

const zh: Dict = {
  nav: { posts: "文章", archive: "归档", tags: "标签", about: "关于" },
  avatarTitle: "关于我",
  homeIntro: "一些碎碎念.",
  aboutTitle: "关于",
  archiveTitle: "归档",
  archiveSub: (posts, years) => `${posts} 篇 · ${years} 年`,
  tagsTitle: "标签",
  tagsEmpty: "还没有标签。",
  tagDetail: (tag, count) => `标签 · ${tag} · 共 ${count} 篇`,
  postBack: "← 返回",
  postWords: (n) => `${n} 字`,
  postRead: (n) => `约 ${n} 分钟`,
  postPrev: "← 上一篇",
  postNext: "下一篇 →",
  switchLabel: "EN",
  switchTitle: "English",
  metaAbout: "关于",
  metaArchive: "归档",
  metaTags: "标签",
  metaTag: (tag) => `标签 · ${tag}`,
};

const en: Dict = {
  nav: { posts: "Posts", archive: "Archive", tags: "Tags", about: "About" },
  avatarTitle: "About me",
  homeIntro: "Just some scattered thoughts.",
  aboutTitle: "About",
  archiveTitle: "Archive",
  archiveSub: (posts, years) =>
    `${posts} ${posts === 1 ? "post" : "posts"} · ${years} ${years === 1 ? "year" : "years"}`,
  tagsTitle: "Tags",
  tagsEmpty: "No tags yet.",
  tagDetail: (tag, count) =>
    `Tag · ${tag} · ${count} ${count === 1 ? "post" : "posts"}`,
  postBack: "← Back",
  postWords: (n) => `${n} words`,
  postRead: (n) => `~${n} min`,
  postPrev: "← Previous",
  postNext: "Next →",
  switchLabel: "中文",
  switchTitle: "中文",
  metaAbout: "About",
  metaArchive: "Archive",
  metaTags: "Tags",
  metaTag: (tag) => `Tag · ${tag}`,
};

const DICTS: Record<Locale, Dict> = { zh, en };

export function dict(locale: Locale): Dict {
  return DICTS[locale];
}

/** 给一个「中文基准」路径加上当前 locale 前缀（zh 不变，en 加 /en）。 */
export function withLocale(href: string, locale: Locale): string {
  if (locale === "zh") return href;
  return href === "/" ? "/en" : "/en" + href;
}

/** 从 pathname 判断当前 locale。 */
export function localeFromPath(path: string): Locale {
  return path === "/en" || path.startsWith("/en/") ? "en" : "zh";
}

/** 当前页面在「另一种语言」下的对应路径，用于语言切换。 */
export function altLocalePath(path: string): string {
  if (localeFromPath(path) === "en") {
    const rest = path.slice(3); // 去掉 "/en"
    return rest === "" ? "/" : rest;
  }
  return path === "/" ? "/en" : "/en" + path;
}

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** 文章页的完整日期：zh「2026 年 5 月 30 日」/ en「May 30, 2026」。 */
export function formatFull(d: string, locale: Locale): string {
  const [y, m, day] = d.split("-");
  if (locale === "en") {
    return `${EN_MONTHS[parseInt(m, 10) - 1]} ${parseInt(day, 10)}, ${y}`;
  }
  return `${y} 年 ${parseInt(m, 10)} 月 ${parseInt(day, 10)} 日`;
}
