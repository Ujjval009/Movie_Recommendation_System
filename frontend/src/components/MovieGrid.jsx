import MovieCard from './MovieCard';
import Loader from './Loader';

export default function MovieGrid({ movies, loading, error, title, emptyMessage }) {
  if (loading) return <Loader count={12} />;

  if (error) {
    return (
      <div className="grid-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>Failed to load movies</p>
        <span>{error}</span>

        <style>{`
          .grid-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 60px 20px;
            text-align: center;
            color: var(--text-muted);
          }
          .grid-error p {
            font-size: 1.1rem;
            color: var(--text-secondary);
            font-weight: 500;
          }
          .grid-error span {
            font-size: 0.85rem;
          }
        `}</style>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="grid-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
        <p>{emptyMessage || 'No movies found'}</p>

        <style>{`
          .grid-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 60px 20px;
            text-align: center;
            color: var(--text-muted);
          }
          .grid-empty p {
            font-size: 1.05rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <section className="movie-grid-section">
      {title && (
        <div className="container">
          <h2 className="section-title">
            <span className="accent-bar" />
            {title}
          </h2>
        </div>
      )}
      <div className="container">
        <div className="movie-grid">
          {movies.map((movie, i) => (
            <MovieCard key={movie.tmdb_id || movie.id || i} movie={movie} index={i} />
          ))}
        </div>
      </div>

      <style>{`
        .movie-grid-section {
          padding: 20px 0 40px;
        }

        .movie-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
        }

        @media (max-width: 768px) {
          .movie-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 14px;
          }
        }

        @media (max-width: 480px) {
          .movie-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }
      `}</style>
    </section>
  );
}
