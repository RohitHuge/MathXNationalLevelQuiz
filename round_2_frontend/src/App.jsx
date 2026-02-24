import React, { useState } from 'react';
import { AdminView } from './components/AdminView';
import { ClientView } from './components/ClientView';

function App() {
  const [view, setView] = useState('client');

  return (
    <div className="min-h-screen relative overflow-hidden bg-brand-dark text-white font-sans selection:bg-brand-purple selection:text-white">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[150px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>

      {/* View Switcher (For prototype testing only) */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => setView('admin')}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-colors border ${view === 'admin'
              ? 'bg-brand-blue text-white border-brand-blue glow-blue'
              : 'bg-brand-dark/50 text-gray-400 border-gray-700 hover:border-brand-purple'
            }`}
        >
          Admin View
        </button>
        <button
          onClick={() => setView('client')}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-colors border ${view === 'client'
              ? 'bg-brand-cyan text-brand-dark border-brand-cyan glow-cyan'
              : 'bg-brand-dark/50 text-gray-400 border-gray-700 hover:border-brand-cyan'
            }`}
        >
          Client View
        </button>
      </div>

      {/* Main Content Areas */}
      <div className="relative z-10 w-full pt-16 lg:pt-0">
        {view === 'admin' ? <AdminView /> : <ClientView />}
      </div>
    </div>
  );
}

export default App;
