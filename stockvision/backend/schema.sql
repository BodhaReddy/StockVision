-- ====================================================================
-- StockVision Database Schema (Supabase / PostgreSQL)
-- Phase 4: Watchlists, Prediction History & Model Performance
-- ====================================================================

-- 1. Watchlists Table
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Enable RLS for Watchlists
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist" 
    ON public.watchlists FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlist items" 
    ON public.watchlists FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist items" 
    ON public.watchlists FOR DELETE 
    USING (auth.uid() = user_id);

-- 2. Prediction History Table
CREATE TABLE IF NOT EXISTS public.prediction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(32) NOT NULL,
    model VARCHAR(32) NOT NULL,         -- 'LSTM', 'GRU', 'CNN'
    horizon INTEGER NOT NULL,           -- 1, 5, 10, 30
    latest_price NUMERIC(12, 2) NOT NULL,
    predicted_prices JSONB NOT NULL,    -- Detailed forecast array (step, date, predicted_close, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Prediction History
ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prediction history" 
    ON public.prediction_history FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own predictions" 
    ON public.prediction_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions" 
    ON public.prediction_history FOR DELETE 
    USING (auth.uid() = user_id);

-- 3. Model Performance Benchmark Table
CREATE TABLE IF NOT EXISTS public.model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(32) NOT NULL,
    model VARCHAR(32) NOT NULL,
    mae NUMERIC(10, 4) NOT NULL,
    rmse NUMERIC(10, 4) NOT NULL,
    mape NUMERIC(8, 4) NOT NULL,
    directional_accuracy NUMERIC(6, 2) NOT NULL,
    training_time_seconds NUMERIC(8, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, model)
);

-- Enable RLS for Model Performance
ALTER TABLE public.model_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for model performance" 
    ON public.model_performance FOR SELECT 
    TO authenticated, anon
    USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_history_user_id ON public.prediction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_model_performance_symbol ON public.model_performance(symbol);

-- ====================================================================
-- 4. User Profiles Table (Phase 5b: Admin Role Management)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Automatically create profile entry on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, is_admin)
    VALUES (NEW.id, NEW.email, FALSE)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
