import { getTranslations, setRequestLocale } from "next-intl/server";
import { TagsView } from "@/components/views/TagsView";
import { staticAlternates } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("tags"),
    alternates: staticAlternates(locale as Locale, "/tags"),
  };
}

export default async function TagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TagsView locale={locale as Locale} />;
}
