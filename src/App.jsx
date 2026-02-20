import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import WaitingRoom from './pages/WaitingRoom';
import QuizArena from './pages/QuizArena';
import Admin from './pages/Admin';

// Mock user for unauthenticated access
const GUEST_USER = {
  $id: 'guest_' + Math.random().toString(36).substr(2, 9),
  name: 'Candidate',
  email: 'guest@mathx.net'
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-slate-900)] text-[var(--color-gray-200)] font-base selection:bg-[var(--color-blue-500)] selection:text-white">
        <header className="border-b border-gray-800 sticky top-0 z-40 bg-[var(--color-slate-900)]/80 backdrop-blur-md">
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--color-blue-600)] rounded flex items-center justify-center font-bold text-white shadow-sm">
                M
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">Math<span className="text-[var(--color-blue-500)]">X</span> CBT</h1>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-[var(--color-gray-300)] hidden sm:block">Public Access Terminal</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 relative z-10">
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/dashboard" />}
            />
            <Route
              path="/dashboard"
              element={<Dashboard user={GUEST_USER} />}
            />
            <Route
              path="/waiting-room/:id"
              element={<WaitingRoom user={GUEST_USER} />}
            />
            <Route
              path="/quiz/:id"
              element={<QuizArena user={GUEST_USER} />}
            />
            <Route
              path="/admin"
              element={<Admin />}
            />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
