import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n";

export async function AboutView({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "about" });
  return (
    <div className="container about-page">
      <div className="about-avatar">
        <Image
          src="/avatar.png"
          alt="jizhi0v0"
          width={240}
          height={240}
          priority
        />
      </div>
      <h1>{t("title")}</h1>
      <article>
        <p>Hi, I'm jizhi0v0.</p>
      </article>
    </div>
  );
}
