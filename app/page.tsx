import { getAllPosts } from "@/lib/posts";
import { PostList } from "@/components/PostList";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata = {
  alternates: { canonical: "/" },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  inLanguage: "zh-CN",
};

export default async function HomePage() {
  const posts = await getAllPosts();

  return (
    <div className="container-wide">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <div className="intro">
        <p className="intro-line">
          一些碎碎念.
          <br />
        </p>
      </div>
      <PostList posts={posts} />
    </div>
  );
}
