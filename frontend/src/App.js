// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Detector from './pages/Detector';
import Login from './pages/Login';
import Register from './pages/Register';
import ExtensionSetup from './pages/ExtensionSetup';
import LiveMonitor from './pages/LiveMonitor';
import Reports from './pages/Reports';
import BackgroundAnimation from './components/BackgroundAnimation';
import './styles/App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || null);

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('token'));
      setUsername(localStorage.getItem('username'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    window.location.href = '/';
  };

  return (
    <Router>
      <BackgroundAnimation />
      <header className="header">
        <div className="logo">SecureLink</div>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/detector">Phishing Detector</Link>
          <Link to="/live">Live Monitor</Link>
          <Link to="/reports">Reports</Link>
          
          {token ? (
            <>
               <span style={{ color: '#aaa', marginLeft: '10px' }}>{username}</span>
               <button onClick={handleLogout} style={{ background: 'transparent', color: '#ff6b6b', border: '1px solid #ff6b6b', padding: '5px 10px', borderRadius: '5px', marginLeft: '10px', cursor: 'pointer' }}>Logout</button>
            </>
          ) : (
            <>
               <Link to="/login" style={{ marginLeft: '10px', border: '1px solid #4ade80', padding: '5px 10px', borderRadius: '5px' }}>Login</Link>
               <Link to="/register" style={{ background: '#4ade80', color: '#1e293b', padding: '5px 10px', borderRadius: '5px', marginLeft: '10px' }}>Register</Link>
            </>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/extension-setup" element={<ExtensionSetup />} />
        <Route path="/detector" element={<Detector />} />
        <Route path="/live" element={localStorage.getItem('token') ? <LiveMonitor /> : <Navigate to="/login" />} />
        <Route path="/reports" element={localStorage.getItem('token') ? <Reports /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;