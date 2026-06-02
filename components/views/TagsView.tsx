import { getTranslations } from "next-intl/server";
import { getAllTags } from "@/lib/posts";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/i18n";

export async function TagsView({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "tags" });
  const tags = await getAllTags(locale);
  return (
    <div className="container-wide tags-page">
      <h1>{t("title")}</h1>
      {tags.length === 0 ? (
        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>{t("empty")}</p>
      ) : (
        <div className="tag-cloud">
          {tags.map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
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
