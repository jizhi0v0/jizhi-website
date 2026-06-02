import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { Locale } from "./i18n";

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
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

// 语言变体文件：<slug>.<lang>.mdx（如 .en.mdx）。基准文件 <slug>.mdx 为中文。
const LOCALE_VARIANT_RE = /\.[a-z]{2}\.mdx$/;

function isBaseFile(f: string): boolean {
  return f.endsWith(".mdx") && !LOCALE_VARIANT_RE.test(f);
}

// 按 locale 读取文章原文：en 优先读 <slug>.en.mdx，没有则回退基准（中文）文件。
// 返回实际命中的 locale，供阅读时长按真实语言的 wpm 计算（回退到中文时不应按英文 wpm 估算）。
async function readRaw(
  slug: string,
  locale: Locale,
): Promise<{ raw: string; effectiveLocale: Locale } | null> {
  if (locale === "en") {
    try {
      const raw = await fs.readFile(
        path.join(POSTS_DIR, `${slug}.en.mdx`),
        "utf-8",
      );
      return { raw, effectiveLocale: "en" };
    } catch {
      /* 无 en 变体，回退中文 */
    }
  }
  try {
    const raw = await fs.readFile(
      path.join(POSTS_DIR, `${slug}.mdx`),
      "utf-8",
    );
    return { raw, effectiveLocale: "zh" };
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
  return {
    slug,
    title: String(data.title ?? slug),
    date: normalizeDate(data.date),
    category: String(data.category ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    excerpt: String(data.excerpt ?? ""),
    words,
    readMinutes,
    image: data.image ? String(data.image) : undefined,
    content,
  };
}

export async function getAllPosts(locale: Locale): Promise<PostMeta[]> {
  const files = await fs.readdir(POSTS_DIR);
  const slugs = files.filter(isBaseFile).map((f) => f.replace(/\.mdx$/, ""));
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const { raw, effectiveLocale } = (await readRaw(slug, locale))!;
      const { content: _content, ...meta } = toMeta(slug, raw, effectiveLocale);
      return meta;
    }),
  );
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(
  slug: string,
  locale: Locale,
): Promise<Post | null> {
  const found = await readRaw(slug, locale);
  if (found == null) return null;
  return toMeta(slug, found.raw, found.effectiveLocale);
}

export async function getAllSlugs(): Promise<string[]> {
  const files = await fs.readdir(POSTS_DIR);
  return files.filter(isBaseFile).map((f) => f.replace(/\.mdx$/, ""));
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
