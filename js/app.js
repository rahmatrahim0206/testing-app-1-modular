// ==========================================================
// CENTRAL APPLICATION ENTRY POINT
// ==========================================================

// Global configuration
const CONFIG = {
  SCHOOL_NAME_LONG: "UPT SPF SMP Negeri 3 Makassar",
  SCHOOL_NAME_SHORT: "SMP Negeri 3 Makassar",
  SCHOOL_CODE_ABBR: "SPENTIG", 
  NPSN: "40312436",
  OPERATOR_NAME: "Rahmat Rahim",
  RAPOR_URL: "https://rapor.smpn3makassar.sch.id",
  CUTOFF_DATE: "August 31, 2026 23:59:59",
  CUTOFF_TITLE: "Cut-Off BOS Reguler 2026",
  CUTOFF_DESC: "Batas akhir penarikan data siswa untuk dana BOS sekolah.",
  CUTOFF_FOOTER_TEXT: "Target: 31 Agustus 2026",
  SECURE_PASS_KEY: "dapohub-secure-universal-key-2026",
  STORAGE_PREFIX: "dapohub-",
  IDLE_LIMIT_MINUTES: 15
};

// State variabel aplikasi
let activeCategory = 'semua';
let linksData = [];
let agendaData = [];
let notesData = [];
let waTemplates = [];
let authenticatorKeys = [];
let currentDateObj = new Date();
let qrScannerObj = null;
let isScanning = false;
let totpIntervalId = null;
let toastTimeoutId = null;
let activeConfirmCallback = null;
let idleTimeCounter = 0;
let sessionLocked = false;

const defaultWaTemplates = [
  { id: "rapor", name: "1. Pengumpulan Nilai E-Rapor", text: `Yth. {nama},\n\nMohon bantuannya untuk segera menginput dan menyinkronkan Nilai Rapor Kelas Anda ke aplikasi E-Rapor ${CONFIG.SCHOOL_NAME_SHORT} sebelum batas waktu pengumpulan.\n\nTerima kasih atas dedikasi dan kerja samanya.\n\nSalam,\nOperator Dapodik` },
  { id: "data", name: "2. Perbaikan Berkas & NIK Dapodik", text: "Yth. {nama},\n\nMohon kesediaannya untuk memeriksa kembali dan memverifikasi kelengkapan berkas kependudukan, kesesuaian NIK, serta Riwayat Kepangkatan Anda di portal Dapodik sekolah.\n\nHarap hubungi operator jika terdapat kekeliruan.\n\nTerima kasih,\nOperator Dapodik" },
  { id: "belajar", name: "3. Aktivasi Akun Belajar.id", text: "Yth. {nama},\n\nHarap segera melakukan aktivasi akun pembelajaran Belajar.id Anda demi kelancaran akses rapor pendidikan, platform Merdeka Mengajar, and administrasi dinas lainnya.\n\nJika menemui kendala reset password, harap hubungi Operator sekolah.\n\nTerima kasih,\nOperator Dapodik" }
];

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
        // Fallback aman jika dibuka tanpa web server (menggunakan array dari links.js)
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
