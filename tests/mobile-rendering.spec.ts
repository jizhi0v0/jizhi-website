import { test, expect } from "@playwright/test";

// 移动端渲染回归：覆盖 Telegram 工具栏渗色、右侧黑线、刷新闪烁 三个 bug 的修复。

const POST = "/posts/turn-to-claude-desktop";

test.describe("移动端渲染", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  // Issue 1: Telegram in-app browser 顶部工具栏渗色——缺少 theme-color meta 时，
  // WKWebView 半透明工具栏下方会透出页面内容。
  test("theme-color meta 存在且 light/dark 各一个", async ({ request }) => {
    const html = await (await request.get(POST)).text();
    // light
    expect(html).toMatch(
      /meta[^>]*name="theme-color"[^>]*content="#[0-9a-f]{6}"[^>]*media="\(prefers-color-scheme:\s*light\)"/i,
    );
    // dark
    expect(html).toMatch(
      /meta[^>]*name="theme-color"[^>]*content="#[0-9a-f]{6}"[^>]*media="\(prefers-color-scheme:\s*dark\)"/i,
    );
  });

  // Issue 2: 滚动时右侧出现 1px 黑线——viewport 需要 overflow-x:clip 截断合成层缝隙。
  test("html 或 body 的 overflow-x 不为 visible", async ({ page }) => {
    await page.goto(POST, { waitUntil: "domcontentloaded" });
    await page.locator(".app").waitFor();
    const overflow = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement).overflowX;
      const body = getComputedStyle(document.body).overflowX;
      return { html, body };
    });
    // 至少 html 或 body 之一需为 clip/hidden，阻止水平方向合成层溢出。
    // CSS 规范中 html 的 overflow 会传播到 viewport，所以检查至少一个非 visible 即可。
    const nonVisible =
      overflow.html !== "visible" || overflow.body !== "visible";
    expect(
      nonVisible,
      `html: ${overflow.html}, body: ${overflow.body} — 需要至少一个非 visible`,
    ).toBe(true);
  });

  // Issue 3: iOS Safari 刷新闪烁——scroll restoration 脚本需在 HTML 中出现。
  test("scroll restoration 脚本存在于 HTML 中", async ({ request }) => {
    const html = await (await request.get(POST)).text();
    expect(html).toContain("scrollRestoration");
    expect(html).toContain("sr-loading");
    expect(html).toContain("beforeunload");
  });

  // Issue 3 补充: sr-loading class 应使 .app 不可见（visibility:hidden），
  // 确保刷新期间遮挡中间态。
  test("sr-loading class 隐藏 .app", async ({ page }) => {
    await page.goto(POST, { waitUntil: "domcontentloaded" });
    await page.locator(".app").waitFor();
    const vis = await page.evaluate(() => {
      document.documentElement.classList.add("sr-loading");
      const v = getComputedStyle(document.querySelector(".app")!).visibility;
      document.documentElement.classList.remove("sr-loading");
      return v;
    });
    expect(vis).toBe("hidden");
  });
});
