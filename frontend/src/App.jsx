import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import WaitingRoom from './pages/WaitingRoom';
import QuizArena from './pages/QuizArena';
import Admin from './pages/Admin';
import LoginPage from './pages/LoginPage';
import { getCurrentUser, logout } from './lib/appwrite';

const ProtectedRoute = ({ user, loading, children }) => {
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-slate-900)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--color-neon-cyan)]/30 border-t-[var(--color-neon-cyan)] rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const session = await getCurrentUser();
      setUser(session);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-slate-900)] text-[var(--color-gray-200)] font-base selection:bg-[var(--color-blue-500)] selection:text-white">
        <header className="border-b border-gray-800 sticky top-0 z-40 bg-[var(--color-slate-900)]/80 backdrop-blur-md">
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-sm">
                M
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">Math<span className="text-blue-500">X</span> CBT</h1>
            </div>
            <div className="flex items-center gap-6">
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-[var(--color-gray-300)] hidden sm:block">Team: {user.name || user.email}</span>
                  <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium border border-red-500/30 bg-red-500/10 px-3 py-1.5 rounded-md">
                    Logout
                  </button>
                </div>
              ) : (
                <span className="text-sm text-[var(--color-gray-400)] hidden sm:block">Authentication Required</span>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 relative z-10">
          <Routes>
            <Route
              path="/"
              element={<Navigate to={user ? "/dashboard" : "/login"} />}
            />
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user} loading={loading}>
                  <Dashboard user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/waiting-room/:id"
              element={
                <ProtectedRoute user={user} loading={loading}>
                  <WaitingRoom user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz/:id"
              element={
                <ProtectedRoute user={user} loading={loading}>
                  <QuizArena user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={<Admin />}
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
