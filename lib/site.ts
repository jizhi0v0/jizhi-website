export const SITE_URL = "https://www.jizhiovo.com";
export const SITE_NAME = "jizhi0v0 / keep_thinking";
export const SITE_DESCRIPTION = "一个写得不勤、但还在写的小角落。";
export const SITE_DESCRIPTION_EN =
  "A small corner I don't write in often — but still do.";
export const SITE_AUTHOR = "jizhi0v0";

/** 拼出绝对 URL，供 sitemap / RSS / JSON-LD 等需要完整地址的场景使用。 */
export function absUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
