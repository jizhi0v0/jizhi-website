import Link from "next/link";
import { getAllTags } from "@/lib/posts";
import { dict, withLocale, type Locale } from "@/lib/i18n";

export async function TagsView({ locale }: { locale: Locale }) {
  const d = dict(locale);
  const tags = await getAllTags(locale);
  return (
    <div className="container-wide tags-page">
      <h1>{d.tagsTitle}</h1>
      {tags.length === 0 ? (
        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>{d.tagsEmpty}</p>
      ) : (
        <div className="tag-cloud">
          {tags.map(({ tag, count }) => (
            <Link
              key={tag}
              href={withLocale(`/tags/${encodeURIComponent(tag)}`, locale)}
              className="tag-chip"
            >
              {tag}
              <span className="count">{count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
