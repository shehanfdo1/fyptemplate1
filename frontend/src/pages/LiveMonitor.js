import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import config from '../config';

const socket = io(config.API_BASE_URL);

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

        const isRunning = status[platform];
        const action = isRunning ? 'stop' : 'start';

        let botToken = "";
        let emailUser = "";

        if (action === 'start') {
            if (platform === 'gmail') {
                emailUser = prompt("Enter your Gmail Address:");
                if (!emailUser) return;
                botToken = prompt("Enter your 16-digit Gmail App Password:");
                if (!botToken) return;
            } else {
                botToken = prompt(`Enter ${platform} Bot Token (or leave empty if env has it):`);
                if (botToken === null) return;
            }
        }

        try {
            const bodyData = { platform, token: botToken || "env-token" };
            if (platform === 'gmail') bodyData.email_user = emailUser;

            const res = await fetch(`${config.API_BASE_URL}/api/listeners/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bodyData)
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
                <a href="/securelink_v2.zip" download style={{ textDecoration: 'none' }}>
                    <button style={{
                        padding: '12px 24px', fontSize: '1rem', background: '#22c55e', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'background 0.3s'
                    }}
                        onMouseOver={(e) => e.target.style.background = '#16a34a'}
                        onMouseOut={(e) => e.target.style.background = '#22c55e'}
                    >
                        🧩 Download Extension
                    </button>
                </a>

                <Link to="/extension-setup" style={{ textDecoration: 'none' }}>
                    <button style={{
                        padding: '12px 24px', fontSize: '1rem', background: '#3b82f6', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'background 0.3s'
                    }}
                        onMouseOver={(e) => e.target.style.background = '#2563eb'}
                        onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                    >
                        📝 Show Setup Steps
                    </button>
                </Link>

                <Link to="/reports" style={{ textDecoration: 'none' }}>
                    <button
                        style={{
                            padding: '12px 24px', fontSize: '1rem', background: '#f59e0b', color: 'white',
                            border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'background 0.3s'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#d97706'}
                        onMouseOut={(e) => e.target.style.background = '#f59e0b'}
                    >
                        📊 View Full Reports
                    </button>
                </Link>
            </div>

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155',
                            width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <img src="/gmail_v2.png" alt="Gmail" style={{ width: '80px', height: '80px', marginBottom: '15px' }} />
                            <h2 style={{ marginBottom: '10px', color: 'white' }}>Email</h2>
                            <span style={{ color: '#94a3b8' }}>Open Gmail</span>
                        </div>
                    </a>
                    <button
                        onClick={() => toggleBot('gmail')}
                        style={{
                            padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            background: status['gmail'] ? '#ef4444' : '#22c55e', color: 'white', fontWeight: 'bold',
                            transition: 'opacity 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.opacity = '0.8'}
                        onMouseOut={(e) => e.target.style.opacity = '1'}
                    >
                        {status['gmail'] ? 'Stop Bot' : 'Start Bot'}
                    </button>
                </div>

                {/* Telegram */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <a href="https://web.telegram.org" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155',
                            width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <img src="/telegram_icon.png" alt="Telegram" style={{ width: '80px', height: '80px', marginBottom: '15px' }} />
                            <h2 style={{ marginBottom: '10px', color: 'white' }}>Telegram</h2>
                            <span style={{ color: '#94a3b8' }}>Open Web App</span>
                        </div>
                    </a>
                    <button
                        onClick={() => toggleBot('telegram')}
                        style={{
                            padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            background: status['telegram'] ? '#ef4444' : '#22c55e', color: 'white', fontWeight: 'bold',
                            transition: 'opacity 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.opacity = '0.8'}
                        onMouseOut={(e) => e.target.style.opacity = '1'}
                    >
                        {status['telegram'] ? 'Stop Bot' : 'Start Bot'}
                    </button>
                </div>

                {/* Discord */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <a href="https://discord.com/app" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155',
                            width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <img src="/discord_icon.png" alt="Discord" style={{ width: '80px', height: '80px', marginBottom: '15px' }} />
                            <h2 style={{ marginBottom: '10px', color: 'white' }}>Discord</h2>
                            <span style={{ color: '#94a3b8' }}>Open Discord</span>
                        </div>
                    </a>
                    <button
                        onClick={() => toggleBot('discord')}
                        style={{
                            padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            background: status['discord'] ? '#ef4444' : '#22c55e', color: 'white', fontWeight: 'bold',
                            transition: 'opacity 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.opacity = '0.8'}
                        onMouseOut={(e) => e.target.style.opacity = '1'}
                    >
                        {status['discord'] ? 'Stop Bot' : 'Start Bot'}
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '50px', padding: '15px', background: '#172554', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                <strong style={{ color: '#60a5fa' }}>💡 Reminder:</strong> Make sure the SecureLink Extension is installed and active in your browser.
            </div>

            {/* Alert Stream */}
            <div style={{ width: '100%', maxWidth: '800px', marginTop: '40px', textAlign: 'left' }}>
                <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>🚨 Live Threat Feed</h3>
                <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid #333', borderRadius: '8px', padding: '10px', background: '#0f172a', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
                    {alerts.length === 0 ? (
                        <p style={{ color: '#666', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>No threats detected yet...</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {alerts.map((alert, idx) => {
                                const isSuspicious = alert.prediction === "Suspicious Message";
                                const borderColor = isSuspicious ? '#f97316' : '#ef4444'; 
                                const bgColor = isSuspicious ? '#7c2d12' : '#450a0a'; 
                                const titleColor = isSuspicious ? '#fb923c' : '#ef4444';

                                return (
                                    <div key={idx} style={{ 
                                        background: bgColor, borderLeft: `4px solid ${borderColor}`, 
                                        padding: '15px', borderRadius: '4px', display: 'flex', 
                                        justifyContent: 'space-between', alignItems: 'center',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
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
                                                    fontSize: '0.9rem',
                                                    fontWeight: 'bold'
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
        </div>
    );
};

export default LiveMonitor;
