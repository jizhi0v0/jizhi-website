import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getTranslations } from "next-intl/server";
import { getAllPosts, getPost, extractToc } from "@/lib/posts";
import { mdxOptions } from "@/lib/mdx";
import { mdxComponents } from "@/components/mdx-components";
import { ReadingProgress } from "@/components/ReadingProgress";
import { Toc } from "@/components/Toc";
import { Lightbox } from "@/components/Lightbox";
import { Link } from "@/i18n/navigation";
import { BackLink } from "@/components/BackLink";
import { formatFull, type Locale } from "@/lib/i18n";

export async function PostView({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "post" });
  const post = await getPost(slug, locale);
  if (!post) notFound();

  const allPosts = await getAllPosts(locale);
  const idx = allPosts.findIndex((p) => p.slug === slug);
  const prev = allPosts[idx + 1]; // older
  const next = allPosts[idx - 1]; // newer

  const toc = extractToc(post.content);

  return (
    <>
      <ReadingProgress />
      <Lightbox />
      <div className={toc.length > 0 ? "has-toc" : ""}>
        {toc.length > 0 && <Toc items={toc} title={t("tocTitle")} />}
        <article className="post-article container">
          <div className="post-meta-bar">
            <BackLink className="back-link" href="/">
              {t("back")}
            </BackLink>
            <div className="post-meta-top">
              <span>{formatFull(post.date, locale)}</span>
              {post.updated && post.updated !== post.date && (
                <>
                  <span className="dot">·</span>
                  <span>
                    {t("updated", { date: formatFull(post.updated, locale) })}
                  </span>
                </>
              )}
              <span className="dot">·</span>
              <span>{post.category}</span>
              <span className="dot">·</span>
              <span>{t("words", { n: post.words })}</span>
              <span className="dot">·</span>
              <span>{t("read", { n: post.readMinutes })}</span>
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
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="tag-chip"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {(prev || next) && (
            <div className="article-footer">
              <div>
                {prev && (
                  <Link href={`/posts/${prev.slug}`}>
                    <div className="label">{t("prev")}</div>
                    <div className="t">{prev.title}</div>
                  </Link>
                )}
              </div>
              <div className="next">
                {next && (
                  <Link href={`/posts/${next.slug}`}>
                    <div className="label">{t("next")}</div>
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
