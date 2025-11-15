const fetch = require('node-fetch');

// In-memory cache
const cache = {
  ttl: 30 * 60 * 1000 // 30 minutes
};

async function fetchLobsters() {
  try {
    const response = await fetch('https://lobste.rs/hottest.json');
    if (!response.ok) throw new Error('Lobsters API failed');
    const data = await response.json();

    // Return immediately without fetching metadata (for speed)
    return data.slice(0, 10).map(item => ({
      title: item.title,
      url: item.url || `https://lobste.rs${item.comments_url}`,
      score: item.score,
      comments: item.comment_count,
      user: item.submitter_user,
      tags: item.tags,
      description: item.description_plain || ''
    }));
  } catch (error) {
    console.error('Lobsters fetch error:', error);
    return [];
  }
}

async function fetchGitHubTrending(timeRange = 'week') {
  try {
    const since = timeRange === 'day' ? 'daily' : 'weekly';

    // Scrape GitHub trending directly (faster than unreliable third-party APIs)
    const response = await fetch(`https://github.com/trending?since=${since}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) throw new Error('GitHub trending failed');

    const html = await response.text();
    const items = [];

    // Simpler regex - extract repo links
    const repoPattern = /<h2[^>]*>\s*<a[^>]*href="\/([^"]+)"[^>]*>/g;
    let match;
    let count = 0;

    while ((match = repoPattern.exec(html)) && count < 10) {
      const name = match[1];
      const url = `https://github.com/${name}`;

      // Find the article block for this repo to get description
      const articleStart = html.indexOf(match[0]);
      const articleEnd = html.indexOf('</article>', articleStart);
      const article = html.substring(articleStart, articleEnd);

      // Extract description
      const descMatch = article.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>(.*?)<\/p>/s);
      const description = descMatch
        ? descMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        : '';

      // Extract total stars (appears after octicon-star svg)
      const starsMatch = article.match(/octicon octicon-star[\s\S]*?<\/svg>\s*([\d,]+)/);
      const stars = starsMatch ? parseInt(starsMatch[1].replace(/,/g, '')) : 0;

      // Extract language
      const langMatch = article.match(/itemprop="programmingLanguage"[^>]*>([^<]+)/);
      const language = langMatch ? langMatch[1].trim() : null;

      items.push({ name, url, description, stars, language });
      count++;
    }

    return items;
  } catch (error) {
    console.error('GitHub trending error:', error);
    return [];
  }
}

async function fetchProductHunt() {
  try {
    // Using Product Hunt's public posts feed (Atom format)
    const response = await fetch('https://www.producthunt.com/feed');
    if (!response.ok) throw new Error('Product Hunt feed failed');
    const text = await response.text();

    // Parse Atom feed for basic info
    const items = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const matches = text.matchAll(entryRegex);

    for (const match of matches) {
      const entryXml = match[1];
      const titleMatch = entryXml.match(/<title>(.*?)<\/title>/);
      const linkMatch = entryXml.match(/<link rel="alternate"[^>]*href="([^"]+)"/);
      const contentMatch = entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/);

      if (titleMatch && linkMatch) {
        let description = '';
        if (contentMatch) {
          // Extract text from HTML content (content is HTML-escaped)
          const htmlContent = contentMatch[1];
          // Match the first <p> tag content (escaped as &lt;p&gt;)
          const textMatch = htmlContent.match(/&lt;p&gt;\s*([\s\S]*?)\s*&lt;\/p&gt;/);
          if (textMatch) {
            // Decode HTML entities and clean up
            description = textMatch[1]
              .trim()
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
          }
        }

        items.push({
          title: titleMatch[1],
          url: linkMatch[1],
          description: description
        });
      }

      if (items.length >= 10) break;
    }

    return items;
  } catch (error) {
    console.error('Product Hunt fetch error:', error);
    return [];
  }
}

async function fetchAllFeeds(githubTimeRange = 'week') {
  const [lobsters, github, productHunt] = await Promise.all([
    fetchLobsters(),
    fetchGitHubTrending(githubTimeRange),
    fetchProductHunt()
  ]);

  return {
    lobsters,
    github,
    productHunt,
    timestamp: Date.now()
  };
}

module.exports = async (req, res) => {
  const githubTimeRange = req.query.github_range || 'week';

  // Check cache with time range key
  const cacheKey = `${githubTimeRange}`;
  const now = Date.now();

  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < cache.ttl) {
    return res.json(cache[cacheKey].data);
  }

  // Fetch fresh data
  try {
    const data = await fetchAllFeeds(githubTimeRange);

    if (!cache[cacheKey]) {
      cache[cacheKey] = {};
    }
    cache[cacheKey].data = data;
    cache[cacheKey].timestamp = now;

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
    res.json(data);
  } catch (error) {
    console.error('Feed fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch feeds' });
  }
};
