import { getAllTags } from "@/lib/posts";
import { TagDetailView } from "@/components/views/TagDetailView";

export async function generateStaticParams() {
  const tags = await getAllTags("zh");
  return tags.map(({ tag }) => ({ tag: encodeURIComponent(tag) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return {
    title: `标签 · ${decodeURIComponent(tag)}`,
    alternates: { canonical: `/tags/${encodeURIComponent(tag)}` },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return <TagDetailView tag={decodeURIComponent(tag)} locale="zh" />;
}
