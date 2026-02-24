import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Round1App from './round1/App';
import Round2App from './round2/App';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/round1/*" element={<Round1App />} />
                <Route path="/round2/*" element={<Round2App />} />

                {/* Default redirect to round1 for now */}
                <Route path="*" element={<Navigate to="/round1" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
