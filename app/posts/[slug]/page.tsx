import { getAllSlugs, getPost } from "@/lib/posts";
import { PostView } from "@/components/views/PostView";
import { SITE_AUTHOR, SITE_NAME, SITE_URL, absUrl } from "@/lib/site";

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
  const url = `/posts/${slug}`;
  // 没配图的文章走 /og 动态生成标题卡（1200×630），统一用 large_image 卡片
  const image =
    post.image ??
    `/og?title=${encodeURIComponent(post.title)}${
      post.category ? `&category=${encodeURIComponent(post.category)}` : ""
    }`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url,
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
  const jsonLd = post && {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: SITE_AUTHOR, url: SITE_URL },
    publisher: { "@type": "Person", name: SITE_AUTHOR, url: SITE_URL },
    url: absUrl(`/posts/${slug}`),
    mainEntityOfPage: absUrl(`/posts/${slug}`),
    image: absUrl(post.image ?? `/og?title=${encodeURIComponent(post.title)}`),
    keywords: post.tags.length ? post.tags.join(", ") : undefined,
    articleSection: post.category || undefined,
    inLanguage: "zh-CN",
    isPartOf: { "@type": "Blog", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PostView slug={slug} locale="zh" />
    </>
  );
}
