import React, { useEffect, useState } from 'react';

const GaugeMeter = ({ score, label, onReload }) => {
    const [animatedScore, setAnimatedScore] = useState(0);
    const [isReloading, setIsReloading] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setAnimatedScore(isReloading ? 0 : score);
        }, 100);
        return () => clearTimeout(timeout);
    }, [score, isReloading]);

    const handleReload = () => {
        setIsReloading(true);
        onReload();
        // Reset the reloading state after a short delay
        setTimeout(() => setIsReloading(false), 800);
    };

    const clampedScore = Math.min(Math.max(animatedScore, 0), 100);
    const rotation = (clampedScore / 100) * 180 - 90;

    let textColor = '#4ade80'; 
    if (clampedScore >= 35 && clampedScore < 75) textColor = '#facc15'; 
    if (clampedScore >= 75) textColor = '#ef4444'; 

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', 
            background: 'rgba(30, 41, 59, 0.7)', borderRadius: '15px', 
            padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.05)', width: '350px'
        }}>
            <div style={{ position: 'relative', width: '300px', height: '170px' }}>
                <svg width="300" height="170" viewBox="0 0 300 170" style={{ overflow: 'visible' }}>
                    {/* Faded Background Tracks */}
                    <path d="M 20 150 A 130 130 0 0 1 280 150" fill="none" stroke="#ffffff" strokeWidth="20" opacity="0.05" />
                    <path d="M 50 150 A 100 100 0 0 1 250 150" fill="none" stroke="#ffffff" strokeWidth="20" opacity="0.05" />
                    <path d="M 80 150 A 70 70 0 0 1 220 150" fill="none" stroke="#ffffff" strokeWidth="20" opacity="0.05" />

                    {/* Concentric Colored Bands exactly like the image upload */}
                    <path d="M 20 150 A 130 130 0 0 1 280 150" fill="none" stroke="#ef4444" strokeWidth="20" pathLength="100" strokeDasharray="100 100" strokeLinecap="butt" />
                    <path d="M 50 150 A 100 100 0 0 1 250 150" fill="none" stroke="#facc15" strokeWidth="20" pathLength="100" strokeDasharray="75 100" strokeLinecap="butt" />
                    <path d="M 80 150 A 70 70 0 0 1 220 150" fill="none" stroke="#4ade80" strokeWidth="20" pathLength="100" strokeDasharray="40 100" strokeLinecap="butt" />
                    
                    {/* Animated Needle Group */}
                    <g style={{ transformOrigin: '150px 150px', transform: `rotate(${rotation}deg)`, transition: 'transform 1s cubic-bezier(0.22, 1, 0.36, 1)' }}>
                        <polygon points="146,138 154,138 150,20" fill="#3b82f6" />
                        <circle cx="150" cy="150" r="12" fill="#1e293b" stroke="#3b82f6" strokeWidth="5" />
                    </g>
                </svg>

                {/* Scope limits */}
                <div style={{ position: 'absolute', bottom: '10px', left: '0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>0%</div>
                <div style={{ position: 'absolute', bottom: '10px', right: '0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>100%</div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center', width: '100%' }}>
                <h3 style={{ margin: 0, fontSize: '2.5rem', color: textColor, textShadow: '0 2px 10px rgba(0,0,0,0.5)', transition: 'color 1s' }}>
                    {isReloading ? "..." : `${Math.round(animatedScore)}%`}
                </h3>
                <p style={{ margin: '5px 0 20px 0', fontWeight: 'bold', color: '#e2e8f0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {isReloading ? "Refreshing Data" : label}
                </p>
                <button 
                    onClick={handleReload}
                    disabled={isReloading}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        width: '100%', padding: '14px', background: isReloading ? '#1d4ed8' : '#3b82f6', color: 'white', 
                        border: 'none', borderRadius: '8px', cursor: isReloading ? 'not-allowed' : 'pointer', fontSize: '1rem',
                        fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                        opacity: isReloading ? 0.8 : 1
                    }}
                    onMouseOver={e => !isReloading && (e.currentTarget.style.background = '#2563eb')}
                    onMouseOut={e => !isReloading && (e.currentTarget.style.background = '#3b82f6')}
                >
                    <svg className={isReloading ? 'spin-anim' : ''} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.5s' }}>
                        <path d="M21 2v6h-6"></path>
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    </svg>
                    {isReloading ? 'Refreshing...' : 'Refresh Meter'}
                </button>
                <style>{`
                    .spin-anim {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default GaugeMeter;
