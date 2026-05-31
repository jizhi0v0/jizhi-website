import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import rehypeImgSize from "rehype-img-size";

const prettyCodeOptions: PrettyCodeOptions = {
  theme: {
    light: "github-light",
    dark: "github-dark-dimmed",
  },
  keepBackground: true,
  defaultLang: "plaintext",
};

export const mdxOptions = {
  remarkPlugins: [remarkGfm],
  // rehypeImgSize 在构建时读图真实宽高注入 width/height，浏览器据此预留空间，消除加载时的布局跳动
  rehypePlugins: [
    rehypeSlug,
    [rehypePrettyCode, prettyCodeOptions],
    [rehypeImgSize, { dir: "public" }],
  ],
} as const;
