import React from 'react';
import { Link } from 'react-router-dom';

const ExtensionSetup = () => {
    return (
        <div style={{
            padding: '40px 20px',
            maxWidth: '800px',
            margin: '0 auto',
            color: '#fff',
            textAlign: 'left'
        }}>
            <Link to="/live" style={{ textDecoration: 'none', color: '#4ade80', marginBottom: '20px', display: 'inline-block' }}>
                &larr; Back to Live Monitor
            </Link>

            <h1 style={{ fontSize: '2.5rem', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                How to Install the SecureLink Extension
            </h1>

            <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155' }}>

                {/* Step 1 */}
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ color: '#4ade80' }}>Step 1: Download & Unzip</h2>
                    <p style={{ fontSize: '1.1rem', color: '#ccc', lineHeight: '1.6' }}>
                        Click the "Download Browser Extension" button on the previous page.
                        <br />
                        <strong>Important:</strong> You must <strong style={{ color: '#fff' }}>Unzip (Extract)</strong> the downloaded file. You should see a folder containing files like <code>manifest.json</code>.
                    </p>
                </div>

                {/* Step 2 */}
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ color: '#3b82f6' }}>Step 2: Open Extensions Page</h2>
                    <p style={{ fontSize: '1.1rem', color: '#ccc', lineHeight: '1.6' }}>
                        Open your Chrome (or Brave/Edge) browser and navigate to the extensions management page:
                        <br /><br />
                        <code style={{ background: '#000', padding: '5px 10px', borderRadius: '4px' }}>chrome://extensions</code>
                        <br /><br />
                        (Or click the Puzzle icon 🧩 &rarr; Manage Extensions).
                    </p>
                </div>

                {/* Step 3 */}
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ color: '#f59e0b' }}>Step 3: Enable Developer Mode</h2>
                    <p style={{ fontSize: '1.1rem', color: '#ccc', lineHeight: '1.6' }}>
                        Look at the <strong>top right corner</strong> of the Extensions page.
                        <br />
                        Toggle the switch labeled <strong>"Developer mode"</strong> to ON.
                    </p>
                </div>

                {/* Step 4 */}
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ color: '#ec4899' }}>Step 4: Load Unpacked</h2>
                    <p style={{ fontSize: '1.1rem', color: '#ccc', lineHeight: '1.6' }}>
                        Click the button that appears in the top left called <strong>"Load unpacked"</strong>.
                        <br />
                        Select the <strong>folder</strong> you unzipped in Step 1.
                    </p>
                </div>

                {/* Step 5 */}
                <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', border: '1px solid #4ade80' }}>
                    <h3 style={{ margin: 0, color: '#4ade80' }}>🎉 You're Done!</h3>
                    <p style={{ margin: '10px 0 0 0', color: '#ddd' }}>
                        The <strong>SecureLink</strong> icon should now appear in your browser toolbar.
                        Pin it and try opening Telegram or Gmail to see it in action!
                    </p>
                </div>

            </div>
        </div>
    );
};

export default ExtensionSetup;
