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

// 真实渲染采集到的重字重字形集（由 scripts/collect-glyphs.mjs 生成并提交）。
const HEAVY_GLYPHS_FILE = path.join(ROOT, "scripts", "glyphs-heavy.txt");

function readCollectedHeavy() {
  if (!fs.existsSync(HEAVY_GLYPHS_FILE)) return null;
  const s = fs.readFileSync(HEAVY_GLYPHS_FILE, "utf8").trim();
  return s.length ? s : null;
}

// 字重与 globals.css 里 --font-serif 的用法对齐：400 正文、600 次级标题、700 强调/H1。
const WEIGHTS = [400, 600, 700];

// 源字体：@fontsource 的「全量简体」单文件 woff2（每字重约 1.5MB，含全部常用 CJK）。
// 固定到主版本 @5，避免 latest 漂移；只在构建 / 手动跑脚本时被拉取。
const srcUrl = (w) =>
  `https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5/files/noto-serif-sc-chinese-simplified-${w}-normal.woff2`;

// 收集需要覆盖的字形。
//
// 分两个面，因为三个字重的用量差得很远：400 要扛全部正文，600/700 只出现在标题、
// 表头、强调这些地方。原先三个字重共用同一份全量子集，等于让 600/700 各自白扛一份
// 正文字形（实测各约 176/179KB，一篇文章页三份全下 = 542KB，比整站 JS 还多）。
//
// heavy 面必须是「所有可能以 600/700 渲染的文本」的超集——漏一个字，那个字就掉到
// 系统衬线，标题里会出现一个字形不一致的字。所以下面宁可多收：整段 frontmatter、
// 整张表格、整行 JSX 标签都原样吃进来，不做精细切分。判据取自 globals.css 里所有
// font-weight ≥ 600 的规则：
//   .brand / .post-title / .post-body h2 / .post-body th / .tweet-name /
//   .tweet-avatar-fallback / .about-page h1 / .archive-page h1 / .tags-page h1
// 以及 <strong>（CSS 里没有任何规则用 700，700 只服务浏览器默认的 bold）。
export function collectSets() {
  const body = new Set();
  const heavy = new Set();
  const add = (set, str) => {
    for (const ch of str) {
      const c = ch.codePointAt(0);
      if (c > 0x20 && c !== 0x7f) set.add(ch);
    }
  };

  // 基线：ASCII 可打印字符 + 中文排版常用标点 + 运行时生成而正文里不一定出现的字
  // （日期 formatFull 会渲染「年/月/日」，见 lib/i18n.ts）。两个面都要。
  // 单独留一份 baseline：采集到的渲染字形只覆盖「跑那一遍时页面上有的字」，运行时
  // 才生成的内容（日期等）不在其中，必须并上来。
  const baseline = new Set();
  for (let c = 0x20; c <= 0x7e; c++) baseline.add(String.fromCodePoint(c));
  for (const ch of "　、。〈〉《》「」『』【】〔〕・ー…—–‘’“”·※×÷°％‰①②③④⑤⑥⑦⑧⑨⑩→←↑↓年月日") {
    baseline.add(ch);
  }
  for (const ch of baseline) {
    body.add(ch);
    heavy.add(ch);
  }

  // 实际渲染的文案来源：文章正文（MDX）+ UI 文案（next-intl messages）。
  // 组件里的中文都在注释里、不渲染，故不扫 tsx（见排查记录）。
  const mdx = walk(path.join(ROOT, "content"), /\.mdx?$/, []);
  const msgs = walk(path.join(ROOT, "messages"), /\.json$/, []);

  // UI 文案整体进 heavy：各页 h1、.brand 都取自 messages，且体量很小。
  for (const f of msgs) {
    const s = fs.readFileSync(f, "utf8");
    add(body, s);
    add(heavy, s);
  }

  for (const f of mdx) {
    const s = fs.readFileSync(f, "utf8");
    add(body, s);

    // frontmatter 整块：title 走 .post-title、tags 进标签页，一并算重字重。
    const fm = s.match(/^---\r?\n[\s\S]*?\r?\n---/);
    if (fm) add(heavy, fm[0]);

    const picks = [
      ...s.matchAll(/^#{1,6} .*$/gm), // markdown 标题
      ...s.matchAll(/^\s*\|.*$/gm), // 表格整张（表头 th 吃 600）
      ...s.matchAll(/^\s*<[A-Z][\s\S]*?>/gm), // JSX 标签行（<Tweet name="…"> 等属性）
      // 强调：整行收，不去猜 `**` 怎么配对。CommonMark 的 flanking 规则遇到全角
      // 标点会配错位（实例见 surge-tailscale-engine-rewrite.mdx:17，加粗被解析成
      // 嵌套 strong、把两段强调「中间」的文字也卷了进去），正则按 \*\*…\*\* 取到的
      // 范围和解析器实际加粗的范围可能完全不是一回事。整行吃进就与配对结果无关。
      ...s.matchAll(/^.*(?:\*\*|__|<(?:strong|b)[\s>]).*$/gm),
      // 再补跨行强调：CommonMark 允许 `**…**` 跨软换行，此时中间那些不含标记的
      // 行按上面的逐行规则收不到。范围限定在段落内——emphasis 不能跨空行，所以
      // `(?!\n\s*\n)` 这道护栏是紧的；不设护栏的 [\s\S]+? 遇到奇数个 ** 会一路
      // 吃穿整个文件，把 heavy 面撑到接近 body、白丢压缩收益。
      ...s.matchAll(/\*\*(?:(?!\n\s*\n)[\s\S])+?\*\*/g),
      ...s.matchAll(/__(?:(?!\n\s*\n)[\s\S])+?__/g),
    ].map((m) => m[0]);
    for (const p of picks) add(heavy, p);
  }

  const str = (set) => [...set].sort().join("");

  // 有真实渲染采集到的字形集就用它——那是判据本身，不是推断（见 collect-glyphs.mjs）。
  // 上面那套静态启发式退居兜底：采集产物缺失时（新克隆还没跑过 glyphs、或有人手删）
  // 仍能构建出一份「宁可多收」的可用子集，只是白胖 126KB，不会掉字。
  const collected = readCollectedHeavy();
  if (collected) {
    const merged = new Set(baseline);
    for (const ch of collected) merged.add(ch);
    return { body: str(body), heavy: str(merged), heavySource: "rendered" };
  }
  console.warn(
    `[fonts] 未找到 ${path.relative(ROOT, HEAVY_GLYPHS_FILE)}，回退到静态启发式（子集会偏大）。` +
      `如需收紧：先 next build，再跑 \`bun run glyphs\`。`,
  );
  return { body: str(body), heavy: str(heavy), heavySource: "heuristic" };
}

function walk(dir, re, out) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, re, out);
    else if (re.test(e.name)) out.push(p);
  }
  return out;
}

async function main() {
  const { body, heavy, heavySource } = collectSets();
  const src = heavySource === "rendered" ? "真实渲染采集" : "静态启发式兜底";
  console.log(
    `[fonts] 覆盖字形: 正文面 ${[...body].length} / 重字重面 ${[...heavy].length}（${src}）`,
  );
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let failures = 0;
  for (const w of WEIGHTS) {
    const text = w === 400 ? body : heavy;
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

// 直接执行才跑子集化；被 import 时只暴露 collectSets（供覆盖率核对用）。
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
