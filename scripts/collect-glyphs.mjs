// 采集「重字重面」实际渲染出的字形 —— 取代静态猜测。
//
// 背景：600/700 两个字重只服务标题、表头、强调。以前靠扫 MDX + 正则猜哪些文字
// 会以这些字重渲染，为了不漏字只能宁可多收（含强调标记的整行全吃），结果两个
// 字重各自扛着约 942 个字形、共 311KB。
//
// 这里换个判据：不猜，直接问浏览器。对已构建的站点跑一遍真实渲染，把每个文本
// 节点的 computed font-weight 和 font-family 拿出来，凡是 ≥ 600 且落在衬线栈上
// 的字符就是重字重面的真实成员。解析器怎么配 `**`、CSS 里哪条规则吃 600，全都
// 不用推断——渲染结果就是答案。
//
// 产物 scripts/glyphs-heavy.txt 提交进仓库，由 build-fonts.mjs 消费。这样
// Vercel 构建不需要浏览器、仍是确定性输出；代价是内容/样式改动后要重跑本脚本，
// 由 CI 的 --check 兜底（见 .github/workflows/test.yml）。
//
// 用法：
//   node scripts/collect-glyphs.mjs           重新采集并写入 glyphs-heavy.txt
//   node scripts/collect-glyphs.mjs --check   只比对，有漂移则非零退出（CI 用）
//
// 前置：已跑过 next build（本脚本自己起 next start，不重复构建）。

import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "scripts", "glyphs-heavy.txt");
const CHECK = process.argv.includes("--check");

// 判据与 globals.css 对齐：只有 600/700 两个 @font-face，CSS 里 target ≥ 600 的
// 声明会落到这两个文件上（500 按 CSS 字重匹配规则回落到 400 face，不算）。
const HEAVY_MIN_WEIGHT = 600;
const SERIF_FAMILY = "Noto Serif SC";

async function freePort() {
  return new Promise((res, rej) => {
    const srv = net.createServer();
    srv.on("error", rej);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => res(port));
    });
  });
}

// 等 server 就绪。返回它**实际**监听的 base URL：freePort() 拿到端口后就把监听
// 关了，到 next start 真正绑定之间存在被抢占的窗口；一旦被抢，我们预挑的端口上
// 什么都没有，只会干等到超时、还报一个「next 没起来」的误导信息。所以以 next
// 自己打印的地址为准，预挑端口只作为初始猜测。
async function waitReady(guessBase, logs, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    // next start 启动后会打印 "- Local: http://localhost:PORT"
    const m = logs.text().match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/);
    const base = m ? `http://127.0.0.1:${m[1]}` : guessBase;
    try {
      const r = await fetch(base + "/sitemap.xml");
      if (r.ok) return base;
    } catch {
      // 还没起来，继续等
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  // 把 next 自己的输出带出来——否则 CI 上只看到一句超时，无从查因
  // （端口冲突、缺 .next 构建产物、依赖问题，症状全都是这一句）。
  throw new Error(
    `next start 在 ${timeoutMs}ms 内没就绪。它的输出（末 ${logs.MAX} 行）：\n${logs.text() || "（无输出）"}`,
  );
}

// 收尾部若干行，够定位即可，不把整个构建日志堆在内存里。
function ringBuffer(max = 40) {
  const lines = [];
  return {
    MAX: max,
    push(chunk) {
      for (const l of String(chunk).split("\n")) {
        if (!l.trim()) continue;
        lines.push(l);
        if (lines.length > max) lines.shift();
      }
    },
    text: () => lines.join("\n"),
  };
}

async function collect(base) {
  const xml = await (await fetch(base + "/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].replace(/^https?:\/\/[^/]+/, base),
  );
  // sitemap 不含 404 页，但它同样渲染 UI 文案（标题吃 600），显式补上。
  urls.push(base + "/__not-found__", base + "/en/__not-found__");

  const chars = new Set();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    for (const u of urls) {
      // 等到 load：本脚本要的是「所有会以 ≥600 渲染的文本」的超集，若某段文本要
      // hydration 之后才进 DOM，只等 DOMContentLoaded 就会被这一趟扫描漏掉，闸门
      // 便会静默放过、生产上掉字。当前站点的 Client Component 也走 SSR，DCL 时刻
      // 其实已经够；但一旦有人引入 dynamic(..., { ssr: false }) 或在 useEffect 里
      // 渲出加粗中文，这一步就是唯一的防线。
      // 不用 networkidle：站点挂着 analytics / speed-insights 的长连接，永远等不到
      // 空闲（同样的理由见 tests/viewport-overflow.spec.ts）。
      await page.goto(u, { waitUntil: "load" });
      // 在页内就去重成字符串再回传：判据只关心「出现过哪些字」，没必要把每个文本
      // 节点的整段文字都跨 CDP 序列化一遍。
      const found = await page.evaluate(
        ({ minWeight, family }) => {
          const seen = new Set();
          const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let n;
          while ((n = w.nextNode())) {
            const t = n.nodeValue;
            if (!t || !t.trim()) continue;
            const el = n.parentElement;
            if (!el) continue;
            const cs = getComputedStyle(el);
            if (parseInt(cs.fontWeight, 10) < minWeight) continue;
            if (!cs.fontFamily.includes(family)) continue;
            for (const ch of t) {
              const c = ch.codePointAt(0);
              if (c > 0x20 && c !== 0x7f) seen.add(ch);
            }
          }
          return [...seen].join("");
        },
        { minWeight: HEAVY_MIN_WEIGHT, family: SERIF_FAMILY },
      );
      for (const ch of found) chars.add(ch);
    }
  } finally {
    // 与 main() 里 kill server 的 finally 对齐：任一页面抛错也不留下 chromium 子进程。
    await browser.close();
  }

  return { chars, pages: urls.length };
}

async function main() {
  const port = await freePort();
  const logs = ringBuffer();
  const server = spawn("node", [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    // 接出 next 的输出：happy path 上不打印（安静如旧），起不来时用于报错定位，
    // 同时从中读它实际监听的端口（见 waitReady）。
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (c) => logs.push(c));
  server.stderr.on("data", (c) => logs.push(c));

  let result;
  try {
    const base = await waitReady(`http://127.0.0.1:${port}`, logs);
    result = await collect(base);
  } finally {
    server.kill("SIGTERM");
  }

  const text = [...result.chars].sort().join("");
  console.log(`[glyphs] 遍历 ${result.pages} 个页面，重字重面 ${[...text].length} 字`);

  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").trim() : "";
  if (CHECK) {
    if (prev === text) {
      console.log("[glyphs] 与已提交的 glyphs-heavy.txt 一致 ✅");
      return;
    }
    const prevSet = new Set(prev);
    const added = [...text].filter((c) => !prevSet.has(c));
    const curSet = new Set(text);
    const removed = [...prev].filter((c) => !curSet.has(c));
    console.error("[glyphs] ❌ 渲染结果与已提交的 glyphs-heavy.txt 不一致");
    if (added.length) console.error(`  新增 ${added.length} 字：${added.join("")}`);
    if (removed.length) console.error(`  不再出现 ${removed.length} 字：${removed.join("")}`);
    console.error("  → 跑 `bun run glyphs` 重新采集，并把 scripts/glyphs-heavy.txt");
    console.error("    与重新生成的 public/fonts/*.woff2 一起提交。");
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(OUT, text + "\n");
  console.log(`[glyphs] 已写入 ${path.relative(ROOT, OUT)}`);
}

await main();
