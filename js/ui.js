// ==========================================================
// USER INTERACTION & RENDERING FLOW
// ==========================================================

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  if (toastIcon) {
    toastIcon.className = "fa-solid text-base";
    if (type === 'error') toastIcon.classList.add('fa-triangle-exclamation', 'text-rose-500');
    else if (type === 'warning') toastIcon.classList.add('fa-circle-exclamation', 'text-amber-500');
    else toastIcon.classList.add('fa-circle-check', 'text-emerald-400', 'dark:text-emerald-600');
  }
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');
  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
  }, 4000);
}

function showCustomConfirm(title, message, callback, iconClass = 'fa-circle-question') {
  const modal = document.getElementById('custom-confirm-modal');
  if (!modal) return;
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').textContent = message;
  document.getElementById('confirm-modal-icon').className = `fa-solid ${iconClass}`;
  activeConfirmCallback = callback;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modal.children[0].classList.replace('scale-95', 'scale-100');
}

function closeCustomConfirm(approved = false) {
  const modal = document.getElementById('custom-confirm-modal');
  if (!modal) return;
  modal.classList.add('opacity-0', 'pointer-events-none');
  modal.children[0].classList.replace('scale-100', 'scale-95');
  if (approved && typeof activeConfirmCallback === 'function') activeConfirmCallback();
  activeConfirmCallback = null;
}

// Rendering Panel Tautan & Pemfilteran Kategori Utama
function renderDynamicLinks() {
  const wrapper = document.getElementById('dynamic-links-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  const catMap = {
    'utama': { title: 'Portal Utama & Dapodik', icon: 'fa-folder-open', color: 'text-blue-500' },
    'verval': { title: 'Verval & Validasi', icon: 'fa-shield-halved', color: 'text-emerald-500' },
    'keuangan': { title: 'BOS & Keuangan', icon: 'fa-wallet', color: 'text-amber-500' },
    'guru': { title: 'Layanan GTK', icon: 'fa-chalkboard-user', color: 'text-indigo-500' },
    'kepegawaian': { title: 'Layanan ASN', icon: 'fa-id-card-clip', color: 'text-sky-500' },
    'ujian': { title: 'Asesmen (ANBK)', icon: 'fa-laptop-code', color: 'text-rose-500' },
    'daerah': { title: 'Dinas & Daerah', icon: 'fa-city', color: 'text-purple-500' }
  };

  const q = document.getElementById('search-input').value.toLowerCase().trim();
  let total = 0;
  let counts = { semua: 0, utama: 0, verval: 0, keuangan: 0, guru: 0, kepegawaian: 0, "2fa_auth": 0, ujian: 0, daerah: 0 };

  linksData.forEach(l => {
    if (l.title.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q)) {
      counts[l.category] = (counts[l.category] || 0) + 1;
      total++;
    }
  });
  counts['semua'] = total;
  counts['2fa_auth'] = authenticatorKeys.length;

  Object.keys(counts).forEach(k => {
    const b = document.getElementById(`badge-${k}`);
    if (b) b.textContent = counts[k];
  });

  let totalVis = 0;
  Object.keys(catMap).forEach(cat => {
    const filtered = linksData.filter(l => (activeCategory === 'semua' || activeCategory === cat) && l.category === cat && (l.title.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q)));
    if (filtered.length > 0) {
      const sec = document.createElement('div');
      sec.innerHTML = `<h3 class="text-xs font-black tracking-wider uppercase text-slate-400 mb-4 flex items-center gap-2"><i class="fa-solid ${catMap[cat].icon} ${catMap[cat].color}"></i> ${catMap[cat].title}</h3>`;
      
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
      
      filtered.forEach(l => {
        totalVis++;
        const a = document.createElement('a');
        a.href = l.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.className = 'block p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:border-blue-500 hover:shadow-lg transition-all group relative';
        const delBtn = !l.system ? `<button onclick="event.preventDefault(); event.stopPropagation(); deleteCustomLink('${l.id}')" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition z-20 p-1"><i class="fa-solid fa-trash text-xs"></i></button>` : '';
        a.innerHTML = `${delBtn}
          <div class="flex items-start gap-3 sm:gap-4">
            <div class="p-2.5 sm:p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 group-hover:scale-110 transition flex-shrink-0"><i class="fa-solid ${l.icon || 'fa-globe'} text-lg sm:text-xl"></i></div>
            <div class="flex-1 pr-4 min-w-0">
              <h4 class="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm md:text-base group-hover:text-blue-600 flex items-center gap-1 truncate font-space">${l.title} <i class="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-0 group-hover:opacity-100 transition"></i></h4>
              <p class="text-[10px] sm:text-xs text-slate-500 mt-1.5 leading-relaxed break-words">${l.desc}</p>
            </div>
          </div>`;
        grid.appendChild(a);
      });
      sec.appendChild(grid);
      wrapper.appendChild(sec);
    }
  });

  const noRes = document.getElementById('no-results-message');
  if (noRes) totalVis === 0 ? noRes.classList.remove('hidden') : noRes.classList.add('hidden');
}

function selectCategory(cat) {
  activeCategory = cat;
  const p2Fa = document.getElementById('panel-2fa-main-auth');
  const pLinks = document.getElementById('panel-links-main-wrapper');
  if (p2Fa && pLinks) {
    if (cat === '2fa_auth') {
      p2Fa.classList.remove('hidden');
      pLinks.classList.add('hidden');
      renderAuthenticatorKeys();
    } else {
      p2Fa.classList.add('hidden');
      pLinks.classList.remove('hidden');
    }
  }
  
  document.querySelectorAll('.category-tab').forEach(t => {
    const c = t.getAttribute('data-category');
    const b = t.querySelector('span:last-child');
    if (c === cat) {
      t.className = 'category-tab inline-flex lg:flex items-center justify-between w-auto lg:w-full px-4 py-2.5 text-xs font-bold rounded-xl transition-all bg-blue-600 text-white shadow-md';
      if(b) b.className = 'ml-1.5 bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono';
    } else {
      t.className = 'category-tab inline-flex lg:flex items-center justify-between w-auto lg:w-full px-4 py-2.5 text-xs font-bold rounded-xl transition-all bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200';
      if(b) b.className = 'ml-1.5 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono';
    }
  });
  filterLinksOrKeys();
}

// Beralih Tab Antara Agenda, Kalender, Alat IT
function switchAsistenTab(t) {
  ['agenda', 'kalender', 'alat'].forEach(id => {
    const btn = document.getElementById(`btn-tab-${id}`);
    const panel = document.getElementById(`panel-tab-${id}`);
    if (btn) btn.className = id === t ? "flex-1 py-2 px-2 rounded-xl text-[11px] font-extrabold bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "flex-1 py-2 px-2 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-800";
    if (panel) panel.classList.toggle('hidden', id !== t);
  });
}

function switchSubTab(t) {
  ['tugas', 'memo'].forEach(id => {
    const btn = document.getElementById(`btn-sub-${id}`);
    const panel = document.getElementById(`sub-panel-${id}`);
    if (btn) btn.className = id === t ? "flex-1 py-1.5 text-[10px] font-black bg-white dark:bg-slate-800 text-blue-600 shadow-xs rounded-lg" : "flex-1 py-1.5 text-[10px] font-bold text-slate-500";
    if (panel) panel.classList.toggle('hidden', id !== t);
  });
}