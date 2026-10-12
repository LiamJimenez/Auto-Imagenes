const input = document.getElementById("folderInput");
const fileInput = document.getElementById("fileInput");
const baseUrl = document.getElementById("baseUrl");
const message = document.getElementById("message");
const results = document.getElementById("results");
const folderName = document.getElementById("folderName");
const previewRows = document.getElementById("previewRows");
const rowCount = document.getElementById("rowCount");
const skipNote = document.getElementById("skipNote");
const uploadBtn = document.getElementById("uploadBtn");
const cpanelUser = document.getElementById("cpanelUser");
const cpanelToken = document.getElementById("cpanelToken");
const credentialStatus = document.getElementById("credentialStatus");
const CREDENTIALS_KEY = "autoImagenes.cpanelCredentials.v1";
let outputText = "";
const selectedFiles = new Map();
let uploadItems = [];

function saveCredentials() {
  const username = cpanelUser.value.trim();
  const token = cpanelToken.value.trim();
  try {
    if (username && token) {
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({username, token}));
      credentialStatus.textContent = "Usuario y token guardados en este navegador.";
    } else {
      localStorage.removeItem(CREDENTIALS_KEY);
      credentialStatus.textContent = "Las credenciales se guardan en este navegador.";
    }
  } catch {
    credentialStatus.textContent = "El navegador no permitió guardar las credenciales.";
  }
}

try {
  const saved = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || "null");
  if (saved && typeof saved.username === "string" && typeof saved.token === "string") {
    cpanelUser.value = saved.username;
    cpanelToken.value = saved.token;
    credentialStatus.textContent = "Credenciales guardadas en este navegador.";
  }
} catch {
  localStorage.removeItem(CREDENTIALS_KEY);
}
cpanelUser.addEventListener("input", saveCredentials);
cpanelToken.addEventListener("input", saveCredentials);
document.getElementById("forgetCredentials").addEventListener("click", () => {
  localStorage.removeItem(CREDENTIALS_KEY);
  cpanelUser.value = "";
  cpanelToken.value = "";
  credentialStatus.textContent = "Credenciales borradas de este navegador.";
});

function showMessage(text, kind) {
  message.textContent = text;
  message.className = "alert alert-" + kind + " mt-4 mb-0";
}

function generate() {
  const files = Array.from(selectedFiles.values());
  if (!files.length) return;
  const base = baseUrl.value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    showMessage("La URL debe comenzar con https:// o http://", "warning");
    return;
  }
  const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"];
  const images = files.filter(file => {
    const ext = file.name.match(/\.[^.]+$/)?.[0] || "";
    return file.type.startsWith("image/") || imageExtensions.includes(ext.toLowerCase());
  });
  const rows = [];
  const skipped = [];
  for (const file of images) {
    const ext = file.name.match(/\.[^.]+$/)?.[0] || "";
    const stem = file.name.slice(0, file.name.length - ext.length);
    const code = stem.match(/^\s*(\d+)/)?.[1];
    if (!code) { skipped.push(file.name); continue; }
    const filename = code + ext;
    rows.push({code, url: base + "/" + filename, filename, file});
  }
  rows.sort((a, b) => Number(a.code) - Number(b.code) || a.code.localeCompare(b.code));
  outputText = rows.map(row => [row.code, row.url, row.filename].join("\t")).join("\r\n");
  uploadItems = rows;
  uploadBtn.disabled = rows.length === 0;
  rowCount.textContent = rows.length;
  previewRows.replaceChildren();
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const value of [row.code, row.url, row.filename]) {
      const td = document.createElement("td"); td.textContent = value; tr.appendChild(td);
    }
    previewRows.appendChild(tr);
  }
  const duplicates = [...new Set(rows.filter((row, i) => rows.findIndex(other => other.code === row.code) !== i).map(row => row.code))];
  let note = skipped.length + " archivo(s) sin código inicial omitido(s).";
  if (duplicates.length) note += " Códigos repetidos: " + duplicates.join(", ") + ".";
  skipNote.textContent = note;
  folderName.textContent = images.length + " imagen(es) seleccionada(s)";
  folderName.classList.remove("d-none");
  document.getElementById("clearSelection").classList.remove("d-none");
  results.classList.remove("d-none");
  message.className = "alert d-none mt-4 mb-0";
  if (!rows.length) showMessage("No se encontraron códigos al inicio de los nombres.", "warning");
}
function addSelection(fileList) {
  for (const file of Array.from(fileList || [])) {
    const key = file.webkitRelativePath || "archivo/" + file.name;
    selectedFiles.set(key, file);
  }
  generate();
}
input.addEventListener("change", () => { addSelection(input.files); input.value = ""; });
fileInput.addEventListener("change", () => { addSelection(fileInput.files); fileInput.value = ""; });
document.getElementById("chooseFolder").addEventListener("click", () => input.click());
document.getElementById("chooseFiles").addEventListener("click", () => fileInput.click());
document.getElementById("clearSelection").addEventListener("click", () => {
  selectedFiles.clear(); input.value = ""; fileInput.value = "";
  folderName.classList.add("d-none"); document.getElementById("clearSelection").classList.add("d-none");
  results.classList.add("d-none"); message.className = "alert d-none mt-4 mb-0"; outputText = "";
});
baseUrl.addEventListener("input", generate);
document.getElementById("downloadBtn").addEventListener("click", () => {
  const blob = new Blob([outputText], {type: "text/plain;charset=utf-8"});
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
  link.download = "imagenes_ecommerce.txt"; link.click(); URL.revokeObjectURL(link.href);
});
document.getElementById("copyBtn").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(outputText); showMessage("Texto copiado.", "success"); }
  catch { showMessage("No se pudo copiar. Descarga el TXT.", "warning"); }
});

uploadBtn.addEventListener("click", async () => {
  const username = cpanelUser.value.trim();
  const token = cpanelToken.value.trim();
  if (!username || !token) { showMessage("Ingresa tu usuario y token API de cPanel.", "warning"); return; }
  if (!uploadItems.length) { showMessage("Selecciona imágenes con un código al inicio del nombre.", "warning"); return; }
  const form = new FormData();
  form.append("username", username);
  form.append("token", token);
  for (const row of uploadItems) form.append("files", row.file, row.filename);
  uploadBtn.disabled = true;
  uploadBtn.textContent = "Subiendo…";
  try {
    const response = await fetch("/api/upload", {method: "POST", body: form});
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "No se pudo completar la subida.");
    showMessage(result.message || "Imágenes cargadas en cPanel.", "success");
  } catch (error) {
    const detail = error instanceof TypeError
      ? "No se conectó con el servidor local. Abre la página con iniciar_local.bat."
      : error.message;
    showMessage(detail, "danger");
  } finally {
    uploadBtn.disabled = uploadItems.length === 0;
    uploadBtn.textContent = "Subir imágenes a cPanel ↑";
  }
});






