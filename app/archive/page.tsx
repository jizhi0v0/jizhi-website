import { ArchiveView } from "@/components/views/ArchiveView";
import { staticAlternates } from "@/lib/seo";

export const metadata = {
  title: "归档",
  alternates: staticAlternates("zh", "/archive"),
};

export default function ArchivePage() {
  return <ArchiveView locale="zh" />;
}
