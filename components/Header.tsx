"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  dict,
  localeFromPath,
  altLocalePath,
  withLocale,
  EN_PREFIX,
  type Dict,
} from "@/lib/i18n";

function navItems(d: Dict) {
  return [
    {
      href: "/",
      label: d.nav.posts,
      // 注意：match 收到的是「去掉 /en 前缀后的中文基准路径」
      match: (p: string) => p === "/" || p.startsWith("/posts"),
    },
    {
      href: "/archive",
      label: d.nav.archive,
      match: (p: string) => p.startsWith("/archive"),
    },
    {
      href: "/tags",
      label: d.nav.tags,
      match: (p: string) => p.startsWith("/tags"),
    },
    {
      href: "/about",
      label: d.nav.about,
      match: (p: string) => p.startsWith("/about"),
    },
  ];
}

export function Header() {
  const path = usePathname() ?? "/";
  const locale = localeFromPath(path);
  const d = dict(locale);
  // 去掉 /en 前缀后用于 active 判断
  const basePath = locale === "en" ? path.slice(EN_PREFIX.length) || "/" : path;

  // 语言切换时保留当前 search / hash（usePathname 不含这两者），避免在文章页
  // 点切换丢失 TOC 锚点。客户端读取：SSR 首帧无后缀，挂载后补上；hashchange 实时跟随。
  const [suffix, setSuffix] = useState("");
  useEffect(() => {
    const sync = () => setSuffix(window.location.search + window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [path]);

  return (
    <header className="site-header">
      <div className="container-wide">
        <div className="site-header-inner">
          <div>
            <Link className="brand" href={withLocale("/", locale)}>
              jizhi0v0
            </Link>
            <span className="brand-tagline">keep_thinking</span>
          </div>
          <nav className="nav">
            {navItems(d).map((i) => (
              <Link
                key={i.href}
                href={withLocale(i.href, locale)}
                className={"nav-link " + (i.match(basePath) ? "active" : "")}
              >
                {i.label}
              </Link>
            ))}
            <span className="nav-divider" aria-hidden="true" />
            <Link
              href={altLocalePath(path) + suffix}
              className="nav-link lang-switch"
              title={d.switchTitle}
            >
              {d.switchLabel}
            </Link>
            <Link
              href={withLocale("/about", locale)}
              className="avatar"
              title={d.avatarTitle}
            >
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
