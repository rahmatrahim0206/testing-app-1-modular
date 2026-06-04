// ==========================================================
// SECURE LOCAL STORAGE HANDLER & DISASTER EMERGENCY RESET
// ==========================================================

function secureSave(key, rawData) {
  try {
    const stringified = JSON.stringify(rawData);
    if (typeof CryptoJS !== 'undefined') {
      localStorage.setItem(key, CryptoJS.AES.encrypt(stringified, CONFIG.SECURE_PASS_KEY).toString());
    } else {
      localStorage.setItem(key, stringified);
    }
  } catch (error) {
    localStorage.setItem(key, JSON.stringify(rawData));
  }
}

function secureRead(key) {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return null;
    if (rawValue.startsWith('[') || rawValue.startsWith('{') || rawValue.startsWith('"')) {
      return JSON.parse(rawValue);
    }
    if (typeof CryptoJS !== 'undefined') {
      const dec = CryptoJS.AES.decrypt(rawValue, CONFIG.SECURE_PASS_KEY).toString(CryptoJS.enc.Utf8);
      return dec ? JSON.parse(dec) : null;
    }
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
}

// Modul Ekspor Backup Data
function exportBackupData() { 
  const payload = {
    links: linksData,
    agendas: agendaData,
    notes: notesData,
    authKeys: authenticatorKeys
  };
  const b = new Blob([JSON.stringify(payload)], { type: 'application/json' }); 
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = 'backup_dapohub.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast("Cadangan sistem berhasil diekspor (Backup)!");
}

function triggerImportData() { 
  const importInput = document.getElementById('import-file-input');
  if (importInput) importInput.click(); 
}

// Modul Restore Data
function importBackupData(e) { 
  if (e.target.files[0]) { 
    const r = new FileReader();
    r.onload = (ev) => { 
      try { 
        const d = JSON.parse(ev.target.result); 
        linksData = d.links || linksData;
        agendaData = d.agendas || agendaData;
        notesData = d.notes || notesData;
        authenticatorKeys = d.authKeys || authenticatorKeys; 
        
        saveLinks();
        saveAgenda();
        secureSave(CONFIG.STORAGE_PREFIX + 'notes', notesData);
        saveAuthenticatorKeys();
        
        renderAll();
        showToast("Pemulihan data cadangan sukses (Restore)!"); 
      } catch (ex) {
        showToast("Format berkas backup tidak valid.", "error");
      } 
    };
    r.readAsText(e.target.files[0]); 
  } 
}

// --- TOMBOL RESET DARURAT (HAPUS DATA SENSITIF INSTAN) ---
function triggerEmergencyReset() {
  showCustomConfirm(
    "Lakukan Reset Sesi Darurat?", 
    "PERINGATAN DARURAT: Tindakan ini akan menghapus seluruh data sensitif Anda secara permanen dari browser ini, termasuk kunci keamanan 2FA, catatan penting, agenda kerja, serta tautan kustom yang telah ditambahkan. Sistem akan dimuat ulang ke pengaturan awal.", 
    () => {
      const keysToRemove = ['links', 'agendas', 'notes', 'auth-keys', 'wa-templates'];
      keysToRemove.forEach(key => {
        localStorage.removeItem(CONFIG.STORAGE_PREFIX + key);
      });
      showToast("Prosedur darurat berhasil dijalankan. Memuat ulang sistem...", "error");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }, 
    'fa-triangle-exclamation'
  );
}
