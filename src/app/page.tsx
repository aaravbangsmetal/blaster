"use client";

import { useState } from "react";
import styles from "./page.module.css";

type SearchSource = {
  title: string;
  url: string;
  snippet?: string;
};

type SearchResponse = {
  query: string;
  answer: string;
  sources: SearchSource[];
  fetchedAt: string;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setResult(null);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoBlue}>B</span>
          <span className={styles.logoRed}>l</span>
          <span className={styles.logoYellow}>a</span>
          <span className={styles.logoBlue}>s</span>
          <span className={styles.logoGreen}>t</span>
          <span className={styles.logoRed}>e</span>
          <span className={styles.logoBlue}>r</span>
        </div>
      </header>

      <form className={styles.searchForm} onSubmit={handleSubmit}>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
          <input
            type="search"
            placeholder="Search the web"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={styles.searchInput}
            aria-label="Search query"
          />
          {query.length > 0 && (
            <button
              type="button"
              className={styles.clearButton}
              aria-label="Clear"
              onClick={() => setQuery("")}
            >
              ×
            </button>
          )}
          <button className={styles.voiceButton} type="button" aria-label="Voice">
            🎙️
          </button>
        </div>
        <div className={styles.searchActions}>
          <button className={styles.primaryButton} type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
          <button className={styles.secondaryButton} type="button">
            I'm Feeling Lucky
          </button>
        </div>
      </form>

      <section className={styles.results}>
        {loading && (
          <div className={styles.shimmerStack}>
            <div className={styles.shimmerLine} />
            <div className={styles.shimmerLine} />
            <div className={styles.shimmerLineShort} />
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        {result && !loading && (
          <div className={styles.answerBlock}>
            <p className={styles.answerHeading}>Summary</p>
            <p className={styles.answerText}>{result.answer}</p>
            <p className={styles.meta}>Fetched {new Date(result.fetchedAt).toLocaleString()}</p>
          </div>
        )}

        {result && result.sources.length > 0 && (
          <div className={styles.sources}>
            <p className={styles.sectionTitle}>Sources</p>
            <div className={styles.sourceList}>
              {result.sources.map((source, index) => (
                <a
                  key={`${source.url}-${index}`}
                  className={styles.sourceItem}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className={styles.sourceUrl}>{source.url}</span>
                  <span className={styles.sourceTitle}>{source.title}</span>
                  {source.snippet && (
                    <span className={styles.sourceSnippet}>{source.snippet}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <p>Blaster Search · Powered by live web crawling</p>
      </footer>
    </main>
  );
}
