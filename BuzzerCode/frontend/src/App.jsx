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

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <header className="mb-8 text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">
            Arduino Serial Monitor
          </h1>
          <p className="text-gray-400 mb-4">Real-time data streaming from microcontrollers</p>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center space-x-2 bg-gray-800/80 px-4 py-2 rounded-full border border-gray-700 shadow-sm backdrop-blur-sm">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`}></div>
              <span className="text-sm font-medium text-gray-300">
                {isConnected ? 'Connected to Backend (Port 5000)' : 'Disconnected - Check Backend Server'}
              </span>
            </div>

            <button
              onClick={async () => {
                try {
                  const res = await fetch('http://localhost:5000/test-vps');
                  const data = await res.json();
                  console.log('VPS Status response:', data);
                  alert(data.message);
                } catch (err) {
                  console.error('Failed to check VPS status:', err);
                  alert('Error checking VPS status. Is backend running?');
                }
              }}
              className="px-4 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded-lg text-blue-400 font-bold transition-all text-sm shadow-[0_0_10px_rgba(59,130,246,0.2)]"
            >
              Test VPS Connection
            </button>
          </div>
        </header>

        <main className="bg-gray-950 rounded-xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col h-[600px] relative">
          <div className="flex px-4 py-3 bg-gray-900 border-b border-gray-800 items-center justify-between">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <div className="text-xs font-mono text-gray-500 px-4 py-1 rounded-md bg-black/30 border border-gray-800">Serial Output</div>
            <button
              onClick={() => setLogs([])}
              className="px-3 py-1 rounded bg-gray-800 hover:bg-red-500/20 text-xs text-gray-400 hover:text-red-400 transition-all duration-200 border border-transparent hover:border-red-500/50"
            >
              Clear Logs
            </button>
          </div>

          <div className="flex-1 p-4 md:p-6 overflow-y-auto font-mono text-sm leading-relaxed space-y-2">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 italic">
                <svg className="w-12 h-12 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <p>Waiting for serial data from Arduino...</p>
                <p className="text-xs mt-2 text-gray-700">(Press a button or send data to COM port via Arduino)</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex hover:bg-gray-800/40 rounded px-2 py-1 transition-colors duration-150 group">
                  <span className="text-gray-600 w-12 shrink-0 select-none group-hover:text-gray-500 transition-colors">
                    {(index + 1).toString().padStart(4, '0')}
                  </span>
                  <span className={`flex-1 break-words ml-2 md:ml-4 drop-shadow-sm ${log.includes('BUTTON_PRESSED') ? 'text-amber-400 font-bold bg-amber-400/10 px-2 rounded -mx-2' : log.includes('Error') ? 'text-rose-400' : 'text-emerald-400 shadow-emerald-500/20'}`}>
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
  )
}

export default App
