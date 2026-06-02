import { TagsView } from "@/components/views/TagsView";
import { staticAlternates } from "@/lib/seo";

export const metadata = {
  title: "标签",
  alternates: staticAlternates("zh", "/tags"),
};

export default function TagsPage() {
  return <TagsView locale="zh" />;
}
