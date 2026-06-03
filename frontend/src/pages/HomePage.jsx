import { useState, useEffect, useCallback } from 'react';
import { getHomeFeed } from '../api/movieApi';
import MovieGrid from '../components/MovieGrid';

const CATEGORIES = [
  { key: 'trending', label: 'Trending' },
  { key: 'popular', label: 'Popular' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'now_playing', label: 'Now Playing' },
  { key: 'upcoming', label: 'Upcoming' },
];

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('trending');

  const fetchMovies = useCallback(async (cat) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHomeFeed(cat, 24);
      setMovies(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovies(category);
  }, [category, fetchMovies]);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-bg" />
        <div className="container hero-content">
          <h1 className="hero-title">
            Discover Your Next
            <span className="hero-highlight"> Favorite Movie</span>
          </h1>
          <p className="hero-subtitle">
            AI-powered recommendations tailored to your taste. Explore trending, popular, and hidden gems.
          </p>
        </div>
      </section>

      <section className="categories-nav">
        <div className="container">
          <nav className="category-tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`category-tab ${category === cat.key ? 'active' : ''}`}
                onClick={() => setCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <MovieGrid
        movies={movies}
        loading={loading}
        error={error}
        emptyMessage="No movies available for this category."
      />

      <style>{`
        .hero {
          position: relative;
          padding: 80px 0 60px;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          background: var(--gradient-hero);
          z-index: -1;
        }

        .hero-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.15) 0%, transparent 60%);
        }

        .hero-content {
          text-align: center;
          animation: fadeInUp 0.6s ease;
        }

        .hero-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .hero-highlight {
          background: linear-gradient(135deg, var(--accent-light), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          color: var(--text-secondary);
          max-width: 560px;
          margin: 0 auto;
          line-height: 1.7;
        }

        .categories-nav {
          padding: 4px 0 16px;
          position: sticky;
          top: 72px;
          z-index: 10;
          background: var(--bg-primary);
        }

        .category-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 0;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .category-tabs::-webkit-scrollbar {
          display: none;
        }

        .category-tab {
          padding: 8px 20px;
          border-radius: 999px;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          transition: var(--transition);
          white-space: nowrap;
        }

        .category-tab:hover {
          color: var(--text-primary);
          border-color: var(--border-light);
        }

        .category-tab.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        @media (max-width: 768px) {
          .hero {
            padding: 48px 0 36px;
          }
          .hero-subtitle {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
