import discord
import asyncio
import threading
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters

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
            # Note: Callback might need to be thread-safe or handle context
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
            self.app.run_polling()

        self.thread = threading.Thread(target=run_loop, daemon=True)
        self.thread.start()

    def stop(self):
        if not self.running or not self.app:
            return

        print("Stopping Telegram Bot...")
        # telegram.ext.Application.stop() / shutdown() are async and tricky to call from outside
        # For this implementation, we will just set running to False and let the thread die with the server
        # Ideally, we should properly signal the updater to stop.
        
        # run_polling blocks, so to stop it we might need to send a signal or use updater.stop() if available
        # The Application class manages the loop.
        
        # Since we are running in a dedicated thread for "run_polling", stopping isn't clean without complex async handling
        # For this prototype level, we accept checking 'running' state or just restarting the server
        self.running = False
        # To truly stop: self.app.stop() inside the loop.
        asyncio.run_coroutine_threadsafe(self.app.shutdown(), self.loop)
        asyncio.run_coroutine_threadsafe(self.app.stop(), self.loop)
