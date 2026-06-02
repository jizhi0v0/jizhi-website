import Image from "next/image";

export const metadata = {
  title: "关于",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
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
      <h1>关于</h1>
      <article>
        <p>Hi, I'm jizhi0v0.</p>
      </article>
    </div>
  );
}
