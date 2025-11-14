const fetch = require('node-fetch');

// Cache for descriptions
const descCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Fetch page metadata for description
async function fetchPageMetadata(url) {
  // Check cache first
  const cached = descCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.description;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    clearTimeout(timeout);

    if (!response.ok) return '';
    const html = await response.text();

    // Try Open Graph description first
    let match = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    if (match) {
      const desc = match[1];
      descCache.set(url, { description: desc, timestamp: Date.now() });
      return desc;
    }

    // Try meta description
    match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (match) {
      const desc = match[1];
      descCache.set(url, { description: desc, timestamp: Date.now() });
      return desc;
    }

    // Try alternate format
    match = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (match) {
      const desc = match[1];
      descCache.set(url, { description: desc, timestamp: Date.now() });
      return desc;
    }

    return '';
  } catch (error) {
    return '';
  }
}

module.exports = async (req, res) => {
  const { urls } = req.query;

  if (!urls) {
    return res.status(400).json({ error: 'Missing urls parameter' });
  }

  const urlList = Array.isArray(urls) ? urls : [urls];

  // Fetch all descriptions in parallel
  const descriptions = await Promise.all(
    urlList.map(async (url) => ({
      url,
      description: await fetchPageMetadata(url)
    }))
  );

  res.json({ descriptions });
};
