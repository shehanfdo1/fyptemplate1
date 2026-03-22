import React, { useState, useEffect, useRef } from 'react';

const DraggableBot = ({ currentText, onScan, scanResult }) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [expanded, setExpanded] = useState(false);

    // Status: 'safe', 'danger', 'scanning', 'idle'
    const [status, setStatus] = useState('safe');

    useEffect(() => {
        if (scanResult) {
            if (scanResult.prediction.includes('Phishing')) {
                setStatus('danger');
            } else {
                setStatus('safe');
            }
        }
    }, [scanResult]);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
        e.stopPropagation();
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleClick = () => {
        if (!isDragging) {
            setExpanded(!expanded);
        }
    };

    // Styles
    const botStyle = {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: status === 'danger' ? '#ff4444' : '#4CAF50',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '30px',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 10000,
        boxShadow: status === 'danger'
            ? '0 0 20px rgba(255, 68, 68, 0.8)'
            : '0 0 15px rgba(76, 175, 80, 0.6)',
        animation: status === 'danger' ? 'danger-pulse 1s infinite' : 'none',
        border: '3px solid white',
        transition: 'background-color 0.3s'
    };

    const overlayStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#333',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        zIndex: 10001,
        width: '80%',
        maxWidth: '500px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        textAlign: 'center'
    };

    return (
        <>
            <div
                style={botStyle}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                {status === 'danger' ? '🚨' : '🛡️'}
            </div>

            {expanded && (
                <div style={{...overlayStyle, backgroundColor: status === 'danger' ? '#8B0000' : '#1e293b', border: status === 'danger' ? '2px solid #ff4444' : '2px solid #4CAF50'}}>
                    {scanResult && (
                        <div style={{ 
                            marginBottom: '15px', 
                            borderBottom: '1px solid rgba(255,255,255,0.2)', 
                            paddingBottom: '10px', 
                            textAlign: 'left' 
                        }}>
                            <div style={{ fontWeight: '800', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {scanResult.prediction}
                            </div>
                            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                Confidence: <span style={{ fontWeight: 'bold' }}>{scanResult.confidence}</span>
                            </div>
                        </div>
                    )}
                    {scanResult && (
                        <div style={{
                            fontSize: '1.2rem',
                            lineHeight: '1.6',
                            textAlign: 'left',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: 'white'
                        }}>
                            {(() => {
                                const kws = scanResult.keywords || [];
                                const text = currentText || "";
                                if (kws.length === 0) return <span>{text}</span>;
                                
                                const sortedKws = [...kws].sort((a, b) => b.length - a.length);
                                const pattern = sortedKws.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                                const regex = new RegExp(`(${pattern})`, 'gi');
                                
                                const parts = text.split(regex);
                                return parts.map((part, i) => {
                                    const isMatch = sortedKws.some(k => k.toLowerCase() === part.toLowerCase());
                                    if (isMatch) {
                                        return <span key={i} style={{ backgroundColor: '#ff4444', color: 'white', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid white' }}>{part}</span>;
                                    }
                                    return <span key={i}>{part}</span>;
                                });
                            })()}
                        </div>
                    )}
                    <button
                        onClick={() => setExpanded(false)}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: 'transparent',
                            border: '1px solid white',
                            color: 'white',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Close
                    </button>
                </div>
            )}

            <style>{`
                @keyframes danger-pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(255, 68, 68, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
                }
            `}</style>
        </>
    );
};

export default DraggableBot;
