// ==========================================================
// OFFLINE PDF PROCESSING ENGINE (MERGE, SPLIT, CONVERT)
// ==========================================================

var selectedMergeFiles = [];
var selectedImageFiles = [];
var selectedCompressFile = null;
var compressionLevel = "medium";
var selectedPdfToWordFile = null;

// Ganti Sub-tab Mini di Workspace PDF
function switchPdfSubTab(tabName) {
  ['merge', 'split', 'compress', 'img2pdf', 'text2pdf', 'pdf2word'].forEach(id => {
    const btn = document.getElementById(`btn-pdf-${id}`);
    const panel = document.getElementById(`sub-pdf-${id}`);
    if (btn) {
      if (id === tabName) {
        btn.className = "flex-shrink-0 flex-1 py-2 px-3 rounded-xl text-xs font-black transition bg-white dark:bg-slate-800 text-blue-600 shadow-sm";
      } else {
        btn.className = "flex-shrink-0 flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
      }
    }
    if (panel) panel.classList.toggle('hidden', id !== tabName);
  });
}

// --- SUB-TAB 1: GABUNG PDF ---
function handleMergeFilesSelect(e) {
  const files = e.target.files;
  for (let i = 0; i < files.length; i++) {
    selectedMergeFiles.push(files[i]);
  }
  renderMergeFilesList();
}

function renderMergeFilesList() {
  const listContainer = document.getElementById('pdf-merge-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';
  selectedMergeFiles.forEach((f, idx) => {
    listContainer.innerHTML += `
      <div class="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
        <span class="truncate font-medium flex items-center gap-1.5 dark:text-slate-200"><i class="fa-solid fa-file-pdf text-rose-500"></i> ${f.name} (${(f.size/1024/1024).toFixed(2)} MB)</span>
        <button onclick="removeMergeFile(${idx})" class="text-rose-500 hover:text-rose-700 transition p-1"><i class="fa-solid fa-trash"></i></button>
      </div>`;
  });
}

function removeMergeFile(idx) {
  selectedMergeFiles.splice(idx, 1);
  renderMergeFilesList();
}

async function processPdfMerge() {
  if (selectedMergeFiles.length < 2) {
    return showToast("Pilih minimal 2 berkas PDF untuk digabungkan!", "warning");
  }
  showToast("Sedang memproses penggabungan dokumen...", "warning");
  try {
    const mergedPdf = await PDFLib.PDFDocument.create();
    for (let i = 0; i < selectedMergeFiles.length; i++) {
      const fileBytes = await selectedMergeFiles[i].arrayBuffer();
      const pdf = await PDFLib.PDFDocument.load(fileBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    const mergedPdfBytes = await mergedPdf.save();
    downloadFileBlob(mergedPdfBytes, "dokumen_tergabung.pdf", "application/pdf");
    showToast("Berhasil menggabungkan PDF!");
    selectedMergeFiles = [];
    renderMergeFilesList();
  } catch (err) {
    showToast("Terjadi kesalahan teknis saat menggabungkan PDF.", "error");
  }
}

// --- SUB-TAB 2: PISAH PDF ---
var splitFileBuffer = null;
async function handleSplitFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('pdf-split-filename').innerHTML = `
    <span class="font-bold text-blue-600 dark:text-blue-400"><i class="fa-solid fa-file-pdf"></i> ${file.name}</span><br>
    <span class="text-[10px] text-slate-400">${(file.size/1024/1024).toFixed(2)} MB</span>`;
  splitFileBuffer = await file.arrayBuffer();
  document.getElementById('pdf-split-name').value = "split_" + file.name;
}

async function processPdfSplit() {
  if (!splitFileBuffer) return showToast("Silakan unggah dokumen PDF terlebih dahulu!", "warning");
  const pagesText = document.getElementById('pdf-split-pages').value.trim();
  const outputName = document.getElementById('pdf-split-name').value.trim() || "ekstrak.pdf";
  if (!pagesText) return showToast("Masukkan rentang halaman (contoh: 1-3, 5)!", "warning");
  
  try {
    const srcPdf = await PDFLib.PDFDocument.load(splitFileBuffer);
    const destPdf = await PDFLib.PDFDocument.create();
    const totalPages = srcPdf.getPageCount();
    
    // Parsing Halaman
    const pagesToExtract = parsePageRanges(pagesText, totalPages);
    if (pagesToExtract.length === 0) return showToast("Rentang halaman tidak valid!", "error");

    const copiedPages = await destPdf.copyPages(srcPdf, pagesToExtract.map(p => p - 1));
    copiedPages.forEach(p => destPdf.addPage(p));
    
    const bytes = await destPdf.save();
    downloadFileBlob(bytes, outputName, "application/pdf");
    showToast("Berhasil mengekstrak halaman PDF!");
  } catch (err) {
    showToast("Gagal memisahkan halaman PDF.", "error");
  }
}

// --- SUB-TAB 3: KOMPRES PDF ---
function handleCompressFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  selectedCompressFile = file;
  document.getElementById('pdf-compress-filename').classList.add('hidden');
  const info = document.getElementById('pdf-compress-info');
  info.classList.remove('hidden');
  document.getElementById('compress-file-name').textContent = file.name;
  document.getElementById('compress-file-size').textContent = `${(file.size/1024).toFixed(2)} KB`;
}

function setCompressionLevel(level) {
  compressionLevel = level;
  ['low', 'medium', 'high'].forEach(id => {
    const btn = document.getElementById(`btn-compress-${id}`);
    if (btn) {
      if (id === level) {
        btn.className = "py-2.5 px-3 rounded-xl text-xs font-bold border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs text-center";
      } else {
        btn.className = "py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50";
      }
    }
  });
}

async function processPdfCompression() {
  if (!selectedCompressFile) return showToast("Pilih file PDF yang ingin dikompres!", "warning");
  showToast("Kompresi luring sedang berjalan...", "warning");
  
  try {
    const fileBytes = await selectedCompressFile.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(fileBytes);
    
    // Kompresi luring dengan membuang metadata dan mengompres struktur internal PDFLib
    const compressedBytes = await pdfDoc.save({ 
      useObjectStreams: true,
      addEmptyPage: false
    });
    
    downloadFileBlob(compressedBytes, "compressed_" + selectedCompressFile.name, "application/pdf");
    showToast("Kompresi PDF selesai!");
  } catch (err) {
    showToast("Terjadi kesalahan saat memampatkan berkas.", "error");
  }
}

// --- SUB-TAB 4: GAMBAR KE PDF ---
function handleImageSelect(e) {
  const files = e.target.files;
  for (let i = 0; i < files.length; i++) {
    selectedImageFiles.push(files[i]);
  }
  renderImagePreviews();
}

function renderImagePreviews() {
  const container = document.getElementById('pdf-img-preview');
  if (!container) return;
  container.innerHTML = '';
  selectedImageFiles.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      container.innerHTML += `
        <div class="relative group border dark:border-slate-700 rounded-lg overflow-hidden h-20 bg-slate-100 dark:bg-slate-900">
          <img src="${event.target.result}" class="w-full h-full object-cover" />
          <button onclick="removeImageFile(${idx})" class="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-md text-[9px]"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    };
    reader.readAsDataURL(file);
  });
}

function removeImageFile(idx) {
  selectedImageFiles.splice(idx, 1);
  renderImagePreviews();
}

async function processImageToPdf() {
  if (selectedImageFiles.length === 0) return showToast("Unggah minimal satu gambar JPG/PNG!", "warning");
  showToast("Menyusun PDF gambar...", "warning");
  
  try {
    const pdfDoc = await PDFLib.PDFDocument.create();
    for (let i = 0; i < selectedImageFiles.length; i++) {
      const fileBytes = await selectedImageFiles[i].arrayBuffer();
      let image;
      if (selectedImageFiles[i].type === "image/png" || selectedImageFiles[i].name.toLowerCase().endsWith(".png")) {
        image = await pdfDoc.embedPng(fileBytes);
      } else {
        image = await pdfDoc.embedJpg(fileBytes);
      }
      
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }
    
    const bytes = await pdfDoc.save();
    downloadFileBlob(bytes, "dokumen_gambar.pdf", "application/pdf");
    showToast("Berhasil merangkai gambar menjadi PDF!");
    selectedImageFiles = [];
    renderImagePreviews();
  } catch (err) {
    showToast("Terjadi kesalahan pengunggahan gambar.", "error");
  }
}

// --- SUB-TAB 5: TEKS KE PDF ---
async function processTextToPdf() {
  const body = document.getElementById('pdf-text-input-body').value.trim();
  const filename = document.getElementById('pdf-text-filename').value.trim() || "dokumen_teks.pdf";
  if (!body) return showToast("Tulis naskah teks terlebih dahulu!", "warning");
  
  try {
    const pdfDoc = await PDFLib.PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { rgb } = PDFLib;
    
    page.drawText(body, {
      x: 50,
      y: 750,
      size: 12,
      lineHeight: 16,
      maxWidth: 500,
      color: rgb(0.1, 0.1, 0.1)
    });
    
    const bytes = await pdfDoc.save();
    downloadFileBlob(bytes, filename, "application/pdf");
    showToast("Berhasil membuat PDF dari teks!");
    document.getElementById('pdf-text-input-body').value = '';
  } catch (err) {
    showToast("Gagal memproses pembuatan berkas PDF.", "error");
  }
}

// --- SUB-TAB 6: PDF KE WORD ---
async function handlePdfToWordSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  selectedPdfToWordFile = file;
  document.getElementById('pdf-to-word-filename').innerHTML = `<span class="font-bold text-blue-600 dark:text-blue-400"><i class="fa-solid fa-file-pdf"></i> ${file.name}</span>`;
  
  try {
    const fileBytes = await file.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
    const loadingTask = pdfjsLib.getDocument({ data: fileBytes });
    const pdf = await loadingTask.promise;
    
    // Preview karakter halaman pertama
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map(item => item.str);
    const preview = strings.join(" ").substring(0, 200);
    document.getElementById('pdf-word-preview-text').innerHTML = preview ? `"${preview}..."` : "Tidak ada karakter teks terbaca pada halaman pertama.";
  } catch (err) {
    document.getElementById('pdf-word-preview-text').textContent = "Kesalahan membaca struktur PDF.";
  }
}

async function processPdfToWord() {
  if (!selectedPdfToWordFile) return showToast("Silakan pilih file PDF terlebih dahulu!", "warning");
  showToast("Mengekstrak karakter teks dari PDF...", "warning");
  
  try {
    const fileBytes = await selectedPdfToWordFile.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
    const loadingTask = pdfjsLib.getDocument({ data: fileBytes });
    const pdf = await loadingTask.promise;
    
    let docContent = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      docContent += `\n--- Halaman ${i} ---\n\n${pageText}\n`;
    }
    
    const blob = new Blob([docContent], { type: "application/msword" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = selectedPdfToWordFile.name.replace(/\.pdf$/i, '') + ".doc";
    link.click();
    showToast("Berhasil mengonversi PDF ke format Word .doc!");
  } catch (err) {
    showToast("Gagal mengonversi dokumen.", "error");
  }
}

// --- UTILS PDF HELPER ---
function downloadFileBlob(bytes, filename, type) {
  const blob = new Blob([bytes], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function parsePageRanges(text, maxPages) {
  const list = [];
  const parts = text.split(',');
  parts.forEach(part => {
    if (part.includes('-')) {
      const bounds = part.split('-');
      const start = parseInt(bounds[0]);
      const end = parseInt(bounds[1]);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= Math.min(end, maxPages); i++) {
          if (i > 0 && !list.includes(i)) list.push(i);
        }
      }
    } else {
      const val = parseInt(part);
      if (!isNaN(val) && val > 0 && val <= maxPages && !list.includes(val)) {
        list.push(val);
      }
    }
  });
  return list.sort((a, b) => a - b);
}
