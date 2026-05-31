import { test, expect, devices } from "@playwright/test";

// 移动端真机才能复现的渲染类 bug 回归。
// - WebKit 引擎（Safari/WKWebView 同核），覆盖 Telegram in-app browser 与 iOS Safari。
// - iPhone 13 设备配置（含 DPR、UA、viewport），尽量贴近真机栅格行为。
test.use({
  ...devices["iPhone 13"],
});

// Issue 1：Telegram in-app browser 顶部 toolbar 半透明、透出页面正文。
// 修法：在 <head> 注入 theme-color（light/dark 两套），让 WKWebView 把
// toolbar 渲染成与正文同色的实色块。chatgpt.com 之所以「整条实色」就是
// 因为这条 meta。
test.describe("issue 1: Telegram in-app browser bleed-through", () => {
  test("声明 light/dark 两套 theme-color", async ({ request }) => {
    const html = await (
      await request.get("/posts/turn-to-claude-desktop")
    ).text();
    // 直接校验 SSR HTML，避免依赖客户端 head 渲染时序。
    // 属性顺序由 Next.js 决定，所以两条标签里同时找到 prefers-color-scheme: light
    // 和 dark 即可，不卡死属性排列顺序。
    const themeMetas = html.match(/<meta[^>]*theme-color[^>]*>/gi) || [];
    expect(themeMetas.length).toBeGreaterThanOrEqual(2);
    const blob = themeMetas.join("\n");
    expect(blob).toMatch(/prefers-color-scheme:\s*light/);
    expect(blob).toMatch(/prefers-color-scheme:\s*dark/);
  });
});

// Issue 2：iOS Safari 长滚动时，右侧贴边一条黑线随滚动浮现/消失。
// 修法：html/body 上 overflow-x:clip，强制把 GPU 合成的右边界硬切到视口，
// 避免子层（sticky/fixed/promoted img）合成栅格化 slack 露底（WKWebView clearColor=黑）。
// 不能用 hidden：会创建新滚动容器、影响 sticky 行为。
test.describe("issue 2: vertical line on right edge", () => {
  test("html/body overflow-x 必须是 clip", async ({ page }) => {
    await page.goto("/posts/turn-to-claude-desktop", {
      waitUntil: "domcontentloaded",
    });
    const oxs = await page.evaluate(() => ({
      html: getComputedStyle(document.documentElement).overflowX,
      body: getComputedStyle(document.body).overflowX,
    }));
    expect(oxs.html).toBe("clip");
    expect(oxs.body).toBe("clip");
  });

  test("滚动到含图区段时，整页右边界不超出 viewport", async ({ page }) => {
    await page.goto("/posts/turn-to-claude-desktop", {
      waitUntil: "domcontentloaded",
    });
    await page.locator(".post-img").first().waitFor();

    // 滚到首张图附近，仿真 iOS 真机滚动时的合成压力。
    const targetY = await page
      .locator(".post-img")
      .first()
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y - 100), targetY);

    const overflow = await page.evaluate(() => {
      const cw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;
      return { cw, sw, delta: sw - cw };
    });
    expect(
      overflow.sw,
      `scrollWidth ${overflow.sw} > clientWidth ${overflow.cw}`,
    ).toBeLessThanOrEqual(overflow.cw + 1);
  });
});

// Issue 3：iOS Safari pull-to-refresh 时闪过若干中间脏态：
//   a) 先跳回顶部；
//   b) 一帧只有代码块可见、其余空白；
//   c) 再回到原位置。
// 修法：
//   a/c) inline boot 脚本：reload + 有 saved 位置时 history.scrollRestoration=manual、
//        同步给 <html data-restoring> 让 .app 走 visibility:hidden（globals.css 同步规则），
//        DOMContentLoaded 后 scrollTo(saved) + 双 rAF 撤遮罩，消掉「跳顶部」那一帧。
//   b)   正文衬线 next/font display:swap（原 optional 自带 ~100ms 不可见 block period）。
test.describe("issue 3: reload flicker through intermediate states", () => {
  test("SSR HTML 内联 scroll-restore boot 脚本（必须在 <head>）", async ({
    request,
  }) => {
    const html = await (
      await request.get("/posts/turn-to-claude-desktop")
    ).text();
    // 脚本里有 sessionStorage key 前缀 'jz:y:' 与 'data-restoring' 属性名，作为指纹。
    expect(html).toContain("jz:y:");
    expect(html).toContain("data-restoring");
    // 必须在 <head> 内（首帧前执行），不能漂到 <body> 尾。
    const headEnd = html.indexOf("</head>");
    const scriptAt = html.indexOf("jz:y:");
    expect(scriptAt).toBeGreaterThan(0);
    expect(scriptAt).toBeLessThan(headEnd);
  });

  test("CSS 有 [data-restoring] 的同步遮罩规则", async ({ page }) => {
    await page.goto("/posts/turn-to-claude-desktop", {
      waitUntil: "domcontentloaded",
    });
    // 手动给 <html> 打属性，验证 CSS 真的会把 .app 屏掉。
    const hidden = await page.evaluate(() => {
      const h = document.documentElement;
      h.setAttribute("data-restoring", "");
      const v = getComputedStyle(document.querySelector(".app")!).visibility;
      h.removeAttribute("data-restoring");
      return v;
    });
    expect(hidden).toBe("hidden");
  });

  test("CSS 输出包含 font-display:swap（衬线已脱离 optional 的 block period）", async ({
    page,
  }) => {
    await page.goto("/posts/turn-to-claude-desktop", {
      waitUntil: "domcontentloaded",
    });
    // 读 head 里的所有 stylesheet，确认 Noto Serif SC 的 @font-face 用 swap、不用 optional。
    const cssTexts: string[] = await page.evaluate(async () => {
      const links = Array.from(
        document.querySelectorAll('link[rel="stylesheet"]'),
      ) as HTMLLinkElement[];
      const texts = await Promise.all(
        links.map((l) => fetch(l.href).then((r) => r.text())),
      );
      return texts;
    });
    const all = cssTexts.join("\n");
    expect(all).toMatch(/Noto Serif SC/);
    // 不能再出现 optional——一旦回归到 optional 会重现「正文空白只剩代码块」那一帧。
    expect(all).not.toMatch(/font-display\s*:\s*optional/);
    // 至少有一条 swap 的 @font-face。
    expect(all).toMatch(/font-display\s*:\s*swap/);
  });

  test("模拟 reload 还原：scrollY 滚到中段、reload、刷新后保留位置", async ({
    page,
  }) => {
    await page.goto("/posts/turn-to-claude-desktop", {
      waitUntil: "domcontentloaded",
    });
    // 滚到大约文章中段
    await page.evaluate(() => window.scrollTo(0, 1200));
    // 触发节流写入（脚本里 150ms 节流）。等到位再 reload，确保 sessionStorage 已写入。
    await page.waitForFunction(() => {
      const v = sessionStorage.getItem(
        "jz:y:/posts/turn-to-claude-desktop",
      );
      return v && parseInt(v, 10) >= 1100;
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    // 还原后 scrollY 应回到 ≥1100；允许 ±20px 余量（layout 微差）。
    const y = await page.evaluate(() => window.scrollY);
    expect(y, `expected restored scrollY around 1200, got ${y}`).toBeGreaterThan(
      1100,
    );
  });

  test("reload 还原时 boot 脚本会在 <html> 上挂过 data-restoring", async ({
    page,
  }) => {
    await page.goto("/posts/turn-to-claude-desktop", {
      waitUntil: "domcontentloaded",
    });
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForFunction(() => {
      const v = sessionStorage.getItem("jz:y:/posts/turn-to-claude-desktop");
      return v && parseInt(v, 10) >= 900;
    });

    // 在新文档建立的最早时机挂监听：addInitScript 早于 head 里的 inline 脚本，
    // 但此时 document.documentElement 还不一定就绪——所以用 readystatechange/
    // requestAnimationFrame 双保险，把 data-restoring 的出现记录到 window。
    await page.addInitScript(() => {
      const seen: string[] = [];
      // @ts-expect-error 暴露给后续 evaluate 读
      window.__restoringSeen = seen;
      function check() {
        if (
          document.documentElement &&
          document.documentElement.hasAttribute("data-restoring")
        ) {
          seen.push("yes");
        }
      }
      // 多个时机轮询：head 解析中、解析完、首帧前。
      document.addEventListener("readystatechange", check, true);
      // 在能拿到 documentElement 后挂 MutationObserver。
      const trySetup = () => {
        if (!document.documentElement) return false;
        check();
        const obs = new MutationObserver(check);
        obs.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-restoring"],
        });
        return true;
      };
      if (!trySetup()) {
        const iv = setInterval(() => trySetup() && clearInterval(iv), 1);
      }
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    const observed: string[] = await page.evaluate(
      // @ts-expect-error 走 addInitScript 暴露
      () => window.__restoringSeen || [],
    );
    // 至少观察到一次 data-restoring 被挂上（reload 路径）。
    // 注意：脚本会在 DOMContentLoaded 后双 rAF 撤掉属性，所以这里捕获到的是「曾经存在过」。
    expect(observed.length).toBeGreaterThan(0);
  });
});
