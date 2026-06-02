import { getAllSlugs, getPost } from "@/lib/posts";
import { PostView } from "@/components/views/PostView";

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
  const image = post.image ?? "/og/default.png";
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url,
      publishedTime: post.date,
      images: [image],
    },
    twitter: {
      card: post.image ? "summary_large_image" : "summary",
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
  return <PostView slug={slug} locale="zh" />;
}
