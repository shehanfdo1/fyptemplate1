// src/pages/Detector.js
import React, { useState } from 'react';
import '../styles/Detector.css';

const Detector = () => {
  const [emailText, setEmailText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = 'http://127.0.0.1:5000/predict'; 

  const handleSubmit = async () => {
    if (!emailText.trim()) {
      setError('Please paste the text into the box.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

    } catch (e) {
      console.error("Fetch error:", e);
      setError('Could not connect to the analysis server. Make sure the Flask backend is running.');
    } finally {
      setLoading(false);
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
        </div>
      )}
    </div>
  );
};

export default Detector;