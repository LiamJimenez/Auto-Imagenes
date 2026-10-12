from __future__ import annotations

import base64
import json
import mimetypes
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CPANEL_HOST = "impactoferretero.com"
CPANEL_DIR = "/home/impactoferretero/public_html/grupoalterra.com/Imagenes-Ecommercce-Supermix"
MAX_REQUEST = 500 * 1024 * 1024


class Handler(BaseHTTPRequestHandler):
    server_version = "AutoImagenesLocal/1.0"

    def send_json(self, status: int, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

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

    def do_POST(self) -> None:
        if self.path != "/api/upload":
            self.send_json(404, {"ok": False, "error": "Ruta no encontrada."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_REQUEST:
            self.send_json(413, {"ok": False, "error": "La carga está vacía o supera el límite de 500 MB."})
            return
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type.lower():
            self.send_json(400, {"ok": False, "error": "Solicitud de carga no válida."})
            return

        raw = self.rfile.read(length)
        message = BytesParser(policy=policy.default).parsebytes(
            (f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n").encode("ascii") + raw
        )
        fields: dict[str, str] = {}
        files: list[tuple[str, bytes, str]] = []
        for part in message.iter_parts():
            name = part.get_param("name", header="content-disposition")
            filename = part.get_filename()
            payload = part.get_payload(decode=True) or b""
            if filename is not None and name == "files":
                safe_name = Path(filename.replace("\\", "/")).name
                if not re.fullmatch(r"\d+\.[A-Za-z0-9]{1,8}", safe_name):
                    self.send_json(400, {"ok": False, "error": f"Nombre de archivo no válido: {safe_name}"})
                    return
                files.append((safe_name, payload, part.get_content_type()))
            elif name in ("username", "token"):
                fields[name] = payload.decode("utf-8", errors="replace").strip()

        username, token = fields.get("username", ""), fields.get("token", "")
        if not username or not token or not files:
            self.send_json(400, {"ok": False, "error": "Falta el usuario, el token o las imágenes."})
            return

        boundary = "----AutoImagenes" + base64.urlsafe_b64encode(__import__("secrets").token_bytes(18)).decode().rstrip("=")
        chunks: list[bytes] = []

        def field(name: str, value: str) -> None:
            chunks.extend((f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n").encode("utf-8"),)

        field("dir", CPANEL_DIR)
        for index, (filename, payload, mime) in enumerate(files, 1):
            chunks.append(
                f"--{boundary}\r\nContent-Disposition: form-data; name=\"file-{index}\"; filename=\"{filename}\"\r\nContent-Type: {mime}\r\n\r\n".encode("utf-8")
            )
            chunks.extend((payload, b"\r\n"))
        chunks.append(f"--{boundary}--\r\n".encode("ascii"))
        body = b"".join(chunks)
        auth = base64.b64encode(f"{username}:{token}".encode("utf-8")).decode("ascii")
        request = urllib.request.Request(
            f"https://{CPANEL_HOST}:2083/execute/Fileman/upload_files",
            data=body,
            headers={"Authorization": f"Basic {auth}", "Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, context=ssl.create_default_context(), timeout=180) as response:
                result = json.loads(response.read().decode("utf-8"))
            if result.get("status") != 1:
                errors = result.get("errors") or []
                detail = "; ".join(str(error) for error in errors) or "cPanel no confirmó la carga."
                self.send_json(502, {"ok": False, "error": detail})
                return
            self.send_json(200, {"ok": True, "message": f"{len(files)} imagen(es) cargada(s) en la carpeta de cPanel."})
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:500]
            self.send_json(502, {"ok": False, "error": f"cPanel respondió HTTP {error.code}. Revisa el usuario, token y permisos."})
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            self.send_json(502, {"ok": False, "error": f"No se pudo conectar con cPanel: {error}"})

    def log_message(self, format: str, *args: object) -> None:
        # No registrar cabeceras ni cuerpos: pueden contener el token de acceso.
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
