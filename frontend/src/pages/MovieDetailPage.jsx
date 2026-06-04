import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMovieDetails, getMovieBundle, getGenreRecommendations, getTFIDFRecommendations, resolveTFIDFTitles } from '../api/movieApi';
import MovieGrid from '../components/MovieGrid';

function buildFallbackUrl(title, year, rating) {
  let url = `/poster/${encodeURIComponent((title || '').replace(/&/g, '%26'))}`;
  const params = [];
  if (year) params.push(`year=${year}`);
  if (rating) params.push(`rating=${rating}`);
  if (params.length) url += '?' + params.join('&');
  return url;
}

function posterSrc(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/poster/')) return url;
  return `https://image.tmdb.org/t/p/w500${url}`;
}

function backdropSrc(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/poster/')) return url;
  return `https://image.tmdb.org/t/p/w1280${url}`;
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backdropFailed, setBackdropFailed] = useState(false);

  const [tfidfMovies, setTfidfMovies] = useState([]);
  const [genreMovies, setGenreMovies] = useState([]);
  const [recsLoading, setRecsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setBackdropFailed(false);
      setTfidfMovies([]);
      setGenreMovies([]);
      setRecsLoading(true);

      let movieData;
      try {
        movieData = await getMovieDetails(id);
        if (!cancelled) setMovie(movieData);
      } catch (err) {
        if (!cancelled) setError(err.message);
        setLoading(false);
        return;
      }

      if (!cancelled) setLoading(false);

      const queryTitle = movieData?.title || '';
      if (!queryTitle) return;

      try {
        const bundle = await getMovieBundle(queryTitle, 12, 12);
        if (!cancelled) {
          const tfidfCards = (bundle.tfidf_recommendations || [])
            .map((item) => item.tmdb)
            .filter(Boolean);

          if (tfidfCards.length > 0) {
            setTfidfMovies(tfidfCards);
          } else {
            console.warn('Bundle returned empty tfidf_recommendations, trying /recommend/tfidf');
            const tfidfTitles = await getTFIDFRecommendations(queryTitle, 12);
            const resolved = await resolveTFIDFTitles(tfidfTitles);
            if (!cancelled && resolved.length > 0) setTfidfMovies(resolved);
          }

          if (bundle.genre_recommendations) {
            setGenreMovies(bundle.genre_recommendations);
          }
        }
      } catch (bundleErr) {
        console.error('Bundle failed:', bundleErr);
        try {
          const fallback = await getGenreRecommendations(id, 18);
          if (!cancelled) {
            setGenreMovies(Array.isArray(fallback) ? fallback : []);
          }
        } catch (genreErr) {
          console.error('Genre fallback also failed:', genreErr);
        }

        try {
          const tfidfTitles = await getTFIDFRecommendations(queryTitle, 12);
          const resolved = await resolveTFIDFTitles(tfidfTitles);
          if (!cancelled && resolved.length > 0) setTfidfMovies(resolved);
        } catch (tfidfErr) {
          console.error('TFIDF fallback failed:', tfidfErr);
        }
      }

      if (!cancelled) setRecsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="detail-loading container">
        <div className="detail-skeleton">
          <div className="skeleton-backdrop" />
          <div className="skeleton-body">
            <div className="skeleton-poster" />
            <div className="skeleton-text">
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-30" />
              <div className="skeleton-line w-90" />
              <div className="skeleton-line w-100" />
              <div className="skeleton-line w-80" />
            </div>
          </div>
        </div>

        <style>{`
          .detail-skeleton {
            padding: 24px 0;
          }
          .skeleton-backdrop {
            height: 300px;
            border-radius: var(--radius-lg);
            background: linear-gradient(90deg, var(--bg-card) 0%, var(--bg-elevated) 50%, var(--bg-card) 100%);
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
            margin-bottom: 32px;
          }
          .skeleton-body {
            display: flex;
            gap: 32px;
          }
          .skeleton-poster {
            width: 300px;
            aspect-ratio: 2/3;
            flex-shrink: 0;
            border-radius: var(--radius-md);
            background: linear-gradient(90deg, var(--bg-card) 0%, var(--bg-elevated) 50%, var(--bg-card) 100%);
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
          }
          .skeleton-text {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .skeleton-line {
            height: 18px;
            border-radius: 6px;
            background: linear-gradient(90deg, var(--bg-card) 0%, var(--bg-elevated) 50%, var(--bg-card) 100%);
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
          }
          .w-60 { width: 60%; }
          .w-30 { width: 30%; }
          .w-90 { width: 90%; }
          .w-100 { width: 100%; }
          .w-80 { width: 80%; }

          @media (max-width: 768px) {
            .skeleton-body { flex-direction: column; }
            .skeleton-poster { width: 200px; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-error container">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2>Movie not found</h2>
        <p>{error}</p>
        <Link to="/" className="back-home-btn">Back to Home</Link>

        <style>{`
          .detail-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 80px 20px;
            text-align: center;
          }
          .detail-error h2 {
            font-size: 1.5rem;
          }
          .detail-error p {
            color: var(--text-muted);
            font-size: 0.95rem;
          }
          .back-home-btn {
            margin-top: 8px;
            padding: 10px 28px;
            background: var(--accent);
            color: white;
            border-radius: 999px;
            font-weight: 600;
            font-size: 0.95rem;
            transition: var(--transition);
          }
          .back-home-btn:hover {
            background: var(--accent-light);
            transform: translateY(-2px);
          }
        `}</style>
      </div>
    );
  }

  if (!movie) return null;

  const backdropUrl = backdropSrc(movie.backdrop_url || movie.backdrop_path);
  const posterUrl = posterSrc(movie.poster_url || movie.poster_path);
  const year = (movie.release_date || '').slice(0, 4);
  const genres = movie.genres || [];
  const posterFallback = buildFallbackUrl(movie.title, year, movie.vote_average);
  const showBackdrop = backdropUrl && !backdropFailed;

  return (
    <div className="detail-page">
      <div className={`detail-backdrop ${!showBackdrop ? 'backdrop-fallback' : ''}`}>
        {showBackdrop ? (
          <img src={backdropUrl} alt="" onError={() => setBackdropFailed(true)} />
        ) : (
          <div className="backdrop-gradient" />
        )}
        <div className="backdrop-overlay" />
      </div>

      <div className="container detail-content">
        <div className="detail-main">
          <div className="detail-poster-col">
            <img
              className="detail-poster"
              src={posterUrl || posterFallback}
              alt={`${movie.title} poster`}
              onError={(e) => {
                if (e.target.src !== posterFallback) {
                  e.target.src = posterFallback;
                }
              }}
            />
          </div>

          <div className="detail-info-col">
            <div className="detail-breadcrumb">
              <Link to="/">Home</Link>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              <span>{movie.title}</span>
            </div>

            <h1 className="detail-title">{movie.title}</h1>

            <div className="detail-meta">
              {year && <span className="detail-year">{year}</span>}
              {genres.map((g) => (
                <span key={g.id || g.name} className="detail-genre">{g.name}</span>
              ))}
            </div>

            {movie.overview && (
              <div className="detail-overview">
                <h3>Overview</h3>
                <p>{movie.overview}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        <MovieGrid
          movies={tfidfMovies}
          loading={recsLoading}
          title="Similar Movies (AI-Based)"
          emptyMessage="No similar movies found."
        />

        <MovieGrid
          movies={genreMovies}
          loading={false}
          title="More Like This (Genre)"
          emptyMessage="No genre recommendations available."
        />
      </div>

      <style>{`
        .detail-page {
          animation: fadeIn 0.4s ease;
        }

        .detail-backdrop {
          position: relative;
          height: 420px;
          overflow: hidden;
        }

        .detail-backdrop img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .detail-backdrop.backdrop-fallback {
          background: var(--bg-primary);
        }

        .backdrop-gradient {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #1a1a2e 100%);
        }

        .backdrop-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 0%, var(--bg-primary) 100%);
        }

        .detail-content {
          margin-top: -140px;
          position: relative;
          z-index: 2;
        }

        .detail-main {
          display: flex;
          gap: 36px;
          align-items: flex-start;
        }

        .detail-poster-col {
          flex-shrink: 0;
          width: 300px;
        }

        .detail-poster {
          width: 100%;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
        }

        .detail-info-col {
          flex: 1;
          padding-top: 120px;
        }

        .detail-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .detail-breadcrumb a {
          color: var(--text-secondary);
          transition: var(--transition);
        }

        .detail-breadcrumb a:hover {
          color: var(--accent-light);
        }

        .detail-title {
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 12px;
        }

        .detail-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .detail-year {
          padding: 4px 12px;
          background: var(--bg-card);
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .detail-genre {
          padding: 4px 12px;
          background: rgba(124, 58, 237, 0.15);
          color: var(--accent-light);
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .detail-overview {
          max-width: 700px;
        }

        .detail-overview h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-secondary);
        }

        .detail-overview p {
          font-size: 1rem;
          line-height: 1.75;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .detail-backdrop { height: 240px; }
          .detail-content { margin-top: -80px; }
          .detail-main { flex-direction: column; align-items: center; }
          .detail-poster-col { width: 200px; }
          .detail-info-col { padding-top: 0; text-align: center; }
          .detail-meta { justify-content: center; }
          .detail-overview { text-align: left; }
        }
      `}</style>
    </div>
  );
}
