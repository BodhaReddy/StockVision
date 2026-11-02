import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { StockProvider } from './context/StockContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

import { HistoricalAnalysisPage } from './pages/HistoricalAnalysisPage';
import { PredictionPage } from './pages/PredictionPage';
import { ModelComparisonPage } from './pages/ModelComparisonPage';
import { VolatilityPage } from './pages/VolatilityPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StockProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Pages */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Workspace Pages */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <HistoricalAnalysisPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/predict"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PredictionPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/compare"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ModelComparisonPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/volatility"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <VolatilityPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/watchlist"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <WatchlistPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <HistoryPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ProfilePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AdminDashboardPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </StockProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
