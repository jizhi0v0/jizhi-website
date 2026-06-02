import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // /public 下的图片默认是 max-age=0,must-revalidate（每次刷新都回源校验）。
        // 这里按扩展名匹配，发 immutable，刷新直接走本地缓存、零网络。
        // 注意：文件名不带 hash，改图需换文件名，否则旧缓存不更新。
        source: "/(.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
