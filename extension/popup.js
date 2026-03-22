document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('username_input');
    const btn = document.getElementById('save_btn');
    
    chrome.storage.local.get(['phishing_username'], (res) => {
        if(res.phishing_username) {
            input.value = res.phishing_username;
        }
    });

    btn.addEventListener('click', () => {
        const val = input.value.trim();
        chrome.storage.local.set({phishing_username: val}, () => {
            btn.innerText = "Saved!";
            setTimeout(() => { btn.innerText = "Save"; }, 2000);
        });
    });
});
