import Image from "next/image";
import { dict, type Locale } from "@/lib/i18n";

export function AboutView({ locale }: { locale: Locale }) {
  const d = dict(locale);
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
      <h1>{d.aboutTitle}</h1>
      <article>
        <p>Hi, I'm jizhi0v0.</p>
      </article>
    </div>
  );
}
