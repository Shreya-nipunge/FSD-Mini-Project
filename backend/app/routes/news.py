from fastapi import APIRouter, HTTPException
from ..services.news_service import get_crime_news
from typing import Dict, Any

router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("/")
def fetch_news(q: str = "crime India") -> Dict[str, Any]:
    """Fetch crime-related intelligence using regional OSINT queries."""
    try:
        news = get_crime_news(q)
        
        return {
            "status": "success",
            "message": "Intelligence feed active",
            "query": q,
            "articles": news if news else [],
            "count": len(news) if news else 0
        }

    except ValueError as e:
        # Configuration error (e.g. missing API key)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        # General network/processing error
        return {
            "status": "error",
            "message": "Unable to synchronize with live intelligence feed",
            "articles": [],
            "count": 0
        }
