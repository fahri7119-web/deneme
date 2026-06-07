// Supabase Configuration
const SUPABASE_URL = 'https://tmtdpykzmdvxszxwyege.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3S4Qryj5TCI4IDASoxisVw_Y9eoso2F';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global State
window.appData = { members: [], stock: [], distributions: [], financial: [], distributionPlans: [], articles: [], authors: [], businesses: [], hero: [], videos: [], news: [] };
window.currentUserMode = null;
window.currentUserEmail = null;
window.currentUserId = null;
window.editingData = null;
window.supabaseClient = supabaseClient;

// UYUMLULUK KATMANI
window.data = window.appData;

// ==================== YETKİLENDİRME FONKSİYONLARI ====================
window.getCurrentUserRole = async () => {
    if (window.currentUserMode) return window.currentUserMode;
    
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return 'viewer';
        
        window.currentUserEmail = user.email;
        window.currentUserId = user.id;
        
        if (user.email === 'fahri7119@gmail.com') {
            window.currentUserMode = 'admin';
            return 'admin';
        }
        
        const role = user.user_metadata?.role;
        if (role === 'author') {
            window.currentUserMode = 'author';
            return 'author';
        }
        
        window.currentUserMode = 'viewer';
        return 'viewer';
    } catch(e) {
        console.error('Rol alınamadı:', e);
        return 'viewer';
    }
};

window.canEdit = () => {
    return window.currentUserMode === 'admin' || window.currentUserMode === 'author';
};

window.isAdmin = () => {
    return window.currentUserMode === 'admin';
};

window.isAuthor = () => {
    return window.currentUserMode === 'author';
};

window.isViewer = () => {
    return window.currentUserMode === 'viewer';
};

window.canViewPage = (page) => {
    if (window.currentUserMode === 'admin') return true;
    if (window.currentUserMode === 'author') {
        const allowedPages = ['dashboard', 'author_panel'];
        return allowedPages.includes(page);
    }
    if (window.currentUserMode === 'viewer') return true;
    return true;
};

window.updateMenuVisibility = () => {
    const isAdminUser = window.isAdmin();
    const isAuthorUser = window.isAuthor();
    
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdminUser ? '' : 'none';
    });
    
    document.querySelectorAll('.author-only').forEach(el => {
        el.style.display = isAuthorUser ? '' : 'none';
    });
    
    document.querySelectorAll('.author-panel-btn').forEach(el => {
        el.style.display = (isAdminUser || isAuthorUser) ? '' : 'none';
    });
};

// ==================== TEMEL YARDIMCI FONKSİYONLAR ====================
window.showToast = (msg, type) => {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
};

window.checkAdmin = () => {
    if (!window.isAdmin()) {
        window.showToast('Admin yetkisi gerekli!', 'error');
        return false;
    }
    return true;
};

window.checkEditPermission = () => {
    if (!window.canEdit()) {
        window.showToast('Düzenleme yetkiniz yok! Sadece görüntüleme modundasınız.', 'warning');
        return false;
    }
    return true;
};

window.escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

window.formatDateTR = (dateStr) => {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('tr-TR');
    } catch (e) {
        return dateStr;
    }
};

window.stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

window.slugify = (text) => {
    if (!text) return '';
    const trMap = {'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ş':'s','Ş':'S','ü':'u','Ü':'U','ı':'i','İ':'I','ö':'o','Ö':'O'};
    for (let key in trMap) text = text.replace(new RegExp(key, 'g'), trMap[key]);
    return text.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// ==================== FİFO ALGORİTMASI ====================
window.computeFifoRemaining = () => {
    const stockCopy = window.appData.stock.map(s => ({ ...s, _computed_remaining: s.received_quantity }));
    const stockByProduct = {};
    stockCopy.forEach(s => {
        if (!stockByProduct[s.product_name]) stockByProduct[s.product_name] = [];
        stockByProduct[s.product_name].push(s);
    });
    Object.values(stockByProduct).forEach(items => items.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date)));

    const sortedDists = [...window.appData.distributions].sort((a, b) => new Date(a.distribution_date) - new Date(b.distribution_date));

    sortedDists.forEach(dist => {
        (dist.items || []).forEach(item => {
            let rem = item.quantity;
            const stockItems = stockByProduct[item.productName] || [];
            for (const st of stockItems) {
                if (rem <= 0) break;
                const deduct = Math.min(rem, st._computed_remaining);
                st._computed_remaining = parseFloat((st._computed_remaining - deduct).toFixed(2));
                rem = parseFloat((rem - deduct).toFixed(2));
            }
        });
    });
    return Object.fromEntries(stockCopy.map(s => [s.id, s]));
};

window.rebuildAndSyncStockFromFifo = async () => {
    const byProduct = {};
    window.appData.stock.forEach(s => {
        if (!byProduct[s.product_name]) byProduct[s.product_name] = [];
        byProduct[s.product_name].push({ id: s.id, received: s.received_quantity, entry: s.entry_date, rem: s.received_quantity });
    });
    Object.values(byProduct).forEach(arr => arr.sort((a, b) => new Date(a.entry) - new Date(b.entry)));
    
    [...window.appData.distributions].sort((a, b) => new Date(a.distribution_date) - new Date(b.distribution_date)).forEach(dist => {
        (dist.items || []).forEach(item => {
            let rem = item.quantity;
            for (const st of (byProduct[item.productName] || [])) {
                if (rem <= 0) break;
                const d = Math.min(rem, st.rem);
                st.rem = parseFloat((st.rem - d).toFixed(2));
                rem = parseFloat((rem - d).toFixed(2));
            }
        });
    });

    for (const st of Object.values(byProduct).flat()) {
        const local = window.appData.stock.find(s => s.id === st.id);
        if (local && Math.abs(local.remaining_quantity - st.rem) > 0.001) {
            local.remaining_quantity = st.rem;
            await supabaseClient.from('stock').update({ remaining_quantity: st.rem }).eq('id', st.id);
        }
    }
};

// ==================== AİLE GRUPLAMA ALGORİTMASI ====================
window.buildFamiliesRobust = () => {
    const normalize = (s) => (s || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const allMembers = window.appData.members || [];
    const celiacToMemberIds = {};
    
    allMembers.forEach(m => {
        const celiacs = (m.celiacs && Array.isArray(m.celiacs)) ? m.celiacs : [];
        celiacs.forEach(c => {
            const fullName = normalize(`${c.name || ''} ${c.surname || ''}`);
            if (!fullName) return;
            if (!celiacToMemberIds[fullName]) celiacToMemberIds[fullName] = new Set();
            celiacToMemberIds[fullName].add(m.id);
        });
    });

    const adj = {};
    const addEdge = (u, v) => {
        if (!adj[u]) adj[u] = new Set();
        if (!adj[v]) adj[v] = new Set();
        adj[u].add(v);
        adj[v].add(u);
    };

    for (const fullName in celiacToMemberIds) {
        const ids = Array.from(celiacToMemberIds[fullName]);
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                addEdge(ids[i], ids[j]);
            }
            if (!adj[ids[i]]) adj[ids[i]] = new Set();
        }
    }

    allMembers.forEach(m => { if (!adj[m.id]) adj[m.id] = new Set(); });
    
    const visited = new Set();
    const families = [];
    const memberMap = Object.fromEntries(allMembers.map(m => [m.id, m]));

    for (const mId in adj) {
        if (!visited.has(mId)) {
            const component = [];
            const stack = [mId];
            while (stack.length > 0) {
                const node = stack.pop();
                if (!visited.has(node)) {
                    visited.add(node);
                    component.push(node);
                    adj[node].forEach(neighbor => { if (!visited.has(neighbor)) stack.push(neighbor); });
                }
            }
            const groupMembers = component.map(id => memberMap[id]);
            const celiacsInGroup = {};
            groupMembers.forEach(m => {
                (m.celiacs || []).forEach(c => {
                    const fn = normalize(`${c.name || ''} ${c.surname || ''}`);
                    if (fn) celiacsInGroup[fn] = { name: c.name, surname: c.surname, fullName: fn };
                });
            });
            const surnames = groupMembers.map(m => m.last_name || '');
            const mainSurname = surnames.length > 0 
                ? surnames.reduce((a, b) => surnames.filter(v => v === a).length >= surnames.filter(v => v === b).length ? a : b)
                : 'Bilinmeyen';
            
            const allNames = new Set();
            groupMembers.forEach(m => {
                const mn = normalize(`${m.first_name || ''} ${m.last_name || ''}`);
                if (mn) allNames.add(mn);
            });
            Object.values(celiacsInGroup).forEach(c => allNames.add(c.fullName));
            
            const celiacCount = Object.keys(celiacsInGroup).length;
            const displayName = celiacCount > 0 
                ? `${mainSurname} Ailesi (${celiacCount} Çölyaklı)` 
                : `${mainSurname} Ailesi (Çölyaklısız)`;

            families.push({
                id: component[0],
                displayName: displayName,
                surname: mainSurname,
                memberObjects: groupMembers,
                memberIds: component,
                celiacPatients: Object.values(celiacsInGroup),
                allFamilyMembers: Array.from(allNames),
                type: celiacCount > 0 ? 'family' : 'family_no_celiac'
            });
        }
    }
    return { families };
};

// ==================== VERİ YÜKLEME ====================
window.loadAppData = async () => {
    window.showToast('Veriler yükleniyor...', 'info');
    try {
        await window.getCurrentUserRole();
        
        const [membersRes, stockRes, distributionsRes, financialRes, plansRes, articlesRes, authorsRes, businessesRes, heroRes, videosRes, newsRes] = await Promise.all([
            supabaseClient.from('members').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('stock').select('*').order('entry_date', { ascending: false }),
            supabaseClient.from('distributions').select('*').order('distribution_date', { ascending: false }),
            supabaseClient.from('financial').select('*').order('date', { ascending: false }),
            supabaseClient.from('distribution_plans').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('articles').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('authors').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('businesses').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('hero').select('*').order('order', { ascending: true }),
            supabaseClient.from('videos').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('news').select('*').order('pubDate', { ascending: false })
        ]);
        
        if (membersRes.data) window.appData.members = membersRes.data;
        if (stockRes.data) window.appData.stock = stockRes.data;
        if (distributionsRes.data) window.appData.distributions = distributionsRes.data;
        if (financialRes.data) window.appData.financial = financialRes.data;
        if (plansRes.data) window.appData.distributionPlans = plansRes.data;
        if (articlesRes.data) window.appData.articles = articlesRes.data;
        if (authorsRes.data) window.appData.authors = authorsRes.data;
        if (businessesRes.data) window.appData.businesses = businessesRes.data;
        if (heroRes.data) window.appData.hero = heroRes.data;
        if (videosRes.data) window.appData.videos = videosRes.data;
        if (newsRes.data) window.appData.news = newsRes.data;
        
        window.data = window.appData;
        
        console.log('Veriler yüklendi. Rol:', window.currentUserMode, 'Haberler:', window.appData.news?.length);
        
        window.showToast('Veriler yüklendi!', 'success');
        
        if (typeof window.refreshCurrentPage === 'function') {
            window.refreshCurrentPage();
        }
    } catch(e) {
        console.error('Yükleme hatası:', e);
        window.showToast('Yükleme hatası: ' + e.message, 'error');
    }
};

window.loadData = window.loadAppData;

window.refreshCurrentPage = () => {
    const currentPage = document.querySelector('.nav-item.active')?.getAttribute('data-page') || 'dashboard';
    const initFunc = window[`init${currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}`];
    if (typeof initFunc === 'function') {
        initFunc();
    } else if (currentPage === 'dashboard' && typeof window.updateDashboard === 'function') {
        window.updateDashboard();
    } else if (typeof window[`render${currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}`] === 'function') {
        window[`render${currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}`]();
    }
};

// ==================== MODAL KONTROLLERİ ====================
window.closeEditModal = () => {
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.remove('active');
    const saveBtn = document.getElementById('saveEditBtn');
    if (saveBtn) saveBtn.style.display = 'block';
    if (typeof tinymce !== 'undefined') {
        tinymce.remove();
    }
};

window.showDeleteConfirm = (message, onConfirm) => {
    const msgEl = document.getElementById('deleteConfirmMessage');
    const modal = document.getElementById('deleteConfirmModal');
    const yesBtn = document.getElementById('deleteConfirmYesBtn');
    
    if (msgEl) msgEl.textContent = message;
    if (modal) modal.classList.add('active');
    if (yesBtn) {
        yesBtn.onclick = () => {
            if (modal) modal.classList.remove('active');
            if (onConfirm) onConfirm();
        };
    }
};

window.closeDeleteConfirm = () => {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.remove('active');
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.closeEditModal();
        window.closeDeleteConfirm();
    }
});

window.getCurrentUserEmail = async () => {
    if (window.currentUserEmail) return window.currentUserEmail;
    await window.getCurrentUserRole();
    return window.currentUserEmail;
};
