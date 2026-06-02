import { ArchiveView } from "@/components/views/ArchiveView";

export const metadata = {
  title: "归档",
  alternates: { canonical: "/archive" },
};

export default function ArchivePage() {
  return <ArchiveView locale="zh" />;
}
