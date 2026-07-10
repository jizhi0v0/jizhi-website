// 正文衬线字体（Noto Serif SC）内容子集化 —— 消除首屏渲染阻塞。
//
// 背景：next/font 的 Noto_Serif_SC 会把整套 CJK 拆成 300+ 个 unicode-range 切片，
// 生成一坨 ~279KB（brotli 后 ~34KB）的 @font-face 样式表，作为 render-blocking
// <link> 挂在每个页面的 <head>。首屏必须先下载 + 解析这坨 CSS 才能出画——woff2
// 字体本身是 preload:false + display:swap 懒加载、不阻塞，真正卡 FCP 的是这坨 CSS
// 文本。实测把移动端 FCP 拖到 ~3s（Vercel Speed Insights，/posts/[slug] 为最差路由）。
//
// 做法：站点是静态博客，正文用到的字是有限集。扫描 content/ + messages/ 收集实际
// 用到的字形，从 @fontsource 的全量 woff2 子集化出「只含这些字」的字体，每字重一个
// 文件，自托管到 public/fonts/。@font-face 从 300+ 条塌成 3 条（见 globals.css），
// render-blocking CSS 里的字体部分从 279KB 降到约 1KB。
//
// 为什么仍自托管、只在构建期碰 Google 生态：站点面向国内，Google Fonts 被墙，访客
// 必须拿自托管文件。子集化的「源字体」从 jsDelivr(@fontsource) 拉，只发生在构建时
// （build 脚本已前置本步，见 package.json；也可手动 `bun run fonts`）；访客只拿提交
// 进仓库、并在每次构建时按当前内容刷新的自托管产物（public/fonts/）。
//
// 因为接进了 build，新文章的字每次部署自动覆盖、无需手动维护。构建时拉不到源字体
// （离线 / jsDelivr 抽风）会回退到已提交产物、不阻断构建，仍是一份能用的子集；只有
// 当某字连已提交产物里也没有时，才优雅降级到字体栈的系统衬线（Songti SC 等，见
// globals.css 的 --font-serif）。子集是确定性输出：内容不变则字节不变，不会脏工作区。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "fonts");

// 字重与 globals.css 里 --font-serif 的用法对齐：400 正文、600 次级标题、700 强调/H1。
const WEIGHTS = [400, 600, 700];

// 源字体：@fontsource 的「全量简体」单文件 woff2（每字重约 1.5MB，含全部常用 CJK）。
// 固定到主版本 @5，避免 latest 漂移；只在构建 / 手动跑脚本时被拉取。
const srcUrl = (w) =>
  `https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5/files/noto-serif-sc-chinese-simplified-${w}-normal.woff2`;

// 收集需要覆盖的字形。
function collectText() {
  const chars = new Set();

  // 基线：ASCII 可打印字符 + 中文排版常用标点 + 运行时生成而正文里不一定出现的字
  // （日期 formatFull 会渲染「年/月/日」，见 lib/i18n.ts）。
  for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCodePoint(c));
  for (const ch of "　、。〈〉《》「」『』【】〔〕・ー…—–‘’“”·※×÷°％‰①②③④⑤⑥⑦⑧⑨⑩→←↑↓年月日") {
    chars.add(ch);
  }

  // 实际渲染的文案来源：文章正文（MDX）+ UI 文案（next-intl messages）。
  // 组件里的中文都在注释里、不渲染，故不扫 tsx（见排查记录）。
  const roots = [
    { dir: path.join(ROOT, "content"), re: /\.mdx?$/ },
    { dir: path.join(ROOT, "messages"), re: /\.json$/ },
  ];
  const files = [];
  for (const { dir, re } of roots) walk(dir, re, files);
  for (const f of files) {
    for (const ch of fs.readFileSync(f, "utf8")) {
      const c = ch.codePointAt(0);
      if (c > 0x20 && c !== 0x7f) chars.add(ch);
    }
  }

  return [...chars].sort().join("");
}

function walk(dir, re, out) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, re, out);
    else if (re.test(e.name)) out.push(p);
  }
}

async function main() {
  const text = collectText();
  console.log(`[fonts] 覆盖字形: ${[...text].length}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let failures = 0;
  for (const w of WEIGHTS) {
    const outPath = path.join(OUT_DIR, `noto-serif-sc-${w}.woff2`);
    try {
      const res = await fetch(srcUrl(w), { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`源字体 HTTP ${res.status}`);
      const src = Buffer.from(await res.arrayBuffer());
      const subset = await subsetFont(src, text, { targetFormat: "woff2" });
      fs.writeFileSync(outPath, subset);
      console.log(
        `[fonts] ${w}: ${(src.length / 1024) | 0}KB → ${(subset.length / 1024).toFixed(1)}KB  ${path.relative(ROOT, outPath)}`,
      );
    } catch (err) {
      failures++;
      // 容错：拿不到源字体（离线 / jsDelivr 抽风）时不覆盖已提交的产物、也不让构建/脚本
      // 崩掉——保留旧文件即可，访客照常拿到能用的子集。
      const kept = fs.existsSync(outPath) ? "，保留已有文件" : "，且无已有文件（将回退到系统衬线）";
      console.warn(`[fonts] ${w}: 生成失败（${err.message}）${kept}`);
    }
  }

  if (failures === WEIGHTS.length) {
    console.warn("[fonts] 全部字重生成失败；如需刷新请确认能访问 jsDelivr（国内可能要开代理）。");
  }
}

main();
