import { useState } from 'react';
import { getStoryRecommendations } from '../api/movieApi';
import MovieGrid from '../components/MovieGrid';

export default function SemanticPage() {
  const [story, setStory] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!story.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await getStoryRecommendations(story);
      setResults(data.recommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="semantic-page">
      <div className="semantic-hero">
        <h1 className="semantic-hero-title">Story & Mood Recommendations</h1>
        <p className="semantic-hero-sub">
          Describe your mood, thoughts, or the kind of movie you want to watch — let AI find the perfect match.
        </p>
      </div>

      <div className="container semantic-container">
        <form className="input-section" onSubmit={handleSubmit}>
          <textarea
            className="story-textarea"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Describe your mood, a scene, or the kind of movie you're looking for...&#10;&#10;e.g. I want a movie about survival in space and loneliness"
            rows={6}
          />
          <button
            type="submit"
            className="submit-btn"
            disabled={loading || story.trim().length < 3}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="btn-spinner" />
                Finding movies...
              </span>
            ) : (
              'Get Recommendations'
            )}
          </button>
        </form>

        {error && (
          <div className="semantic-error">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        <MovieGrid
          movies={results || []}
          loading={loading}
          title={results ? 'Movies matching your story' : undefined}
          emptyMessage={
            !loading && results
              ? 'No matches found. Try a different description.'
              : undefined
          }
        />
      </div>

      <style>{`
        .semantic-page {
          animation: fadeIn 0.4s ease;
        }

        .semantic-hero {
          text-align: center;
          padding: 60px 24px 40px;
          background: var(--gradient-hero);
        }

        .semantic-hero-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 10px;
          background: linear-gradient(135deg, var(--accent-light), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .semantic-hero-sub {
          color: var(--text-secondary);
          font-size: 1.05rem;
          max-width: 520px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .semantic-container {
          padding-top: 32px;
          padding-bottom: 60px;
        }

        .input-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
        }

        .story-textarea {
          width: 100%;
          padding: 16px 18px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 1rem;
          font-family: var(--font);
          line-height: 1.6;
          resize: vertical;
          min-height: 140px;
          transition: var(--transition);
        }

        .story-textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
          outline: none;
        }

        .story-textarea::placeholder {
          color: var(--text-muted);
        }

        .submit-btn {
          padding: 14px 28px;
          background: var(--accent);
          color: white;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 600;
          transition: var(--transition);
          text-align: center;
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--accent-light);
          box-shadow: 0 4px 20px var(--accent-glow);
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .semantic-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted);
        }

        .semantic-error p {
          font-size: 1rem;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .semantic-hero {
            padding: 40px 16px 28px;
          }

          .semantic-hero-title {
            font-size: 1.5rem;
          }

          .semantic-hero-sub {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
}
