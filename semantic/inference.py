"""
TfidfTextRecommender — uses the existing scikit-learn TF-IDF vectorizer + matrix
to find movies matching a free-text query.  No ML model, no OOM, instant responses.
Lazily initialized on first request (imports from main.py at runtime).
"""

import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


class TfidfTextRecommender:
    def __init__(self):
        self._vectorizer = None
        self._matrix = None
        self._df = None
        self._loader()

    def _loader(self):
        # Import the already-loaded globals from main.py (avoids circular import
        # at module level; main.py already finished importing us before first request)
        logger.info("Binding TF-IDF resources from main...")
        try:
            from main import tfidf_matrix, tfidf_obj, df
            self._matrix = tfidf_matrix
            self._vectorizer = tfidf_obj
            self._df = df
        except Exception as e:
            raise RuntimeError(f"Cannot bind TF-IDF resources: {e}")

        if self._matrix is None or self._vectorizer is None:
            raise RuntimeError("TF-IDF resources not loaded (pickle files missing?)")
        logger.info(f"TF-IDF recommender ready ({self._matrix.shape[0]} movies)")

    def recommend_by_text(self, text: str, top_n: int = 12) -> list:
        qv = self._vectorizer.transform([text])
        scores = (self._matrix @ qv.T).toarray().ravel()
        order = np.argsort(-scores)
        results = []
        seen = set()
        for i in order:
            ii = int(i)
            title = str(self._df.iloc[ii].get("title", ""))
            if not title or title.lower() in seen:
                continue
            seen.add(title.lower())
            results.append(self._build_result(ii, float(scores[ii])))
            if len(results) >= top_n:
                break
        return results

    def recommend_by_movie(self, title: str, top_n: int = 12) -> list:
        """Use the existing title-based TF-IDF logic from main.py."""
        try:
            from main import tfidf_recommend_titles
            recs = tfidf_recommend_titles(title, top_n)
        except Exception as e:
            raise ValueError(f"Title-based recommendation failed: {e}")
        return [
            self._build_result(
                self._df[self._df["title"].str.lower() == t.lower()].index[0],
                s,
            )
            for t, s in recs
        ]

    def _build_result(self, idx: int, score: float) -> dict:
        row = self._df.iloc[idx]
        return {
            "movie_id": int(idx),
            "title": str(row.get("title", "")),
            "score": round(score, 4),
            "overview": str(row.get("overview", "")),
            "genres": str(row.get("genres", "")),
            "vote_average": float(row.get("vote_average", 0) or 0),
            "release_date": None,
        }
