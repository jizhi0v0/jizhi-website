import { AboutView } from "@/components/views/AboutView";
import { staticAlternates } from "@/lib/seo";

export const metadata = {
  title: "About",
  alternates: staticAlternates("en", "/about"),
};

export default function AboutPageEn() {
  return <AboutView locale="en" />;
}
