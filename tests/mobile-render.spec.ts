import { test, expect, devices } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// 用 webkit 引擎 + iPhone 13 设备模拟器跑——只有 WebKit 能复现 iOS Safari /
// Telegram in-app browser（WKWebView）的特性（color-scheme 滚动条、theme-color
// 读法、scroll restoration 时序）。chromium 引擎和 jsdom 都覆盖不到。
test.use({
  ...devices["iPhone 13"],
  // 关键 fix 要在两种 scheme 下都验，dark 是用户报告 bug 的主战场。
  colorScheme: "dark",
});

const postsDir = join(process.cwd(), "content/posts");
const slugWithCode = readdirSync(postsDir)
  .filter((f) => f.endsWith(".mdx"))
  .find((f) => readFileSync(join(postsDir, f), "utf8").includes("```"))
  ?.replace(/\.mdx$/, "");

test.describe("移动端渲染：Telegram 顶部透出 / 滚动条黑线 / 刷新闪烁", () => {
  // ====================================================================
  // Issue 1: Telegram in-app browser 顶部内容透出
  // 根因：未声明 <meta name="theme-color">，Telegram 半透明工具栏因无底色
  // 直接透出页面正文。修：viewport.themeColor 注入 light/dark 两份 meta。
  // ====================================================================
  test("Issue 1: 设置 theme-color meta（Telegram 工具栏底色）", async ({
    request,
  }) => {
    const html = await (
      await request.get("/posts/turn-to-claude-desktop")
    ).text();
    // 两份 theme-color：light 与 dark 各一份，颜色与 --paper 对齐
    const themeColorMatches = [
      ...html.matchAll(/name="theme-color"[^>]*content="([^"]+)"/g),
    ];
    expect(themeColorMatches.length).toBeGreaterThanOrEqual(2);
    const colors = themeColorMatches.map((m) => m[1].toLowerCase());
    // 至少一个 light、一个 dark
    const hasLight = colors.some(
      (c) => c.startsWith("#f") || c.startsWith("#e"),
    );
    const hasDark = colors.some(
      (c) => c.startsWith("#1") || c.startsWith("#2") || c.startsWith("#0"),
    );
    expect(hasLight, `期望有 light theme-color，实际: ${colors.join(",")}`).toBe(
      true,
    );
    expect(hasDark, `期望有 dark theme-color，实际: ${colors.join(",")}`).toBe(
      true,
    );
  });

  // ====================================================================
  // Issue 2: 移动端滚动时右侧黑色竖线
  // 根因：根元素未声明 color-scheme，iOS Safari/WKWebView UA 默认按 light
  // 渲染滚动条拇指（深色），在深色页面上滚动时呈现为右侧一道窄黑线。修：
  // viewport.colorScheme = "light dark"，让 UA 按当前 scheme 选拇指颜色。
  // ====================================================================
  test("Issue 2: 声明 color-scheme（iOS 滚动条配色）", async ({ request }) => {
    const html = await (
      await request.get("/posts/turn-to-claude-desktop")
    ).text();
    // 必须同时声明 light + dark，单独 dark 会让浅色访问者也看到深色滚动条
    expect(html).toMatch(/name="color-scheme"[^>]*content="[^"]*light[^"]*"/);
    expect(html).toMatch(/name="color-scheme"[^>]*content="[^"]*dark[^"]*"/);
  });

  // ====================================================================
  // Issue 3.1: pull-to-refresh 时第一帧画到 scrollY=0 才跳回原位
  // 根因：浏览器默认 scrollRestoration='auto' 在首帧之后才恢复滚动。修：
  // head 同步脚本切到 manual，body 收尾脚本读 sessionStorage 立即恢复 Y。
  // ====================================================================
  test("Issue 3.1: reload 后首个可观测帧已落在原位，不闪到顶部", async ({
    page,
  }) => {
    test.skip(
      !slugWithCode,
      "没有可滚到中段的长文（需要 ≥1 个代码块的文章）",
    );
    await page.goto(`/posts/${slugWithCode}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("load");

    // 滚到代码块附近——文章中段
    await page.evaluate(() => {
      const pre = document.querySelector("pre");
      pre?.scrollIntoView({ block: "center" });
    });
    // 等待 rAF 节流的 save 把 Y 落到 sessionStorage
    await page.waitForFunction(() => {
      const k = "sy:" + location.pathname + location.search;
      const v = sessionStorage.getItem(k);
      return v && parseInt(v, 10) > 100;
    });
    const beforeY = await page.evaluate(() => window.scrollY);
    expect(beforeY).toBeGreaterThan(100);

    // reload 之后立即采样，首个可读到 readyState>=interactive 的帧 scrollY 应已恢复
    await page.reload({ waitUntil: "commit" });
    const firstFrame = await page.evaluate(() => ({
      y: window.scrollY,
      ready: document.readyState,
      restoreFlag: window.__restoreY,
    }));
    // commit 后立刻读，至少 __restoreY 已经被 head 脚本写入
    expect(firstFrame.restoreFlag).toBe(beforeY);

    // 等首个有 body 的可见帧——此时 scrollY 必须 = beforeY，绝不能是 0
    await page.waitForFunction(() => document.readyState !== "loading");
    const afterReady = await page.evaluate(() => window.scrollY);
    expect(
      afterReady,
      `刷新后首个可观测帧 scrollY=${afterReady}，期望 ${beforeY}；闪到 0 即回归`,
    ).toBe(beforeY);
  });

  // ====================================================================
  // Issue 3.2: pull-to-refresh 中间有一帧"只剩代码块可见"
  // 根因：正文衬线 font-display:optional 有 ~100ms block 期，期间文本不可见，
  // 而代码块用 mono（display:swap，零 block 期）正常显示，于是出现"独亮代码块"。
  // 修：衬线改 display:swap，fallback 立即上屏。校验 @font-face 含 swap。
  // ====================================================================
  test("Issue 3.2: 衬线 @font-face 用 font-display:swap（避免 FOIT 空白闪）", async ({
    request,
  }) => {
    // 取出页面里所有 stylesheet 链接，依次 fetch，看其中包含 Noto Serif SC 的那份的 display
    const html = await (await request.get("/")).text();
    const cssLinks = [
      ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
    ].map((m) => m[1]);
    expect(cssLinks.length).toBeGreaterThan(0);

    let foundSerifFace = false;
    for (const href of cssLinks) {
      const css = await (await request.get(href)).text();
      if (!css.includes("Noto Serif SC")) continue;
      foundSerifFace = true;
      // 提取所有 Noto Serif SC 的 @font-face 块，全部必须是 swap
      const faces = css.match(
        /font-family:Noto Serif SC[^}]*font-display:[a-z]+/g,
      );
      expect(faces).not.toBeNull();
      for (const face of faces!) {
        expect(
          face,
          `Noto Serif SC 的 @font-face 必须 font-display:swap，实际: ${face}`,
        ).toMatch(/font-display:swap/);
      }
    }
    expect(foundSerifFace, "找不到 Noto Serif SC 的 @font-face").toBe(true);
  });
});
