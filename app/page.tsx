import { HomeView } from "@/components/views/HomeView";
import { JsonLd } from "@/components/JsonLd";
import { staticAlternates, websiteJsonLd } from "@/lib/seo";

export const metadata = {
  alternates: staticAlternates("zh", "/"),
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={websiteJsonLd("zh")} />
      <HomeView locale="zh" />
    </>
  );
}
