import type { MetadataRoute } from "next";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { absUrl } from "@/lib/site";
import { localizedPath } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [zhPosts, zhTags, enPosts, enTags] = await Promise.all([
    getAllPosts("zh"),
    getAllTags("zh"),
    getAllPosts("en"),
    getAllTags("en"),
  ]);

  // 各 locale 用自己最新一篇的日期当列表页 lastModified——EN 长期不动时不会
  // 因为 zh 更新而反复“声称”有更新，省得搜索引擎白白回 crawl。
  const zhLatest = zhPosts[0]?.date;
  const enLatest = enPosts[0]?.date;
  const enSlugs = new Set(enPosts.map((p) => p.slug));
  // 没有任何译文时 EN 列表/归档/标签是空页，不进 sitemap；about 不依赖文章，照常收录。
  const hasEnContent = enPosts.length > 0;

  const STATIC: { path: string; priority: number; freq: "weekly" | "monthly" }[] =
    [
      { path: "/", priority: 1, freq: "weekly" },
      { path: "/archive", priority: 0.6, freq: "weekly" },
      { path: "/tags", priority: 0.5, freq: "weekly" },
      { path: "/about", priority: 0.5, freq: "monthly" },
    ];
  const staticPages: MetadataRoute.Sitemap = STATIC.flatMap(
    ({ path, priority, freq }) => {
      const includeEn = hasEnContent || path === "/about";
      const languages = includeEn
        ? { "zh-CN": absUrl(path), en: absUrl(localizedPath("en", path)) }
        : undefined;
      const entries: MetadataRoute.Sitemap = [
        {
          url: absUrl(path),
          lastModified: zhLatest,
          changeFrequency: freq,
          priority,
          alternates: languages && { languages },
        },
      ];
      if (includeEn) {
        entries.push({
          url: absUrl(localizedPath("en", path)),
          lastModified: enLatest,
          changeFrequency: freq,
          priority: priority * 0.9,
          alternates: languages && { languages },
        });
      }
      return entries;
    },
  );

  const postPages: MetadataRoute.Sitemap = [
    ...zhPosts.map((p) => {
      const bilingual = enSlugs.has(p.slug);
      return {
        url: absUrl(`/posts/${p.slug}`),
        lastModified: p.date,
        changeFrequency: "monthly" as const,
        priority: 0.8,
        alternates: bilingual
          ? {
              languages: {
                "zh-CN": absUrl(`/posts/${p.slug}`),
                en: absUrl(`/en/posts/${p.slug}`),
              },
            }
          : undefined,
      };
    }),
    ...enPosts.map((p) => ({
      url: absUrl(`/en/posts/${p.slug}`),
      lastModified: p.date,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          "zh-CN": absUrl(`/posts/${p.slug}`),
          en: absUrl(`/en/posts/${p.slug}`),
        },
      },
    })),
  ];

  const tagPages: MetadataRoute.Sitemap = [
    ...zhTags.map(({ tag }) => ({
      url: absUrl(`/tags/${encodeURIComponent(tag)}`),
      lastModified: zhLatest,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
    ...enTags.map(({ tag }) => ({
      url: absUrl(`/en/tags/${encodeURIComponent(tag)}`),
      lastModified: enLatest,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];

  return [...staticPages, ...postPages, ...tagPages];
}
