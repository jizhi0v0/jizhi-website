import { getAllSlugs, getPost } from "@/lib/posts";
import { PostView } from "@/components/views/PostView";
import { JsonLd } from "@/components/JsonLd";
import { articleAlternates, blogPostingJsonLd, postOgImage } from "@/lib/seo";
import { SITE_AUTHOR } from "@/lib/site";

export async function generateStaticParams() {
  const slugs = await getAllSlugs("en");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug, "en");
  if (!post) return {};
  const hasZh = (await getAllSlugs("zh")).includes(slug);
  const image = postOgImage(post);
  return {
    title: post.title,
    description: post.excerpt,
    alternates: articleAlternates(slug, "en", { zh: hasZh, en: true }),
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/en/posts/${slug}`,
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

export default async function PostPageEn({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug, "en");

  return (
    <>
      {post && <JsonLd data={blogPostingJsonLd(post, "en")} />}
      <PostView slug={slug} locale="en" />
    </>
  );
}
