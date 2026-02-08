# Blaster - Twitter/X Crawler

A professional Twitter/X crawler application that searches and analyzes tweets in real-time. Identify who said what, analyze conversations, and export data for further analysis.

## Features

- **Real-time Tweet Crawling**: Search Twitter/X for any topic or keyword
- **Multi-Query Support**: Crawl multiple queries simultaneously (up to 5 concurrent)
- **Who Said What**: Clear attribution of tweets to authors with profile information
- **Analytics Dashboard**: Real-time metrics and insights
- **Export Functionality**: Export data as CSV or JSON
- **Mock Mode**: Works without Twitter API credentials for testing
- **Professional UI**: Clean, modern interface inspired by Twitter/X

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Twitter/X Developer Account (optional, for real data)

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd blaster
   ```

2. Install dependencies:
   ```bash
   npm ci
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

### Using Docker

1. Build and run with Docker Compose:
   ```bash
   docker-compose up dev
   ```

2. Open http://localhost:3000

## Configuration

### Twitter API Setup (Optional)

For real Twitter data, create a `.env.local` file:

```bash
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_SECRET=your_twitter_api_secret_here
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here
TWITTER_ACCESS_SECRET=your_twitter_access_secret_here
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here
```

Without API credentials, the app runs in **mock mode** with sample data.

## Usage

### Single Query Search
1. Enter a search term (e.g., "artificial intelligence")
2. Click "Search Tweets"
3. View results with author attribution and engagement metrics

### Multiple Query Search
1. Enter multiple queries separated by commas (e.g., "AI, machine learning, deep learning")
2. Click "Crawl Multiple Queries"
3. Switch between query results using tabs

### Export Data
- **Export CSV**: Download current query results as CSV
- **Export JSON**: Download current query results as JSON
- **Export All Summary**: Download summary of all queries as CSV
- **Export Analytics**: Download detailed analytics as JSON

## API Endpoints

- `GET /api/crawl?query=search_term` - Crawl tweets for a single query
- `POST /api/crawl` - Crawl tweets for single or multiple queries

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy automatically

### Docker Production
```bash
docker build -t twitter-crawler .
docker run -p 3000:3000 -e TWITTER_BEARER_TOKEN=your_token twitter-crawler
```

### Traditional Server
```bash
npm run build
npm start
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Architecture

- **Frontend**: Next.js 14 with React and TypeScript
- **Backend**: Next.js API Routes
- **Styling**: CSS Modules with modern Twitter/X design
- **Data Processing**: Client-side export utilities
- **Error Handling**: Graceful degradation with mock data

## Development

### Project Structure
```
src/
├── app/                    # Next.js app router
│   ├── api/crawl/         # Twitter crawl API
│   ├── page.tsx           # Main application page
│   └── layout.tsx         # Root layout
├── components/            # React components
├── lib/                   # Utilities and services
│   ├── twitter-crawler.ts # Twitter API client
│   ├── twitter-crawler-mock.ts # Mock data provider
│   └── export-utils.ts    # Data export utilities
└── styles/               # Global styles
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
1. Check the [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section
2. Review the code documentation
3. Create an issue on GitHub
