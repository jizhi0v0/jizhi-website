import { AboutView } from "@/components/views/AboutView";
import { staticAlternates } from "@/lib/seo";

export const metadata = {
  title: "关于",
  alternates: staticAlternates("zh", "/about"),
};

export default function AboutPage() {
  return <AboutView locale="zh" />;
}
