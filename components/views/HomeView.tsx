import { getAllPosts } from "@/lib/posts";
import { PostList } from "@/components/PostList";
import { dict, type Locale } from "@/lib/i18n";

export async function HomeView({ locale }: { locale: Locale }) {
  const posts = await getAllPosts();
  const d = dict(locale);

  return (
    <div className="container-wide">
      <div className="intro">
        <p className="intro-line">
          {d.homeIntro}
          <br />
        </p>
      </div>
      <PostList posts={posts} locale={locale} />
    </div>
  );
}
