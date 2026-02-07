"use client";

import { useEffect, useRef, useState } from "react";
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
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, result, error]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

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
        <p className={styles.brand}>Blaster</p>
        <p className={styles.headerHint}>Ask anything. Get a fresh, cited summary.</p>
      </header>

      <section className={styles.thread}>
        {!result && !loading && !error && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>+</div>
            <p>Start with a question. Results appear here.</p>
          </div>
        )}

        {result && (
          <div className={styles.userMessage}>
            <p>{result.query}</p>
          </div>
        )}

        {loading && (
          <div className={styles.assistantMessage}>
            <div className={styles.shimmerLine} />
            <div className={styles.shimmerLine} />
            <div className={styles.shimmerLineShort} />
          </div>
        )}

        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        )}

        {result && !loading && (
          <div className={styles.assistantMessage}>
            <p className={styles.answerText}>{result.answer}</p>
            {result.sources.length > 0 && (
              <div className={styles.sources}>
                <p className={styles.sourcesTitle}>Sources</p>
                <ul className={styles.sourcesList}>
                  {result.sources.map((source, index) => (
                    <li key={`${source.url}-${index}`}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {index + 1}. {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className={styles.meta}>Fetched {new Date(result.fetchedAt).toLocaleString()}</p>
          </div>
        )}
        <div ref={endRef} />
      </section>

      <form className={styles.inputBar} onSubmit={handleSubmit}>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="Add"
          title="Add"
        >
          <span>+</span>
        </button>
        <input
          type="search"
          placeholder="Ask anything"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={styles.input}
          aria-label="Search query"
        />
        <button
          className={styles.iconButton}
          type="button"
          aria-label="Voice"
          title="Voice"
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
          </svg>
        </button>
        <button className={styles.sendButton} type="submit" disabled={loading}>
          <span className={styles.sendIcon} />
        </button>
      </form>
    </main>
  );
}
