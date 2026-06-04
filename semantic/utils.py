"""
TMDB enrichment for semantic recommendation results.
Reuses existing TMDB functions from main.py.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Imported lazily to avoid circular imports at module level
_tmdb_helpers = None


def _get_tmdb_helpers():
    global _tmdb_helpers
    if _tmdb_helpers is None:
        try:
            from main import (
                TMDB_AVAILABLE,
                attach_tmdb_card_by_title,
                tmdb_movie_details,
                make_img_url,
                _get_poster_url,
            )

            _tmdb_helpers = {
                "TMDB_AVAILABLE": TMDB_AVAILABLE,
                "attach_tmdb_card_by_title": attach_tmdb_card_by_title,
                "tmdb_movie_details": tmdb_movie_details,
                "make_img_url": make_img_url,
                "_get_poster_url": _get_poster_url,
            }
        except ImportError as e:
            logger.warning(f"Could not import TMDB helpers: {e}")
            _tmdb_helpers = {}
    return _tmdb_helpers


async def enrich_with_tmdb(results: list) -> list:
    """
    Enrich each semantic search result with TMDB metadata (poster, backdrop, rating, etc.)
    Limits concurrent TMDB calls to avoid rate limiting, and falls back to local poster
    mapping for any items still missing poster_url.
    """
    helpers = _get_tmdb_helpers()

    if helpers.get("TMDB_AVAILABLE"):
        import asyncio

        sem = asyncio.Semaphore(5)

        async def _enrich_one(item: dict) -> dict:
            async with sem:
                try:
                    card = await helpers["attach_tmdb_card_by_title"](item["title"])
                    if card:
                        details = await helpers["tmdb_movie_details"](card.tmdb_id)
                        item["poster_url"] = details.poster_url or card.poster_url
                        item["backdrop_url"] = details.backdrop_url
                        item["release_date"] = details.release_date
                        item["vote_average"] = details.vote_average or card.vote_average
                        item["overview"] = details.overview or item.get("overview", "")
                        if details.genres:
                            item["genres"] = ", ".join(g["name"] for g in details.genres)
                        item["tmdb_id"] = details.tmdb_id
                except Exception as e:
                    logger.warning(f"TMDB enrichment failed for '{item.get('title')}': {e}")
            return item

        tasks = [_enrich_one(r) for r in results]
        results = await asyncio.gather(*tasks)

    # Apply local poster fallback for any items still missing poster_url
    _get_poster_url = helpers.get("_get_poster_url")
    if _get_poster_url:
        for item in results:
            if not item.get("poster_url"):
                title = item.get("title", "")
                release = item.get("release_date") or ""
                year = release[:4] if release else ""
                rating = str(item.get("vote_average") or "")
                item["poster_url"] = _get_poster_url(title, year, rating)

    return results
