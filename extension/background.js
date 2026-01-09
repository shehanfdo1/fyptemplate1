// background.js
console.log("Background Service Worker Loaded");

const BACKEND_URL = "http://localhost:5000/predict";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanText") {
        console.log("Received text to scan, length:", request.text.length);

        fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: request.text })
        })
            .then(response => response.json())
            .then(data => {
                console.log("Prediction received:", data);
                sendResponse({ success: true, data: data });
            })
            .catch(error => {
                console.error("Fetch error:", error);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keep channel open for async response
    }
});
