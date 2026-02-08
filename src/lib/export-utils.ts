import { TweetResult, CrawlResponse } from './twitter-crawler';

export class ExportUtils {
  static toCSV(tweets: TweetResult[]): string {
    if (tweets.length === 0) {
      return '';
    }

    const headers = [
      'ID',
      'Text',
      'Author Username',
      'Author Name',
      'Created At',
      'URL',
      'Retweet Count',
      'Like Count',
      'Reply Count',
      'Quote Count',
      'Media Count'
    ];

    const rows = tweets.map(tweet => {
      const mediaCount = tweet.media?.length || 0;
      const text = this.escapeCSV(tweet.text);
      
      return [
        tweet.id,
        text,
        tweet.author.username,
        tweet.author.name,
        tweet.createdAt,
        tweet.url,
        tweet.retweetCount.toString(),
        tweet.likeCount.toString(),
        tweet.replyCount.toString(),
        (tweet.quoteCount || 0).toString(),
        mediaCount.toString()
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  static toJSON(tweets: TweetResult[]): string {
    return JSON.stringify(tweets, null, 2);
  }

  static toSummaryCSV(responses: CrawlResponse[]): string {
    if (responses.length === 0) {
      return '';
    }

    const headers = [
      'Query',
      'Tweet Count',
      'Summary',
      'Crawled At',
      'Top Authors',
      'Total Retweets',
      'Total Likes',
      'Total Replies'
    ];

    const rows = responses.map(response => {
      const topAuthors = this.getTopAuthors(response.tweets, 3).join('; ');
      const totalRetweets = response.tweets.reduce((sum, tweet) => sum + tweet.retweetCount, 0);
      const totalLikes = response.tweets.reduce((sum, tweet) => sum + tweet.likeCount, 0);
      const totalReplies = response.tweets.reduce((sum, tweet) => sum + tweet.replyCount, 0);
      const summary = this.escapeCSV(response.summary);

      return [
        response.query,
        response.tweets.length.toString(),
        summary,
        response.crawledAt,
        topAuthors,
        totalRetweets.toString(),
        totalLikes.toString(),
        totalReplies.toString()
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  static toAnalyticsJSON(responses: CrawlResponse[]): string {
    const analytics = responses.map(response => {
      const tweets = response.tweets;
      const totalRetweets = tweets.reduce((sum, tweet) => sum + tweet.retweetCount, 0);
      const totalLikes = tweets.reduce((sum, tweet) => sum + tweet.likeCount, 0);
      const totalReplies = tweets.reduce((sum, tweet) => sum + tweet.replyCount, 0);
      const avgRetweets = tweets.length > 0 ? totalRetweets / tweets.length : 0;
      const avgLikes = tweets.length > 0 ? totalLikes / tweets.length : 0;
      const avgReplies = tweets.length > 0 ? totalReplies / tweets.length : 0;
      const topAuthors = this.getTopAuthors(tweets, 5);
      const engagementRate = tweets.length > 0 ? (totalRetweets + totalLikes + totalReplies) / tweets.length : 0;

      return {
        query: response.query,
        tweetCount: tweets.length,
        summary: response.summary,
        crawledAt: response.crawledAt,
        metrics: {
          totalRetweets,
          totalLikes,
          totalReplies,
          averageRetweets: avgRetweets.toFixed(2),
          averageLikes: avgLikes.toFixed(2),
          averageReplies: avgReplies.toFixed(2),
          engagementRate: engagementRate.toFixed(2)
        },
        topAuthors,
        timeline: tweets.map(tweet => ({
          id: tweet.id,
          createdAt: tweet.createdAt,
          author: tweet.author.username,
          retweetCount: tweet.retweetCount,
          likeCount: tweet.likeCount,
          replyCount: tweet.replyCount
        }))
      };
    });

    return JSON.stringify(analytics, null, 2);
  }

  private static escapeCSV(text: string): string {
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private static getTopAuthors(tweets: TweetResult[], limit: number): string[] {
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

  static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}