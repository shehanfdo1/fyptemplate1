import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';

const socket = io('http://127.0.0.1:5000');

const LiveMonitor = () => {
    const [status, setStatus] = useState({});
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        socket.on('connect', () => {
            console.log("Connected to WebSocket");
        });

        socket.on('alert', (data) => {
            console.log("New Alert:", data);
            setAlerts(prev => {
                // Deduplicate: Don't add if same content/platform as the very last alert
                if (prev.length > 0) {
                    const last = prev[0];
                    if (last.content === data.content && last.platform === data.platform) {
                        return prev;
                    }
                }
                // Keep only last 100 alerts to prevent memory/DOM issues
                // Keep only last 100 alerts to prevent memory/DOM issues
                const newAlerts = [data, ...prev];
                return newAlerts.slice(0, 100);
            });
        });

        return () => {
            socket.off('connect');
            socket.off('alert');
        };
    }, []);

    const toggleBot = async (platform) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please login first");
            return;
        }

        // Simple toggle logic (in real app, check running state)
        // For now, we just assume "Start"

        const isRunning = status[platform];
        const action = isRunning ? 'stop' : 'start';

        // You would typically need a BOT TOKEN here. 
        // For this demo/fix, we assume backend might have them or we prompt
        let botToken = "";
        if (action === 'start') {
            botToken = prompt(`Enter ${platform} Bot Token (or leave empty if env has it):`);
            if (botToken === null) return;
        }

        try {
            const res = await fetch(`http://127.0.0.1:5000/api/listeners/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ platform, token: botToken || "env-token" })
            });
            const data = await res.json();
            if (res.ok) {
                setStatus(prev => ({ ...prev, [platform]: !isRunning }));
                alert(data.message);
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Connection Failed: " + e.message);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: '100vh',
            color: 'white',
            padding: '20px',
            textAlign: 'center',
            marginTop: '80px',
            paddingBottom: '50px'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '20px', background: 'linear-gradient(90deg, #4ade80, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Phishing Detection Hub
            </h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '40px', color: '#ccc', maxWidth: '600px' }}>
                Open your communication apps below. The <strong>SecureLink Extension</strong> will automatically protect you.
            </p>

            {/* Extension Buttons Container */}
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '40px' }}>

                {/* Download Button */}
                <a href="/securelink_extension.zip" download style={{ textDecoration: 'none' }}>
                    <button style={{
                        padding: '12px 24px',
                        fontSize: '1rem',
                        background: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        transition: 'background 0.3s'
                    }}
                        onMouseOver={(e) => e.target.style.background = '#16a34a'}
                        onMouseOut={(e) => e.target.style.background = '#22c55e'}
                    >
                        🧩 Download Extension
                    </button>
                </a>

                {/* Show Steps Button */}
                <Link to="/extension-setup" style={{ textDecoration: 'none' }}>
                    <button style={{
                        padding: '12px 24px',
                        fontSize: '1rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        transition: 'background 0.3s'
                    }}
                        onMouseOver={(e) => e.target.style.background = '#2563eb'}
                        onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                    >
                        📝 Show Setup Steps
                    </button>
                </Link>
            </div>

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>

                {/* Email */}
                <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div style={{
                        background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155',
                        width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                        transition: 'transform 0.2s'
                    }}>
                        <img src="/gmail_v2.png" alt="Gmail" style={{ width: '80px', height: '80px', marginBottom: '15px' }} />
                        <h2 style={{ marginBottom: '10px', color: 'white' }}>Email</h2>
                        <span style={{ color: '#94a3b8' }}>Open Gmail</span>
                    </div>
                </a>

                {/* Telegram */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <a href="https://web.telegram.org" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155',
                            width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                            transition: 'transform 0.2s'
                        }}>
                            <img src="/telegram_icon.png" alt="Telegram" style={{ width: '80px', height: '80px', marginBottom: '15px' }} />
                            <h2 style={{ marginBottom: '10px', color: 'white' }}>Telegram</h2>
                            <span style={{ color: '#94a3b8' }}>Open Web App</span>
                        </div>
                    </a>

                </div>

                {/* Discord */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <a href="https://discord.com/app" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155',
                            width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                            transition: 'transform 0.2s'
                        }}>
                            <img src="/discord_icon.png" alt="Discord" style={{ width: '80px', height: '80px', marginBottom: '15px' }} />
                            <h2 style={{ marginBottom: '10px', color: 'white' }}>Discord</h2>
                            <span style={{ color: '#94a3b8' }}>Open Discord</span>
                        </div>
                    </a>

                </div>

            </div>

            <div style={{ marginTop: '50px', padding: '15px', background: '#172554', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <strong style={{ color: '#60a5fa' }}>💡 Reminder:</strong> Make sure the SecureLink Extension is installed and active in your browser.
            </div>

            {/* Alert Stream */}
            <div style={{ width: '100%', maxWidth: '800px', marginTop: '40px', textAlign: 'left' }}>
                <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>🚨 Live Threat Feed</h3>

                <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid #333', borderRadius: '8px', padding: '10px', background: '#0f172a' }}>
                    {alerts.length === 0 ? (
                        <p style={{ color: '#666', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>No threats detected yet...</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {alerts.map((alert, idx) => {
                                const isSuspicious = alert.prediction === "Suspicious Message";
                                const borderColor = isSuspicious ? '#f97316' : '#ef4444'; // Orange : Red
                                const bgColor = isSuspicious ? '#7c2d12' : '#450a0a'; // Dark Orange : Dark Red
                                const titleColor = isSuspicious ? '#fb923c' : '#ef4444';

                                return (
                                    <div key={idx} style={{
                                        background: bgColor,
                                        borderLeft: `4px solid ${borderColor}`,
                                        padding: '15px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <strong style={{ color: titleColor }}>{alert.platform} {isSuspicious ? 'Suspicious Content' : 'Phishing Detect!'}</strong>
                                            <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#ddd', whiteSpace: 'pre-wrap' }}>"{alert.content}"</p>
                                            <span style={{ fontSize: '0.8rem', color: '#999' }}>{alert.timestamp} • Confidence: {alert.confidence}</span>
                                        </div>
                                        {alert.url && (
                                            <a
                                                href={(() => {
                                                    if (!alert.url) return '#';
                                                    // Insert query param safely before hash
                                                    const [base, hash] = alert.url.split('#');
                                                    const separator = base.includes('?') ? '&' : '?';
                                                    return `${base}${separator}phishing_show=true${hash ? '#' + hash : ''}`;
                                                })()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    background: borderColor,
                                                    color: 'white',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    textDecoration: 'none',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                Inspect Source
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default LiveMonitor;
