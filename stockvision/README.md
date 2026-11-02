# StockVision – Stock Market Prediction Using Deep Learning Techniques

An educational full-stack web application for analyzing, benchmarking, and forecasting Indian National Stock Exchange (NSE) equities using Deep Learning architectures (**LSTM**, **GRU**, and **1D CNN**) with personalized **Watchlist**, **Prediction History**, and **Supabase Auth**.

---

## 🏛️ Project Architecture & Key Features

StockVision is designed as a college capstone educational application demonstrating how modern deep learning algorithms are applied to quantitative financial time-series data while adhering to rigorous machine learning practices (preventing data leakage, chronological out-of-sample testing, iterative sequence rollout, and comparing against a strict naive baseline).

### Features
1. **NSE Stock Intelligence**: Real-time search and technical analysis for **28 major Indian NSE equities** across diverse sectors (Energy, IT, Banking, FMCG, Auto, Pharma, Infrastructure, Metals, and Utilities: `RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`, `ICICIBANK.NS`, `INFY.NS`, `BHARTIARTL.NS`, `SBIN.NS`, `ITC.NS`, `HINDUNILVR.NS`, `LT.NS`, `BAJFINANCE.NS`, `KOTAKBANK.NS`, `AXISBANK.NS`, `MARUTI.NS`, `SUNPHARMA.NS`, `TITAN.NS`, `ASIANPAINT.NS`, `NTPC.NS`, `POWERGRID.NS`, `ONGC.NS`, `TATASTEEL.NS`, `M&M.NS`, `ADANIENT.NS`, `WIPRO.NS`, `COALINDIA.NS`, `HCLTECH.NS`, `BAJAJ-AUTO.NS`, `ULTRACEMCO.NS`).
2. **Historical Technical Analysis Page**:
   - Interactive Recharts Area/Line price chart with toggleable 20-day and 50-day Simple Moving Averages.
   - Volume bar chart and timeframe selector (`1M`, `3M`, `6M`, `1Y`, `5Y`).
   - Fundamental & trading metrics (Open, High, Low, Close, 52W Range, P/E Ratio, Market Cap).
   - Trend & Momentum analysis (RSI-14, MACD, annualized volatility, and automated Bullish/Bearish/Sideways classification with a plain-English explanation card).
   - Star/Bookmark button to toggle stock in/out of the user's Watchlist.
3. **Deep Learning Forecasting Page & PDF Reports**:
   - Choose between **Stacked LSTM**, **Gated Recurrent Unit (GRU)**, or **1D Temporal CNN** (`model = lstm | gru | cnn`).
   - Multi-day iterative forecasting horizon selector: **1 Day**, **5 Days**, **10 Days**, or **30 Trading Days**.
   - Displays latest settlement price, predicted price, expected variance (₹ and %), and directional movement pill (`UP` / `DOWN` / `FLAT`).
   - Multi-step forecast chart seamlessly bridging historical actuals into the iterative predictive trajectory with a 90% confidence uncertainty interval.
   - Step-by-step forecast schedule table with daily targets.
   - **Download Report (PDF)**: Instant export of an executive forecast document embedding the chart snapshot, metadata, evaluation test metrics, step schedule, and required academic disclaimer.
   - Automatically archives every forecast to the user's **Prediction History**.
4. **Volatility Analysis Page (`/volatility`)**:
   - Daily returns calculation and rolling 30-day annualized volatility trajectory (`std * sqrt(252) * 100`).
   - Automatic detection of the top discrete **Highest-Volatility Periods** / outlier risk spikes.
   - **Watchlist Volatility Comparison**: Cross-asset bar chart and comparative matrix benchmark showing peer average, least volatile (most stable) vs most volatile assets, and risk classifications (Low, Moderate, Elevated, High).
5. **Model Performance Benchmark Page**:
   - Quantitative matrix comparing **MAE**, **RMSE**, **MAPE**, and **Directional Accuracy** across all 3 deep learning models alongside the financial **Naive Baseline** ("tomorrow's close = today's close").
   - Highlights the winning architecture per metric.
   - Four dedicated comparative bar charts (MAE, RMSE, MAPE, Directional Accuracy).
   - High-resolution line chart overlaying actual vs predicted test prices for the 3 models across the 15% chronological test split.
   - Analytical takeaway note when the naive baseline minimizes one-step point error.
6. **Personal Watchlist Page (`/watchlist`)**:
   - View all saved stocks with real-time price and daily percentage change.
   - Direct shortcuts to open Technical Analysis or Deep Learning Forecasting with the stock active.
   - One-click deletion with PostgreSQL Row Level Security (RLS) isolation.
7. **Prediction History Page (`/history`)**:
   - Table of all historical model rollouts with ticker, model, horizon, base price, target price, and direction.
   - Expandable accordion displaying daily predicted steps.
   - Delete action to remove old predictions.
8. **User Profile Page (`/profile`)**:
   - Displays student user email, account ID, total saved watchlist stocks, and total forecasts generated.
   - Sign Out action.
9. **Authentication Suite (`/login` & `/register`)**:
   - Supabase Auth integration with Email and Password.
   - `ProtectedRoute` wrapper guarding all analysis, forecasting, watchlist, and history routes.
   - Instant demo access: "Student Demo" and "Admin Demo" shortcuts.
10. **Administrator Intelligence Dashboard (`/admin`)**:
    - Restricted via `is_admin` role flag (profiles table and JWT claims).
    - Hidden from non-admins in both the UI navigation and the API (returns HTTP 403 Forbidden).
    - Displays total registered users, total predictions logged, model utilization breakdown (LSTM vs GRU vs 1D CNN), most-predicted equities ranking, and dynamic inventory of pre-trained models with last-trained timestamps and weights footprint.
11. **"Why this prediction?" Interpretability Engine**:
    - Deconstructs multi-step neural forecasts into plain-English analyses of recent price momentum, moving averages alignment (SMA20 & SMA50), and volume liquidity shifts.
    - Computes permutation feature importance across the 60-day input channels (`Close`, `High`, `Low`, `Open`, `Volume`).
    - Explicitly labeled: *"Influential input features, not causes of price movement"*.

---

## 📁 Repository Structure

```
stockvision/
├── frontend/                          # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── components/                # Modular UI widgets
│   │   │   ├── Layout.tsx             # Shell with responsive Sidebar and Navbar
│   │   │   ├── Sidebar.tsx            # Navigation, pre-trained equity tags, user session
│   │   │   ├── Navbar.tsx             # Stock search, profile shortcut, theme toggle
│   │   │   ├── ProtectedRoute.tsx     # Guards private pages; redirects to /login
│   │   │   ├── WatchlistButton.tsx    # Star/Bookmark toggle button on stock pages
│   │   │   ├── StockSearch.tsx        # Search bar with debounced NSE autocomplete
│   │   │   ├── HistoricalChart.tsx    # Recharts Area & SMA20/50 & Volume chart
│   │   │   ├── TechnicalIndicators.tsx# RSI, MACD, volatility, and trend diagnosis
│   │   │   └── ForecastChart.tsx      # Seamless historical + multi-step forecast chart
│   │   ├── pages/
│   │   │   ├── HistoricalAnalysisPage.tsx # Stock technicals, price chart, and star button
│   │   │   ├── PredictionPage.tsx         # Deep learning forecast interface with PDF download
│   │   │   ├── ModelComparisonPage.tsx    # Multi-model evaluation benchmark & overlay chart
│   │   │   ├── VolatilityPage.tsx         # Rolling 30D volatility, peak periods & watchlist comparison
│   │   │   ├── WatchlistPage.tsx          # Saved stocks table, prices, and shortcuts
│   │   │   ├── HistoryPage.tsx            # Prediction logs with expandable steps
│   │   │   ├── ProfilePage.tsx            # User info, saved counters, sign out
│   │   │   ├── LoginPage.tsx              # Email/password login with demo shortcut
│   │   │   └── RegisterPage.tsx           # Account registration form
│   │   ├── context/
│   │   │   ├── AuthContext.tsx        # Supabase Auth state, session, and token handling
│   │   │   ├── ThemeContext.tsx       # Dark/Light theme toggle with persistence
│   │   │   └── StockContext.tsx       # Global active ticker state
│   │   ├── services/
│   │   │   ├── api.ts                 # Typed fetch client connecting to FastAPI with Bearer token
│   │   │   ├── pdfReport.ts           # Client-side PDF generation engine (jsPDF + autoTable + html2canvas)
│   │   │   └── supabase.ts            # Supabase Auth & Client initialization
│   │   ├── types/index.ts             # Shared TypeScript models
│   │   ├── App.tsx                    # React Router configuration & route guards
│   │   └── index.css                  # Tailwind styles and custom variables
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env.example
│   └── .env
│
├── backend/                           # Python 3.10+ FastAPI backend
│   ├── app/
│   │   ├── main.py                    # FastAPI application, CORS, router mounts
│   │   ├── config.py                  # Settings, cache TTLs, paths, Supabase env
│   │   ├── auth.py                    # Token verification & FastAPI dependencies
│   │   ├── db.py                      # Supabase client helper
│   │   ├── schemas.py                 # Pydantic v2 schemas
│   │   ├── routers/
│   │   │   ├── stocks.py              # /stocks/search, /stocks/{symbol}/history, /trend
│   │   │   ├── predict.py             # POST /predict (with automatic user history recording)
│   │   │   ├── compare.py             # GET /compare/{symbol}
│   │   │   ├── watchlist.py           # GET/POST/DELETE /watchlist
│   │   │   └── history.py             # GET/DELETE /history, GET /profile
│   │   └── services/
│   │       ├── yfinance_service.py    # Cached yfinance fetcher (OHLCV & fundamentals)
│   │       ├── indicators.py          # RSI, MACD, SMA20/50, and Volatility engine
│   │       └── prediction_service.py  # Model loader & iterative multi-step rollout
│   ├── ml/
│   │   ├── config.py                  # Centralized SYMBOLS, SEQUENCE_LENGTH, and split ratios
│   │   ├── models.py                  # Keras definitions for LSTM, GRU, 1D CNN
│   │   ├── train.py                   # Offline training script with EarlyStopping
│   │   ├── evaluate.py                # MAE, RMSE, MAPE, Directional Accuracy, Supabase upsert
│   │   └── saved_models/              # Serialized .keras weights, scalers, and metrics
│   │       ├── RELIANCE.NS/
│   │       ├── TCS.NS/
│   │       ├── INFY.NS/
│   │       ├── SBIN.NS/
│   │       └── ITC.NS/
│   ├── schema.sql                     # Supabase PostgreSQL schema with RLS
│   ├── requirements.txt               # Backend dependencies
│   ├── .env.example                   # Environment variable template
│   └── .env
└── README.md
```

---

## 🛠️ Step-by-Step Supabase Setup Guide

To connect your own remote Supabase database and enable cloud authentication:

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose an organization, enter **Name**: `StockVision`, set a database password, select your preferred region, and click **Create new project**.

### 2. Execute `schema.sql` in the SQL Editor
1. In the Supabase Dashboard left sidebar, click the **SQL Editor** icon.
2. Open the file `backend/schema.sql` from this repository.
3. Paste its entire contents into the SQL Editor and click **Run**.
4. This creates:
   - `public.profiles` table with `is_admin` role flag and user linkage.
   - `public.watchlists` table with a unique constraint on `(user_id, symbol)` and RLS policies.
   - `public.prediction_history` table with `predicted_prices JSONB` and RLS policies.
   - `public.model_performance` table with public read policy.

### 3. Verify Email Authentication is Enabled
1. In the Supabase Dashboard, navigate to **Authentication** > **Providers**.
2. Ensure **Email** is enabled (it is enabled by default).
3. *(Optional for testing)*: Under **Authentication** > **URL Configuration**, set the Site URL to `http://localhost:5173`. To allow immediate logins without waiting for email confirmation emails during local development, go to **Authentication** > **Providers** > **Email** and turn off **Confirm email**.

### 4. Copy API Keys into Environment Files
1. Navigate to **Project Settings** (gear icon) > **API**.
2. Copy your **Project URL** and **anon public key**.
3. Update `backend/.env`:
   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   # Your anon key or service role key
   SUPABASE_JWT_SECRET=your-jwt-secret-from-api-settings  # Found in Project Settings > API > JWT Secret
   ```
4. Update `frontend/.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. Restart your backend and frontend servers.

---

## 🧠 Offline Model Training & Evaluation

The API serves pre-trained neural networks and never trains on incoming web requests. To train and evaluate the deep learning models offline:

### 1. Train LSTM, GRU, and 1D CNN Models
```bash
cd stockvision/backend
source venv/bin/activate
python ml/train.py
```
This script downloads 5-year OHLCV data from yfinance for `RELIANCE.NS`, `TCS.NS`, `INFY.NS`, `SBIN.NS`, and `ITC.NS`, scales features with `MinMaxScaler` fitted exclusively on the 70% training split, and trains 3 independent architectures (LSTM, GRU, 1D CNN) with EarlyStopping. Artifacts are saved to `backend/ml/saved_models/{symbol}/`.

### 2. Evaluate Models & Generate Metrics
```bash
python ml/evaluate.py
```
This evaluates all trained models against the untouched 15% test set, computing MAE, RMSE, MAPE, Directional Accuracy, and benchmark performance against a Naive Baseline ("tomorrow's close = today's close"). Results are saved to `metrics.json` and upserted into the `model_performance` database table if Supabase is connected.

---

## 🧪 Automated Testing

StockVision includes unit and integration tests verifying chronological splits, zero data leakage, metric calculations, and technical indicator boundaries.

### Run All Tests (Root Runner):
```bash
cd /Users/charan/Stock-Prediction
npm run test
```

### Run Backend Pytest Directly:
```bash
cd stockvision/backend
PYTHONPATH=. ./venv/bin/pytest tests/ -v
```

### Run Frontend Typecheck & Build:
```bash
cd stockvision/frontend
npm run build
```

---

## 🚀 Running the Project

### Option A: From Repository Root
```bash
npm run dev
```

### Option B: Individual Services

#### Backend:
```bash
cd stockvision/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
- API Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

#### Frontend:
```bash
cd stockvision/frontend
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## ⚖️ Academic Disclaimer

> **Experimental forecasts for educational use, not investment advice.**  
> StockVision was constructed as a student educational project for exploring temporal neural network architectures applied to non-stationary financial series.
