import {
  StockSearchResult,
  StockHistoryResponse,
  TrendAnalysisResponse,
  PredictRequest,
  PredictResponse,
  ModelComparisonResponse,
  WatchlistItem,
  PredictionHistoryItem,
  UserProfileResponse,
  StockVolatilityResponse,
  WatchlistVolatilityComparisonResponse,
  AdminDashboardStats,
} from '../types';

const API_BASE = '/api';

class ApiService {
  private _token: string | null = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : null;

  setToken(token: string | null) {
    this._token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('sv_token', token);
      else localStorage.removeItem('sv_token');
    }
  }

  getToken(): string | null {
    if (this._token) return this._token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sv_token');
    }
    return null;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMsg = errData.detail;
          }
        } catch (_) {
          // non-JSON response body
        }
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`API Error on [${options?.method || 'GET'}] ${endpoint}:`, error);
      throw error;
    }
  }

  // 1. Stock Search
  async searchStocks(query: string): Promise<StockSearchResult[]> {
    if (!query || query.trim().length === 0) return [];
    return this.request<StockSearchResult[]>(`/stocks/search?q=${encodeURIComponent(query)}`);
  }

  // 2. Historical Data
  async getStockHistory(symbol: string, period: string = '1Y'): Promise<StockHistoryResponse> {
    return this.request<StockHistoryResponse>(`/stocks/${encodeURIComponent(symbol)}/history?period=${period}`);
  }

  // 3. Technical Trend & Volatility Analysis
  async getTrendAnalysis(symbol: string): Promise<TrendAnalysisResponse> {
    return this.request<TrendAnalysisResponse>(`/stocks/${encodeURIComponent(symbol)}/trend`);
  }

  async getStockVolatility(symbol: string, period: string = '1Y'): Promise<StockVolatilityResponse> {
    return this.request<StockVolatilityResponse>(`/stocks/${encodeURIComponent(symbol)}/volatility?period=${period}`);
  }

  async getVolatilityComparison(symbols?: string[]): Promise<WatchlistVolatilityComparisonResponse> {
    const query = symbols && symbols.length > 0 ? `?symbols=${encodeURIComponent(symbols.join(','))}` : '';
    return this.request<WatchlistVolatilityComparisonResponse>(`/stocks/volatility/compare${query}`);
  }

  // 4. ML Prediction
  async predictStock(data: PredictRequest): Promise<PredictResponse> {
    return this.request<PredictResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 5. Model Metrics Comparison
  async getModelComparison(symbol: string): Promise<ModelComparisonResponse> {
    return this.request<ModelComparisonResponse>(`/compare/${encodeURIComponent(symbol)}`);
  }

  // 6. System Health Check
  async checkHealth(): Promise<{ status: string; pretrained_stocks: { symbol: string; models: string[] }[] }> {
    return this.request('/health');
  }

  // 7. Watchlist (Phase 4)
  async getWatchlist(): Promise<WatchlistItem[]> {
    return this.request<WatchlistItem[]>('/watchlist');
  }

  async addToWatchlist(symbol: string): Promise<{ status: string; symbol: string }> {
    return this.request<{ status: string; symbol: string }>('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ symbol }),
    });
  }

  async removeFromWatchlist(symbol: string): Promise<{ status: string; symbol: string }> {
    return this.request<{ status: string; symbol: string }>(`/watchlist/${encodeURIComponent(symbol)}`, {
      method: 'DELETE',
    });
  }

  // 8. Prediction History (Phase 4)
  async getHistory(): Promise<PredictionHistoryItem[]> {
    return this.request<PredictionHistoryItem[]>('/history');
  }

  async deleteHistoryItem(id: string): Promise<{ status: string; id: string }> {
    return this.request<{ status: string; id: string }>(`/history/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // 9. Profile (Phase 4)
  async getUserProfile(): Promise<UserProfileResponse> {
    return this.request<UserProfileResponse>('/profile');
  }

  // 10. Admin Dashboard (Phase 5b)
  async getAdminStats(): Promise<AdminDashboardStats> {
    return this.request<AdminDashboardStats>('/admin/stats');
  }
}

export const api = new ApiService();
