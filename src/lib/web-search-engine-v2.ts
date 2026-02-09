import axios from 'axios';

export type SearchResult = {
  id: string;
  title: string;
  url: string;
  description: string;
  content: string;
  source: string;
  publishedAt: string;
  relevanceScore: number;
  category?: string;
  language?: string;
  wordCount?: number;
  author?: string;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
  summary: string;
  searchedAt: string;
};

const MAX_RESULTS_PER_SEARCH = 20;
const MAX_CONCURRENT_SEARCHES = 5;

type SearchProvider = 'google' | 'bing' | 'serpapi' | 'newsapi' | 'mock';

class WebSearchEngine {
  private apiKey: string;
  private searchEngineId: string;
  private provider: SearchProvider;

  constructor() {
    // Check for Google Custom Search API first
    const googleApiKey = process.env.SEARCH_API_KEY;
    const googleEngineId = process.env.SEARCH_ENGINE_ID;
    
    // Check for SerpAPI
    const serpapiKey = process.env.SERPAPI_KEY;
    
    // Check for Bing API
    const bingApiKey = process.env.BING_API_KEY;
    
    // Check for NewsAPI
    const newsApiKey = process.env.NEWS_API_KEY;

    // Determine which provider to use
    if (googleApiKey && googleEngineId && !googleApiKey.includes('your_api_key')) {
      this.provider = 'google';
      this.apiKey = googleApiKey;
      this.searchEngineId = googleEngineId;
    } else if (serpapiKey && !serpapiKey.includes('your_serpapi_key')) {
      this.provider = 'serpapi';
      this.apiKey = serpapiKey;
      this.searchEngineId = '';
    } else if (bingApiKey && !bingApiKey.includes('your_bing_api_key')) {
      this.provider = 'bing';
      this.apiKey = bingApiKey;
      this.searchEngineId = '';
    } else if (newsApiKey && !newsApiKey.includes('your_newsapi_key')) {
      this.provider = 'newsapi';
      this.apiKey = newsApiKey;
      this.searchEngineId = '';
    } else {
      this.provider = 'mock';
      this.apiKey = '';
      this.searchEngineId = '';
      console.log('No valid search API credentials found. Running in mock mode.');
    }
  }

  async searchWeb(query: string, maxResults: number = MAX_RESULTS_PER_SEARCH): Promise<SearchResult[]> {
    try {
      switch (this.provider) {
        case 'google':
          return await this.searchWithGoogle(query, maxResults);
        case 'bing':
          return await this.searchWithBing(query, maxResults);
        case 'serpapi':
          return await this.searchWithSerpAPI(query, maxResults);
        case 'newsapi':
          return await this.searchWithNewsAPI(query, maxResults);
        case 'mock':
        default:
          return this.generateMockResults(query, maxResults);
      }
    } catch (error) {
      console.error('Error searching web:', error);
      
      const searchError = error as { code?: number; message?: string };
      
      if (searchError.code === 429) {
        throw new Error('Search API rate limit exceeded. Please try again later.');
      } else if (searchError.code === 401 || searchError.code === 403) {
        throw new Error('Search API authentication failed. Please check your API credentials.');
      } else if (searchError.code === 400) {
        throw new Error('Invalid search query. Please try a different search term.');
      } else if (searchError.code === 503) {
        throw new Error('Search API service is temporarily unavailable. Please try again later.');
      }
      
      // Fall back to mock data if real API fails
      console.log('Falling back to mock data due to API error');
      return this.generateMockResults(query, maxResults);
    }
  }

  async searchMultipleQueries(queries: string[]): Promise<SearchResponse[]> {
    const limitedQueries = queries.slice(0, MAX_CONCURRENT_SEARCHES);
    
    const searchPromises = limitedQueries.map(async (query) => {
      try {
        const results = await this.searchWeb(query);
        const summary = this.generateSummary(results, query);
        
        return {
          query,
          results,
          summary,
          searchedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`Error searching query "${query}":`, error);
        
        let errorMessage = `Failed to search for query: ${query}`;
        const errorMessageStr = error instanceof Error ? error.message : String(error);
        
        if (errorMessageStr.includes('rate limit')) {
          errorMessage = `Rate limit exceeded for query: ${query}. Please wait before trying again.`;
        } else if (errorMessageStr.includes('authentication')) {
          errorMessage = `Authentication failed for query: ${query}. Please check API credentials.`;
        }
        
        return {
          query,
          results: [],
          summary: errorMessage,
          searchedAt: new Date().toISOString(),
        };
      }
    });

    return Promise.all(searchPromises);
  }

  private async searchWithGoogle(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: this.apiKey,
        cx: this.searchEngineId,
        q: query,
        num: Math.min(maxResults, 10), // Google limits to 10 results per request
      },
    });

    if (!response.data.items) {
      return [];
    }

    return response.data.items.map((item: any, index: number) => ({
      id: item.cacheId || `google_${index}_${Date.now()}`,
      title: item.title,
      url: item.link,
      description: item.snippet,
      content: item.snippet,
      source: this.extractDomain(item.link),
      publishedAt: new Date().toISOString(),
      relevanceScore: 0.8 + (Math.random() * 0.2),
      category: this.detectCategory(item.title + ' ' + item.snippet),
      language: 'en',
      wordCount: item.snippet?.length || 0,
    }));
  }

  private async searchWithBing(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
      params: {
        q: query,
        count: Math.min(maxResults, 50),
        mkt: 'en-US',
      },
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
      },
    });

    if (!response.data.webPages || !response.data.webPages.value) {
      return [];
    }

    return response.data.webPages.value.map((item: any, index: number) => ({
      id: `bing_${index}_${Date.now()}`,
      title: item.name,
      url: item.url,
      description: item.snippet,
      content: item.snippet,
      source: this.extractDomain(item.url),
      publishedAt: new Date().toISOString(),
      relevanceScore: 0.8 + (Math.random() * 0.2),
      category: this.detectCategory(item.name + ' ' + item.snippet),
      language: 'en',
      wordCount: item.snippet?.length || 0,
    }));
  }

  private async searchWithSerpAPI(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        api_key: this.apiKey,
        q: query,
        num: maxResults,
        engine: 'google',
      },
    });

    if (!response.data.organic_results) {
      return [];
    }

    return response.data.organic_results.slice(0, maxResults).map((item: any, index: number) => ({
      id: `serpapi_${index}_${Date.now()}`,
      title: item.title,
      url: item.link,
      description: item.snippet,
      content: item.snippet,
      source: this.extractDomain(item.link),
      publishedAt: new Date().toISOString(),
      relevanceScore: 0.8 + (Math.random() * 0.2),
      category: this.detectCategory(item.title + ' ' + item.snippet),
      language: 'en',
      wordCount: item.snippet?.length || 0,
    }));
  }

  private async searchWithNewsAPI(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        apiKey: this.apiKey,
        q: query,
        pageSize: maxResults,
        language: 'en',
        sortBy: 'relevancy',
      },
    });

    if (!response.data.articles) {
      return [];
    }

    return response.data.articles.map((article: any, index: number) => ({
      id: `newsapi_${index}_${Date.now()}`,
      title: article.title,
      url: article.url,
      description: article.description,
      content: article.content || article.description,
      source: article.source?.name || this.extractDomain(article.url),
      publishedAt: article.publishedAt || new Date().toISOString(),
      relevanceScore: 0.8 + (Math.random() * 0.2),
      category: this.detectCategory(article.title + ' ' + article.description),
      language: 'en',
      wordCount: article.content?.length || article.description?.length || 0,
      author: article.author,
    }));
  }

  private generateMockResults(query: string, maxResults: number): SearchResult[] {
    const mockResults: SearchResult[] = [];
    const categories = ['Technology', 'Science', 'Business', 'Health', 'Education', 'Entertainment'];
    const sources = ['Wikipedia', 'TechCrunch', 'Medium', 'GitHub', 'Stack Overflow', 'MDN Web Docs', 'W3Schools', 'CSS-Tricks'];
    
    for (let i = 1; i <= maxResults; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const publishedDate = new Date();
      publishedDate.setDate(publishedDate.getDate() - daysAgo);
      
      mockResults.push({
        id: `mock_${query.replace(/\s+/g, '_')}_${i}_${Date.now()}`,
        title: `${query} - ${category} Article ${i}`,
        url: `https://example.com/${query.replace(/\s+/g, '-')}-article-${i}`,
        description: `This article discusses ${query} in the context of ${category.toLowerCase()}. Learn more about how ${query} impacts modern ${category.toLowerCase()} practices.`,
        content: `Full content about ${query} and its applications in ${category.toLowerCase()}. This comprehensive guide covers everything you need to know about ${query} including best practices, examples, and real-world applications.`,
        source,
        publishedAt: publishedDate.toISOString(),
        relevanceScore: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        category,
        language: 'en',
        wordCount: Math.floor(Math.random() * 500) + 500,
        author: `Author ${i}`,
      });
    }
    
    // Sort by relevance score
    return mockResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private generateSummary(results: SearchResult[], query: string): string {
    if (results.length === 0) {
      return `No results found for query: "${query}"`;
    }

    const topSources = this.getTopSources(results);
    const categories = this.getCategories(results);
    const avgRelevance = this.getAverageRelevance(results);
    const providerInfo = this.provider !== 'mock' ? `(using ${this.provider} API)` : '(using mock data)';

    return `Found ${results.length} results for "${query}" ${providerInfo}. ` +
           `Top sources: ${topSources.join(', ')}. ` +
           `Categories: ${categories.join(', ')}. ` +
           `Average relevance: ${(avgRelevance * 100).toFixed(1)}%.`;
  }

  private getTopSources(results: SearchResult[], limit: number = 3): string[] {
    const sourceCount = new Map<string, number>();
    
    results.forEach(result => {
      const source = result.source;
      sourceCount.set(source, (sourceCount.get(source) || 0) + 1);
    });

    return Array.from(sourceCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([source]) => source);
  }

  private getCategories(results: SearchResult[]): string[] {
    const categories = new Set<string>();
    results.forEach(result => {
      if (result.category) {
        categories.add(result.category);
      }
    });
    return Array.from(categories);
  }

  private getAverageRelevance(results: SearchResult[]): number {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, result) => acc + result.relevanceScore, 0);
    return sum / results.length;
  }

  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  private detectCategory(text: string): string {
    const categories = {
      technology: ['tech', 'software', 'programming', 'computer', 'ai', 'artificial intelligence', 'machine learning'],
      science: ['science', 'research', 'study', 'experiment', 'discovery'],
      business: ['business', 'finance', 'market', 'economy', 'company', 'startup'],
      health: ['health', 'medical', 'medicine', 'hospital', 'doctor', 'patient'],
      entertainment: ['entertainment', 'movie', 'music', 'tv', 'celebrity', 'game'],
      sports: ['sports', 'game', 'team', 'player', 'tournament'],
      politics: ['politics', 'government', 'election', 'president', 'congress'],
    };

    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return category.charAt(0).toUpperCase() + category.slice(1);
        }
      }
    }
    
    return 'General';
  }

  getActiveProvider(): SearchProvider {
    return this.provider;
  }
}

export default WebSearchEngine;