import { TagsView } from "@/components/views/TagsView";

export const metadata = {
  title: "标签",
  alternates: { canonical: "/tags" },
};

export default function TagsPage() {
  return <TagsView locale="zh" />;
}
