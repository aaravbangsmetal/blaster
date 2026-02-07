import { NextResponse } from "next/server";
import { crawlPages, searchWeb, synthesizeAnswer } from "@/lib/crawler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    const results = await searchWeb(query);
    if (results.length === 0) {
      return NextResponse.json({
        query,
        answer: "No results found. Try a different search.",
        sources: [],
        fetchedAt: new Date().toISOString(),
      });
    }

    const pages = await crawlPages(results);
    if (pages.length === 0) {
      return NextResponse.json({
        query,
        answer: "Results were found, but the crawler could not read any pages.",
        sources: [],
        fetchedAt: new Date().toISOString(),
      });
    }

    const answer = await synthesizeAnswer(query, pages);

    return NextResponse.json({
      query,
      answer,
      sources: pages.map(({ title, url, snippet }) => ({ title, url, snippet })),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
