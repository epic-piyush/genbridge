// GenBridge - Orange & Blue Minimalist Light Theme Client Application

const state = {
  user: null,
  token: localStorage.getItem('gb_token') || null,
  campaigns: [],
  currentCategory: 'All',
  discoverTab: 'ongoing', // 'ongoing', 'completed', 'all'
  searchQuery: '',
  selectedCampaign: null,
  settings: {
    platform_name: 'GenBridge',
    currency_symbol: '$',
    platform_commission_percent: '5.0',
    min_investment_global: '10.00',
    announcement_banner: ''
  },
  authMode: 'login' // 'login' or 'signup'
};

// API Helper
async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(endpoint, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Error ${res.status}: ${res.statusText}`);
    }
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const colors = {
    success: 'bg-orange-500 border-orange-600 text-white shadow-orange-500/25',
    error: 'bg-red-500 border-red-600 text-white shadow-red-500/25',
    info: 'bg-blue-600 border-blue-700 text-white shadow-blue-500/25'
  };

  toast.className = `p-4 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 pointer-events-auto ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info'}" class="w-4 h-4"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Router supporting Home, Discover, Deliveries, Promoter, and Admin
const router = {
  routes: ['home', 'discover', 'deliveries', 'promoter', 'admin'],

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  handleRoute() {
    const rawHash = window.location.hash.replace('#/', '') || 'home';
    const cleanHash = rawHash === 'explore' ? 'discover' : rawHash;
    const route = this.routes.includes(cleanHash) ? cleanHash : 'home';
    this.navigate(route, false);
  },

  navigate(route, updateHash = true) {
    if (updateHash) {
      window.location.hash = `#/${route}`;
    }

    // Role checks
    if (route === 'admin' && (!state.user || state.user.role !== 'admin')) {
      showToast('Admin login required to view Governance Suite', 'error');
      auth.openModal('login');
      return;
    }
    if (route === 'promoter' && (!state.user || (state.user.role !== 'promoter' && state.user.role !== 'admin'))) {
      showToast('Promoter account required for Creator Studio', 'info');
      auth.openModal('signup', 'promoter');
      return;
    }
    if (route === 'deliveries' && !state.user) {
      showToast('Please sign in to track your deliveries', 'info');
      auth.openModal('login');
      return;
    }

    // Toggle panels
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));
    const targetPanel = document.getElementById(`view${route.charAt(0).toUpperCase() + route.slice(1)}`);
    if (targetPanel) targetPanel.classList.remove('hidden');

    // Update active tab buttons (Orange active accent)
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const match = tab.getAttribute('data-route') === route;
      tab.classList.toggle('text-orange-600', match);
      tab.classList.toggle('font-bold', match);
      tab.classList.toggle('bg-orange-50', match);
      tab.classList.toggle('border-orange-200', match);
      tab.classList.toggle('text-slate-600', !match);
    });

    // Trigger view-specific loads
    if (route === 'home') app.loadHomeData();
    if (route === 'discover') app.loadCampaigns();
    if (route === 'deliveries') app.loadUserInvestments();
    if (route === 'promoter') promoter.loadPromoterCampaigns();
    if (route === 'admin') admin.init();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Auth Management
const auth = {
  async init() {
    if (state.token) {
      try {
        const data = await api('/api/auth/me');
        state.user = data.user;
      } catch (err) {
        this.logout(false);
      }
    }
    this.renderNav();
  },

  renderNav() {
    const container = document.getElementById('authActions');
    const promoterTab = document.getElementById('promoterTab');
    const adminTab = document.getElementById('adminTab');
    const myDeliveriesTab = document.getElementById('myDeliveriesTab');

    if (!container) return;

    if (state.user) {
      // Role visibility
      if (promoterTab) promoterTab.style.display = (state.user.role === 'promoter' || state.user.role === 'admin') ? 'flex' : 'none';
      if (adminTab) adminTab.style.display = state.user.role === 'admin' ? 'flex' : 'none';
      if (myDeliveriesTab) myDeliveriesTab.style.display = 'flex';

      const roleBadge = state.user.role === 'admin'
        ? '<span class="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-300">Admin</span>'
        : state.user.role === 'promoter'
        ? '<span class="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-300">Promoter</span>'
        : '<span class="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold border border-orange-300">Investor</span>';

      container.innerHTML = `
        <!-- Minimalist Orange & Blue Wallet Pill -->
        <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50/80 border border-orange-200/80 text-xs shadow-sm">
          <i data-lucide="wallet" class="w-3.5 h-3.5 text-orange-500"></i>
          <span class="text-slate-500 text-[11px]">Wallet:</span>
          <span class="font-bold text-orange-600 font-mono">${state.settings.currency_symbol || '$'}${parseFloat(state.user.wallet_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <button onclick="app.quickTopUp()" title="Simulate +$500 Wallet Deposit" class="ml-1 px-1.5 py-0.5 rounded bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold shadow-sm transition">
            +$500
          </button>
        </div>

        <!-- User Profile Pill -->
        <div class="flex items-center gap-2 pl-1">
          <div class="flex items-center gap-2">
            <img src="${state.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" class="w-8 h-8 rounded-xl object-cover ring-2 ring-orange-200" alt="Avatar">
            <div class="hidden xl:block text-left text-xs">
              <div class="font-semibold text-slate-800 leading-tight flex items-center gap-1.5">${state.user.name} ${roleBadge}</div>
              <div class="text-[10px] text-slate-400">${state.user.email}</div>
            </div>
          </div>
          <button onclick="auth.logout()" title="Sign Out" class="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition">
            <i data-lucide="log-out" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    } else {
      if (promoterTab) promoterTab.style.display = 'none';
      if (adminTab) adminTab.style.display = 'none';
      if (myDeliveriesTab) myDeliveriesTab.style.display = 'none';

      container.innerHTML = `
        <button onclick="auth.openModal('login')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition">
          Sign In
        </button>
        <button onclick="auth.openModal('signup', 'user')" class="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 transition">
          Join GenBridge
        </button>
      `;
    }
    lucide.createIcons();
  },

  openModal(mode = 'login', defaultRole = 'user') {
    state.authMode = mode;
    this.setAuthMode(mode);
    if (defaultRole) {
      const radio = document.querySelector(`input[name="authRole"][value="${defaultRole}"]`);
      if (radio) radio.checked = true;
    }
    document.getElementById('authModal').classList.remove('hidden');
    lucide.createIcons();
  },

  setAuthMode(mode) {
    state.authMode = mode;
    const isSignup = mode === 'signup';
    document.getElementById('authSignupFields').classList.toggle('hidden', !isSignup);
    document.getElementById('authModalTitle').innerText = isSignup ? 'Join GenBridge' : 'Sign In to GenBridge';
    document.getElementById('authSubmitBtn').innerText = isSignup ? 'Create Account' : 'Sign In';

    const loginTab = document.getElementById('authToggleLogin');
    const signupTab = document.getElementById('authToggleSignup');
    loginTab.className = isSignup ? 'py-2 rounded-lg text-slate-500 hover:text-slate-800 transition' : 'py-2 rounded-lg bg-orange-500 text-white font-bold transition shadow-sm';
    signupTab.className = isSignup ? 'py-2 rounded-lg bg-orange-500 text-white font-bold transition shadow-sm' : 'py-2 rounded-lg text-slate-500 hover:text-slate-800 transition';
  },

  async handleSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    try {
      if (state.authMode === 'signup') {
        const name = document.getElementById('authName').value.trim();
        const bio = document.getElementById('authBio').value.trim();
        const role = document.querySelector('input[name="authRole"]:checked')?.value || 'user';

        const data = await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, role, bio })
        });
        state.user = data.user;
        state.token = data.token;
        localStorage.setItem('gb_token', data.token);
        showToast(`Welcome to GenBridge, ${data.user.name}!`);
      } else {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        state.user = data.user;
        state.token = data.token;
        localStorage.setItem('gb_token', data.token);
        showToast(`Welcome back, ${data.user.name}!`);
      }

      app.closeModal('authModal');
      this.renderNav();
      app.loadCampaigns();

      if (state.user.role === 'admin') router.navigate('admin');
      else if (state.user.role === 'promoter') router.navigate('promoter');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async fastLogin(email, password) {
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      state.user = data.user;
      state.token = data.token;
      localStorage.setItem('gb_token', data.token);
      showToast(`Logged in as ${data.user.name} (${data.user.role.toUpperCase()})`);
      this.renderNav();
      app.loadCampaigns();

      if (data.user.role === 'admin') router.navigate('admin');
      else if (data.user.role === 'promoter') router.navigate('promoter');
      else router.navigate('discover');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  logout(showNotification = true) {
    state.user = null;
    state.token = null;
    localStorage.removeItem('gb_token');
    this.renderNav();
    if (showNotification) showToast('Logged out successfully');
    router.navigate('home');
  },

  requireAuth(callback) {
    if (!state.user) {
      this.openModal('login');
      return;
    }
    callback();
  },

  requirePromoter(callback) {
    if (!state.user) {
      this.openModal('signup', 'promoter');
      return;
    }
    if (state.user.role !== 'promoter' && state.user.role !== 'admin') {
      showToast('You need a Promoter account to publish an idea pitch', 'info');
      this.openModal('signup', 'promoter');
      return;
    }
    callback();
  }
};

// Main App Logic (Home, Discover, Invest, Tracker)
const app = {
  async init() {
    await this.loadSettings();
    this.setupSearch();
    this.loadHomeData();
  },

  async loadSettings() {
    try {
      const settings = await api('/api/settings');
      state.settings = { ...state.settings, ...settings };

      // Apply announcement
      const text = document.getElementById('announcementText');
      if (text) {
        if (state.settings.announcement_banner) {
          text.innerHTML = `
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-orange-500 shrink-0"></i>
            <span class="truncate">${state.settings.announcement_banner}</span>
          `;
          lucide.createIcons();
        }
      }
    } catch (err) {
      console.warn('Could not load settings', err);
    }
  },

  setupSearch() {
    const input = document.getElementById('globalSearchInput');
    if (!input) return;
    let debounce;
    input.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        if (window.location.hash !== '#/discover') {
          router.navigate('discover');
        } else {
          this.loadCampaigns();
        }
      }, 300);
    });

    window.addEventListener('keydown', (e) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  },

  quickTopUp() {
    if (!state.user) {
      auth.openModal('login');
      return;
    }
    state.user.wallet_balance += 500;
    auth.renderNav();
    showToast('+$500.00 deposited into your demo wallet!');
  },

  setDiscoverTab(tab) {
    state.discoverTab = tab;
    document.querySelectorAll('.discover-tab-btn').forEach(btn => {
      const match = btn.getAttribute('data-tab') === tab;
      btn.className = match
        ? 'discover-tab-btn active px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white shadow-md shadow-orange-500/20 transition'
        : 'discover-tab-btn px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition';
    });
    this.loadCampaigns();
  },

  setCategory(category) {
    state.currentCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => {
      const match = btn.getAttribute('data-category') === category;
      btn.className = match
        ? 'category-btn active px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap bg-orange-500 text-white border border-orange-500 transition shadow-md shadow-orange-500/15'
        : 'category-btn px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap bg-white text-slate-600 border border-slate-200 hover:border-orange-300 hover:text-slate-900 transition';
    });
    this.loadCampaigns();
  },

  async loadHomeData() {
    try {
      const stats = await api('/api/admin/overview').catch(() => null);
      const sym = state.settings.currency_symbol || '$';
      if (stats) {
        document.getElementById('homeStatVolume').innerText = `${sym}${stats.totalVolume.toLocaleString()}`;
        document.getElementById('homeStatCampaigns').innerText = stats.totalCampaigns;
        document.getElementById('homeStatInvestments').innerText = stats.totalInvestments;
        document.getElementById('homeStatBackers').innerText = stats.totalUsers;
      }

      // Load preview of top active campaigns for home
      const campaigns = await api('/api/campaigns?status=active');
      const container = document.getElementById('homeFeaturedPreview');
      if (container && campaigns.length > 0) {
        const top2 = campaigns.slice(0, 2);
        container.innerHTML = top2.map(c => `
          <div class="glass-panel p-5 rounded-3xl border border-slate-200/90 bg-white flex items-center justify-between gap-4 hover-lift shadow-sm">
            <div class="flex items-center gap-4">
              <img src="${c.image_url}" class="w-16 h-16 rounded-2xl object-cover ring-2 ring-orange-200" alt="${c.title}">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-orange-600">${c.category}</span>
                <h4 class="text-sm font-bold text-slate-900">${c.title}</h4>
                <p class="text-xs text-slate-500 line-clamp-1">${c.tagline}</p>
                <div class="text-xs font-mono font-bold text-orange-600 mt-1">${sym}${c.raised_amount.toLocaleString()} / ${sym}${c.target_amount.toLocaleString()} funded</div>
              </div>
            </div>
            <button onclick="router.navigate('discover')" class="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shadow-sm">
              <span>View</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `).join('');
        lucide.createIcons();
      }
    } catch (e) {
      console.warn(e);
    }
  },

  async loadCampaigns() {
    const grid = document.getElementById('discoverCampaignsGrid');
    const badge = document.getElementById('campaignCountBadge');
    if (!grid) return;

    try {
      let statusQuery = 'active';
      if (state.discoverTab === 'completed') statusQuery = 'funded';
      if (state.discoverTab === 'all') statusQuery = 'all';

      let url = `/api/campaigns?status=${statusQuery}`;
      if (state.currentCategory && state.currentCategory !== 'All') {
        url += `&category=${encodeURIComponent(state.currentCategory)}`;
      }
      if (state.searchQuery) {
        url += `&search=${encodeURIComponent(state.searchQuery)}`;
      }

      const campaigns = await api(url);
      state.campaigns = campaigns;

      const label = state.discoverTab === 'completed' ? 'completed' : state.discoverTab === 'ongoing' ? 'ongoing' : 'total';
      if (badge) badge.innerText = `${campaigns.length} ${label} ${campaigns.length === 1 ? 'campaign' : 'campaigns'}`;

      if (campaigns.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full py-16 text-center glass-panel rounded-3xl border border-slate-200 bg-white p-8 space-y-3">
            <i data-lucide="inbox" class="w-12 h-12 text-slate-400 mx-auto"></i>
            <h3 class="text-base font-bold text-slate-800">No campaigns found in this view</h3>
            <p class="text-xs text-slate-500">Try switching categories, clearing search filters, or exploring other tabs.</p>
            <button onclick="auth.requirePromoter(() => promoter.openCreateModal())" class="mt-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-md shadow-orange-500/20">
              Create a Pitch
            </button>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      const sym = state.settings.currency_symbol || '$';

      grid.innerHTML = campaigns.map(c => {
        const isFunded = c.status === 'funded';
        const percent = Math.min(100, Math.round((c.raised_amount / c.target_amount) * 100));
        const badgeClass = c.category.includes('YouTube') ? 'badge-youtube'
                         : c.category.includes('Tech') ? 'badge-tech'
                         : c.category.includes('Local') ? 'badge-local' : 'badge-green';

        return `
          <div class="glass-panel rounded-3xl border ${isFunded ? 'border-blue-200 bg-white' : 'border-slate-200/90 bg-white'} overflow-hidden hover-lift flex flex-col justify-between group shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all">
            <div>
              <!-- Cover Image & Badges -->
              <div class="relative h-52 w-full overflow-hidden bg-slate-100 cursor-pointer" onclick="app.openDetailModal(${c.id})">
                <img src="${c.image_url || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80'}" alt="${c.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                
                <!-- Category Badge -->
                <div class="absolute top-3.5 left-3.5">
                  <span class="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-md ${badgeClass}">
                    ${c.category}
                  </span>
                </div>

                <!-- Status Pill -->
                <div class="absolute top-3.5 right-3.5 flex items-center gap-1.5 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold ${isFunded ? 'bg-blue-100/90 text-blue-800 border border-blue-200' : 'bg-orange-100/90 text-orange-800 border border-orange-200'}">
                  <span class="w-1.5 h-1.5 rounded-full ${isFunded ? 'bg-blue-600' : 'bg-orange-500 animate-pulse'}"></span>
                  <span>${isFunded ? 'COMPLETED' : 'ONGOING'}</span>
                </div>

                <!-- Location tag -->
                <div class="absolute bottom-3 left-3 text-[11px] text-white flex items-center gap-1 font-medium drop-shadow-sm">
                  <i data-lucide="map-pin" class="w-3.5 h-3.5 text-orange-400"></i>
                  <span>${c.location || 'Remote'}</span>
                </div>
              </div>

              <!-- Card Body -->
              <div class="p-5 space-y-3">
                <!-- Creator Bio Header -->
                <div class="flex items-center gap-2.5">
                  <img src="${c.promoter_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" class="w-7 h-7 rounded-xl object-cover ring-2 ring-orange-200" alt="${c.promoter_name}">
                  <span class="text-xs font-semibold text-slate-700 truncate">${c.promoter_name}</span>
                </div>

                <!-- Pitch Title & Tagline -->
                <h3 class="text-base font-bold text-slate-900 hover:text-orange-600 transition cursor-pointer leading-snug line-clamp-1" onclick="app.openDetailModal(${c.id})">
                  ${c.title}
                </h3>
                <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  ${c.tagline || c.description}
                </p>

                <!-- Funding Progress Bar (Orange & Blue Accent) -->
                <div class="space-y-1.5 pt-2">
                  <div class="flex justify-between text-xs font-semibold">
                    <span class="text-orange-600 font-bold">${sym}${c.raised_amount.toLocaleString()} <span class="text-[10px] text-slate-400 font-normal">raised</span></span>
                    <span class="text-slate-600 font-mono">${percent}%</span>
                  </div>
                  <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div class="h-full ${isFunded ? 'bg-gradient-to-r from-blue-600 to-teal-500' : 'bg-gradient-to-r from-orange-500 to-amber-500 cyber-progress'} rounded-full transition-all duration-700" style="width: ${percent}%"></div>
                  </div>
                  <div class="flex justify-between text-[10px] text-slate-400">
                    <span>Goal: ${sym}${c.target_amount.toLocaleString()}</span>
                    <span>${isFunded ? 'Goal Achieved 100%' : `Min: ${sym}${c.min_investment}`}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card Action Footer -->
            <div class="p-5 pt-0 flex items-center gap-2">
              <button onclick="app.openDetailModal(${c.id})" class="flex-1 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-slate-200">
                <i data-lucide="file-text" class="w-3.5 h-3.5"></i> ${isFunded ? 'Proof & Report' : 'Story'}
              </button>
              ${isFunded ? `
                <button onclick="app.openDetailModal(${c.id})" class="flex-1 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center justify-center gap-1.5">
                  <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-blue-600"></i> Delivered
                </button>
              ` : `
                <button onclick="app.openInvestModal(${c.id})" class="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-1.5 hover:scale-[1.02]">
                  <i data-lucide="zap" class="w-3.5 h-3.5"></i> Order Delivery
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');

      lucide.createIcons();
    } catch (err) {
      grid.innerHTML = `<div class="col-span-full text-center text-red-500 text-xs py-8">Failed to load campaigns: ${err.message}</div>`;
    }
  },

  async openDetailModal(id) {
    try {
      const campaign = await api(`/api/campaigns/${id}`);
      state.selectedCampaign = campaign;
      const modal = document.getElementById('detailModal');
      const content = document.getElementById('detailModalContent');
      const sym = state.settings.currency_symbol || '$';
      const isFunded = campaign.status === 'funded';

      content.innerHTML = `
        <div class="relative rounded-2xl overflow-hidden h-64 bg-slate-100">
          <img src="${campaign.image_url}" class="w-full h-full object-cover" alt="${campaign.title}">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
          <div class="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-orange-100/90 text-orange-800 border border-orange-200">
                ${campaign.category}
              </span>
              <h2 class="text-xl sm:text-2xl font-bold text-white mt-2">${campaign.title}</h2>
              <p class="text-xs text-slate-200">${campaign.tagline}</p>
            </div>
            ${!isFunded ? `
              <button onclick="app.openInvestModal(${campaign.id})" class="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/30 flex items-center gap-1.5 transition">
                <i data-lucide="zap" class="w-4 h-4"></i> Back This Idea
              </button>
            ` : `
              <span class="px-4 py-2 rounded-xl bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs flex items-center gap-1.5">
                <i data-lucide="check-check" class="w-4 h-4 text-blue-600"></i> Fully Funded & Delivered
              </span>
            `}
          </div>
        </div>

        <!-- Promoter Info -->
        <div class="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <img src="${campaign.promoter_avatar}" class="w-12 h-12 rounded-2xl object-cover ring-2 ring-orange-200" alt="${campaign.promoter_name}">
          <div>
            <div class="font-bold text-sm text-slate-900 flex items-center gap-2">${campaign.promoter_name} <span class="text-[10px] text-slate-400">• Promoter</span></div>
            <div class="text-xs text-slate-500">${campaign.promoter_bio || 'Idea creator and founder.'}</div>
          </div>
        </div>

        <!-- Pitch Story -->
        <div class="space-y-2">
          <h4 class="text-sm font-bold uppercase tracking-wider text-orange-600">The Vision & Pitch</h4>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">${campaign.description}</p>
        </div>

        <!-- Perks / Rewards -->
        ${campaign.perks_description ? `
          <div class="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
            <h4 class="text-xs font-bold text-blue-700 flex items-center gap-1.5">
              <i data-lucide="gift" class="w-4 h-4 text-blue-600"></i> Generational Backer Rewards
            </h4>
            <p class="text-xs text-slate-600">${campaign.perks_description}</p>
          </div>
        ` : ''}

        <!-- Roadmap & Milestones -->
        <div class="space-y-3">
          <h4 class="text-sm font-bold uppercase tracking-wider text-blue-600">Milestone Roadmap & Verified Proofs</h4>
          <div class="space-y-2">
            ${(campaign.milestones || []).map(m => `
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div class="font-bold text-slate-800 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${m.status === 'completed' ? 'bg-blue-600' : m.status === 'in_progress' ? 'bg-orange-500 animate-pulse' : 'bg-slate-300'}"></span>
                    ${m.title}
                    <span class="text-[10px] text-slate-400">(${m.target_percentage}%)</span>
                  </div>
                  <p class="text-slate-500 mt-1">${m.description || ''}</p>
                  ${m.proof_note ? `
                    <div class="mt-2 p-2 rounded-lg bg-white border border-slate-200 text-blue-700 text-[11px] flex items-center gap-2">
                      <i data-lucide="check-circle" class="w-3.5 h-3.5 text-blue-600"></i>
                      <span>Verified Proof: ${m.proof_note}</span>
                    </div>
                  ` : ''}
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.status === 'completed' ? 'bg-blue-100 text-blue-700 border border-blue-200' : m.status === 'in_progress' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-200 text-slate-500'}">
                  ${m.status.replace('_', ' ')}
                </span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Backers Advice Feed -->
        <div class="space-y-3">
          <h4 class="text-sm font-bold uppercase tracking-wider text-orange-600">Backer Wisdom & Guidance</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            ${(campaign.recent_backers || []).filter(b => b.mentor_note).length === 0 ? `
              <p class="text-xs text-slate-400 italic">No mentor advice left yet. Be the first backer to share guidance!</p>
            ` : (campaign.recent_backers || []).filter(b => b.mentor_note).map(b => `
              <div class="p-3 rounded-xl bg-orange-50/50 border border-orange-100 text-xs space-y-1">
                <div class="flex items-center justify-between text-slate-500">
                  <span class="font-bold text-slate-800">${b.user_name} (Invested ${sym}${b.amount})</span>
                  <span class="text-[10px]">${new Date(b.created_at).toLocaleDateString()}</span>
                </div>
                <p class="text-orange-950/90 italic">"${b.mentor_note}"</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      lucide.createIcons();
    } catch (err) {
      showToast('Could not load campaign: ' + err.message, 'error');
    }
  },

  openInvestModal(id) {
    auth.requireAuth(() => {
      const campaign = state.campaigns.find(c => c.id === id) || state.selectedCampaign;
      if (!campaign) return;
      state.selectedCampaign = campaign;

      const sym = state.settings.currency_symbol || '$';
      document.getElementById('investTargetSummary').innerHTML = `
        <img src="${campaign.image_url}" class="w-12 h-12 rounded-xl object-cover ring-1 ring-orange-200" alt="${campaign.title}">
        <div class="truncate">
          <div class="font-bold text-slate-900 text-sm truncate">${campaign.title}</div>
          <div class="text-xs text-slate-500">By ${campaign.promoter_name} • Min: ${sym}${campaign.min_investment}</div>
        </div>
      `;

      this.setInvestAmount(Math.max(50, campaign.min_investment));
      document.getElementById('investModal').classList.remove('hidden');
      lucide.createIcons();
    });
  },

  setInvestAmount(amount) {
    const input = document.getElementById('investAmountInput');
    if (input) {
      input.value = amount;
      this.recalculateInvestment(amount);
    }
  },

  recalculateInvestment(amount) {
    const num = parseFloat(amount) || 0;
    const feePercent = parseFloat(state.settings.platform_commission_percent || '5.0');
    const fee = (num * feePercent) / 100;
    const net = num - fee;
    const sym = state.settings.currency_symbol || '$';

    document.getElementById('investFeePercent').innerText = feePercent;
    document.getElementById('investPlatformFee').innerText = `${sym}${fee.toFixed(2)}`;
    document.getElementById('investNetToCreator').innerText = `${sym}${net.toFixed(2)}`;
    document.getElementById('investTotalDebit').innerText = `${sym}${num.toFixed(2)}`;
  },

  async submitInvestment(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('investAmountInput').value);
    const mentorNote = document.getElementById('investMentorNote').value.trim();

    if (!amount || amount <= 0) {
      showToast('Please enter a valid investment amount', 'error');
      return;
    }

    try {
      const btn = document.getElementById('confirmInvestBtn');
      btn.disabled = true;
      btn.innerText = 'Delivering Micro-Capital...';

      const order = await api('/api/investments', {
        method: 'POST',
        body: JSON.stringify({
          campaign_id: state.selectedCampaign.id,
          amount,
          mentor_note: mentorNote
        })
      });

      state.user.wallet_balance -= amount;
      auth.renderNav();

      this.closeModal('investModal');
      showToast(`🎉 Order ${order.order_number} confirmed! Capital delivered to ${order.promoter_name}.`);

      this.openTrackerModal(order);
      this.loadCampaigns();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      const btn = document.getElementById('confirmInvestBtn');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="zap" class="w-4 h-4"></i> Confirm & Deliver Investment';
        lucide.createIcons();
      }
    }
  },

  async loadUserInvestments() {
    const list = document.getElementById('myInvestmentsList');
    if (!list) return;

    try {
      const orders = await api('/api/investments/my');
      const sym = state.settings.currency_symbol || '$';

      if (orders.length === 0) {
        list.innerHTML = `
          <div class="py-16 text-center glass-panel rounded-3xl border border-slate-200 bg-white p-8 space-y-3">
            <i data-lucide="package-search" class="w-12 h-12 text-slate-400 mx-auto"></i>
            <h3 class="text-base font-bold text-slate-800">No active investment deliveries yet</h3>
            <p class="text-xs text-slate-500">Discover inspiring YouTube creators and young founders to back today.</p>
            <button onclick="router.navigate('discover')" class="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-md shadow-orange-500/20">
              Explore Discover Page
            </button>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      list.innerHTML = orders.map(ord => `
        <div class="glass-panel p-5 rounded-3xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition">
          <div class="flex items-center gap-4">
            <img src="${ord.campaign_image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=300&q=80'}" class="w-16 h-16 rounded-2xl object-cover ring-2 ring-orange-200" alt="${ord.campaign_title}">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold text-blue-600">${ord.order_number}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-700 border border-orange-200">
                  ${ord.status}
                </span>
              </div>
              <h3 class="text-base font-bold text-slate-900 mt-1">${ord.campaign_title}</h3>
              <p class="text-xs text-slate-500">Delivered to: ${ord.promoter_name} • Pledged on ${new Date(ord.created_at).toLocaleDateString()}</p>
              ${ord.mentor_note ? `<p class="text-xs text-orange-700/90 italic mt-1 bg-orange-50 p-1.5 rounded-lg border border-orange-100">Wisdom: "${ord.mentor_note}"</p>` : ''}
            </div>
          </div>

          <div class="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
            <div class="text-right">
              <div class="text-lg font-bold text-orange-600 font-mono">${sym}${ord.amount.toLocaleString()}</div>
              <div class="text-[10px] text-slate-400">Fee: ${sym}${ord.platform_fee}</div>
            </div>
            <button onclick="app.openTrackerModal(${JSON.stringify(ord).replace(/"/g, '&quot;')})" class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/20">
              <i data-lucide="navigation" class="w-3.5 h-3.5"></i> Track Progress
            </button>
          </div>
        </div>
      `).join('');

      lucide.createIcons();
    } catch (err) {
      list.innerHTML = `<div class="text-center text-red-500 text-xs py-8">Failed to load deliveries: ${err.message}</div>`;
    }
  },

  openTrackerModal(order) {
    const modal = document.getElementById('trackerModal');
    document.getElementById('trackOrderTitle').innerText = `${order.campaign_title} (${order.order_number})`;

    // Load campaign milestones
    api(`/api/campaigns/${order.campaign_id}`).then(c => {
      const container = document.getElementById('trackMilestonesContainer');
      if (!c.milestones || c.milestones.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-400">No milestones registered yet.</div>`;
        return;
      }

      container.innerHTML = c.milestones.map(m => `
        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${m.status === 'completed' ? 'bg-blue-600' : 'bg-slate-300'}"></span>
            <span class="font-bold text-slate-800">${m.title}</span>
            <span class="text-[10px] text-slate-500">${m.proof_note ? `• ${m.proof_note}` : ''}</span>
          </div>
          <span class="text-[10px] font-bold uppercase ${m.status === 'completed' ? 'text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200' : 'text-slate-400'}">
            ${m.status}
          </span>
        </div>
      `).join('');
    });

    modal.classList.remove('hidden');
    lucide.createIcons();
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }
};

// Promoter Studio Logic
const promoter = {
  openCreateModal() {
    auth.requirePromoter(() => {
      document.getElementById('createPitchModal').classList.remove('hidden');
      lucide.createIcons();
    });
  },

  async loadPromoterCampaigns() {
    const container = document.getElementById('promoterCampaignsList');
    if (!container || !state.user) return;

    try {
      const campaigns = await api(`/api/campaigns?promoterId=${state.user.id}&status=all`);
      const sym = state.settings.currency_symbol || '$';

      if (campaigns.length === 0) {
        container.innerHTML = `
          <div class="col-span-full py-12 text-center glass-panel rounded-3xl border border-slate-200 bg-white p-8 space-y-3 shadow-sm">
            <i data-lucide="film" class="w-12 h-12 text-slate-400 mx-auto"></i>
            <h3 class="text-base font-bold text-slate-800">You have no active pitches</h3>
            <p class="text-xs text-slate-500">Ready to raise funds for your YouTube rig or prototype? Create your first pitch!</p>
            <button onclick="promoter.openCreateModal()" class="px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/20">
              Create Pitch
            </button>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      container.innerHTML = campaigns.map(c => `
        <div class="glass-panel p-5 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-sm hover:shadow-md transition">
          <div class="flex items-start gap-4">
            <img src="${c.image_url}" class="w-20 h-20 rounded-2xl object-cover ring-2 ring-orange-200" alt="${c.title}">
            <div class="flex-1 truncate">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-100 text-blue-700 border border-blue-200">
                ${c.category}
              </span>
              <h3 class="text-base font-bold text-slate-900 mt-1 truncate">${c.title}</h3>
              <p class="text-xs text-slate-500 truncate">${c.tagline}</p>
              <div class="text-xs font-semibold text-orange-600 mt-1">
                ${sym}${c.raised_amount.toLocaleString()} / ${sym}${c.target_amount.toLocaleString()} raised (${c.progress_percentage}%)
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span class="text-slate-500">Status: <strong class="text-slate-900 uppercase font-bold">${c.status}</strong></span>
            <div class="flex gap-2">
              <button onclick="promoter.addMilestonePrompt(${c.id})" class="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition flex items-center gap-1 border border-slate-200">
                <i data-lucide="plus" class="w-3.5 h-3.5 text-blue-600"></i> Update Milestone
              </button>
              <button onclick="app.openDetailModal(${c.id})" class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition border border-blue-200">
                View Pitch
              </button>
            </div>
          </div>
        </div>
      `).join('');

      lucide.createIcons();
    } catch (err) {
      container.innerHTML = `<div class="text-red-500 text-xs">${err.message}</div>`;
    }
  },

  async submitPitch(e) {
    e.preventDefault();
    const title = document.getElementById('pitchTitle').value.trim();
    const tagline = document.getElementById('pitchTagline').value.trim();
    const category = document.getElementById('pitchCategory').value;
    const target_amount = parseFloat(document.getElementById('pitchTarget').value);
    const description = document.getElementById('pitchDescription').value.trim();
    const image_url = document.getElementById('pitchImage').value.trim();
    const video_url = document.getElementById('pitchVideo').value.trim();
    const perks_description = document.getElementById('pitchPerks').value.trim();

    try {
      await api('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title,
          tagline,
          category,
          target_amount,
          description,
          image_url,
          video_url,
          perks_description
        })
      });

      app.closeModal('createPitchModal');
      showToast('🎉 Pitch published successfully! Backers can now discover and invest in your project.');
      this.loadPromoterCampaigns();
      app.loadCampaigns();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async addMilestonePrompt(campaignId) {
    const title = prompt('Enter Milestone Title (e.g., Equipment Procured):');
    if (!title) return;
    const proofNote = prompt('Proof or Receipt Summary (e.g., Sony FX3 invoice #1209 verified):');
    if (!proofNote) return;

    try {
      await api('/api/milestones', {
        method: 'POST',
        body: JSON.stringify({
          campaign_id: campaignId,
          title,
          description: proofNote,
          target_percentage: 50,
          proof_note: proofNote,
          status: 'completed'
        })
      });
      showToast('Milestone update posted! Backers notified.');
      this.loadPromoterCampaigns();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

// Private Admin Panel Logic (Complete System Alterations)
const admin = {
  currentTab: 'overview',

  init() {
    this.refreshAll();
  },

  refreshAll() {
    this.loadStats();
    this.loadCampaigns();
    this.loadUsers();
    this.loadInvestments();
    this.loadSettings();
  },

  setTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.admin-tab').forEach(b => {
      const match = b.getAttribute('data-admin-tab') === tab;
      b.className = match
        ? 'admin-tab active px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white shadow-sm transition'
        : 'admin-tab px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 hover:text-slate-900 border border-slate-200 transition';
    });

    document.querySelectorAll('.admin-subtab').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`adminTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (target) target.classList.remove('hidden');
    lucide.createIcons();
  },

  async loadStats() {
    try {
      const stats = await api('/api/admin/overview');
      const sym = state.settings.currency_symbol || '$';

      document.getElementById('admTotalVolume').innerText = `${sym}${stats.totalVolume.toLocaleString()}`;
      document.getElementById('admPlatformRev').innerText = `${sym}${stats.totalPlatformRevenue.toLocaleString()}`;
      document.getElementById('admTotalCamps').innerText = stats.totalCampaigns;
      document.getElementById('admActiveCamps').innerText = stats.activeCampaigns;
      document.getElementById('admTotalUsers').innerText = stats.totalUsers;
      document.getElementById('admPromoterCount').innerText = stats.promotersCount;
      document.getElementById('admInvestorCount').innerText = stats.investorsCount;

      document.getElementById('adminCampCount').innerText = stats.totalCampaigns;
      document.getElementById('adminUserCount').innerText = stats.totalUsers;
      document.getElementById('adminOrderCount').innerText = stats.totalInvestments;
    } catch (err) {
      console.error(err);
    }
  },

  async loadCampaigns() {
    const table = document.getElementById('adminCampaignsTable');
    if (!table) return;

    try {
      const campaigns = await api('/api/admin/campaigns');
      const sym = state.settings.currency_symbol || '$';

      table.innerHTML = campaigns.map(c => `
        <tr class="hover:bg-orange-50/30 transition">
          <td class="p-3">
            <div class="font-bold text-slate-900 flex items-center gap-2">${c.title}</div>
            <div class="text-[10px] text-slate-400">ID: #${c.id}</div>
          </td>
          <td class="p-3 text-slate-700 font-medium">${c.promoter_name}</td>
          <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">${c.category}</span></td>
          <td class="p-3 font-semibold text-orange-600 font-mono">${sym}${c.raised_amount.toLocaleString()} / ${sym}${c.target_amount.toLocaleString()}</td>
          <td class="p-3">
            <select onchange="admin.changeCampaignStatus(${c.id}, this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800">
              <option value="active" ${c.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="pending" ${c.status === 'pending' ? 'selected' : ''}>Pending Approval</option>
              <option value="funded" ${c.status === 'funded' ? 'selected' : ''}>Funded</option>
              <option value="paused" ${c.status === 'paused' ? 'selected' : ''}>Paused</option>
              <option value="rejected" ${c.status === 'rejected' ? 'selected' : ''}>Rejected</option>
            </select>
          </td>
          <td class="p-3">
            <button onclick="admin.toggleFeatured(${c.id}, ${c.is_featured ? 0 : 1})" class="p-1.5 rounded-lg ${c.is_featured ? 'text-amber-500 bg-amber-50 border border-amber-200' : 'text-slate-400 hover:text-slate-600'} transition">
              <i data-lucide="star" class="w-4 h-4 ${c.is_featured ? 'fill-amber-400' : ''}"></i>
            </button>
          </td>
          <td class="p-3 text-right">
            <button onclick="admin.deleteCampaign(${c.id})" title="Delete" class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `).join('');

      lucide.createIcons();
    } catch (err) {
      table.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500">${err.message}</td></tr>`;
    }
  },

  async changeCampaignStatus(id, newStatus) {
    try {
      await api(`/api/admin/campaigns/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      showToast(`Campaign #${id} status altered to '${newStatus}'`);
      this.refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async toggleFeatured(id, featured) {
    try {
      await api(`/api/admin/campaigns/${id}/featured`, {
        method: 'PUT',
        body: JSON.stringify({ is_featured: featured })
      });
      showToast(`Campaign #${id} featured state updated`);
      this.refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async deleteCampaign(id) {
    if (!confirm(`Are you sure you want to delete campaign #${id}?`)) return;
    try {
      await api(`/api/campaigns/${id}`, { method: 'DELETE' });
      showToast(`Campaign #${id} deleted by admin`);
      this.refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async loadUsers() {
    const table = document.getElementById('adminUsersTable');
    if (!table) return;

    try {
      const users = await api('/api/admin/users');
      const sym = state.settings.currency_symbol || '$';

      table.innerHTML = users.map(u => `
        <tr class="hover:bg-orange-50/30 transition">
          <td class="p-3">
            <div class="font-bold text-slate-900">${u.name}</div>
            <div class="text-[10px] text-slate-400">${u.email}</div>
          </td>
          <td class="p-3">
            <select onchange="admin.changeUserRole(${u.id}, this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>Investor</option>
              <option value="promoter" ${u.role === 'promoter' ? 'selected' : ''}>Promoter</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
          <td class="p-3">
            <select onchange="admin.changeUserStatus(${u.id}, this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800">
              <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>Suspended</option>
            </select>
          </td>
          <td class="p-3">
            <div class="flex items-center gap-1">
              <span class="font-bold text-orange-600 font-mono">${sym}${u.wallet_balance.toLocaleString()}</span>
              <button onclick="admin.adjustWallet(${u.id}, ${u.wallet_balance})" class="text-slate-400 hover:text-slate-700" title="Adjust Balance">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
          <td class="p-3 text-[10px] text-slate-500">
            ${u.investments_count || 0} investments • ${u.campaigns_count || 0} campaigns
          </td>
          <td class="p-3 text-right">
            ${u.id !== state.user.id ? `
              <button onclick="admin.deleteUser(${u.id})" title="Delete" class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition">
                <i data-lucide="user-x" class="w-4 h-4"></i>
              </button>
            ` : '<span class="text-[10px] text-orange-600 font-bold italic">Self</span>'}
          </td>
        </tr>
      `).join('');

      lucide.createIcons();
    } catch (err) {
      table.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">${err.message}</td></tr>`;
    }
  },

  async changeUserRole(id, newRole) {
    try {
      await api(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      showToast(`User #${id} role altered to '${newRole}'`);
      this.refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async changeUserStatus(id, newStatus) {
    try {
      await api(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      showToast(`User #${id} status altered to '${newStatus}'`);
      this.refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async adjustWallet(id, currentBalance) {
    const newBal = prompt('Enter new wallet balance:', currentBalance);
    if (newBal === null) return;
    try {
      await api(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ wallet_balance: parseFloat(newBal) })
      });
      showToast(`User #${id} balance updated to $${newBal}`);
      this.refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async deleteUser(id) {
    if (!confirm(`Are you sure you want to delete user #${id}?`)) return;
    try {
      await api(`/api/admin/users/${id}`, { method: 'DELETE' });
      showToast(`User #${id} deleted`);
      this.refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async loadInvestments() {
    const table = document.getElementById('adminInvestmentsTable');
    if (!table) return;

    try {
      const orders = await api('/api/admin/investments');
      const sym = state.settings.currency_symbol || '$';

      table.innerHTML = orders.map(o => `
        <tr class="hover:bg-orange-50/30 transition">
          <td class="p-3 font-mono font-bold text-blue-600">${o.order_number}</td>
          <td class="p-3 text-slate-800 font-medium">${o.investor_name}</td>
          <td class="p-3 text-slate-600">${o.campaign_title}</td>
          <td class="p-3 font-bold text-orange-600 font-mono">${sym}${o.amount.toLocaleString()}</td>
          <td class="p-3 text-slate-500 font-mono">${sym}${o.platform_fee}</td>
          <td class="p-3">
            <select onchange="admin.changeOrderStatus(${o.id}, this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800">
              <option value="placed" ${o.status === 'placed' ? 'selected' : ''}>Placed</option>
              <option value="disbursed" ${o.status === 'disbursed' ? 'selected' : ''}>Disbursed</option>
              <option value="milestone_in_progress" ${o.status === 'milestone_in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
            </select>
          </td>
          <td class="p-3 text-xs text-slate-500 italic max-w-xs truncate">${o.mentor_note || '—'}</td>
          <td class="p-3 text-right">
            <button onclick="app.openTrackerModal(${JSON.stringify(o).replace(/"/g, '&quot;')})" class="text-blue-600 hover:text-blue-800 text-xs font-semibold">
              Track
            </button>
          </td>
        </tr>
      `).join('');

      lucide.createIcons();
    } catch (err) {
      table.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-red-500">${err.message}</td></tr>`;
    }
  },

  async changeOrderStatus(id, newStatus) {
    try {
      await api(`/api/admin/investments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      showToast(`Order #${id} delivery stage set to '${newStatus}'`);
      this.refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async loadSettings() {
    try {
      const list = await api('/api/admin/settings');
      const map = {};
      list.forEach(i => map[i.setting_key] = i.setting_value);

      document.getElementById('cfgPlatformName').value = map['platform_name'] || 'GenBridge';
      document.getElementById('cfgCurrencySymbol').value = map['currency_symbol'] || '$';
      document.getElementById('cfgCommission').value = map['platform_commission_percent'] || '5.0';
      document.getElementById('cfgMinInvest').value = map['min_investment_global'] || '10.00';
      document.getElementById('cfgBanner').value = map['announcement_banner'] || '';
      document.getElementById('cfgAllowRegs').checked = map['allow_new_registrations'] === 'true';
    } catch (err) {
      console.error(err);
    }
  },

  async saveSettings(e) {
    e.preventDefault();
    const payload = {
      platform_name: document.getElementById('cfgPlatformName').value.trim(),
      currency_symbol: document.getElementById('cfgCurrencySymbol').value.trim(),
      platform_commission_percent: document.getElementById('cfgCommission').value,
      min_investment_global: document.getElementById('cfgMinInvest').value,
      announcement_banner: document.getElementById('cfgBanner').value.trim(),
      allow_new_registrations: document.getElementById('cfgAllowRegs').checked ? 'true' : 'false'
    };

    try {
      await api('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Global platform settings saved and altered across the app!');
      await app.loadSettings();
      this.refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

// Global Initialization
window.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  await app.init();
  router.init();
  lucide.createIcons();
});
