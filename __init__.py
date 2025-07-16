"""
Anki Card Generator Add-on
Serves a web interface for generating reverse cards from existing cards
"""

import os
import json
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import webbrowser
from urllib.parse import urlparse

from aqt import mw
from aqt.utils import showInfo
from aqt.qt import QAction, QTimer
from anki.hooks import addHook


class WebHandler(SimpleHTTPRequestHandler):
    """Custom HTTP handler for serving web files"""
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve files from
        self.directory = str(Path(__file__).parent / "web")
        super().__init__(*args, directory=self.directory, **kwargs)
    
    def end_headers(self):
        # Add CORS headers to allow cross-origin requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress server logs
        pass


class CardGeneratorServer:
    """Web server for the card generator interface"""
    
    def __init__(self, port=8766):
        self.port = port
        self.server = None
        self.thread = None
        self.running = False
    
    def start(self):
        """Start the web server"""
        if self.running:
            return
        
        try:
            self.server = HTTPServer(('localhost', self.port), WebHandler)
            self.thread = Thread(target=self.server.serve_forever, daemon=True)
            self.thread.start()
            self.running = True
            showInfo(f"Card Generator server started at http://localhost:{self.port}")
        except Exception as e:
            showInfo(f"Failed to start server: {str(e)}")
    
    def stop(self):
        """Stop the web server"""
        if self.server and self.running:
            self.server.shutdown()
            self.server.server_close()
            self.running = False
    
    def open_browser(self):
        """Open the web interface in default browser"""
        if self.running:
            webbrowser.open(f"http://localhost:{self.port}")
        else:
            showInfo("Server is not running. Please start the server first.")


# Global server instance
server = CardGeneratorServer()


def start_server():
    """Start the card generator server"""
    server.start()


def stop_server():
    """Stop the card generator server"""
    server.stop()


def open_card_generator():
    """Open the card generator web interface"""
    if not server.running:
        server.start()
        # Wait a moment for server to start
        QTimer.singleShot(500, server.open_browser)
    else:
        server.open_browser()


def setup_menu():
    """Set up the add-on menu"""
    # Create menu action
    action = QAction("Card Generator", mw)
    action.triggered.connect(open_card_generator)
    
    # Add to Tools menu
    mw.form.menuTools.addAction(action)


def on_profile_loaded():
    """Called when Anki profile is loaded"""
    setup_menu()


def on_unload():
    """Called when add-on is unloaded"""
    server.stop()


# Hook into Anki's lifecycle
addHook("profileLoaded", on_profile_loaded)
addHook("unloadProfile", on_unload)
