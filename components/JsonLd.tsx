// 把结构化数据序列化进 <script type="application/ld+json">。zh/en 多处复用。
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
