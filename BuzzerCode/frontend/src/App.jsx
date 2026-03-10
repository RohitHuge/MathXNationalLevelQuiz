import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

function App() {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const endOfLogsRef = useRef(null);

  useEffect(() => {
    // Connect to the backend
    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from backend');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('serialData', (data) => {
      setLogs((prevLogs) => [...prevLogs, data]);
    });

    socket.on('serialDataSent', (data) => {
      setLogs((prevLogs) => [...prevLogs, `OUT: ${data}`]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 lg:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-[1600px]">
        <header className="mb-8 text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">
            Arduino Serial Monitor
          </h1>
          <p className="text-gray-400">Real-time data streaming from microcontrollers</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Panel: Controls */}
          <aside className="w-full lg:w-[400px] shrink-0 space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-xl backdrop-blur-sm space-y-6">
              <div className="flex items-center space-x-3 bg-gray-900/50 px-4 py-3 rounded-xl border border-gray-700/50">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`}></div>
                <span className="text-sm font-medium text-gray-300">
                  {isConnected ? 'Backend Connected (5000)' : 'Backend Disconnected'}
                </span>
              </div>

              <div className="space-y-4">
                <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider px-1">System Actions</h3>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('http://localhost:5000/test-vps');
                      const data = await res.json();
                      alert(data.message);
                    } catch (err) {
                      alert('Error checking VPS status.');
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 font-bold transition-all text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Test VPS Connection
                </button>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-700/50">
                <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider px-1">Simulation</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((teamId) => (
                    <button
                      key={`sim-${teamId}`}
                      onClick={async () => fetch(`http://localhost:5000/simulate-buzz/${teamId}`).catch(console.error)}
                      className="py-2.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-300 font-bold transition-all text-xs"
                    >
                      T{teamId} Buzz
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-700/50">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider">Light Controls</h3>
                  <button
                    onClick={async () => fetch('http://localhost:5000/reset-lights').catch(console.error)}
                    className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 rounded text-[10px] text-rose-400 font-bold uppercase"
                  >
                    Reset All
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4, 5, 6].map((teamId) => (
                    <div key={`light-${teamId}`} className="flex items-center justify-between bg-gray-900/40 p-2 rounded-xl border border-gray-700/30">
                      <span className="text-xs font-bold text-gray-400 w-8">T{teamId}</span>
                      <div className="flex gap-1">
                        {['U', 'B', 'S', 'O'].map((mode) => (
                          <button
                            key={mode}
                            onClick={async () => fetch(`http://localhost:5000/trigger-light/${teamId}/${mode}`).catch(console.error)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${mode === 'U' ? 'bg-blue-500/10 hover:bg-blue-500/30 text-blue-400' :
                                mode === 'B' ? 'bg-amber-500/10 hover:bg-amber-500/30 text-amber-400' :
                                  mode === 'S' ? 'bg-purple-500/10 hover:bg-purple-500/30 text-purple-400' :
                                    'bg-gray-600/10 hover:bg-gray-600/30 text-gray-500'
                              }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Panel: Console */}
          <main className="flex-1 w-full bg-gray-950 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col h-[700px] relative">
            <div className="flex px-5 py-4 bg-gray-900/80 border-b border-gray-800 items-center justify-between backdrop-blur-sm">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <div className="text-xs font-mono text-gray-500 px-4 py-1 rounded-full bg-black/40 border border-gray-800/50 tracking-widest uppercase text-center flex-1">Serial Monitor Output</div>
              <button
                onClick={() => setLogs([])}
                className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-rose-500/20 text-xs text-gray-400 hover:text-rose-400 transition-all duration-200 border border-transparent hover:border-rose-500/50 font-bold"
              >
                Clear
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto font-mono text-sm leading-relaxed space-y-1">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 italic">
                  <svg className="w-16 h-16 mb-4 text-gray-800/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  <p className="text-lg font-medium text-gray-700">Awaiting hardware signals...</p>
                  <p className="text-xs mt-2 text-gray-800 uppercase tracking-widest">Connect Arduino to {isConnected ? 'Port 5000' : 'Offline'}</p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex hover:bg-white/5 rounded px-2 py-0.5 transition-colors duration-150 group items-center">
                    <span className="text-gray-700 w-12 shrink-0 select-none text-[10px] group-hover:text-gray-500 transition-colors">
                      {String(index + 1).padStart(4, '0')}
                    </span>
                    <span className={`flex-1 break-words ml-4 ${log.startsWith('OUT:') ? 'text-blue-400/90 border-l-2 border-blue-500/30 pl-3' :
                        log.includes('BUTTON_PRESSED') ? 'text-amber-400 font-bold bg-amber-400/5 px-2 rounded' :
                          log.includes('Error') ? 'text-rose-400' :
                            'text-emerald-400/90'
                      }`}>
                      {log}
                    </span>
                  </div>
                ))
              )}
              <div ref={endOfLogsRef} />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
