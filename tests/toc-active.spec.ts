import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// 取第一篇含 ≥2 个二级标题的文章——TOC 至少要两项才能测高亮切换。
const postsDir = join(process.cwd(), "content/posts");
const slug = readdirSync(postsDir)
  .filter((f) => f.endsWith(".mdx") && !/\.[a-z]{2}\.mdx$/.test(f))
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

  // bug 4：SSR/预渲染 HTML 不得预置任何 active。否则浏览器首绘（早于 hydration 与
  // useLayoutEffect）即把第一项画成高亮，刷新到中段会闪一下第一项——纯客户端断言
  // （toHaveClass 轮询最终态）抓不到这一帧，故直接校验服务端产物。
  test("SSR HTML 不预置任何 active 高亮", async ({ request }) => {
    const html = await (await request.get(`/posts/${slug}`)).text();
    expect(html).toContain('class="toc-item'); // 确认 TOC 确实渲染进了首屏 HTML
    // 只校验 toc-item 自身的 class 属性内不含 active；用 class="toc-item…active 收紧，
    // 避免误命中 Header 的 nav-link active 等无关高亮。
    expect(html).not.toMatch(/class="toc-item[^"]*active/);
    // 首屏须带 data-spy="off"：配合 CSS 把无 active 的目录提到可读色，否则首屏全暗 broken。
    expect(html).toMatch(/class="toc"[^>]*data-spy="off"/);
  });

  // bug 5：.post-meta-bar 用 box-shadow 0 0 0 100vw 把纸色背景向左右各延伸一屏遮身后正文，
  // 这层背景会盖到左 gutter 的 TOC 上、把目录涂成背景色（表现为「目录被遮挡」）。TOC 的
  // z-index 必须高于 meta 栏，才能浮在那层 box-shadow 之上正常显示。
  test("TOC 层叠高于 meta 栏，不被其全宽 box-shadow 遮挡", async ({ page }) => {
    await page.goto(`/posts/${slug}`, { waitUntil: "domcontentloaded" });
    const z = await page.evaluate(() => {
      const zi = (sel: string) =>
        parseInt(getComputedStyle(document.querySelector(sel)!).zIndex, 10);
      return { toc: zi(".toc"), meta: zi(".post-meta-bar") };
    });
    expect(z.toc).toBeGreaterThan(z.meta);
  });
});
