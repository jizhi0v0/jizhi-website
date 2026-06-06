import { buildFeed, feedResponse } from "@/lib/feed";

export const dynamic = "force-static";

export async function GET() {
  return feedResponse(await buildFeed("en"));
}
