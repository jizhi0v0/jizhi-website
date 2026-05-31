import { test, expect } from "@playwright/test";

const POST_ROUTE = "/posts/turn-to-claude-desktop";
const SCROLL_STORAGE_PREFIX = `jizhi:scroll:${POST_ROUTE}`;

test.describe("刷新后的文章滚动恢复", () => {
  test.use({ viewport: { width: 393, height: 852 }, isMobile: true });

  test("等待文章图片完成后再恢复 reload 前的滚动位置", async ({ page }) => {
    let delayPostImages = false;

    await page.route("**/posts/turn-to-claude-desktop/*.png", async (route) => {
      if (delayPostImages) {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      await route.continue();
    });

    await page.goto(POST_ROUTE, { waitUntil: "load" });
    await page.locator(".post-body pre").waitFor();

    const targetY = await page.evaluate(() => {
      const image = document.querySelector<HTMLImageElement>(
        'img[src$="usage.png"]',
      );
      if (!image) throw new Error("usage image not found");
      return image.getBoundingClientRect().top + window.scrollY + 120;
    });

    await page.evaluate((y) => window.scrollTo(0, y), targetY);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(targetY - 2);

    await expect
      .poll(() =>
        page.evaluate((prefix) => {
          const key = Object.keys(sessionStorage).find((k) =>
            k.startsWith(prefix),
          );
          return key ? JSON.parse(sessionStorage.getItem(key) ?? "{}").y : 0;
        }, SCROLL_STORAGE_PREFIX),
      )
      .toBeGreaterThan(targetY - 2);

    delayPostImages = true;
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 1_000 })
      .toBeGreaterThan(targetY - 2);

    await page.waitForLoadState("load");
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 2_000 })
      .toBeGreaterThan(targetY - 2);

    const restored = await page.evaluate(() => {
      const image = document.querySelector<HTMLImageElement>(
        'img[src$="usage.png"]',
      );
      const pre = document.querySelector(".post-body pre");
      if (!image || !pre) throw new Error("article content not found");
      return {
        imageComplete: image.complete,
        naturalWidth: image.naturalWidth,
        imageTop: Math.round(image.getBoundingClientRect().top),
        preTop: Math.round(pre.getBoundingClientRect().top),
      };
    });

    expect(restored.imageComplete).toBe(true);
    expect(restored.naturalWidth).toBeGreaterThan(0);
    expect(restored.imageTop).toBeLessThan(0);
    expect(restored.preTop).toBeGreaterThan(0);
  });

  test("移动端使用 fixed 头部和文章 meta 栏", async ({ page }) => {
    await page.goto(POST_ROUTE, { waitUntil: "domcontentloaded" });

    const styles = await page.evaluate(() => {
      const header = document.querySelector(".site-header");
      const meta = document.querySelector(".post-meta-bar");
      const main = document.querySelector(".app-main");
      if (!header || !meta) throw new Error("sticky elements not found");
      if (!main) throw new Error("main not found");
      return {
        headerPosition: getComputedStyle(header).position,
        metaPosition: getComputedStyle(meta).position,
        metaTop: getComputedStyle(meta).top,
        mainPaddingTop: getComputedStyle(main).paddingTop,
        articlePaddingTop: getComputedStyle(
          document.querySelector(".post-article")!,
        ).paddingTop,
        metaZIndex: getComputedStyle(meta).zIndex,
        metaWillChange: getComputedStyle(meta).willChange,
        metaBoxShadow: getComputedStyle(meta).boxShadow,
        metaClipPath: getComputedStyle(meta).clipPath,
        metaRect: meta.getBoundingClientRect().toJSON(),
        viewportWidth: window.innerWidth,
        h2ScrollMargin: getComputedStyle(document.documentElement)
          .getPropertyValue("--h2-scroll-margin")
          .trim(),
      };
    });

    expect(styles.headerPosition).toBe("fixed");
    expect(styles.metaPosition).toBe("fixed");
    expect(styles.metaTop).toBe(styles.mainPaddingTop);
    expect(styles.articlePaddingTop).toBe("82px");
    expect(Number(styles.metaZIndex)).toBeGreaterThan(0);
    expect(styles.metaWillChange).toContain("transform");
    expect(styles.metaBoxShadow).toBe("none");
    expect(styles.metaClipPath).toBe("none");
    expect(styles.metaRect.left).toBe(0);
    expect(styles.metaRect.width).toBe(styles.viewportWidth);
    expect(styles.h2ScrollMargin).toBe("200px");
  });

  test("Telegram WebView 回退 static 时不保留 fixed 占位", async ({ page }) => {
    await page.goto(POST_ROUTE, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      document.documentElement.classList.add("tg-webview");
    });

    const styles = await page.evaluate(() => {
      const header = document.querySelector(".site-header");
      const meta = document.querySelector(".post-meta-bar");
      const main = document.querySelector(".app-main");
      const article = document.querySelector(".post-article");
      if (!header || !meta || !main || !article) {
        throw new Error("layout elements not found");
      }
      return {
        headerPosition: getComputedStyle(header).position,
        headerHeight: getComputedStyle(header).height,
        metaPosition: getComputedStyle(meta).position,
        metaWillChange: getComputedStyle(meta).willChange,
        mainPaddingTop: getComputedStyle(main).paddingTop,
        articlePaddingTop: getComputedStyle(article).paddingTop,
        h2ScrollMargin: getComputedStyle(document.documentElement)
          .getPropertyValue("--h2-scroll-margin")
          .trim(),
      };
    });

    expect(styles.headerPosition).toBe("static");
    expect(styles.metaPosition).toBe("static");
    expect(styles.metaWillChange).toBe("auto");
    expect(styles.mainPaddingTop).toBe("0px");
    expect(styles.articlePaddingTop).toBe("0px");
    expect(styles.headerHeight).not.toBe("116px");
    expect(styles.h2ScrollMargin).toBe("24px");
  });
});
