const APP_PASSWORD_SECRET = "mbohraroh";

// Client 1: Untuk data_jamaah, data_generus, dan fasilitas_kelompok
const SUPABASE_URL_UTAMA = "https://xijlyydfogbkcctlycsb.supabase.co";
const SUPABASE_ANON_KEY_UTAMA = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpamx5eWRmb2dia2NjdGx5Y3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzAxODYsImV4cCI6MjA5NzcwNjE4Nn0.JwqYXWEt2yiLioI1o9qZ3KRrak2rtzO1Tp0eN7AuAm4";
const supabaseUtama = supabase.createClient(SUPABASE_URL_UTAMA, SUPABASE_ANON_KEY_UTAMA);

// Client 2: Khusus untuk absensi
const SUPABASE_URL_ABSENSI = "https://gttavghryoadthnvwthd.supabase.co";
const SUPABASE_ANON_KEY_ABSENSI = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dGF2Z2hyeW9hZHRobnZ3dGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDI5NDQsImV4cCI6MjA5NjQ3ODk0NH0.0O7I9EqSaiQq8_LKMJS9U-XDuitY6sPfYQVtBsJAeas";
const supabaseAbsensi = supabase.createClient(SUPABASE_URL_ABSENSI, SUPABASE_ANON_KEY_ABSENSI);

// State Pengguna & Role Sesi Aplikasi
let currentUser = {
    role: null, // 'DEVELOPER' atau 'OPERATOR'
    desa: null,
    kelompok: null
};

let globalCache = {
    jamaah: [],
    generus: [],
    sarpras: [],
    absensi: [],
    isLoaded: false
};

let currentMode = "DAFTAR";
let activeSectionId = 'home';
let activeRekapSubTab = "STATUS_KESELURUHAN";
let activeAbsensiSubTab = "INPUT";

window.allOperatorsCache = [];
window.activeOperatorDataset = [];
window.activeStatusDataset = [];
window.activeKelompokDataset = [];
window.activeDisabilitasDataset = [];
window.currentGroupJamaahData = [];

function showDataLoading(message = "Mengambil data...") {
    const overlay = document.getElementById('dataFetchOverlay');
    const subtext = document.getElementById('dataFetchSubtext');
    if (subtext) subtext.textContent = message;
    if (overlay) overlay.classList.add('active');
}

function hideDataLoading() {
    const overlay = document.getElementById('dataFetchOverlay');
    if (overlay) overlay.classList.remove('active');
}

async function fetchAllRows(client, tableName, selectColumns = '*') {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        let query = client.from(tableName).select(selectColumns);

        if (currentUser.role === 'OPERATOR' && currentUser.desa && currentUser.kelompok) {
            query = query.eq('desa', currentUser.desa).eq('kelompok', currentUser.kelompok);
        }

        const { data: pageData, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (pageData && pageData.length > 0) {
            allData = allData.concat(pageData);
        }

        if (!pageData || pageData.length < pageSize) {
            hasMore = false;
        } else {
            page++;
        }
    }
    return allData;
}

async function preloadAllApplicationData() {
    if (globalCache.isLoaded) return;
    showDataLoading("Mengunduh seluruh database...");
    try {
        const [dataJamaah, dataGenerus, dataSarpras, dataAbsensi] = await Promise.all([
            fetchAllRows(supabaseUtama, 'data_jamaah', '*'),
            fetchAllRows(supabaseUtama, 'data_generus', '*').catch(() => []),
            fetchAllRows(supabaseUtama, 'fasilitas_kelompok', '*').catch(() => []),
            fetchAllRows(supabaseAbsensi, 'absensi_sdc', '*').catch(() => [])
        ]);

        globalCache.jamaah = dataJamaah || [];
        globalCache.generus = dataGenerus || [];
        globalCache.sarpras = dataSarpras || [];
        globalCache.absensi = dataAbsensi || [];
        globalCache.isLoaded = true;
    } catch (err) {
        console.error("Gagal memuat awal data:", err);
        showCustomModal("Peringatan", "Gagal memuat beberapa data dari server. Aplikasi akan mencoba menggunakan data terbaru saat ini.", "⚠️");
    } finally {
        hideDataLoading();
    }
}

const SECTION_THEMES = {
    absensi: {
        btnGradient: 'from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700',
        iconBgModal: 'bg-gradient-to-br from-fuchsia-100 to-pink-100 text-fuchsia-600',
        borderColorModal: 'rgba(217, 70, 239, 0.4)',
        pickerThemeClass: 'theme-absensi',
        pickerTitleClass: 'text-fuchsia-800'
    },
    sarpras: {
        btnGradient: 'from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700',
        iconBgModal: 'bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-600',
        borderColorModal: 'rgba(20, 184, 166, 0.4)',
        pickerThemeClass: 'theme-sarpras',
        pickerTitleClass: 'text-teal-800'
    },
    rekap: {
        btnGradient: 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700',
        iconBgModal: 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600',
        borderColorModal: 'rgba(245, 158, 11, 0.4)',
        pickerThemeClass: 'theme-rekap',
        pickerTitleClass: 'text-amber-800'
    },
    default: {
        btnGradient: 'from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700',
        iconBgModal: 'bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-indigo-600',
        borderColorModal: 'rgba(255, 255, 255, 0.6)',
        pickerThemeClass: '',
        pickerTitleClass: 'text-indigo-800'
    }
};

function getCurrentTheme() {
    return SECTION_THEMES[activeSectionId] || SECTION_THEMES.default;
}

const getIntVal = id => parseInt(document.getElementById(id)?.value, 10) || 0;

function formatRupiahInput(input) {
    let numberString = input.value.replace(/[^0-9]/g, '');
    if (numberString === '') {
        input.value = '';
        return;
    }
    input.value = parseInt(numberString, 10).toLocaleString('id-ID');
}

function toggleAuthRegisterView(showReg = null) {
    const loginForm = document.getElementById('authForm');
    const regForm = document.getElementById('authRegForm');
    const titleEl = document.getElementById('authTitle');
    const subtitleEl = document.getElementById('authSubtitle');
    const toggleBtn = document.getElementById('btnToggleAuthMode');
    const iconBox = document.getElementById('authIconBox');

    const shouldShowReg = showReg !== null ? showReg : loginForm.classList.contains('hidden') === false;

    if (shouldShowReg) {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        titleEl.textContent = "Buat Password";
        subtitleEl.textContent = "Daftarkan password kelompok secara mandiri";
        toggleBtn.textContent = "🔑 Sudah Memiliki Password? Login Sekarang";
        iconBox.textContent = "📝";
        
        const regDesa = document.getElementById('regDesa');
        if (regDesa && regDesa.options.length <= 1) {
            regDesa.innerHTML = '<option value="">-- Pilih Desa --</option>';
            Object.keys(dataWilayah).forEach(d => regDesa.add(new Option(d, d)));
        }
    } else {
        regForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        titleEl.textContent = "Akses Terkunci";
        subtitleEl.textContent = "Masukkan kata sandi untuk mengakses aplikasi";
        toggleBtn.textContent = "🔑 Registrasi Password";
        iconBox.textContent = "🔒";
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const inputEl = document.getElementById('appPasswordInput');
    const inputVal = inputEl.value.trim();
    const errEl = document.getElementById('authErrorMsg');
    const successEl = document.getElementById('authSuccessMsg');
    const btn = document.getElementById('authSubmitBtn');
    const btnText = document.getElementById('authBtnText');
    const spinner = document.getElementById('authBtnSpinner');
    const iconBox = document.getElementById('authIconBox');

    errEl.classList.add('hidden');
    successEl.classList.add('hidden');

    inputEl.disabled = true;
    btn.disabled = true;
    spinner.classList.remove('hidden');
    btnText.textContent = "Verifikasi Sandi...";

    try {
        if (inputVal === APP_PASSWORD_SECRET) {
            currentUser = { role: 'DEVELOPER', desa: null, kelompok: null };
            sessionStorage.setItem('userSession', JSON.stringify(currentUser));
        } else {
            const { data: opData, error } = await supabaseUtama
                .from('password_kelompok')
                .select('*')
                .eq('password_kelompok', inputVal)
                .maybeSingle();

            if (error || !opData) {
                throw new Error("Password salah atau tidak terdaftar!");
            }

            currentUser = {
                role: 'OPERATOR',
                desa: opData.desa,
                kelompok: opData.kelompok
            };
            sessionStorage.setItem('userSession', JSON.stringify(currentUser));
        }

        spinner.classList.add('hidden');
        btnText.textContent = currentUser.role === 'DEVELOPER' ? "Akses Dev Diterima" : `Operator ${currentUser.kelompok}`;
        btn.className = "w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition duration-300 transform scale-105";
        iconBox.className = "w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-inner transition-colors duration-300";
        iconBox.textContent = "🔓";
        successEl.textContent = `✅ Login Sebagai ${currentUser.role === 'DEVELOPER' ? 'Developer (Full Access)' : 'Operator (' + currentUser.kelompok + ')'}`;
        successEl.classList.remove('hidden');

        setTimeout(async () => {
            const modal = document.getElementById('authModal');
            modal.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(async () => {
                modal.classList.add('hidden');
                await preloadAllApplicationData();
                applyRoleRestrictionsUI();
            }, 400);
        }, 600);

    } catch (err) {
        inputEl.disabled = false;
        btn.disabled = false;
        spinner.classList.add('hidden');
        btnText.textContent = "Buka Aplikasi";
        errEl.textContent = `⚠️ ${err.message || "Password salah! Silakan coba lagi."}`;
        errEl.classList.remove('hidden');
        inputEl.value = "";
        inputEl.focus();
    }
}

function handleLogout() {
    showCustomModal(
        "Konfirmasi Keluar",
        "Apakah Anda yakin ingin keluar dari sesi aplikasi?",
        `<svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
        () => {
            sessionStorage.removeItem('userSession');
            window.location.reload();
        },
        true
    );
}

async function handleRegisterOperatorPassword(e) {
    e.preventDefault();
    const desa = document.getElementById('regDesa').value;
    const kelompok = document.getElementById('regKelompok').value;
    const pass1 = document.getElementById('regPasswordInput').value.trim();
    const pass2 = document.getElementById('regPasswordConfirmInput').value.trim();

    if (!desa || !kelompok) {
        showCustomModal("Peringatan", "Silakan pilih Desa dan Kelompok terlebih dahulu!", "⚠️");
        return;
    }

    if (pass1 !== pass2) {
        showCustomModal("Peringatan", "Konfirmasi password tidak cocok!", "⚠️");
        return;
    }

    if (pass1.length < 4) {
        showCustomModal("Peringatan", "Password minimal 4 karakter!", "⚠️");
        return;
    }

    showDataLoading("Mendaftarkan password kelompok...");

    try {
        const { data: existingGroup, error: checkGroupErr } = await supabaseUtama
            .from('password_kelompok')
            .select('*')
            .eq('desa', desa)
            .eq('kelompok', kelompok)
            .maybeSingle();

        if (existingGroup) {
            throw new Error(`Kelompok ${kelompok} (${desa}) sudah memiliki password. Silakan hubungi Developer jika lupa password.`);
        }

        const { data: duplicatePass, error: checkPassErr } = await supabaseUtama
            .from('password_kelompok')
            .select('*')
            .eq('password_kelompok', pass1)
            .maybeSingle();

        if (duplicatePass) {
            throw new Error("Password ini sudah digunakan oleh kelompok lain. Silakan buat kombinasi password yang berbeda!");
        }

        const { error: insertErr } = await supabaseUtama
            .from('password_kelompok')
            .insert([{ desa: desa, kelompok: kelompok, password_kelompok: pass1 }]);

        if (insertErr) throw insertErr;

        showCustomModal(
            "Registrasi Berhasil", 
            `Password untuk Kelompok ${kelompok} berhasil dibuat! Silakan login menggunakan password tersebut.`, 
            "🎉",
            () => {
                toggleAuthRegisterView(false);
                document.getElementById('appPasswordInput').value = pass1;
                document.getElementById('appPasswordInput').focus();
            }
        );

    } catch (err) {
        showCustomModal("Gagal Registrasi", err.message || "Gagal menyimpan password kelompok.", "❌");
    } finally {
        hideDataLoading();
    }
}

function autoFillSarprasOperator() {
    if (!currentUser || currentUser.role !== 'OPERATOR' || !currentUser.desa || !currentUser.kelompok) return;
    if (!globalCache || !globalCache.sarpras) return;

    const data = globalCache.sarpras.find(s => s.desa === currentUser.desa && s.kelompok === currentUser.kelompok);

    if (data) {
        const editIdEl = document.getElementById('edit_sarpras_id');
        const desaEl = document.getElementById('sarp_desa');
        const kelompokEl = document.getElementById('sarp_kelompok');

        if (editIdEl) editIdEl.value = data.id || '';
        if (desaEl) desaEl.value = data.desa || currentUser.desa;

        if (kelompokEl) {
            kelompokEl.innerHTML = `<option value="${currentUser.kelompok}">${currentUser.kelompok}</option>`;
            kelompokEl.value = currentUser.kelompok;
            kelompokEl.disabled = true;
            kelompokEl.classList.remove('bg-slate-100/50', 'text-slate-400');
        }

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val ?? 0;
        };

        const statusEl = document.getElementById('sarp_status_tanah');
        if (statusEl) statusEl.value = data.status_tanah || '';

        setVal('sarp_sub', data.jumlah_sub_kelompok);
        setVal('sarp_masjid', data.jumlah_masjid);
        setVal('sarp_aula', data.jumlah_aula);
        setVal('sarp_km_pria', data.km_pria);
        setVal('sarp_km_wanita', data.km_wanita);
        setVal('sarp_km_mt', data.km_mt);
        setVal('sarp_km_tamu', data.km_tamu);

        const btn = document.getElementById('sarpBtn');
        if (btn) btn.textContent = "Perbarui Data Sarpras";
    }
}

function applyRoleRestrictionsUI() {
    if (currentUser.role !== 'OPERATOR') return;

    const opDesa = currentUser.desa;
    const opKelompok = currentUser.kelompok;

    const pairs = [
        { desaId: 'desa', kelompokId: 'kelompok' },
        { desaId: 'searchDesa', kelompokId: 'searchKelompok' },
        { desaId: 'abs_desa', kelompokId: 'abs_kelompok' },
        { desaId: 'sarp_desa', kelompokId: 'sarp_kelompok' }
    ];

    pairs.forEach(({ desaId, kelompokId }) => {
        const dEl = document.getElementById(desaId);
        const kEl = document.getElementById(kelompokId);

        if (dEl && kEl) {
            dEl.value = opDesa;
            dEl.disabled = true;

            kEl.innerHTML = `<option value="${opKelompok}">${opKelompok}</option>`;
            kEl.value = opKelompok;
            kEl.disabled = true;
            kEl.classList.remove('bg-slate-100/50', 'text-slate-400');
        }
    });

    if (document.getElementById('searchKelompok')) {
        fetchAutoJamaahList(opDesa, opKelompok);
    }

    const btnSarprasDashboard = document.querySelector("button[onclick=\"showSection('sarpras')\"]");
    if (btnSarprasDashboard) {
        btnSarprasDashboard.classList.add('hidden');
    }

    const btnRekapDashboard = document.querySelector("button[onclick=\"showSection('rekap')\"]");
    if (btnRekapDashboard) {
        btnRekapDashboard.style.gridColumn = "1 / -1";
        btnRekapDashboard.style.justifySelf = "center";
        btnRekapDashboard.style.width = "100%";
        btnRekapDashboard.style.maxWidth = "320px";
    }

    const tabRekapSarpras = document.getElementById('tabRekapSarpras');
    if (tabRekapSarpras) {
        tabRekapSarpras.classList.add('hidden');
    }
}

function initScrollDetectors() {
    document.querySelectorAll('.table-vertical-scroll').forEach(container => {
        let ticking = false;
        container.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (container.scrollLeft > 10) {
                        container.classList.add('is-scrolled');
                    } else {
                        container.classList.remove('is-scrolled');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    });
}

const rawDataWilayah = {
    "Bandardawung": ["Bandardawung Barat", "Bandardawung Timur", "Dawung Atas", "Dawung Bawah", "Dawung Tengah", "Gamping", "Gondang Barat", "Gondang Tengah", "Gondang Timur", "Ngasem", "Pelas Barat", "Pelas Timur"],
    "Karanglo Selatan": ["Blimbing 1", "Blimbing 2", "Blimbing 3", "Jabalkanil", "Karanglo", "Pedan Selatan", "Pedan Utara"],
    "Karanglo Utara": ["Cepogo", "Dukuh", "Pandeyan", "Plombokan", "Sadakan Kidul 1", "Sadakan Kidul 2", "Sadakan Lor", "Sekuwung"],
    "Krangean": ["Gondang Boma", "Gondosuli", "Krangean Selatan", "Krangean Utara", "Nglegok Atas", "Nglegok Bawah", "Ngreso", "Somokado", "Tawang 1", "Tawang 2", "Watusambang"]
};

const dataWilayah = {};
Object.keys(rawDataWilayah).sort().forEach(key => {
    dataWilayah[key] = rawDataWilayah[key].sort();
});

function toTitleCase(str) { 
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase()); 
}

function toggleNoHpInput(statusValue) {
    const boxNoHp = document.getElementById('boxNoHpOperator');
    const noHpInput = document.getElementById('no_hp');
    if (statusValue === 'Operator') {
        boxNoHp.classList.remove('hidden');
        noHpInput.required = true;
    } else {
        boxNoHp.classList.add('hidden');
        noHpInput.required = false;
        noHpInput.value = '';
    }
}

function toggleDisabilitasOptionsForm() {
    const isDis = document.getElementById('is_disabilitas').checked;
    const wrap = document.getElementById('wrapperKategoriDisabilitas');
    if (isDis) {
        wrap.classList.remove('hidden');
        wrap.classList.add('animate-fade-in-up');
    } else {
        wrap.classList.add('hidden');
        resetDisabilitasCheckboxes();
    }
}

function resetDisabilitasCheckboxes() {
    document.querySelectorAll('input[name="kategori_disabilitas"]').forEach(cb => cb.checked = false);
}

function getSelectedKategoriDisabilitasForm() {
    return Array.from(document.querySelectorAll('input[name="kategori_disabilitas"]:checked')).map(cb => cb.value);
}

window.addEventListener('popstate', (event) => {
    const centerPicker = document.getElementById('centerPickerModal');
    if (centerPicker && !centerPicker.classList.contains('hidden')) {
        closeCenterPicker(false);
        return;
    }

    const belumAbsenModal = document.getElementById('belumAbsenModal');
    if (belumAbsenModal && !belumAbsenModal.classList.contains('hidden')) {
        closeModal('belumAbsenModal', false);
        return;
    }

    const exportModal = document.getElementById('exportJamaahModal');
    if (exportModal && exportModal.classList.contains('active')) {
        closeModal('exportJamaahModal', false);
        return;
    }

    const statusModal = document.getElementById('statusDetailModal');
    if (statusModal && statusModal.classList.contains('active')) {
        closeModal('statusDetailModal', false);
        return;
    }

    const disModal = document.getElementById('disabilitasDetailModal');
    if (disModal && disModal.classList.contains('active')) {
        closeModal('disabilitasDetailModal', false);
        return;
    }

    const klpModal = document.getElementById('kelompokDetailModal');
    if (klpModal && klpModal.classList.contains('active')) {
        closeKelompokDetailModal();
        return;
    }

    const opModal = document.getElementById('operatorDetailModal');
    if (opModal && opModal.classList.contains('active')) {
        closeModal('operatorDetailModal', false);
        return;
    }

    const customModal = document.getElementById('customModal');
    if (customModal && customModal.classList.contains('active')) {
        closeModal('customModal', false);
        return;
    }

    if (event.state && event.state.section) {
        switchSectionView(event.state.section);
    } else {
        switchSectionView('home');
    }
});

function showSection(target, pushHistory = true) {
    if (currentUser.role === 'OPERATOR' && target === 'sarpras') {
        showCustomModal(
            "Fitur Dalam Pemeliharaan", 
            "Fitur Sarpras saat ini belum dapat diakses oleh Operator karena masih dalam tahap pembaruan data sistem.", 
            "🛠️"
        );
        return;
    }

    if (pushHistory) {
        history.pushState({ section: target }, '', '#' + target);
    }
    switchSectionView(target);
}

function switchSectionView(target) {
    if (currentUser.role === 'OPERATOR' && target === 'sarpras') {
        showSection('home', false);
        return;
    }

    const sections = {
        'home': document.getElementById('mainDashboard'),
        'database': document.getElementById('sectionDatabase'),
        'absensi': document.getElementById('sectionAbsensi'),
        'sarpras': document.getElementById('sectionSarpras'),
        'rekap': document.getElementById('sectionRekap')
    };

    const targetSection = sections[target];
    if (!targetSection) return;

    Object.keys(sections).forEach(secKey => {
        if (secKey !== target) {
            sections[secKey].classList.remove('section-active');
            sections[secKey].classList.add('hidden');
        }
    });

    targetSection.classList.remove('hidden');
    setTimeout(() => {
        targetSection.classList.add('section-active');
    }, 30);

    activeSectionId = target;

    if (target === 'database') {
        if (currentMode !== 'UPDATE') {
            switchMode('DAFTAR');
        }
    } else if (target === 'absensi') {
        switchTabAbsensi(activeAbsensiSubTab || 'INPUT');
        setupYearFilter();
        populateKegiatanFilter();
    } else if (target === 'sarpras') {
        const formSarp = document.getElementById('formSarpras');
        if (formSarp) formSarp.classList.remove('hidden');
        autoFillSarprasOperator(); 
    } else if (target === 'rekap') {
        const secSarp = document.getElementById('sectionSarpras');
        if (secSarp) secSarp.classList.add('hidden');
        switchTabRekap(activeRekapSubTab || 'STATUS_KESELURUHAN');
    }
}

function openModal(id, pushHistory = true) {
    const el = document.getElementById(id);
    if (!el) return;

    if (id === 'belumAbsenModal') {
        const modalContent = document.getElementById('belumAbsenModalCard');
        el.classList.remove('hidden');
        setTimeout(() => {
            el.classList.remove('opacity-0');
            if (modalContent) {
                modalContent.classList.remove('scale-90', 'opacity-0');
                modalContent.classList.add('scale-100', 'opacity-100');
            }
        }, 20);

        if (pushHistory) {
            history.pushState({ modalOpen: id, section: activeSectionId }, '', '#' + id);
        }
        return;
    }

    if (pushHistory) {
        history.pushState({ modal: id, section: activeSectionId }, '', '#' + id);
    }
    el.classList.remove('hidden');
    setTimeout(() => {
        el.classList.add('active');
    }, 20);
}

function closeModal(id, backHistory = true) {
    const el = document.getElementById(id);
    if (!el) return;

    if (id === 'belumAbsenModal') {
        const modalContent = document.getElementById('belumAbsenModalCard');
        if (modalContent) {
            modalContent.classList.remove('scale-100', 'opacity-100');
            modalContent.classList.add('scale-90', 'opacity-0');
        }
        el.classList.add('opacity-0');
        setTimeout(() => {
            el.classList.add('hidden');
        }, 300);
    } else {
        el.classList.remove('active');
        setTimeout(() => {
            el.classList.add('hidden');
        }, 350);
    }

    if (backHistory && window.history.state && (window.history.state.modal === id || window.history.state.modalOpen === id)) {
        window.history.back();
    }
}

function closeKelompokDetailModal() {
    const el = document.getElementById('kelompokDetailModal');
    if (!el) return;
    
    el.classList.remove('active');
    setTimeout(() => {
        el.classList.add('hidden');
    }, 300);

    switchTabRekap('REKAP_KELOMPOK');
}

function autoCapitalize(inputElement) {
    let start = inputElement.selectionStart;
    let end = inputElement.selectionEnd;
    let value = inputElement.value;
    let capitalized = toTitleCase(value);
    if (inputElement.value !== capitalized) {
        inputElement.value = capitalized;
        inputElement.setSelectionRange(start, end);
    }
}

function hitungUmurOtomatis() {
    const tgl = document.getElementById('tgl_lahir_tgl').value;
    const bln = document.getElementById('tgl_lahir_bln').value;
    const thn = document.getElementById('tgl_lahir_thn').value;
    const badgeUmur = document.getElementById('displayUmur');
    const valUmur = document.getElementById('umurVal');

    if (tgl && bln && thn) {
        const birthDate = new Date(`${thn}-${bln}-${tgl}`);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (!isNaN(age) && age >= 0) {
            valUmur.textContent = age;
            badgeUmur.classList.remove('hidden');
            return age;
        }
    }
    badgeUmur.classList.add('hidden');
    return null;
}

window.addEventListener('DOMContentLoaded', async () => {
    history.replaceState({ section: 'home' }, '', '#home');
    initDateDropdowns();
    initDesaDropdowns();
    initScrollDetectors();
    switchSectionView('home');

    const savedSession = sessionStorage.getItem('userSession');
    const authModal = document.getElementById('authModal');

    if (savedSession) {
        currentUser = JSON.parse(savedSession);
        authModal.classList.add('hidden');
        await preloadAllApplicationData();
        applyRoleRestrictionsUI();
    }

    setTimeout(() => {
        const loader = document.getElementById('loadingScreen');
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => {
                if (!savedSession) {
                    document.getElementById('appPasswordInput').focus();
                }
            }, 400);
        }
    }, 1200);
});

function initDesaDropdowns() {
    const dropdownPairs = [
        { desa: 'desa', kelompok: 'kelompok' },
        { desa: 'searchDesa', kelompok: 'searchKelompok' },
        { desa: 'exportDesa', kelompok: 'exportKelompok' },
        { desa: 'abs_desa', kelompok: 'abs_kelompok' },
        { desa: 'sarp_desa', kelompok: 'sarp_kelompok' },
        { desa: 'regDesa', kelompok: 'regKelompok' }
    ];

    dropdownPairs.forEach(({ desa, kelompok }) => {
        const sel = document.getElementById(desa);
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Pilih Desa --</option>';
        Object.keys(dataWilayah).forEach(d => sel.add(new Option(d, d)));
        bindDropdown(desa, kelompok);
    });

    ['filterDesaRekap', 'filterDesaAbsensi'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '<option value="">Semua Desa</option>';
        Object.keys(dataWilayah).forEach(d => sel.add(new Option(d, d)));
    });
}

function initDateDropdowns() {
    const tglSel = document.getElementById('tgl_lahir_tgl');
    const thnSel = document.getElementById('tgl_lahir_thn');

    for (let i = 1; i <= 31; i++) {
        const val = i < 10 ? `0${i}` : `${i}`;
        if (tglSel) tglSel.add(new Option(val, val));
    }

    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 100; y--) {
        if (thnSel) thnSel.add(new Option(y, y));
    }
}

function bindDropdown(desaId, kelompokId) {
    const dEl = document.getElementById(desaId);
    if (!dEl) return;
    dEl.addEventListener('change', function() {
        const klp = document.getElementById(kelompokId);
        if (!klp) return;
        klp.innerHTML = '<option value="">-- Pilih Kelompok --</option>';
        
        if(this.value && dataWilayah[this.value]) {
            klp.disabled = false;
            klp.classList.remove('bg-slate-100/50', 'text-slate-400');
            dataWilayah[this.value].forEach(k => klp.add(new Option(k, k)));
        } else {
            klp.disabled = true;
            klp.classList.add('bg-slate-100/50', 'text-slate-400');
        }

        if (desaId === 'searchDesa') {
            document.getElementById('autoJamaahListContainer').classList.add('hidden');
            if (currentMode === 'UPDATE') {
                document.getElementById('formJamaah').classList.add('hidden');
            }
        }
    });
}

function showCustomModal(title, message, icon = '💡', onOk = null, showCancel = false, onCancel = null) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modalIcon').innerHTML = icon;
    
    const iconBox = document.getElementById('modalIcon');
    const card = document.getElementById('customModalCard');
    const theme = getCurrentTheme();

    iconBox.className = `w-16 h-16 ${theme.iconBgModal} rounded-3xl flex items-center justify-center mx-auto text-3xl font-bold shadow-inner`;
    card.style.borderColor = theme.borderColorModal;

    const actionsDiv = document.getElementById('modalActions');
    actionsDiv.innerHTML = '';

    if (showCancel) {
        const btnCancel = document.createElement('button');
        btnCancel.type = 'button';
        btnCancel.className = 'w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all';
        btnCancel.textContent = 'Batal';
        btnCancel.onclick = () => {
            closeCustomModal();
            if (onCancel) onCancel();
        };
        actionsDiv.appendChild(btnCancel);
    }

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className = showCancel 
        ? `w-1/2 py-3 bg-gradient-to-r ${theme.btnGradient} text-white rounded-xl text-sm font-bold transition-all shadow-md` 
        : `w-full py-3 bg-gradient-to-r ${theme.btnGradient} text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5`;
    btnOk.textContent = showCancel ? 'Ya, Lanjutkan' : 'OK';
    
    btnOk.onclick = () => {
        closeCustomModal();
        if (onOk) onOk();
    };
    actionsDiv.appendChild(btnOk);

    openModal('customModal');
}

function closeCustomModal() {
    closeModal('customModal');
}

function switchMode(mode, keepSearchFilters = false) {
    currentMode = mode;
    const searchSec = document.getElementById('searchSection');
    const formJamaah = document.getElementById('formJamaah');
    const btnSubmit = document.getElementById('submitJamaahBtn');
    const statusSelect = document.getElementById('status');

    const currentDesa = document.getElementById('desa').value;
    const currentKelompok = document.getElementById('kelompok').value;

    formJamaah.reset();
    document.getElementById('edit_jamaah_id').value = "";
    document.getElementById('displayUmur').classList.add('hidden');
    toggleNoHpInput(statusSelect.value);
    document.getElementById('is_disabilitas').checked = false;
    toggleDisabilitasOptionsForm();

    if (!keepSearchFilters) {
        document.getElementById('autoJamaahListContainer').classList.add('hidden');
        document.getElementById('searchDesa').value = "";
        const searchKlp = document.getElementById('searchKelompok');
        searchKlp.innerHTML = '<option value="">-- Pilih Desa Dulu --</option>';
        searchKlp.disabled = true;
        searchKlp.classList.add('bg-slate-100/50', 'text-slate-400');
    }

    let mpOption = statusSelect.querySelector('option[value="Meninggal / Sambung Luar Daerah"]');
    
    if (mode === "UPDATE") {
        document.getElementById('tabUpdate').className = "py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white shadow-md transition-all duration-300";
        document.getElementById('tabDaftar').className = "py-2.5 text-xs font-bold rounded-xl text-indigo-800 hover:bg-indigo-200/50 transition-all duration-300";
        searchSec.classList.remove('hidden');
        formJamaah.classList.add('hidden');
        btnSubmit.textContent = "Perbarui Data Jamaah";

        if (!mpOption) {
            const opt = document.createElement('option');
            opt.value = "Meninggal / Sambung Luar Daerah";
            opt.textContent = "Meninggal / Sambung Luar Daerah";
            opt.className = "text-red-600 font-extrabold bg-red-50";
            statusSelect.appendChild(opt);
        }
    } else {
        document.getElementById('tabDaftar').className = "py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white shadow-md transition-all duration-300";
        document.getElementById('tabUpdate').className = "py-2.5 text-xs font-bold rounded-xl text-indigo-800 hover:bg-indigo-200/50 transition-all duration-300";
        searchSec.classList.add('hidden');
        formJamaah.classList.remove('hidden');
        btnSubmit.textContent = "Simpan Data Jamaah";

        if (mpOption) {
            mpOption.remove();
        }

        if (currentDesa) {
            const desaEl = document.getElementById('desa');
            const kelompokEl = document.getElementById('kelompok');
            
            desaEl.value = currentDesa;
            kelompokEl.innerHTML = '<option value="">-- Pilih Kelompok --</option>';
            if (dataWilayah[currentDesa]) {
                dataWilayah[currentDesa].forEach(k => kelompokEl.add(new Option(k, k)));
            }
            kelompokEl.disabled = false;
            kelompokEl.classList.remove('bg-slate-100/50', 'text-slate-400');
            kelompokEl.value = currentKelompok;
        }
    }

    if (currentUser.role === 'OPERATOR') {
        applyRoleRestrictionsUI();
    }
}

document.getElementById('searchKelompok').addEventListener('change', function() {
    const desa = document.getElementById('searchDesa').value;
    fetchAutoJamaahList(desa, this.value);
    if (currentMode === 'UPDATE') {
        document.getElementById('formJamaah').classList.add('hidden');
    }
});

function selectJamaahToForm(j) {
    document.getElementById('edit_jamaah_id').value = j.id;
    document.getElementById('nama').value = j.nama;
    document.getElementById('jenis_kelamin').value = j.jenis_kelamin;
    document.getElementById('tempat_lahir').value = j.tempat_lahir;

    if(j.tanggal_lahir) {
        const parts = j.tanggal_lahir.split('-');
        if(parts.length === 3) {
            document.getElementById('tgl_lahir_thn').value = parts[0];
            document.getElementById('tgl_lahir_bln').value = parts[1];
            document.getElementById('tgl_lahir_tgl').value = parts[2];
            hitungUmurOtomatis();
        }
    }

    document.getElementById('desa').value = j.desa;
    
    const elKlp = document.getElementById('kelompok');
    elKlp.innerHTML = '<option value="">-- Pilih Kelompok --</option>';
    if (dataWilayah[j.desa]) {
        dataWilayah[j.desa].forEach(k => elKlp.add(new Option(k, k)));
    }
    elKlp.disabled = false;
    elKlp.classList.remove('bg-slate-100/50', 'text-slate-400');
    elKlp.value = j.kelompok;

    const stVal = j.status || "Menikah";
    document.getElementById('status').value = stVal;
    toggleNoHpInput(stVal);
    document.getElementById('no_hp').value = j.no_hp || '';

    document.getElementById('is_disabilitas').checked = j.is_disabilitas ? true : false;
    toggleDisabilitasOptionsForm();
    resetDisabilitasCheckboxes();
    if(j.is_disabilitas && j.kategori_disabilitas) {
        let katList = Array.isArray(j.kategori_disabilitas) ? j.kategori_disabilitas : j.kategori_disabilitas.split(',');
        katList.forEach(k => {
            const cb = document.querySelector(`input[name="kategori_disabilitas"][value="${k.trim()}"]`);
            if(cb) cb.checked = true;
        });
    }

    if (currentUser.role === 'OPERATOR') {
        applyRoleRestrictionsUI();
    }

    document.getElementById('formJamaah').classList.remove('hidden');
    document.getElementById('formJamaah').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('formJamaah').addEventListener('submit', async function(e) {
    e.preventDefault();

    const editId = document.getElementById('edit_jamaah_id').value;
    const statusValue = document.getElementById('status').value;
    const desaEl = document.getElementById('desa');
    const kelompokEl = document.getElementById('kelompok');
    
    const savedDesa = desaEl.value;
    const savedKelompok = kelompokEl.value;

    if (currentMode === "UPDATE" && statusValue === "Meninggal / Sambung Luar Daerah") {
        if (!editId) {
            showCustomModal("Peringatan", "Silakan cari dan pilih data terlebih dahulu.", "⚠️");
            return;
        }

        showCustomModal(
            "Konfirmasi Penghapusan",
            "Data ini akan dihapus permanen dari database. Lanjutkan?",
            "🗑️",
            async () => {
                const currentDesa = document.getElementById('searchDesa').value;
                const currentKelompok = document.getElementById('searchKelompok').value;
                
                showDataLoading("Menghapus data jamaah...");
                try {
                    const { error } = await supabaseUtama.from('data_jamaah').delete().eq('id', editId);
                    if (error) {
                        showCustomModal("Gagal Hapus", error.message, "❌");
                    } else {
                        globalCache.jamaah = globalCache.jamaah.filter(j => String(j.id) !== String(editId));
                        switchMode('UPDATE', true);
                        if (currentDesa && currentKelompok) fetchAutoJamaahList(currentDesa, currentKelompok);
                    }
                } finally {
                    hideDataLoading();
                }
            },
            true
        );
        return;
    }

    const tgl = document.getElementById('tgl_lahir_tgl').value;
    const bln = document.getElementById('tgl_lahir_bln').value;
    const thn = document.getElementById('tgl_lahir_thn').value;
    const fullDate = `${thn}-${bln}-${tgl}`;
    const calculatedAge = hitungUmurOtomatis();

    const isDis = document.getElementById('is_disabilitas').checked;
    const katDis = isDis ? getSelectedKategoriDisabilitasForm() : [];

    const payload = {
        nama: toTitleCase(document.getElementById('nama').value.trim()),
        no_hp: statusValue === 'Operator' ? document.getElementById('no_hp').value.trim() : null,
        jenis_kelamin: document.getElementById('jenis_kelamin').value,
        tempat_lahir: toTitleCase(document.getElementById('tempat_lahir').value.trim()),
        tanggal_lahir: fullDate,
        umur: calculatedAge,
        desa: savedDesa,
        kelompok: savedKelompok,
        status: statusValue,
        is_disabilitas: isDis,
        kategori_disabilitas: katDis
    };

    if (!editId) {
        const isDuplicate = globalCache.jamaah.some(j => 
            (j.nama || '').trim().toLowerCase() === payload.nama.toLowerCase() &&
            (j.tempat_lahir || '').trim().toLowerCase() === payload.tempat_lahir.toLowerCase() &&
            (j.tanggal_lahir || '') === payload.tanggal_lahir &&
            (j.kelompok || '').trim().toLowerCase() === payload.kelompok.toLowerCase() &&
            (j.desa || '').trim().toLowerCase() === payload.desa.toLowerCase()
        );

        if (isDuplicate) {
            const userChoice = await showDuplicateConfirmModal(
                payload.nama, 
                payload.tempat_lahir, 
                payload.tanggal_lahir, 
                payload.kelompok, 
                payload.desa
            );

            if (!userChoice) {
                return;
            }
        }
    }

    showDataLoading("Menyimpan data...");

    try {
        if (editId) {
            const { data, error } = await supabaseUtama.from('data_jamaah').update(payload).eq('id', editId).select();
            if (error) throw error;
            
            const idx = globalCache.jamaah.findIndex(j => String(j.id) === String(editId));
            if (idx !== -1 && data && data.length > 0) {
                globalCache.jamaah[idx] = data[0];
            }
        } else {
            const { data, error } = await supabaseUtama.from('data_jamaah').insert([payload]).select();
            if (error) throw error;
            
            if (data && data.length > 0) {
                globalCache.jamaah.push(data[0]);
            }
        }

        showCustomModal("Sukses", editId ? "Data Berhasil Di-update!" : "Data Berhasil Disimpan!", "🎉", () => {
            if (currentMode === "UPDATE") {
                const currentDesa = document.getElementById('searchDesa').value;
                const currentKelompok = document.getElementById('searchKelompok').value;
                switchMode('UPDATE', true);
                if (currentDesa && currentKelompok) fetchAutoJamaahList(currentDesa, currentKelompok);
            } else {
                document.getElementById('edit_jamaah_id').value = "";
                document.getElementById('nama').value = "";
                document.getElementById('jenis_kelamin').value = "";
                document.getElementById('tempat_lahir').value = "";
                document.getElementById('tgl_lahir_tgl').value = "";
                document.getElementById('tgl_lahir_bln').value = "";
                document.getElementById('tgl_lahir_thn').value = "";
                document.getElementById('status').value = "Menikah";
                toggleNoHpInput("Menikah");
                document.getElementById('is_disabilitas').checked = false;
                toggleDisabilitasOptionsForm();
                document.getElementById('displayUmur').classList.add('hidden');

                if (savedDesa) {
                    desaEl.value = savedDesa;
                    kelompokEl.innerHTML = '<option value="">-- Pilih Kelompok --</option>';
                    if (dataWilayah[savedDesa]) {
                        dataWilayah[savedDesa].forEach(k => kelompokEl.add(new Option(k, k)));
                    }
                    kelompokEl.disabled = false;
                    kelompokEl.classList.remove('bg-slate-100/50', 'text-slate-400');
                    kelompokEl.value = savedKelompok;
                }

                if (currentUser.role === 'OPERATOR') {
                    applyRoleRestrictionsUI();
                }

                document.getElementById('nama').focus();
            }
        });

    } catch(err) {
        showCustomModal("Gagal", err.message || "Gagal menyimpan data ke server.", "❌");
    } finally {
        hideDataLoading();
    }
});

function openExportJamaahModal() {
    const searchDesa = document.getElementById('searchDesa').value;
    const searchKelompok = document.getElementById('searchKelompok').value;
    const scopeSelect = document.getElementById('exportScopeMode');

    if (searchDesa && searchKelompok) {
        scopeSelect.value = "KELOMPOK";
    } else if (searchDesa) {
        scopeSelect.value = "DESA";
    } else {
        scopeSelect.value = "ALL";
    }

    handleExportScopeChange(scopeSelect.value);

    if (searchDesa) {
        const expDesa = document.getElementById('exportDesa');
        expDesa.value = searchDesa;
        expDesa.dispatchEvent(new Event('change', { bubbles: true }));

        if (searchKelompok) {
            const expKelompok = document.getElementById('exportKelompok');
            expKelompok.value = searchKelompok;
        }
    }

    openModal('exportJamaahModal');
}

function handleExportScopeChange(mode) {
    const boxDesa = document.getElementById('exportBoxDesa');
    const boxKelompok = document.getElementById('exportBoxKelompok');

    if (mode === "ALL") {
        boxDesa.classList.add('hidden');
        boxKelompok.classList.add('hidden');
    } else if (mode === "DESA") {
        boxDesa.classList.remove('hidden');
        boxKelompok.classList.add('hidden');
    } else if (mode === "KELOMPOK") {
        boxDesa.classList.remove('hidden');
        boxKelompok.classList.remove('hidden');
    }
}

function toggleAllExportCols(checked) {
    document.querySelectorAll('.export-col-cb').forEach(cb => cb.checked = checked);
}

function processExportJamaahData(exportType = 'excel') {
    const mode = document.getElementById('exportScopeMode').value;
    const selectedDesa = document.getElementById('exportDesa').value;
    const selectedKelompok = document.getElementById('exportKelompok').value;

    if (mode === "DESA" && !selectedDesa) {
        showCustomModal("Peringatan", "Silakan pilih Desa terlebih dahulu!", "⚠️");
        return;
    }

    if (mode === "KELOMPOK" && (!selectedDesa || !selectedKelompok)) {
        showCustomModal("Peringatan", "Silakan pilih Desa dan Kelompok terlebih dahulu!", "⚠️");
        return;
    }

    const selectedCols = [];
    document.querySelectorAll('.export-col-cb:checked').forEach(cb => selectedCols.push(cb.value));

    if (selectedCols.length === 0) {
        showCustomModal("Peringatan", "Pilih minimal satu kolom untuk diexport!", "⚠️");
        return;
    }

    closeModal('exportJamaahModal');

    try {
        let data = [...globalCache.jamaah];

        if (mode === "DESA") {
            data = data.filter(d => d.desa === selectedDesa);
        } else if (mode === "KELOMPOK") {
            data = data.filter(d => d.desa === selectedDesa && d.kelompok === selectedKelompok);
        }

        if (!data || data.length === 0) {
            showCustomModal("Export Gagal", "Tidak ada data jamaah yang sesuai dengan pilihan wilayah.", "ℹ️");
            return;
        }

        data.sort((a, b) => {
            if ((a.desa || '') !== (b.desa || '')) return (a.desa || '').localeCompare(b.desa || '');
            if ((a.kelompok || '') !== (b.kelompok || '')) return (a.kelompok || '').localeCompare(b.kelompok || '');
            return (a.nama || '').localeCompare(b.nama || '');
        });

        const labelMapping = {
            nama: "Nama Lengkap",
            jenis_kelamin: "JK",
            tempat_lahir: "Tempat Lahir",
            tanggal_lahir: "Tanggal Lahir",
            umur: "Umur (Thn)",
            desa: "Desa",
            kelompok: "Kelompok",
            status: "Status Jamaah",
            disabilitas: "Disabilitas",
            no_hp: "No HP / WhatsApp"
        };

        const formattedData = data.map((item, index) => {
            let row = { "No": index + 1 };
            selectedCols.forEach(col => {
                let headerName = labelMapping[col] || col;
                let val = item[col] ?? '';

                if (col === 'tanggal_lahir' && val) {
                    const p = val.split('-');
                    if (p.length === 3) val = `${p[2]}/${p[1]}/${p[0]}`;
                } else if (col === 'disabilitas') {
                    if (item.is_disabilitas) {
                        const kats = Array.isArray(item.kategori_disabilitas) && item.kategori_disabilitas.length > 0 
                            ? item.kategori_disabilitas.join(', ') 
                            : 'Penyandang Disabilitas';
                        val = `Penyandang (${kats})`;
                    } else {
                        val = 'Bukan Penyandang Disabilitas';
                    }
                }

                row[headerName] = val;
            });
            return row;
        });

        let fileName = "Data_Jamaah";
        if (mode === "DESA") fileName += `_${selectedDesa}`;
        if (mode === "KELOMPOK") fileName += `_${selectedDesa}_${selectedKelompok}`;
        fileName += `_${new Date().toISOString().slice(0, 10)}`;

        const ws = XLSX.utils.json_to_sheet(formattedData);

        if (exportType === 'csv') {
            const csvOutput = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob(["\ufeff" + csvOutput], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `${fileName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data Jamaah");
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        }

    } catch (err) {
        showCustomModal("Gagal Export", err.message, "❌");
    }
}

// SIMPAN / UPDATE SARPRAS
document.getElementById('formSarpras').addEventListener('submit', function(e) {
    e.preventDefault();

    if (currentUser.role === 'OPERATOR') {
        showCustomModal("Akses Dibatasi", "Operator sementara belum dapat mengubah data Sarpras.", "⚠️");
        return;
    }

    const editId = document.getElementById('edit_sarpras_id').value;
    const payload = {
        desa: document.getElementById('sarp_desa').value,
        kelompok: document.getElementById('sarp_kelompok').value,
        status_tanah: document.getElementById('sarp_status_tanah').value,
        jumlah_sub_kelompok: getIntVal('sarp_sub'),
        jumlah_masjid: getIntVal('sarp_masjid'),
        jumlah_aula: getIntVal('sarp_aula'),
        km_pria: getIntVal('sarp_km_pria'),
        km_wanita: getIntVal('sarp_km_wanita'),
        km_mt: getIntVal('sarp_km_mt'),
        km_tamu: getIntVal('sarp_km_tamu')
    };

    (async () => {
        showDataLoading("Menyimpan data sarpras...");
        try {
            if (editId) {
                const { data, error } = await supabaseUtama
                    .from('fasilitas_kelompok')
                    .update(payload)
                    .eq('id', editId)
                    .select();
                if (error) throw error;
                const idx = globalCache.sarpras.findIndex(s => String(s.id) === String(editId));
                if (idx !== -1 && data && data.length > 0) globalCache.sarpras[idx] = data[0];
            } else {
                const { data, error } = await supabaseUtama
                    .from('fasilitas_kelompok')
                    .upsert([payload], { onConflict: 'desa,kelompok' })
                    .select();
                if (error) throw error;
                if (data && data.length > 0) {
                    const idx = globalCache.sarpras.findIndex(s => s.desa === payload.desa && s.kelompok === payload.kelompok);
                    if (idx !== -1) globalCache.sarpras[idx] = data[0];
                    else globalCache.sarpras.push(data[0]);
                }
            }

            showCustomModal("Sukses", "Data Sarpras Berhasil Diperbarui!", "🏛️", () => {
                document.getElementById('edit_sarpras_id').value = "";
                setTimeout(() => {
                    switchSectionView('rekap');
                    switchTabRekap('REKAP_SARPRAS');
                }, 100);
            });
        } catch (e) {
            showCustomModal("Gagal", e.message || "Gagal menyimpan sarpras", "❌");
        } finally {
            hideDataLoading();
        }
    })();
});

function editSarpras(id) {
    if (currentUser.role === 'OPERATOR') {
        showCustomModal("Fitur Dalam Pemeliharaan", "Modul Sarpras belum dapat diakses oleh Operator saat ini.", "🛠️");
        return;
    }

    let data = globalCache.sarpras.find(s => String(s.id) === String(id));
    if (!data) return;

    document.getElementById('edit_sarpras_id').value = data.id || '';
    document.getElementById('sarp_desa').value = data.desa || '';

    const kelompokEl = document.getElementById('sarp_kelompok');
    kelompokEl.innerHTML = '<option value="">-- Pilih Kelompok --</option>';
    if (dataWilayah[data.desa]) {
        dataWilayah[data.desa].forEach(k => kelompokEl.add(new Option(k, k)));
    }
    kelompokEl.disabled = false;
    kelompokEl.classList.remove('bg-slate-100/50', 'text-slate-400');
    kelompokEl.value = data.kelompok || '';

    document.getElementById('sarp_status_tanah').value = data.status_tanah || '';
    document.getElementById('sarp_sub').value = data.jumlah_sub_kelompok ?? 0;
    document.getElementById('sarp_masjid').value = data.jumlah_masjid ?? 0;
    document.getElementById('sarp_aula').value = data.jumlah_aula ?? 0;
    document.getElementById('sarp_km_pria').value = data.km_pria ?? 0;
    document.getElementById('sarp_km_wanita').value = data.km_wanita ?? 0;
    document.getElementById('sarp_km_mt').value = data.km_mt ?? 0;
    document.getElementById('sarp_km_tamu').value = data.km_tamu ?? 0;

    document.getElementById('sarpBtn').textContent = data.id ? "Perbarui Data Sarpras" : "Simpan Data Sarpras";
    showSection('sarpras');
}

function toggleNamaKegiatanLainnya(selectEl) {
    const customInput = document.getElementById('abs_nama_custom');
    const boxTargetCustom = document.getElementById('boxTargetCustom');

    if (selectEl.value === 'LAINNYA') {
        customInput.classList.remove('hidden');
        customInput.required = true;
        boxTargetCustom.classList.remove('hidden');
    } else {
        customInput.classList.add('hidden');
        customInput.required = false;
        customInput.value = '';
        boxTargetCustom.classList.add('hidden');
        document.querySelectorAll('input[name="target_custom"]').forEach(cb => cb.checked = false);
    }
}

document.getElementById('formAbsensiKegiatan').addEventListener('submit', function(e) {
    e.preventDefault();
    const editId = document.getElementById('edit_absensi_id').value;
    const selectNama = document.getElementById('abs_nama').value;
    const customNama = toTitleCase(document.getElementById('abs_nama_custom').value.trim());
    const finalNamaKegiatan = selectNama === 'LAINNYA' ? customNama : selectNama;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    let tanggalKegiatan = editId ? document.getElementById('edit_tanggal_kegiatan').value : todayStr;
    const infaqRaw = document.getElementById('abs_infaq').value.replace(/[^0-9]/g, '');

    const targetCustomSelected = selectNama === 'LAINNYA' 
        ? Array.from(document.querySelectorAll('input[name="target_custom"]:checked')).map(cb => cb.value)
        : null;

    const payload = {
        nama_kegiatan: finalNamaKegiatan,
        tanggal_kegiatan: tanggalKegiatan,
        desa: document.getElementById('abs_desa').value,
        kelompok: document.getElementById('abs_kelompok').value,
        jumlah_laki: getIntVal('abs_laki'),
        jumlah_perempuan: getIntVal('abs_perempuan'),
        jumlah_ijin: getIntVal('abs_ijin'),
        infaq: parseFloat(infaqRaw) || 0,
        target_custom: targetCustomSelected
    };

    (async () => {
        showDataLoading("Menyimpan data absensi...");
        try {
            if(editId) {
                const { data, error } = await supabaseAbsensi.from('absensi_sdc').update(payload).eq('id', editId).select();
                if (error) throw error;
                const idx = globalCache.absensi.findIndex(a => String(a.id) === String(editId));
                if (idx !== -1 && data && data.length > 0) globalCache.absensi[idx] = data[0];
            } else {
                const { data, error } = await supabaseAbsensi.from('absensi_sdc').insert([payload]).select();
                if (error) throw error;
                if (data && data.length > 0) globalCache.absensi.push(data[0]);
            }

            showCustomModal("Sukses", "Data Absensi Berhasil Diperbarui!", "📋", () => {
                e.target.reset();
                document.getElementById('abs_nama_custom').classList.add('hidden');
                document.getElementById('boxTargetCustom').classList.add('hidden');
                document.getElementById('edit_absensi_id').value = "";
                
                if (currentUser.role === 'OPERATOR') {
                    applyRoleRestrictionsUI();
                }
                switchTabAbsensi('REKAP');
            });
        } catch(e) {
            showCustomModal("Gagal", e.message || "Gagal menyimpan absensi", "❌");
        } finally {
            hideDataLoading();
        }
    })();
});

function editAbsensi(id) {
    const data = globalCache.absensi.find(a => String(a.id) === String(id));
    if(!data) return;

    document.getElementById('edit_absensi_id').value = data.id;
    document.getElementById('edit_tanggal_kegiatan').value = data.tanggal_kegiatan;

    const selectNama = document.getElementById('abs_nama');
    const customInput = document.getElementById('abs_nama_custom');
    const boxTargetCustom = document.getElementById('boxTargetCustom');

    const standardOptions = [
        "Penyampaian Materi PPG Pusat", 
        "Pengajian Ibu-Ibu Daerah", 
        "Pengajian Umum Daerah", 
        "Pengajian Remaja Daerah", 
        "Asrama K. Khotbah"
    ];

    if (standardOptions.includes(data.nama_kegiatan)) {
        selectNama.value = data.nama_kegiatan;
        customInput.classList.add('hidden');
        customInput.value = '';
        boxTargetCustom.classList.add('hidden');
    } else {
        selectNama.value = "LAINNYA";
        customInput.classList.remove('hidden');
        customInput.value = data.nama_kegiatan;
        boxTargetCustom.classList.remove('hidden');

        document.querySelectorAll('input[name="target_custom"]').forEach(cb => {
            cb.checked = Array.isArray(data.target_custom) && data.target_custom.includes(cb.value);
        });
    }

    document.getElementById('abs_desa').value = data.desa;
    const klp = document.getElementById('abs_kelompok');
    klp.innerHTML = `<option value="${data.kelompok}">${data.kelompok}</option>`;
    klp.disabled = false;
    klp.classList.remove('bg-slate-100/50', 'text-slate-400');

    document.getElementById('abs_laki').value = data.jumlah_laki ?? '';
    document.getElementById('abs_perempuan').value = data.jumlah_perempuan ?? '';
    document.getElementById('abs_ijin').value = data.jumlah_ijin ?? '';
    const infaqEl = document.getElementById('abs_infaq');
    infaqEl.value = data.infaq ? (parseInt(data.infaq, 10) || 0).toLocaleString('id-ID') : '';

    if (currentUser.role === 'OPERATOR') {
        applyRoleRestrictionsUI();
    }

    document.getElementById('absBtn').textContent = "Update Absensi";
    switchTabAbsensi('INPUT');
}

function switchTabRekap(tab) {
    if (currentUser.role === 'OPERATOR' && tab === 'REKAP_SARPRAS') {
        showCustomModal("Fitur Dalam Pemeliharaan", "Rekap Sarpras belum dapat diakses oleh Operator.", "🛠️");
        return;
    }

    activeRekapSubTab = tab;
    const btnPrint = document.getElementById('btnPrintRekap');
    const btnExport = document.getElementById('btnExportExcel');
    const secStatus = document.getElementById('sectionStatusKeseluruhan');
    const secRekapKlp = document.getElementById('sectionRekapKelompok');

    const tabStatus = document.getElementById('tabStatusKeseluruhan');
    const tabKlp = document.getElementById('tabRekapKelompok');
    const tabSarp = document.getElementById('tabRekapSarpras');

    secStatus.classList.add('hidden');
    secRekapKlp.classList.add('hidden');

    [tabStatus, tabKlp, tabSarp].forEach(t => {
        if (t) t.className = "py-2 px-3.5 text-xs font-extrabold rounded-xl text-amber-900 hover:bg-amber-200/60 flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap";
    });

    if (tab === 'STATUS_KESELURUHAN') {
        secStatus.classList.remove('hidden');
        tabStatus.className = "py-2 px-3.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap";
        if(btnPrint) btnPrint.classList.remove('hidden');
        if(btnExport) btnExport.classList.add('hidden');
        loadRekapStatusKeseluruhan();

    } else if (tab === 'REKAP_KELOMPOK') {
        secRekapKlp.classList.remove('hidden');
        tabKlp.className = "py-2 px-3.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap";
        if(btnPrint) btnPrint.classList.remove('hidden');
        if(btnExport) btnExport.classList.remove('hidden');
        loadRekapKelompokLengkap();

    } else if (tab === 'REKAP_SARPRAS') {
        secRekapKlp.classList.remove('hidden');
        tabSarp.className = "py-2 px-3.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap";
        if(btnPrint) btnPrint.classList.remove('hidden');
        if(btnExport) btnExport.classList.remove('hidden');
        loadRekapSarprasDeveloper();
    }
}

function triggerPrintRekapCurrentTab() {
    let docTitle = "Laporan Rekapitulasi Data Jamaah & Generus";
    if (activeRekapSubTab === 'REKAP_KELOMPOK') {
        docTitle = "Laporan Rekapitulasi Jamaah & Sarpras Per Kelompok";
    }
    printData('printableRekapContent', docTitle);
}

function switchTabAbsensi(tab) {
	activeAbsensiSubTab = tab;
	
    const btnPrint = document.getElementById('btnPrintAbsensi');
    const btnCopy = document.getElementById('btnCopyBelumAbsen');
    const tabInput = document.getElementById('tabInputAbsensi');
    const tabRekap = document.getElementById('tabRekapAbsensi');

    if(tab === 'INPUT') {
        document.getElementById('formAbsensiKegiatan').classList.remove('hidden');
        document.getElementById('printableAbsensi').classList.add('hidden');
        
        tabInput.className = "py-2 px-3.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-md flex items-center gap-1.5 transition-all duration-300";
        tabRekap.className = "py-2 px-3.5 text-xs font-extrabold rounded-xl text-fuchsia-900 hover:bg-fuchsia-200/60 flex items-center gap-1.5 transition-all duration-300";

        if(btnPrint) btnPrint.classList.add('hidden');
        if(btnCopy) btnCopy.classList.add('hidden');
    } else {
        document.getElementById('formAbsensiKegiatan').classList.add('hidden');
        document.getElementById('printableAbsensi').classList.remove('hidden');
        
        tabRekap.className = "py-2 px-3.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-md flex items-center gap-1.5 transition-all duration-300";
        tabInput.className = "py-2 px-3.5 text-xs font-extrabold rounded-xl text-fuchsia-900 hover:bg-fuchsia-200/60 flex items-center gap-1.5 transition-all duration-300";

        if(btnPrint) btnPrint.classList.remove('hidden');
        if(btnCopy && currentUser.role === 'DEVELOPER') btnCopy.classList.remove('hidden');
        
        populateKegiatanFilter();
        loadRekapAbsensi();
    }
}

function copyKelompokBelumAbsen() {
    if (currentUser.role !== 'DEVELOPER') return;

    const desa = document.getElementById('filterDesaAbsensi')?.value || '';
    const tglAngka = document.getElementById('filterTanggalAbsensi')?.value || '';
    const bulan = document.getElementById('filterBulanAbsensi')?.value || '';
    const tahun = document.getElementById('filterTahun')?.value || '';
    const kegiatan = document.getElementById('filterKegiatanAbsensi')?.value || '';

    if (!kegiatan) {
        showCustomModal("Pilih Kegiatan", "Silakan pilih Filter Nama Kegiatan terlebih dahulu untuk mengecek kelompok yang belum absen.", "⚠️");
        return;
    }

    let data = [...globalCache.absensi];
    data = data.filter(item => item.nama_kegiatan === kegiatan);
    
    const filteredData = data.filter(item => {
        if (desa && item.desa !== desa) return false;
        if (!item.tanggal_kegiatan) return false;

        const parts = item.tanggal_kegiatan.split('-'); // Format YYYY-MM-DD
        if (parts.length < 3) return false;

        const itemTahun = parts[0];
        const itemBulan = parts[1];
        const itemTgl = parts[2];

        if (tahun && itemTahun !== tahun) return false;
        if (bulan && itemBulan !== bulan) return false;
        if (tglAngka && itemTgl !== tglAngka) return false;

        return true;
    });

    const sudahAbsenSet = new Set();
    filteredData.forEach(item => {
        sudahAbsenSet.add(`${item.desa}__${item.kelompok}`);
    });

    const belumAbsen = [];
    Object.keys(dataWilayah).forEach(d => {
        if (!desa || d === desa) {
            dataWilayah[d].forEach(k => {
                if (!sudahAbsenSet.has(`${d}__${k}`)) {
                    belumAbsen.push({ desa: d, kelompok: k });
                }
            });
        }
    });

    if (belumAbsen.length === 0) {
        showCustomModal("Lengkap", "Mantap! Semua kelompok sudah mengisi absensi untuk kegiatan ini.", "✅");
        return;
    }

    // Membuat Teks Label Waktu
    const elmBulan = document.getElementById('filterBulanAbsensi');
    const namaBulan = bulan ? elmBulan.options[elmBulan.selectedIndex].text : '';
    
    let labelWaktu = "";
    if (tglAngka && bulan && tahun) {
        labelWaktu = `${tglAngka} ${namaBulan} ${tahun}`;
    } else if (tglAngka && bulan) {
        labelWaktu = `Tanggal ${tglAngka} ${namaBulan}`;
    } else if (bulan && tahun) {
        labelWaktu = `${namaBulan} ${tahun}`;
    } else {
        labelWaktu = `Periode ${tahun || 'Semua'}`;
    }

    let pesan = `*PEMBERITAHUAN ABSENSI*\n\n`;
    pesan += `Kegiatan: *${kegiatan}*\n`;
    pesan += `Waktu: *${labelWaktu}*\n\n`;
    pesan += `Berikut adalah daftar kelompok yang *BELUM* mengisi absensi:\n\n`;

    belumAbsen.forEach((item, index) => {
        pesan += `${index + 1}. Kelompok ${item.kelompok}\n`;
    });

    pesan += `\nMohon kepada operator kelompok terkait untuk segera mengisi absensi di aplikasi OS SDC Tawangmangu. Alkhamdulillah Jaza Kumullahu Khoiro 🙏`;

    document.getElementById('belumAbsenSubtitle').textContent = `${kegiatan} • ${labelWaktu}`;
    
    const listEl = document.getElementById('belumAbsenList');
    listEl.innerHTML = '';

    belumAbsen.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = "p-3 sm:p-3.5 bg-white/90 border border-rose-100 rounded-xl flex justify-between items-center transition-all duration-200 shadow-sm hover:shadow-md hover:bg-white gap-2";
        row.innerHTML = `
            <div class="flex items-center gap-2 truncate">
                <span class="text-xs font-bold text-rose-500 shrink-0 min-w-[20px]">
                    ${index + 1}.
                </span>
                <span class="font-extrabold text-xs sm:text-sm text-slate-800 truncate">
                    Kelompok ${item.kelompok}
                </span>
            </div>
            <span class="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shrink-0">
                ${item.desa}
            </span>
        `;
        listEl.appendChild(row);
    });

    const btnSalin = document.getElementById('btnProsesSalinBelumAbsen');
    btnSalin.onclick = () => {
        navigator.clipboard.writeText(pesan).then(() => {
            closeModal('belumAbsenModal');
            setTimeout(() => {
                showCustomModal(
                    "Berhasil Disalin", 
                    `Daftar ${belumAbsen.length} kelompok yang belum absen telah disalin ke clipboard. Silakan paste di Grup WA Operator.`, 
                    "📋"
                );
            }, 300);
        }).catch(() => {
            showCustomModal("Gagal", "Browser tidak mendukung penyalinan otomatis.", "❌");
        });
    };

    openModal('belumAbsenModal');
}

function parseKategoriGenerus(rawStr) {
    const val = (rawStr || "").toLowerCase().trim();
    if (val.includes('paud')) return 'paud';
    if (val.includes('tk')) return 'tk';
    if (val.includes('caberawit') || val.includes('cabe rawit')) return 'caberawit';
    if (val.includes('pra')) return 'praRemaja';
    if (val.includes('remaja')) return 'remaja';
    if (val.includes('mandiri')) return 'usiaMandiri';
    return null;
}

function loadRekapStatusKeseluruhan() {
    const dataJamaah = globalCache.jamaah;
    const dataGenerus = globalCache.generus;

    let menikah = 0, duda = 0, janda = 0, manula = 0, operator = 0, totalDisabilitas = 0;
    
    window.allOperatorsCache = [];
    window.activeDisabilitasDataset = [];
    window.statusJamaahCache = {
        'Menikah': [],
        'Duda': [],
        'Janda': [],
        'Manula': []
    };

    dataJamaah.forEach(item => {
        const st = (item.status || "").toLowerCase();
        const itemData = {
            nama: item.nama,
            kelompok: item.kelompok || '-',
            desa: item.desa || '-',
            umur: item.umur !== null && item.umur !== undefined && item.umur !== '' ? `${item.umur} thn` : '-'
        };

        if (item.is_disabilitas) {
            totalDisabilitas++;
            window.activeDisabilitasDataset.push({
                nama: item.nama,
                kelompok: item.kelompok || '-',
                desa: item.desa || '-',
                umur: itemData.umur,
                kategoriRaw: item.kategori_disabilitas,
                kategori: Array.isArray(item.kategori_disabilitas) && item.kategori_disabilitas.length > 0 
                    ? item.kategori_disabilitas 
                    : (item.kategori_disabilitas ? item.kategori_disabilitas.split(',') : ['Penyandang Disabilitas'])
            });
        }

        if (st === "menikah") {
            menikah++;
            window.statusJamaahCache['Menikah'].push(itemData);
        } else if (st === "duda") {
            duda++;
            window.statusJamaahCache['Duda'].push(itemData);
        } else if (st === "janda") {
            janda++;
            window.statusJamaahCache['Janda'].push(itemData);
        } else if (st === "manula") {
            manula++;
            window.statusJamaahCache['Manula'].push(itemData);
        } else if (st === "operator") {
            operator++;
            window.allOperatorsCache.push({
                nama: item.nama,
                no_hp: item.no_hp,
                desa: item.desa,
                kelompok: item.kelompok
            });
        }
    });

    const genCounts = { paud: 0, tk: 0, caberawit: 0, praRemaja: 0, remaja: 0, usiaMandiri: 0 };
    let totalGenerusMurni = 0;

    dataGenerus.forEach(g => {
        const key = parseKategoriGenerus(g.kategori_usia);
        if (key && genCounts.hasOwnProperty(key)) {
            genCounts[key]++;
            totalGenerusMurni++;
        }

        if (g.is_disabilitas) {
            totalDisabilitas++;
            let umurTxt = '-';
            if (g.umur !== null && g.umur !== undefined && g.umur !== '') {
                umurTxt = `${g.umur} thn`;
            } else if (g.usia !== null && g.usia !== undefined && g.usia !== '') {
                umurTxt = `${g.usia} thn`;
            }

            window.activeDisabilitasDataset.push({
                nama: g.nama,
                kelompok: g.kelompok || '-',
                desa: g.desa || '-',
                umur: umurTxt,
                kategoriRaw: g.kategori_disabilitas,
                kategori: Array.isArray(g.kategori_disabilitas) && g.kategori_disabilitas.length > 0 
                    ? g.kategori_disabilitas 
                    : (g.kategori_disabilitas ? g.kategori_disabilitas.split(',') : ['Penyandang Disabilitas'])
            });
        }
    });

    document.getElementById('stMenikah').textContent = menikah;
    document.getElementById('stDuda').textContent = duda;
    document.getElementById('stJanda').textContent = janda;
    document.getElementById('stManula').textContent = manula;
    document.getElementById('stOperator').textContent = operator;
    document.getElementById('stTotalJamaahDewasa').textContent = `${dataJamaah.length} Orang`;
    document.getElementById('stTotalDisabilitas').textContent = `${totalDisabilitas} Orang`;

    document.getElementById('genPaud').textContent = genCounts.paud;
    document.getElementById('genTk').textContent = genCounts.tk;
    document.getElementById('genCaberawit').textContent = genCounts.caberawit;
    document.getElementById('genPraRemaja').textContent = genCounts.praRemaja;
    document.getElementById('genRemaja').textContent = genCounts.remaja;
    document.getElementById('genUsiaMandiri').textContent = genCounts.usiaMandiri;

    document.getElementById('stTotalGenerus').textContent = `${totalGenerusMurni} Orang`;
    document.getElementById('stTotalAll').textContent = `${dataJamaah.length + totalGenerusMurni} Data`;
}

function showDisabilitasDetailModal() {
    window.activeDisabilitasDataset.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    const katCounts = {};
    window.activeDisabilitasDataset.forEach(item => {
        let kats = [];
        if (Array.isArray(item.kategoriRaw) && item.kategoriRaw.length > 0) {
            kats = item.kategoriRaw;
        } else if (item.kategori) {
            kats = item.kategori.split(',').map(s => s.trim());
        } else {
            kats = ['Lainnya'];
        }

        kats.forEach(k => {
            const cleanKat = k || 'Lainnya';
            katCounts[cleanKat] = (katCounts[cleanKat] || 0) + 1;
        });
    });

    const summaryEl = document.getElementById('disabilitasCategorySummary');
    if (summaryEl) {
        summaryEl.innerHTML = '';
        const keys = Object.keys(katCounts);
        if (keys.length === 0) {
            summaryEl.innerHTML = `<p class="col-span-full text-[10px] text-slate-400 font-semibold text-center py-1">Belum ada kategori terdata.</p>`;
        } else {
            keys.forEach(kat => {
                const badge = document.createElement('div');
                badge.className = "p-1.5 bg-white/80 rounded-xl border border-teal-100 flex justify-between items-center";
                badge.innerHTML = `
                    <span class="text-[10px] font-extrabold text-slate-600 truncate mr-1" title="${kat}">${kat}</span>
                    <span class="text-[10px] font-black text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md">${katCounts[kat]}</span>
                `;
                summaryEl.appendChild(badge);
            });
        }
    }

    const searchInput = document.getElementById('disabilitasDetailSearch');
    if (searchInput) searchInput.value = '';

    renderDisabilitasDetailList(window.activeDisabilitasDataset);
    openModal('disabilitasDetailModal');
}

function renderDisabilitasDetailList(listData) {
    const listEl = document.getElementById('disabilitasDetailList');
    listEl.innerHTML = '';

    if (!listData || listData.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-slate-400 font-semibold text-center py-5">Tidak ada penyandang disabilitas terdaftar.</p>`;
        return;
    }

    listData.forEach(item => {
        const card = document.createElement('div');
        card.className = "p-3 bg-gradient-to-r from-teal-50/90 to-emerald-50/90 border border-teal-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 animate-fade-in-up hover:shadow-md transition-all";
        
        let katArray = [];
        if (Array.isArray(item.kategoriRaw) && item.kategoriRaw.length > 0) {
            katArray = item.kategoriRaw;
        } else if (Array.isArray(item.kategori)) {
            katArray = item.kategori;
        } else if (typeof item.kategori === 'string') {
            katArray = item.kategori.split(',').map(s => s.trim());
        }

        let badgesHtml = katArray.map(k => `
            <span class="text-[10px] font-extrabold text-teal-800 bg-teal-100/90 border border-teal-300/60 px-2.5 py-1 rounded-lg inline-block shadow-2xs">
                ${k.trim()}
            </span>
        `).join('');

        card.innerHTML = `
            <div class="space-y-1">
                <div class="font-extrabold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                    <span>${item.nama}</span>
                    <span class="text-[10px] font-extrabold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200 shrink-0">
                        ${item.umur}
                    </span>
                </div>
                <div class="text-[11px] font-semibold text-slate-500">
                    Klp. <span class="text-teal-900 font-black">${item.kelompok}</span> (${item.desa})
                </div>
            </div>
            <div class="flex flex-col items-start sm:items-end gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-teal-200/50">
                ${badgesHtml}
            </div>
        `;
        listEl.appendChild(card);
    });
}

function filterDisabilitasDetailList() {
    const query = (document.getElementById('disabilitasDetailSearch').value || '').toLowerCase().trim();
    if (!query) {
        renderDisabilitasDetailList(window.activeDisabilitasDataset);
        return;
    }
    const filtered = window.activeDisabilitasDataset.filter(item => {
        const katString = Array.isArray(item.kategori) ? item.kategori.join(' ') : (item.kategori || '');
        return (item.nama || '').toLowerCase().includes(query) || 
               (item.kelompok || '').toLowerCase().includes(query) ||
               (item.desa || '').toLowerCase().includes(query) ||
               katString.toLowerCase().includes(query);
    });
    renderDisabilitasDetailList(filtered);
}

function showStatusDetailModal(categoryName) {
    document.getElementById('statusDetailTitle').textContent = `Rincian Kategori: ${categoryName}`;
    const listData = window.statusJamaahCache && window.statusJamaahCache[categoryName] ? window.statusJamaahCache[categoryName] : [];
    
    window.activeStatusDataset = [...listData];
    window.activeStatusDataset.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    const searchInput = document.getElementById('statusDetailSearch');
    if (searchInput) searchInput.value = '';

    renderStatusDetailList(window.activeStatusDataset);
    openModal('statusDetailModal');
}

function renderStatusDetailList(listData) {
    const listEl = document.getElementById('statusDetailList');
    listEl.innerHTML = '';

    if (!listData || listData.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-slate-400 font-semibold text-center py-5">Tidak ada data jamaah pada kategori ini.</p>`;
        return;
    }

    listData.forEach(item => {
        const card = document.createElement('div');
        card.className = "p-3 bg-white border border-indigo-100 rounded-2xl flex items-center justify-between gap-3 animate-fade-in-up hover:shadow-md transition-shadow";
        
        card.innerHTML = `
            <div>
                <div class="font-extrabold text-xs sm:text-sm text-slate-800">${item.nama}</div>
                <div class="text-[11px] font-semibold text-slate-500 mt-0.5">
                    Kelompok: <span class="text-indigo-700 font-bold">${item.kelompok}</span> (${item.desa})
                </div>
            </div>
            <div class="shrink-0 text-right">
                <span class="text-[10px] font-extrabold text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-200 px-2 py-1 rounded-lg inline-block">
                    ${item.umur}
                </span>
            </div>
        `;
        listEl.appendChild(card);
    });
}

function filterStatusDetailList() {
    const query = (document.getElementById('statusDetailSearch').value || '').toLowerCase().trim();
    if (!query) {
        renderStatusDetailList(window.activeStatusDataset);
        return;
    }
    const filtered = window.activeStatusDataset.filter(item => {
        return (item.nama || '').toLowerCase().includes(query) || (item.kelompok || '').toLowerCase().includes(query);
    });
    renderStatusDetailList(filtered);
}

function showKelompokDetailModal(kelompokNama) {
    document.getElementById('kelompokDetailTitle').textContent = `Kelompok: ${kelompokNama}`;

    const data = globalCache.jamaah.filter(j => j.kelompok === kelompokNama);
    data.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    let combined = data.map(j => ({ nama: j.nama, status: j.status || 'Jamaah' }));
    window.activeKelompokDataset = combined;

    const searchInput = document.getElementById('kelompokDetailSearch');
    if (searchInput) searchInput.value = '';

    renderKelompokDetailList(window.activeKelompokDataset);
    openModal('kelompokDetailModal', false);
}

function renderKelompokDetailList(listData) {
    const listEl = document.getElementById('kelompokDetailList');
    listEl.innerHTML = '';

    if (!listData || listData.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-slate-400 font-semibold text-center py-5">Belum ada jamaah terdaftar di kelompok ini.</p>`;
        return;
    }

    listData.forEach(item => {
        const card = document.createElement('div');
        card.className = "p-3 bg-white border border-indigo-100 rounded-2xl flex items-center justify-between gap-3 animate-fade-in-up hover:shadow-md transition-shadow";

        card.innerHTML = `
            <div>
                <div class="font-extrabold text-xs sm:text-sm text-slate-800">${item.nama}</div>
            </div>
            <div class="shrink-0 text-right">
                <span class="text-[10px] font-extrabold border px-2.5 py-1 rounded-lg inline-block bg-indigo-50 text-indigo-700 border-indigo-200">
                    ${item.status}
                </span>
            </div>
        `;
        listEl.appendChild(card);
    });
}

function fetchAutoJamaahList(desa, kelompok) {
    const listContainer = document.getElementById('autoJamaahListContainer');
    const searchNamaInput = document.getElementById('searchNamaJamaah');

    if (searchNamaInput) searchNamaInput.value = '';

    if (!desa || !kelompok) {
        listContainer.classList.add('hidden');
        if (currentMode === 'UPDATE') {
            document.getElementById('formJamaah').classList.add('hidden');
        }
        return;
    }

    const filteredData = globalCache.jamaah.filter(j => j.desa === desa && j.kelompok === kelompok);
    filteredData.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    window.currentGroupJamaahData = filteredData;
    renderJamaahListItems(window.currentGroupJamaahData);
}

function renderJamaahListItems(filteredData) {
    const listContainer = document.getElementById('autoJamaahListContainer');
    const listEl = document.getElementById('autoJamaahList');

    listContainer.classList.remove('hidden');

    if (filteredData.length === 0) {
        listEl.innerHTML = `<div class="text-xs text-slate-500 bg-slate-50/80 p-4 rounded-xl text-center border border-slate-200/60 font-medium">Jamaah tidak ditemukan.</div>`;
        return;
    }

    listEl.innerHTML = '';
    
    filteredData.forEach((j) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = "w-full text-left p-3 sm:p-4 rounded-xl border border-indigo-100 hover:border-indigo-400 bg-white hover:bg-indigo-50/50 transition-all duration-300 flex justify-between items-center group cursor-pointer animate-fade-in-up hover:shadow-md";
        
        const noHpText = j.no_hp ? ` | WA: <span class="text-blue-600 font-extrabold">${j.no_hp}</span>` : '';
        const disText = j.is_disabilitas ? ` | <span class="text-teal-600 font-bold">♿ Disabilitas</span>` : '';

        btn.innerHTML = `
            <div class="flex items-center gap-3 sm:gap-4">
                <div>
                    <div class="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-700 transition-colors">${j.nama}</div>
                    <div class="text-[10px] text-slate-500 mt-0.5">
                        Status: <span class="font-bold ${j.status === 'Operator' ? 'text-blue-600' : 'text-slate-600'}">${j.status || '-'}</span>${noHpText}${disText}
                    </div>
                </div>
            </div>
            <span class="text-[10px] sm:text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-indigo-200 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                Edit &raquo;
            </span>
        `;
        
        btn.onclick = () => selectJamaahToForm(j);
        listEl.appendChild(btn);
    });
}

function filterJamaahByNama() {
    const query = (document.getElementById('searchNamaJamaah').value || '').toLowerCase().trim();
    if (!query) {
        renderJamaahListItems(window.currentGroupJamaahData);
        return;
    }
    const filtered = window.currentGroupJamaahData.filter(j => (j.nama || '').toLowerCase().includes(query));
    renderJamaahListItems(filtered);
}

function filterKelompokDetailList() {
    const query = (document.getElementById('kelompokDetailSearch').value || '').toLowerCase().trim();
    if (!query) {
        renderKelompokDetailList(window.activeKelompokDataset);
        return;
    }
    const filtered = window.activeKelompokDataset.filter(item => {
        return (item.nama || '').toLowerCase().includes(query) || (item.status || '').toLowerCase().includes(query);
    });
    renderKelompokDetailList(filtered);
}

function showAllOperatorsModal() {
    document.getElementById('opModalTitle').textContent = "Semua Operator Terdaftar";
    window.activeOperatorDataset = window.allOperatorsCache ? [...window.allOperatorsCache] : [];
    window.activeOperatorDataset.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    const searchInput = document.getElementById('opSearchInput');
    if (searchInput) searchInput.value = '';

    const iconBox = document.getElementById('opModalIconBox');
    const opCard = document.getElementById('operatorDetailModalCard');
    const theme = getCurrentTheme();

    iconBox.className = `w-14 h-14 ${theme.iconBgModal} rounded-3xl flex items-center justify-center mx-auto text-2xl font-bold shadow-inner`;
    opCard.style.borderColor = theme.borderColorModal;

    renderOperatorModalList(window.activeOperatorDataset);
    openModal('operatorDetailModal');
}

function renderOperatorModalList(listData) {
    const listEl = document.getElementById('opModalList');
    listEl.innerHTML = '';

    if (!listData || listData.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-slate-400 font-semibold text-center py-5">Tidak ada data operator ditemukan.</p>`;
        return;
    }

    listData.forEach(op => {
        const item = document.createElement('div');
        item.className = "p-3 sm:p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100 rounded-2xl flex items-center justify-between gap-3 animate-fade-in-up hover:shadow-md transition-shadow";

        const cleanHp = (op.no_hp || '').replace(/[^0-9]/g, '');
        const waLink = cleanHp.startsWith('0') ? `62${cleanHp.slice(1)}` : cleanHp;

        item.innerHTML = `
            <div>
                <div class="font-extrabold text-sm text-slate-800">${op.nama}</div>
                <div class="text-[11px] font-bold text-slate-500 mt-1">
                    Klp. <span class="text-indigo-800 font-black">${op.kelompok || '-'}</span> (${op.desa || '-'})
                </div>
                <div class="text-[11px] sm:text-xs font-black text-blue-600 mt-1">${op.no_hp || 'No HP belum diisi'}</div>
            </div>
            ${op.no_hp ? `
                <a href="https://wa.me/${waLink}" target="_blank" class="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0">
                    💬 WA
                </a>
            ` : `
                <span class="text-[10px] text-slate-400 italic font-semibold shrink-0">No HP kosong</span>
            `}
        `;
        listEl.appendChild(item);
    });
}

function filterOperatorList() {
    const query = (document.getElementById('opSearchInput').value || '').toLowerCase().trim();
    
    if (!query) {
        renderOperatorModalList(window.activeOperatorDataset);
        return;
    }

    const filtered = window.activeOperatorDataset.filter(op => {
        const namaMatch = (op.nama || '').toLowerCase().includes(query);
        const kelompokMatch = (op.kelompok || '').toLowerCase().includes(query);
        const desaMatch = (op.desa || '').toLowerCase().includes(query);
        const hpMatch = (op.no_hp || '').toLowerCase().includes(query);

        return namaMatch || kelompokMatch || desaMatch || hpMatch;
    });

    renderOperatorModalList(filtered);
}

function loadRekapKelompokLengkap() {
    const tbody = document.getElementById('tbodyRekapKelompok');
    const tfoot = document.getElementById('tfootRekapKelompok');
    const thead = document.querySelector('#tableRekapKelompok thead');
    const filterContainer = document.getElementById('filterDesaRekap')?.parentElement;
    const titleEl = document.querySelector('#sectionRekapKelompok h4');

    const jamaahData = globalCache.jamaah;
    const generusData = globalCache.generus;

    const calculateAgeFromDate = (dateString) => {
        if (!dateString) return null;
        const parts = dateString.split('-');
        if (parts.length !== 3) return null;
        const birthDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        const today = new Date();
        if (isNaN(birthDate.getTime())) return null;
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    };

    if (currentUser.role === 'OPERATOR') {
        if (titleEl) titleEl.textContent = `DAFTAR JAMAAH & GENERUS KELOMPOK ${currentUser.kelompok.toUpperCase()}`;
        if (filterContainer) filterContainer.style.display = 'none';

        const tableEl = document.getElementById('tableRekapKelompok');
        if (tableEl) {
            tableEl.className = "w-full text-[10px] sm:text-[11px] text-left table-fixed border-collapse border border-slate-300";
        }

        thead.innerHTML = `
            <tr>
                <th class="px-1 py-2 text-center w-[6%] text-[10px] sm:text-[11px] border border-indigo-200 bg-indigo-100/80 text-indigo-950 font-extrabold">No</th>
                <th class="px-1 py-2 text-left text-[10px] sm:text-[11px] w-[30%] border border-indigo-200 bg-indigo-100/80 text-indigo-950 font-extrabold">Nama Lengkap</th>
                <th class="px-1 py-2 text-center text-[10px] sm:text-[11px] w-[24%] border border-indigo-200 bg-indigo-100/80 text-indigo-950 font-extrabold">Status</th>
                <th class="px-1 py-2 text-center text-[10px] sm:text-[11px] w-[8%] border border-indigo-200 bg-indigo-100/80 text-indigo-950 font-extrabold">JK</th>
                <th class="px-1 py-2 text-center text-[10px] sm:text-[11px] w-[16%] border border-indigo-200 bg-indigo-100/80 text-indigo-950 font-extrabold">Umur</th>
                <th class="px-1 py-2 text-center text-[10px] sm:text-[11px] w-[16%] border border-indigo-200 bg-indigo-100/80 text-indigo-950 font-extrabold">Dis.</th>
            </tr>
        `;

        let listMembers = [];
        let countL = 0, countP = 0;
        let catCounts = {
            'Menikah': 0, 'Duda': 0, 'Janda': 0, 'Manula': 0, 'Operator': 0,
            'PAUD': 0, 'TK': 0, 'Caberawit': 0, 'Pra Remaja': 0, 'Remaja': 0, 'Usia Mandiri': 0
        };

        jamaahData.forEach(j => {
            if (j.desa === currentUser.desa && j.kelompok === currentUser.kelompok) {
                const jk = (j.jenis_kelamin || '-').toUpperCase();
                if (jk === 'L') countL++;
                else if (jk === 'P') countP++;

                const st = j.status || 'Menikah';
                if (catCounts.hasOwnProperty(st)) catCounts[st]++;

                let calcAge = j.umur;
                if ((calcAge === null || calcAge === undefined || calcAge === '') && j.tanggal_lahir) {
                    calcAge = calculateAgeFromDate(j.tanggal_lahir);
                }

                listMembers.push({
                    nama: j.nama,
                    kategori: st,
                    jk: jk,
                    umur: (calcAge !== null && calcAge !== undefined && calcAge !== '') ? `${calcAge} thn` : '-',
                    isDisabilitas: j.is_disabilitas,
                    tipe: 'DEWASA'
                });
            }
        });

        generusData.forEach(g => {
            if (g.desa === currentUser.desa && g.kelompok === currentUser.kelompok) {
                const jk = (g.jenis_kelamin || g.jk || '-').toUpperCase();
                if (jk === 'L') countL++;
                else if (jk === 'P') countP++;

                let rawKat = g.kategori_usia || 'Generus';
                let parsedKey = parseKategoriGenerus(rawKat);
                let labelKat = rawKat;
                
                if (parsedKey === 'paud') { labelKat = 'PAUD'; catCounts['PAUD']++; }
                else if (parsedKey === 'tk') { labelKat = 'TK'; catCounts['TK']++; }
                else if (parsedKey === 'caberawit') { labelKat = 'Caberawit'; catCounts['Caberawit']++; }
                else if (parsedKey === 'praRemaja') { labelKat = 'Pra Remaja'; catCounts['Pra Remaja']++; }
                else if (parsedKey === 'remaja') { labelKat = 'Remaja'; catCounts['Remaja']++; }
                else if (parsedKey === 'usiaMandiri') { labelKat = 'Usia Mandiri'; catCounts['Usia Mandiri']++; }

                let valUmur = g.umur ?? g.usia ?? null;
                const tglLahirField = g.tanggal_lahir || g.tgl_lahir || null;

                if ((valUmur === null || valUmur === undefined || valUmur === '') && tglLahirField) {
                    valUmur = calculateAgeFromDate(tglLahirField);
                }

                listMembers.push({
                    nama: g.nama,
                    kategori: labelKat,
                    jk: jk,
                    umur: (valUmur !== null && valUmur !== undefined && valUmur !== '') ? `${valUmur} thn` : '-',
                    isDisabilitas: g.is_disabilitas,
                    tipe: 'GENERUS'
                });
            }
        });

        if (listMembers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400 font-semibold text-xs border border-slate-200">Belum ada data jamaah/generus di kelompok ini.</td></tr>';
            tfoot.innerHTML = '';
            return;
        }

        listMembers.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

        tbody.innerHTML = '';
        listMembers.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-indigo-50/50 transition-colors border-b border-indigo-50/60";
            
            const badgeClass = item.tipe === 'GENERUS' 
                ? 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200' 
                : 'bg-indigo-50 text-indigo-800 border-indigo-200';

            tr.innerHTML = `
                <td class="px-1 py-2 text-center font-bold text-slate-500 text-[11px] border border-slate-200">${index + 1}</td>
                <td class="px-1.5 py-2 font-extrabold text-slate-800 text-left text-[11px] leading-snug break-words border border-slate-200">${item.nama}</td>
                <td class="px-1 py-2 text-center border border-slate-200">
                    <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border inline-block ${badgeClass}">
                        ${item.kategori}
                    </span>
                </td>
                <td class="px-1 py-2 text-center font-bold text-slate-700 text-[11px] border border-slate-200">${item.jk}</td>
                <td class="px-1 py-2 text-center font-bold text-slate-600 text-[10px] border border-slate-200">${item.umur}</td>
                <td class="px-1 py-2 text-center border border-slate-200">
                    ${item.isDisabilitas ? '<span class="text-teal-600 font-extrabold text-[10px]">♿ Ya</span>' : '<span class="text-slate-300 text-[10px]">-</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });

        const summaryChips = [];
        Object.keys(catCounts).forEach(k => {
            if (catCounts[k] > 0) {
                summaryChips.push(`
                    <div class="bg-white/90 border border-indigo-100 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs shrink-0">
                        <span class="text-[9px] font-bold text-slate-500">${k}:</span>
                        <span class="text-[10px] font-black text-indigo-700">${catCounts[k]}</span>
                    </div>
                `);
            }
        });

        tfoot.innerHTML = `
            <tr>
                <td class="px-1 py-2.5 text-center font-black uppercase bg-indigo-200/95 text-[10px] border border-indigo-300">TOT</td>
                <td colspan="5" class="p-2.5 bg-gradient-to-r from-indigo-100/90 via-fuchsia-50/90 to-indigo-100/90 border border-indigo-300">
                    <div class="space-y-2">
                        <div class="flex flex-wrap items-center justify-between gap-1.5 border-b border-indigo-200/60 pb-1.5">
                            <div class="flex items-center gap-1.5">
                                <span class="text-[10px] font-black text-indigo-900 uppercase">Total:</span>
                                <span class="text-xs font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-fuchsia-600 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                                    ${listMembers.length} Orang
                                </span>
                            </div>
                            <div class="flex items-center gap-1 text-[10px] font-bold text-slate-700">
                                <span class="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">👨 L: ${countL}</span>
                                <span class="bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded border border-pink-200">👩 P: ${countP}</span>
                            </div>
                        </div>

                        <div>
                            <span class="block text-[9px] font-extrabold uppercase text-indigo-900 mb-1">Rincian Kategori:</span>
                            <div class="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                ${summaryChips.join('')}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    if (titleEl) titleEl.textContent = "Rekap Jamaah & Generus Per Kelompok";
    if (filterContainer) filterContainer.style.display = 'flex';

    thead.innerHTML = `
        <tr>
            <th class="px-2.5 py-3 sticky-col">Kelompok</th>
            <th class="px-1.5 py-3 text-center whitespace-nowrap bg-fuchsia-100 text-fuchsia-950 border-l border-indigo-200">PAUD</th>
            <th class="px-1.5 py-3 text-center whitespace-nowrap bg-fuchsia-100 text-fuchsia-950">TK</th>
            <th class="px-1.5 py-3 text-center whitespace-nowrap bg-fuchsia-100 text-fuchsia-950">Cbr</th>
            <th class="px-1.5 py-3 text-center whitespace-nowrap bg-fuchsia-100 text-fuchsia-950">Pra Rem</th>
            <th class="px-1.5 py-3 text-center whitespace-nowrap bg-fuchsia-100 text-fuchsia-950">Rem</th>
            <th class="px-1.5 py-3 text-center whitespace-nowrap bg-fuchsia-100 text-fuchsia-950 border-r border-indigo-200">Usman</th>
            <th class="px-1.5 py-3 text-center bg-fuchsia-200/80 text-fuchsia-950 font-extrabold whitespace-nowrap border-r border-indigo-300">Jml Generus</th>
            <th class="px-1.5 py-3 text-center whitespace-nowrap">Nikah</th>
            <th class="px-1.5 py-3 text-center whitespace-nowrap">Duda</th>
            <th class="px-1.5 py-3 text-center whitespace-nowrap">Janda</th>
            <th class="px-1.5 py-3 text-center whitespace-nowrap">Manula</th>
            <th class="px-1.5 py-3 text-center text-blue-800 bg-blue-100/80 whitespace-nowrap">Opr.</th>
            
            <th class="px-1.5 py-3 text-center bg-blue-100/80 text-blue-950 font-bold whitespace-nowrap border-l border-indigo-200">Jml L</th>
            <th class="px-1.5 py-3 text-center bg-pink-100/80 text-pink-950 font-bold whitespace-nowrap">Jml P</th>

            <th class="px-1.5 py-3 text-center bg-indigo-100/80 font-black whitespace-nowrap border-l border-indigo-200">Jml Jamaah</th>
            <th class="px-2 py-3 text-center bg-indigo-200 font-black whitespace-nowrap border-l border-indigo-300 text-indigo-950">Total</th>
        </tr>
    `;

    const selectedFilterDesa = document.getElementById('filterDesaRekap').value;
    const sarprasData = globalCache.sarpras;
    const rekapMap = {};

    Object.keys(dataWilayah).forEach(desa => {
        if (!selectedFilterDesa || selectedFilterDesa === desa) {
            dataWilayah[desa].forEach(kelompok => {
                const key = `${desa}__${kelompok}`;
                rekapMap[key] = {
                    desa, kelompok,
                    paud: 0, tk: 0, caberawit: 0, praRemaja: 0, remaja: 0, usiaMandiri: 0, totalGenerus: 0,
                    menikah: 0, duda: 0, janda: 0, manula: 0, operator: 0, 
                    jamaahL: 0, jamaahP: 0,
                    totalJamaah: 0, totalKeseluruhan: 0,
                    subKlp: 0, masjid: 0, aula: 0, kmPria: 0, kmWanita: 0, kmMt: 0, kmTamu: 0
                };
            });
        }
    });

    if (generusData && generusData.length > 0) {
        generusData.forEach(g => {
            if (!selectedFilterDesa || selectedFilterDesa === g.desa) {
                const key = `${g.desa}__${g.kelompok}`;
                if (!rekapMap[key]) {
                    rekapMap[key] = {
                        desa: g.desa, kelompok: g.kelompok,
                        paud: 0, tk: 0, caberawit: 0, praRemaja: 0, remaja: 0, usiaMandiri: 0, totalGenerus: 0,
                        menikah: 0, duda: 0, janda: 0, manula: 0, operator: 0, jamaahL: 0, jamaahP: 0, totalJamaah: 0, totalKeseluruhan: 0,
                        subKlp: 0, masjid: 0, aula: 0, kmPria: 0, kmWanita: 0, kmMt: 0, kmTamu: 0
                    };
                }
                const katKey = parseKategoriGenerus(g.kategori_usia);
                
                if (katKey && rekapMap[key].hasOwnProperty(katKey)) {
                    rekapMap[key][katKey]++;
                    rekapMap[key].totalGenerus++;
                    rekapMap[key].totalKeseluruhan++;
                }
            }
        });
    }

    jamaahData.forEach(j => {
        if (!selectedFilterDesa || selectedFilterDesa === j.desa) {
            const key = `${j.desa}__${j.kelompok}`;
            if (!rekapMap[key]) {
                rekapMap[key] = {
                    desa: j.desa, kelompok: j.kelompok,
                    paud: 0, tk: 0, caberawit: 0, praRemaja: 0, remaja: 0, usiaMandiri: 0, totalGenerus: 0,
                    menikah: 0, duda: 0, janda: 0, manula: 0, operator: 0, jamaahL: 0, jamaahP: 0, totalJamaah: 0, totalKeseluruhan: 0,
                    subKlp: 0, masjid: 0, aula: 0, kmPria: 0, kmWanita: 0, kmMt: 0, kmTamu: 0
                };
            }
            const st = (j.status || "").toLowerCase();
            if (st === "menikah") rekapMap[key].menikah++;
            else if (st === "duda") rekapMap[key].duda++;
            else if (st === "janda") rekapMap[key].janda++;
            else if (st === "manula") rekapMap[key].manula++;
            else if (st === "operator") rekapMap[key].operator++;
            
            const jk = (j.jenis_kelamin || "").toUpperCase();
            if (jk === "L") rekapMap[key].jamaahL++;
            else if (jk === "P") rekapMap[key].jamaahP++;

            rekapMap[key].totalJamaah++;
            rekapMap[key].totalKeseluruhan++;
        }
    });

    sarprasData.forEach(s => {
        if (!selectedFilterDesa || selectedFilterDesa === s.desa) {
            const key = `${s.desa}__${s.kelompok}`;
            if (!rekapMap[key]) {
                rekapMap[key] = {
                    desa: s.desa, kelompok: s.kelompok,
                    paud: 0, tk: 0, caberawit: 0, praRemaja: 0, remaja: 0, usiaMandiri: 0, totalGenerus: 0,
                    menikah: 0, duda: 0, janda: 0, manula: 0, operator: 0, jamaahL: 0, jamaahP: 0, totalJamaah: 0, totalKeseluruhan: 0,
                    subKlp: 0, masjid: 0, aula: 0, kmPria: 0, kmWanita: 0, kmMt: 0, kmTamu: 0
                };
            }
            rekapMap[key].subKlp = parseInt(s.jumlah_sub_kelompok, 10) || 0;
            rekapMap[key].masjid = parseInt(s.jumlah_masjid, 10) || 0;
            rekapMap[key].aula = parseInt(s.jumlah_aula, 10) || 0;
            rekapMap[key].kmPria = parseInt(s.km_pria, 10) || 0;
            rekapMap[key].kmWanita = parseInt(s.km_wanita, 10) || 0;
            rekapMap[key].kmMt = parseInt(s.km_mt, 10) || 0;
            rekapMap[key].kmTamu = parseInt(s.km_tamu, 10) || 0;
        }
    });

    tbody.innerHTML = '';
    let totPaud = 0, totTk = 0, totCaberawit = 0, totPraRemaja = 0, totRemaja = 0, totUsiaMandiri = 0, totAllGenerus = 0;
    let totMenikah = 0, totDuda = 0, totJanda = 0, totManula = 0, totOperator = 0;
    let totJamaahL = 0, totJamaahP = 0;
    let totAllJamaah = 0, totAllKeseluruhan = 0;

    const items = Object.values(rekapMap);

    items.forEach((item) => {
        totPaud += item.paud;
        totTk += item.tk;
        totCaberawit += item.caberawit;
        totPraRemaja += item.praRemaja;
        totRemaja += item.remaja;
        totUsiaMandiri += item.usiaMandiri;
        totAllGenerus += item.totalGenerus;

        totMenikah += item.menikah;
        totDuda += item.duda;
        totJanda += item.janda;
        totManula += item.manula;
        totOperator += item.operator;
        
        totJamaahL += item.jamaahL;
        totJamaahP += item.jamaahP;

        totAllJamaah += item.totalJamaah;
        totAllKeseluruhan += item.totalKeseluruhan;

        const tr = document.createElement('tr');
        tr.className = "hover:bg-indigo-50/50 transition-colors";
        
        tr.innerHTML = `
            <td class="px-2.5 py-3 font-extrabold text-indigo-900 hover:text-indigo-600 hover:underline cursor-pointer sticky-col" onclick="showKelompokDetailModal('${item.kelompok}')" title="Klik untuk lihat anggota ${item.kelompok}">${item.kelompok}</td>
            <td class="px-1.5 py-3 text-center bg-fuchsia-50/40 font-bold text-fuchsia-900 border-l border-indigo-100">${item.paud}</td>
            <td class="px-1.5 py-3 text-center bg-fuchsia-50/40 font-bold text-fuchsia-900">${item.tk}</td>
            <td class="px-1.5 py-3 text-center bg-fuchsia-50/40 font-bold text-fuchsia-900">${item.caberawit}</td>
            <td class="px-1.5 py-3 text-center bg-fuchsia-50/40 font-bold text-fuchsia-900">${item.praRemaja}</td>
            <td class="px-1.5 py-3 text-center bg-fuchsia-50/40 font-bold text-fuchsia-900">${item.remaja}</td>
            <td class="px-1.5 py-3 text-center bg-fuchsia-50/40 font-bold text-fuchsia-900 border-r border-indigo-100">${item.usiaMandiri}</td>
            <td class="px-1.5 py-3 text-center font-black bg-fuchsia-100/70 text-fuchsia-950 border-r border-indigo-200 text-[11px]">${item.totalGenerus}</td>
            <td class="px-1.5 py-3 text-center font-semibold text-slate-700">${item.menikah}</td>
            <td class="px-1.5 py-3 text-center font-semibold text-slate-700">${item.duda}</td>
            <td class="px-1.5 py-3 text-center font-semibold text-slate-700">${item.janda}</td>
            <td class="px-1.5 py-3 text-center font-semibold text-slate-700">${item.manula}</td>
            <td class="px-1.5 py-3 text-center font-black text-blue-700 bg-blue-50/60">${item.operator}</td>
            
            <td class="px-1.5 py-3 text-center font-bold text-blue-900 bg-blue-50/40 border-l border-indigo-100">${item.jamaahL}</td>
            <td class="px-1.5 py-3 text-center font-bold text-pink-900 bg-pink-50/40">${item.jamaahP}</td>

            <td class="px-1.5 py-3 text-center font-black text-indigo-900 bg-indigo-50 border-l border-indigo-200 text-[11px]">${item.totalJamaah}</td>
            <td class="px-2 py-3 text-center font-black text-indigo-900 bg-indigo-200/80 border-l border-indigo-300 text-[12px]">${item.totalKeseluruhan}</td>
        `;
        tbody.appendChild(tr);
    });

    tfoot.innerHTML = `
        <tr>
            <td class="px-2.5 py-4 text-left font-black uppercase sticky-col bg-indigo-200/90">TOTAL</td>
            <td class="px-1.5 py-4 text-center font-black text-fuchsia-950 bg-fuchsia-200/80 border-l border-indigo-200">${totPaud}</td>
            <td class="px-1.5 py-4 text-center font-black text-fuchsia-950 bg-fuchsia-200/80">${totTk}</td>
            <td class="px-1.5 py-4 text-center font-black text-fuchsia-950 bg-fuchsia-200/80">${totCaberawit}</td>
            <td class="px-1.5 py-4 text-center font-black text-fuchsia-950 bg-fuchsia-200/80">${totPraRemaja}</td>
            <td class="px-1.5 py-4 text-center font-black text-fuchsia-950 bg-fuchsia-200/80">${totRemaja}</td>
            <td class="px-1.5 py-4 text-center font-black text-fuchsia-950 bg-fuchsia-200/80 border-r border-indigo-200">${totUsiaMandiri}</td>
            <td class="px-1.5 py-4 text-center font-black text-fuchsia-950 bg-fuchsia-300/80 border-r border-indigo-300 text-[12px]">${totAllGenerus}</td>
            <td class="px-1.5 py-4 text-center font-black text-indigo-950">${totMenikah}</td>
            <td class="px-1.5 py-4 text-center font-black text-indigo-950">${totDuda}</td>
            <td class="px-1.5 py-4 text-center font-black text-indigo-950">${totJanda}</td>
            <td class="px-1.5 py-4 text-center font-black text-indigo-950">${totManula}</td>
            <td class="px-1.5 py-4 text-center font-black text-blue-800 bg-blue-100/90">${totOperator}</td>
            
            <td class="px-1.5 py-4 text-center font-black text-blue-950 bg-blue-100/90 border-l border-indigo-200">${totJamaahL}</td>
            <td class="px-1.5 py-4 text-center font-black text-pink-950 bg-pink-100/90">${totJamaahP}</td>

            <td class="px-1.5 py-4 text-center font-black text-indigo-950 bg-indigo-200/80 border-l border-indigo-200 text-[12px]">${totAllJamaah}</td>
            <td class="px-2 py-4 text-center font-black text-indigo-950 bg-indigo-300 border-l border-indigo-300 text-[13px]">${totAllKeseluruhan}</td>
        </tr>
    `;
}

function setupYearFilter() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    const currentDateStr = String(now.getDate()).padStart(2, '0'); // Ambil tanggal hari ini (01 - 31)

    // Populate Dropdown Angka Tanggal (01 - 31) & Set Default Tanggal Hari Ini
    const selTanggalFilter = document.getElementById('filterTanggalAbsensi');
    if (selTanggalFilter) {
        selTanggalFilter.innerHTML = '<option value="">Semua Tgl</option>';
        for (let i = 1; i <= 31; i++) {
            const val = i < 10 ? `0${i}` : `${i}`;
            selTanggalFilter.add(new Option(val, val));
        }
        selTanggalFilter.value = currentDateStr; // Default: Hari Ini
    }

    // Populate Dropdown Tahun
    const selTahunFilter = document.getElementById('filterTahun');
    if (selTahunFilter) {
        selTahunFilter.innerHTML = '';
        for (let i = currentYear; i >= currentYear - 3; i--) {
            selTahunFilter.add(new Option(`Tahun ${i}`, i));
        }
        selTahunFilter.value = currentYear; // Default: Tahun Sekarang
    }

    // Populate Dropdown Bulan & Set Default Bulan Sekarang
    const selBulanFilter = document.getElementById('filterBulanAbsensi');
    if (selBulanFilter) {
        selBulanFilter.value = currentMonthStr; // Default: Bulan Sekarang
    }
}

function populateKegiatanFilter() {
    const selKegiatan = document.getElementById('filterKegiatanAbsensi');
    if (!selKegiatan) return;

    const currentValue = selKegiatan.value;
    const uniqueKegiatan = [...new Set(globalCache.absensi.map(item => item.nama_kegiatan))].filter(Boolean).sort();
    
    selKegiatan.innerHTML = '<option value="">-- Semua Kegiatan --</option>';
    uniqueKegiatan.forEach(nama => selKegiatan.add(new Option(nama, nama)));
    if (currentValue && uniqueKegiatan.includes(currentValue)) selKegiatan.value = currentValue;
}

function loadRekapAbsensi() {
    const desa = document.getElementById('filterDesaAbsensi')?.value || '';
    const tglAngka = document.getElementById('filterTanggalAbsensi')?.value || '';
    const bulan = document.getElementById('filterBulanAbsensi')?.value || '';
    const tahun = document.getElementById('filterTahun')?.value || '';
    const kegiatan = document.getElementById('filterKegiatanAbsensi')?.value || '';

    const tbody = document.getElementById('tbodyRekapAbsensi');
    const tfoot = document.getElementById('tfootRekapAbsensi');

    let data = [...globalCache.absensi];
    if (kegiatan) data = data.filter(item => item.nama_kegiatan === kegiatan);

    data.sort((a, b) => {
        const dateA = String(a.tanggal_kegiatan || '');
        const dateB = String(b.tanggal_kegiatan || '');
        if (dateA !== dateB) {
            return dateB.localeCompare(dateA);
        }
        return String(b.id || '').localeCompare(String(a.id || ''));
    });

    const filteredData = data.filter(item => {
        if (desa && item.desa !== desa) return false;
        if (!item.tanggal_kegiatan) return false;

        const parts = item.tanggal_kegiatan.split('-');
        if (parts.length < 3) return false;

        const itemTahun = parts[0];
        const itemBulan = parts[1];
        const itemTgl = parts[2];

        if (tahun && itemTahun !== tahun) return false;
        if (bulan && itemBulan !== bulan) return false;
        if (tglAngka && itemTgl !== tglAngka) return false;

        return true;
    });

    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400 font-medium">Tidak ada data.</td></tr>';
        tfoot.innerHTML = '';
        return;
    }

    tbody.innerHTML = '';
    let totalLaki = 0, totalPerempuan = 0, totalIjin = 0, totalInfaq = 0;
    let totalHadirAll = 0, totalTargetAll = 0;

    filteredData.forEach(item => {
        const jmlL = item.jumlah_laki || 0;
        const jmlP = item.jumlah_perempuan || 0;
        const totalHadir = jmlL + jmlP;

        totalLaki += jmlL;
        totalPerempuan += jmlP;
        totalIjin += (item.jumlah_ijin || 0);
        totalInfaq += (item.infaq || 0);

        let targetJamaah = 0;
        const namaKeg = (item.nama_kegiatan || '').trim().toLowerCase();

        if (namaKeg.includes('ibu-ibu') || namaKeg.includes('ibu ibu')) {
            targetJamaah = globalCache.jamaah.filter(j => {
                if (j.desa !== item.desa || j.kelompok !== item.kelompok) return false;
                const st = (j.status || '').toLowerCase();
                const jk = (j.jenis_kelamin || '').toUpperCase();
                return st === 'janda' || (st === 'menikah' && jk === 'P') || (st === 'manula' && jk === 'P');
            }).length;

        } else if (namaKeg.includes('remaja')) {
            targetJamaah = globalCache.generus.filter(g => {
                if (g.desa !== item.desa || g.kelompok !== item.kelompok) return false;
                const kat = parseKategoriGenerus(g.kategori_usia);
                return ['praRemaja', 'remaja', 'usiaMandiri'].includes(kat);
            }).length;

        } else if (item.target_custom && Array.isArray(item.target_custom) && item.target_custom.length > 0) {
            const listTarget = item.target_custom;

            if (listTarget.includes('semua_jamaah')) {
                const totalDewasaAll = globalCache.jamaah.filter(j => j.desa === item.desa && j.kelompok === item.kelompok).length;
                const totalGenerusAll = globalCache.generus.filter(g => g.desa === item.desa && g.kelompok === item.kelompok).length;
                targetJamaah = totalDewasaAll + totalGenerusAll;
            } else {
                const totalDewasa = globalCache.jamaah.filter(j => {
                    if (j.desa !== item.desa || j.kelompok !== item.kelompok) return false;
                    const st = (j.status || '').toLowerCase();
                    const jk = (j.jenis_kelamin || '').toUpperCase();

                    if (listTarget.includes('ibu_ibu') && (st === 'janda' || (st === 'menikah' && jk === 'P') || (st === 'manula' && jk === 'P'))) return true;
                    if (listTarget.includes('bapak_bapak') && (st === 'duda' || (st === 'menikah' && jk === 'L') || (st === 'manula' && jk === 'L'))) return true;
                    if (listTarget.includes('duda_janda') && (st === 'duda' || st === 'janda')) return true;
                    if (listTarget.includes('manula') && st === 'manula') return true;
                    return false;
                }).length;

                const totalGenerusMatch = globalCache.generus.filter(g => {
                    if (g.desa !== item.desa || g.kelompok !== item.kelompok) return false;
                    const kat = parseKategoriGenerus(g.kategori_usia);

                    if (listTarget.includes('muda_mudi') && ['praRemaja', 'remaja', 'usiaMandiri'].includes(kat)) return true;
                    if (listTarget.includes('caberawit') && ['paud', 'tk', 'caberawit'].includes(kat)) return true;
                    return false;
                }).length;

                targetJamaah = totalDewasa + totalGenerusMatch;
            }

        } else {
            const totalDewasaAll = globalCache.jamaah.filter(j => j.desa === item.desa && j.kelompok === item.kelompok).length;
            const totalGenerusAll = globalCache.generus.filter(g => g.desa === item.desa && g.kelompok === item.kelompok).length;
            targetJamaah = totalDewasaAll + totalGenerusAll;
        }

        let persentase = 0;
        if (targetJamaah > 0) {
            persentase = Math.min(100, Math.round((totalHadir / targetJamaah) * 100));
        }

        totalHadirAll += totalHadir;
        totalTargetAll += targetJamaah;

        let badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
        if (persentase >= 85) badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
        else if (persentase >= 65) badgeColor = "bg-amber-100 text-amber-800 border-amber-200";

        let tglFormatted = '-';
        if (item.tanggal_kegiatan) {
            const p = item.tanggal_kegiatan.split('-');
            if (p.length === 3) tglFormatted = `${p[2]}/${p[1]}/${p[0]}`;
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-fuchsia-50/50 transition-colors";
        tr.innerHTML = `
            <td class="px-2.5 py-3 font-extrabold text-fuchsia-900 whitespace-nowrap sticky-col" title="${item.kelompok}">${item.kelompok}</td>
            <td class="px-2 py-3 text-center whitespace-nowrap font-semibold text-slate-600">${tglFormatted}</td>
            <td class="px-2 py-3 text-center whitespace-nowrap font-bold">${jmlL}L / ${jmlP}P</td>
            <td class="px-2 py-3 text-center whitespace-nowrap">
                <span class="px-2 py-0.5 font-black text-[11px] rounded-md border ${badgeColor}" title="Target Acuan: ${targetJamaah} Orang">
                    ${persentase}%
                </span>
            </td>
            <td class="px-2 py-3 text-center whitespace-nowrap font-bold text-pink-600">${item.jumlah_ijin || 0} Orang</td>
            <td class="px-2 py-3 text-right font-extrabold whitespace-nowrap text-slate-800">Rp${(item.infaq || 0).toLocaleString('id-ID')}</td>
            <td class="px-2 py-3 text-center whitespace-nowrap no-print"><button onclick="editAbsensi('${item.id}')" class="px-3 py-1.5 bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 rounded-lg font-extrabold text-[10px] transition-colors shadow-sm">Edit</button></td>
        `;
        tbody.appendChild(tr);
    });

    let persentaseTotal = 0;
    if (totalTargetAll > 0) {
        persentaseTotal = Math.min(100, Math.round((totalHadirAll / totalTargetAll) * 100));
    }

    tfoot.innerHTML = `
        <tr>
            <td class="px-2.5 py-4 text-left font-black uppercase whitespace-nowrap sticky-col bg-fuchsia-200/90">TOTAL</td>
            <td class="px-2 py-4 text-center font-black text-fuchsia-950 whitespace-nowrap">-</td>
            <td class="px-2 py-4 text-center font-black text-fuchsia-950 whitespace-nowrap">${totalLaki}L / ${totalPerempuan}P</td>
            <td class="px-2 py-4 text-center font-black text-fuchsia-950 whitespace-nowrap text-[12px] bg-fuchsia-300/80">${persentaseTotal}%</td>
            <td class="px-2 py-4 text-center font-black text-pink-800 whitespace-nowrap">${totalIjin} Orang</td>
            <td class="px-2 py-4 text-right font-black text-emerald-700 whitespace-nowrap text-[13px]">Rp${totalInfaq.toLocaleString('id-ID')}</td>
            <td class="px-2 py-4 text-center no-print"></td>
        </tr>
    `;
}

function exportTableToExcel(tbodyId, tfootId) {
    const tbody = document.getElementById(tbodyId);

    if (!tbody || tbody.rows.length === 0) {
        showCustomModal("Export Gagal", "Tidak ada data untuk diexport ke Excel.", "⚠️");
        return;
    }

    let table = document.getElementById('tableRekapKelompok');
    let fileName = `Rekap_Jamaah_Sarpras_${new Date().toISOString().slice(0,10)}.xlsx`;

    const wb = XLSX.utils.table_to_book(table, { sheet: "Data Jamaah" });
    XLSX.writeFile(wb, fileName);
}

function printData(elementId, documentTitle = 'Laporan Sistem Informasi') {
    let targetContentEl;

    if (elementId === 'printableRekapContent') {
        if (activeRekapSubTab === 'STATUS_KESELURUHAN') {
            targetContentEl = document.getElementById('sectionStatusKeseluruhan');
        } else if (activeRekapSubTab === 'REKAP_KELOMPOK' || activeRekapSubTab === 'REKAP_SARPRAS') {
            targetContentEl = document.getElementById('sectionRekapKelompok');
        }
    } else {
        targetContentEl = document.getElementById(elementId);
    }

    if (!targetContentEl) return;

    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const clonedContent = targetContentEl.cloneNode(true);

    clonedContent.classList.remove('hidden');
    clonedContent.querySelectorAll('.hidden').forEach(el => el.classList.remove('hidden'));
    clonedContent.querySelectorAll('.no-print, button, select, input, svg').forEach(el => el.remove());

    clonedContent.querySelectorAll('.col-aksi').forEach(el => el.remove());
    clonedContent.querySelectorAll('tr').forEach(tr => {
        const cells = Array.from(tr.children);
        cells.forEach(cell => {
            if (cell.classList.contains('no-print') || cell.classList.contains('col-aksi') || cell.querySelector('button')) {
                cell.remove();
            }
        });
    });

    clonedContent.querySelectorAll('.table-vertical-scroll, table').forEach(el => {
        el.style.transform = 'none';
        el.style.overflow = 'visible';
        el.style.maxHeight = 'none';
    });

    let orientation = 'portrait';
    if (activeSectionId === 'rekap' && activeRekapSubTab === 'REKAP_KELOMPOK' && currentUser.role === 'DEVELOPER') {
        orientation = 'landscape';
    }

    const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${documentTitle}</title>
            <style>
                @page {
                    size: A4 ${orientation};
                    margin: 10mm 10mm 10mm 10mm;
                }
                body {
                    font-family: Arial, Helvetica, sans-serif;
                    color: #111111;
                    background: #ffffff;
                    margin: 0;
                    padding: 0;
                    font-size: 9pt;
                }
                svg, img {
                    display: none !important;
                }
                .word-header {
                    text-align: center;
                    border-bottom: 2px solid #000000;
                    padding-bottom: 6px;
                    margin-bottom: 12px;
                }
                .word-header h1 {
                    font-size: 14pt;
                    font-weight: bold;
                    margin: 0 0 2px 0;
                    text-transform: uppercase;
                }
                .word-header p {
                    font-size: 9pt;
                    margin: 2px 0;
                    color: #333333;
                }
                h4 {
                    font-size: 10pt;
                    font-weight: bold;
                    margin: 10px 0 4px 0;
                    text-transform: uppercase;
                    color: #000000;
                    page-break-after: avoid;
                }
                
                .grid {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 6px !important;
                    margin-bottom: 10px !important;
                }
                .grid > div {
                    flex: 1 1 0 !important;
                    border: 1px solid #000000 !important;
                    padding: 6px 4px !important;
                    text-align: center !important;
                    background: #fdfdfd !important;
                    page-break-inside: avoid !important;
                }
                .grid span {
                    display: block;
                }
                .grid span:first-child {
                    font-size: 7.5pt;
                    font-weight: bold;
                    color: #444444;
                    text-transform: uppercase;
                }
                .grid span:last-child {
                    font-size: 12pt;
                    font-weight: bold;
                    color: #000000;
                    margin-top: 2px;
                }

                table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin-top: 6px !important;
                    margin-bottom: 12px !important;
                    font-size: 8pt !important;
                    page-break-inside: auto !important;
                }
                thead {
                    display: table-header-group !important;
                }
                tfoot {
                    display: table-footer-group !important;
                }
                tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                th, td {
                    border: 1px solid #000000 !important;
                    padding: 4px 3px !important;
                    text-align: center !important;
                    vertical-align: middle !important;
                    word-wrap: break-word !important;
                }
                th {
                    background-color: #f0f0f0 !important;
                    font-weight: bold !important;
                    text-transform: uppercase !important;
                }
                tfoot td {
                    background-color: #e6e6e6 !important;
                    font-weight: bold !important;
                }
                td.sticky-col, th.sticky-col {
                    text-align: left !important;
                }
            </style>
        </head>
        <body>
            <div class="word-header">
                <h1>INSAN QUR'ANY TAWANGMANGU</h1>
                <p><strong>${documentTitle}</strong></p>
                <p style="font-size: 8pt; color: #555555;">Dicetak pada: ${dateStr} WIB</p>
            </div>

            ${clonedContent.innerHTML}
        </body>
        </html>
    `;

    const oldIframe = document.getElementById('printIframeHidden');
    if (oldIframe) oldIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'printIframeHidden';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(printHTML);
    iframeDoc.close();

    iframe.onload = function() {
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }, 200);
    };
}

let activeSelectTarget = null;
let touchStartY = 0;
let touchStartX = 0;
let isSwiping = false;

document.addEventListener('mousedown', interceptSelectMouseDown, { capture: true });
document.addEventListener('touchstart', interceptSelectTouchStart, { capture: true, passive: true });
document.addEventListener('touchmove', interceptSelectTouchMove, { capture: true, passive: true });
document.addEventListener('touchend', interceptSelectTouchEnd, { capture: true });

function interceptSelectMouseDown(e) {
    const select = e.target.closest('select');
    if (!select || select.disabled) return;

    e.preventDefault();
    e.stopPropagation();

    activeSelectTarget = select;
    openCenterPicker(select);
}

function interceptSelectTouchStart(e) {
    const select = e.target.closest('select');
    if (!select || select.disabled) return;

    isSwiping = false;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
}

function interceptSelectTouchMove(e) {
    if (!touchStartY) return;

    const diffY = Math.abs(e.touches[0].clientY - touchStartY);
    const diffX = Math.abs(e.touches[0].clientX - touchStartX);

    if (diffY > 6 || diffX > 6) {
        isSwiping = true;
    }
}

function interceptSelectTouchEnd(e) {
    const select = e.target.closest('select');
    if (!select || select.disabled) return;

    if (!isSwiping) {
        e.preventDefault();
        e.stopPropagation();
        
        activeSelectTarget = select;
        openCenterPicker(select);
    }
}

function openCenterPicker(selectEl) {
    const modal = document.getElementById('centerPickerModal');
    const titleEl = document.getElementById('centerPickerTitle');
    const optionsEl = document.getElementById('centerPickerOptions');
    const theme = getCurrentTheme();

    let titleText = "Pilih Opsi";
    if (selectEl.options.length > 0 && !selectEl.options[0].value) {
        titleText = selectEl.options[0].text.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    } else {
        const labelEl = selectEl.closest('div').querySelector('label');
        if (labelEl) {
            titleText = labelEl.textContent.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        }
    }
    if (!titleText) titleText = "Pilih Opsi";

    titleEl.textContent = titleText;
    titleEl.className = `text-xs font-extrabold uppercase tracking-widest ${theme.pickerTitleClass} truncate max-w-[70%] block`;

    optionsEl.className = "overflow-y-auto space-y-2.5 pr-1 flex-1 py-1";
    optionsEl.innerHTML = '';
    
    const options = Array.from(selectEl.options);

    options.forEach((opt) => {
        if (!opt.value && options.length > 1) return;

        const isSelected = opt.value === selectEl.value;
        const item = document.createElement('div');
        
        const baseClass = "picker-option-item p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer flex justify-between items-center transition-all border backdrop-blur-sm";
        const unselectedClass = "bg-white/80 border-slate-200/80 shadow-sm text-slate-700 hover:bg-white hover:border-indigo-200 hover:shadow-md";
        const selectedClass = "active-selected border-transparent shadow-lg transform scale-[1.02]";

        item.className = `${baseClass} ${isSelected ? selectedClass : unselectedClass}`;

        item.innerHTML = `
            <span class="truncate pr-2">${opt.text}</span>
            ${isSelected ? `
                <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0 drop-shadow-sm" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                </svg>
            ` : ''}
        `;

        item.onclick = () => {
            selectEl.value = opt.value;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            closeCenterPicker();
        };

        optionsEl.appendChild(item);
    });

    const modalContent = modal.firstElementChild;
    modalContent.className = `rounded-[2rem] p-5 sm:p-6 max-w-sm w-full transform scale-90 opacity-0 max-h-[75vh] flex flex-col ${theme.pickerThemeClass}`;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-90', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 20);

    history.pushState({ pickerOpen: true, section: activeSectionId }, '', '#picker');
}

function closeCenterPicker(backHistory = true) {
    const modal = document.getElementById('centerPickerModal');
    if (!modal || modal.classList.contains('hidden')) return;

    const modalContent = modal.firstElementChild;
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-90', 'opacity-0');
    modal.classList.add('opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
        activeSelectTarget = null;
    }, 300);

    if (backHistory && window.history.state && window.history.state.pickerOpen) {
        window.history.back();
    }
}

async function showDuplicateConfirmModal(nama, tempatLahir, tanggalLahir, kelompok, desa) {
    return new Promise((resolve) => {
        const parts = tanggalLahir.split('-');
        const tglFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : tanggalLahir;

        showCustomModal(
            "Data Terindikasi Ganda",
            `Jamaah dengan nama "${nama}" (Lahir: ${tempatLahir}, ${tglFormatted}) di kelompok ${kelompok} (${desa}) sudah terdaftar di sistem.\n\nApakah Anda yakin ingin tetap menambahkannya sebagai data baru?`,
            "⚠️",
            () => resolve(true),
            true,
            () => resolve(false)
        );
    });
}

function loadRekapSarprasDeveloper() {
    if (currentUser.role === 'OPERATOR') {
        showCustomModal("Fitur Dalam Pemeliharaan", "Modul Rekap Sarpras belum dapat diakses oleh Operator saat ini.", "🛠️");
        return;
    }

    const tbody = document.getElementById('tbodyRekapKelompok');
    const tfoot = document.getElementById('tfootRekapKelompok');
    const thead = document.querySelector('#tableRekapKelompok thead');
    const filterContainer = document.getElementById('filterDesaRekap')?.parentElement;
    const titleEl = document.querySelector('#sectionRekapKelompok h4');

    const sarprasData = globalCache.sarpras;

    if (titleEl) titleEl.textContent = "Rekapitulasi Sarana Prasarana Per Kelompok";
    if (filterContainer) filterContainer.style.display = 'flex';

    thead.innerHTML = `
        <tr>
            <th class="px-2.5 py-3 sticky-col bg-teal-100 text-teal-950 font-extrabold">Kelompok</th>
            <th class="px-2 py-3 text-center whitespace-nowrap bg-teal-100 text-teal-950">Status Tanah</th>
            <th class="px-2 py-3 text-center whitespace-nowrap bg-teal-100 text-teal-950">Sub Klp</th>
            <th class="px-2 py-3 text-center whitespace-nowrap bg-teal-100 text-teal-950">Masjid</th>
            <th class="px-2 py-3 text-center whitespace-nowrap bg-teal-100 text-teal-950">Aula</th>
            <th class="px-2 py-3 text-center whitespace-nowrap bg-teal-100 text-teal-950">Toilet Pria</th>
            <th class="px-2 py-3 text-center whitespace-nowrap bg-teal-100 text-teal-950">Toilet Wanita</th>
            <th class="px-2 py-3 text-center whitespace-nowrap bg-teal-100 text-teal-950">Kmr MT</th>
            <th class="px-2 py-3 text-center whitespace-nowrap bg-teal-100 text-teal-950">Kmr Tamu</th>
        </tr>
    `;

    const selectedFilterDesa = document.getElementById('filterDesaRekap').value;
    tbody.innerHTML = '';

    let totSub = 0, totMasjid = 0, totAula = 0, totKmPria = 0, totKmWanita = 0, totKmMt = 0, totKmTamu = 0;

    Object.keys(dataWilayah).forEach(desa => {
        if (!selectedFilterDesa || selectedFilterDesa === desa) {
            dataWilayah[desa].forEach(kelompok => {
                const item = sarprasData.find(s => s.desa === desa && s.kelompok === kelompok) || {
                    status_tanah: '-', jumlah_sub_kelompok: 0, jumlah_masjid: 0, jumlah_aula: 0,
                    km_pria: 0, km_wanita: 0, km_mt: 0, km_tamu: 0
                };

                totSub += parseInt(item.jumlah_sub_kelompok, 10) || 0;
                totMasjid += parseInt(item.jumlah_masjid, 10) || 0;
                totAula += parseInt(item.jumlah_aula, 10) || 0;
                totKmPria += parseInt(item.km_pria, 10) || 0;
                totKmWanita += parseInt(item.km_wanita, 10) || 0;
                totKmMt += parseInt(item.km_mt, 10) || 0;
                totKmTamu += parseInt(item.km_tamu, 10) || 0;

                const tr = document.createElement('tr');
                tr.className = "hover:bg-teal-50/50 transition-colors";
                tr.innerHTML = `
                    <td class="px-2.5 py-2.5 font-extrabold text-teal-950 sticky-col">${kelompok}</td>
                    <td class="px-2 py-2.5 text-center font-bold text-slate-700">${item.status_tanah || '-'}</td>
                    <td class="px-2 py-2.5 text-center font-bold text-slate-800">${item.jumlah_sub_kelompok || 0}</td>
                    <td class="px-2 py-2.5 text-center font-bold text-slate-800">${item.jumlah_masjid || 0}</td>
                    <td class="px-2 py-2.5 text-center font-bold text-slate-800">${item.jumlah_aula || 0}</td>
                    <td class="px-2 py-2.5 text-center font-bold text-blue-800">${item.km_pria || 0}</td>
                    <td class="px-2 py-2.5 text-center font-bold text-pink-800">${item.km_wanita || 0}</td>
                    <td class="px-2 py-2.5 text-center font-bold text-indigo-800">${item.km_mt || 0}</td>
                    <td class="px-2 py-2.5 text-center font-bold text-teal-800">${item.km_tamu || 0}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    });

    tfoot.innerHTML = `
        <tr>
            <td class="px-2.5 py-3.5 text-left font-black uppercase sticky-col bg-teal-200/90">TOTAL</td>
            <td class="px-2 py-3.5 text-center font-black">-</td>
            <td class="px-2 py-3.5 text-center font-black text-teal-950">${totSub}</td>
            <td class="px-2 py-3.5 text-center font-black text-teal-950">${totMasjid}</td>
            <td class="px-2 py-3.5 text-center font-black text-teal-950">${totAula}</td>
            <td class="px-2 py-3.5 text-center font-black text-blue-950">${totKmPria}</td>
            <td class="px-2 py-3.5 text-center font-black text-pink-950">${totKmWanita}</td>
            <td class="px-2 py-3.5 text-center font-black text-indigo-950">${totKmMt}</td>
            <td class="px-2 py-3.5 text-center font-black text-teal-950">${totKmTamu}</td>
        </tr>
    `;
}