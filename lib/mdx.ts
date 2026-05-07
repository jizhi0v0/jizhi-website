import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";

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
  rehypePlugins: [rehypeSlug, [rehypePrettyCode, prettyCodeOptions]],
} as const;
