# 内容写作约定

文章放在 `content/posts/` 下,用 MDX 写。

## 文件命名与多语言

- 基准文件(中文):`<slug>.mdx` —— `slug` 即文章的 URL 片段(`/posts/<slug>`)。
- 英文译文:`<slug>.en.mdx`。
- **EN 站只收录有译文的文章**:没有 `<slug>.en.mdx` 时,该文在 `/en` 下不出现、直接 404,不回退中文。

## Frontmatter 字段

```yaml
---
title: 用 Surge Mac 接入 Tailscale   # 必填。文章标题,同时进 <title> / OG / JSON-LD / RSS
date: 2026-06-06                     # 必填。发布日 YYYY-MM-DD
updated: 2026-07-01                  # 可选。最后修订日,见下
category: 工具                       # 选填。分类,进 OG section / JSON-LD / OG 卡 / RSS
tags: [Surge, Tailscale, 网络]       # 选填。标签数组
excerpt: 一份能直接用的最小配置        # 选填但强烈建议,见下
image: /og/custom.png               # 选填。自定义社交分享图;不填走 /og 动态卡
---
```

- 日期可不加引号(YAML 会解析成日期),代码里统一归一成 `YYYY-MM-DD`。
- 译文文件的 frontmatter 独立维护(英文 title/excerpt/category 等)。

### `updated` —— 改了内容就加

文章**实质性修订**后,加一行 `updated: YYYY-MM-DD`(改错别字之类不必)。它驱动:

- JSON-LD `dateModified` 与 OG `article:modified_time`(不填则等于 `date`,即"从未更新"——Google 拿不到内容新鲜度信号);
- 文章页元信息栏可见的"更新于 …"(仅当 `updated` 与 `date` 不同才显示)。

### `excerpt` —— 建议手写

`excerpt` 喂 `<meta name="description">`、OG/Twitter 描述、JSON-LD `description`、RSS 摘要、列表页副标题。
**留空会自动从正文首段抽取兜底**(去掉代码块/标题/链接等标记、截到 150 字),但自动摘要不一定是最佳描述,**建议手写一句**。

## 相关代码

- 解析与字段定义:`lib/posts.ts`(`PostMeta`、`toMeta`、`deriveExcerpt`)
- SEO 元数据 / 结构化数据:`lib/seo.ts`
- 动态 OG 卡:`app/og/route.tsx`
- RSS:`lib/feed.ts` + `app/feed.xml/`、`app/en/feed.xml/`
