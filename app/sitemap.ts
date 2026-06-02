import type { MetadataRoute } from "next";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { absUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [zhPosts, zhTags, enPosts, enTags] = await Promise.all([
    getAllPosts("zh"),
    getAllTags("zh"),
    getAllPosts("en"),
    getAllTags("en"),
  ]);

  // 用最新一篇的日期当作各列表页的 lastModified
  const latest = zhPosts[0]?.date;
  const enSlugs = new Set(enPosts.map((p) => p.slug));

  // 同时存在中英版的页面（首页 / 归档 / 标签 / 关于）：每条带 hreflang alternates，
  // 让搜索引擎把 zh / en 识别成同一文档的两个语言副本。
  const STATIC: { path: string; priority: number; freq: "weekly" | "monthly" }[] =
    [
      { path: "/", priority: 1, freq: "weekly" },
      { path: "/archive", priority: 0.6, freq: "weekly" },
      { path: "/tags", priority: 0.5, freq: "weekly" },
      { path: "/about", priority: 0.5, freq: "monthly" },
    ];
  const enPath = (p: string) => (p === "/" ? "/en" : `/en${p}`);
  const staticPages: MetadataRoute.Sitemap = STATIC.flatMap(
    ({ path, priority, freq }) => {
      const languages = { "zh-CN": absUrl(path), en: absUrl(enPath(path)) };
      return [
        {
          url: absUrl(path),
          lastModified: latest,
          changeFrequency: freq,
          priority,
          alternates: { languages },
        },
        {
          url: absUrl(enPath(path)),
          lastModified: latest,
          changeFrequency: freq,
          priority: priority * 0.9,
          alternates: { languages },
        },
      ];
    },
  );

  const postPages: MetadataRoute.Sitemap = [
    ...zhPosts.map((p) => {
      const languages: Record<string, string> = { "zh-CN": absUrl(`/posts/${p.slug}`) };
      if (enSlugs.has(p.slug)) languages.en = absUrl(`/en/posts/${p.slug}`);
      return {
        url: absUrl(`/posts/${p.slug}`),
        lastModified: p.date,
        changeFrequency: "monthly" as const,
        priority: 0.8,
        alternates: { languages },
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
      lastModified: latest,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
    ...enTags.map(({ tag }) => ({
      url: absUrl(`/en/tags/${encodeURIComponent(tag)}`),
      lastModified: latest,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];

  return [...staticPages, ...postPages, ...tagPages];
}
