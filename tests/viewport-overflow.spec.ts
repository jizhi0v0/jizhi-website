import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// 从 content/posts 动态取 slug，新增文章自动纳入回归，无需改测试。
const postsDir = join(process.cwd(), "content/posts");
const mdxFiles = readdirSync(postsDir).filter((f) => f.endsWith(".mdx"));
const postSlugs = mdxFiles.map((f) => f.replace(/\.mdx$/, ""));

// 含围栏代码块（```）的文章——只有这些才可能出现需要内部滚动的超长行。
const postsWithCode = mdxFiles
  .filter((f) => readFileSync(join(postsDir, f), "utf8").includes("```"))
  .map((f) => f.replace(/\.mdx$/, ""));

const zhRoutes = [
  "/",
  "/archive",
  "/tags",
  "/about",
  ...postSlugs.map((s) => `/posts/${s}`),
];

// 英文 UI 版走 /en 前缀，文案换成英文（可能更长）但布局复用同一套组件，
// 一并纳入横向溢出回归。
const routes = [...zhRoutes, ...zhRoutes.map((r) => (r === "/" ? "/en" : `/en${r}`))];

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
];

// 回归 .app 的 grid 隐式列被 .container(max-width+padding) 及代码块超长行
// 撑宽 → 移动端 layout viewport 被撑爆、走桌面布局 + iOS 文字放大的 bug。
// 守护断言：任何页面在任何宽度下都不得产生横向滚动。
for (const vp of viewports) {
  test.describe(`${vp.name} ${vp.width}px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of routes) {
      test(`无横向溢出 ${route}`, async ({ page }) => {
        // 不用 networkidle：站点挂了 analytics/speed-insights 长连接，可能永远等不到静默。
        // 布局根渲染出来即可测溢出（CSS 阻塞渲染、图片有显式宽高、字体 display:optional 不回流）。
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.locator(".app").waitFor();
        const { scrollW, clientW } = await page.evaluate(() => ({
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
        }));
        // +1 容许亚像素舍入
        expect(
          scrollW,
          `${route} 在 ${vp.width}px 下横向溢出: scrollWidth=${scrollW} > clientWidth=${clientW}`,
        ).toBeLessThanOrEqual(clientW + 1);
      });
    }
  });
}

// 正向语义：代码块超长行应在 pre 内部横向滚动（overflow-x:auto 生效），
// 而不是靠换行牺牲可读性、也不是撑破页面。在移动端窄屏下验证。
test.describe("代码块横向滚动", () => {
  test.skip(postsWithCode.length === 0, "没有含代码块的文章");
  test.use({ viewport: { width: 375, height: 812 } });

  test("代码块超长行在 pre 内部滚动，不撑破页面", async ({ page }) => {
    for (const slug of postsWithCode) {
      await page.goto(`/posts/${slug}`, { waitUntil: "domcontentloaded" });
      await page.locator(".post-body").waitFor();

      // 含代码块的页面整体始终不得横向溢出
      const doc = await page.evaluate(() => ({
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      }));
      expect(
        doc.s,
        `/posts/${slug} 横向溢出: ${doc.s} > ${doc.c}`,
      ).toBeLessThanOrEqual(doc.c + 1);

      // 若某代码块内容超出窄屏宽度，应是 pre 自身可横向滚动（而非撑破页面）
      const pres = page.locator(".post-body pre");
      const count = await pres.count();
      for (let i = 0; i < count; i++) {
        const box = await pres.nth(i).evaluate((el) => ({
          scrollW: el.scrollWidth,
          clientW: el.clientWidth,
        }));
        if (box.scrollW > box.clientW) {
          expect(box.clientW).toBeLessThanOrEqual(375);
        }
      }
    }
  });
});
