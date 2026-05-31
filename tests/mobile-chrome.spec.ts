import { test, expect, devices } from "@playwright/test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

// 一篇真实文章即可（取任意一篇），用来验证移动端浏览器 chrome 相关的回归。
const postsDir = join(process.cwd(), "content/posts");
const slug = readdirSync(postsDir)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => f.replace(/\.mdx$/, ""))[0];

// 这些回归无法在桌面引擎里 100% 复现 iOS 的一帧闪烁/原生滚动条着色，
// 但根因都落在「服务端是否吐出正确的 theme-color / color-scheme」这一可确定产物上，
// 直接校验 SSR HTML 与计算样式，把根因锁死。

test.describe("移动端浏览器 chrome（theme-color / color-scheme）", () => {
  test.skip(!slug, "没有文章");

  // Issue 1：Telegram 等 WKWebView 顶栏半透明，无 theme-color 时透出正文显脏。
  // 必须给明暗两套不透明 theme-color，且颜色要与页面纸色底一致，顶栏才会是实色、不透出。
  test("SSR HTML 提供明暗两套不透明 theme-color", async ({ request }) => {
    const html = await (await request.get(`/posts/${slug}`)).text();
    const tags = html.match(/<meta[^>]*name="theme-color"[^>]*>/g) ?? [];
    // 明暗各一条
    expect(tags.some((t) => /prefers-color-scheme:\s*light/.test(t))).toBe(true);
    expect(tags.some((t) => /prefers-color-scheme:\s*dark/.test(t))).toBe(true);
    // 取出 content 颜色，必须是不透明 hex（#rgb/#rrggbb）——半透明会让顶栏继续透出
    const colors = tags
      .map((t) => t.match(/content="([^"]+)"/)?.[1])
      .filter(Boolean) as string[];
    expect(colors.length).toBeGreaterThanOrEqual(2);
    for (const c of colors) {
      expect(c, `theme-color 必须是不透明 hex，实际 ${c}`).toMatch(
        /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
      );
    }
  });

  // Issue 1 + 2：声明 color-scheme，让 iOS 原生 UI（顶栏/滚动指示条/回弹底色）跟随网页主题，
  // 而不是按系统设置乱配——否则深色页面配浅色滚动指示条，滚动时最右沿显示成一条竖线。
  test("声明 color-scheme: light dark", async ({ request, page }) => {
    const html = await (await request.get(`/posts/${slug}`)).text();
    // Next 会从 viewport.colorScheme 吐出 <meta name="color-scheme">
    expect(html).toMatch(/<meta[^>]*name="color-scheme"[^>]*content="light dark"/);
    // 且计算样式上 html 真正应用了 color-scheme（CSS 真源，WebKit 据此给原生滚动条着色）
    await page.goto(`/posts/${slug}`, { waitUntil: "domcontentloaded" });
    const cs = await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    );
    expect(cs).toContain("light");
    expect(cs).toContain("dark");
  });

  // theme-color 必须与各模式下页面实际背景一致，否则 Telegram 顶栏虽是实色、但与正文有色差，
  // 仍显得「接缝」。用 WebKit + iPhone profile 分别在明暗下取 body 背景做像素级比对。
  for (const scheme of ["light", "dark"] as const) {
    test(`theme-color(${scheme}) 与页面背景一致`, async ({ browser }) => {
      const ctx = await browser.newContext({
        ...devices["iPhone 13"],
        colorScheme: scheme,
      });
      const page = await ctx.newPage();
      await page.goto(`/posts/${slug}`, { waitUntil: "domcontentloaded" });

      // 取该模式 theme-color 的 hex
      const themeColor = await page.evaluate((s) => {
        const m = [
          ...document.querySelectorAll('meta[name="theme-color"]'),
        ].find((el) =>
          el.getAttribute("media")?.includes(`prefers-color-scheme: ${s}`),
        );
        return m?.getAttribute("content") ?? null;
      }, scheme);
      expect(themeColor).toBeTruthy();

      // 取 body 实际背景，归一成 hex
      const bodyHex = await page.evaluate(() => {
        const cv = document.createElement("canvas");
        cv.width = cv.height = 4;
        const cx = cv.getContext("2d")!;
        cx.fillStyle = getComputedStyle(document.body).backgroundColor;
        cx.fillRect(0, 0, 4, 4);
        const [r, g, b] = cx.getImageData(1, 1, 1, 1).data;
        const h = (n: number) => n.toString(16).padStart(2, "0");
        return "#" + h(r) + h(g) + h(b);
      });

      expect(
        bodyHex.toLowerCase(),
        `${scheme} 模式 theme-color=${themeColor} 应与 body 背景 ${bodyHex} 一致`,
      ).toBe(themeColor!.toLowerCase());
      await ctx.close();
    });
  }
});
