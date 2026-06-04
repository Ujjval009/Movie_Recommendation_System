"""
FastAPI router for semantic recommendation endpoints.
Mounted at /recommend/story and /recommend/movie.
"""

import logging

from fastapi import APIRouter, HTTPException

from semantic.inference import SemanticRecommender, DATA_DIR
from semantic.models import StoryRequest, MovieRequest, SemanticResponse
from semantic.utils import enrich_with_tmdb

logger = logging.getLogger(__name__)

router = APIRouter(tags=["semantic"])

_recommender = None


def init_recommender():
    """Pre-warm the recommender singleton during app startup."""
    global _recommender
    if _recommender is None:
        logger.info("Initializing SemanticRecommender...")
        try:
            _recommender = SemanticRecommender(DATA_DIR)
        except Exception as e:
            logger.error(f"Failed to initialize SemanticRecommender: {e}")
            raise


def _get_recommender() -> SemanticRecommender:
    global _recommender
    if _recommender is None:
        logger.info("Initializing SemanticRecommender...")
        try:
            _recommender = SemanticRecommender(DATA_DIR)
        except Exception as e:
            logger.error(f"Failed to initialize SemanticRecommender: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"Semantic recommendation engine unavailable: {e}",
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
    """Check if semantic recommender is available."""
    try:
        rec = _get_recommender()
        return {
            "status": "ok",
            "index_size": rec.index.ntotal if rec.index else 0,
            "model_loaded": rec.model is not None,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}
