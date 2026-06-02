// 把结构化数据序列化进 <script type="application/ld+json">。zh/en 多处复用。
// 转义 `<`：JSON.stringify 不处理它，字段里若出现 </script> 会提前闭合脚本块
// （破页 + 经典 XSS 注入向量）。当前字段都来自可信 frontmatter，这里做纵深防御。
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
