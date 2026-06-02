import { TagsView } from "@/components/views/TagsView";
import { staticAlternates } from "@/lib/seo";

export const metadata = {
  title: "Tags",
  alternates: staticAlternates("en", "/tags"),
};

export default function TagsPageEn() {
  return <TagsView locale="en" />;
}
