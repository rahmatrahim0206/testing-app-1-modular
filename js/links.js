// ==========================================================
// PORTAL LINKS MANAGEMENT LOGIC
// ==========================================================

function saveLinks() { 
  secureSave(CONFIG.STORAGE_PREFIX + 'links', linksData); 
}

function saveCustomLinkLocal() {
  const t = document.getElementById('new-link-title').value.trim();
  const u = document.getElementById('new-link-url').value.trim();
  const d = document.getElementById('new-link-desc').value.trim();
  const c = document.getElementById('new-link-category').value;
  const i = document.getElementById('new-link-icon').value;
  if (!t || !u || !d) return showToast("Harap lengkapi semua formulir!", "warning");
  
  linksData.push({ 
    id: `link-${Date.now()}`, 
    title: t, 
    url: u, 
    desc: d, 
    category: c, 
    icon: i, 
    system: false, 
    createdAt: Date.now() 
  });
  saveLinks();
  renderDynamicLinks();
  closeAddLinkModal();
  showToast("Tautan kustom berhasil ditambahkan!");
  
  document.getElementById('new-link-title').value = '';
  document.getElementById('new-link-url').value = '';
  document.getElementById('new-link-desc').value = '';
}

function deleteCustomLink(id) {
  showCustomConfirm("Hapus Tautan?", "Tautan kustom ini akan dihapus secara permanen.", () => {
    linksData = linksData.filter(l => l.id !== id);
    saveLinks();
    renderDynamicLinks();
    showToast("Tautan berhasil dihapus.");
  }, 'fa-trash-can');
}

function resetToDefaultLinks() {
  showCustomConfirm("Reset Portal?", "Semua tautan kustom Anda akan terhapus dan kembali ke setelan pabrik.", () => {
    fetch('data/default-links.json')
      .then(res => res.json())
      .then(data => {
        linksData = data;
        saveLinks();
        renderDynamicLinks();
        showToast("Sistem berhasil di-reset!");
      })
      .catch(() => {
        // Fallback jika pemanggilan fetch offline gagal
        linksData = [...defaultSeedLinks]; 
        saveLinks();
        renderDynamicLinks();
        showToast("Sistem berhasil di-reset (lokal)!");
      });
  }, 'fa-arrows-rotate');
}