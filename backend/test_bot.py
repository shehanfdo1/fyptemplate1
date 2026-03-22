from listeners import TelegramMonitor
import time

def cb(x): print("Callback:", x)

try:
    print("Testing TelegramMonitor...")
    t = TelegramMonitor("123456789:ABCDEF_Fake_Token_For_Testing", cb)
    t.start()
    time.sleep(5)
    print("Test finished without crash.")
except Exception as e:
    print("CRASH:", e)
