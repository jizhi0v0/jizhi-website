"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "文章", match: (p: string) => p === "/" || p.startsWith("/posts") },
  { href: "/archive", label: "归档", match: (p: string) => p.startsWith("/archive") },
  { href: "/tags", label: "标签", match: (p: string) => p.startsWith("/tags") },
  { href: "/about", label: "关于", match: (p: string) => p.startsWith("/about") },
];

export function Header() {
  const path = usePathname() ?? "/";
  return (
    <header className="site-header">
      <div className="container-wide">
        <div className="site-header-inner">
          <div>
            <Link className="brand" href="/">
              jizhi0v0
            </Link>
            <span className="brand-tagline">keep_thinking</span>
          </div>
          <nav className="nav">
            {NAV.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={"nav-link " + (i.match(path) ? "active" : "")}
              >
                {i.label}
              </Link>
            ))}
            <Link href="/about" className="avatar" title="关于我">
              <Image
                src="/avatar.png"
                alt="jizhi0v0"
                width={60}
                height={60}
                priority
              />
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
