# Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- Twitter/X Developer Account with API credentials
- Docker and Docker Compose (optional, for containerized deployment)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_SECRET=your_twitter_api_secret_here
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here
TWITTER_ACCESS_SECRET=your_twitter_access_secret_here
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here
```

## Local Development

### Option 1: Using npm (Recommended)

1. Install dependencies:
   ```bash
   npm ci
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

### Option 2: Using Docker Compose

1. Build and start the development container:
   ```bash
   docker-compose up dev
   ```

2. Open http://localhost:3000 in your browser

## Production Deployment

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository to Vercel
3. Add the environment variables in Vercel dashboard
4. Deploy automatically on push

### Option 2: Docker Container

1. Build the production image:
   ```bash
   docker build -t twitter-crawler .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 \
     -e TWITTER_BEARER_TOKEN=your_token \
     -e TWITTER_API_KEY=your_key \
     -e TWITTER_API_SECRET=your_secret \
     -e TWITTER_ACCESS_TOKEN=your_access_token \
     -e TWITTER_ACCESS_SECRET=your_access_secret \
     twitter-crawler
   ```

### Option 3: Traditional Server

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/crawl?query=search_term` - Crawl tweets for a single query
- `POST /api/crawl` - Crawl tweets for single or multiple queries
  ```json
  {
    "query": "single search term"
  }
  ```
  or
  ```json
  {
    "queries": ["query1", "query2", "query3"]
  }
  ```

## Features

### Mock Mode
When Twitter API credentials are not configured or invalid, the application automatically switches to mock mode, providing sample data for testing.

### Export Functionality
- Export individual query results as CSV or JSON
- Export summary of all queries as CSV
- Export analytics data as JSON

### Analytics Dashboard
- Real-time metrics display
- Top queries and authors
- Engagement statistics

### Error Handling
- Rate limit detection and handling
- Authentication error handling
- Graceful fallback to mock data

## Configuration

### Twitter API Setup
1. Apply for Twitter Developer Access at https://developer.twitter.com
2. Create a new Project and App
3. Generate API keys and access tokens
4. Set the appropriate permissions (read-only for tweets)

### Rate Limiting
The application implements:
- Concurrent query limit: 5 queries at once
- Tweet limit per query: 20 tweets
- Automatic rate limit detection and user notification

## Troubleshooting

### Common Issues

1. **API Authentication Failed**
   - Verify all Twitter API credentials are correct
   - Check that the tokens have the required permissions
   - Ensure tokens haven't expired

2. **Rate Limit Errors**
   - The application will automatically notify users
   - Wait 15 minutes before trying again
   - Consider upgrading Twitter API tier for higher limits

3. **Mock Mode Active**
   - Check if API credentials are properly set
   - Verify `.env.local` file exists and is correctly formatted
   - Restart the application after updating credentials

### Logs
- Development: Logs appear in console
- Production: Check Vercel logs or Docker container logs
- API errors are logged with detailed information

## Security Considerations

1. **API Credentials**
   - Never commit `.env.local` to version control
   - Use environment variables in production
   - Rotate credentials regularly

2. **Rate Limiting**
   - The application respects Twitter API rate limits
   - Implemented client-side rate limiting
   - User notifications for rate limit issues

3. **Data Privacy**
   - Only public tweet data is accessed
   - No user authentication required
   - Export functionality runs client-side

## Performance Optimization

- Concurrent query processing (up to 5 queries)
- Client-side data processing for exports
- Efficient tweet rendering with virtualization
- Optimized image loading with Next.js Image component

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code documentation
3. Create an issue on GitHub
4. Contact the development team