import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "jizhi0v0",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    lang: "zh-CN",
    // 与 layout viewport.themeColor 的 light 取值一致
    background_color: "#fcfaf6",
    theme_color: "#fcfaf6",
    icons: [
      { src: "/icon.png", sizes: "64x64", type: "image/png" },
      { src: "/avatar.png", sizes: "240x240", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
