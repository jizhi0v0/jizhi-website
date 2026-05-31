import { test, expect } from "@playwright/test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

// 从 content/posts 动态取 slug，新增文章自动纳入回归，无需改测试。
const postSlugs = readdirSync(join(process.cwd(), "content/posts"))
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => f.replace(/\.mdx$/, ""));

const routes = [
  "/",
  "/archive",
  "/tags",
  "/about",
  ...postSlugs.map((s) => `/posts/${s}`),
];

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
        await page.goto(route, { waitUntil: "networkidle" });
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
test("移动端代码块内部横向滚动，不撑破页面", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  for (const slug of postSlugs) {
    await page.goto(`/posts/${slug}`, { waitUntil: "networkidle" });
    const pres = page.locator(".post-body pre");
    const count = await pres.count();
    for (let i = 0; i < count; i++) {
      const box = await pres.nth(i).evaluate((el) => ({
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
      }));
      if (box.scrollW > box.clientW) {
        // 找到一个有溢出内容的代码块：它内部能滚，页面整体却不溢出 → 修复成立
        const doc = await page.evaluate(() => ({
          s: document.documentElement.scrollWidth,
          c: document.documentElement.clientWidth,
        }));
        expect(doc.s).toBeLessThanOrEqual(doc.c + 1);
        return;
      }
    }
  }
  test.skip(true, "没有文章包含超出窄屏宽度的代码行，跳过该正向检查");
});
