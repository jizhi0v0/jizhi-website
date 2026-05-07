import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { PostList } from "@/components/PostList";

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map(({ tag }) => ({ tag: encodeURIComponent(tag) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return { title: `标签 · ${decodeURIComponent(tag)}` };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);
  const allPosts = await getAllPosts();
  const filtered = allPosts.filter((p) => p.tags.includes(tag));
  if (filtered.length === 0) notFound();

  const allTags = await getAllTags();

  return (
    <div className="container-wide tags-page">
      <h1>标签</h1>
      <div className="tag-cloud">
        {allTags.map(({ tag: t, count }) => (
          <Link
            key={t}
            href={`/tags/${encodeURIComponent(t)}`}
            className={"tag-chip " + (t === tag ? "active" : "")}
          >
            {t}
            <span className="count">{count}</span>
          </Link>
        ))}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-3)",
          letterSpacing: "0.04em",
          marginBottom: 16,
        }}
      >
        标签 · {tag} · 共 {filtered.length} 篇
      </div>
      <PostList posts={filtered} showYearSeparators={false} />
    </div>
  );
}
