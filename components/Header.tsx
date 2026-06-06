"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

function navItems(t: (key: string) => string) {
  return [
    {
      href: "/",
      label: t("posts"),
      match: (p: string) => p === "/" || p.startsWith("/posts"),
    },
    {
      href: "/archive",
      label: t("archive"),
      match: (p: string) => p.startsWith("/archive"),
    },
    {
      href: "/tags",
      label: t("tags"),
      match: (p: string) => p.startsWith("/tags"),
    },
    {
      href: "/about",
      label: t("about"),
      match: (p: string) => p.startsWith("/about"),
    },
  ];
}

export function Header() {
  // next-intl 的 usePathname 返回「去掉 locale 前缀」的路径，active 判断直接用即可。
  const path = usePathname() ?? "/";
  const locale = useLocale();
  const otherLocale = locale === "en" ? "zh" : "en";
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

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
            <Link className="brand" href="/">
              jizhi0v0
            </Link>
            <span className="brand-tagline">keep_thinking</span>
          </div>
          <nav className="nav">
            {navItems(tNav).map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={"nav-link " + (i.match(path) ? "active" : "")}
              >
                {i.label}
              </Link>
            ))}
            <span className="nav-divider" aria-hidden="true" />
            {/*
              已知行为：lang-switch 无脑指向另一语言的「同一路径」，不校验目标是否存在。
              两类跨 locale 路径在目标侧不存在时会落 404，均按取舍「接受 404」处理：
              1) 文章页——EN 站只提供译文（见 lib/posts.ts localeSlugs），在「未译文章」的
                 中文页上点 EN 会落到 /en/posts/<slug> 的 404。当前所有文章都附带英文译文。
              2) 标签页——tag 各 locale 独立拼写（如「工作流」vs「Workflow」），故同一
                 pathname 在目标侧无对应 tag 时会因 TagDetailView notFound 落 404。
              path 是 usePathname() 的「去前缀」路径（/、/about…）。自己拼目标 locale 的
              干净 URL（en 加 /en，zh 不加），用普通 <a> 整页跳转——不走 next-intl <Link>，
              因为后者会按当前 locale 再加一次前缀（双重前缀），且切到默认 locale 会多一跳 307。
              localeDetection:false 下干净 URL 本身即解析到对应 locale。
              刻意用 <a> 整页跳转（而非客户端导航）：让根布局重新 SSR，拿到正确的
              <html lang> 与首帧前的引导 <script>；也避免客户端重渲染根布局时，内联
              <script> 触发 React "Encountered a script tag while rendering" 警告。
            */}
            <a
              href={
                (otherLocale === "en"
                  ? path === "/"
                    ? "/en"
                    : `/en${path}`
                  : path) + suffix
              }
              className="nav-link lang-switch"
              title={tCommon("switchTitle")}
            >
              {tCommon("switchLabel")}
            </a>
            <Link href="/about" className="avatar" title={tCommon("avatarTitle")}>
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
