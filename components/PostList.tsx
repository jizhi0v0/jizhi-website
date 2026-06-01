import { Fragment } from "react";
import Link from "next/link";
import type { PostMeta } from "@/lib/posts";
import { formatMD } from "@/lib/posts";
import { withLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

interface Props {
  posts: PostMeta[];
  /** Show year separators (used on home / tag-filtered list). */
  showYearSeparators?: boolean;
  locale?: Locale;
}

export function PostList({
  posts,
  showYearSeparators = true,
  locale = DEFAULT_LOCALE,
}: Props) {
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
              <Link
                href={withLocale(`/posts/${post.slug}`, locale)}
                className="post-row"
              >
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
