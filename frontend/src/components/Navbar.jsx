import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { searchTMDB } from '../api/movieApi';

export default function Navbar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const handleClick = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchTMDB(val);
        const results = (data.results || []).slice(0, 8);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const selectSuggestion = (movie) => {
    setShowSuggestions(false);
    setQuery(movie.title);
    navigate(`/movie/${movie.id}`);
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand" onClick={() => setQuery('')}>
          <svg className="navbar-logo" viewBox="0 0 100 100" width="32" height="32">
            <rect width="100" height="100" rx="20" fill="#7c3aed" />
            <polygon points="40,30 40,70 75,50" fill="white" />
          </svg>
          <span className="brand-text">MovieLens</span>
        </Link>

        <form className="navbar-search" onSubmit={handleSubmit} role="search">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search movies..."
            value={query}
            onChange={handleInput}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            aria-label="Search movies"
            autoComplete="off"
          />
          {loading && <div className="search-spinner" />}

          {showSuggestions && (
            <div className="suggestions-dropdown" ref={suggestionsRef}>
              {suggestions.map((movie) => (
                <button
                  key={movie.id}
                  className="suggestion-item"
                  onClick={() => selectSuggestion(movie)}
                  type="button"
                >
                  {movie.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                      alt=""
                      className="suggestion-poster"
                      loading="lazy"
                    />
                  ) : (
                    <div className="suggestion-poster placeholder" />
                  )}
                  <div className="suggestion-info">
                    <span className="suggestion-title">{movie.title}</span>
                    <span className="suggestion-year">
                      {movie.release_date?.slice(0, 4) || '—'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>

        <Link to="/" className="nav-link">Home</Link>
        <Link to="/recommend" className="nav-link">Story/Mood</Link>
      </div>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          height: 72px;
          transition: var(--transition);
          background: transparent;
        }

        .navbar.scrolled {
          background: rgba(10, 10, 15, 0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }

        .navbar-inner {
          display: flex;
          align-items: center;
          height: 100%;
          gap: 24px;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .brand-text {
          font-size: 1.35rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--accent-light), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .navbar-search {
          position: relative;
          flex: 1;
          max-width: 520px;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 44px;
          padding: 0 16px 0 42px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.95rem;
          transition: var(--transition);
        }

        .search-input::placeholder {
          color: var(--text-muted);
        }

        .search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .search-spinner {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }

        .suggestions-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          animation: scaleIn 0.15s ease;
          z-index: 100;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 14px;
          transition: var(--transition);
          text-align: left;
          color: var(--text-primary);
        }

        .suggestion-item:hover {
          background: var(--bg-card-hover);
        }

        .suggestion-poster {
          width: 36px;
          height: 54px;
          border-radius: 4px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .suggestion-poster.placeholder {
          background: var(--border);
        }

        .suggestion-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .suggestion-title {
          font-size: 0.9rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .suggestion-year {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .nav-link {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: var(--transition);
          flex-shrink: 0;
          padding: 8px 0;
        }

        .nav-link:hover {
          color: var(--text-primary);
        }

        @media (max-width: 640px) {
          .brand-text { display: none; }
          .navbar-search { max-width: none; }
          .nav-link { display: none; }
        }
      `}</style>
    </nav>
  );
}
