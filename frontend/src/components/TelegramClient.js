import React, { useState, useEffect } from 'react';
import { TelegramClient, Api } from "telegram"; // Import Api
import { StringSession } from "telegram/sessions";
import DraggableBot from './DraggableBot';
import { Buffer } from 'buffer';
import config from '../config';

// Polyfill Buffer for browser
window.Buffer = Buffer;

// HARDCODED CREDENTIALS (PROVIDED BY USER)
const API_ID = 36815539;
const API_HASH = "5606438bebe24a0d1e7af5e099b77ab0";

const TelegramClientInternal = () => {
    const [client, setClient] = useState(null);
    const [step, setStep] = useState('phone'); // phone, code, password, chat
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [phoneCodeHash, setPhoneCodeHash] = useState(''); // Store the hash!
    const [password, setPassword] = useState('');
    const [dialogs, setDialogs] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);

    // Bot Props
    const [currentScanText, setCurrentScanText] = useState("");
    const [scanResult, setScanResult] = useState(null);

    // Initialize Client
    useEffect(() => {
        const initClient = async () => {
            const storedSession = localStorage.getItem('telegramSession') || "";
            const session = new StringSession(storedSession);

            try {
                const newClient = new TelegramClient(session, API_ID, API_HASH, {
                    connectionRetries: 5,
                });

                await newClient.connect();
                setClient(newClient);

                // Check if authorized
                if (await newClient.checkAuthorization()) {
                    setStep('chat');
                    loadDialogs(newClient);
                }
            } catch (e) {
                console.error("Init Error:", e);
            }
        };
        initClient();
    }, []);

    const handleSendPhone = async () => {
        if (!phone) {
            alert("Please enter a phone number.");
            return;
        }
        try {
            // sendCode returns { phoneCodeHash, isCodeViaApp }
            const result = await client.sendCode(
                {
                    apiId: API_ID,
                    apiHash: API_HASH,
                },
                String(phone)
            );
            setPhoneCodeHash(result.phoneCodeHash);
            setStep('code');
        } catch (e) {
            console.error("Send Code Error:", e);
            alert("Error sending code: " + e.message);
        }
    };

    const handleLogin = async () => {
        if (!code) {
            alert("Please enter the code.");
            return;
        }
        try {
            // FIX: Use Direct Invoke instead of non-existent client.signIn
            await client.invoke(new Api.auth.SignIn({
                phoneNumber: String(phone),
                phoneCodeHash: phoneCodeHash,
                phoneCode: String(code),
            }));

            // Save session
            localStorage.setItem('telegramSession', client.session.save());
            setStep('chat');
            loadDialogs(client);
        } catch (e) {
            console.error("Login Error:", e);
            if (e.errorMessage === "SESSION_PASSWORD_NEEDED") {
                setStep('password');
            } else {
                alert("Login Error: " + (e.message || e.errorMessage));
            }
        }
    };

    const handlePassword = async () => {
        try {
            await client.signInWithPassword(
                { apiId: API_ID, apiHash: API_HASH },
                {
                    password: () => password,
                    onError: (e) => { throw e; }
                }
            );
            localStorage.setItem('telegramSession', client.session.save());
            setStep('chat');
            loadDialogs(client);
        } catch (e) {
            alert("Password Error: " + e.message);
        }
    };

    const loadDialogs = async (tc) => {
        const dialogs = await tc.getDialogs({ limit: 15 });
        setDialogs(dialogs);
    };

    const selectChat = async (chat) => {
        setSelectedChat(chat);
        setMessages([]);
        const msgs = await client.getMessages(chat.id, { limit: 20 });

        const recentText = msgs.slice(0, 5).map(m => m.message).join('\n');
        setCurrentScanText(recentText);
        setMessages(msgs);

        scanText(recentText);
    };

    const scanText = async (text) => {
        if (!text || text.length < 5) return;

        try {
            const response = await fetch(`${config.API_BASE_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await response.json();
            setScanResult(data);
        } catch (e) {
            console.error("Scan failed", e);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('telegramSession');
        if (client) {
            // client.disconnect();
        }
        setClient(null);
        window.location.reload(); // Quick reset
    };

    // UI Renderers
    if (step !== 'chat') {
        return (
            <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Login to Telegram</h2>
                </div>
                <p>Login securely to enable the bot inside this dashboard.</p>

                {step === 'phone' && (
                    <>
                        <input
                            placeholder="+1234567890"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
                        />
                        <button onClick={handleSendPhone} style={{ padding: '10px 20px', cursor: 'pointer' }}>Send Code</button>
                    </>
                )}

                {step === 'code' && (
                    <>
                        <p>Code sent to {phone}</p>
                        <input
                            placeholder="Enter Code"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
                        />
                        <button onClick={handleLogin} style={{ padding: '10px 20px', cursor: 'pointer' }}>Login</button>
                    </>
                )}

                {step === 'password' && (
                    <>
                        <p>Total 2FA enabled</p>
                        <input
                            type="password"
                            placeholder="2FA Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
                        />
                        <button onClick={handlePassword} style={{ padding: '10px 20px', cursor: 'pointer' }}>Submit Password</button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '80vh', border: '1px solid #444', borderRadius: '10px', overflow: 'hidden' }}>
            {/* Sidebar */}
            <div style={{ width: '300px', background: '#222', overflowY: 'auto' }}>
                <div style={{ padding: '10px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>Chats</span>
                    <button onClick={handleLogout} style={{ fontSize: '0.8em', background: '#d33', border: 'none', color: 'white', padding: '5px', borderRadius: '3px', cursor: 'pointer' }}>Logout</button>
                </div>
                {dialogs.map(d => (
                    <div
                        key={d.id}
                        onClick={() => selectChat(d)}
                        style={{
                            padding: '15px',
                            borderBottom: '1px solid #333',
                            cursor: 'pointer',
                            background: selectedChat?.id === d.id ? '#333' : 'transparent'
                        }}
                    >
                        <strong>{d.title}</strong>
                        <div style={{ fontSize: '0.8em', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.message?.message}
                        </div>
                    </div>
                ))}
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, background: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
                {!selectedChat ? (
                    <div style={{ margin: 'auto', color: '#666' }}>Select a chat to start scanning</div>
                ) : (
                    <>
                        <div style={{ padding: '15px', background: '#222', borderBottom: '1px solid #333' }}>
                            <h3>{selectedChat.title}</h3>
                        </div>

                        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                            {messages.slice().reverse().map(m => (
                                <div key={m.id} style={{
                                    background: m.out ? '#2b5278' : '#182533',
                                    borderRadius: '10px',
                                    padding: '10px',
                                    marginBottom: '10px',
                                    maxWidth: '70%',
                                    alignSelf: m.out ? 'flex-end' : 'flex-start',
                                    marginLeft: m.out ? 'auto' : '0'
                                }}>
                                    {m.message}
                                </div>
                            ))}
                        </div>

                        {/* THE DRAGGABLE BOT */}
                        <DraggableBot
                            currentText={currentScanText}
                            scanResult={scanResult}
                            onScan={() => { }}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default TelegramClientInternal;
