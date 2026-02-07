"use client";

import { useState } from "react";
import styles from "./page.module.css";

type WebResult = {
  title: string;
  url: string;
  snippet?: string;
};

type ImageResult = {
  title: string;
  url: string;
  image: string;
  thumbnail?: string;
  source?: string;
  width?: number;
  height?: number;
};

type VideoResult = {
  title: string;
  url: string;
  thumbnail?: string;
  source?: string;
  duration?: string;
  description?: string;
};

type SearchResponse = {
  query: string;
  web: WebResult[];
  images: ImageResult[];
  videos: VideoResult[];
  fetchedAt: string;
};

type TabId = "all" | "images" | "videos" | "news";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
  { id: "news", label: "News" },
];

const getHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [showResults, setShowResults] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setResult(null);
    setShowResults(true);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Search failed. Try again.");
      }

      const payload = (await response.json()) as SearchResponse;
      setResult(payload);
      setActiveTab("all");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const metaLine = () => {
    if (!result) return "";
    const total = result.web.length + result.images.length + result.videos.length;
    return `About ${total.toLocaleString()} results (0.45 seconds)`;
  };

  const renderGoogleLogo = () => (
    <div className={styles.googleLogo}>
      <span className={styles.logoBlue}>G</span>
      <span className={styles.logoRed}>o</span>
      <span className={styles.logoYellow}>o</span>
      <span className={styles.logoBlue}>g</span>
      <span className={styles.logoGreen}>l</span>
      <span className={styles.logoRed}>e</span>
    </div>
  );

  const renderSearchBar = () => (
    <form className={styles.searchForm} onSubmit={handleSubmit}>
      <div className={styles.searchBar}>
        <div className={styles.searchIcon}>
          <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
          </svg>
        </div>
        <input
          type="search"
          placeholder="Search Google or type a URL"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={styles.searchInput}
          aria-label="Search"
        />
        {query.length > 0 && (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Clear"
            onClick={() => setQuery("")}
          >
            <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
            </svg>
          </button>
        )}
        <div className={styles.searchTools}>
          <button type="button" className={styles.voiceButton} aria-label="Search by voice">
            <svg focusable="false" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"></path>
            </svg>
          </button>
          <button type="button" className={styles.imageButton} aria-label="Search by image">
            <svg focusable="false" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 13l4 5H6l4-4 1.79 1.78L14 13zm-6.01-2.99A2 2 0 0 0 8 6a2 2 0 0 0-.01 4.01zM22 5v14a3 3 0 0 1-3 2.99H5c-1.64 0-3-1.36-3-3V5c0-1.64 1.36-3 3-3h14c1.65 0 3 1.36 3 3zm-2.01 0a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7v-.01h7a1 1 0 0 0 1-1V5z"></path>
            </svg>
          </button>
        </div>
      </div>
      <div className={styles.searchButtons}>
        <button className={styles.googleButton} type="submit" disabled={loading}>
          {loading ? "Searching..." : "Google Search"}
        </button>
        <button className={styles.luckyButton} type="button">
          I'm Feeling Lucky
        </button>
      </div>
    </form>
  );

  const renderHeader = () => (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        {renderGoogleLogo()}
        {showResults && (
          <div className={styles.headerSearch}>
            <div className={styles.headerSearchBar}>
              <div className={styles.headerSearchIcon}>
                <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
                </svg>
              </div>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={styles.headerSearchInput}
                aria-label="Search"
              />
            </div>
          </div>
        )}
      </div>
      <div className={styles.headerRight}>
        <button className={styles.headerButton}>
          <svg focusable="false" viewBox="0 0 24 24">
            <path d="M6,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM16,6c0,1.1 0.9,2 2,2s2,-0.9 2,-2 -0.9,-2 -2,-2 -2,0.9 -2,2zM12,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2z"></path>
          </svg>
        </button>
        <button className={styles.profileButton}>
          <div className={styles.profileIcon}>G</div>
        </button>
      </div>
    </header>
  );

  const renderTabs = () => (
    <div className={styles.tabsContainer}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.id)}
            disabled={!result}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tools}>
        <button className={styles.toolButton}>
          <svg focusable="false" viewBox="0 0 24 24">
            <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"></path>
          </svg>
          Tools
        </button>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!showResults) return null;

    return (
      <main className={styles.resultsContainer}>
        {renderTabs()}
        
        <div className={styles.resultsInfo}>
          <p className={styles.resultsCount}>{metaLine()}</p>
        </div>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>Searching...</p>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        {!result && !loading && !error && (
          <div className={styles.emptyState}>
            <p>Search something to see results</p>
          </div>
        )}

        {result && !loading && activeTab === "all" && (
          <div className={styles.webResults}>
            {result.web.length === 0 && (
              <p className={styles.emptyMessage}>No results found</p>
            )}
            {result.web.map((item, index) => (
              <div key={item.url} className={styles.resultItem}>
                <div className={styles.resultUrl}>
                  <span className={styles.resultFavicon}>🌐</span>
                  <span>{getHost(item.url)}</span>
                  <span className={styles.resultDropdown}>▼</span>
                </div>
                <a href={item.url} className={styles.resultTitle} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
                {item.snippet && <p className={styles.resultSnippet}>{item.snippet}</p>}
              </div>
            ))}
          </div>
        )}

        {result && !loading && activeTab === "images" && (
          <div className={styles.imageResults}>
            {result.images.length === 0 && (
              <p className={styles.emptyMessage}>No images found</p>
            )}
            <div className={styles.imageGrid}>
              {result.images.map((item, index) => (
                <div key={`${item.url}-${index}`} className={styles.imageCard}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <img
                      src={item.thumbnail ?? item.image}
                      alt={item.title}
                      loading="lazy"
                      className={styles.imageThumb}
                    />
                  </a>
                  <div className={styles.imageInfo}>
                    <a href={item.url} className={styles.imageTitle} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                    <div className={styles.imageSource}>{getHost(item.url)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && !loading && activeTab === "videos" && (
          <div className={styles.videoResults}>
            {result.videos.length === 0 && (
              <p className={styles.emptyMessage}>No videos found</p>
            )}
            <div className={styles.videoGrid}>
              {result.videos.map((item, index) => (
                <div key={`${item.url}-${index}`} className={styles.videoCard}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <div className={styles.videoThumb}>
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          loading="lazy"
                          className={styles.videoImage}
                        />
                      ) : (
                        <div className={styles.videoPlaceholder}>▶</div>
                      )}
                      {item.duration && (
                        <span className={styles.videoDuration}>{item.duration}</span>
                      )}
                    </div>
                  </a>
                  <div className={styles.videoInfo}>
                    <a href={item.url} className={styles.videoTitle} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                    <div className={styles.videoMeta}>
                      <span className={styles.videoSource}>{item.source ?? getHost(item.url)}</span>
                      {item.description && (
                        <span className={styles.videoDescription}>{item.description}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && !loading && activeTab === "news" && (
          <div className={styles.newsResults}>
            <p className={styles.emptyMessage}>News results coming soon</p>
          </div>
        )}

        {result && result.web.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.googleLogoSmall}>
              <span className={styles.logoBlue}>G</span>
              <span className={styles.logoRed}>o</span>
              <span className={styles.logoYellow}>o</span>
              <span className={styles.logoBlue}>g</span>
              <span className={styles.logoGreen}>l</span>
              <span className={styles.logoRed}>e</span>
            </div>
            <div className={styles.paginationNumbers}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <a key={num} href="#" className={styles.pageNumber}>
                  {num}
                </a>
              ))}
              <a href="#" className={styles.nextPage}>
                Next
              </a>
            </div>
          </div>
        )}
      </main>
    );
  };

  const renderFooter = () => (
    <footer className={styles.footer}>
      <div className={styles.footerLocation}>
        <span>United States</span>
        <span className={styles.locationPin}>📍</span>
        <span className={styles.locationText}>
          <strong>Based on your past activity</strong> - Update location
        </span>
      </div>
      <div className={styles.footerLinks}>
        <div className={styles.footerColumn}>
          <a href="#">Help</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
        <div className={styles.footerColumn}>
          <a href="#">Advertising</a>
          <a href="#">Business</a>
          <a href="#">About</a>
        </div>
        <div className={styles.footerColumn}>
          <a href="#">How Search works</a>
        </div>
      </div>
      <div className={styles.signature}>
        MADE BY RANDOM MF FROM G BLOCK 758
      </div>
    </footer>
  );

  return (
    <div className={styles.page}>
      {renderHeader()}
      
      {!showResults ? (
        <div className={styles.homeContainer}>
          <div className={styles.homeContent}>
            {renderGoogleLogo()}
            {renderSearchBar()}
            <div className={styles.homeFooter}>
              <p>Google offered in: <a href="#">Español</a></p>
            </div>
          </div>
        </div>
      ) : (
        renderResults()
      )}
      
      {renderFooter()}
    </div>
  );
}