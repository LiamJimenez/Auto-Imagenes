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

const selectedFiles = new Map();
let outputText = "";

try {
  localStorage.removeItem("autoImagenes.cpanelCredentials.v1");
} catch {
  // El navegador puede bloquear el almacenamiento local.
}

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

function addSelection(fileList) {
  for (const file of Array.from(fileList || [])) {
    const key = file.webkitRelativePath || `archivo/${file.name}`;
    selectedFiles.set(key, file);
  }

  generate();
}

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

input.addEventListener("change", () => {
  addSelection(input.files);
  input.value = "";
});

fileInput.addEventListener("change", () => {
  addSelection(fileInput.files);
  fileInput.value = "";
});

document.getElementById("chooseFolder").addEventListener("click", () => input.click());
document.getElementById("chooseFiles").addEventListener("click", () => fileInput.click());
clearSelectionButton.addEventListener("click", clearSelection);
baseUrl.addEventListener("input", generate);
document.getElementById("downloadBtn").addEventListener("click", downloadTextFile);
document.getElementById("copyBtn").addEventListener("click", copyText);
cpanelOpenLink.addEventListener("click", openCpanelUploader);
