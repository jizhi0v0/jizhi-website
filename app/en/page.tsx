import { HomeView } from "@/components/views/HomeView";
import { JsonLd } from "@/components/JsonLd";
import { staticAlternates, websiteJsonLd } from "@/lib/seo";

export const metadata = {
  alternates: staticAlternates("en", "/"),
};

export default function HomePageEn() {
  return (
    <>
      <JsonLd data={websiteJsonLd("en")} />
      <HomeView locale="en" />
    </>
  );
}
