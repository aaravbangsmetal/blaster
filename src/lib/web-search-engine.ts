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

class WebSearchEngine {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.SEARCH_API_KEY;
    if (!apiKey || apiKey.includes('your_api_key')) {
      throw new Error('SEARCH_API_KEY is not properly configured');
    }
    this.apiKey = apiKey;
  }

  async searchWeb(query: string, maxResults: number = MAX_RESULTS_PER_SEARCH): Promise<SearchResult[]> {
    try {
      // In a real implementation, this would call a search API like Google Custom Search, Bing, or SerpAPI
      // For now, we'll simulate a search with mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate mock search results based on the query
      return this.generateMockResults(query, maxResults);
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
      
      throw new Error(`Failed to search web: ${searchError.message || 'Unknown error'}`);
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
        id: `result_${query.replace(/\s+/g, '_')}_${i}`,
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

    return `Found ${results.length} results for "${query}". ` +
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

  // Real API implementation example (commented out for now)
  /*
  private async searchWithRealAPI(query: string, maxResults: number): Promise<SearchResult[]> {
    // Example using Google Custom Search API
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: this.apiKey,
        cx: process.env.SEARCH_ENGINE_ID,
        q: query,
        num: maxResults,
      },
    });

    return response.data.items.map((item: any, index: number) => ({
      id: item.cacheId || `result_${index}`,
      title: item.title,
      url: item.link,
      description: item.snippet,
      content: item.snippet,
      source: this.extractDomain(item.link),
      publishedAt: new Date().toISOString(),
      relevanceScore: 0.8 + (Math.random() * 0.2), // Simulated relevance
    }));
  }

  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }
  */
}

export default WebSearchEngine;