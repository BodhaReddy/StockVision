import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "StockVision API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Supabase (configured via .env)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    
    # Model storage directory
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    SAVED_MODELS_DIR: Path = BASE_DIR / "ml" / "saved_models"
    
    # Cache settings
    CACHE_TTL_HISTORY_SECONDS: int = 300  # 5 minutes
    CACHE_TTL_SEARCH_SECONDS: int = 3600  # 1 hour
    CACHE_MAXSIZE: int = 128

settings = Settings()

