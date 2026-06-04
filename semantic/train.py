"""
Embedding generation + FAISS indexing script.
Run once to generate all data files needed by the semantic recommendation pipeline.

Usage: python semantic/train.py
"""

import os
import pickle
import sys

import numpy as np
import pandas as pd

# Add project root to path so we can import df.pkl
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    os.makedirs(data_dir, exist_ok=True)

    df_path = os.path.join(base_dir, "..", "df.pkl")
    if not os.path.exists(df_path):
        print(f"ERROR: {df_path} not found. Run the notebook first to generate it.")
        sys.exit(1)

    print("Loading df.pkl...")
    df = pd.read_pickle(df_path)
    print(f"Loaded {len(df)} movies")

    # Build combined text for each movie
    print("Building semantic text fields...")
    texts = []
    for _, row in df.iterrows():
        parts = []
        title = row.get("title")
        if title and str(title) != "nan":
            parts.append(str(title))
        overview = row.get("overview")
        if overview and str(overview) != "nan":
            parts.append(str(overview))
        genres = row.get("genres")
        if genres and str(genres) != "nan":
            parts.append(str(genres))
        tagline = row.get("tagline")
        if tagline and str(tagline) != "nan":
            parts.append(str(tagline))
        texts.append(" ".join(parts))

    print(f"Sample text: {texts[0][:200]}...")

    # Generate embeddings
    print("Loading SentenceTransformer model (all-MiniLM-L6-v2)...")
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Generating embeddings (this may take a few minutes)...")
    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        batch_size=64,
        normalize_embeddings=True,
    )
    embeddings = np.array(embeddings).astype(np.float32)
    print(f"Embedding shape: {embeddings.shape}")

    # Build FAISS index
    print("Building FAISS index...")
    import faiss

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    print(f"Index size: {index.ntotal} vectors")

    # Save metadata: title lookups
    title_to_id = {}
    meta = {}
    for i, (_, row) in enumerate(df.iterrows()):
        t = str(row.get("title", "")).strip().lower()
        if t:
            title_to_id[t] = i
        meta[i] = {
            "title": str(row.get("title", "")),
            "overview": str(row.get("overview", "")) if pd.notna(row.get("overview")) else "",
            "genres": str(row.get("genres", "")) if pd.notna(row.get("genres")) else "",
            "tagline": str(row.get("tagline", "")) if pd.notna(row.get("tagline")) else "",
            "vote_average": float(row.get("vote_average", 0)) if pd.notna(row.get("vote_average")) else 0.0,
            "popularity": float(row.get("popularity", 0)) if pd.notna(row.get("popularity")) else 0.0,
        }

    # Write all files
    np.save(os.path.join(data_dir, "embeddings.npy"), embeddings)
    faiss.write_index(index, os.path.join(data_dir, "faiss.index"))

    with open(os.path.join(data_dir, "movies_meta.pkl"), "wb") as f:
        pickle.dump(meta, f)

    with open(os.path.join(data_dir, "title_to_id.pkl"), "wb") as f:
        pickle.dump(title_to_id, f)

    print(f"\nDone! Files saved to {data_dir}/")
    print(f"  embeddings.npy  — {embeddings.shape}")
    print(f"  faiss.index     — {index.ntotal} vectors")
    print(f"  movies_meta.pkl — {len(meta)} entries")
    print(f"  title_to_id.pkl — {len(title_to_id)} titles")


if __name__ == "__main__":
    main()
