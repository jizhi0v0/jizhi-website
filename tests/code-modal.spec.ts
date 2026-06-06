import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALE_VARIANT_RE } from "../lib/posts";

// 取第一篇含围栏代码块（```）的文章——「展开查看」只在代码块上出现。
const postsDir = join(process.cwd(), "content/posts");
const slugWithCode = readdirSync(postsDir)
  .filter((f) => f.endsWith(".mdx") && !LOCALE_VARIANT_RE.test(f))
  .find((f) => readFileSync(join(postsDir, f), "utf8").includes("```"))
  ?.replace(/\.mdx$/, "");

// 移动端横向滚动看长配置体验差，代码块提供「展开」把代码放进居中模态、长行自动换行。
// 守护：展开按钮存在、点击开模态、模态内代码换行不再横向滚动、Esc 关闭且焦点归还触发元素。
test.describe("代码块展开查看", () => {
  test.skip(!slugWithCode, "没有含代码块的文章");
  test.use({ viewport: { width: 375, height: 812 } });

  test("展开按钮打开换行模态，Esc 关闭并归还焦点", async ({ page }) => {
    await page.goto(`/posts/${slugWithCode}`, { waitUntil: "domcontentloaded" });
    const expand = page.locator(".code-expand").first();
    await expand.waitFor();

    await expand.click();
    const modal = page.locator(".code-modal");
    await expect(modal).toHaveAttribute("role", "dialog");
    await expect(modal).toHaveAttribute("aria-modal", "true");

    // 模态内的代码应「换行」、不再依赖横向滚动（这正是相对内联代码块的关键差异）。
    const pre = page.locator(".code-modal-pre");
    await expect(pre).toHaveCSS("white-space", "pre-wrap");
    const box = await pre.evaluate((el) => ({
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
    }));
    expect(box.scrollW).toBeLessThanOrEqual(box.clientW + 1);

    // 背景 .app 被 inert 封锁；模态经 portal 挂到 body、不受影响。
    await expect(page.locator(".app")).toHaveAttribute("inert", "");

    // 模态内复制：live region 必须在 portal（inert 之外）才能被读屏播报。
    // 断言模态里的 status 节点拿到「已复制」文案——内联那份此时在 inert 子树里被屏蔽。
    await page.locator(".code-modal-copy").click();
    await expect(
      page.locator(".code-modal [role='status']"),
    ).not.toHaveText("");

    // Esc 关闭后模态消失、inert 撤除、焦点回到展开按钮（屏幕阅读器不丢位置）。
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(page.locator(".app")).not.toHaveAttribute("inert", "");
    await expect(expand).toBeFocused();
  });
});
