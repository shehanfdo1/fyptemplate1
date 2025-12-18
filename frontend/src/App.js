// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Detector from './pages/Detector';
import './styles/App.css'; // For general layout

function App() {
  return (
    <Router>
      {/* --- Global Navigation Header --- */}
      <header className="header">
        <div className="logo">SecureLink</div>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/detector">Phishing Detector</Link>
        </nav>
      </header>

      {/* --- Page Content Routes --- */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/detector" element={<Detector />} />
      </Routes>
    </Router>
  );
}

export default App;