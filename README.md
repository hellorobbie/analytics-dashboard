# Analytics Dashboard

A data-driven conversion and analytics dashboard built with Next.js. Track user events, analyze conversion funnels, compare A/B test variants, and view trends over time. Features raw event viewer with pagination, funnel drop-off analysis, variant performance metrics, and time-series visualizations using Recharts.

## Features

- **Raw Events Viewer** - Browse and filter event data with pagination support
- **Funnel Analysis** - Track user progression through conversion steps with drop-off metrics
- **A/B Testing** - Compare performance between variant A and B
- **Trends** - Visualize metrics over time with interactive charts

## Tech Stack

- **Framework:** Next.js 15
- **UI Library:** React 19
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Language:** TypeScript
- **Database:** JSON (file-based)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Generate sample event data
npm run generate-data

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx            # Home page
│   ├── api/
│   │   ├── events/route.ts # Events API endpoint
│   │   └── funnel/route.ts # Funnel API endpoint
│   ├── events/page.tsx     # Events viewer page
│   └── funnel/page.tsx     # Funnel analysis page
├── components/             # Reusable React components
├── data/
│   └── events.json         # Sample event data (~56k events)
├── lib/
│   ├── db.ts              # Data loading utilities
│   └── types.ts           # TypeScript type definitions
└── scripts/
    └── generateEvents.ts  # Sample data generator
```

## API Endpoints

### GET /api/events

Fetch paginated events data

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 50, max: 200)
- `session_id` (string, optional) - Filter by session ID

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 56773,
    "totalPages": 1136
  }
}
```

### GET /api/funnel

Get funnel analysis data

**Response:**

```json
[
  {
    "step_name": "page view",
    "sessions": 15000,
    "pct_from_previous": 100,
    "pct_from_start": 100
  },
  ...
]
```

## Event Types

Events are categorized as:

- `page_view` - User visited a page
- `add_to_cart` - User added item to cart
- `begin_checkout` - User started checkout
- `purchase` - User completed purchase

## Development

```bash
# Run TypeScript compiler
npx tsc --noEmit

# Run ESLint
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT

## Deployment to Heroku

### Prerequisites

- Heroku CLI installed
- GitHub account connected to Heroku

### Steps

1. **Create a Heroku app**

   ```bash
   heroku create your-app-name
   ```

2. **Deploy**

   ```bash
   git push heroku main
   ```

3. **Set up automatic data refresh** (optional)
   - Go to your Heroku app dashboard
   - Add the Heroku Scheduler add-on (free tier available)
   - Create a new scheduled job:
     - Command: `curl -X POST https://your-app-name.herokuapp.com/api/admin/regenerate-data -H "Authorization: Bearer YOUR_TOKEN"`
     - Frequency: Daily (or as needed)
   - Add environment variable `SCHEDULER_TOKEN` to your app config

4. **View your app**
   ```bash
   heroku open
   ```

### Environment Variables (if using scheduler auth)

```
SCHEDULER_TOKEN=your-secret-token
```

### Data Updates

- On deployment (Procfile `release` phase)
- Daily via Heroku Scheduler (if configured)
- Manually via `/api/admin/regenerate-data` endpoint
