import type { PostMeta } from "./posts";
import type { Locale } from "./i18n";
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absUrl } from "./site";

// 把「中文站路径」翻成某 locale 的对外路径：en 加 /en 前缀，首页特判成 /en。
export function localizedPath(locale: Locale, zhPath: string): string {
  if (locale !== "en") return zhPath;
  return zhPath === "/" ? "/en" : `/en${zhPath}`;
}

// 文章社交卡图：有自配图用自配图，否则走 /og 动态卡。
// OG 协议与 JSON-LD 共用同一 URL，避免两处参数不一致生成两张不同的图。
export function postOgImage(
  post: Pick<PostMeta, "image" | "title" | "category">,
): string {
  if (post.image) return post.image;
  const params = new URLSearchParams({ title: post.title });
  if (post.category) params.set("category", post.category);
  return `/og?${params.toString()}`;
}

type Alternates = {
  canonical: string;
  languages?: Record<string, string>;
};

// 同时存在中英版的页面（首页 / about / archive / tags）的 canonical + hreflang。
export function staticAlternates(locale: Locale, zhPath: string): Alternates {
  const enPath = localizedPath("en", zhPath);
  return {
    canonical: localizedPath(locale, zhPath),
    languages: { "zh-CN": zhPath, en: enPath, "x-default": zhPath },
  };
}

// 文章的 canonical + hreflang。EN 站只收录有译文的文章，故两语种是否存在需按 slug 判定，
// 只把真实存在的语言版本写进 hreflang，避免指向 404。
export function articleAlternates(
  slug: string,
  locale: Locale,
  available: { zh: boolean; en: boolean },
): Alternates {
  const zhPath = `/posts/${slug}`;
  const enPath = `/en/posts/${slug}`;
  // hreflang 只在真有两个语言版本时才有意义；单语言文章发 languages 是冗余信号，
  // 直接省略，让 Google 走 canonical 默认。
  const bilingual = available.zh && available.en;
  return {
    canonical: locale === "en" ? enPath : zhPath,
    languages: bilingual
      ? { "zh-CN": zhPath, en: enPath, "x-default": zhPath }
      : undefined,
  };
}

export function websiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: locale === "en" ? absUrl("/en") : SITE_URL,
    inLanguage: locale === "en" ? "en" : "zh-CN",
  };
}

export function blogPostingJsonLd(post: PostMeta, locale: Locale) {
  const url = absUrl(localizedPath(locale, `/posts/${post.slug}`));
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: SITE_AUTHOR, url: SITE_URL },
    publisher: { "@type": "Person", name: SITE_AUTHOR, url: SITE_URL },
    url,
    mainEntityOfPage: url,
    image: absUrl(postOgImage(post)),
    keywords: post.tags.length ? post.tags.join(", ") : undefined,
    articleSection: post.category || undefined,
    inLanguage: locale === "en" ? "en" : "zh-CN",
    isPartOf: { "@type": "Blog", name: SITE_NAME, url: SITE_URL },
  };
}
