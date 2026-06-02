import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // 跳过 API、Next 内部资源、og 路由处理器，以及任何带扩展名的文件
  // （sitemap.xml / robots.txt / feed.xml / manifest.webmanifest / *.png 等元数据路由）。
  matcher: "/((?!api|og|_next|_vercel|.*\\..*).*)",
};
