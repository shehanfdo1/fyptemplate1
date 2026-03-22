import React, { useState, useEffect } from 'react';
import config from '../config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import GaugeMeter from '../components/GaugeMeter';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true); // Provide visual feedback for refresh
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${config.API_BASE_URL}/api/report/data`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                // Add a small delay so the user "sees" the refresh happen
                setTimeout(() => {
                    setReports(data.reports || []);
                    setLoading(false);
                }, 600);
            } else {
                console.error("Failed to fetch reports");
                setLoading(false);
            }
        } catch (error) {
            console.error("Error connecting to server:", error);
            setLoading(false);
        }
    };

    const calculateLatestRisk = () => {
        if (reports.length === 0) return { score: 0, label: "Awaiting Data" };
        const latest = reports[0];
        
        let confValue = 95;
        if (latest.confidence) {
            const match = latest.confidence.match(/[\d.]+/);
            if (match) confValue = parseFloat(match[0]);
        }

        if (latest.prediction && latest.prediction.includes("Safe")) {
            return { score: Math.max(0, 100 - confValue), label: "Legit Message" };
        } else if (latest.prediction && latest.prediction.includes("Suspicious")) {
            return { score: 35 + (confValue * 0.35), label: "Suspicious Message" };
        } else {
            return { score: Math.max(75, confValue), label: "Phishing Detected" };
        }
    };

    const handleDownloadPDF = () => {
        if (reports.length === 0) {
            alert("No data available to download.");
            return;
        }

        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(18);
        doc.text("Phishing Detection Report", 14, 22);

        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Total Threats Logged: ${reports.length}`, 14, 36);

        // Prepare Table Data
        const tableColumn = ["Platform", "Timestamp", "Prediction", "Confidence"];
        const tableRows = [];

        reports.forEach(report => {
            const rowData = [
                report.platform || "Unknown",
                report.timestamp ? new Date(report.timestamp).toLocaleString() : "N/A",
                report.prediction || "",
                report.confidence || ""
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            startY: 45,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [220, 38, 38] }, // Red header
            styles: { fontSize: 10 }
        });

        const detailedDoc = new jsPDF('l'); // Landscape for more room
        detailedDoc.setFontSize(18);
        detailedDoc.text("Global Phishing Detection Report", 14, 22);
        detailedDoc.setFontSize(11);
        detailedDoc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const detailedCols = ["Platform", "Timestamp", "Severity", "Detected Content"];
        const detailedRows = reports.map(r => [
            r.platform,
            r.timestamp ? new Date(r.timestamp).toLocaleString() : "",
            `${r.prediction}\n(${r.confidence})`,
            (r.content || "").replace(/\n/g, ' ').substring(0, 150) + "..."
        ]);

        autoTable(detailedDoc, {
            startY: 40,
            head: [detailedCols],
            body: detailedRows,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 40 },
                2: { cellWidth: 40 },
                3: { cellWidth: 'auto' } // Content takes rest of space
            }
        });

        detailedDoc.save("Phishing_Report_Full.pdf");
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
            marginTop: '80px',
            paddingBottom: '50px'
        }}>
            <h1 style={{ fontSize: '3rem', margin: '0 0 10px 0', background: 'linear-gradient(90deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Global Phishing Reports
            </h1>
            <p style={{ fontSize: '1.2rem', margin: '0 0 40px 0', color: '#ccc', maxWidth: '800px' }}>
                A persistent log of all malicious messages intercepted across Telegram, Discord, and Gmail.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '40px' }}>
                <button onClick={handleDownloadPDF} style={{ padding: '14px 28px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 'bold', border: '2px solid #ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s', fontSize: '1.1rem' }}
                    onMouseOver={e => {e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1.05)'}}
                    onMouseOut={e => {e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'scale(1)'}}
                >
                    📄 Download Full Phishing Report (PDF)
                </button>
            </div>
            
            <div style={{ 
                display: 'flex', 
                flexDirection: 'row', 
                gap: '60px', 
                width: '100%', 
                maxWidth: '95%',
                alignItems: 'flex-start',
                justifyContent: 'center',
                flexWrap: 'wrap-reverse'
            }}>
                {/* Left Side: Table Wrap */}
                <div style={{ flex: '1 1 800px', display: 'flex', flexDirection: 'column', minWidth: '400px' }}>
                    <div style={{ width: '100%', background: '#1e293b', borderRadius: '12px', padding: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.6)', overflowX: 'auto', border: '1px solid #334155' }}>
                        {loading ? (
                            <p>Loading reports...</p>
                        ) : reports.length === 0 ? (
                            <div style={{ padding: '40px', color: '#94a3b8' }}>
                                <h3>No Threats Detected (Yet)</h3>
                                <p>Keep your Live Monitor and Extension active to catch phishing attempts.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8' }}>
                                        <th style={{ padding: '12px' }}>Platform</th>
                                        <th style={{ padding: '12px' }}>Date</th>
                                        <th style={{ padding: '12px' }}>Severity</th>
                                        <th style={{ padding: '12px' }}>Message Snippet</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((report, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #334155', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#0f172a'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#60a5fa' }}>{report.platform}</td>
                                            <td style={{ padding: '12px', color: '#cbd5e1' }}>{new Date(report.timestamp).toLocaleString()}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                    {report.confidence}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', color: '#cbd5e1', fontSize: '0.9rem', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {report.content}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Right Side: Animated Concentric Gauge */}
                <div style={{ flex: '0 0 350px', display: 'flex', justifyContent: 'center' }}>
                    <GaugeMeter {...calculateLatestRisk()} onReload={fetchReports} />
                </div>
            </div>
        </div>
    );
};

export default Reports;
