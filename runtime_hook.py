
import os
import sys

if sys.platform == 'darwin':
    # Add macOS frameworks to the path
    frameworks_path = os.path.join(sys._MEIPASS, 'Frameworks')
    if not os.path.exists(frameworks_path):
        os.makedirs(frameworks_path)
