const API_BASE = import.meta.env.VITE_API_URL || 'https://movie-recommendation-system-6erz.onrender.com';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getHomeFeed(category = 'trending', limit = 24) {
  return fetchJSON(`${API_BASE}/home?category=${category}&limit=${limit}`);
}

export async function searchTMDB(query, page = 1) {
  return fetchJSON(`${API_BASE}/tmdb/search?query=${encodeURIComponent(query)}&page=${page}`);
}

export async function getMovieDetails(tmdbId) {
  return fetchJSON(`${API_BASE}/movie/id/${tmdbId}`);
}

export async function getMovieBundle(query, tfidfTopN = 12, genreLimit = 12) {
  return fetchJSON(
    `${API_BASE}/movie/search?query=${encodeURIComponent(query)}&tfidf_top_n=${tfidfTopN}&genre_limit=${genreLimit}`
  );
}

export async function getGenreRecommendations(tmdbId, limit = 18) {
  return fetchJSON(`${API_BASE}/recommend/genre?tmdb_id=${tmdbId}&limit=${limit}`);
}

export async function getTFIDFRecommendations(title, topN = 12) {
  return fetchJSON(
    `${API_BASE}/recommend/tfidf?title=${encodeURIComponent(title)}&top_n=${topN}`
  );
}

export async function resolveTFIDFTitles(items) {
  const cards = await Promise.all(
    (items || []).map(async (item) => {
      try {
        const data = await searchTMDB(item.title, 1);
        const first = data.results?.[0];
        if (!first) return null;
        return {
          tmdb_id: first.id,
          title: first.title,
          poster_path: first.poster_path,
          release_date: first.release_date,
          vote_average: first.vote_average,
        };
      } catch {
        return null;
      }
    })
  );
  return cards.filter(Boolean);
}

export async function getStoryRecommendations(story, topN = 12) {
  const res = await fetch(`${API_BASE}/recommend/story`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ story, top_n: topN }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getMovieRecommendations(title, topN = 12) {
  const res = await fetch(`${API_BASE}/recommend/movie`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, top_n: topN }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getHealth() {
  return fetchJSON(`${API_BASE}/health`);
}
