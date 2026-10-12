const input = document.getElementById("folderInput");
const fileInput = document.getElementById("fileInput");
const baseUrl = document.getElementById("baseUrl");
const message = document.getElementById("message");
const results = document.getElementById("results");
const folderName = document.getElementById("folderName");
const previewRows = document.getElementById("previewRows");
const rowCount = document.getElementById("rowCount");
const skipNote = document.getElementById("skipNote");
let outputText = "";
const selectedFiles = new Map();

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
    rows.push({code, url: base + "/" + filename, filename});
  }
  rows.sort((a, b) => Number(a.code) - Number(b.code) || a.code.localeCompare(b.code));
  outputText = rows.map(row => [row.code, row.url, row.filename].join("\t")).join("\r\n");
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






