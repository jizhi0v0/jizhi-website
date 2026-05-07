import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  words: number;
  readMinutes: number;
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

function toMeta(slug: string, raw: string): PostMeta & { content: string } {
  const { data, content } = matter(raw);
  const words = countWords(content);
  // 中文阅读速度约 600 字/分钟
  const readMinutes = Math.max(1, Math.ceil(words / 600));
  return {
    slug,
    title: String(data.title ?? slug),
    date: String(data.date ?? ""),
    category: String(data.category ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    excerpt: String(data.excerpt ?? ""),
    words,
    readMinutes,
    content,
  };
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const files = await fs.readdir(POSTS_DIR);
  const posts = await Promise.all(
    files
      .filter((f) => f.endsWith(".mdx"))
      .map(async (f) => {
        const slug = f.replace(/\.mdx$/, "");
        const raw = await fs.readFile(path.join(POSTS_DIR, f), "utf-8");
        const { content: _content, ...meta } = toMeta(slug, raw);
        return meta;
      }),
  );
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(slug: string): Promise<Post | null> {
  const file = path.join(POSTS_DIR, `${slug}.mdx`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return toMeta(slug, raw);
  } catch {
    return null;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  const files = await fs.readdir(POSTS_DIR);
  return files.filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getAllPosts();
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

export function formatFull(d: string): string {
  const [y, m, day] = d.split("-");
  return `${y} 年 ${parseInt(m, 10)} 月 ${parseInt(day, 10)} 日`;
}

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
