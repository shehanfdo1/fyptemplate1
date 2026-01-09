// content.js
console.log("Phishing Detector Helper Loaded");

const BACKEND_URL = "http://localhost:5000/predict";

// --- UI Injection ---
function injectButton() {
    if (document.getElementById('phishing-scan-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'phishing-scan-btn';
    btn.className = 'phishing-scan-btn';
    btn.innerText = '🛡️ Scan Phishing';
    btn.onclick = handleScan;

    document.body.appendChild(btn);
}

// Run injection periodically to handle SPA navigation
setInterval(injectButton, 2000);

// --- Scraping Logic ---
function getChatContent() {
    let content = "";
    const hostname = window.location.hostname;

    // Helper to scrape by selector
    const scrape = (selector) => {
        let found = "";
        document.querySelectorAll(selector).forEach(el => {
            // Avoid scraping hidden elements
            if (el.offsetParent !== null) {
                found += el.innerText + "\n";
            }
        });
        return found;
    };

    if (hostname.includes('telegram.org')) {
        // Broad strategies for Web K and Web A
        // Web K: .message .text-content
        // Web A: .text-content, .message
        content += scrape('.message .text-content');
        content += scrape('.text-content');
        if (!content) content += scrape('.message'); // Fallback to entire message bubble

    } else if (hostname.includes('discord.com')) {
        // Discord: Message content usually has ID starting with message-content
        content += scrape('[id^="message-content"]');

        // Fallback: Common discord message classes
        if (!content) content += scrape('div[class*="messageContent"]');
        if (!content) content += scrape('li[class*="messageListItem"] div[class*="markup"]');
    }

    // Generic Fallback: If still empty, try to get main chat containers
    if (!content.trim()) {
        console.log("Specific selectors failed. Trying generic scraping...");
        // Fallback for any page: Get paragraphs and divs with substantial text
        document.querySelectorAll('p, div').forEach(el => {
            // Heuristic: If it has reasonable length and looks like a message
            if (el.innerText.length > 5 && el.innerText.length < 1000 && el.offsetParent !== null) {
                content += el.innerText + "\n";
            }
        });
    }

    return content.trim();
}

// --- Action Logic ---
async function handleScan() {
    const btn = document.getElementById('phishing-scan-btn');
    btn.classList.add('scanning');
    btn.innerText = 'Scanning...';

    const text = getChatContent();

    if (!text) {
        alert("No visible text found to scan!");
        resetButton(btn);
        return;
    }

    console.log("Sending text to background, length:", text.length);

    // Timeout Promise to prevent infinite hanging
    const timeout = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error("Request timed out")), 10000);
    });

    // Send Message Promise
    const sendMessage = new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage({ action: "scanText", text: text }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response ? response.error : "Unknown backend error"));
                }
            });
        } catch (err) {
            reject(err);
        }
    });

    try {
        const response = await Promise.race([sendMessage, timeout]);
        showOverlay(response.data.prediction, response.data.confidence);
    } catch (error) {
        console.error("Scan Error:", error);
        alert("Scan Failed: " + error.message + "\n\nTip: Try refreshing the page if the extension was just reloaded.");
    } finally {
        resetButton(btn);
    }
}

function resetButton(btn) {
    btn.classList.remove('scanning');
    btn.innerText = '🛡️ Scan Phishing';
}

function showOverlay(prediction, confidence) {
    // Remove existing
    const existing = document.getElementById('phishing-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'phishing-alert-overlay';

    const isSafe = prediction.includes("Safe");
    overlay.className = `phishing-alert-overlay ${isSafe ? 'safe-alert-overlay' : ''}`;

    overlay.innerHTML = `
        <h2>${isSafe ? '✅ SAFE' : '🚨 PHISHING DETECTED'}</h2>
        <p>Confidence: ${confidence}</p>
        <button class="close-alert-btn" onclick="document.getElementById('phishing-alert-overlay').remove()">Close</button>
    `;

    document.body.appendChild(overlay);
}
