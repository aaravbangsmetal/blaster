# Blaster Search

A simple Google-like search UI that crawls recent web pages, summarizes them with DeepSeek, and shows cited sources.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add your DeepSeek API key in `.env.local`:

```bash
DEEPSEEK_API_KEY=your_key_here
```

3. Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

## Notes

- Search uses DuckDuckGo's Instant Answer API to discover URLs.
- The crawler fetches a few top pages and summarizes with the LLM.
