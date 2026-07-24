import type { ComponentPropsWithoutRef } from "react";
import { CodeBlock } from "./CodeBlock";
import { Tweet } from "./Tweet";

export const mdxComponents = {
  // 正文里嵌入的 X/Twitter 预览卡
  Tweet,
  // > ... 渲染为 callout（衬线斜体竖线引用）
  blockquote: ({ children }: ComponentPropsWithoutRef<"blockquote">) => (
    <div className="callout">{children}</div>
  ),
  // GFM 表格包一层横向滚动容器，窄屏不挤坏正文布局。
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="table-scroll">
      <table {...props} />
    </div>
  ),
  // 代码块（rehype-pretty-code 输出 <pre>）包一层带复制按钮的容器。
  pre: (props: ComponentPropsWithoutRef<"pre">) => <CodeBlock {...props} />,
  // 图片包成 figure 风格；tabIndex+role 让键盘用户也能触发 Lightbox（Enter/Space）。
  // aria-label 省略：role="button" 让 AT 报按钮，可访问名直接来自 alt，不冗余。
  img: ({ alt, ...props }: ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt ?? ""}
      className="post-img"
      tabIndex={0}
      role="button"
    />
  ),
};
