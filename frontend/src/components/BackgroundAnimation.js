import React from 'react';
import '../styles/BackgroundAnimation.css';

// Component for a single thematic background object
const ThematicObject = ({ className, icon }) => (
    <div className={`thematic-object ${className}`}>
        <span className="object-icon">{icon}</span>
    </div>
);

const BackgroundAnimation = () => {
    return (
        <div className="background-animation-container" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            zIndex: 0, // Ensure it is behind content
            pointerEvents: 'none' // Click-through
        }}>
            <ThematicObject className="hook-1" icon="🦠" />
            <ThematicObject className="hook-2 flipped" icon="🦠" />
            <ThematicObject className="hook-3" icon="🦠" />
            <ThematicObject className="hook-4 flipped" icon="🦠" />
            <ThematicObject className="hook-5" icon="🦠" />
        </div>
    );
};

export default BackgroundAnimation;
