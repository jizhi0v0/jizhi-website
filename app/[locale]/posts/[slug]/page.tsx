import { setRequestLocale } from "next-intl/server";
import { getAllSlugs, getPost } from "@/lib/posts";
import { PostView } from "@/components/views/PostView";
import { JsonLd } from "@/components/JsonLd";
import {
  articleAlternates,
  blogPostingJsonLd,
  localizedPath,
  postOgImage,
} from "@/lib/seo";
import { routing } from "@/i18n/routing";
import { SITE_AUTHOR } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    const slugs = await getAllSlugs(locale);
    for (const slug of slugs) params.push({ locale, slug });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = locale as Locale;
  const post = await getPost(slug, loc);
  if (!post) return {};
  const [zhSlugs, enSlugs] = await Promise.all([
    getAllSlugs("zh"),
    getAllSlugs("en"),
  ]);
  const image = postOgImage(post);
  return {
    title: post.title,
    description: post.excerpt,
    alternates: articleAlternates(slug, loc, {
      zh: zhSlugs.includes(slug),
      en: enSlugs.includes(slug),
    }),
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: localizedPath(loc, `/posts/${slug}`),
      publishedTime: post.date,
      authors: [SITE_AUTHOR],
      section: post.category || undefined,
      tags: post.tags,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [image],
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const post = await getPost(slug, loc);

  // post 为空时交给 PostView 走 notFound()，这里只在有数据时注入结构化数据
  return (
    <>
      {post && <JsonLd data={blogPostingJsonLd(post, loc)} />}
      <PostView slug={slug} locale={loc} />
    </>
  );
}
