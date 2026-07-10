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
      {
        // 自托管的正文衬线子集（public/fonts/*.woff2，见 scripts/build-fonts.mjs）。
        // 文件名不带 hash（重跑 fonts 会原地覆盖），故不发 immutable：长缓存 + SWR，
        // 后台静默续期；改字后返场访客最迟隔天拿到新字，期间旧字照常可用。
        source: "/fonts/:path*.woff2",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
