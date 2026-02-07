export type WebResult = {
  title: string;
  url: string;
  snippet?: string;
};

export type ImageResult = {
  title: string;
  url: string;
  image: string;
  thumbnail?: string;
  source?: string;
  width?: number;
  height?: number;
};

export type VideoResult = {
  title: string;
  url: string;
  thumbnail?: string;
  source?: string;
  duration?: string;
  description?: string;
};

export type NewsResult = {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
  date?: string;
  image?: string;
};

const SEARCH_HEADERS = {
  "User-Agent": "blaster/1.0",
  Accept: "text/html,application/json",
};

const MAX_WEB_RESULTS = 8;
const MAX_IMAGE_RESULTS = 12;
const MAX_VIDEO_RESULTS = 8;
const MAX_NEWS_RESULTS = 10;
const REQUEST_TIMEOUT_MS = 8000;

const cleanupText = (text: string) => text.replace(/\s+/g, " ").trim();

const decodeHtmlEntities = (text: string) =>
  text.replace(/&(#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/g, (entity) => {
    if (entity.startsWith("&#x")) {
      return String.fromCharCode(parseInt(entity.slice(3, -1), 16));
    }
    if (entity.startsWith("&#")) {
      return String.fromCharCode(parseInt(entity.slice(2, -1), 10));
    }
    const map: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
    };
    return map[entity] ?? entity;
  });

const stripTags = (value: string) =>
  cleanupText(decodeHtmlEntities(value.replace(/<[^>]*>/g, " ")));

const resolveDuckDuckGoUrl = (rawUrl: string) => {
  const withScheme = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
  if (!withScheme.includes("duckduckgo.com/l/")) {
    return withScheme;
  }
  try {
    const parsed = new URL(withScheme);
    const uddg = parsed.searchParams.get("uddg");
    if (uddg) {
      return decodeURIComponent(uddg);
    }
  } catch {
    // Ignore malformed URLs.
  }
  return withScheme;
};

const fetchWithTimeout = async (url: string, init?: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        ...SEARCH_HEADERS,
        ...init?.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

const parseWebResultsFromHtml = (html: string) => {
  const results: WebResult[] = [];
  const linkRegex =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex =
    /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i;

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = resolveDuckDuckGoUrl(match[1]);
    const title = stripTags(match[2]);
    const nextChunk = html.slice(match.index, match.index + 900);
    const snippetMatch = snippetRegex.exec(nextChunk);
    const snippet = snippetMatch ? stripTags(snippetMatch[1] ?? snippetMatch[2] ?? "") : undefined;
    if (title && url) {
      results.push({ title, url, snippet });
    }
  }

  const deduped = new Map<string, WebResult>();
  for (const item of results) {
    if (!deduped.has(item.url)) {
      deduped.set(item.url, item);
    }
  }

  return Array.from(deduped.values()).slice(0, MAX_WEB_RESULTS);
};

const extractVqd = (html: string) => {
  const match = html.match(/vqd=['"]([^'"]+)['"]/i);
  return match?.[1] ?? null;
};

const fetchVqd = async (query: string, ia = "web") => {
  try {
    const response = await fetchWithTimeout(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=${ia}`
    );
    if (!response.ok) {
      console.error(`VQD fetch failed: ${response.status}`);
      return null;
    }
    const text = await response.text();
    const vqd = extractVqd(text);
    if (!vqd) {
      console.error('VQD token not found in response');
    }
    return vqd;
  } catch (error) {
    console.error('VQD fetch error:', error);
    return null;
  }
};

const toNumber = (value: unknown) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : undefined;
};

export const searchWeb = async (query: string): Promise<WebResult[]> => {
  const response = await fetchWithTimeout(
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  );
  if (!response.ok) {
    throw new Error("Search provider error");
  }
  const html = await response.text();
  return parseWebResultsFromHtml(html);
};

export const searchImages = async (query: string): Promise<ImageResult[]> => {
  try {
    const vqd = await fetchVqd(query, "images");
    if (!vqd) {
      console.error('No VQD token for images search');
      return [];
    }

    const response = await fetchWithTimeout(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );

    if (!response.ok) {
      console.error(`Images API error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as {
      results?: Array<{
        title?: string;
        image?: string;
        thumbnail?: string;
        url?: string;
        source?: string;
        width?: number | string;
        height?: number | string;
      }>;
    };

    const results = data?.results ?? [];
    const imageResults: ImageResult[] = [];
    
    for (const item of results) {
      const title = cleanupText(item.title ?? "");
      const image = item.image ?? "";
      const url = item.url ?? item.source ?? image;
      
      if (title && image && url) {
        imageResults.push({
          title,
          url,
          image,
          thumbnail: item.thumbnail ?? image,
          source: item.source,
          width: toNumber(item.width),
          height: toNumber(item.height),
        });
      }
      
      if (imageResults.length >= MAX_IMAGE_RESULTS) {
        break;
      }
    }
    
    console.log(`Found ${imageResults.length} images for query: ${query}`);
    return imageResults;
  } catch (error) {
    console.error('Images search error:', error);
    return [];
  }
};

export const searchVideos = async (query: string): Promise<VideoResult[]> => {
  try {
    const vqd = await fetchVqd(query, "videos");
    if (!vqd) {
      console.error('No VQD token for videos search');
      return [];
    }

    const response = await fetchWithTimeout(
      `https://duckduckgo.com/v.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );

    if (!response.ok) {
      console.error(`Videos API error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        image?: string;
        duration?: string;
        publisher?: string;
        description?: string;
      }>;
    };

    const results = data?.results ?? [];
    const videoResults: VideoResult[] = [];
    
    for (const item of results) {
      const title = cleanupText(item.title ?? "");
      const url = item.url ?? "";
      
      if (title && url) {
        videoResults.push({
          title,
          url,
          thumbnail: item.image,
          duration: item.duration,
          source: item.publisher,
          description: item.description ? cleanupText(item.description) : undefined,
        });
      }
      
      if (videoResults.length >= MAX_VIDEO_RESULTS) {
        break;
      }
    }
    
    console.log(`Found ${videoResults.length} videos for query: ${query}`);
    return videoResults;
  } catch (error) {
    console.error('Videos search error:', error);
    return [];
  }
};

export const searchNews = async (query: string): Promise<NewsResult[]> => {
  try {
    const vqd = await fetchVqd(query, "news");
    if (!vqd) {
      console.error('No VQD token for news search');
      return [];
    }

    const response = await fetchWithTimeout(
      `https://duckduckgo.com/news.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );

    if (!response.ok) {
      console.error(`News API error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        excerpt?: string;
        source?: string;
        date?: string;
        image?: string;
      }>;
    };

    const results = data?.results ?? [];
    const newsResults: NewsResult[] = [];
    
    for (const item of results) {
      const title = cleanupText(item.title ?? "");
      const url = item.url ?? "";
      
      if (title && url) {
        newsResults.push({
          title,
          url,
          snippet: item.excerpt ? cleanupText(item.excerpt) : undefined,
          source: item.source,
          date: item.date,
          image: item.image,
        });
      }
      
      if (newsResults.length >= MAX_NEWS_RESULTS) {
        break;
      }
    }
    
    console.log(`Found ${newsResults.length} news articles for query: ${query}`);
    return newsResults;
  } catch (error) {
    console.error('News search error:', error);
    return [];
  }
};
