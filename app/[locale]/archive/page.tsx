import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArchiveView } from "@/components/views/ArchiveView";
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
    title: t("archive"),
    alternates: staticAlternates(locale as Locale, "/archive"),
  };
}

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ArchiveView locale={locale as Locale} />;
}
