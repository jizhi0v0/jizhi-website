import Link from "next/link";
import { getAllPosts, formatMD } from "@/lib/posts";
import { dict, withLocale, type Locale } from "@/lib/i18n";

export async function ArchiveView({ locale }: { locale: Locale }) {
  const d = dict(locale);
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
      <h1>{d.archiveTitle}</h1>
      <div className="archive-sub">{d.archiveSub(posts.length, years.length)}</div>
      {years.map((y) => (
        <div key={y} className="archive-year">
          <div className="archive-year-num">{y}</div>
          <ul className="archive-year-list">
            {byYear.get(y)!.map((p) => (
              <li key={p.slug}>
                <span className="d">{formatMD(p.date)}</span>
                <Link href={withLocale(`/posts/${p.slug}`, locale)}>
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
