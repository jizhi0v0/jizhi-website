import { getAllTags } from "@/lib/posts";
import { TagDetailView } from "@/components/views/TagDetailView";

export async function generateStaticParams() {
  const tags = await getAllTags("en");
  return tags.map(({ tag }) => ({ tag: encodeURIComponent(tag) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return {
    title: `Tag · ${decodeURIComponent(tag)}`,
    alternates: { canonical: `/en/tags/${encodeURIComponent(tag)}` },
  };
}

export default async function TagPageEn({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return <TagDetailView tag={decodeURIComponent(tag)} locale="en" />;
}
