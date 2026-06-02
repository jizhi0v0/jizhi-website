import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const runtime = "nodejs";

// 头像内联成 data URL（构建/请求时从 public 读盘，避免运行时再 fetch 自己）
let avatarPromise: Promise<string | null> | null = null;
function loadAvatar(): Promise<string | null> {
  avatarPromise ??= readFile(path.join(process.cwd(), "public/avatar.png"))
    .then((buf) => `data:image/png;base64,${buf.toString("base64")}`)
    .catch(() => null);
  return avatarPromise;
}

// 只拉标题用到的字形子集（Google Fonts 的 text= 参数），CJK 全量字体几 MB，
// 子集后通常只有几 KB，可在请求时实时拉取并缓存。无 UA → Google 返回 truetype
// （satori 不支持 woff2）。带重试，避免瞬时网络抖动让整张图渲染失败。
async function fetchSubset(family: string, text: string): Promise<ArrayBuffer | null> {
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const css = await (await fetch(url)).text();
      const src = css.match(/src:\s*url\(([^)]+)\)\s*format/);
      if (src) return await (await fetch(src[1])).arrayBuffer();
    } catch {
      // 继续重试
    }
  }
  return null;
}

// 优先中文衬线字体；万一 CJK 拉取失败，退到 Inter（仅拉拉丁字形），保证
// ImageResponse 至少有一种字体可用——它没有字体会直接抛错。
async function loadFont(
  text: string,
): Promise<{ name: string; data: ArrayBuffer } | null> {
  const cjk = await fetchSubset("Noto+Serif+SC:wght@700", text);
  if (cjk) return { name: "Noto Serif SC", data: cjk };
  const latin = await fetchSubset("Inter:wght@700", text);
  if (latin) return { name: "Inter", data: latin };
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? SITE_NAME).slice(0, 80);
  const category = searchParams.get("category") ?? "";

  // 字体子集要覆盖图上所有文字
  const fontText = title + category + SITE_NAME;
  const [font, avatar] = await Promise.all([loadFont(fontText), loadAvatar()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "#fcfaf6",
          color: "#13110f",
          fontFamily: font?.name ?? "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#8a7f6f" }}>
          {category || SITE_NAME}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 18 ? 72 : 88,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 30,
            color: "#8a7f6f",
          }}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              width={56}
              height={56}
              style={{
                width: 56,
                height: 56,
                borderRadius: 56,
                marginRight: 20,
                border: "2px solid #e7ddcb",
              }}
            />
          ) : (
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 14,
                background: "#c98a3c",
                marginRight: 16,
              }}
            />
          )}
          {SITE_NAME}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font
        ? [{ name: font.name, data: font.data, weight: 700, style: "normal" }]
        : [],
    },
  );
}
