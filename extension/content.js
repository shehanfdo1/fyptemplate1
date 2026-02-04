// content.js
console.log("Phishing Detector Helper Loaded v2.4");

const BACKEND_URL = "http://localhost:5000/predict";
let isScanning = false;
let lastScannedText = "";
let debounceTimer = null;

// Deep Linking Check
const shouldAutoShowOverlay = window.location.href.includes('phishing_show=true');
let hasAutoShown = false;

// Clean the URL so a refresh doesn't trigger it again
if (shouldAutoShowOverlay) {
    const newUrl = window.location.href.replace(/[?&]phishing_show=true/, '');
    window.history.replaceState({}, document.title, newUrl);
    console.log("Detected deep link, cleaning URL to:", newUrl);
}

// --- UI Injection: Draggable Bot ---
function injectDraggableBot() {
    if (document.getElementById('phishing-bot-overlay')) return;

    const bot = document.createElement('div');
    bot.id = 'phishing-bot-overlay';
    bot.className = 'draggable-bot safe-state'; // Default Safe
    bot.innerHTML = `
        <div class="bot-icon">🛡️</div>
        <div class="bot-status-indicator"></div>
    `;

    // Drag Logic
    let isMouseDown = false;
    let hasMoved = false;
    let startX, startY, initialLeft, initialTop;

    bot.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = bot.offsetLeft;
        initialTop = bot.offsetTop;
        bot.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Only consider it a move if moved more than 3 pixels (prevents jitter clicks)
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
            bot.style.left = `${initialLeft + dx}px`;
            bot.style.top = `${initialTop + dy}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isMouseDown = false;
        bot.style.cursor = 'grab';
    });

    // Click to scan/show details
    bot.addEventListener('click', (e) => {
        if (hasMoved) return; // Prevent click after drag
        // Just show current status or force re-scan
        handleScan(true);
    });

    document.body.appendChild(bot);
}

// Run injection periodically to handle SPA navigation
setInterval(injectDraggableBot, 2000);
setInterval(scanLobby, 3000); // Check lobby every 3 seconds

// --- Automation Logic ---
const observer = new MutationObserver((mutations) => {
    // Debounce to prevent spamming backend on every character type
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        handleScan(false); // Auto-scan
    }, 1500);
});

// Start observing chat container when available
function startObserving() {
    // Telegram Web K/A specific selectors for chat area
    const chatContainer = document.querySelector('.chat-input-main') || document.querySelector('.bubbles-group') || document.body;
    if (chatContainer) {
        observer.observe(chatContainer, { childList: true, subtree: true, characterData: true });
    }
}
// Try to attach observer periodically
setInterval(startObserving, 5000);


// --- Scraping Logic ---
function getChatContent() {
    let content = "";
    const hostname = window.location.hostname;

    // Helper to scrape by selector (Last N items only to avoid old history)
    const scrape = (selector, limit = 5) => {
        let found = "";
        const elements = Array.from(document.querySelectorAll(selector));
        // Take only the last 'limit' elements (most recent messages)
        const recent = elements.slice(-limit);

        recent.forEach(el => {
            if (el.offsetParent !== null) {
                found += el.innerText + "\n";
            }
        });
        return found;
    };

    if (hostname.includes('telegram.org')) {
        // Telegram Web K/A Selectors
        content += scrape('.message .text-content');
        content += scrape('.text-content'); // Generic text wrapper
        content += scrape('.message-content-text'); // Web A
        content += scrape('.bubbles-group .message'); // Web K group

        if (!content) {
            // Deep fallback
            content += scrape('div[class*="message"]');
        }
    } else if (hostname.includes('discord.com')) {
        content += scrape('[id^="message-content"]');
        if (!content) content += scrape('div[class*="messageContent"]');
        if (!content) content += scrape('li[class*="messageListItem"] div[class*="markup"]');
    } else if (hostname.includes('mail.google.com')) {
        // Gmail Selectors
        content += scrape('.a3s.aiL'); // Open email body
        content += scrape('.ii.gt');   // Message wrapper
        if (!content) content += scrape('div[role="listitem"]'); // Fallback
    }

    // Generic Fallback
    if (!content.trim()) {
        document.querySelectorAll('p, div').forEach(el => {
            if (el.innerText.length > 5 && el.innerText.length < 1000 && el.offsetParent !== null) {
                content += el.innerText + "\n";
            }
        });
    }

    return content.trim();
}

// --- Action Logic ---
async function handleScan(isManual = false) {
    const text = getChatContent();

    // valid text?
    if (!text || text.length < 5) return;

    // Optimization: Don't rescan exact same text unless manual click
    if (!isManual && text === lastScannedText) return;
    lastScannedText = text;

    const bot = document.getElementById('phishing-bot-overlay');

    if (bot) bot.classList.add('scanning-pulse');

    console.log("Auto-scanning text length:", text.length);

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                url: window.location.href, // Send URL for alerts
                platform: window.location.hostname.includes('telegram') ? 'Telegram Web' :
                    window.location.hostname.includes('discord') ? 'Discord Web' :
                        window.location.hostname.includes('google') ? 'Gmail' : 'Web Detector'
            })
        });
        const data = await response.json();

        updateBotState(data.prediction, data.confidence);

        // If Manual Click -> Show Overlay
        // If Auto-Scan -> DO NOT Show Overlay (suppress), just update icon (already done above)
        // The Backend will handle sending the socket alert to the dashboard
        // If Manual Click -> Show Overlay
        // If Deep Link (Monitor) -> Show Overlay (One-time)
        // If Auto-Scan -> DO NOT Show Overlay
        if (isManual || (shouldAutoShowOverlay && !hasAutoShown)) {
            console.log("Showing Overlay. Reason:", isManual ? "Click" : "Deep Link");
            showOverlay(data.prediction, data.confidence, text, data.keywords, data.snippets);
            if (shouldAutoShowOverlay) hasAutoShown = true;
        } else {
            console.log("Suppressing Overlay. Auto-scan detected phishing. updateBotState called.");
        }

        // Removed local toast usage for auto-scans as requested ("do not display... until click")
    } catch (error) {
        console.error("Scan Error:", error);
    } finally {
        if (bot) bot.classList.remove('scanning-pulse');
    }
}

function updateBotState(prediction, confidence) {
    const bot = document.getElementById('phishing-bot-overlay');
    if (!bot) return;

    bot.classList.remove('safe-state', 'danger-state');

    if (prediction.includes("Safe")) {
        bot.classList.add('safe-state');
        bot.querySelector('.bot-icon').innerText = '🛡️';
    } else if (prediction.includes("Suspicious")) {
        bot.classList.add('suspicious-state');
        bot.querySelector('.bot-icon').innerText = '⚠️';
    } else {
        bot.classList.add('danger-state');
        bot.querySelector('.bot-icon').innerText = '🚨';
    }
}

function notifyUser(msg) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'phishing-toast-alert';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}


// --- Lobby Scanning Logic ---
function scanLobby() {
    // Only implemented for Telegram Web K for demo proof-of-concept
    // Look for chat list items
    const chatItems = document.querySelectorAll('.chat-list .chat-item, .sidebar-left .chat-list a');

    chatItems.forEach(item => {
        if (item.getAttribute('data-scanned') === 'true') return;

        const lastMsg = item.querySelector('.last-message, .subtitle, .short-message');
        if (lastMsg) {
            const text = lastMsg.innerText;
            // Quick heuristic scan or request backend? 
            // For performance, let's look for known keywords from local storage if possible, 
            // or just flag suspicous links http/https

            // NOTE: Full backend scan for every lobby item is expensive. 
            // We'll mark it if it contains "http" for now as a "Check This" warning
            if (text.includes('http') || text.includes('www') || text.toLowerCase().includes('login')) {
                const badge = document.createElement('span');
                badge.className = 'lobby-alert-mark';
                badge.innerText = '⚠️';
                badge.title = 'Contains link or keyword - Be Careful';
                item.appendChild(badge);
            }
            item.setAttribute('data-scanned', 'true');
        }
    });
}


// Updated signature to accept snippets
function showOverlay(prediction, confidence, fullText, keywords, snippets) {
    // Remove existing
    const existing = document.getElementById('phishing-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'phishing-alert-overlay';

    const isSafe = prediction.includes("Safe");
    const isSuspicious = prediction.includes("Suspicious");

    let overlayClass = "";
    if (isSafe) overlayClass = "safe-alert-overlay";
    else if (isSuspicious) overlayClass = "suspicious-alert-overlay";

    overlay.className = `phishing-alert-overlay ${overlayClass}`;

    // Highlight Keywords Logic
    const escapeHtml = (unsafe) => {
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    let contentHtml = "";

    // Specific Snippets Logic
    if (snippets && snippets.length > 0) {
        contentHtml = snippets.map(snippet => {
            let processed = escapeHtml(snippet);
            if (keywords) {
                keywords.forEach(kw => {
                    const regex = new RegExp(`(${kw})`, 'gi');
                    processed = processed.replace(regex, '<span class="highlight-phish">$1</span>');
                });
            }
            return `<div class="phish-snippet">${processed}</div>`;
        }).join('<hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.2); margin: 10px 0;">');
    } else {
        // Fallback to full text
        contentHtml = escapeHtml(fullText || "");
        if (keywords) {
            keywords.forEach(kw => {
                const regex = new RegExp(`(${kw})`, 'gi');
                contentHtml = contentHtml.replace(regex, '<span class="highlight-phish">$1</span>');
            });
        }
    }

    let title = "🚨 PHISHING DETECTED";
    if (isSafe) title = "✅ SAFE";
    else if (isSuspicious) title = "⚠️ SUSPICIOUS";

    overlay.innerHTML = `
        <h2>${title}</h2>
        <p>Confidence: ${confidence}</p>
        <div class="scanned-text-container">
            <strong>Suspicious Content:</strong><br>
            ${contentHtml}
        </div>
        <button class="close-alert-btn" id="close-overlay-btn">Close</button>
    `;

    document.body.appendChild(overlay);
    document.getElementById('close-overlay-btn').onclick = () => overlay.remove();
}
