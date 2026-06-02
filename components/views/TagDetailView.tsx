import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { PostList } from "@/components/PostList";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/i18n";

export async function TagDetailView({
  tag,
  locale,
}: {
  tag: string;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "tags" });
  const allPosts = await getAllPosts(locale);
  const filtered = allPosts.filter((p) => p.tags.includes(tag));
  if (filtered.length === 0) notFound();

  const allTags = await getAllTags(locale);

  return (
    <div className="container-wide tags-page">
      <h1>{t("title")}</h1>
      <div className="tag-cloud">
        {allTags.map(({ tag: t2, count }) => (
          <Link
            key={t2}
            href={`/tags/${encodeURIComponent(t2)}`}
            className={"tag-chip " + (t2 === tag ? "active" : "")}
          >
            {t2}
            <span className="count">{count}</span>
          </Link>
        ))}
      </div>
      <div className="tag-detail-sub">
        {t("detail", { tag, count: filtered.length })}
      </div>
      <PostList posts={filtered} showYearSeparators={false} />
    </div>
  );
}
