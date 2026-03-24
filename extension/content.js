// content.js
console.log("Phishing Detector Helper Loaded v2.4");

const BACKEND_URL = "https://fyptemplate1-1.onrender.com/predict";
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

    // Helper to scrape by selector (Last 1 item only to enforce strict 1-to-1 parsing)
    const scrape = (selector, limit = 1) => {
        let found = "";
        const elements = Array.from(document.querySelectorAll(selector));
        const recent = elements.slice(-limit);

        recent.forEach(el => {
            if (el.offsetParent !== null) {
                // Use innerText but replace hidden breaks/non-space whitespace to prevent split words
                let text = el.innerText.replace(/\s+/g, ' ').trim();
                if (text.length > 2) {
                    found += text + "\n";
                }
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
        content += scrape('.message-text'); // Fallback

        if (!content) {
            content += scrape('div[class*="message"]');
        }
    } else if (hostname.includes('discord.com')) {
        content += scrape('[id^="message-content"]');
        if (!content) content += scrape('div[class*="messageContent"]');
        if (!content) content += scrape('li[class*="messageListItem"] div[class*="markup"]');
    } else if (hostname.includes('mail.google.com')) {
        // Gmail: Target the active email message body specifically
        // We use more specific selectors for the expanded email body to avoid nav noise.
        content += scrape('div[role="listitem"] .a3s.aiL'); 
        content += scrape('.ads .a3s'); // Specific message body
        if (!content) content += scrape('div[data-message-id] .a3s');
        
        // Gmail "Sponsored" or Ads
        if (!content) content += scrape('div[role="article"]');
    }

    // Generic Fallback (Only if specific selectors fail)
    if (!content.trim()) {
        const skipTags = ['nav', 'header', 'footer', 'aside', 'script', 'style'];
        document.querySelectorAll('div, p, span').forEach(el => {
            // Only scrape if it's visible, has decent text, and isn't in a skip tag
            if (el.innerText.length > 20 && el.innerText.length < 2000 && 
                el.offsetParent !== null && 
                !skipTags.some(tag => el.closest(tag))) {
                
                // Exclude common Gmail UI text
                const text = el.innerText.trim();
                const uiJunk = ["Compose", "Inbox", "Starred", "Snoozed", "Sent", "Drafts", "More", "Labels", "Search", "Upgrade", "Try Gemini", "conversation opened", "skip to content"];
                if (!uiJunk.some(j => text.toLowerCase().startsWith(j.toLowerCase()) && text.length < 100)) {
                    content += text + "\n";
                }
            }
        });

        // CRITICAL: If the content is basically just Gmail boilerplate, discard it
        const lower = content.toLowerCase();
        if (lower.includes("skip to content") && lower.includes("none selected")) {
            return ""; // Garbage dump, skip this scan
        }
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
        chrome.storage.local.get(['phishing_username'], async (res) => {
            const username = res.phishing_username || "";
            
            // Critical UX Fix: Prevent anonymous scan routing to User 1
            if (!username.trim()) {
                notifyUser("❌ BOT ERROR: You must enter your SecureLink dashboard username in the Extension Popup first!");
                bot.classList.remove('scanning-pulse');
                return;
            }

            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    url: window.location.href, // Send URL for alerts
                    platform: window.location.hostname.includes('telegram') ? 'Telegram Web' :
                        window.location.hostname.includes('discord') ? 'Discord Web' :
                            window.location.hostname.includes('google') ? 'Gmail' : 'Web Detector',
                    username: username
                })
            });
            const data = await response.json();
    
            updateBotState(data.prediction, data.confidence);
    
            if (isManual || (shouldAutoShowOverlay && !hasAutoShown)) {
                console.log("Showing Overlay. Reason:", isManual ? "Click" : "Deep Link");
                showOverlay(data.prediction, data.confidence, text, data.keywords, data.snippets);
                if (shouldAutoShowOverlay) hasAutoShown = true;
            } else {
                console.log("Suppressing Overlay. Auto-scan detected phishing. updateBotState called.");
            }
        });
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
    
    // Override styling specifically for the bare red dialog request
    if (!isSafe) {
        overlay.style.backgroundColor = '#8B0000'; // Dark red dialog
        overlay.style.border = '2px solid #ff4444';
        overlay.style.boxShadow = '0 10px 30px rgba(255, 0, 0, 0.4)';
    }

    const header = document.createElement('div');
    header.className = 'phishing-overlay-header';
    header.style.cssText = `
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        margin-bottom: 20px; 
        border-bottom: 1px solid rgba(255,255,255,0.2); 
        padding-bottom: 10px;
    `;

    const titleSec = document.createElement('div');
    titleSec.innerHTML = `
        <div style="font-weight: 800; font-size: 1.3rem; text-transform: uppercase; letter-spacing: 1px;">${prediction}</div>
        <div style="font-size: 0.9rem; opacity: 0.9;">Confidence: <span style="font-weight: bold;">${confidence}</span></div>
    `;
    header.appendChild(titleSec);

    const platformBadge = document.createElement('span');
    platformBadge.style.cssText = 'background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold;';
    platformBadge.innerText = window.location.hostname.includes('google') ? 'GMAIL SECURE' : 'SECURELINK';
    header.appendChild(platformBadge);

    overlay.appendChild(header);

    const container = document.createElement('div');
    container.className = 'scanned-text-container';
    container.style.fontSize = '1.1rem';
    container.style.lineHeight = '1.6';

    let displaySnippets = (snippets && snippets.length > 0) ? snippets : [fullText];
    
    // Use snippets from backend, only filtered for extreme junk or length
    let filteredSnippets = displaySnippets.filter(s => {
        if (!s || s.length < 3) return false;
        const lower = s.toLowerCase();
        // Only remove absolute garbage that slipped through backend
        const isGarbage = /^\d{1,2}:\d{2}$/.test(lower.trim()) || 
                         (lower.includes('kb') && lower.match(/\d+ kb/));
        return !isGarbage;
    });

    if (filteredSnippets.length === 0) filteredSnippets = [fullText.substring(0, 300) + "..."];

    const sortedKws = (keywords || []).filter(k => k && k.length > 1).sort((a, b) => b.length - a.length);

    filteredSnippets.forEach((snippet, idx) => {
        const snippetDiv = document.createElement('div');
        snippetDiv.className = 'phish-snippet';
        
        try {
            // Highlight Keywords using DOM safe methods
            if (sortedKws.length > 0) {
                let lastIdx = 0;
                // Escape regex special chars and join
                const kwPattern = sortedKws.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                
                if (kwPattern.trim()) {
                    const regex = new RegExp(`(${kwPattern})`, 'gi');
                    let match;
                    let safetyCounter = 0;
                    
                    while ((match = regex.exec(snippet)) !== null && safetyCounter < 500) {
                        safetyCounter++;
                        // Prevent infinite loop on zero-width matches
                        if (match.index === regex.lastIndex) {
                            regex.lastIndex++;
                        }
                        
                        snippetDiv.appendChild(document.createTextNode(snippet.substring(lastIdx, match.index)));
                        const span = document.createElement('span');
                        span.style.cssText = 'background: #ff4444; color: white; padding: 2px 4px; border-radius: 4px; font-weight: bold; border: 1px solid white;';
                        span.innerText = match[0];
                        snippetDiv.appendChild(span);
                        lastIdx = regex.lastIndex;
                    }
                    snippetDiv.appendChild(document.createTextNode(snippet.substring(lastIdx)));
                } else {
                    snippetDiv.innerText = snippet;
                }
            } else {
                snippetDiv.innerText = snippet;
            }
        } catch (e) {
            console.error("Highlighting error:", e);
            snippetDiv.innerText = snippet;
        }

        container.appendChild(snippetDiv);
        if (idx < filteredSnippets.length - 1) {
            const hr = document.createElement('hr');
            hr.style.cssText = "border: 0; border-top: 1px dashed rgba(255,255,255,0.3); margin: 15px 0;";
            container.appendChild(hr);
        }
    });

    overlay.appendChild(container);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-alert-btn';
    closeBtn.id = 'close-overlay-btn';
    closeBtn.innerText = 'Close';
    closeBtn.onclick = () => overlay.remove();
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
}

