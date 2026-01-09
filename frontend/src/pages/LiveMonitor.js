import React from 'react';

const LiveMonitor = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100vh - 80px)',
            color: 'white',
            padding: '20px',
            textAlign: 'center'
        }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Phishing Detection Extension Hub</h1>
            <p style={{ fontSize: '1.1rem', marginBottom: '40px', color: '#ccc', maxWidth: '600px' }}>
                Manage your browsing safety by connecting to your favorite platforms and using our browser extension to scan for threats.
            </p>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '50px' }}>
                <a
                    href="https://web.telegram.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        textDecoration: 'none',
                        padding: '15px 30px',
                        backgroundColor: '#24A1DE',
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <i className="fa fa-paper-plane"></i> Open Telegram Web
                </a>

                <a
                    href="https://discord.com/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        textDecoration: 'none',
                        padding: '15px 30px',
                        backgroundColor: '#5865F2',
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <i className="fa fa-discord"></i> Open Discord
                </a>
            </div>

            <div style={{
                background: '#333',
                padding: '30px',
                borderRadius: '12px',
                maxWidth: '800px',
                width: '100%',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
                <h2 style={{ marginBottom: '20px', color: '#4CAF50' }}>How to Use the Extension</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', textAlign: 'left' }}>
                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '10px' }}>1. Launch</h3>
                        <p style={{ color: '#bbb' }}>Click one of the buttons above to open Telegram or Discord in a new tab.</p>
                    </div>
                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '10px' }}>2. Navigate</h3>
                        <p style={{ color: '#bbb' }}>Open a chat or channel where you want to scan for suspicious messages.</p>
                    </div>
                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '10px' }}>3. Scan</h3>
                        <p style={{ color: '#bbb' }}>Look for the floating <strong>🛡️ Scan Phishing</strong> button and click it.</p>
                    </div>
                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '10px' }}>4. Analyze</h3>
                        <p style={{ color: '#bbb' }}>View the instant analysis report. <strong style={{ color: '#ff4444' }}>Red</strong> means danger, <strong style={{ color: '#4CAF50' }}>Green</strong> means safe.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveMonitor;
