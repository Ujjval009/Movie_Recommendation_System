import { Link } from 'react-router-dom';

const ULTIMATE_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect fill="#1a1a2e" width="500" height="750"/><text x="250" y="375" text-anchor="middle" dominant-baseline="middle" fill="#4a4a5a" font-family="sans-serif" font-size="18">No Poster</text></svg>'
);

function buildFallbackUrl(title, year, rating) {
  let url = `/poster/${encodeURIComponent((title || '').replace(/&/g, '%26'))}`;
  const params = [];
  if (year) params.push(`year=${year}`);
  if (rating) params.push(`rating=${rating}`);
  if (params.length) url += '?' + params.join('&');
  return url;
}

export default function MovieCard({ movie, index = 0 }) {
  const raw = movie.poster_url || movie.poster_path || null;
  const posterUrl = raw
    ? (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('/poster/') ? raw : `https://image.tmdb.org/t/p/w500${raw}`)
    : null;
  const title = movie.title;
  const year = (movie.release_date || '').slice(0, 4);
  const rating = movie.vote_average;
  const id = movie.tmdb_id || movie.id;
  const fallbackUrl = buildFallbackUrl(title, year, rating);

  return (
    <Link
      to={`/movie/${id}`}
      className="movie-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="movie-card-poster-wrapper">
        <img
          src={posterUrl || fallbackUrl}
          alt={`${title} poster`}
          className="movie-card-poster"
          loading="lazy"
          onError={(e) => {
            const current = e.target.src;
            if (current !== fallbackUrl) {
              e.target.src = fallbackUrl;
            } else if (current !== ULTIMATE_PLACEHOLDER) {
              e.target.src = ULTIMATE_PLACEHOLDER;
            }
          }}
        />
        <div className="movie-card-overlay">
          <span className="movie-card-view">View Details</span>
        </div>
        {rating && rating > 0 && (
          <div className="movie-card-rating">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--rating-gold)">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="movie-card-info">
        <h3 className="movie-card-title">{title}</h3>
        {year && <span className="movie-card-year">{year}</span>}
      </div>

      <style>{`
        .movie-card {
          display: block;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--bg-card);
          transition: var(--transition);
          animation: fadeIn 0.4s ease forwards;
          opacity: 0;
          animation-delay: inherit;
          cursor: pointer;
        }

        .movie-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--shadow-lg), var(--shadow-glow);
        }

        .movie-card-poster-wrapper {
          position: relative;
          aspect-ratio: 2 / 3;
          overflow: hidden;
          background: var(--bg-card);
        }

        .movie-card-poster {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: var(--transition);
        }

        .movie-card:hover .movie-card-poster {
          transform: scale(1.08);
        }

        .movie-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: var(--transition);
        }

        .movie-card:hover .movie-card-overlay {
          opacity: 1;
        }

        .movie-card-view {
          padding: 8px 20px;
          border: 2px solid white;
          border-radius: 999px;
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          transform: translateY(10px);
          transition: var(--transition);
        }

        .movie-card:hover .movie-card-view {
          transform: translateY(0);
        }

        .movie-card-rating {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.75);
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--rating-gold);
          backdrop-filter: blur(4px);
        }

        .movie-card-info {
          padding: 12px 14px 14px;
        }

        .movie-card-title {
          font-size: 0.95rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .movie-card-year {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 2px;
          display: inline-block;
        }
      `}</style>
    </Link>
  );
}
