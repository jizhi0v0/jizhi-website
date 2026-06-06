import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import type { Locale } from "./i18n";

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  updated?: string; // frontmatter `updated`：最后修订日，缺省即视为从未改过（= date）
  category: string;
  tags: string[];
  excerpt: string;
  words: number;
  readMinutes: number;
  image?: string; // 社交分享图（og:image），不填走全站兜底
}

export interface Post extends PostMeta {
  content: string;
}

const POSTS_DIR = path.join(process.cwd(), "content/posts");

function countWords(content: string): number {
  // 中文按字符数；英文按空白分词；混排时取较大值
  const stripped = content.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  const cn = (stripped.match(/[一-鿿]/g) ?? []).length;
  const en = stripped
    .replace(/[一-鿿]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return cn + en;
}

// YAML 会把未加引号的 2026-05-30 解析成 Date 对象，String() 会得到
// "Sat May 30 2026 ..." 这种长格式，导致 formatFull 按 "-" 切分时算出 NaN。
// 这里统一归一成 YYYY-MM-DD，无论 frontmatter 写没写引号都不会出错。
function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

// 无 frontmatter excerpt 时从正文取摘要兜底：description/og/twitter/JSON-LD/RSS 都吃
// 这个字段，空 excerpt 会让 SEO 描述整段缺失。从正文首个实义段落抽一句，去掉
// 代码块、标题、JSX/HTML、图片、链接语法、强调符等噪声，CJK 与英文都按可读长度截断。
function deriveExcerpt(content: string): string {
  const text = content
    .replace(/```[\s\S]*?```/g, " ") // 围栏代码块
    .replace(/`[^`]*`/g, " ") // 行内代码
    .replace(/^import .*$/gm, "") // MDX import
    .replace(/^export .*$/gm, "") // MDX export
    .replace(/<[^>]+>/g, " ") // JSX / HTML 标签
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 图片
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // 链接保留文字
    .replace(/^\s{0,3}#{1,6}\s+.*$/gm, "") // 标题行
    .replace(/^\s{0,3}>\s?/gm, "") // 引用前缀
    .replace(/^\s{0,3}[-*+]\s+/gm, "") // 列表项前缀
    .replace(/[*_~`]/g, ""); // 强调 / 删除线标记
  // 首个含文字的段落（段落以空行分隔）
  const para = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .find(Boolean);
  if (!para) return "";
  const LIMIT = 150;
  return para.length > LIMIT ? `${para.slice(0, LIMIT).trimEnd()}…` : para;
}

// 语言变体文件：<slug>.<lang>.mdx（如 .en.mdx）。基准文件 <slug>.mdx 为中文。
// export 供测试 fixture 复用同一规则，避免规则在多处各写一份而漂移。
export const LOCALE_VARIANT_RE = /\.[a-z]{2}\.mdx$/;

function isBaseFile(f: string): boolean {
  return f.endsWith(".mdx") && !LOCALE_VARIANT_RE.test(f);
}

// 某 locale 下存在的文章 slug——「严格 EN」规则的单一事实来源：
// zh = 所有基准文件 <slug>.mdx；en = 仅有译文 <slug>.en.mdx 的文章。
// EN 站只提供译文：未译文章不进入 /en 的任何路由（列表 / 归档 / 标签 / 文章页）。
// React.cache 去重：同一次渲染里 getAllPosts / getAllSlugs / getAllTags 以及
// 各 page 的 generateMetadata（会查对侧 locale 是否有译文）会多次触达，避免重复 readdir。
const localeSlugs = cache(async (locale: Locale): Promise<string[]> => {
  const files = await fs.readdir(POSTS_DIR);
  if (locale === "en") {
    return files
      .filter((f) => f.endsWith(".en.mdx"))
      .map((f) => f.replace(/\.en\.mdx$/, ""));
  }
  return files.filter(isBaseFile).map((f) => f.replace(/\.mdx$/, ""));
});

// 读取某 locale 的文章原文（不跨语言回退）：en 读 <slug>.en.mdx，zh 读 <slug>.mdx；缺失即 null。
// 不回退，所以内容语言恒等于请求 locale——阅读时长按请求 locale 的 wpm 算即正确。
async function readRaw(slug: string, locale: Locale): Promise<string | null> {
  const file = locale === "en" ? `${slug}.en.mdx` : `${slug}.mdx`;
  try {
    return await fs.readFile(path.join(POSTS_DIR, file), "utf-8");
  } catch {
    return null;
  }
}

function toMeta(
  slug: string,
  raw: string,
  locale: Locale,
): PostMeta & { content: string } {
  const { data, content } = matter(raw);
  const words = countWords(content);
  // 阅读速度：中文约 600 字/分钟，英文约 265 词/分钟
  const perMinute = locale === "en" ? 265 : 600;
  const readMinutes = Math.max(1, Math.ceil(words / perMinute));
  const excerpt = String(data.excerpt ?? "").trim() || deriveExcerpt(content);
  return {
    slug,
    title: String(data.title ?? slug),
    date: normalizeDate(data.date),
    updated: data.updated ? normalizeDate(data.updated) : undefined,
    category: String(data.category ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    excerpt,
    words,
    readMinutes,
    image: data.image ? String(data.image) : undefined,
    content,
  };
}

export async function getAllPosts(locale: Locale): Promise<PostMeta[]> {
  const slugs = await localeSlugs(locale);
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      // localeSlugs 已保证对应文件存在，故非空断言安全。
      const raw = (await readRaw(slug, locale))!;
      const { content: _content, ...meta } = toMeta(slug, raw, locale);
      return meta;
    }),
  );
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(
  slug: string,
  locale: Locale,
): Promise<Post | null> {
  // EN 站只提供译文：无 <slug>.en.mdx 时 readRaw 返回 null → 该文章在 EN 下 404（不回退中文）。
  const raw = await readRaw(slug, locale);
  if (raw == null) return null;
  return toMeta(slug, raw, locale);
}

// 某 locale 下应静态生成的文章 slug（见 localeSlugs：zh = 全部，en = 仅已译）。
export async function getAllSlugs(locale: Locale): Promise<string[]> {
  return localeSlugs(locale);
}

export async function getAllTags(
  locale: Locale,
): Promise<{ tag: string; count: number }[]> {
  const posts = await getAllPosts(locale);
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

export function formatMD(d: string): string {
  return d.slice(5).replace("-", ".");
}

// 文章页的完整日期格式按 locale 区分，已迁到 lib/i18n.ts 的 formatFull。

/** Extract H2 headings from MDX raw content for the TOC. */
export function extractToc(mdx: string): { id: string; text: string }[] {
  const lines = mdx.split("\n");
  let inFence = false;
  const items: { id: string; text: string }[] = [];
  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      const text = m[1].trim();
      const id = slugify(text);
      items.push({ id, text });
    }
  }
  return items;
}

function slugify(text: string): string {
  // mirror rehype-slug / github-slugger behavior loosely
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s　]+/g, "-")
    .replace(/[^\w\-一-鿿]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
