export default function Loader({ count = 12 }) {
  return (
    <div className="loader-grid container">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="loader-card" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="loader-poster" />
          <div className="loader-info">
            <div className="loader-line w-70" />
            <div className="loader-line w-40" />
          </div>
        </div>
      ))}

      <style>{`
        .loader-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
          padding: 40px 0;
        }

        .loader-card {
          animation: pulse 1.5s ease-in-out infinite;
          animation-delay: inherit;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--bg-card);
        }

        .loader-poster {
          aspect-ratio: 2 / 3;
          background: linear-gradient(90deg, var(--bg-card) 0%, var(--bg-elevated) 50%, var(--bg-card) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .loader-info {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .loader-line {
          height: 14px;
          border-radius: 4px;
          background: linear-gradient(90deg, var(--bg-card) 0%, var(--bg-elevated) 50%, var(--bg-card) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .w-70 { width: 70%; }
        .w-40 { width: 40%; }

        @media (max-width: 768px) {
          .loader-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 14px;
          }
        }

        @media (max-width: 480px) {
          .loader-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}
