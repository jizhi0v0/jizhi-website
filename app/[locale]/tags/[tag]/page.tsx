import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllTags } from "@/lib/posts";
import { TagDetailView } from "@/components/views/TagDetailView";
import { routing } from "@/i18n/routing";
import { localizedPath } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";

export async function generateStaticParams() {
  const params: { locale: string; tag: string }[] = [];
  for (const locale of routing.locales) {
    const tags = await getAllTags(locale);
    for (const { tag } of tags) {
      params.push({ locale, tag: encodeURIComponent(tag) });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}) {
  const { locale, tag } = await params;
  const decoded = decodeURIComponent(tag);
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("tag", { tag: decoded }),
    alternates: {
      canonical: localizedPath(
        locale as Locale,
        `/tags/${encodeURIComponent(decoded)}`,
      ),
    },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}) {
  const { locale, tag } = await params;
  setRequestLocale(locale);
  return (
    <TagDetailView tag={decodeURIComponent(tag)} locale={locale as Locale} />
  );
}
