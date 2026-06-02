import { getAllSlugs, getPost } from "@/lib/posts";
import { PostView } from "@/components/views/PostView";
import { JsonLd } from "@/components/JsonLd";
import { articleAlternates, blogPostingJsonLd, postOgImage } from "@/lib/seo";
import { SITE_AUTHOR } from "@/lib/site";

export async function generateStaticParams() {
  const slugs = await getAllSlugs("zh");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug, "zh");
  if (!post) return {};
  const hasEn = (await getAllSlugs("en")).includes(slug);
  const image = postOgImage(post);
  return {
    title: post.title,
    description: post.excerpt,
    alternates: articleAlternates(slug, "zh", { zh: true, en: hasEn }),
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/posts/${slug}`,
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug, "zh");

  // post 为空时交给 PostView 走 notFound()，这里只在有数据时注入结构化数据
  return (
    <>
      {post && <JsonLd data={blogPostingJsonLd(post, "zh")} />}
      <PostView slug={slug} locale="zh" />
    </>
  );
}
