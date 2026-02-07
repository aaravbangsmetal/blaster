export type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

export type CrawledPage = SearchResult & {
  content: string;
};

type DuckDuckGoTopic = {
  Text?: string;
  FirstURL?: string;
  Topics?: DuckDuckGoTopic[];
};

type DuckDuckGoResponse = {
  AbstractURL?: string;
  Heading?: string;
  AbstractText?: string;
  Results?: Array<{ Text?: string; FirstURL?: string }>;
  RelatedTopics?: DuckDuckGoTopic[];
};

const SEARCH_ENDPOINT = "https://api.duckduckgo.com/";
const MAX_RESULTS = 6;
const MAX_PAGES = 3;
const MAX_CONTENT_CHARS = 6000;
const REQUEST_TIMEOUT_MS = 8000;

const cleanupText = (text: string) =>
  text.replace(/\s+/g, " ").replace(/\u0000/g, " ").trim();

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

const stripHtml = (html: string) => {
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const noStyles = noScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
  const noTags = noStyles.replace(/<[^>]*>/g, " ");
  return cleanupText(decodeHtmlEntities(noTags));
};

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
    // Ignore malformed URLs and fall through.
  }
  return withScheme;
};

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "blaster/1.0",
      },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

const toReaderUrl = (targetUrl: string) => {
  const normalized = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
  return `https://r.jina.ai/http://${normalized.replace(/^https?:\/\//, "")}`;
};

const fetchReadableText = async (url: string) => {
  try {
    const readerUrl = toReaderUrl(url);
    const response = await fetchWithTimeout(readerUrl);
    if (!response.ok) {
      throw new Error("Reader failed");
    }
    const text = await response.text();
    return cleanupText(text);
  } catch {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error("Fetch failed");
    }
    const html = await response.text();
    return stripHtml(html);
  }
};

const normalizeResult = (title?: string, url?: string, snippet?: string) => {
  if (!title || !url) return null;
  return {
    title: cleanupText(title),
    url,
    snippet: snippet ? cleanupText(snippet) : undefined,
  } satisfies SearchResult;
};

const flattenTopics = (topics: DuckDuckGoTopic[], results: SearchResult[]) => {
  for (const item of topics) {
    if (item?.Topics) {
      flattenTopics(item.Topics, results);
      continue;
    }
    const entry = normalizeResult(item?.Text, item?.FirstURL);
    if (entry) results.push(entry);
  }
};

const parseDuckDuckGoHtml = (html: string) => {
  const results: SearchResult[] = [];
  const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex =
    /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i;

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = resolveDuckDuckGoUrl(match[1]);
    const title = stripTags(match[2]);
    const nextChunk = html.slice(match.index, match.index + 800);
    const snippetMatch = snippetRegex.exec(nextChunk);
    const snippet = snippetMatch ? stripTags(snippetMatch[1] ?? snippetMatch[2] ?? "") : undefined;
    const entry = normalizeResult(title, url, snippet);
    if (entry) results.push(entry);
  }

  return results;
};

const searchDuckDuckGoHtml = async (query: string) => {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error("Search provider error");
  }
  const html = await response.text();
  return parseDuckDuckGoHtml(html);
};

export const searchWeb = async (query: string): Promise<SearchResult[]> => {
  const endpoint = new URL(SEARCH_ENDPOINT);
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("no_redirect", "1");
  endpoint.searchParams.set("no_html", "1");
  endpoint.searchParams.set("t", "blaster");

  const results: SearchResult[] = [];
  try {
    const response = await fetchWithTimeout(endpoint.toString());
    if (response.ok) {
      const payload = (await response.json()) as DuckDuckGoResponse;
      if (payload?.AbstractURL && payload?.Heading) {
        const entry = normalizeResult(payload.Heading, payload.AbstractURL, payload.AbstractText);
        if (entry) results.push(entry);
      }

      if (Array.isArray(payload?.Results)) {
        for (const item of payload.Results) {
          const entry = normalizeResult(item?.Text, item?.FirstURL);
          if (entry) results.push(entry);
        }
      }

      if (Array.isArray(payload?.RelatedTopics)) {
        flattenTopics(payload.RelatedTopics, results);
      }
    }
  } catch {
    // Ignore API failures and try HTML fallback.
  }

  if (results.length === 0) {
    const htmlResults = await searchDuckDuckGoHtml(query);
    results.push(...htmlResults);
  }

  const deduped = new Map<string, SearchResult>();
  for (const item of results) {
    if (!deduped.has(item.url)) {
      deduped.set(item.url, item);
    }
  }

  return Array.from(deduped.values()).slice(0, MAX_RESULTS);
};

export const crawlPages = async (results: SearchResult[]): Promise<CrawledPage[]> => {
  const targets = results.slice(0, MAX_PAGES);
  const pages = await Promise.all(
    targets.map(async (item) => {
      const text = await fetchReadableText(item.url);
      return {
        ...item,
        content: text.slice(0, MAX_CONTENT_CHARS),
      } as CrawledPage;
    })
  );

  return pages.filter((page) => page.content.length > 0);
};

const buildPrompt = (query: string, pages: CrawledPage[]) => {
  const sourceBlocks = pages
    .map((page, index) => {
      return [
        `Source ${index + 1}:`,
        `Title: ${page.title}`,
        `URL: ${page.url}`,
        `Content: ${page.content}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `Question: ${query}`,
    "Be neutral and generalized; avoid over-relying on any single source.",
    "Prefer primary/official sources when possible and note uncertainty.",
    "Use the sources to answer with the most recent information available.",
    "If you find dates, mention them explicitly.",
    "If sources disagree or no recent date is found, say so clearly.",
    "Cite sources inline using [1], [2], etc.",
    "End the answer with a 'Sources:' section listing each source as:",
    "[1] Title — URL",
    "Keep it concise and easy to scan.",
    "",
    sourceBlocks,
  ].join("\n");
};

const summarizeWithoutLlm = (query: string, pages: CrawledPage[]) => {
  const snippets = pages
    .map((page, index) => {
      const text = page.snippet || page.content.slice(0, 160);
      return `${index + 1}. ${page.title} — ${text}`;
    })
    .join("\n");

  return `No LLM key configured. Here are raw snippets for "${query}":\n${snippets}`;
};

export const synthesizeAnswer = async (query: string, pages: CrawledPage[]) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return summarizeWithoutLlm(query, pages);
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are a web research assistant. Answer based only on the provided sources.",
        },
        {
          role: "user",
          content: buildPrompt(query, pages),
        },
      ],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error("LLM request failed");
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("LLM response empty");
  }

  return answer as string;
};
