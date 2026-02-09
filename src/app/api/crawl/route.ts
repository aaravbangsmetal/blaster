import { NextResponse } from "next/server";
import WebSearchEngine from "@/lib/web-search-engine";
import WebSearchEngineMock from "@/lib/web-search-engine-mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSearchEngine() {
  const apiKey = process.env.SEARCH_API_KEY;
  if (apiKey && apiKey.trim() !== '') {
    try {
      return new WebSearchEngine();
    } catch (error) {
      console.log('Failed to create WebSearchEngine, falling back to mock:', error);
      return new WebSearchEngineMock();
    }
  }
  console.log('Using WebSearchEngineMock (no API key found)');
  return new WebSearchEngineMock();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const queries = Array.isArray(body?.queries) ? body.queries.map((q: unknown) => String(q).trim()).filter(Boolean) : [];

    if (!query && queries.length === 0) {
      return NextResponse.json({ error: "Search query is required." }, { status: 400 });
    }

    const searchEngine = getSearchEngine();
    let results;

    if (queries.length > 0) {
      results = await searchEngine.searchMultipleQueries(queries);
    } else {
      const searchResults = await searchEngine.searchWeb(query);
      const summary = `Found ${searchResults.length} results for: ${query}`;
      
      results = [{
        query,
        results: searchResults,
        summary,
        searchedAt: new Date().toISOString(),
      }];
    }

    return NextResponse.json({
      success: true,
      results,
      totalSearches: results.length,
      searchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    console.error("Web search error:", error);
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
    return NextResponse.json({ error: "Search query parameter is required." }, { status: 400 });
  }

  try {
    const searchEngine = getSearchEngine();
    const searchResults = await searchEngine.searchWeb(query);
    const summary = `Found ${searchResults.length} results for: ${query}`;
    
    return NextResponse.json({
      success: true,
      results: [{
        query,
        results: searchResults,
        summary,
        searchedAt: new Date().toISOString(),
      }],
      totalSearches: 1,
      searchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return NextResponse.json({ 
      success: false, 
      error: message,
      results: []
    }, { status: 500 });
  }
}