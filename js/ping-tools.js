// ==========================================================
// SYSTEM SERVER STATUS & REAL-TIME LATENCY PING TOOL
// ==========================================================

var endpointsToMonitor = [
  { name: "Server Utama Dapodik", url: "https://dapo.kemendikdasmen.go.id", lastPing: "-", status: "unknown" },
  { name: "Verifikasi Peserta Didik (VervalPD)", url: "https://vervalpd.data.kemendikdasmen.go.id", lastPing: "-", status: "unknown" },
  { name: "Verifikasi Pendidik (VervalPTK)", url: "https://vervalptk.data.kemendikdasmen.go.id", lastPing: "-", status: "unknown" },
  { name: "Portal Anggaran BOSP Salur", url: "https://bosp.kemendikdasmen.go.id", lastPing: "-", status: "unknown" },
  { name: "Portal SIMPKB Paspor", url: "https://paspor-gtk.simpkb.id", lastPing: "-", status: "unknown" },
  { name: "Sipintar PIP Kemendikdasmen", url: "https://pip.kemendikdasmen.go.id", lastPing: "-", status: "unknown" }
];

var autoPingIntervalId = null;
var autoPingActive = true;

// Pembuat UI Grid Monitor Latensi Server Kemendikbud
function renderPingGrid() {
  const container = document.getElementById('ping-grid-container');
  if (!container) return;
  container.innerHTML = '';
  
  endpointsToMonitor.forEach((ep, idx) => {
    let cardBorder = "border-slate-200/60 dark:border-slate-700/60";
    let pingBadge = "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400";
    let statusText = "Mendeteksi...";
    let indicatorColor = "bg-slate-400 animate-pulse";

    if (ep.status === "excellent") {
      cardBorder = "border-emerald-500/30 hover:shadow-emerald-500/5";
      pingBadge = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
      statusText = "Sangat Lancar";
      indicatorColor = "bg-emerald-500";
    } else if (ep.status === "crowded") {
      cardBorder = "border-amber-500/30 hover:shadow-amber-500/5";
      pingBadge = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
      statusText = "Padat / Lambat";
      indicatorColor = "bg-amber-500";
    } else if (ep.status === "down") {
      cardBorder = "border-rose-500/30 hover:shadow-rose-500/5";
      pingBadge = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
      statusText = "RTO / Down";
      indicatorColor = "bg-rose-500 animate-ping";
    }

    container.innerHTML += `
      <div class="p-4 bg-white dark:bg-slate-800 border ${cardBorder} rounded-2xl hover:shadow-md transition duration-200 flex flex-col justify-between">
        <div class="flex justify-between items-start gap-2 mb-3">
          <div class="truncate">
            <h4 class="text-xs font-black truncate text-slate-900 dark:text-white" title="${ep.name}">${ep.name}</h4>
            <p class="text-[9px] text-slate-400 dark:text-slate-500 truncate" title="${ep.url}">${ep.url}</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${pingBadge}">
            ${ep.lastPing}
          </span>
        </div>
        <div class="flex items-center justify-between text-[10px] font-bold">
          <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-space">
            <span class="w-1.5 h-1.5 rounded-full ${indicatorColor}"></span> ${statusText}
          </span>
          <button onclick="pingSingleEndpoint(${idx})" class="text-blue-500 hover:text-blue-700 transition" title="Refresh Ping">
            <i class="fa-solid fa-rotate text-xs"></i>
          </button>
        </div>
      </div>`;
  });
  
  // Mengisi lencana hitungan di Kategori menu tab
  const pingBadge = document.getElementById('badge-ping_tools');
  if (pingBadge) pingBadge.textContent = endpointsToMonitor.length;
}

// Fungsi Mengukur Latensi dengan Skema CORS Fetch Timeout (AJAX RTT)
async function pingSingleEndpoint(idx) {
  const ep = endpointsToMonitor[idx];
  const start = Date.now();
  const cacheBuster = `?cb=${Date.now()}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 detik batas RTO
    
    // Melakukan HEAD / GET request ringan untuk melacak jabat tangan TLS
    await fetch(ep.url + cacheBuster, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - start;
    ep.lastPing = `${latency} ms`;
    
    if (latency < 150) {
      ep.status = "excellent";
    } else {
      ep.status = "crowded";
    }
  } catch (err) {
    ep.lastPing = "RTO";
    ep.status = "down";
  }
  
  renderPingGrid();
}

function pingAllEndpoints() {
  endpointsToMonitor.forEach((_, idx) => {
    pingSingleEndpoint(idx);
  });
}

function toggleAutoPing() {
  const btn = document.getElementById('btn-toggle-autoping');
  const text = document.getElementById('text-autoping');
  const icon = document.getElementById('icon-autoping');
  
  if (autoPingActive) {
    // Matikan Auto Ping
    if (autoPingIntervalId) clearInterval(autoPingIntervalId);
    autoPingActive = false;
    text.textContent = "Mulai Auto";
    icon.className = "fa-solid fa-play";
    showToast("Auto-ping dinonaktifkan.", "warning");
  } else {
    // Hidupkan Auto Ping
    autoPingIntervalId = setInterval(pingAllEndpoints, 10000);
    autoPingActive = true;
    text.textContent = "Hentikan Auto";
    icon.className = "fa-solid fa-stop";
    showToast("Auto-ping aktif kembali (setiap 10s).");
    pingAllEndpoints();
  }
}

// Jalankan auto ping pertama kali
window.addEventListener('DOMContentLoaded', () => {
  renderPingGrid();
  autoPingIntervalId = setInterval(pingAllEndpoints, 10000);
});
