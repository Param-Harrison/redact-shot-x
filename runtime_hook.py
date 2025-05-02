
import os
import sys
import signal
import atexit

def handle_exit():
    # Try to gracefully shutdown the API server
    try:
        import requests
        requests.get("http://127.0.0.1:8004/shutdown", timeout=1)
    except:
        pass

# Register exit handler
atexit.register(handle_exit)

# Handle signals
signal.signal(signal.SIGINT, lambda s, f: handle_exit())
signal.signal(signal.SIGTERM, lambda s, f: handle_exit())

if sys.platform == 'darwin':
    # Add macOS frameworks to the path
    frameworks_path = os.path.join(sys._MEIPASS, 'Frameworks')
    if not os.path.exists(frameworks_path):
        os.makedirs(frameworks_path)
