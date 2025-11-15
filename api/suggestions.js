const fetch = require('node-fetch');

// Cache to reduce API calls
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchDuckDuckGoSuggestions(query) {
  if (!query || query.length < 2) {
    return [];
  }

  // Check cache
  const cacheKey = `ddg:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.suggestions;
  }

  try {
    // DuckDuckGo autocomplete endpoint
    const url = `https://ac.duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error('DuckDuckGo API request failed');
    }

    const data = await response.json();

    // DuckDuckGo returns array format: [query, [suggestions]]
    const suggestions = Array.isArray(data) && data.length > 1 ? data[1] : [];

    // Cache the results
    cache.set(cacheKey, {
      suggestions: suggestions.slice(0, 8), // Limit to 8 suggestions
      timestamp: Date.now()
    });

    // Clean up old cache entries (keep cache size reasonable)
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return suggestions.slice(0, 8);
  } catch (error) {
    console.error('DuckDuckGo suggestions error:', error);
    return [];
  }
}

async function fetchGoogleSuggestions(query) {
  if (!query || query.length < 2) {
    return [];
  }

  // Check cache
  const cacheKey = `google:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.suggestions;
  }

  try {
    // Google autocomplete endpoint (unofficial)
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error('Google API request failed');
    }

    const data = await response.json();

    // Google returns array format: [query, [suggestions]]
    const suggestions = Array.isArray(data) && data.length > 1 ? data[1] : [];

    // Cache the results
    cache.set(cacheKey, {
      suggestions: suggestions.slice(0, 8), // Limit to 8 suggestions
      timestamp: Date.now()
    });

    // Clean up old cache entries (keep cache size reasonable)
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return suggestions.slice(0, 8);
  } catch (error) {
    console.error('Google suggestions error:', error);
    return [];
  }
}

module.exports = async (req, res) => {
  const query = req.query.q;
  const engine = req.query.engine || 'ddg';

  if (!query) {
    return res.json({ suggestions: [] });
  }

  try {
    let suggestions = [];

    if (engine === 'google') {
      suggestions = await fetchGoogleSuggestions(query);
    } else {
      suggestions = await fetchDuckDuckGoSuggestions(query);
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions fetch error:', error);
    res.status(500).json({ suggestions: [], error: 'Failed to fetch suggestions' });
  }
};
