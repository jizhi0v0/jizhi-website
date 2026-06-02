import { getTranslations } from "next-intl/server";
import { getAllPosts } from "@/lib/posts";
import { PostList } from "@/components/PostList";
import type { Locale } from "@/lib/i18n";

export async function HomeView({ locale }: { locale: Locale }) {
  const posts = await getAllPosts(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="container-wide">
      <div className="intro">
        <p className="intro-line">
          {t("homeIntro")}
          <br />
        </p>
      </div>
      <PostList posts={posts} />
    </div>
  );
}
