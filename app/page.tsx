import { getAllPosts } from "@/lib/posts";
import { PostList } from "@/components/PostList";

export default async function HomePage() {
  const posts = await getAllPosts();

  if (posts.length === 0) {
    return (
      <div className="container-wide home-empty">
        <p className="home-empty-line">一些碎碎念.</p>
      </div>
    );
  }

  return (
    <div className="container-wide">
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
