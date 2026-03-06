import { Routes, Route } from 'react-router-dom';
import ClientScreen from './pages/ClientScreen';
import AdminDashboard from './pages/AdminDashboard';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <SocketProvider>
      <div className="min-h-screen bg-dark-bg text-white font-sans w-full overflow-x-hidden">
        <Routes>
          <Route path="/" element={<ClientScreen />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </SocketProvider>
  );
}

export default App;
