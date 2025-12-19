// src/pages/Detector.js
import React, { useState } from 'react';
import '../styles/Detector.css';

const Detector = () => {
  const [emailText, setEmailText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportStatus, setReportStatus] = useState('');

  const API_URL = 'http://127.0.0.1:5000/predict';
  const REPORT_URL = 'http://127.0.0.1:5000/report';

  const handleSubmit = async () => {
    if (!emailText.trim()) {
      setError('Please paste the text into the box.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setReportStatus('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email: emailText }),
      });

      if (response.status === 401) {
        throw new Error("Unauthorized");
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

    } catch (e) {
      console.error("Fetch error:", e);
      if (e.message === "Unauthorized") {
        // Auto-logout: Clear token and redirect immediately
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = '/login';
      } else {
        setError('Could not connect to the analysis server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (label) => {
    try {
      const response = await fetch(REPORT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text: emailText,
          label: label
        }),
      });
      if (response.ok) {
        setReportStatus('Thank you! This has been added to the community database.');
      } else {
        setReportStatus('Failed to submit report.');
      }
    } catch (e) {
      setReportStatus('Error submitting report.');
    }
  };



  const getStyle = (prediction) => {
    if (prediction === "Phishing Message") {
      return { color: '#e74c3c', emoji: '🚨' };
    }
    if (prediction === "Safe Message") {
      return { color: '#2ecc71', emoji: '✅' };
    }
    return { color: '#3498db', emoji: '🔍' };
  };

  const style = result ? getStyle(result.prediction) : getStyle();

  return (
    <div className="detector-container">
      <h2>Phishing Detection Engine</h2>
      <p>Paste the full content of the suspicious message below for analysis.</p>

      <textarea
        className="email-input"
        rows="10"
        placeholder="Paste text here..."
        value={emailText}
        onChange={(e) => setEmailText(e.target.value)}
        disabled={loading}
      />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze Email'}
      </button>

      {error && (
        <div className="result-box error-message">
          <p>⚠️ {error}</p>
        </div>
      )}

      {result && (
        <div className="result-box animated-result" style={{ borderColor: style.color }}>
          <h3 style={{ color: style.color }}>{style.emoji} {result.prediction}</h3>
          <p>Confidence: <strong>{result.confidence}</strong></p>

          <hr style={{ margin: '15px 0', border: 0, borderTop: '1px solid #ddd' }} />
          <p style={{ fontSize: '0.9rem', color: '#666' }}>Is this incorrect? Help improve the model:</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => handleReport('Safe Email')}
              style={{ background: '#2ecc71', fontSize: '0.8rem', padding: '5px 10px' }}
            >
              Report as SAFE
            </button>
            <button
              onClick={() => handleReport('Phishing Email')}
              style={{ background: '#e74c3c', fontSize: '0.8rem', padding: '5px 10px' }}
            >
              Report as PHISHING
            </button>
          </div>
          {reportStatus && <p style={{ marginTop: '10px', fontStyle: 'italic' }}>{reportStatus}</p>}

        </div>
      )}
    </div>
  );
};

export default Detector;