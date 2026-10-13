from __future__ import annotations

import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
class Handler(BaseHTTPRequestHandler):
    server_version = "AutoImagenesLocal/1.0"

    def do_GET(self) -> None:
        route = "/index.html" if self.path in ("/", "/index.html") else self.path
        if route not in ("/index.html", "/app.js", "/app.css"):
            self.send_error(404)
            return
        file_path = ROOT / route.lstrip("/")
        data = file_path.read_bytes()
        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        if route.endswith(".js"):
            content_type = "text/javascript; charset=utf-8"
        elif route.endswith(".css"):
            content_type = "text/css; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.log_date_time_string()} {self.address_string()} {format % args}")


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("Auto Imágenes está listo: http://127.0.0.1:8765")
    print("Deja esta ventana abierta mientras usas la página. Ctrl+C para cerrar.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor cerrado.")
    finally:
        server.server_close()
