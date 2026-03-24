import discord
import asyncio
import threading
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters
import imaplib
import email
from email.header import decode_header
import time

class DiscordMonitor:
    def __init__(self, token, callback):
        self.token = token
        self.callback = callback
        self.loop = asyncio.new_event_loop()
        self.thread = None
        self.client = None
        self.running = False

    def start(self):
        if self.running:
            return
        
        self.running = True
        
        # Define the client with intents
        intents = discord.Intents.default()
        intents.message_content = True
        self.client = discord.Client(intents=intents)

        @self.client.event
        async def on_ready():
            print(f'✅ Discord Bot logged in as {self.client.user}')

        @self.client.event
        async def on_message(message):
            if message.author == self.client.user:
                return
            
            # Send to callback
            self.callback({
                'platform': 'Discord',
                'channel': str(message.channel),
                'author': str(message.author),
                'content': message.content,
                'timestamp': str(message.created_at)
            })

        def run_loop():
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self.client.start(self.token))

        self.thread = threading.Thread(target=run_loop, daemon=True)
        self.thread.start()

    def stop(self):
        if not self.running or not self.client:
            return
        
        print("Stopping Discord Bot...")
        future = asyncio.run_coroutine_threadsafe(self.client.close(), self.loop)
        try:
            future.result(timeout=5)
        except Exception as e:
            print(f"Error stopping discord bot: {e}")
        
        self.running = False


class TelegramMonitor:
    def __init__(self, token, callback):
        self.token = token
        self.callback = callback
        self.app = None
        self.thread = None
        self.running = False
        self.loop = asyncio.new_event_loop()

    def start(self):
        if self.running:
            return
        self.running = True

        def run_loop():
            asyncio.set_event_loop(self.loop)
            
            async def process_update(update: Update, context: ContextTypes.DEFAULT_TYPE):
                if update.message and update.message.text:
                   self.callback({
                       'platform': 'Telegram',
                       'channel': str(update.effective_chat.title or update.effective_chat.id),
                       'author': update.effective_user.username or update.effective_user.first_name,
                       'content': update.message.text,
                       'timestamp': str(update.message.date)
                   })

            self.app = ApplicationBuilder().token(self.token).build()
            self.app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), process_update))
            
            print("✅ Telegram Bot polling started")
            self.app.run_polling(close_loop=False, stop_signals=None)

        self.thread = threading.Thread(target=run_loop, daemon=True)
        self.thread.start()

    def stop(self):
        if not self.running or not self.app:
            return

        print("Stopping Telegram Bot...")
        self.running = False
        asyncio.run_coroutine_threadsafe(self.app.shutdown(), self.loop)
        asyncio.run_coroutine_threadsafe(self.app.stop(), self.loop)


class GmailMonitor:
    def __init__(self, email_user, email_pass, callback):
        self.email_user = email_user
        self.email_pass = email_pass
        self.callback = callback
        self.running = False
        self.thread = None

    def start(self):
        if self.running: return
        self.running = True

        def run_loop():
            print("✅ Gmail Background Polling started")
            while self.running:
                try:
                    # Connect to server
                    mail = imaplib.IMAP4_SSL("imap.gmail.com")
                    mail.login(self.email_user, self.email_pass)
                    mail.select("inbox")

                    # Search for unread emails
                    status, messages = mail.search(None, "UNSEEN")
                    if status == "OK" and messages[0]:
                        for num in messages[0].split():
                            if not self.running: break
                            
                            res, msg_data = mail.fetch(num, '(RFC822)')
                            for response_part in msg_data:
                                if isinstance(response_part, tuple):
                                    msg = email.message_from_bytes(response_part[1])
                                    subject, encoding = decode_header(msg["Subject"])[0]
                                    if isinstance(subject, bytes):
                                        subject = subject.decode(encoding if encoding else "utf-8")
                                    
                                    from_ = msg.get("From")
                                    
                                    # Extract pure text body
                                    body = ""
                                    if msg.is_multipart():
                                        for part in msg.walk():
                                            if part.get_content_type() == "text/plain":
                                                body = part.get_payload(decode=True).decode()
                                                break
                                    else:
                                        body = msg.get_payload(decode=True).decode()

                                    full_text = f"Subject: {subject}\n\n{body}"
                                    
                                    self.callback({
                                        'platform': 'Gmail',
                                        'channel': 'Inbox',
                                        'author': str(from_),
                                        'content': str(full_text)[:2000],
                                        'timestamp': time.strftime("%Y-%m-%d %H:%M:%S")
                                    })
                                    
                    mail.logout()
                except Exception as e:
                    print(f"⚠️ Gmail Polling Error: {e}")

                for _ in range(15):
                    if not self.running: break
                    time.sleep(1)

        self.thread = threading.Thread(target=run_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        print("Stopping Gmail Monitor...")
