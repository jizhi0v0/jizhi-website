import Link from "next/link";
import { getAllTags } from "@/lib/posts";

export const metadata = { title: "标签" };

export default async function TagsPage() {
  const tags = await getAllTags();
  return (
    <div className="container-wide tags-page">
      <h1>标签</h1>
      {tags.length === 0 ? (
        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>还没有标签。</p>
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
