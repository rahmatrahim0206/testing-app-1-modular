// ==========================================================
// CENTRAL APPLICATION ENTRY POINT
// ==========================================================

function renderAll() {
  renderDynamicLinks();
  renderAgenda();
  renderQuickNotes();
  renderAuthenticatorKeys();
}

function applyConfigToDOM() {
  document.getElementById('view-school-header').textContent = CONFIG.SCHOOL_NAME_LONG;
  document.getElementById('view-operator-name').textContent = CONFIG.OPERATOR_NAME;
  document.getElementById('view-school-badge').textContent = CONFIG.SCHOOL_CODE_ABBR;
  document.getElementById('view-cutoff-title').innerHTML = `<i class="fa-solid fa-clock-rotate-left animate-pulse"></i> ${CONFIG.CUTOFF_TITLE}`;
  document.getElementById('view-cutoff-desc').textContent = CONFIG.CUTOFF_DESC;
  document.getElementById('view-cutoff-footer-target').textContent = CONFIG.CUTOFF_FOOTER_TEXT;

  const s = document.getElementById('view-school-profile');
  if (s) {
    s.innerHTML = `<i class="fa-solid fa-school text-blue-500"></i> ${CONFIG.SCHOOL_NAME_LONG}`;
    s.onclick = () => copyText(CONFIG.SCHOOL_NAME_LONG, "Nama sekolah disalin!");
  }
  const n = document.getElementById('view-npsn-profile');
  if (n) {
    n.innerHTML = `<i class="fa-solid fa-fingerprint text-sky-500"></i> NPSN: ${CONFIG.NPSN}`;
    n.onclick = () => copyText(CONFIG.NPSN, "NPSN disalin!");
  }
}

// Inisialisasi jendela peramban utama dimuat
window.onload = () => {
  applyConfigToDOM();
  
  // Baca Data Terenkripsi Lokal dari Storage
  linksData = secureRead(CONFIG.STORAGE_PREFIX + 'links');
  if (!linksData) {
    // Membaca dari asinkronus default-links.json atau seed cadangan luring
    fetch('data/default-links.json')
      .then(res => res.json())
      .then(data => {
        linksData = data;
        saveLinks();
        renderDynamicLinks();
      })
      .catch(() => {
        linksData = [...defaultSeedLinks];
        saveLinks();
        renderDynamicLinks();
      });
  }
  
  agendaData = secureRead(CONFIG.STORAGE_PREFIX + 'agendas') || [
    { id: "ag-1", text: "Koordinasi pemutakhiran data rombel kelas 7, 8, dan 9.", done: false, createdAt: Date.now() },
    { id: "ag-2", text: "Verifikasi validitas residu NIK siswa pada portal VervalPD.", done: false, createdAt: Date.now() + 1 }
  ];
  notesData = secureRead(CONFIG.STORAGE_PREFIX + 'notes') || [];
  authenticatorKeys = secureRead(CONFIG.STORAGE_PREFIX + 'auth-keys') || [
    { id: '2fa-seed-myasn', label: 'MyASN BKN (Contoh)', user: 'admin@bkn.go.id', key: 'JBSWY3DPEHPK3PXP' }
  ];
  waTemplates = secureRead(CONFIG.STORAGE_PREFIX + 'wa-templates') || [...defaultWaTemplates];
  
  // Memicu Render Visual Pertama Kali
  renderAll();
  initCalendar();
  populateWaSelect();
  updateClock();
  startTotpEngine();
  startCutOffCountdown();
  registerMainServiceWorker();
  updateOnlineStatus(navigator.onLine);

  // Penyelarasan event modal konfirmasi kustom
  const cancelBtn = document.getElementById('btn-confirm-cancel');
  const okBtn = document.getElementById('btn-confirm-ok');
  if (cancelBtn) cancelBtn.onclick = () => closeCustomConfirm(false);
  if (okBtn) okBtn.onclick = () => closeCustomConfirm(true);

  // Detektor Aktivitas Kerja (Auto-Lock Sesi Kerja)
  ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'].forEach(e => {
    document.addEventListener(e, resetIdleTimer);
  });

  setInterval(() => {
    if (!sessionLocked && ++idleTimeCounter >= CONFIG.IDLE_LIMIT_MINUTES) lockUserSession();
  }, 60000);

  setInterval(updateClock, 1000);
};