import { NextResponse } from "next/server";
import { searchImages, searchVideos, searchWeb, searchNews } from "@/lib/search";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    const [web, images, videos, news] = await Promise.all([
      searchWeb(query),
      searchImages(query),
      searchVideos(query),
      searchNews(query),
    ]);

    return NextResponse.json({
      query,
      web,
      images,
      videos,
      news,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
