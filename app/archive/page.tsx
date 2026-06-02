import Link from "next/link";
import { getAllPosts, formatMD } from "@/lib/posts";

export const metadata = {
  title: "归档",
  alternates: { canonical: "/archive" },
};

export default async function ArchivePage() {
  const posts = await getAllPosts();
  const byYear = new Map<string, typeof posts>();
  for (const p of posts) {
    const y = p.date.slice(0, 4);
    const arr = byYear.get(y) ?? [];
    arr.push(p);
    byYear.set(y, arr);
  }
  const years = [...byYear.keys()].sort().reverse();

  return (
    <div className="container-wide archive-page">
      <h1>归档</h1>
      <div className="archive-sub">
        {posts.length} 篇 · {years.length} 年
      </div>
      {years.map((y) => (
        <div key={y} className="archive-year">
          <div className="archive-year-num">{y}</div>
          <ul className="archive-year-list">
            {byYear.get(y)!.map((p) => (
              <li key={p.slug}>
                <span className="d">{formatMD(p.date)}</span>
                <Link href={`/posts/${p.slug}`}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
