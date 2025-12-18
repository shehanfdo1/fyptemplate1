// src/pages/Home.js (Modified for Flanking Info Boxes)
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

// Component for a single thematic background object (Hook)
const ThematicObject = ({ className, icon }) => (
  <div className={`thematic-object ${className}`}>
    <span className="object-icon">{icon}</span>
  </div>
);

// New Component for the Flanking Info Boxes
const InfoBox = ({ title, content }) => (
    <div className="info-box">
        <h3>{title}</h3>
        <p>{content}</p>
    </div>
);

const Home = () => {
  return (
    <div className="home-container">
      {/* ------------------ FLOATING FISHING HOOKS ------------------ */}
      <ThematicObject className="hook-1" icon="🦠" /> 
      <ThematicObject className="hook-2 flipped" icon="🦠" />
      <ThematicObject className="hook-3" icon="🦠" /> 
      <ThematicObject className="hook-4 flipped" icon="🦠" />
      <ThematicObject className="hook-5" icon="🦠" /> 
      {/* ------------------------------------------------------------ */}

      {/* --- NEW: Main Content Row using Flexbox --- */}
      <div className="main-content-row">
        
        {/* 1. Left Info Container */}
        <InfoBox 
          title="🛡️ Real-Time Defense"
          content="Our ML model analyzes email headers and content in milliseconds, providing instant protection against zero-day threats."
        />

        {/* 2. Center Main Hero Section */}
        <div className="hero-section">
          <h1 className="animated-text">Secure Your Inbox.</h1>
          <p className="subtitle">
            Leverage the power of Machine Learning to detect malicious massages in real-time.
          </p>
          <Link to="/detector" className="shop-button">
            Start Detection
          </Link>
        </div>

        {/* 3. Right Info Container */}
        <InfoBox 
          title="🧠 High Accuracy"
          content="Trained on the latest phishing datasets, our system boasts 98%+ accuracy, minimizing false positives and critical misses."
        />

      </div>
      {/* ------------------------------------------- */}

      <div className="stats-section">
        {/* ... (Stats section remains the same) ... */}
        <div className="stat">
          <span className="stat-number">98</span>
          <p>Successful predictions made</p>
        </div>
        <div className="stat">
          <span className="stat-number">12K</span>
          <p>Dataset size analyzed</p>
        </div>
        <div className="stat">
          <span className="stat-number">14902</span>
          <p>Sample Trainings</p>
        </div>
      </div>
    </div>
  );
};

export default Home;