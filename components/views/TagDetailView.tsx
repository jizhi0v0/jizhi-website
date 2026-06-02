import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { PostList } from "@/components/PostList";
import { dict, withLocale, type Locale } from "@/lib/i18n";

export async function TagDetailView({
  tag,
  locale,
}: {
  tag: string;
  locale: Locale;
}) {
  const d = dict(locale);
  const allPosts = await getAllPosts(locale);
  const filtered = allPosts.filter((p) => p.tags.includes(tag));
  if (filtered.length === 0) notFound();

  const allTags = await getAllTags(locale);

  return (
    <div className="container-wide tags-page">
      <h1>{d.tagsTitle}</h1>
      <div className="tag-cloud">
        {allTags.map(({ tag: t, count }) => (
          <Link
            key={t}
            href={withLocale(`/tags/${encodeURIComponent(t)}`, locale)}
            className={"tag-chip " + (t === tag ? "active" : "")}
          >
            {t}
            <span className="count">{count}</span>
          </Link>
        ))}
      </div>
      <div className="tag-detail-sub">{d.tagDetail(tag, filtered.length)}</div>
      <PostList posts={filtered} showYearSeparators={false} locale={locale} />
    </div>
  );
}
