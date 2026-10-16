#!/usr/bin/env python3
"""Local HTTP server for the Pediatric & Neonatal ECMO Simulation Engine app."""

import http.server
import os
import socketserver
import webbrowser

PORT = 8765
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Prevent browser caching of simulation JS and state
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def try_kill_port(port):
    import subprocess
    try:
        out = subprocess.check_output(["lsof", "-ti", f":{port}"], stderr=subprocess.DEVNULL).decode().strip()
        if out:
            for pid_str in out.split():
                pid = int(pid_str)
                if pid != os.getpid():
                    try:
                        os.kill(pid, 9)
                    except Exception:
                        pass
    except Exception:
        pass


if __name__ == "__main__":
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True

    # Try clearing stale process on preferred port 8765 first
    try_kill_port(8765)

    # Try preferred port 8765 first, with automated fallback if port is in use
    ports = [8765, 8766, 8767, 8768, 8769]
    httpd = None
    active_port = None
    for p in ports:
        try:
            httpd = socketserver.TCPServer(("127.0.0.1", p), Handler)
            active_port = p
            break
        except OSError:
            continue

    if not httpd:
        httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
        active_port = httpd.server_address[1]

    url = f"http://localhost:{active_port}"
    print("=" * 60)
    print(f"  ECMO-Sim Workstation running at: {url}")
    print("=" * 60)
    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down ECMO-Sim server.")
