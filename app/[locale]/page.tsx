import { setRequestLocale } from "next-intl/server";
import { HomeView } from "@/components/views/HomeView";
import { JsonLd } from "@/components/JsonLd";
import { staticAlternates, websiteJsonLd } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return { alternates: staticAlternates(locale as Locale, "/") };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <JsonLd data={websiteJsonLd(locale as Locale)} />
      <HomeView locale={locale as Locale} />
    </>
  );
}
