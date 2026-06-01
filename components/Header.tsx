"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  dict,
  localeFromPath,
  altLocalePath,
  withLocale,
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
  const basePath = locale === "en" ? path.slice(3) || "/" : path;

  // 客户端导航在 zh/en 间切换时同步 <html lang>（首帧由 layout 内联脚本设置）
  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  }, [locale]);

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
            <Link
              href={altLocalePath(path)}
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
