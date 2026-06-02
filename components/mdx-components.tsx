import type { ComponentPropsWithoutRef } from "react";

export const mdxComponents = {
  // > ... 渲染为 callout（衬线斜体竖线引用）
  blockquote: ({ children }: ComponentPropsWithoutRef<"blockquote">) => (
    <div className="callout">{children}</div>
  ),
  // 图片包成 figure 风格；tabIndex+role 让键盘用户也能触发 Lightbox（Enter/Space）。
  img: ({ alt, ...props }: ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt ?? ""}
      className="post-img"
      tabIndex={0}
      role="button"
      aria-label={alt ?? "查看大图"}
    />
  ),
};
