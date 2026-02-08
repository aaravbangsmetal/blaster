"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { ExportUtils } from "@/lib/export-utils";
import AnalyticsChart from "@/components/AnalyticsChart";

type TweetResult = {
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
};

type CrawlResponse = {
  query: string;
  tweets: TweetResult[];
  summary: string;
  crawledAt: string;
};

type ApiResponse = {
  success: boolean;
  results: CrawlResponse[];
  totalCrawls: number;
  crawledAt: string;
  error?: string;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};



export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<CrawlResponse[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to crawl tweets");
      }

      setResults(data.results);
      setActiveResultIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiCrawl = async () => {
    const queries = query.split(",").map(q => q.trim()).filter(Boolean);
    if (queries.length === 0) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ queries }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to crawl tweets");
      }

      setResults(data.results);
      setActiveResultIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Multi-crawl error:", err);
    } finally {
      setLoading(false);
    }
  };

  const activeResult = results[activeResultIndex];

  const handleExportCSV = () => {
    if (!activeResult) return;
    const csv = ExportUtils.toCSV(activeResult.tweets);
    ExportUtils.downloadFile(csv, `tweets_${activeResult.query}_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    if (!activeResult) return;
    const json = ExportUtils.toJSON(activeResult.tweets);
    ExportUtils.downloadFile(json, `tweets_${activeResult.query}_${Date.now()}.json`, 'application/json');
  };

  const handleExportAllCSV = () => {
    if (results.length === 0) return;
    const csv = ExportUtils.toSummaryCSV(results);
    ExportUtils.downloadFile(csv, `all_crawls_summary_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportAnalytics = () => {
    if (results.length === 0) return;
    const analytics = ExportUtils.toAnalyticsJSON(results);
    ExportUtils.downloadFile(analytics, `crawls_analytics_${Date.now()}.json`, 'application/json');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Twitter/X Crawler</h1>
        <p className={styles.subtitle}>
          Search and analyze tweets in real-time. See who said what and when.
        </p>
      </header>

      <main className={styles.main}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchBox}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tweets or enter multiple queries separated by commas..."
              className={styles.searchInput}
              disabled={loading}
            />
            <button
              type="submit"
              className={styles.searchButton}
              disabled={loading || !query.trim()}
            >
              {loading ? "Crawling..." : "Search Tweets"}
            </button>
          </div>
          <div className={styles.searchOptions}>
            <button
              type="button"
              onClick={handleMultiCrawl}
              className={styles.multiCrawlButton}
              disabled={loading || !query.includes(",")}
              title={!query.includes(",") ? "Enter multiple queries separated by commas" : ""}
            >
              Crawl Multiple Queries
            </button>
            <div className={styles.searchHint}>
              Enter a single search term or multiple terms separated by commas for concurrent crawling
            </div>
          </div>
        </form>

        {error && (
          <div className={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}

         {results.length > 0 && (
           <div className={styles.resultsContainer}>
             <div className={styles.resultsHeader}>
               <div className={styles.resultsTitleRow}>
                 <h2 className={styles.resultsTitle}>
                   {results.length > 1 ? "Crawl Results" : "Crawl Results"}
                 </h2>
                 <div className={styles.exportButtons}>
                   <button
                     onClick={handleExportCSV}
                     className={styles.exportButton}
                     disabled={!activeResult || activeResult.tweets.length === 0}
                     title="Export current query tweets as CSV"
                   >
                     Export CSV
                   </button>
                   <button
                     onClick={handleExportJSON}
                     className={styles.exportButton}
                     disabled={!activeResult || activeResult.tweets.length === 0}
                     title="Export current query tweets as JSON"
                   >
                     Export JSON
                   </button>
                   {results.length > 1 && (
                     <>
                       <button
                         onClick={handleExportAllCSV}
                         className={styles.exportButton}
                         title="Export all queries summary as CSV"
                       >
                         Export All Summary
                       </button>
                       <button
                         onClick={handleExportAnalytics}
                         className={styles.exportButton}
                         title="Export analytics for all queries"
                       >
                         Export Analytics
                       </button>
                     </>
                   )}
                 </div>
               </div>
               {results.length > 1 && (
                 <div className={styles.resultTabs}>
                   {results.map((result, index) => (
                     <button
                       key={result.query}
                       className={`${styles.resultTab} ${index === activeResultIndex ? styles.activeTab : ""}`}
                       onClick={() => setActiveResultIndex(index)}
                     >
                       {result.query}
                       <span className={styles.tweetCount}>
                         ({result.tweets.length} tweets)
                       </span>
                     </button>
                   ))}
                 </div>
               )}
             </div>

             {activeResult && (
               <>
                 <div className={styles.summary}>
                   <h3>Summary</h3>
                   <p>{activeResult.summary}</p>
                   <div className={styles.meta}>
                     <span>Crawled: {formatDate(activeResult.crawledAt)}</span>
                      <span>Query: &quot;{activeResult.query}&quot;</span>
                   </div>
                 </div>

                 {results.length > 1 && (
                   <AnalyticsChart responses={results} />
                 )}

                 <div className={styles.tweetsGrid}>
                  {activeResult.tweets.map((tweet) => (
                    <div key={tweet.id} className={styles.tweetCard}>
                      <div className={styles.tweetHeader}>
                         {tweet.author.profileImageUrl && (
                          <Image
                            src={tweet.author.profileImageUrl}
                            alt={tweet.author.name}
                            width={48}
                            height={48}
                            className={styles.profileImage}
                          />
                        )}
                        <div className={styles.authorInfo}>
                          <div className={styles.authorName}>{tweet.author.name}</div>
                          <div className={styles.authorUsername}>@{tweet.author.username}</div>
                        </div>
                        <a
                          href={tweet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.tweetLink}
                        >
                          View on X
                        </a>
                      </div>
                      
                      <div className={styles.tweetContent}>
                        <p className={styles.tweetText}>{tweet.text}</p>
                        
                        {tweet.media && tweet.media.length > 0 && (
                          <div className={styles.tweetMedia}>
                            {tweet.media.map((media, index) => (
                              <div key={index} className={styles.mediaItem}>
                                 {media.type === "photo" ? (
                                  <Image
                                    src={media.url}
                                    alt="Tweet media"
                                    width={200}
                                    height={150}
                                    className={styles.mediaImage}
                                  />
                                ) : (
                                  <div className={styles.mediaPlaceholder}>
                                    {media.type.toUpperCase()} Media
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={styles.tweetFooter}>
                        <div className={styles.tweetStats}>
                          <span className={styles.stat}>
                            <span className={styles.statIcon}>💬</span>
                            {tweet.replyCount}
                          </span>
                          <span className={styles.stat}>
                            <span className={styles.statIcon}>🔄</span>
                            {tweet.retweetCount}
                          </span>
                          <span className={styles.stat}>
                            <span className={styles.statIcon}>❤️</span>
                            {tweet.likeCount}
                          </span>
                          {tweet.quoteCount && (
                            <span className={styles.stat}>
                              <span className={styles.statIcon}>💬</span>
                              {tweet.quoteCount}
                            </span>
                          )}
                        </div>
                        <div className={styles.tweetDate}>
                          {formatDate(tweet.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>🐦</div>
            <h3>Start Crawling Twitter/X</h3>
            <p>
              Enter a search term to crawl recent tweets. The crawler will analyze
              who said what, when they said it, and provide a summary of the conversation.
            </p>
            <div className={styles.exampleQueries}>
              <strong>Example queries:</strong>
              <ul>
                <li>artificial intelligence</li>
                <li>elon musk, spacex, tesla</li>
                <li>climate change conference</li>
                <li>tech news, programming, web development</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Twitter/X Crawler • Real-time tweet analysis • Multiple concurrent crawlers
        </p>
        <p className={styles.disclaimer}>
          This tool crawls publicly available tweets from Twitter/X. Rate limits apply.
          Add your Twitter API credentials in .env.local to use.
        </p>
      </footer>
    </div>
  );
}