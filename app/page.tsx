import { getAllPosts } from "@/lib/posts";
import { PostList } from "@/components/PostList";

export default async function HomePage() {
  const posts = await getAllPosts();
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
