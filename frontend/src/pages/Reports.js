import React, { useState, useEffect } from 'react';
import config from '../config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${config.API_BASE_URL}/api/report/data`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports || []);
            } else {
                console.error("Failed to fetch reports");
            }
        } catch (error) {
            console.error("Error connecting to server:", error);
        } finally {
            setLoading(false);
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
            textAlign: 'center',
            marginTop: '80px',
            paddingBottom: '50px'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '10px', background: 'linear-gradient(90deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Global Phishing Reports
            </h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '30px', color: '#ccc', maxWidth: '600px' }}>
                A persistent log of all malicious messages intercepted across Telegram, Discord, and Gmail.
            </p>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <button
                    onClick={fetchReports}
                    style={{ padding: '10px 20px', borderRadius: '6px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                    🔄 Refresh Data
                </button>
                <button
                    onClick={handleDownloadPDF}
                    style={{ padding: '10px 20px', borderRadius: '6px', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    📄 Download PDF Report
                </button>
            </div>

            <div style={{ width: '100%', maxWidth: '1000px', background: '#1e293b', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflowX: 'auto' }}>
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
    );
};

export default Reports;
