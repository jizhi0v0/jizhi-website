import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// locale 感知的导航封装：Link/usePathname 自动按当前 locale 加/去 /en 前缀，
// 取代旧的 withLocale()/localeFromPath()/altLocalePath()。
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
