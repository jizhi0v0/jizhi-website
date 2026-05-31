import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// 取第一篇含 ≥2 个二级标题的文章——TOC 至少要两项才能测高亮切换。
const postsDir = join(process.cwd(), "content/posts");
const slug = readdirSync(postsDir)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => ({
    slug: f.replace(/\.mdx$/, ""),
    h2: (readFileSync(join(postsDir, f), "utf8").match(/^##\s+/gm) || []).length,
  }))
  .find((p) => p.h2 >= 2)?.slug;

// TOC 仅在 ≥1080px 显示（见 globals.css），固定桌面宽度。
test.describe("TOC 高亮", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test.skip(!slug, "没有含 ≥2 个二级标题的文章");

  // bug 1：h2 scroll-margin-top=280 落在旧阈值(viewport*0.2≈180)之下，
  // 点击第二项会错误高亮第一项。
  test("点击第 2 项高亮第 2 项，不偏移到第 1 项", async ({ page }) => {
    await page.goto(`/posts/${slug}`, { waitUntil: "domcontentloaded" });
    const items = page.locator(".toc-item");
    await items.nth(1).click();
    // toHaveClass 自带轮询，等高亮切换即可，无需固定 sleep
    await expect(items.nth(1)).toHaveClass(/active/);
    await expect(items.nth(0)).not.toHaveClass(/active/);
  });

  // bug 2：刷新/直接打开到第 N 节，应稳定高亮第 N 项（旧逻辑停在第一项）。
  test("打开到第 2 节的锚点，高亮第 2 项", async ({ page }) => {
    await page.goto(`/posts/${slug}`, { waitUntil: "domcontentloaded" });
    const id = await page.locator(".post-body h2").nth(1).getAttribute("id");
    await page.goto(`/posts/${slug}#${id}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".toc-item").nth(1)).toHaveClass(/active/);
  });

  // bug 3：标题一越过阅读线(≈290)就应高亮，不滞后；尚未越过则不高亮。
  test("第 2 标题越过阅读线即高亮，未越过则不高亮", async ({ page }) => {
    await page.goto(`/posts/${slug}`, { waitUntil: "domcontentloaded" });
    const items = page.locator(".toc-item");
    const absTop = await page
      .locator(".post-body h2")
      .nth(1)
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

    // 第二标题顶部 ≈250px（< 阅读线）→ 已越线 → 高亮第 2 项
    await page.evaluate((y) => window.scrollTo(0, y), absTop - 250);
    await expect(items.nth(1)).toHaveClass(/active/);

    // 第二标题顶部 ≈420px（> 阅读线）→ 未越线 → 不应高亮第 2 项
    await page.evaluate((y) => window.scrollTo(0, y), absTop - 420);
    await expect(items.nth(1)).not.toHaveClass(/active/);
  });
});
