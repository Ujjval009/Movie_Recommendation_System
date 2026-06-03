import os
import pickle
import hashlib
from typing import Optional, List, Dict, Any, Tuple

import numpy as np
import pandas as pd
import httpx
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv


# =========================
# ENV
# =========================
load_dotenv()
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMG_500 = "https://image.tmdb.org/t/p/w500"


# =========================
# FASTAPI APP
# =========================
app = FastAPI(title="Movie Recommender API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# PICKLE GLOBALS
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DF_PATH = os.path.join(BASE_DIR, "df.pkl")
INDICES_PATH = os.path.join(BASE_DIR, "indices.pkl")
TFIDF_MATRIX_PATH = os.path.join(BASE_DIR, "tfidf_matrix.pkl")
TFIDF_PATH = os.path.join(BASE_DIR, "tfidf.pkl")
CSV_PATH = os.path.join(BASE_DIR, "Data", "movies_metadata.csv")

df: Optional[pd.DataFrame] = None
indices_obj: Any = None
tfidf_matrix: Any = None
tfidf_obj: Any = None

TITLE_TO_IDX: Optional[Dict[str, int]] = None
TITLE_TO_POSTER: Dict[str, str] = {}
TMDB_AVAILABLE: bool = False
FAKE_ID_OFFSET: int = 1_000_000
FAKE_ID_TO_TITLE: Dict[int, str] = {}


# =========================
# MODELS
# =========================
class TMDBMovieCard(BaseModel):
    tmdb_id: int
    title: str
    poster_url: Optional[str] = None
    release_date: Optional[str] = None
    vote_average: Optional[float] = None


class TMDBMovieDetails(BaseModel):
    tmdb_id: int
    title: str
    overview: Optional[str] = None
    release_date: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    genres: List[dict] = []


class TFIDFRecItem(BaseModel):
    title: str
    score: float
    tmdb: Optional[TMDBMovieCard] = None


class SearchBundleResponse(BaseModel):
    query: str
    movie_details: TMDBMovieDetails
    tfidf_recommendations: List[TFIDFRecItem]
    genre_recommendations: List[TMDBMovieCard]


# =========================
# UTILS
# =========================
def _norm_title(t: str) -> str:
    return str(t).strip().lower()


def make_img_url(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    return f"{TMDB_IMG_500}{path}"


def _get_poster_url(title: str) -> Optional[str]:
    key = _norm_title(title)
    pp = TITLE_TO_POSTER.get(key)
    if pp:
        return f"{TMDB_IMG_500}{pp}"
    pp = TITLE_TO_POSTER.get(key.replace(" ", ""))
    if pp:
        return f"{TMDB_IMG_500}{pp}"
    safe = title.replace(" ", "%20")[:80]
    return f"/poster/{safe}"


def _get_backdrop_url(title: str) -> Optional[str]:
    key = _norm_title(title)
    pp = TITLE_TO_POSTER.get(key)
    if pp:
        return f"https://image.tmdb.org/t/p/w1280{pp}"
    pp = TITLE_TO_POSTER.get(key.replace(" ", ""))
    if pp:
        return f"https://image.tmdb.org/t/p/w1280{pp}"
    return None


async def tmdb_get(path: str, params: Dict[str, Any]) -> Dict[str, Any]:
    q = dict(params)
    q["api_key"] = TMDB_API_KEY

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{TMDB_BASE}{path}", params=q)
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"TMDB request error: {type(e).__name__} | {repr(e)}",
        )

    if r.status_code != 200:
        raise HTTPException(
            status_code=502, detail=f"TMDB error {r.status_code}: {r.text}"
        )

    return r.json()


async def tmdb_get_or_none(path: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        return await tmdb_get(path, params)
    except HTTPException:
        return None


async def tmdb_cards_from_results(
    results: List[dict], limit: int = 20
) -> List[TMDBMovieCard]:
    out: List[TMDBMovieCard] = []
    for m in (results or [])[:limit]:
        out.append(
            TMDBMovieCard(
                tmdb_id=int(m["id"]),
                title=m.get("title") or m.get("name") or "",
                poster_url=make_img_url(m.get("poster_path")),
                release_date=m.get("release_date"),
                vote_average=m.get("vote_average"),
            )
        )
    return out


async def tmdb_movie_details(movie_id: int) -> TMDBMovieDetails:
    data = await tmdb_get(f"/movie/{movie_id}", {"language": "en-US"})
    return TMDBMovieDetails(
        tmdb_id=int(data["id"]),
        title=data.get("title") or "",
        overview=data.get("overview"),
        release_date=data.get("release_date"),
        poster_url=make_img_url(data.get("poster_path")),
        backdrop_url=make_img_url(data.get("backdrop_path")),
        genres=data.get("genres", []) or [],
    )


async def tmdb_search_movies(query: str, page: int = 1) -> Dict[str, Any]:
    return await tmdb_get(
        "/search/movie",
        {
            "query": query,
            "include_adult": "false",
            "language": "en-US",
            "page": page,
        },
    )


async def tmdb_search_first(query: str) -> Optional[dict]:
    data = await tmdb_search_movies(query=query, page=1)
    results = data.get("results", [])
    return results[0] if results else None


def _load_poster_mapping():
    global TITLE_TO_POSTER
    try:
        csv_df = pd.read_csv(CSV_PATH, low_memory=False, usecols=["title", "poster_path"])
        count = 0
        for _, row in csv_df.iterrows():
            title = str(row.get("title", "")).strip().lower()
            pp = row.get("poster_path")
            if title and pp and str(pp) != "nan":
                TITLE_TO_POSTER[title] = str(pp)
                count += 1
        print(f"Poster mapping: {count} titles loaded")
    except Exception as e:
        print(f"Poster mapping failed: {e}")


# =========================
# LOCAL (NO-TMDB) FALLBACK HELPERS
# =========================

def _df_row_to_card(idx: int) -> Optional[TMDBMovieCard]:
    global df
    if df is None or idx < 0 or idx >= len(df):
        return None
    try:
        row = df.iloc[idx]
        title = str(row.get("title", ""))
        fake_id = FAKE_ID_OFFSET + idx
        vote = row.get("vote_average")
        if vote is not None:
            try:
                vote = float(vote)
            except (ValueError, TypeError):
                vote = None
        return TMDBMovieCard(
            tmdb_id=fake_id,
            title=title,
            poster_url=_get_poster_url(title),
            release_date=None,
            vote_average=vote,
        )
    except Exception:
        return None


def _df_row_to_details(idx: int) -> Optional[TMDBMovieDetails]:
    global df
    if df is None or idx < 0 or idx >= len(df):
        return None
    try:
        row = df.iloc[idx]
        title = str(row.get("title", ""))
        genres_str = str(row.get("genres", ""))
        raw_genres = genres_str.split()
        genre_list = []
        i = 0
        while i < len(raw_genres) and len(genre_list) < 5:
            name = raw_genres[i].strip()
            if name:
                genre_list.append({"id": hash(name) % 10000, "name": name})
            i += 1
        return TMDBMovieDetails(
            tmdb_id=FAKE_ID_OFFSET + idx,
            title=title,
            overview=str(row.get("overview", "")) or None,
            release_date=None,
            poster_url=_get_poster_url(title),
            backdrop_url=_get_backdrop_url(title),
            genres=genre_list,
        )
    except Exception:
        return None


def _search_local_df(query: str, limit: int = 20) -> List[dict]:
    global df
    if df is None:
        return []
    q = query.strip().lower()
    if not q:
        return []
    matches = df[df["title"].str.lower().str.contains(q, na=False)]
    matches = matches.head(limit).copy()
    matches["_idx"] = matches.index
    return matches.to_dict("records")


def _get_local_category(category: str, limit: int = 24) -> List[TMDBMovieCard]:
    global df
    if df is None:
        return []
    sorted_df = df.copy()
    sorted_df["_pop"] = pd.to_numeric(sorted_df["popularity"], errors="coerce").fillna(0)

    if category == "popular":
        top = sorted_df.sort_values("_pop", ascending=False).head(limit)
    elif category == "top_rated":
        min_votes = sorted_df["_pop"].quantile(0.5)
        filtered = sorted_df[sorted_df["_pop"] >= min_votes]
        top = filtered.sort_values("vote_average", ascending=False).head(limit)
    elif category == "trending":
        cutoff = sorted_df["_pop"].quantile(0.7)
        high_pop = sorted_df[sorted_df["_pop"] >= cutoff]
        top = high_pop.sort_values("vote_average", ascending=False).head(limit)
    elif category == "now_playing":
        cutoff = sorted_df["_pop"].quantile(0.6)
        high_pop = sorted_df[sorted_df["_pop"] >= cutoff]
        top = high_pop.sort_values("vote_average", ascending=False).head(limit)
    elif category == "upcoming":
        top = sorted_df[sorted_df["_pop"] < sorted_df["_pop"].median()]
        top = top.sort_values("vote_average", ascending=False).head(limit)
    else:
        top = sorted_df.sort_values("_pop", ascending=False).head(limit)

    cards = []
    for idx in top.index:
        card = _df_row_to_card(idx)
        if card:
            cards.append(card)
    return cards


def _get_top_local_movies(limit: int = 24) -> List[TMDBMovieCard]:
    return _get_local_category("popular", limit)


def _get_local_tfidf_cards(titles: List[Tuple[str, float]]) -> List[TFIDFRecItem]:
    global df, TITLE_TO_IDX
    items: List[TFIDFRecItem] = []
    for title, score in titles:
        card = _df_row_to_card(TITLE_TO_IDX.get(_norm_title(title), 0)) if TITLE_TO_IDX else None
        items.append(TFIDFRecItem(title=title, score=score, tmdb=card))
    return items


# =========================
# TF-IDF Helpers
# =========================
def build_title_to_idx_map(indices: Any) -> Dict[str, int]:
    title_to_idx: Dict[str, int] = {}
    if isinstance(indices, dict):
        for k, v in indices.items():
            title_to_idx[_norm_title(k)] = int(v)
        return title_to_idx
    try:
        for k, v in indices.items():
            title_to_idx[_norm_title(k)] = int(v)
        return title_to_idx
    except Exception:
        raise RuntimeError(
            "indices.pkl must be dict or pandas Series-like (with .items())"
        )


def get_local_idx_by_title(title: str) -> int:
    global TITLE_TO_IDX
    if TITLE_TO_IDX is None:
        raise HTTPException(status_code=500, detail="TF-IDF index map not initialized")
    key = _norm_title(title)
    if key in TITLE_TO_IDX:
        return int(TITLE_TO_IDX[key])
    raise HTTPException(
        status_code=404, detail=f"Title not found in local dataset: '{title}'"
    )


def tfidf_recommend_titles(
    query_title: str, top_n: int = 12
) -> List[Tuple[str, float]]:
    global df, tfidf_matrix
    if df is None or tfidf_matrix is None:
        raise HTTPException(status_code=500, detail="TF-IDF resources not loaded")

    idx = get_local_idx_by_title(query_title)
    query_genres = set(str(df.iloc[int(idx)].get("genres", "")).lower().split())

    qv = tfidf_matrix[idx]
    scores = (tfidf_matrix @ qv.T).toarray().ravel()
    order = np.argsort(-scores)

    same_genre: List[Tuple[str, float]] = []
    other: List[Tuple[str, float]] = []
    seen = set()

    for i in order:
        ii = int(i)
        if ii == int(idx):
            continue
        try:
            title_i = str(df.iloc[ii]["title"])
        except Exception:
            continue
        if title_i.lower() in seen:
            continue
        seen.add(title_i.lower())

        candidate_genres = set(str(df.iloc[ii].get("genres", "")).lower().split())
        overlap = len(query_genres & candidate_genres)
        score = float(scores[ii])
        if overlap > 0:
            same_genre.append((title_i, score + 0.15 * overlap))
        else:
            other.append((title_i, score))

        if len(same_genre) + len(other) >= top_n * 3:
            break

    same_genre.sort(key=lambda x: -x[1])
    other.sort(key=lambda x: -x[1])

    out = same_genre + other
    return out[:top_n]


async def attach_tmdb_card_by_title(title: str) -> Optional[TMDBMovieCard]:
    if not TMDB_AVAILABLE:
        return None
    try:
        m = await tmdb_search_first(title)
        if not m:
            return None
        return TMDBMovieCard(
            tmdb_id=int(m["id"]),
            title=m.get("title") or title,
            poster_url=make_img_url(m.get("poster_path")),
            release_date=m.get("release_date"),
            vote_average=m.get("vote_average"),
        )
    except Exception:
        return None


# =========================
# STARTUP
# =========================
@app.on_event("startup")
async def load_pickles():
    global df, indices_obj, tfidf_matrix, tfidf_obj, TITLE_TO_IDX, TMDB_AVAILABLE, FAKE_ID_TO_TITLE

    with open(DF_PATH, "rb") as f:
        df = pickle.load(f)

    with open(INDICES_PATH, "rb") as f:
        indices_obj = pickle.load(f)

    with open(TFIDF_MATRIX_PATH, "rb") as f:
        tfidf_matrix = pickle.load(f)

    with open(TFIDF_PATH, "rb") as f:
        tfidf_obj = pickle.load(f)

    TITLE_TO_IDX = build_title_to_idx_map(indices_obj)

    for title_key, idx in TITLE_TO_IDX.items():
        FAKE_ID_TO_TITLE[FAKE_ID_OFFSET + idx] = title_key

    if df is None or "title" not in df.columns:
        raise RuntimeError("df.pkl must contain a DataFrame with a 'title' column")

    _load_poster_mapping()

    try:
        await tmdb_get("/trending/movie/day", {"language": "en-US"})
        TMDB_AVAILABLE = True
        print("TMDB: connected")
    except Exception:
        TMDB_AVAILABLE = False
        print("TMDB: unreachable — running in local-only mode")


# =========================
# ROUTES
# =========================

POSTER_SVG_CACHE: Dict[str, str] = {}

def _build_poster_svg(title: str) -> str:
    if title in POSTER_SVG_CACHE:
        return POSTER_SVG_CACHE[title]
    safe_title = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    initial = safe_title[0] if safe_title else "?"
    lines = []
    words = safe_title.split()
    current = ""
    for w in words:
        test = (current + " " + w).strip()
        if len(test) <= 18:
            current = test
        else:
            lines.append(current)
            current = w
    if current:
        lines.append(current)
    wrapped = "\n".join(lines)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" style="stop-color:#1a1a2e"/><stop offset="100%" style="stop-color:#2d1b69"/>
</linearGradient></defs>
<rect fill="url(#g)" width="400" height="600"/>
<rect x="20" y="20" width="360" height="560" rx="12" fill="none" stroke="#7c3aed" stroke-width="1.5" stroke-opacity="0.3"/>
<text x="200" y="220" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="100" font-weight="700" fill="#7c3aed" opacity="0.9">{initial}</text>
<text x="200" y="350" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="600" fill="#c4b5fd" text-anchor="middle">{wrapped}</text>
<circle cx="200" cy="490" r="24" fill="none" stroke="#7c3aed" stroke-width="2" opacity="0.4"/>
<polygon points="192,480 192,500 208,490" fill="#7c3aed" opacity="0.4"/>
</svg>'''
    POSTER_SVG_CACHE[title] = svg
    return svg


@app.get("/poster/{title:path}")
async def poster_placeholder(title: str):
    svg = _build_poster_svg(title)
    return Response(content=svg, media_type="image/svg+xml")


@app.get("/health")
def health():
    return {"status": "ok", "tmdb_available": TMDB_AVAILABLE, "local_movies": len(df) if df is not None else 0}


# ---------- HOME FEED ----------
@app.get("/home", response_model=List[TMDBMovieCard])
async def home(
    category: str = Query("popular"),
    limit: int = Query(24, ge=1, le=50),
):
    if not TMDB_AVAILABLE:
        return _get_local_category(category, limit)

    try:
        if category == "trending":
            data = await tmdb_get("/trending/movie/day", {"language": "en-US"})
            return await tmdb_cards_from_results(data.get("results", []), limit=limit)

        if category not in {"popular", "top_rated", "upcoming", "now_playing"}:
            raise HTTPException(status_code=400, detail="Invalid category")

        data = await tmdb_get(f"/movie/{category}", {"language": "en-US", "page": 1})
        return await tmdb_cards_from_results(data.get("results", []), limit=limit)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Home route failed: {e}")


# ---------- TMDB KEYWORD SEARCH ----------
@app.get("/tmdb/search")
async def tmdb_search(
    query: str = Query(..., min_length=1),
    page: int = Query(1, ge=1, le=10),
):
    if not TMDB_AVAILABLE:
        rows = _search_local_df(query, limit=20)
        results = []
        for row in rows:
            idx = row.get("_idx")
            if idx is None:
                continue
            results.append({
                "id": FAKE_ID_OFFSET + idx,
                "title": row.get("title", ""),
                "poster_path": None,
                "release_date": None,
                "vote_average": row.get("vote_average"),
                "overview": row.get("overview", ""),
            })
        return {
            "page": 1,
            "results": results,
            "total_pages": 1,
            "total_results": len(results),
        }

    return await tmdb_search_movies(query=query, page=page)


# ---------- MOVIE DETAILS ----------
@app.get("/movie/id/{tmdb_id}", response_model=TMDBMovieDetails)
async def movie_details_route(tmdb_id: int):
    if TMDB_AVAILABLE:
        try:
            return await tmdb_movie_details(tmdb_id)
        except HTTPException:
            pass

    local_idx = tmdb_id - FAKE_ID_OFFSET
    details = _df_row_to_details(local_idx)
    if details:
        return details

    title = FAKE_ID_TO_TITLE.get(tmdb_id)
    if title:
        idx = TITLE_TO_IDX.get(title) if TITLE_TO_IDX else None
        if idx is not None:
            details = _df_row_to_details(idx)
            if details:
                return details

    raise HTTPException(status_code=404, detail=f"Movie not found (id={tmdb_id})")


# ---------- GENRE RECOMMENDATIONS ----------
@app.get("/recommend/genre", response_model=List[TMDBMovieCard])
async def recommend_genre(
    tmdb_id: int = Query(...),
    limit: int = Query(18, ge=1, le=50),
):
    if TMDB_AVAILABLE:
        try:
            details = await tmdb_movie_details(tmdb_id)
            if not details.genres:
                return []
            genre_id = details.genres[0]["id"]
            discover = await tmdb_get(
                "/discover/movie",
                {
                    "with_genres": genre_id,
                    "language": "en-US",
                    "sort_by": "popularity.desc",
                    "page": 1,
                },
            )
            cards = await tmdb_cards_from_results(discover.get("results", []), limit=limit)
            return [c for c in cards if c.tmdb_id != tmdb_id]
        except HTTPException:
            pass

    local_idx = tmdb_id - FAKE_ID_OFFSET
    if df is not None and 0 <= local_idx < len(df):
        row = df.iloc[local_idx]
        genres_str = str(row.get("genres", ""))
        first_genre = genres_str.split()[0] if genres_str.split() else None
        if first_genre:
            matches = df[df["genres"].str.contains(first_genre, na=False, case=False)]
            matches = matches[matches.index != local_idx]
            matches = matches.head(limit)
            cards = []
            for idx in matches.index:
                card = _df_row_to_card(idx)
                if card:
                    cards.append(card)
            return cards

    if TMDB_AVAILABLE:
        _top = _get_top_local_movies(limit)
        return _top

    return []


# ---------- TF-IDF ONLY ----------
@app.get("/recommend/tfidf")
async def recommend_tfidf(
    title: str = Query(..., min_length=1),
    top_n: int = Query(10, ge=1, le=50),
):
    recs = tfidf_recommend_titles(title, top_n=top_n)
    return [{"title": t, "score": s} for t, s in recs]


# ---------- BUNDLE ----------
@app.get("/movie/search", response_model=SearchBundleResponse)
async def search_bundle(
    query: str = Query(..., min_length=1),
    tfidf_top_n: int = Query(12, ge=1, le=30),
    genre_limit: int = Query(12, ge=1, le=30),
):
    best: Optional[dict] = None
    tmdb_id: Optional[int] = None

    if TMDB_AVAILABLE:
        best = await tmdb_search_first(query)

    if best:
        tmdb_id = int(best["id"])
        try:
            details = await tmdb_movie_details(tmdb_id)
        except HTTPException:
            details = _find_local_details_by_title(query)
    else:
        details = _find_local_details_by_title(query)

    if details is None:
        raise HTTPException(
            status_code=404, detail=f"No movie found for query: '{query}'"
        )

    tfidf_items: List[TFIDFRecItem] = []
    recs: List[Tuple[str, float]] = []
    try:
        recs = tfidf_recommend_titles(details.title, top_n=tfidf_top_n)
    except Exception:
        try:
            recs = tfidf_recommend_titles(query, top_n=tfidf_top_n)
        except Exception:
            recs = []

    for title, score in recs:
        card = await attach_tmdb_card_by_title(title)
        if card is None and not TMDB_AVAILABLE:
            local_idx = TITLE_TO_IDX.get(_norm_title(title)) if TITLE_TO_IDX else None
            if local_idx is not None:
                card = _df_row_to_card(local_idx)
        tfidf_items.append(TFIDFRecItem(title=title, score=score, tmdb=card))

    genre_recs: List[TMDBMovieCard] = []
    if details.genres and TMDB_AVAILABLE:
        genre_id = details.genres[0]["id"]
        try:
            discover = await tmdb_get(
                "/discover/movie",
                {
                    "with_genres": genre_id,
                    "language": "en-US",
                    "sort_by": "popularity.desc",
                    "page": 1,
                },
            )
            cards = await tmdb_cards_from_results(discover.get("results", []), limit=genre_limit)
            genre_recs = [c for c in cards if c.tmdb_id != details.tmdb_id]
        except HTTPException:
            pass

    if not genre_recs and not TMDB_AVAILABLE:
        genre_recs = _get_genre_recs_from_local(details.title, genre_limit)

    return SearchBundleResponse(
        query=query,
        movie_details=details,
        tfidf_recommendations=tfidf_items,
        genre_recommendations=genre_recs,
    )


def _find_local_details_by_title(query: str) -> Optional[TMDBMovieDetails]:
    global df, TITLE_TO_IDX
    if df is None:
        return None
    q = _norm_title(query)
    if TITLE_TO_IDX and q in TITLE_TO_IDX:
        idx = TITLE_TO_IDX[q]
        return _df_row_to_details(idx)
    matches = df[df["title"].str.lower().str.contains(q, na=False)]
    if not matches.empty:
        idx = matches.index[0]
        return _df_row_to_details(idx)
    return None


def _get_genre_recs_from_local(title: str, limit: int = 12) -> List[TMDBMovieCard]:
    global df, TITLE_TO_IDX
    if df is None:
        return []
    idx = TITLE_TO_IDX.get(_norm_title(title)) if TITLE_TO_IDX else None
    if idx is None:
        return _get_top_local_movies(limit)
    row = df.iloc[idx]
    genres_str = str(row.get("genres", ""))
    first_genre = genres_str.split()[0] if genres_str.split() else None
    if not first_genre:
        return _get_top_local_movies(limit)
    matches = df[df["genres"].str.contains(first_genre, na=False, case=False)]
    matches = matches[matches.index != idx]
    matches = matches.head(limit)
    cards = []
    for i in matches.index:
        card = _df_row_to_card(i)
        if card:
            cards.append(card)
    return cards
