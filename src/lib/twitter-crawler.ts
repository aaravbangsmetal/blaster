import { TwitterApi, TweetV2 } from 'twitter-api-v2';

export type TweetResult = {
  id: string;
  text: string;
  author: {
    username: string;
    name: string;
    profileImageUrl?: string;
  };
  createdAt: string;
  url: string;
  retweetCount: number;
  likeCount: number;
  replyCount: number;
  quoteCount?: number;
  media?: {
    type: string;
    url: string;
  }[];
  referencedTweets?: {
    type: string;
    id: string;
  }[];
};

export type CrawlResponse = {
  query: string;
  tweets: TweetResult[];
  summary: string;
  crawledAt: string;
};

const MAX_TWEETS_PER_CRAWL = 20;
const MAX_CONCURRENT_CRAWLS = 5;

class TwitterCrawler {
  private client: TwitterApi;

  constructor() {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken || bearerToken.includes('your_twitter')) {
      throw new Error('TWITTER_BEARER_TOKEN is not properly configured');
    }
    this.client = new TwitterApi(bearerToken);
  }

  async searchTweets(query: string, maxResults: number = MAX_TWEETS_PER_CRAWL): Promise<TweetResult[]> {
    try {
      const tweets = await this.client.v2.search(query, {
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'referenced_tweets', 'entities'],
        'user.fields': ['name', 'username', 'profile_image_url'],
        'media.fields': ['type', 'url'],
        max_results: maxResults,
        expansions: ['author_id', 'attachments.media_keys'],
      });

      const usersMap = new Map();
      const mediaMap = new Map();

      if (tweets.includes?.users) {
        tweets.includes.users.forEach(user => {
          usersMap.set(user.id, {
            username: user.username,
            name: user.name,
            profileImageUrl: user.profile_image_url,
          });
        });
      }

      if (tweets.includes?.media) {
        tweets.includes.media.forEach(media => {
          mediaMap.set(media.media_key, {
            type: media.type,
            url: media.url || media.preview_image_url,
          });
        });
      }

      return (tweets.data.data || []).map((tweet: TweetV2) => {
        const author = usersMap.get(tweet.author_id);
        const media = tweet.attachments?.media_keys?.map((key: string) => mediaMap.get(key)).filter(Boolean) || [];

        return {
          id: tweet.id,
          text: tweet.text,
          author: author || { username: 'unknown', name: 'Unknown User' },
          createdAt: tweet.created_at || new Date().toISOString(),
          url: `https://twitter.com/${author?.username || 'twitter'}/status/${tweet.id}`,
          retweetCount: tweet.public_metrics?.retweet_count || 0,
          likeCount: tweet.public_metrics?.like_count || 0,
          replyCount: tweet.public_metrics?.reply_count || 0,
          quoteCount: tweet.public_metrics?.quote_count || 0,
          media,
          referencedTweets: tweet.referenced_tweets,
        };
      });
    } catch (error) {
      console.error('Error searching tweets:', error);
      
      const twitterError = error as { code?: number; message?: string };
      
      if (twitterError.code === 429) {
        throw new Error('Twitter API rate limit exceeded. Please try again later.');
      } else if (twitterError.code === 401 || twitterError.code === 403) {
        throw new Error('Twitter API authentication failed. Please check your API credentials.');
      } else if (twitterError.code === 400) {
        throw new Error('Invalid search query. Please try a different search term.');
      } else if (twitterError.code === 503) {
        throw new Error('Twitter API service is temporarily unavailable. Please try again later.');
      }
      
      throw new Error(`Failed to search tweets: ${twitterError.message || 'Unknown error'}`);
    }
  }

  async crawlMultipleQueries(queries: string[]): Promise<CrawlResponse[]> {
    const limitedQueries = queries.slice(0, MAX_CONCURRENT_CRAWLS);
    
    const crawlPromises = limitedQueries.map(async (query) => {
      try {
        const tweets = await this.searchTweets(query);
        const summary = this.generateSummary(tweets, query);
        
        return {
          query,
          tweets,
          summary,
          crawledAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`Error crawling query "${query}":`, error);
        
        let errorMessage = `Failed to crawl tweets for query: ${query}`;
        const errorMessageStr = error instanceof Error ? error.message : String(error);
        
        if (errorMessageStr.includes('rate limit')) {
          errorMessage = `Rate limit exceeded for query: ${query}. Please wait before trying again.`;
        } else if (errorMessageStr.includes('authentication')) {
          errorMessage = `Authentication failed for query: ${query}. Please check API credentials.`;
        }
        
        return {
          query,
          tweets: [],
          summary: errorMessage,
          crawledAt: new Date().toISOString(),
        };
      }
    });

    return Promise.all(crawlPromises);
  }

  private generateSummary(tweets: TweetResult[], query: string): string {
    if (tweets.length === 0) {
      return `No tweets found for query: "${query}"`;
    }

    const topAuthors = this.getTopAuthors(tweets);
    const sentiment = this.analyzeSentiment(tweets);
    const keyTopics = this.extractKeyTopics(tweets);

    return `Found ${tweets.length} tweets for "${query}". ` +
           `Top contributors: ${topAuthors.join(', ')}. ` +
           `Overall sentiment: ${sentiment}. ` +
           `Key topics discussed: ${keyTopics.join(', ')}.`;
  }

  private getTopAuthors(tweets: TweetResult[], limit: number = 3): string[] {
    const authorCount = new Map<string, number>();
    
    tweets.forEach(tweet => {
      const author = tweet.author.username;
      authorCount.set(author, (authorCount.get(author) || 0) + 1);
    });

    return Array.from(authorCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([author]) => `@${author}`);
  }

  private analyzeSentiment(tweets: TweetResult[]): string {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'positive'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'negative', 'worst'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    tweets.forEach(tweet => {
      const text = tweet.text.toLowerCase();
      positiveWords.forEach(word => {
        if (text.includes(word)) positiveCount++;
      });
      negativeWords.forEach(word => {
        if (text.includes(word)) negativeCount++;
      });
    });

    if (positiveCount > negativeCount * 2) return 'Positive';
    if (negativeCount > positiveCount * 2) return 'Negative';
    if (positiveCount > negativeCount) return 'Mostly Positive';
    if (negativeCount > positiveCount) return 'Mostly Negative';
    return 'Neutral';
  }

  private extractKeyTopics(tweets: TweetResult[], limit: number = 5): string[] {
    const commonWords = new Set(['the', 'and', 'for', 'you', 'this', 'that', 'with', 'have', 'are', 'was']);
    const wordCount = new Map<string, number>();
    
    tweets.forEach(tweet => {
      const words = tweet.text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.has(word));
      
      words.forEach(word => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  }

  async getUserTweets(username: string, maxResults: number = 10): Promise<TweetResult[]> {
    try {
      const user = await this.client.v2.userByUsername(username, {
        'user.fields': ['name', 'username', 'profile_image_url'],
      });

      const tweets = await this.client.v2.userTimeline(user.data.id, {
        'tweet.fields': ['created_at', 'public_metrics', 'referenced_tweets', 'entities'],
        'media.fields': ['type', 'url'],
        max_results: maxResults,
        expansions: ['attachments.media_keys'],
      });

      return (tweets.data.data || []).map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author: {
          username: user.data.username,
          name: user.data.name,
          profileImageUrl: user.data.profile_image_url,
        },
        createdAt: tweet.created_at || new Date().toISOString(),
        url: `https://twitter.com/${user.data.username}/status/${tweet.id}`,
        retweetCount: tweet.public_metrics?.retweet_count || 0,
        likeCount: tweet.public_metrics?.like_count || 0,
        replyCount: tweet.public_metrics?.reply_count || 0,
        quoteCount: tweet.public_metrics?.quote_count || 0,
        media: [],
        referencedTweets: tweet.referenced_tweets,
      })) || [];
    } catch (error) {
      console.error(`Error fetching tweets for user ${username}:`, error);
      throw new Error(`Failed to fetch user tweets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default TwitterCrawler;