import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import stocks, predict, compare, watchlist, history, admin
from ml.config import SYMBOLS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("stockvision")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="StockVision – Stock Market Prediction Using Deep Learning Techniques (LSTM, GRU, 1D CNN)",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(stocks.router)
app.include_router(predict.router)
app.include_router(compare.router)
app.include_router(watchlist.router)
app.include_router(history.router)
app.include_router(admin.router)

@app.get("/", tags=["health"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "disclaimer": "Experimental forecasts for educational use, not investment advice."
    }

@app.get("/health", tags=["health"])
def health():
    # Check saved models directory
    models_dir = settings.SAVED_MODELS_DIR
    available_stocks = []
    if models_dir.exists():
        for item in models_dir.iterdir():
            if item.is_dir() and (item / "scaler.joblib").exists():
                models = [f.stem for f in item.glob("*.keras")]
                available_stocks.append({"symbol": item.name, "models": models})

    return {
        "status": "healthy",
        "configured_symbols": SYMBOLS,
        "pretrained_stocks": available_stocks
    }

