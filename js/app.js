// ==========================================================
// CENTRAL APPLICATION ENTRY POINT & GLOBAL STATE DECLARATIONS
// ==========================================================

var CONFIG = {
  SCHOOL_NAME_LONG: "UPT SPF SMP Negeri 3 Makassar",
  SCHOOL_NAME_SHORT: "SMP Negeri 3 Makassar",
  SCHOOL_CODE_ABBR: "SPENTIG", 
  NPSN: "40312436",
  OPERATOR_NAME: "Rahmat Rahim",
  RAPOR_URL: "https://rapor.smpn3makassar.sch.id",
  CUTOFF_DATE: "August 31, 2026 23:59:59",
  CUTOFF_TITLE: "Batas Akhir Pemutakhiran Dapodik 2026",
  CUTOFF_DESC: "Batas waktu sinkronisasi data profil sekolah dan peserta didik untuk perhitungan dana BOS.",
  CUTOFF_FOOTER_TEXT: "Target Batas: 31 Agustus 2026",
  STORAGE_PREFIX: "dapohub-",
  SECURE_PASS_KEY: "dapohub-default-salt-key-2026", // Akan didefinisikan ulang berdasarkan Master PIN
  IDLE_LIMIT_MINUTES: 15
};

// Deklarasi Variabel State Global (Mencegah Bug Temporal Dead Zone)
var activeCategory = 'semua';
var linksData = [];
var agendaData = [];
var notesData = [];
var waTemplates = [];
var authenticatorKeys = [];
var currentDateObj = new Date();
var qrScannerObj = null;
var isScanning = false;
var totpIntervalId = null;
var toastTimeoutId = null;
var activeConfirmCallback = null;
var idleTimeCounter = 0;
var sessionLocked = false;
var userMasterPin = ""; // State PIN aktif untuk kunci enkripsi dinamis

var defaultWaTemplates = [
  { id: "rapor", name: "1. Pengumpulan Nilai E-Rapor", text: `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu Guru {nama},\n\nDengan hormat, mohon bantuannya untuk segera melakukan pengisian dan sinkronisasi Nilai Rapor Kelas Anda pada aplikasi E-Rapor ${CONFIG.SCHOOL_NAME_SHORT} sebelum batas waktu pengumpulan.\n\nAtas dedikasi, kerja sama, dan perhatian Bapak/Ibu, kami ucapkan terima kasih.\n\nHormat kami,\nOperator Dapodik & IT` },
  { id: "data", name: "2. Verifikasi NIK & Berkas Dapodik", text: `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu {nama},\n\nSehubungan dengan proses pemutakhiran data berkala, mohon kesediaan Bapak/Ibu untuk memeriksa kembali kesesuaian Nomor Induk Kependudukan (NIK) serta kelengkapan riwayat kerja di portal Dapodik.\n\nJika terdapat kekeliruan data, silakan menghubungi Operator Sekolah untuk perbaikan.\n\nTerima kasih,\nOperator Dapodik & IT` },
  { id: "belajar", name: "3. Aktivasi Akun Belajar.id", text: `Yth. Bapak/Ibu Guru {nama},\n\nMohon bantuannya untuk melakukan aktivasi akun pembelajaran Belajar.id Anda guna kelancaran akses ke platform Merdeka Mengajar (PMM), Rapor Pendidikan, dan administrasi kementerian lainnya.\n\nJika membutuhkan bantuan dalam pemulihan kata sandi, silakan menghubungi tim IT sekolah.\n\nSalam hormat,\nOperator Dapodik & IT` }
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
  document.getElementById('view-school-badge-pfp').textContent = CONFIG.SCHOOL_CODE_ABBR;
  document.getElementById('view-cutoff-title').innerHTML = `<i class="fa-solid fa-clock-rotate-left animate-pulse"></i> ${CONFIG.CUTOFF_TITLE}`;
  document.getElementById('view-cutoff-desc').textContent = CONFIG.CUTOFF_DESC;
  document.getElementById('view-cutoff-footer-target').textContent = CONFIG.CUTOFF_FOOTER_TEXT;

  const s = document.getElementById('view-school-profile');
  if (s) {
    s.innerHTML = `<i class="fa-solid fa-school text-blue-500"></i> ${CONFIG.SCHOOL_NAME_LONG}`;
    s.onclick = () => copyText(CONFIG.SCHOOL_NAME_LONG, "Nama sekolah berhasil disalin!");
  }
  const n = document.getElementById('view-npsn-profile');
  if (n) {
    n.innerHTML = `<i class="fa-solid fa-fingerprint text-sky-500"></i> NPSN: ${CONFIG.NPSN}`;
    n.onclick = () => copyText(CONFIG.NPSN, "NPSN sekolah berhasil disalin!");
  }
}

// Handler Validasi & Pembuatan PIN Master untuk Keamanan Enkripsi Lokal
function checkMasterPinSet() {
  const pinHash = localStorage.getItem(CONFIG.STORAGE_PREFIX + "pin-hash");
  const screen = document.getElementById('master-pin-screen');
  const title = document.getElementById('pin-screen-title');
  const desc = document.getElementById('pin-screen-desc');
  const btnText = document.getElementById('pin-btn-text');
  
  if (!pinHash) {
    title.textContent = "Atur PIN Master Baru";
    desc.textContent = "Buat 6-digit PIN Keamanan untuk mengenkripsi database kredensial dan data penting Anda di browser ini.";
    btnText.textContent = "Atur PIN Baru";
  } else {
    title.textContent = "Masukkan PIN Master";
    desc.textContent = "Gunakan PIN Master Anda untuk membuka enkripsi data sensitif (2FA, Catatan Saku, dan Agenda).";
    btnText.textContent = "Buka Enkripsi";
  }
  screen.classList.remove('opacity-0', 'pointer-events-none');
}

function handlePinSubmit() {
  const pinInput = document.getElementById('pin-input-field');
  const pin = pinInput.value.trim();
  if (pin.length !== 6 || isNaN(pin)) {
    showToast("PIN harus berupa 6-digit angka!", "error");
    return;
  }

  const savedHash = localStorage.getItem(CONFIG.STORAGE_PREFIX + "pin-hash");
  const computedHash = CryptoJS.SHA256(pin).toString();

  if (!savedHash) {
    // Registrasi PIN Baru
    localStorage.setItem(CONFIG.STORAGE_PREFIX + "pin-hash", computedHash);
    userMasterPin = pin;
    CONFIG.SECURE_PASS_KEY = pin + "dapohub-salt-2026";
    showToast("PIN Master berhasil diatur!");
    document.getElementById('master-pin-screen').classList.add('opacity-0', 'pointer-events-none');
    initializeDataAndEngines();
  } else {
    // Validasi Cocok
    if (computedHash === savedHash) {
      userMasterPin = pin;
      CONFIG.SECURE_PASS_KEY = pin + "dapohub-salt-2026";
      showToast("Autentikasi PIN Berhasil!");
      document.getElementById('master-pin-screen').classList.add('opacity-0', 'pointer-events-none');
      initializeDataAndEngines();
    } else {
      showToast("PIN Master salah! Coba lagi.", "error");
      pinInput.value = "";
    }
  }
}

function unlockWithPin() {
  const pinInput = document.getElementById('lock-pin-input');
  const pin = pinInput.value.trim();
  const savedHash = localStorage.getItem(CONFIG.STORAGE_PREFIX + "pin-hash");
  const computedHash = CryptoJS.SHA256(pin).toString();

  if (computedHash === savedHash) {
    pinInput.value = "";
    unlockSession();
  } else {
    showToast("PIN Master tidak cocok!", "error");
    pinInput.value = "";
  }
}

function initializeDataAndEngines() {
  // Membaca Data Cadangan Terenkripsi Lokal dengan Kunci Berbasis PIN
  linksData = secureRead(CONFIG.STORAGE_PREFIX + 'links');
  
  if (!linksData) {
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
    { id: "ag-2", text: "Verifikasi keaktifan dan residu NIK siswa pada portal VervalPD.", done: false, createdAt: Date.now() + 1 }
  ];
  notesData = secureRead(CONFIG.STORAGE_PREFIX + 'notes') || [];
  authenticatorKeys = secureRead(CONFIG.STORAGE_PREFIX + 'auth-keys') || [
    { id: '2fa-seed-myasn', label: 'MyASN BKN (Contoh)', user: 'admin@bkn.go.id', key: 'JBSWY3DPEHPK3PXP' }
  ];
  waTemplates = secureRead(CONFIG.STORAGE_PREFIX + 'wa-templates') || [...defaultWaTemplates];
  
  renderAll();
  initCalendar();
  populateWaSelect();
  updateClock();
  startTotpEngine();
  startCutOffCountdown();
  registerMainServiceWorker();
  updateOnlineStatus(navigator.onLine);
  pingAllEndpoints(); // Inisialisasi Ping Otomatis
}

// Bootstrap Awal Aplikasi
window.addEventListener('DOMContentLoaded', () => {
  applyConfigToDOM();
  checkMasterPinSet();

  const cancelBtn = document.getElementById('btn-confirm-cancel');
  const okBtn = document.getElementById('btn-confirm-ok');
  if (cancelBtn) cancelBtn.onclick = () => closeCustomConfirm(false);
  if (okBtn) okBtn.onclick = () => closeCustomConfirm(true);

  window.addEventListener('offline', () => { showToast('⚠️ Mode Luring (Offline) Aktif.', 'warning'); updateOnlineStatus(false); });
  window.addEventListener('online', () => { showToast('⚡ Portal terhubung kembali dengan jaringan.', 'success'); updateOnlineStatus(true); });

  ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'].forEach(e => {
    document.addEventListener(e, resetIdleTimer);
  });

  setInterval(() => {
    if (!sessionLocked && ++idleTimeCounter >= CONFIG.IDLE_LIMIT_MINUTES) lockUserSession();
  }, 60000);

  setInterval(updateClock, 1000);
});
