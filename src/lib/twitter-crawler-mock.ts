import { TweetResult, CrawlResponse } from './twitter-crawler';

const MAX_TWEETS_PER_CRAWL = 20;
const MAX_CONCURRENT_CRAWLS = 5;

class TwitterCrawlerMock {
  private mockTweets: TweetResult[] = [
    {
      id: '1',
      text: 'Just launched our new AI-powered analytics dashboard! Super excited to see how this helps teams make data-driven decisions.',
      author: {
        username: 'techlead',
        name: 'Sarah Chen',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/1234567890/avatar_normal.jpg'
      },
      createdAt: '2024-01-15T10:30:00Z',
      url: 'https://twitter.com/techlead/status/1',
      retweetCount: 245,
      likeCount: 1200,
      replyCount: 89,
      quoteCount: 12,
      media: []
    },
    {
      id: '2',
      text: 'The future of web development is looking brighter than ever with these new frameworks and tools emerging.',
      author: {
        username: 'webdev',
        name: 'Alex Johnson',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/1234567891/avatar_normal.jpg'
      },
      createdAt: '2024-01-15T09:15:00Z',
      url: 'https://twitter.com/webdev/status/2',
      retweetCount: 189,
      likeCount: 890,
      replyCount: 45,
      quoteCount: 8,
      media: []
    },
    {
      id: '3',
      text: 'Just completed a major refactor of our authentication system. The performance improvements are incredible!',
      author: {
        username: 'backendguru',
        name: 'Mike Rodriguez',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/1234567892/avatar_normal.jpg'
      },
      createdAt: '2024-01-15T08:45:00Z',
      url: 'https://twitter.com/backendguru/status/3',
      retweetCount: 156,
      likeCount: 720,
      replyCount: 32,
      quoteCount: 5,
      media: []
    },
    {
      id: '4',
      text: 'TypeScript continues to be a game-changer for large-scale applications. The type safety alone is worth the investment.',
      author: {
        username: 'tsfan',
        name: 'Emma Wilson',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/1234567893/avatar_normal.jpg'
      },
      createdAt: '2024-01-15T11:20:00Z',
      url: 'https://twitter.com/tsfan/status/4',
      retweetCount: 210,
      likeCount: 950,
      replyCount: 67,
      quoteCount: 15,
      media: []
    },
    {
      id: '5',
      text: 'Working on a new open-source project for real-time data visualization. Looking for contributors!',
      author: {
        username: 'opensource',
        name: 'David Kim',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/1234567894/avatar_normal.jpg'
      },
      createdAt: '2024-01-15T12:05:00Z',
      url: 'https://twitter.com/opensource/status/5',
      retweetCount: 178,
      likeCount: 810,
      replyCount: 41,
      quoteCount: 9,
      media: []
    },
    {
      id: '6',
      text: 'The importance of clean code cannot be overstated. It saves hours of debugging and makes onboarding new team members so much easier.',
      author: {
        username: 'cleanCoder',
        name: 'Lisa Thompson',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/1234567895/avatar_normal.jpg'
      },
      createdAt: '2024-01-15T13:30:00Z',
      url: 'https://twitter.com/cleanCoder/status/6',
      retweetCount: 195,
      likeCount: 920,
      replyCount: 53,
      quoteCount: 11,
      media: []
    },
    {
      id: '7',
      text: 'Just deployed our microservices architecture to production. The scalability improvements are already noticeable.',
      author: {
        username: 'devops',
        name: 'Robert Chen',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/1234567896/avatar_normal.jpg'
      },
      createdAt: '2024-01-15T14:15:00Z',
      url: 'https://twitter.com/devops/status/7',
      retweetCount: 167,
      likeCount: 780,
      replyCount: 38,
      quoteCount: 7,
      media: []
    },
    {
      id: '8',
      text: 'Learning a new programming language every year keeps your skills sharp and opens up new opportunities.',
      author: {
        username: 'polyglot',
        name: 'Maria Garcia',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/1234567897/avatar_normal.jpg'
      },
      createdAt: '2024-01-15T15:40:00Z',
      url: 'https://twitter.com/polyglot/status/8',
      retweetCount: 145,
      likeCount: 690,
      replyCount: 29,
      quoteCount: 4,
      media: []
    },
    {
      id: '9',
      text: 'The rise of AI in software development is fascinating. Tools like GitHub Copilot are changing how we write code.',
      author: {
        username: 'aiDev',
        name: 'James Wilson',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/1234567898/avatar_normal.jpg'
      },
      createdAt: '2024-01-15T16:25:00Z',
      url: 'https://twitter.com/aiDev/status/9',
      retweetCount: 230,
      likeCount: 1100,
      replyCount: 78,
      quoteCount: 18,
      media: []
    },
    {
      id: '10',
      text: 'Documentation is not optional. Good documentation can make or break a project adoption.',
      author: {
        username: 'docMaster',
        name: 'Sophia Lee',
        profileImageUrl: 'https://pbs.twimg.com/profile_images/1234567899/avatar_normal.jpg'
      },
      createdAt: '2024-01-15T17:10:00Z',
      url: 'https://twitter.com/docMaster/status/10',
      retweetCount: 125,
      likeCount: 610,
      replyCount: 24,
      quoteCount: 3,
      media: []
    }
  ];

  async searchTweets(query: string, maxResults: number = MAX_TWEETS_PER_CRAWL): Promise<TweetResult[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const filteredTweets = this.mockTweets.filter(tweet => 
      tweet.text.toLowerCase().includes(query.toLowerCase()) ||
      tweet.author.username.toLowerCase().includes(query.toLowerCase()) ||
      tweet.author.name.toLowerCase().includes(query.toLowerCase())
    );
    
    return filteredTweets.slice(0, maxResults);
  }

  async crawlMultipleQueries(queries: string[]): Promise<CrawlResponse[]> {
    const limitedQueries = queries.slice(0, MAX_CONCURRENT_CRAWLS);
    
    const crawlPromises = limitedQueries.map(async (query) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
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
        return {
          query,
          tweets: [],
          summary: `Failed to crawl tweets for query: ${query}`,
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
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'positive', 'excited', 'incredible', 'brighter', 'game-changer', 'fascinating'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'negative', 'worst', 'break'];
    
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
    const commonWords = new Set(['the', 'and', 'for', 'you', 'this', 'that', 'with', 'have', 'are', 'was', 'just', 'new', 'our', 'how', 'makes', 'much', 'like', 'are', 'with']);
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
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const userTweets = this.mockTweets.filter(tweet => 
      tweet.author.username.toLowerCase() === username.toLowerCase()
    );
    
    return userTweets.slice(0, maxResults);
  }
}

export default TwitterCrawlerMock;