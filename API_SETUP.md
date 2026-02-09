# API Setup Guide for Blaster

## Required API Credentials

### 1. Twitter/X API (Essential for tweet crawling)
**Get credentials from:** https://developer.twitter.com

Add to `.env.local`:
```env
TWITTER_API_KEY=your_actual_api_key_here
TWITTER_API_SECRET=your_actual_api_secret_here
TWITTER_ACCESS_TOKEN=your_actual_access_token_here
TWITTER_ACCESS_SECRET=your_actual_access_secret_here
TWITTER_BEARER_TOKEN=your_actual_bearer_token_here
```

### 2. Web Search API (Optional - for enhanced search)
Choose one of the following:

#### Option A: Google Custom Search API
**Get credentials from:** https://developers.google.com/custom-search/v1/overview
```env
SEARCH_API_KEY=your_google_custom_search_api_key
SEARCH_ENGINE_ID=your_search_engine_id
```

#### Option B: SerpAPI
**Get credentials from:** https://serpapi.com/
```env
SERPAPI_KEY=your_serpapi_key
```

#### Option C: Bing Search API
**Get credentials from:** https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
```env
BING_API_KEY=your_bing_api_key
```

### 3. News API (Optional - for news integration)
**Get credentials from:** https://newsapi.org/
```env
NEWS_API_KEY=your_newsapi_key
```

## Quick Setup Commands

1. **Copy environment template:**
```bash
cp .env.example .env.local
```

2. **Edit with your actual credentials:**
```bash
nano .env.local
# or use your preferred editor
```

3. **Restart the development server:**
```bash
npm run dev
```

## Testing API Connections

### Test Twitter API:
1. Visit http://localhost:3000
2. Enter a search query like "breaking news"
3. If configured correctly, you should see real tweets

### Test Web Search:
The app will automatically use real search APIs when credentials are provided.

## Troubleshooting

### Common Issues:

1. **"API authentication failed"**
   - Check that all API keys are correctly copied
   - Verify API keys haven't expired
   - Ensure proper permissions are set on the API dashboard

2. **"Rate limit exceeded"**
   - Twitter API has strict rate limits
   - Wait 15 minutes and try again
   - Consider upgrading to a paid Twitter API tier

3. **"No tweets found"**
   - Try different search terms
   - Check if the search query is too specific
   - Verify Twitter API is working (check status page)

## Next Steps After Setup

Once APIs are configured:
1. Test with various search queries
2. Explore export functionality (CSV/JSON)
3. Try multiple concurrent searches (comma-separated)
4. Check analytics and sentiment analysis features

## API Cost Considerations

- **Twitter API**: Free tier has limited requests, consider paid plans for production
- **Google Custom Search**: 100 free searches/day, then $5 per 1000 queries
- **NewsAPI**: Free tier available, paid plans for higher volume
- **SerpAPI**: Free tier with limits, paid plans available

## Security Notes

- Never commit `.env.local` to version control
- Use environment variables in production
- Rotate API keys regularly
- Monitor API usage to prevent unexpected charges