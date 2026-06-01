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

// 把相邻的「纯图片段落」（连续 ≥2 张）合并进一个 .img-row 横排容器，
// 单张图保持原样。作者只要把多张图紧挨着写，就会自动横排。
function isImgParagraph(node: any): boolean {
  if (node?.type !== "element" || node.tagName !== "p") return false;
  const kids = node.children.filter(
    (c: any) => !(c.type === "text" && !c.value.trim()),
  );
  return kids.length === 1 && kids[0].tagName === "img";
}
function imgOf(node: any): any {
  return node.children.find((c: any) => c.tagName === "img");
}
function rehypeGroupImages() {
  return (tree: any) => {
    const walk = (node: any) => {
      if (!Array.isArray(node.children)) return;
      node.children.forEach(walk);
      const out: any[] = [];
      const ch = node.children;
      let i = 0;
      while (i < ch.length) {
        if (isImgParagraph(ch[i])) {
          const imgs: any[] = [];
          let j = i;
          while (j < ch.length) {
            if (isImgParagraph(ch[j])) imgs.push(imgOf(ch[j]));
            else if (ch[j].type === "text" && !ch[j].value.trim()) {
              /* skip whitespace between img paragraphs */
            } else break;
            j++;
          }
          if (imgs.length >= 2) {
            out.push({
              type: "element",
              tagName: "div",
              properties: { className: ["img-row"] },
              children: imgs,
            });
            i = j;
            continue;
          }
        }
        out.push(ch[i]);
        i++;
      }
      node.children = out;
    };
    walk(tree);
  };
}

export const mdxOptions = {
  remarkPlugins: [remarkGfm],
  // rehypeImgSize 在构建时读图真实宽高注入 width/height，浏览器据此预留空间，消除加载时的布局跳动
  rehypePlugins: [
    rehypeSlug,
    [rehypePrettyCode, prettyCodeOptions],
    [rehypeImgSize, { dir: "public" }],
    rehypeGroupImages,
  ],
} as const;
