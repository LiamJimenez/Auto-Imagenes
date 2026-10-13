// Referencias del DOM y estado de la aplicación
const input = document.getElementById("folderInput");
const fileInput = document.getElementById("fileInput");
const baseUrl = document.getElementById("baseUrl");
const message = document.getElementById("message");
const results = document.getElementById("results");
const folderName = document.getElementById("folderName");
const previewRows = document.getElementById("previewRows");
const rowCount = document.getElementById("rowCount");
const skipNote = document.getElementById("skipNote");
const clearSelectionButton = document.getElementById("clearSelection");
const cpanelOpenLink = document.getElementById("cpanelOpen");
const dropzone = document.querySelector(".dropzone");

const selectedFiles = new Map();
let outputText = "";

try {
  localStorage.removeItem("autoImagenes.cpanelCredentials.v1");
} catch {
  // El navegador puede bloquear el almacenamiento local.
}

// Presentación de mensajes y vista previa
function showMessage(text, kind) {
  message.textContent = text;
  message.className = `alert alert-${kind} mt-4 mb-0`;
}

function renderPreview(rows) {
  rowCount.textContent = rows.length;
  previewRows.replaceChildren();

  for (const row of rows) {
    const tableRow = document.createElement("tr");

    for (const value of [row.code, row.url, row.filename]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      tableRow.appendChild(cell);
    }

    previewRows.appendChild(tableRow);
  }
}

function findDuplicateCodes(rows) {
  return [
    ...new Set(
      rows
        .filter((row, index) => rows.findIndex(other => other.code === row.code) !== index)
        .map(row => row.code)
    )
  ];
}

// Validación y generación de enlaces
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
    const extension = file.name.match(/\.[^.]+$/)?.[0] || "";
    return file.type.startsWith("image/") || imageExtensions.includes(extension.toLowerCase());
  });

  const rows = [];
  const skipped = [];

  for (const file of images) {
    const extension = file.name.match(/\.[^.]+$/)?.[0] || "";
    const stem = file.name.slice(0, file.name.length - extension.length);
    const code = stem.match(/^\s*(\d+)/)?.[1];

    if (!code) {
      skipped.push(file.name);
      continue;
    }

    const filename = code + extension;
    rows.push({code, url: `${base}/${filename}`, filename, file});
  }

  rows.sort((a, b) => Number(a.code) - Number(b.code) || a.code.localeCompare(b.code));
  outputText = rows.map(row => [row.code, row.url, row.filename].join("\t")).join("\r\n");

  renderPreview(rows);

  const duplicates = findDuplicateCodes(rows);
  let note = `${skipped.length} archivo(s) sin código inicial omitido(s).`;
  if (duplicates.length) note += ` Códigos repetidos: ${duplicates.join(", ")}.`;
  skipNote.textContent = note;

  folderName.textContent = `${images.length} imagen(es) seleccionada(s)`;
  folderName.classList.remove("d-none");
  clearSelectionButton.classList.remove("d-none");
  results.classList.remove("d-none");
  message.className = "alert d-none mt-4 mb-0";

  if (!rows.length) {
    showMessage("No se encontraron códigos al inicio de los nombres.", "warning");
  }
}

// Selección y lectura de archivos/carpetas
function addFiles(files) {
  for (const {file, path} of files) {
    selectedFiles.set(path || file.webkitRelativePath || `archivo/${file.name}`, file);
  }
  generate();
}

function addSelection(fileList) {
  addFiles(Array.from(fileList || [], file => ({file})));
}

function readDirectoryEntries(directoryEntry) {
  const reader = directoryEntry.createReader();
  const entries = [];

  return new Promise((resolve, reject) => {
    function readBatch() {
      reader.readEntries(batch => {
        if (!batch.length) {
          resolve(entries);
          return;
        }
        entries.push(...batch);
        readBatch();
      }, reject);
    }

    readBatch();
  });
}

function readEntryFile(fileEntry) {
  return new Promise((resolve, reject) => fileEntry.file(resolve, reject));
}

async function collectDroppedEntry(entry, files) {
  if (entry.isFile) {
    const file = await readEntryFile(entry);
    files.push({file, path: entry.fullPath || file.name});
    return;
  }

  if (entry.isDirectory) {
    const children = await readDirectoryEntries(entry);
    for (const child of children) await collectDroppedEntry(child, files);
  }
}

async function collectFileHandle(handle, parentPath, files) {
  const path = parentPath ? `${parentPath}/${handle.name}` : handle.name;

  if (handle.kind === "file") {
    files.push({file: await handle.getFile(), path});
    return;
  }

  for await (const child of handle.values()) {
    await collectFileHandle(child, path, files);
  }
}

async function handleDrop(event) {
  event.preventDefault();
  dropzone.classList.remove("is-dragging");
  const droppedFiles = [];
  const items = Array.from(event.dataTransfer.items || []);
  const fallbackFiles = Array.from(event.dataTransfer.files || []);

  const handleItems = items.filter(
    item => item.kind === "file" && typeof item.getAsFileSystemHandle === "function"
  );
  if (handleItems.length) {
    try {
      const handles = await Promise.all(handleItems.map(item => item.getAsFileSystemHandle()));
      for (const handle of handles.filter(Boolean)) await collectFileHandle(handle, "", droppedFiles);
    } catch {
      droppedFiles.length = 0;
    }
  }

  if (!droppedFiles.length) {
    const entries = items
      .filter(item => item.kind === "file" && typeof item.webkitGetAsEntry === "function")
      .map(item => item.webkitGetAsEntry())
      .filter(Boolean);

    try {
      for (const entry of entries) await collectDroppedEntry(entry, droppedFiles);
    } catch {
      droppedFiles.length = 0;
    }
  }

  if (!droppedFiles.length) {
    droppedFiles.push(...fallbackFiles.map(file => ({file})));
  }

  if (droppedFiles.length) {
    addFiles(droppedFiles);
  } else {
    showMessage("No se encontraron archivos legibles. Prueba arrastrando archivos individuales o usa los botones para elegir una carpeta.", "warning");
  }
}

// Acciones de salida y navegación a cPanel
function clearSelection() {
  selectedFiles.clear();
  input.value = "";
  fileInput.value = "";
  folderName.classList.add("d-none");
  clearSelectionButton.classList.add("d-none");
  results.classList.add("d-none");
  message.className = "alert d-none mt-4 mb-0";
  outputText = "";
}

function downloadTextFile() {
  const blob = new Blob([outputText], {type: "text/plain;charset=utf-8"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "imagenes_ecommerce.txt";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function copyText() {
  try {
    await navigator.clipboard.writeText(outputText);
    showMessage("Texto copiado.", "success");
  } catch {
    showMessage("No se pudo copiar. Descarga el TXT.", "warning");
  }
}

function openCpanelUploader(event) {
  event.preventDefault();

  const popup = window.open(
    cpanelOpenLink.href,
    "cpanelUploader",
    "popup=yes,width=1100,height=760,resizable=yes,scrollbars=yes"
  );

  if (!popup) {
    window.open(cpanelOpenLink.href, "_blank", "noopener,noreferrer");
  }
}

// Eventos de interfaz e inicialización
const themeToggle = document.getElementById("themeToggle");
const THEME_KEY = "autoImagenes.theme.v1";
function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.setAttribute("aria-label", dark ? "Activar modo claro" : "Activar modo oscuro");
  themeToggle.querySelector(".theme-icon").textContent = dark ? "☀" : "☾";
  themeToggle.querySelector(".theme-label").textContent = dark ? "Modo claro" : "Modo oscuro";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#121b2a" : "#101b31";
}
let savedTheme = "light";
try { savedTheme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"; } catch {}
applyTheme(savedTheme);
themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  try { localStorage.setItem(THEME_KEY, nextTheme); } catch {}
});

input.addEventListener("change", () => {
  addSelection(input.files);
  input.value = "";
});

fileInput.addEventListener("change", () => {
  addSelection(fileInput.files);
  fileInput.value = "";
});

let dragDepth = 0;
dropzone.addEventListener("dragenter", event => {
  event.preventDefault();
  dragDepth += 1;
  dropzone.classList.add("is-dragging");
});
dropzone.addEventListener("dragover", event => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
});
dropzone.addEventListener("dragleave", event => {
  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dropzone.classList.remove("is-dragging");
});
dropzone.addEventListener("drop", event => {
  dragDepth = 0;
  handleDrop(event);
});

document.getElementById("chooseFolder").addEventListener("click", () => input.click());
document.getElementById("chooseFiles").addEventListener("click", () => fileInput.click());
clearSelectionButton.addEventListener("click", clearSelection);
baseUrl.addEventListener("input", generate);
document.getElementById("downloadBtn").addEventListener("click", downloadTextFile);
document.getElementById("copyBtn").addEventListener("click", copyText);
cpanelOpenLink.addEventListener("click", openCpanelUploader);
