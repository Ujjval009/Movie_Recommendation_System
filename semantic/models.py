from pydantic import BaseModel, Field
from typing import Optional, List


class StoryRequest(BaseModel):
    story: str = Field(..., min_length=3, max_length=5000)
    top_n: int = Field(default=12, ge=1, le=50)


class MovieRequest(BaseModel):
    title: str = Field(..., min_length=1)
    top_n: int = Field(default=12, ge=1, le=50)


class SemanticRecItem(BaseModel):
    title: str
    score: float
    overview: Optional[str] = None
    genres: Optional[str] = None
    vote_average: Optional[float] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    release_date: Optional[str] = None
    tmdb_id: Optional[int] = None


class SemanticResponse(BaseModel):
    query: str
    mode: str
    recommendations: List[SemanticRecItem]
