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
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/json,application/javascript",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "DNT": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
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
    // Try DuckDuckGo image search first (no API key required)
    return await searchImagesDuckDuckGo(query);
  } catch (error) {
    console.error('Images search error:', error);
    return await searchImagesFallback(query);
  }
};

interface UnsplashItem {
  urls?: {
    regular: string;
    small?: string;
    thumb?: string;
  };
  links?: {
    html: string;
  };
  description?: string;
  alt_description?: string;
  user?: {
    name?: string;
  };
  width?: number;
  height?: number;
}

const processUnsplashResults = (results: UnsplashItem[], query: string): ImageResult[] => {
  const imageResults: ImageResult[] = [];
  
  for (const item of results) {
    if (item.urls?.regular && item.links?.html) {
      imageResults.push({
        title: item.description || item.alt_description || `Image of ${query}`,
        url: item.links.html,
        image: item.urls.regular,
        thumbnail: item.urls.small || item.urls.thumb,
        source: item.user?.name || 'Unsplash',
        width: item.width,
        height: item.height,
      });
      
      if (imageResults.length >= MAX_IMAGE_RESULTS) {
        break;
      }
    }
  }
  
  console.log(`Found ${imageResults.length} images for query: ${query}`);
  return imageResults;
};

const searchImagesDuckDuckGo = async (query: string): Promise<ImageResult[]> => {
  try {
    const response = await fetchWithTimeout(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: {
          ...SEARCH_HEADERS,
          "Accept": "text/html",
        },
      }
    );

    if (!response.ok) {
      console.error(`DuckDuckGo images error: ${response.status}`);
      throw new Error('DuckDuckGo images failed');
    }

    const html = await response.text();
    return parseImageResultsFromHtml(html, query);
  } catch (error) {
    console.error('DuckDuckGo images search error:', error);
    throw error;
  }
};

const parseImageResultsFromHtml = (html: string, query: string): ImageResult[] => {
  const imageResults: ImageResult[] = [];
  
  // Extract image results from DuckDuckGo HTML
  const imagePattern = /class="tile--img__img"[^>]+src="([^"]+)"[^>]*alt="([^"]+)"/gi;
  const linkPattern = /class="tile--img"[^>]+data-id="([^"]+)"[^>]*>/gi;
  
  const imageMatches = Array.from(html.matchAll(imagePattern));
  const linkMatches = Array.from(html.matchAll(linkPattern));
  
  for (let i = 0; i < Math.min(imageMatches.length, linkMatches.length, MAX_IMAGE_RESULTS); i++) {
    const imageMatch = imageMatches[i];
    const linkMatch = linkMatches[i];
    
    if (imageMatch && linkMatch) {
      const imageUrl = imageMatch[1];
      const altText = imageMatch[2];
      const dataId = linkMatch[1];
      
      // Construct proper URLs
      const fullImageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl;
      const pageUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${dataId}`;
      
      imageResults.push({
        title: altText || `Image of ${query}`,
        url: pageUrl,
        image: fullImageUrl,
        thumbnail: fullImageUrl,
        source: 'DuckDuckGo',
      });
    }
  }
  
  console.log(`Found ${imageResults.length} images from DuckDuckGo for query: ${query}`);
  return imageResults;
};

const searchImagesFallback = async (query: string): Promise<ImageResult[]> => {
  try {
    // Fallback to Pexels API
    const response = await fetchWithTimeout(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${MAX_IMAGE_RESULTS}`,
      {
        headers: {
          ...SEARCH_HEADERS,
          "Accept": "application/json",
          "Authorization": "YOUR_PEXELS_API_KEY",
        },
      }
    );

    if (!response.ok) {
      console.error(`Pexels API error: ${response.status}`);
      // Final fallback: Use Lorem Picsum with search term
      return await searchImagesFinalFallback(query);
    }

    const data = await response.json();
    return processPexelsResults(data.photos || [], query);
  } catch (error) {
    console.error('Images fallback error:', error);
    return await searchImagesFinalFallback(query);
  }
};

interface PexelsPhoto {
  src?: {
    large: string;
    medium?: string;
  };
  url?: string;
  alt?: string;
  photographer?: string;
  width?: number;
  height?: number;
}

const processPexelsResults = (photos: PexelsPhoto[], query: string): ImageResult[] => {
  const imageResults: ImageResult[] = [];
  
  for (const photo of photos) {
    if (photo.src?.large && photo.url) {
      imageResults.push({
        title: photo.alt || `Photo of ${query}`,
        url: photo.url,
        image: photo.src.large,
        thumbnail: photo.src.medium,
        source: photo.photographer || 'Pexels',
        width: photo.width,
        height: photo.height,
      });
      
      if (imageResults.length >= MAX_IMAGE_RESULTS) {
        break;
      }
    }
  }
  
  return imageResults;
};

const searchImagesFinalFallback = async (query: string): Promise<ImageResult[]> => {
  try {
    // Final fallback: Use Google Images via HTML scraping
    const response = await fetchWithTimeout(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`,
      {
        headers: {
          ...SEARCH_HEADERS,
          "Accept": "text/html",
        },
      }
    );

    if (!response.ok) {
      console.error(`Google images fallback error: ${response.status}`);
      return await searchImagesBasicFallback(query);
    }

    const html = await response.text();
    return parseGoogleImageResults(html, query);
  } catch (error) {
    console.error('Final images fallback error:', error);
    return await searchImagesBasicFallback(query);
  }
};

const parseGoogleImageResults = (html: string, query: string): ImageResult[] => {
  const imageResults: ImageResult[] = [];
  
  // Extract image URLs from Google Images search
  const imagePattern = /"ou":"([^"]+)"/g;
  const titlePattern = /"pt":"([^"]+)"/g;
  
  const imageUrls = Array.from(html.matchAll(imagePattern)).map(match => match[1]);
  const titles = Array.from(html.matchAll(titlePattern)).map(match => match[1]);
  
  for (let i = 0; i < Math.min(imageUrls.length, titles.length, MAX_IMAGE_RESULTS); i++) {
    if (imageUrls[i] && titles[i]) {
      const imageUrl = decodeURIComponent(imageUrls[i]);
      const title = decodeURIComponent(titles[i]);
      
      imageResults.push({
        title: title || `Image of ${query}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`,
        image: imageUrl,
        thumbnail: imageUrl,
        source: 'Google Images',
      });
    }
  }
  
  console.log(`Found ${imageResults.length} images from Google for query: ${query}`);
  return imageResults;
};

const searchImagesBasicFallback = async (query: string): Promise<ImageResult[]> => {
  try {
    // Basic fallback: Use Lorem Picsum with search-based images
    const imageResults: ImageResult[] = [];
    const seed = hashString(query);
    
    for (let i = 0; i < MAX_IMAGE_RESULTS; i++) {
      const imageId = (seed + i) % 1000;
      imageResults.push({
        title: `Image of ${query}`,
        url: `https://picsum.photos/id/${imageId}/info`,
        image: `https://picsum.photos/800/600?image=${imageId}`,
        thumbnail: `https://picsum.photos/200/150?image=${imageId}`,
        source: 'Lorem Picsum',
        width: 800,
        height: 600,
      });
    }
    
    console.log(`Using basic fallback images for query: ${query}`);
    return imageResults;
  } catch (error) {
    console.error('Basic images fallback error:', error);
    return [];
  }
};

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export const searchVideos = async (query: string): Promise<VideoResult[]> => {
  try {
    // Try YouTube search first
    return await searchVideosYouTube(query);
  } catch (error) {
    console.error('Videos search error:', error);
    return await searchVideosFallback(query);
  }
};

const searchVideosYouTube = async (query: string): Promise<VideoResult[]> => {
  try {
    const response = await fetchWithTimeout(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          ...SEARCH_HEADERS,
          "Accept": "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );

    if (!response.ok) {
      console.error(`YouTube search error: ${response.status}`);
      throw new Error('YouTube search failed');
    }

    const html = await response.text();
    const results = parseVideoResultsFromHtml(html);
    
    if (results.length === 0) {
      throw new Error('No videos found');
    }
    
    return results;
  } catch (error) {
    console.error('YouTube videos search error:', error);
    throw error;
  }
};

const searchVideosFallback = async (query: string): Promise<VideoResult[]> => {
  try {
    // Try alternative video search: DuckDuckGo videos
    return await searchVideosDuckDuckGo(query);
  } catch (error) {
    console.error('Video fallback error:', error);
    return await searchVideosBasicFallback(query);
  }
};

const searchVideosDuckDuckGo = async (query: string): Promise<VideoResult[]> => {
  try {
    const response = await fetchWithTimeout(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=videos&ia=videos`,
      {
        headers: {
          ...SEARCH_HEADERS,
          "Accept": "text/html",
        },
      }
    );

    if (!response.ok) {
      console.error(`DuckDuckGo videos error: ${response.status}`);
      throw new Error('DuckDuckGo videos failed');
    }

    const html = await response.text();
    return parseDuckDuckGoVideoResults(html, query);
  } catch (error) {
    console.error('DuckDuckGo videos search error:', error);
    throw error;
  }
};

const parseDuckDuckGoVideoResults = (html: string, query: string): VideoResult[] => {
  const videoResults: VideoResult[] = [];
  
  // Extract video results from DuckDuckGo
  const videoPattern = /class="tile--vid"[^>]*>([\s\S]*?)<\/div>/gi;
  const videoMatches = html.matchAll(videoPattern);
  
  for (const match of videoMatches) {
    if (videoResults.length >= MAX_VIDEO_RESULTS) break;
    
    const videoHtml = match[1];
    
    // Extract title
    const titleMatch = videoHtml.match(/class="tile__title"[^>]*>([\s\S]*?)<\/div>/);
    if (!titleMatch) continue;
    
    const title = stripTags(titleMatch[1]);
    
    // Extract URL
    const urlMatch = videoHtml.match(/href="([^"]+)"/);
    if (!urlMatch) continue;
    
    const url = resolveDuckDuckGoUrl(urlMatch[1]);
    
    // Extract thumbnail
    const thumbMatch = videoHtml.match(/src="([^"]+)"/);
    const thumbnail = thumbMatch ? (thumbMatch[1].startsWith('//') ? `https:${thumbMatch[1]}` : thumbMatch[1]) : undefined;
    
    // Extract source
    const sourceMatch = videoHtml.match(/class="tile__domain"[^>]*>([\s\S]*?)<\/span>/);
    const source = sourceMatch ? stripTags(sourceMatch[1]) : 'Video';
    
    // Extract duration
    const durationMatch = videoHtml.match(/class="tile__duration"[^>]*>([\s\S]*?)<\/span>/);
    const duration = durationMatch ? stripTags(durationMatch[1]) : undefined;
    
    videoResults.push({
      title: title,
      url: url,
      thumbnail: thumbnail,
      source: source,
      duration: duration,
    });
  }
  
  console.log(`Found ${videoResults.length} videos from DuckDuckGo for query: ${query}`);
  return videoResults;
};

const searchVideosBasicFallback = async (query: string): Promise<VideoResult[]> => {
  try {
    // Basic fallback: Return empty array or minimal results
    console.log(`Using basic video fallback for query: ${query}`);
    return [];
  } catch (error) {
    console.error('Basic video fallback error:', error);
    return [];
  }
};

const parseVideoResultsFromHtml = (html: string): VideoResult[] => {
  const videoResults: VideoResult[] = [];
  
  // Improved parsing for YouTube search results
  // Look for video renderer objects in the JSON data
  const videoRendererPattern = /"videoRenderer":\{([^}]+(?:\{[^{}]*\}[^}]*)*)\}/g;
  
  let match;
  const seenVideoIds = new Set<string>();
  
  while ((match = videoRendererPattern.exec(html)) !== null && videoResults.length < MAX_VIDEO_RESULTS) {
    const videoRenderer = match[1];
    
    // Extract video ID
    const videoIdMatch = videoRenderer.match(/"videoId":"([^"]+)"/);
    if (!videoIdMatch) continue;
    
    const videoId = videoIdMatch[1];
    if (seenVideoIds.has(videoId)) continue; // Skip duplicates
    seenVideoIds.add(videoId);
    
    // Extract title
    const titleMatch = videoRenderer.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]/);
    if (!titleMatch) continue;
    
    const title = cleanupText(decodeHtmlEntities(titleMatch[1]));
    
    // Extract channel name
    const channelMatch = videoRenderer.match(/"ownerText":\{"runs":\[\{"text":"([^"]+)"\}\]/);
    const channel = channelMatch ? cleanupText(decodeHtmlEntities(channelMatch[1])) : 'YouTube';
    
    // Extract duration if available
    const durationMatch = videoRenderer.match(/"lengthText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"\}/);
    const duration = durationMatch ? durationMatch[1] : undefined;
    
    // Extract view count if available
    const viewCountMatch = videoRenderer.match(/"viewCountText":\{"simpleText":"([^"]+)"\}/);
    const viewCount = viewCountMatch ? viewCountMatch[1] : undefined;
    
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const description = viewCount ? `${channel} • ${viewCount}` : channel;
    
    videoResults.push({
      title: title,
      url: videoUrl,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      source: 'YouTube',
      duration: duration,
      description: description,
    });
  }
  
  // If we didn't find enough results with the new method, fall back to old method
  if (videoResults.length < MAX_VIDEO_RESULTS) {
    const videoIdPattern = /"videoId":"([^"]+)"/g;
    const titlePattern = /"title":{"runs":\[{"text":"([^"]+)"}\]/g;
    
    const videoIds = Array.from(html.matchAll(videoIdPattern)).map(match => match[1]);
    const titles = Array.from(html.matchAll(titlePattern)).map(match => match[1]);
    
    for (let i = 0; i < Math.min(videoIds.length, titles.length, MAX_VIDEO_RESULTS - videoResults.length); i++) {
      if (videoIds[i] && titles[i] && !seenVideoIds.has(videoIds[i])) {
        const videoUrl = `https://www.youtube.com/watch?v=${videoIds[i]}`;
        videoResults.push({
          title: cleanupText(titles[i]),
          url: videoUrl,
          thumbnail: `https://img.youtube.com/vi/${videoIds[i]}/hqdefault.jpg`,
          source: 'YouTube',
        });
      }
    }
  }
  
  console.log(`Found ${videoResults.length} unique videos`);
  return videoResults;
};



export const searchNews = async (query: string): Promise<NewsResult[]> => {
  try {
    // Use NewsAPI.org (requires API key) or fallback to Google News RSS
    // For now, use Google News RSS feed
    const response = await fetchWithTimeout(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
      {
        headers: {
          ...SEARCH_HEADERS,
          "Accept": "application/rss+xml,application/xml,text/xml",
        },
      }
    );

    if (!response.ok) {
      console.error(`News RSS error: ${response.status}`);
      return await searchNewsFallback(query);
    }

    const xml = await response.text();
    return parseNewsFromRss(xml, query);
  } catch (error) {
    console.error('News search error:', error);
    return await searchNewsFallback(query);
  }
};

const parseNewsFromRss = (xml: string, query: string): NewsResult[] => {
  const newsResults: NewsResult[] = [];
  
  // Simple XML parsing for RSS feed
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
  
  for (const match of itemMatches) {
    const item = match[1];
    
    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
    const descriptionMatch = item.match(/<description>([\s\S]*?)<\/description>/i);
    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const sourceMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    
    const title = titleMatch ? cleanupText(titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '')) : '';
    const url = linkMatch ? linkMatch[1] : '';
    
    if (title && url) {
      newsResults.push({
        title,
        url,
        snippet: descriptionMatch ? cleanupText(descriptionMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').substring(0, 200)) : undefined,
        source: sourceMatch ? cleanupText(sourceMatch[1]) : 'Google News',
        date: pubDateMatch ? pubDateMatch[1] : undefined,
      });
      
      if (newsResults.length >= MAX_NEWS_RESULTS) {
        break;
      }
    }
  }
  
  console.log(`Found ${newsResults.length} news articles for query: ${query}`);
  return newsResults;
};

const searchNewsFallback = async (query: string): Promise<NewsResult[]> => {
  try {
    // Fallback: Use DuckDuckGo HTML for news
    const response = await fetchWithTimeout(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iar=news&ia=news&kl=us-en`,
      {
        headers: {
          ...SEARCH_HEADERS,
          "Accept": "text/html",
        },
      }
    );

    if (!response.ok) {
      console.error(`News fallback error: ${response.status}`);
      return [];
    }

    const html = await response.text();
    return parseNewsFromHtml(html);
  } catch (error) {
    console.error('News fallback error:', error);
    return [];
  }
};

const parseNewsFromHtml = (html: string): NewsResult[] => {
  const newsResults: NewsResult[] = [];
  
  // Extract news articles from HTML
  const newsPattern = /class="[^"]*result--news[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  const newsMatches = html.matchAll(newsPattern);
  
  for (const match of newsMatches) {
    const newsHtml = match[1];
    
    const titleMatch = newsHtml.match(/class="[^"]*result__title[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const linkMatch = newsHtml.match(/href="([^"]+)"/i);
    const snippetMatch = newsHtml.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const sourceMatch = newsHtml.match(/class="[^"]*result__source[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    
    const title = titleMatch ? stripTags(titleMatch[1]) : '';
    const url = linkMatch ? resolveDuckDuckGoUrl(linkMatch[1]) : '';
    
    if (title && url) {
      newsResults.push({
        title,
        url,
        snippet: snippetMatch ? stripTags(snippetMatch[1]) : undefined,
        source: sourceMatch ? stripTags(sourceMatch[1]) : undefined,
      });
      
      if (newsResults.length >= MAX_NEWS_RESULTS) {
        break;
      }
    }
  }
  
  return newsResults;
};
