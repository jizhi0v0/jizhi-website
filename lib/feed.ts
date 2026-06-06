import { getAllPosts } from "./posts";
import type { Locale } from "./i18n";
import {
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_EN,
  SITE_NAME,
  absUrl,
} from "./site";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// zh/en 共用同一套 RSS 结构，仅在文章集合、链接前缀、feed 自身地址与语言上分叉。
// 抽成单一构造器，避免两个 route 各写一份 XML 拼接逻辑漂移。
export async function buildFeed(locale: Locale): Promise<string> {
  const isEn = locale === "en";
  const feedPath = isEn ? "/en/feed.xml" : "/feed.xml";
  const homePath = isEn ? "/en" : "/";
  const lang = isEn ? "en" : "zh-CN";
  const description = isEn ? SITE_DESCRIPTION_EN : SITE_DESCRIPTION;
  const postLink = (slug: string) =>
    absUrl(isEn ? `/en/posts/${slug}` : `/posts/${slug}`);

  // 阅读器只关心最新若干条，截断避免 feed 随文章累积无限增长
  const posts = (await getAllPosts(locale)).slice(0, 50);
  const lastBuild = posts[0]?.date
    ? new Date(posts[0].date).toUTCString()
    : new Date(0).toUTCString();

  const items = posts
    .map((p) => {
      const link = postLink(p.slug);
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      ${p.category ? `<category>${escapeXml(p.category)}</category>` : ""}
      <description>${escapeXml(p.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${absUrl(homePath)}</link>
    <atom:link href="${absUrl(feedPath)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(description)}</description>
    <language>${lang}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;
}

export function feedResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
