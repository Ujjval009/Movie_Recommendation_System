"""
FastAPI router for TF-IDF text-based recommendation endpoints.
Mounted at /recommend/story and /recommend/movie.
"""

import logging

from fastapi import APIRouter, HTTPException

from semantic.inference import TfidfTextRecommender
from semantic.models import StoryRequest, MovieRequest, SemanticResponse
from semantic.utils import enrich_with_tmdb

logger = logging.getLogger(__name__)

router = APIRouter(tags=["semantic"])

_recommender = None


def _get_recommender() -> TfidfTextRecommender:
    global _recommender
    if _recommender is None:
        logger.info("Initializing TfidfTextRecommender...")
        try:
            _recommender = TfidfTextRecommender()
        except Exception as e:
            logger.error(f"Failed to initialize TfidfTextRecommender: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"Recommendation engine unavailable: {e}",
            )
    return _recommender


@router.post("/recommend/story", response_model=SemanticResponse)
async def recommend_story(req: StoryRequest):
    try:
        rec = _get_recommender()
        results = rec.recommend_by_text(req.story, req.top_n)
        enriched = await enrich_with_tmdb(results)
        return SemanticResponse(query=req.story, mode="story", recommendations=enriched)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Story recommendation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Story recommendation failed: {e}")


@router.post("/recommend/movie", response_model=SemanticResponse)
async def recommend_movie(req: MovieRequest):
    try:
        rec = _get_recommender()
        results = rec.recommend_by_movie(req.title, req.top_n)
        enriched = await enrich_with_tmdb(results)
        return SemanticResponse(query=req.title, mode="movie", recommendations=enriched)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Movie recommendation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Movie recommendation failed: {e}")


@router.get("/recommend/semantic/health")
async def semantic_health():
    try:
        rec = _get_recommender()
        return {
            "status": "ok",
            "model_loaded": True,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}
