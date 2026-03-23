# 🛡️ SecureLink: Advanced Phishing Detector

![SecureLink Banner](./banner.png)

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel)](https://fyptemplate1-jbw4.vercel.app/)
[![React](https://img.shields.io/badge/Frontend-React-blue?logo=react)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Backend-Python-yellow?logo=python)](https://www.python.org/)
[![Chrome Extension](https://img.shields.io/badge/Tool-Chrome_Extension-orange?logo=google-chrome)](https://developer.chrome.com/docs/extensions)

**SecureLink** is a comprehensive, AI-powered phishing detection system designed to safeguard your communication across multiple platforms including **Gmail, Telegram, and Discord**. By combining real-time monitoring with machine learning, SecureLink provides a robust defense against malicious messages and identity theft.

---

## 🚀 Live Demo
Access the live application here: **[https://fyptemplate1-jbw4.vercel.app/](https://fyptemplate1-jbw4.vercel.app/)**

---

## ✨ Key Features

- **🌐 Multi-Platform Protection:** Real-time monitoring for Gmail, Telegram, and Discord web interfaces.
- **🧠 AI-Driven Analysis:** Uses advanced Natural Language Processing (NLP) and Machine Learning (Logistic Regression with TF-IDF) to detect phishing patterns.
- **🧩 Dedicated Chrome Extension:** A lightweight extension that integrates directly into your browser for seamless, automatic protection.
- **📊 Interactive Dashboard:** Visualize threat levels with custom gauge meters and live threat feeds.
- **📝 Detailed Reporting:** Generate and download comprehensive PDF reports of intercepted threats for further analysis.
- **🔒 Secure Authentication:** JWT-based user authentication system ensuring data privacy and isolated user history.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React.js
- **Visualization:** Chart.js, Custom SVG Gauge Meters
- **Communication:** Socket.io-client
- **Styling:** Modern Vanilla CSS with Glasmorphism effects

### Backend
- **Framework:** Python / Flask
- **AI/ML:** Scikit-learn, TF-IDF Vectorization
- **Database:** MongoDB (Cloud/Local) & MySQL
- **Real-time:** Flask-SocketIO

### Browser Extension
- **API:** Chrome Extension Manifest V3
- **Logic:** Content scripts for DOM extraction and real-time injection of safety status.

---

## 📁 Project Structure

```text
Phishing-Detector/
├── frontend/          # React Application
├── backend/           # Flask API & ML Models
├── extension/         # Chrome Extension source
└── banner.png         # Project Banner
```

---

## ⚙️ Setup & Installation

### Backend
1. Navigate to the `backend/` directory.
2. Create a virtual environment: `python -m venv venv`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Configure your `.env` file with Database and JWT credentials.
5. Run the server: `python app.py`.

### Frontend
1. Navigate to the `frontend/` directory.
2. Install dependencies: `npm install`.
3. Run the development server: `npm start`.

### Chrome Extension
1. Open Chrome and go to `chrome://extensions/`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `extension/` folder.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

---
*Created with ❤️ for a safer digital world.*
