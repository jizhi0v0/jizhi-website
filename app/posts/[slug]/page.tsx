import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import {
  getAllPosts,
  getAllSlugs,
  getPost,
  formatFull,
  extractToc,
} from "@/lib/posts";
import { mdxOptions } from "@/lib/mdx";
import { mdxComponents } from "@/components/mdx-components";
import { ReadingProgress } from "@/components/ReadingProgress";
import { Toc } from "@/components/Toc";

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
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
      card: "summary",
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
  const post = await getPost(slug);
  if (!post) notFound();

  const allPosts = await getAllPosts();
  const idx = allPosts.findIndex((p) => p.slug === slug);
  const prev = allPosts[idx + 1]; // older
  const next = allPosts[idx - 1]; // newer

  const toc = extractToc(post.content);

  return (
    <>
      <ReadingProgress />
      <div className={toc.length > 0 ? "has-toc" : ""}>
        {toc.length > 0 && <Toc items={toc} />}
        <article className="post-article container">
          <div className="post-meta-bar">
            <Link className="back-link" href="/">
              ← 返回
            </Link>
            <div className="post-meta-top">
              <span>{formatFull(post.date)}</span>
              <span className="dot">·</span>
              <span>{post.category}</span>
              <span className="dot">·</span>
              <span>{post.words} 字</span>
              <span className="dot">·</span>
              <span>约 {post.readMinutes} 分钟</span>
            </div>
          </div>
          <h1 className="post-title">{post.title}</h1>
          {post.excerpt && <p className="post-subtitle">{post.excerpt}</p>}
          <div className="post-divider" />
          <div className="post-body">
            <MDXRemote
              source={post.content}
              components={mdxComponents}
              options={{ mdxOptions: mdxOptions as never }}
            />
          </div>

          {post.tags.length > 0 && (
            <div className="post-tags">
              {post.tags.map((t) => (
                <Link
                  key={t}
                  href={`/tags/${encodeURIComponent(t)}`}
                  className="tag-chip"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}

          <div className="article-footer">
            <div>
              {prev && (
                <Link href={`/posts/${prev.slug}`}>
                  <div className="label">← 上一篇</div>
                  <div className="t">{prev.title}</div>
                </Link>
              )}
            </div>
            <div className="next">
              {next && (
                <Link href={`/posts/${next.slug}`}>
                  <div className="label">下一篇 →</div>
                  <div className="t">{next.title}</div>
                </Link>
              )}
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
