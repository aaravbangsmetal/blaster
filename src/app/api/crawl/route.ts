import { NextResponse } from "next/server";
import TwitterCrawler from "@/lib/twitter-crawler";
import TwitterCrawlerMock from "@/lib/twitter-crawler-mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCrawler() {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (bearerToken && bearerToken.trim() !== '') {
    try {
      return new TwitterCrawler();
    } catch (error) {
      console.log('Failed to create TwitterCrawler, falling back to mock:', error);
      return new TwitterCrawlerMock();
    }
  }
  console.log('Using TwitterCrawlerMock (no bearer token found)');
  return new TwitterCrawlerMock();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const queries = Array.isArray(body?.queries) ? body.queries.map((q: unknown) => String(q).trim()).filter(Boolean) : [];

    if (!query && queries.length === 0) {
      return NextResponse.json({ error: "Query or queries are required." }, { status: 400 });
    }

    const crawler = getCrawler();
    let results;

    if (queries.length > 0) {
      results = await crawler.crawlMultipleQueries(queries);
    } else {
      const tweets = await crawler.searchTweets(query);
      const summary = "Generated summary for query: " + query;
      
      results = [{
        query,
        tweets,
        summary,
        crawledAt: new Date().toISOString(),
      }];
    }

    return NextResponse.json({
      success: true,
      results,
      totalCrawls: results.length,
      crawledAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Crawl failed.";
    console.error("Twitter crawl error:", error);
    return NextResponse.json({ 
      success: false, 
      error: message,
      results: []
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  
  if (!query) {
    return NextResponse.json({ error: "Query parameter is required." }, { status: 400 });
  }

  try {
    const crawler = getCrawler();
    const tweets = await crawler.searchTweets(query);
    const summary = "Generated summary for query: " + query;
    
    return NextResponse.json({
      success: true,
      results: [{
        query,
        tweets,
        summary,
        crawledAt: new Date().toISOString(),
      }],
      totalCrawls: 1,
      crawledAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Crawl failed.";
    return NextResponse.json({ 
      success: false, 
      error: message,
      results: []
    }, { status: 500 });
  }
}