import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AdminView } from './components/AdminView';
import { ClientView } from './components/ClientView';
import { SocketProvider } from './SocketContext';

function MainLayout({ children }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-brand-dark text-white font-sans selection:bg-brand-purple selection:text-white">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[150px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>

      {/* Main Content Areas */}
      <div className="relative z-10 w-full pt-16 lg:pt-0">
        {children}
      </div>
    </div>
  );
}

function WelcomeScreen() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
      <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-cyan to-brand-purple">
        MathX Fast Fingers
      </h1>
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="px-6 py-3 font-bold rounded-xl transition-colors border bg-brand-blue text-white border-brand-blue glow-blue hover:scale-105"
        >
          Join as Admin
        </button>
        <button
          onClick={() => navigate('/client')}
          className="px-6 py-3 font-bold rounded-xl transition-colors border bg-brand-cyan text-brand-dark border-brand-cyan glow-cyan hover:scale-105"
        >
          Join as Client
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route
            path="/admin"
            element={
              <SocketProvider isAdmin={true}>
                <AdminView />
              </SocketProvider>
            }
          />
          <Route
            path="/client"
            element={
              <SocketProvider isAdmin={false} clientName={`Team-${Math.floor(Math.random() * 1000)}`}>
                <ClientView />
              </SocketProvider>
            }
          />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
