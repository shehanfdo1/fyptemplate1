// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Detector from './pages/Detector';
import Login from './pages/Login';
import Register from './pages/Register';
import ExtensionSetup from './pages/ExtensionSetup';
import LiveMonitor from './pages/LiveMonitor';
import BackgroundAnimation from './components/BackgroundAnimation';
import './styles/App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Listen for changes in local storage or handle token state
    const checkToken = () => setToken(localStorage.getItem('token'));
    window.addEventListener('storage', checkToken);
    return () => window.removeEventListener('storage', checkToken);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    window.location.href = '/login';
  };

  return (
    <Router>
      <BackgroundAnimation />
      <header className="header">
        <div className="logo">SecureLink</div>
        <nav>
          <Link to="/">Home</Link>
          {token ? (
            <>
              <Link to="/detector">Phishing Detector</Link>
              <Link to="/live">Live Monitor</Link>
              <button onClick={handleLogout} style={{ marginLeft: '10px', background: 'none', border: '1px solid white', color: 'white', cursor: 'pointer' }}>Logout</button>
            </>
          ) : (
            <Link to="/login">Login/Register</Link>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/extension-setup" element={<ExtensionSetup />} />
        {/* Protect /detector route */}
        <Route
          path="/detector"
          element={token ? <Detector /> : <Navigate to="/login" />}
        />
        <Route
          path="/live"
          element={token ? <LiveMonitor /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;