export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <svg viewBox="0 0 100 100" width="24" height="24">
            <rect width="100" height="100" rx="20" fill="#7c3aed" />
            <polygon points="40,30 40,70 75,50" fill="white" />
          </svg>
          <span>MovieLens</span>
        </div>
        <p className="footer-text">
          Powered by TMDB &amp; AI content-based filtering
        </p>
      </div>

      <style>{`
        .footer {
          border-top: 1px solid var(--border);
          padding: 24px 0;
          margin-top: 40px;
        }

        .footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 1rem;
        }

        .footer-text {
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        @media (max-width: 480px) {
          .footer-inner {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </footer>
  );
}
