'use client';

import { CrawlResponse } from '@/lib/twitter-crawler';

interface AnalyticsChartProps {
  responses: CrawlResponse[];
}

export default function AnalyticsChart({ responses }: AnalyticsChartProps) {
  if (responses.length === 0) {
    return null;
  }

  const totalTweets = responses.reduce((sum, response) => sum + response.tweets.length, 0);
  const totalRetweets = responses.reduce((sum, response) => 
    sum + response.tweets.reduce((tweetSum, tweet) => tweetSum + tweet.retweetCount, 0), 0);
  const totalLikes = responses.reduce((sum, response) => 
    sum + response.tweets.reduce((tweetSum, tweet) => tweetSum + tweet.likeCount, 0), 0);
  const totalReplies = responses.reduce((sum, response) => 
    sum + response.tweets.reduce((tweetSum, tweet) => tweetSum + tweet.replyCount, 0), 0);

  const avgEngagement = totalTweets > 0 ? (totalRetweets + totalLikes + totalReplies) / totalTweets : 0;

  // Get top queries by tweet count
  const topQueries = [...responses]
    .sort((a, b) => b.tweets.length - a.tweets.length)
    .slice(0, 5);

  // Get top authors across all responses
  const authorMap = new Map<string, number>();
  responses.forEach(response => {
    response.tweets.forEach(tweet => {
      const author = tweet.author.username;
      authorMap.set(author, (authorMap.get(author) || 0) + 1);
    });
  });

  const topAuthors = Array.from(authorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([author, count]) => ({ author, count }));

  return (
    <div className="analytics-container">
      <h3>Analytics Dashboard</h3>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-value">{totalTweets}</div>
          <div className="analytics-label">Total Tweets</div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-value">{totalRetweets.toLocaleString()}</div>
          <div className="analytics-label">Total Retweets</div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-value">{totalLikes.toLocaleString()}</div>
          <div className="analytics-label">Total Likes</div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-value">{totalReplies.toLocaleString()}</div>
          <div className="analytics-label">Total Replies</div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-value">{avgEngagement.toFixed(1)}</div>
          <div className="analytics-label">Avg Engagement</div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-value">{responses.length}</div>
          <div className="analytics-label">Queries Crawled</div>
        </div>
      </div>

      {topQueries.length > 0 && (
        <div className="analytics-section">
          <h4>Top Queries by Tweet Count</h4>
          <div className="query-list">
            {topQueries.map((response, index) => (
              <div key={response.query} className="query-item">
                <span className="query-rank">{index + 1}.</span>
                <span className="query-text">{response.query}</span>
                <span className="query-count">{response.tweets.length} tweets</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topAuthors.length > 0 && (
        <div className="analytics-section">
          <h4>Top Authors</h4>
          <div className="author-list">
            {topAuthors.map(({ author, count }, index) => (
              <div key={author} className="author-item">
                <span className="author-rank">{index + 1}.</span>
                <span className="author-handle">@{author}</span>
                <span className="author-count">{count} tweets</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .analytics-container {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1.5rem 0;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .analytics-container h3 {
          margin: 0 0 1.5rem 0;
          color: #14171a;
          font-size: 1.25rem;
          font-weight: 700;
        }
        
        .analytics-container h4 {
          margin: 1.5rem 0 1rem 0;
          color: #657786;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .analytics-card {
          background: #f5f8fa;
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
          border: 1px solid #e1e8ed;
        }
        
        .analytics-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1da1f2;
          margin-bottom: 0.25rem;
        }
        
        .analytics-label {
          font-size: 0.875rem;
          color: #657786;
        }
        
        .query-list,
        .author-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .query-item,
        .author-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f5f8fa;
          border-radius: 8px;
          border: 1px solid #e1e8ed;
        }
        
        .query-rank,
        .author-rank {
          font-weight: 700;
          color: #1da1f2;
          min-width: 1.5rem;
        }
        
        .query-text {
          flex: 1;
          font-weight: 500;
          color: #14171a;
        }
        
        .author-handle {
          flex: 1;
          font-weight: 500;
          color: #14171a;
        }
        
        .query-count,
        .author-count {
          font-size: 0.875rem;
          color: #657786;
          background: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          border: 1px solid #e1e8ed;
        }
        
        @media (max-width: 768px) {
          .analytics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 480px) {
          .analytics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}