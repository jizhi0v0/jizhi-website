import type { ComponentPropsWithoutRef } from "react";

export const mdxComponents = {
  // > ... 渲染为 callout（衬线斜体竖线引用）
  blockquote: ({ children }: ComponentPropsWithoutRef<"blockquote">) => (
    <div className="callout">{children}</div>
  ),
  // 图片包成 figure 风格
  img: (props: ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} className="post-img" />
  ),
};
