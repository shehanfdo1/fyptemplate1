// src/pages/Home.js (Modified for Flanking Info Boxes)
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';



// New Component for the Flanking Info Boxes
const InfoBox = ({ title, content }) => (
  <div className="info-box">
    <h3>{title}</h3>
    <p>{content}</p>
  </div>
);

const CircularGraph = ({ label, value, color }) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="circular-graph">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} stroke="#333" strokeWidth="8" fill="none" />
        <circle
          cx="50" cy="50" r={radius} stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">
          {value}%
        </text>
      </svg>
      <p className="graph-label" style={{ color: color }}>{label}</p>
    </div>
  );
};

// New Component: Confusion Matrix
const ConfusionMatrix = ({ cm }) => {
  if (!cm) return null;
  return (
    <div className="cm-container">
      <h3 className="cm-title">Confusion Matrix</h3>
      <div className="cm-grid">
        <div className="cm-header"></div>
        <div className="cm-header">Pred: Safe</div>
        <div className="cm-header">Pred: Phish</div>

        <div className="cm-row-label">Actual: Safe</div>
        <div className="cm-cell tn" title="True Negative (Correctly Safe)">{cm.tn.toLocaleString()} <span className="cm-sub">(TN)</span></div>
        <div className="cm-cell fp" title="False Positive (False Alarm)">{cm.fp.toLocaleString()} <span className="cm-sub">(FP)</span></div>

        <div className="cm-row-label">Actual: Phish</div>
        <div className="cm-cell fn" title="False Negative (Missed Phish)">{cm.fn.toLocaleString()} <span className="cm-sub">(FN)</span></div>
        <div className="cm-cell tp" title="True Positive (Caught Phish)">{cm.tp.toLocaleString()} <span className="cm-sub">(TP)</span></div>
      </div>
      <p className="cm-legend">TP: Correct Phish • TN: Correct Safe • FP: False Alarm • FN: Missed Phish</p>
    </div>
  );
};

// New Component: Model Info Table
const ModelInfoTable = ({ info }) => {
  if (!info) return null;
  return (
    <div className="model-info-container">
      <h3 className="cm-title">Model Architecture</h3>
      <table className="info-table">
        <tbody>
          <tr><td>Algorithm</td><td>{info.algorithm}</td></tr>
          <tr><td>Feature Extraction</td><td>{info.feature_extraction}</td></tr>
          <tr><td>Training Samples</td><td>{info.training_samples.toLocaleString()}</td></tr>
          <tr><td>Test Samples</td><td>{info.test_samples.toLocaleString()}</td></tr>
          <tr><td>Total Dataset</td><td>{info.total_dataset.toLocaleString()}</td></tr>
        </tbody>
      </table>
    </div>
  );
};

const Home = () => {
  const [metrics, setMetrics] = React.useState(null);

  React.useEffect(() => {
    fetch('http://127.0.0.1:5000/api/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error("Failed to load metrics", err));
  }, []);

  return (
    <div className="home-container">
      {/* ------------------ FLOATING FISHING HOOKS ------------------ */}
      {/* Moved to Global BackgroundAnimation.js */}
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
          content="Trained on the latest phishing datasets, our system boasts 96%+ accuracy, minimizing false positives and critical misses."
        />

      </div>

      {/* ------------------------------------------- */}

      {/* --- NEW: Analytics Section --- */}
      {
        metrics && (
          <div className="analytics-section">
            <h2 className="section-title">Model <span style={{ color: '#4caf50' }}>Performance</span></h2>
            <div className="graphs-container">
              <CircularGraph label="Accuracy" value={(metrics.accuracy * 100).toFixed(1)} color="#4caf50" />
              <CircularGraph label="Precision" value={(metrics.precision * 100).toFixed(1)} color="#2196F3" />
              <CircularGraph label="Recall" value={(metrics.recall * 100).toFixed(1)} color="#FF9800" />
              <CircularGraph label="F1 Score" value={(metrics.f1 * 100).toFixed(1)} color="#9C27B0" />
            </div>

            {metrics.confusion_matrix && (
              <div className="advanced-metrics-row">
                <ConfusionMatrix cm={metrics.confusion_matrix} />
                <ModelInfoTable info={metrics.model_info} />
              </div>
            )}
          </div>
        )
      }

      <div className="stats-section">
        <div className="stat">
          <span className="stat-number">{metrics ? metrics.model_info.test_samples.toLocaleString() : "4,500+"}</span>
          <p>Test Samples Verified</p>
        </div>
        <div className="stat">
          <span className="stat-number">{metrics ? metrics.model_info.total_dataset.toLocaleString() : "22,000+"}</span>
          <p>Total Emails Analyzed</p>
        </div>
        <div className="stat">
          <span className="stat-number">{metrics ? metrics.model_info.training_samples.toLocaleString() : "18,000+"}</span>
          <p>Training Data Points</p>
        </div>
      </div>
    </div >
  );
};

export default Home;