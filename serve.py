#!/usr/bin/env python3
"""Dev server for Chef Rush.

Plain `python -m http.server` sends no cache headers, so browsers apply
heuristic caching and quietly serve stale JS/CSS after an edit — which looks
exactly like "my change did nothing". This sends no-store on everything.

    py serve.py [port]        # defaults to 8080
"""

import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Only surface problems; a game reload is ~20 requests of noise.
        status = args[1] if len(args) > 1 else ""
        if str(status).startswith(("4", "5")):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if not os.path.isdir(ROOT):
    sys.exit(f"Cannot find the web root: {ROOT}")

socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("0.0.0.0", PORT), NoCacheHandler) as httpd:
    print(f"Chef Rush  ->  http://localhost:{PORT}")
    print(f"serving     {ROOT}")
    print("Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
