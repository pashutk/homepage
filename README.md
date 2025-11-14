# Browser Homepage

A lightweight, fast browser homepage that aggregates content from Lobsters, GitHub Trending, and Product Hunt.

## Features

- **Extremely fast**: 15-minute server-side caching + 5-minute client refresh
- **Lightweight**: Vanilla JS, no frameworks, minimal CSS
- **Optimized layout**: Fits in one screen height with 3-column grid
- **Dark theme**: Easy on the eyes
- **Auto-refresh**: Updates every 5 minutes

## Deployment Options

### Option 1: Vercel (Free, Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Your homepage will be live at `https://your-project.vercel.app`

### Option 2: Your Own Server

1. Install dependencies: `npm install`
2. Start server: `npm start`
3. Visit `http://localhost:3000`
4. Configure your web server (nginx/apache) to proxy to this port

Example nginx config:
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
}
```

### Option 3: Docker

**Using pre-built image from GitHub Container Registry:**
```bash
docker run -d -p 3000:3000 ghcr.io/YOUR_USERNAME/homepage:latest
```

**Building locally:**
```bash
docker build -t homepage .
docker run -d -p 3000:3000 homepage
```

**Using docker-compose:**
```yaml
version: '3'
services:
  homepage:
    image: ghcr.io/YOUR_USERNAME/homepage:latest
    ports:
      - "3000:3000"
    restart: unless-stopped
```

### Option 4: Netlify (Free)

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod`
3. Follow the prompts

## Configuration

### Cache TTL
Edit `api/feed.js` line 6:
```javascript
ttl: 15 * 60 * 1000 // 15 minutes (in milliseconds)
```

### Items per source
Edit `api/feed.js`:
- Line 14 for Lobsters: `.slice(0, 10)`
- Line 33 for GitHub: `per_page=10`
- Line 61 for Product Hunt: `if (items.length >= 10)`

### Client refresh interval
Edit `index.html` line 218:
```javascript
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
```

## Setting as Browser Homepage

### Chrome/Edge
1. Settings → On startup → Open a specific page
2. Add your deployment URL

### Firefox
1. Preferences → Home → Homepage and new windows
2. Enter your deployment URL

### Safari
1. Preferences → General → Homepage
2. Enter your deployment URL

## Tech Stack

- Node.js + Express
- Vanilla JavaScript
- CSS Grid
- Serverless-ready architecture

## API Sources

- **Lobsters**: Public JSON API
- **GitHub**: Search API (recent repos by stars)
- **Product Hunt**: Public RSS feed

## Performance

- Initial page load: < 50KB
- API response time: < 100ms (cached)
- Time to interactive: < 500ms
- No external dependencies on frontend

## CI/CD

The project includes automated Docker builds via GitHub Actions:

- **Triggers**: Pushes to `main` branch, version tags (`v*`), and pull requests
- **Registry**: GitHub Container Registry (ghcr.io)
- **Tags**: Automatic tagging with `latest`, branch names, semver, and commit SHA
- **Caching**: GitHub Actions cache for faster builds

When you push to the `main` branch, GitHub Actions automatically:
1. Builds the Docker image
2. Pushes to `ghcr.io/YOUR_USERNAME/homepage:latest`
3. Tags with commit SHA for version tracking

Pull the latest image:
```bash
docker pull ghcr.io/YOUR_USERNAME/homepage:latest
```

## License

MIT
