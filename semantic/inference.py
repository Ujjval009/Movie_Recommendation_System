"""
SemanticRecommender — loads SentenceTransformer model + FAISS index at runtime.
Lazily initialized on first request.
"""

import os
import pickle
import logging

import numpy as np

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


class SemanticRecommender:
    def __init__(self, data_dir: str = DATA_DIR):
        self.data_dir = data_dir
        self.model = None
        self.index = None
        self.meta = None
        self.title_to_id = None
        self.embeddings = None
        self._load()

    def _load(self):
        index_path = os.path.join(self.data_dir, "faiss.index")
        meta_path = os.path.join(self.data_dir, "movies_meta.pkl")
        title_id_path = os.path.join(self.data_dir, "title_to_id.pkl")
        emb_path = os.path.join(self.data_dir, "embeddings.npy")

        logger.info("Loading embedding model (all-MiniLM-L6-v2 via fastembed)...")
        from fastembed import TextEmbedding

        self.model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
        logger.info("Model loaded")

        logger.info("Loading FAISS index...")
        import faiss

        self.index = faiss.read_index(index_path)
        logger.info(f"FAISS index loaded: {self.index.ntotal} vectors")

        logger.info("Loading metadata...")
        with open(meta_path, "rb") as f:
            self.meta = pickle.load(f)

        with open(title_id_path, "rb") as f:
            self.title_to_id = pickle.load(f)

        self.embeddings = np.load(emb_path)
        logger.info("SemanticRecommender ready")

    def recommend_by_text(self, text: str, top_n: int = 12) -> list:
        emb = np.array(list(self.model.embed([text]))).astype(np.float32)
        distances, indices = self.index.search(emb, top_n)
        return [self._build_result(int(i), float(d)) for i, d in zip(indices[0], distances[0]) if int(i) >= 0]

    def recommend_by_movie(self, title: str, top_n: int = 12) -> list:
        movie_id = self.title_to_id.get(title.strip().lower())
        if movie_id is None:
            # try substring match
            for key, val in self.title_to_id.items():
                if title.lower() in key:
                    movie_id = val
                    break
        if movie_id is None:
            raise ValueError(f"Movie '{title}' not found in dataset")
        query_vec = self.embeddings[movie_id].reshape(1, -1).astype(np.float32)
        distances, indices = self.index.search(query_vec, top_n)
        return [self._build_result(int(i), float(d)) for i, d in zip(indices[0], distances[0]) if int(i) >= 0]

    def _build_result(self, idx: int, score: float) -> dict:
        movie = self.meta.get(idx, {})
        return {
            "movie_id": idx,
            "title": movie.get("title", "Unknown"),
            "score": round(score, 4),
            "overview": movie.get("overview", ""),
            "genres": movie.get("genres", ""),
            "vote_average": movie.get("vote_average", 0.0),
            "release_date": movie.get("release_date", None),
        }
