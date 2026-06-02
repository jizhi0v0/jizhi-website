import { AboutView } from "@/components/views/AboutView";

export const metadata = {
  title: "关于",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutView locale="zh" />;
}
