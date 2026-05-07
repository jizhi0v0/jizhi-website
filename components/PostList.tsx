import { Fragment } from "react";
import Link from "next/link";
import type { PostMeta } from "@/lib/posts";
import { formatMD } from "@/lib/posts";

interface Props {
  posts: PostMeta[];
  /** Show year separators (used on home / tag-filtered list). */
  showYearSeparators?: boolean;
}

export function PostList({ posts, showYearSeparators = true }: Props) {
  return (
    <ul className="post-list">
      {posts.map((post, i) => {
        const prevYear =
          i > 0 ? new Date(posts[i - 1].date).getFullYear() : null;
        const thisYear = new Date(post.date).getFullYear();
        const showSep =
          showYearSeparators && prevYear !== null && prevYear !== thisYear;
        return (
          <Fragment key={post.slug}>
            {showSep && (
              <li className="year-sep">
                <span className="year-sep-num">{thisYear}</span>
                <div className="year-sep-rule" />
              </li>
            )}
            <li>
              <Link href={`/posts/${post.slug}`} className="post-row">
                <span className="post-row-date">{formatMD(post.date)}</span>
                <span className="post-row-title">{post.title}</span>
              </Link>
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
