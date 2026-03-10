import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import WaitingRoom from './pages/WaitingRoom';
import QuizArena from './pages/QuizArena';
import Admin from './pages/Admin';
import LoginPage from './pages/LoginPage';
import RegisterTesting from './pages/RegisterTesting';
import { FastFingersHome } from './round2/FastFingersHome';
import FastFingersDashboard from './round2/FastFingersDashboard';
import { FastFingersAdmin } from './round2/FastFingersAdmin';
import { FastFingersClient } from './round2/FastFingersClient';
import Round2ProtectedRoute from './round2/Round2ProtectedRoute';
import Round3Dashboard from './round3/Round3Dashboard';
import Round3Client from './round3/Round3Client';
import { getCurrentUser, logout } from './lib/appwrite';
import { SocketProvider, useSocket } from './SocketContext';

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

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [showProfile, setShowProfile] = useState(true);

  // Unified Global Routing Watchdog
  useEffect(() => {
    if (!socket || !user) return; // Only bind if authenticated and connected

    // Listen for state synchronization payload from PostgreSQL
    socket.on('server:sync_state', (state) => {
      // Do not interrupt the administrator dashboard
      if (location.pathname.includes('/admin')) return;

      const roundStr = String(state.round).toUpperCase();
      const stageNum = parseInt(state.stage, 10);
      let targetPath = '/dashboard';

      if (roundStr === 'A') { // Round 1 Logic
        if (stageNum === 0) targetPath = '/dashboard';
        else if (stageNum === 1) targetPath = '/waiting-room';
        else if (stageNum === 2) targetPath = '/quiz';
        else if (stageNum === 3) targetPath = '/leaderboard';
      } else if (roundStr === 'B') { // Round 2 logic
        if (stageNum === 0) targetPath = '/dashboard'; // Safe fallback
        else if (stageNum === 1) targetPath = '/round2/dashboard'; // FastFingers Branded Dashboard
        else if (stageNum === 2) targetPath = '/round2/client'; // FastFingers Live Radar
      } else if (roundStr === 'C') { // Round 3 logic
        if (stageNum === 1) targetPath = '/round3/dashboard';
        else if (stageNum === 2) targetPath = '/round3/client';
      }

      // Sync Profile Visibility
      if (state.showProfile !== undefined) {
        setShowProfile(state.showProfile);
      }

      // Prevent looping redirect if already on exactly that path
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    });

    // Directly request the exact Postgres chronological state upon mount/reload
    if (!location.pathname.includes('/admin')) {
      socket.emit('client:request_state');
    }

    return () => socket.off('server:sync_state');
  }, [socket, user, location.pathname, navigate]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const session = await getCurrentUser();

      // Post-Authentication: Fetch PostgreSQL Profile (Team Name, Full Name, etc.)
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/profile/${session.$id}`);
      if (response.ok) {
        const profile = await response.json();
        // Merge Appwrite session with PostgreSQL profile data
        setUser({ ...session, ...profile });
      } else {
        setUser(session);
      }
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

  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/round2/dashboard';
  const isProjector = location.pathname.endsWith('/client');
  const hideHeader = isDashboard || isProjector;

  return (
    <div className="min-h-screen bg-[var(--color-slate-900)] text-[var(--color-gray-200)] font-base selection:bg-[var(--color-blue-500)] selection:text-white flex flex-col">
      {!hideHeader && (
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
      )}

      <main className={hideHeader ? "relative z-10 w-full flex-grow p-0 m-0" : "container mx-auto px-4 py-8 relative z-10 flex-grow"}>
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
            path="/register"
            element={<RegisterTesting />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user} loading={loading}>
                <Dashboard user={user} showProfile={showProfile} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/waiting-room"
            element={
              <ProtectedRoute user={user} loading={loading}>
                <WaitingRoom user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz"
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
          <Route
            path="/round2/dashboard"
            element={
              <Round2ProtectedRoute>
                <FastFingersDashboard user={user} />
              </Round2ProtectedRoute>
            }
          />
          <Route
            path="/round2"
            element={
              <Round2ProtectedRoute>
                <FastFingersHome />
              </Round2ProtectedRoute>
            }
          />
          <Route
            path="/round2/admin"
            element={<FastFingersAdmin />} // Note: Admin routes usually have separate admin layer protection if needed
          />
          <Route
            path="/round2/client"
            element={
              <Round2ProtectedRoute user={user} loading={loading}>
                <FastFingersClient user={user} />
              </Round2ProtectedRoute>
            }
          />
          <Route
            path="/round3/dashboard"
            element={
              <Round3Dashboard />
            }
          />
          <Route
            path="/round3/client"
            element={
              <Round3Client />
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
