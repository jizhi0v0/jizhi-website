import { ArchiveView } from "@/components/views/ArchiveView";
import { staticAlternates } from "@/lib/seo";

export const metadata = {
  title: "Archive",
  alternates: staticAlternates("en", "/archive"),
};

export default function ArchivePageEn() {
  return <ArchiveView locale="en" />;
}
