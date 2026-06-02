import type { MetadataRoute } from "next";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { absUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const tags = await getAllTags();

  // 用最新一篇的日期当作首页 / 归档的 lastModified
  const latest = posts[0]?.date;

  const staticPages: MetadataRoute.Sitemap = [
    { url: absUrl("/"), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: absUrl("/archive"), lastModified: latest, changeFrequency: "weekly", priority: 0.6 },
    { url: absUrl("/tags"), lastModified: latest, changeFrequency: "weekly", priority: 0.5 },
    { url: absUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
  ];

  const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absUrl(`/posts/${p.slug}`),
    lastModified: p.date,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const tagPages: MetadataRoute.Sitemap = tags.map(({ tag }) => ({
    url: absUrl(`/tags/${encodeURIComponent(tag)}`),
    lastModified: latest,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [...staticPages, ...postPages, ...tagPages];
}
