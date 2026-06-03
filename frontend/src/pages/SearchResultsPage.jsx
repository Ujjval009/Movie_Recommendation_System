import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchTMDB } from '../api/movieApi';
import MovieGrid from '../components/MovieGrid';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setMovies([]);
      setTotalResults(0);
      return;
    }

    let cancelled = false;

    async function search() {
      setLoading(true);
      setError(null);
      try {
        const data = await searchTMDB(query);
        if (!cancelled) {
          const results = data.results || [];
          const cards = results.map((r) => ({
            tmdb_id: r.id,
            id: r.id,
            title: r.title,
            poster_path: r.poster_path,
            release_date: r.release_date,
            vote_average: r.vote_average,
          }));
          setMovies(cards);
          setTotalResults(data.total_results || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setMovies([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    search();
    return () => { cancelled = true; };
  }, [query]);

  return (
    <div className="search-page">
      <div className="container search-header">
        <h1 className="search-heading">
          {query ? (
            <>
              Results for "<span className="search-query">{query}</span>"
            </>
          ) : (
            'Search Movies'
          )}
        </h1>
        {totalResults > 0 && (
          <span className="search-count">{totalResults} movies found</span>
        )}
      </div>

      <MovieGrid
        movies={movies}
        loading={loading}
        error={error}
        emptyMessage={query ? `No results found for "${query}". Try a different search term.` : 'Enter a search term to find movies.'}
      />

      <style>{`
        .search-header {
          padding: 32px 0 8px;
          display: flex;
          align-items: baseline;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-heading {
          font-size: 1.6rem;
          font-weight: 700;
        }

        .search-query {
          color: var(--accent-light);
        }

        .search-count {
          color: var(--text-muted);
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
