import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPost, extractToc } from "@/lib/posts";
import { mdxOptions } from "@/lib/mdx";
import { mdxComponents } from "@/components/mdx-components";
import { ReadingProgress } from "@/components/ReadingProgress";
import { Toc } from "@/components/Toc";
import { Lightbox } from "@/components/Lightbox";
import { dict, withLocale, formatFull, type Locale } from "@/lib/i18n";

export async function PostView({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const d = dict(locale);
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
      <Lightbox />
      <div className={toc.length > 0 ? "has-toc" : ""}>
        {toc.length > 0 && <Toc items={toc} />}
        <article className="post-article container">
          <div className="post-meta-bar">
            <Link className="back-link" href={withLocale("/", locale)}>
              {d.postBack}
            </Link>
            <div className="post-meta-top">
              <span>{formatFull(post.date, locale)}</span>
              <span className="dot">·</span>
              <span>{post.category}</span>
              <span className="dot">·</span>
              <span>{d.postWords(post.words)}</span>
              <span className="dot">·</span>
              <span>{d.postRead(post.readMinutes)}</span>
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
                  href={withLocale(`/tags/${encodeURIComponent(t)}`, locale)}
                  className="tag-chip"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}

          {(prev || next) && (
            <div className="article-footer">
              <div>
                {prev && (
                  <Link href={withLocale(`/posts/${prev.slug}`, locale)}>
                    <div className="label">{d.postPrev}</div>
                    <div className="t">{prev.title}</div>
                  </Link>
                )}
              </div>
              <div className="next">
                {next && (
                  <Link href={withLocale(`/posts/${next.slug}`, locale)}>
                    <div className="label">{d.postNext}</div>
                    <div className="t">{next.title}</div>
                  </Link>
                )}
              </div>
            </div>
          )}
        </article>
      </div>
    </>
  );
}
