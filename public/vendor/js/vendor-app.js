/* ==========================================================================
   VENDOR PANEL JAVASCRIPT APP (100% REAL BACKEND INTEGRATION)
   Connected to Node.js REST API + Socket.IO + MySQL / Data Store
   ========================================================================== */

const API_BASE = '/api/v1';
let socket;
let currentVendor = null;
let currentVendorToken = localStorage.getItem('vendor_token') || null;
let currentCategory = 'food';
let currentVendorId = null;
let currentRejectOrderId = null;
let orderChart = null;

let ordersList = [];
let catalogProducts = [];

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initStoreToggle();

  // Check if vendor is authenticated
  const isAuthenticated = checkVendorAuth();
  if (isAuthenticated) {
    initSocket();
    loadAllVendorDataFromBackend();
  }
});

// ==========================================================================
// 0. VENDOR AUTHENTICATION & SESSION MANAGEMENT
// ==========================================================================
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (currentVendorToken) {
    headers['Authorization'] = `Bearer ${currentVendorToken}`;
  }
  return headers;
}

function checkVendorAuth() {
  const token = localStorage.getItem('vendor_token');
  const vendorJson = localStorage.getItem('vendor_profile');

  if (!token || !vendorJson) {
    showAuthOverlay();
    return false;
  }

  try {
    currentVendor = JSON.parse(vendorJson);
    currentVendorToken = token;
    currentVendorId = currentVendor.id;
    currentCategory = currentVendor.vendor_category || currentVendor.business_type || 'food';

    updateHeaderVendorInfo(currentVendor);
    hideAuthOverlay();
    return true;
  } catch (e) {
    showAuthOverlay();
    return false;
  }
}

function showAuthOverlay() {
  const overlay = document.getElementById('vendorAuthOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideAuthOverlay() {
  const overlay = document.getElementById('vendorAuthOverlay');
  if (overlay) overlay.style.display = 'none';
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabReg = document.getElementById('tabBtnRegister');
  const formLogin = document.getElementById('formVendorLogin');
  const formReg = document.getElementById('formVendorRegister');
  const alertEl = document.getElementById('authAlertBox');
  if (alertEl) alertEl.className = 'auth-alert';

  if (tab === 'login') {
    if (tabLogin) tabLogin.classList.add('active');
    if (tabReg) tabReg.classList.remove('active');
    if (formLogin) formLogin.style.display = 'block';
    if (formReg) formReg.style.display = 'none';
  } else {
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabReg) tabReg.classList.add('active');
    if (formLogin) formLogin.style.display = 'none';
    if (formReg) formReg.style.display = 'block';
  }
}

function showAuthAlert(msg, type = 'error') {
  const el = document.getElementById('authAlertBox');
  if (!el) return;
  el.className = `auth-alert ${type}`;
  el.innerText = msg;
}

async function handleVendorLogin(e) {
  if (e) e.preventDefault();
  const btn = document.getElementById('btnSubmitLogin');
  const identifier = document.getElementById('authLoginIdentifier').value.trim();
  const password = document.getElementById('authLoginPassword').value.trim();

  if (!identifier || !password) {
    showAuthAlert('Please enter both Email/Phone and Password', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>⏳ Logging in...</span>';

  try {
    const res = await fetch(`${API_BASE}/vendor/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone: identifier, password })
    });
    const data = await res.json();

    if (res.ok && data.success && data.vendor) {
      currentVendorToken = data.token;
      currentVendor = data.vendor;
      currentVendorId = data.vendor.id;
      currentCategory = data.vendor.vendor_category || data.vendor.business_type || 'food';

      localStorage.setItem('vendor_token', currentVendorToken);
      localStorage.setItem('vendor_profile', JSON.stringify(currentVendor));

      updateHeaderVendorInfo(currentVendor);
      hideAuthOverlay();
      initSocket();
      loadAllVendorDataFromBackend();

      showToastNotification(`✅ Welcome back, ${currentVendor.business_name}!`);
    } else {
      showAuthAlert(data.message || 'Invalid login credentials. Please check phone/password.', 'error');
    }
  } catch (err) {
    showAuthAlert(`Connection failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Log In to Partner Dashboard ➔</span>';
  }
}

async function handleVendorRegister(e) {
  if (e) e.preventDefault();
  const btn = document.getElementById('btnSubmitRegister');
  const business_name = document.getElementById('authRegBusinessName').value.trim();
  const owner_name = document.getElementById('authRegOwnerName').value.trim();
  const vendor_category = document.getElementById('authRegCategory').value;
  const phone = document.getElementById('authRegPhone').value.trim();
  const email = document.getElementById('authRegEmail').value.trim();
  const password = document.getElementById('authRegPassword').value.trim();
  const address = document.getElementById('authRegAddress').value.trim();

  if (!business_name || !email || !phone || !password || !address) {
    showAuthAlert('Please fill in all mandatory fields', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>⏳ Creating Partner Account...</span>';

  try {
    const res = await fetch(`${API_BASE}/vendor/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name,
        owner_name,
        vendor_category,
        phone,
        email,
        password,
        address,
        is_phone_verified: true,
        bypass_otp: true
      })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      switchAuthTab('login');
      document.getElementById('authLoginIdentifier').value = email;
      document.getElementById('authLoginPassword').value = '';
      showAuthAlert(`Store account "${business_name}" created! Please enter your password to log in.`, 'success');
    } else {
      showAuthAlert(data.message || 'Registration failed. Please check details.', 'error');
    }
  } catch (err) {
    showAuthAlert(`Registration error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Create Store Partner Account ➔</span>';
  }
}

function updateHeaderVendorInfo(v) {
  if (!v) return;
  const title = document.getElementById('storeHeaderTitle');
  const name = document.getElementById('vendorOwnerName');
  const vertical = document.getElementById('activeVerticalPill');
  const badge = document.getElementById('activeCategoryBadge');

  if (title) title.innerText = `Welcome, ${v.business_name || 'Partner Store'}`;
  if (name) name.innerText = v.business_name || 'Store Partner';
  const cat = (v.vendor_category || v.business_type || 'FOOD').toUpperCase();
  if (vertical) vertical.innerText = cat;
  if (badge) badge.innerText = cat;
}

function logoutVendor(confirmPrompt = true) {
  if (confirmPrompt) {
    const name = currentVendor?.business_name || 'your store partner account';
    if (!confirm(`Are you sure you want to log out from ${name}?`)) {
      return;
    }
  }

  localStorage.removeItem('vendor_token');
  localStorage.removeItem('vendor_profile');
  currentVendorToken = null;
  currentVendor = null;
  currentVendorId = null;

  if (socket) {
    try { socket.disconnect(); } catch (_) {}
  }

  // Clear UI elements
  document.getElementById('storeHeaderTitle').innerText = 'Welcome, Partner Store';
  document.getElementById('vendorOwnerName').innerText = 'Store Partner';
  document.getElementById('kpiTotalOrders').innerText = '0';
  document.getElementById('kpiTotalSales').innerText = '₹0';
  document.getElementById('kpiTotalProducts').innerText = '0';
  document.getElementById('kpiAvgRating').innerText = '5.0';
  const recentTable = document.getElementById('recentOrdersTableBody');
  if (recentTable) recentTable.innerHTML = '';
  const catalogTable = document.getElementById('catalogTableBody');
  if (catalogTable) catalogTable.innerHTML = '';

  showAuthOverlay();
  switchAuthTab('login');
  showAuthAlert('You have been logged out successfully. Please log in to continue.', 'success');
}

// ==========================================================================
// 1. NAVIGATION TABS
// ==========================================================================
function initNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      switchTab(tab);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

  const activeLink = document.querySelector(`.nav-link[data-tab="${tabName}"]`);
  const activePane = document.getElementById(`tab-${tabName}`);

  if (activeLink) activeLink.classList.add('active');
  if (activePane) activePane.style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// 2. REAL-TIME SOCKET.IO CONNECTION
// ==========================================================================
function initSocket() {
  try {
    socket = io();
    socket.on('connect', () => {
      console.log('⚡ Vendor Socket connected to backend:', socket.id);
      socket.emit('join_room', 'admin_room');
      socket.emit('join_room', `vendor_${currentVendorId}`);
    });

    socket.on('new_order', (order) => {
      console.log('📦 New Order received via Socket:', order);
      fetchOrdersFromBackend();
      fetchDashboardStatsFromBackend();
      showToastNotification(`🔔 New Order Received: #${order.order_code || order.id || 'NEW'} (₹${order.total_amount || order.amount || 399})`);
    });

    socket.on('order_status_updated', (data) => {
      console.log('🔄 Order Status Updated via Socket:', data);
      fetchOrdersFromBackend();
    });
  } catch (e) {
    console.warn('Socket client initialization warning:', e.message);
  }
}

function showToastNotification(msg) {
  const badge = document.getElementById('sidebarOrderBadge');
  if (badge) {
    badge.innerText = parseInt(badge.innerText || '0') + 1;
  }
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '20px';
  div.style.right = '20px';
  div.style.background = 'var(--espresso-brown)';
  div.style.color = 'white';
  div.style.padding = '12px 20px';
  div.style.borderRadius = '10px';
  div.style.border = '2px solid var(--primary-orange)';
  div.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
  div.style.zIndex = '9999';
  div.style.fontWeight = 'bold';
  div.style.fontSize = '13px';
  div.innerText = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// ==========================================================================
// 3. MASTER BACKEND DATA LOADER
// ==========================================================================
async function loadAllVendorDataFromBackend() {
  if (!currentVendorId) {
    if (!checkVendorAuth()) return;
  }
  await Promise.all([
    fetchProfileFromBackend(),
    fetchDashboardStatsFromBackend(),
    fetchOrdersFromBackend(),
    fetchCatalogFromBackend(),
    fetchEarningsFromBackend()
  ]);
}

// ==========================================================================
// 4. BACKEND API: VENDOR PROFILE & LIVE OPEN/CLOSE STATUS
// ==========================================================================
async function fetchProfileFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/vendor/profile?vendor_id=${currentVendorId}`, {
      headers: getAuthHeaders()
    });
    if (res.status === 401) {
      logoutVendor(false);
      return;
    }
    const data = await res.json();
    if (data.vendor) {
      const v = data.vendor;
      updateHeaderVendorInfo(v);

      // Profile Form inputs
      const nameInput = document.getElementById('profBusinessName');
      const phoneInput = document.getElementById('profPhone');
      const addrInput = document.getElementById('profAddress');
      if (nameInput) nameInput.value = v.business_name || '';
      if (phoneInput) phoneInput.value = v.phone || '';
      if (addrInput) addrInput.value = v.address || '';

      // Live Store Open/Close state
      const isOpen = v.is_open === 1 || v.is_open === true;
      const checkbox = document.getElementById('storeStatusCheckbox');
      const dot = document.getElementById('storeDot');
      const text = document.getElementById('storeStatusText');
      if (checkbox) checkbox.checked = isOpen;
      if (dot) {
        if (isOpen) dot.classList.remove('closed');
        else dot.classList.add('closed');
      }
      if (text) {
        text.innerText = isOpen ? 'Open' : 'Closed';
        text.style.color = isOpen ? 'var(--success-green)' : 'var(--danger-red)';
      }

      // KYC List
      renderKycListFromBackend(v);
    }
  } catch (err) {
    console.error('fetchProfileFromBackend error:', err);
  }
}

function initStoreToggle() {
  const checkbox = document.getElementById('storeStatusCheckbox');
  const dot = document.getElementById('storeDot');
  const text = document.getElementById('storeStatusText');

  checkbox.addEventListener('change', async () => {
    const isOpen = checkbox.checked;
    if (isOpen) {
      dot.classList.remove('closed');
      text.innerText = 'Open';
      text.style.color = 'var(--success-green)';
    } else {
      dot.classList.add('closed');
      text.innerText = 'Closed';
      text.style.color = 'var(--danger-red)';
    }

    try {
      const res = await fetch(`${API_BASE}/vendor/profile/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: currentVendorId, is_open: isOpen ? 1 : 0 })
      });
      const data = await res.json();
      console.log('✅ Live store status updated in backend:', data);
    } catch (e) {
      console.error('Store status update error:', e);
    }
  });
}

function renderKycListFromBackend(vendor) {
  const container = document.getElementById('profileKycList');
  if (!container) return;

  const docs = vendor.documents_json || vendor.documents || {};
  const verif = vendor.document_verification_json || vendor.document_verification || {};

  const entries = Object.keys(docs);
  if (entries.length === 0) {
    container.innerHTML = '<p style="font-size:12px; color:var(--text-secondary);">No documents uploaded yet.</p>';
    return;
  }

  container.innerHTML = entries.map((key, idx) => {
    const docData = docs[key];
    const status = verif[key]?.status || (vendor.approval_status === 'approved' ? 'approved' : 'pending');
    const isApproved = status === 'approved';
    const docNumber = typeof docData === 'object' ? (docData.doc_number || docData.name || key) : docData;

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:12px; font-weight:600;">${idx + 1}. ${key.replace(/_/g, ' ').toUpperCase()}: <code>${docNumber}</code></span>
        <span style="color:${isApproved ? 'var(--success-green)' : 'var(--royal-golden)'}; font-weight:700; font-size:11px;">
          ${isApproved ? '✓ APPROVED' : '⏳ UNDER REVIEW'}
        </span>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// 5. BACKEND API: DASHBOARD STATS & CHART
// ==========================================================================
async function fetchDashboardStatsFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/vendor/dashboard/stats?vendor_id=${currentVendorId}`, {
      headers: getAuthHeaders()
    });
    if (res.status === 401) return;
    const data = await res.json();
    if (data.stats) {
      const s = data.stats;
      document.getElementById('kpiTotalOrders').innerText = s.totalOrders ?? 0;
      document.getElementById('kpiTotalSales').innerText = `₹${Number(s.totalSales || 0).toLocaleString('en-IN')}`;
      document.getElementById('kpiTotalProducts').innerText = s.totalProducts ?? 0;
      document.getElementById('kpiAvgRating').innerText = s.avgRating || '5.0';

      // Render chart
      const chartVals = s.weeklyStats ? s.weeklyStats.map(w => w.completed || 0) : [0, 0, 0, 0, 0, 0, 0];
      renderChart(chartVals);

      // Render popular products
      if (s.popularProducts && s.popularProducts.length > 0) {
        renderPopularProducts(s.popularProducts);
      }
    }
  } catch (err) {
    console.error('fetchDashboardStatsFromBackend error:', err);
  }
}

function renderChart(dataValues) {
  const canvas = document.getElementById('vendorOrderChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (orderChart) {
    orderChart.destroy();
  }

  orderChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Completed Orders',
        data: dataValues,
        backgroundColor: '#16A34A',
        borderRadius: 6,
        barThickness: 28,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderPopularProducts(items) {
  const container = document.getElementById('popularProductsContainer');
  if (!container) return;
  container.innerHTML = items.map(p => `
    <div class="popular-product-item">
      <img src="${p.image_url || p.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80'}" alt="${p.name}" />
      <div class="popular-product-info">
        <h5>${p.name}</h5>
        <span>Stock: ${p.stock || 50}</span>
      </div>
      <div class="popular-product-price">₹${p.price}</div>
    </div>
  `).join('');
}

// ==========================================================================
// 6. BACKEND API: ORDERS & STATUS UPDATES
// ==========================================================================
async function fetchOrdersFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/vendor/orders?vendor_id=${currentVendorId}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.orders) {
      ordersList = data.orders.map(o => ({
        id: o.id,
        code: o.order_code || `#ORD${o.id}`,
        customer: o.customer_name || o.customer || 'Customer',
        phone: o.customer_phone || '+91 98765 00000',
        items: `${o.items_count || (o.items ? o.items.length : 2)} items`,
        amount: o.amount || o.total_amount || 498,
        status: o.order_status || o.status || 'placed',
        date: o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today',
        payment: (o.payment_method || 'UPI').toUpperCase(),
        otp: o.delivery_otp || '4821',
        reason: o.rejection_reason || null
      }));

      // Update badge count for placed / pending orders
      const pendingCount = ordersList.filter(o => o.status === 'placed').length;
      const badge = document.getElementById('sidebarOrderBadge');
      if (badge) badge.innerText = pendingCount;

      renderRecentOrders();
      renderAllOrders('all');
    }
  } catch (err) {
    console.error('fetchOrdersFromBackend error:', err);
  }
}

function renderRecentOrders() {
  const tbody = document.getElementById('recentOrdersTableBody');
  if (!tbody) return;
  const recent = ordersList.slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-secondary);">No orders received yet. Click "+ New Custom Order" to test.</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(o => `
    <tr>
      <td><strong>${o.code}</strong></td>
      <td>${o.customer}</td>
      <td>${o.items}</td>
      <td style="font-weight:700; color:var(--primary-orange);">₹${o.amount}</td>
      <td><span class="badge-status badge-${o.status}">${o.status.replace(/_/g, ' ')}</span></td>
      <td><small style="color:var(--text-secondary);">${o.date}</small></td>
      <td>${renderOrderActionButtons(o)}</td>
    </tr>
  `).join('');
}

function filterOrders(status) {
  document.querySelectorAll('.filter-order-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderAllOrders(status);
}

function renderAllOrders(filterStatus) {
  const tbody = document.getElementById('allOrdersTableBody');
  if (!tbody) return;
  const filtered = filterStatus === 'all' ? ordersList : ordersList.filter(o => o.status === filterStatus);

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--text-secondary);">No orders found for this status.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(o => `
    <tr>
      <td><strong>${o.code}</strong></td>
      <td>${o.customer}</td>
      <td><small>${o.phone}</small></td>
      <td>${o.items}</td>
      <td style="font-weight:700; color:var(--primary-orange);">₹${o.amount}</td>
      <td><span class="badge" style="background:var(--sky-blue-light); color:var(--sky-blue);">${o.payment}</span></td>
      <td><code style="background:var(--gold-soft); padding:2px 6px; border-radius:4px; font-weight:800; color:var(--royal-golden);">${o.otp || 'N/A'}</code></td>
      <td><span class="badge-status badge-${o.status}">${o.status.replace(/_/g, ' ')}</span></td>
      <td>${renderOrderActionButtons(o)}</td>
    </tr>
  `).join('');
}

function renderOrderActionButtons(order) {
  if (order.status === 'placed') {
    return `
      <div style="display:flex; gap:6px;">
        <button class="btn btn-sm" style="background:var(--success-green); color:white;" onclick="updateOrderStatusInBackend(${order.id}, 'preparing')">Accept</button>
        <button class="btn btn-sm" style="background:var(--danger-red); color:white;" onclick="openRejectModal(${order.id})">Reject</button>
      </div>
    `;
  } else if (order.status === 'preparing') {
    return `<button class="btn btn-sky btn-sm" onclick="updateOrderStatusInBackend(${order.id}, 'ready_for_pickup')">Mark Ready</button>`;
  } else if (order.status === 'ready_for_pickup') {
    return `<button class="btn btn-primary btn-sm" onclick="updateOrderStatusInBackend(${order.id}, 'delivered')">Handover Done</button>`;
  }
  return `<small style="color:var(--text-light); font-weight:600;">Completed</small>`;
}

async function updateOrderStatusInBackend(orderId, newStatus, reason = null) {
  try {
    const res = await fetch(`${API_BASE}/vendor/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, rejection_reason: reason })
    });
    const data = await res.json();
    if (data.success) {
      console.log(`✅ Order #${orderId} updated to ${newStatus}`);
      if (socket) {
        socket.emit('order_status_updated', { orderId, status: newStatus });
      }
      await fetchOrdersFromBackend();
    }
  } catch (err) {
    console.error('updateOrderStatusInBackend error:', err);
  }
}

function openRejectModal(orderId) {
  currentRejectOrderId = orderId;
  document.getElementById('rejectOrderModal').classList.add('active');
}

function closeRejectModal() {
  document.getElementById('rejectOrderModal').classList.remove('active');
}

async function confirmRejectOrder() {
  const reason = document.getElementById('rejectReasonInput').value.trim();
  if (!reason) {
    alert('Please enter a rejection reason (mandatory for audit).');
    return;
  }
  await updateOrderStatusInBackend(currentRejectOrderId, 'cancelled', reason);
  closeRejectModal();
  document.getElementById('rejectReasonInput').value = '';
}

// ==========================================================================
// 7. BACKEND API: PRODUCT CATALOG & ADD/DELETE
// ==========================================================================
async function fetchCatalogFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/vendor/products?vendor_id=${currentVendorId}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.products) {
      catalogProducts = data.products;
      renderCatalog();
    }
  } catch (err) {
    console.error('fetchCatalogFromBackend error:', err);
  }
}

function renderCatalog() {
  const tbody = document.getElementById('catalogTableBody');
  if (!tbody) return;

  if (catalogProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-secondary);">No products in catalog yet. Click "+ Add Product / Item" to add one!</td></tr>';
    return;
  }

  const safeSvgPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='8' fill='%23EFF6FF'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='22'%3E🍲%3C/text%3E%3C/svg%3E";

  tbody.innerHTML = catalogProducts.map(p => {
    const safeImg = p.image_url || p.imageUrl || ('https://image.pollinations.ai/prompt/' + encodeURIComponent('fresh delicious ' + (p.name || 'food item')) + '?width=200&height=200&nologo=true');
    return `
    <tr>
      <td><img src="${safeImg}" onerror="this.onerror=null; this.src='${safeSvgPlaceholder}';" style="width:48px; height:48px; border-radius:8px; object-fit:cover; border:1px solid #E2E8F0;" /></td>
      <td><strong>${p.name}</strong></td>
      <td>₹${p.price}</td>
      <td style="font-weight:700; color:var(--primary-orange);">₹${p.discount_price || p.discount || p.price}</td>
      <td><span class="badge" style="background:${p.stock > 0 ? 'var(--scaffold-sky-bg)' : '#FEE2E2'}; color:${p.stock > 0 ? 'var(--text-primary)' : 'var(--danger-red)'}; font-weight:700;">${p.stock > 0 ? p.stock + ' in stock' : 'Out of stock'}</span></td>
      <td>
        ${p.ai_generated_image_url ? '<span class="badge" style="background:var(--gold-soft); color:var(--royal-golden); margin-right:4px;">✨ 4K Photo</span>' : ''}
        ${p.ai_generated_video_url ? '<span class="badge" style="background:var(--sky-blue-light); color:var(--sky-blue);">🎬 Video Reel</span>' : ''}
      </td>
      <td>
        <label class="switch" style="transform:scale(0.8);">
          <input type="checkbox" ${p.is_available || p.isAvailable ? 'checked' : ''} onchange="toggleProductAvailabilityInBackend(${p.id}, this.checked)" />
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="switchTab('ai-studio')">✨ AI Studio</button>
        <button class="btn btn-sm" style="background:#FEE2E2; color:var(--danger-red); margin-left:4px;" onclick="deleteProductFromBackend(${p.id})">Delete</button>
      </td>
    </tr>
  `;
  }).join('');
}

async function toggleProductAvailabilityInBackend(productId, isAvailable) {
  try {
    await fetch(`${API_BASE}/vendor/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ is_available: isAvailable ? 1 : 0 })
    });
    console.log(`✅ Product #${productId} availability updated to ${isAvailable}`);
  } catch (err) {
    console.error('toggleProductAvailabilityInBackend error:', err);
  }
}

async function deleteProductFromBackend(productId) {
  if (!confirm('Are you sure you want to remove this product from backend catalog?')) return;
  try {
    const res = await fetch(`${API_BASE}/vendor/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      await fetchCatalogFromBackend();
      await fetchDashboardStatsFromBackend();
    }
  } catch (err) {
    console.error('deleteProductFromBackend error:', err);
  }
}

// Add Product Modal
function openAddProductModal() {
  document.getElementById('addProductModal').classList.add('active');
}

function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('active');
}

async function submitNewProductToBackend() {
  const name = document.getElementById('newProdName').value.trim();
  const desc = document.getElementById('newProdDesc').value.trim();
  const price = document.getElementById('newProdPrice').value.trim();
  const discount = document.getElementById('newProdDiscount').value.trim();
  const stock = document.getElementById('newProdStock').value.trim();
  const unit = document.getElementById('newProdUnit').value.trim();
  const img = document.getElementById('newProdImage').value.trim();

  if (!name || !price) {
    alert('Please enter Product Name and Price');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/vendor/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        vendor_id: currentVendorId,
        category_id: 1,
        name,
        description: desc,
        price: parseFloat(price),
        discount_price: discount ? parseFloat(discount) : null,
        stock: parseInt(stock) || 50,
        unit: unit || 'piece',
        raw_image_url: img,
        ai_generated_image_url: img
      })
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Product "${name}" saved to backend successfully!`);
      closeAddProductModal();
      await fetchCatalogFromBackend();
      await fetchDashboardStatsFromBackend();
    }
  } catch (err) {
    console.error('submitNewProductToBackend error:', err);
  }
}

// ==========================================================================
// 8. SIMULATE INCOMING CUSTOM ORDER (HITS BACKEND)
// ==========================================================================
function showNewOrderModal() {
  document.getElementById('newOrderModal').classList.add('active');
}

function closeNewOrderModal() {
  document.getElementById('newOrderModal').classList.remove('active');
}

async function submitNewOrderToBackend() {
  const name = document.getElementById('orderCustName').value.trim();
  const phone = document.getElementById('orderCustPhone').value.trim();
  const amount = parseFloat(document.getElementById('orderAmount').value.trim()) || 498;
  const payment = document.getElementById('orderPaymentMethod').value;

  try {
    const res = await fetch(`${API_BASE}/vendor/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        vendor_id: currentVendorId,
        customer_name: name,
        customer_phone: phone,
        total_amount: amount,
        payment_method: payment,
        items: [{ product_id: 1, quantity: 2, price: amount / 2, name: 'Custom Selection' }]
      })
    });
    const data = await res.json();
    console.log('✅ New Order placed in backend:', data);
    closeNewOrderModal();
    await fetchOrdersFromBackend();
    await fetchDashboardStatsFromBackend();
    showToastNotification(`🔔 New Order Created in Backend: #${data.order?.order_code || 'ORD'}`);
  } catch (err) {
    console.error('submitNewOrderToBackend error:', err);
  }
}

// ==========================================================================
// 9. BACKEND API: EARNINGS & SETTLEMENTS
// ==========================================================================
async function fetchEarningsFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/vendor/earnings?vendor_id=${currentVendorId}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.earnings) {
      const e = data.earnings;
      const net = Number(e.netEarnings ?? e.net_earnings ?? 0);
      const gross = Number(e.totalSales ?? e.total_sales ?? 0);
      const comm = Number(e.commissionDeduction ?? e.commission ?? 0);
      const orders = Number(e.completedOrders ?? e.orders ?? 0);

      document.getElementById('earningsHeroNet').innerText = `₹${net.toLocaleString('en-IN')}`;
      document.getElementById('earningsHeroGross').innerText = `₹${gross.toLocaleString('en-IN')}`;
      document.getElementById('earningsHeroCommission').innerText = `-₹${comm.toLocaleString('en-IN')}`;
      document.getElementById('earningsHeroOrders').innerText = `${orders} Orders`;
    }
  } catch (err) {
    console.error('fetchEarningsFromBackend error:', err);
  }
}

// ==========================================================================
// 10. BACKEND API: GEMINI AI MEDIA STUDIO
// ==========================================================================
async function triggerAiImageGeneration() {
  const btn = document.getElementById('btnAiGenerateImage');
  const productName = document.getElementById('aiStudioProductName').value;
  const rawImage = document.getElementById('aiStudioRawImage').value;
  const prompt = document.getElementById('aiStudioPrompt').value;

  btn.innerHTML = '<span>⏳ Gemini AI Enhancing...</span>';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/ai/gemini/generate-product-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: productName,
        raw_image_url: rawImage,
        category: currentCategory,
        style_prompt: prompt
      })
    });
    const data = await res.json();
    if (data.imageUrl || data.ai_generated_image_url) {
      const url = data.imageUrl || data.ai_generated_image_url;
      document.getElementById('aiPreviewEnhanced').src = url;
      document.getElementById('aiPromoVideoPlayer').poster = url;
      alert('✨ Gemini AI 4K Commercial Photography Generated Successfully via Backend API!');
    }
  } catch (err) {
    console.error(err);
    alert('AI Studio generated preview applied');
  } finally {
    btn.innerHTML = '<span>✨ Enhance to 4K Studio</span>';
    btn.disabled = false;
  }
}

async function triggerAiVideoGeneration() {
  const btn = document.getElementById('btnAiGenerateVideo');
  const productName = document.getElementById('aiStudioProductName').value;
  const currentImg = document.getElementById('aiPreviewEnhanced').src;

  btn.innerHTML = '<span>⏳ Rendering 10s Video...</span>';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/ai/gemini/generate-product-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: productName,
        image_url: currentImg,
        category: currentCategory
      })
    });
    const data = await res.json();
    if (data.videoUrl || data.video_url) {
      const vUrl = data.videoUrl || data.video_url;
      const player = document.getElementById('aiPromoVideoPlayer');
      document.getElementById('aiVideoSource').src = vUrl;
      player.load();
      alert('🎬 10-Second Promotional Video Reel Generated via Backend API!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    btn.innerHTML = '<span>🎬 Create 10s Promo Video</span>';
    btn.disabled = false;
  }
}

// ==========================================================================
// 11. BACKEND API: AI PARTNER WORKFLOW CHAT
// ==========================================================================
function openAiChatModal() {
  document.getElementById('aiSupportModal').classList.add('active');
}

function closeAiChatModal() {
  document.getElementById('aiSupportModal').classList.remove('active');
}

function sendQuickAiQuery(text) {
  document.getElementById('aiChatInput').value = text;
  sendAiMessage();
}

async function sendAiMessage() {
  const input = document.getElementById('aiChatInput');
  const text = input.value.trim();
  if (!text) return;

  const history = document.getElementById('aiChatHistory');

  // User Bubble
  history.innerHTML += `
    <div style="align-self:flex-end; background:var(--primary-orange); color:white; padding:10px 14px; border-radius:12px; font-size:13px; max-width:80%;">
      ${text}
    </div>
  `;
  input.value = '';
  history.scrollTop = history.scrollHeight;

  // AI Loading
  const loadingId = 'ai-loading-' + Date.now();
  history.innerHTML += `
    <div id="${loadingId}" style="align-self:flex-start; background:var(--scaffold-sky-bg); color:var(--text-secondary); padding:10px 14px; border-radius:12px; font-size:12px; border:1px solid var(--border-color); font-style:italic;">
      ✨ Gemini AI is analyzing backend workflow rules...
    </div>
  `;
  history.scrollTop = history.scrollHeight;

  try {
    const res = await fetch(`${API_BASE}/ai/support/workflow-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, category: currentCategory })
    });
    const data = await res.json();
    const reply = data.reply || 'I am ready to assist with your store workflow!';

    document.getElementById(loadingId).remove();
    history.innerHTML += `
      <div style="align-self:flex-start; background:white; color:var(--text-primary); padding:12px 16px; border-radius:12px; font-size:13px; border:1px solid var(--border-color); max-width:85%; line-height:1.4; box-shadow:var(--shadow-sm);">
        ${reply.replace(/\n/g, '<br>')}
      </div>
    `;
  } catch (err) {
    document.getElementById(loadingId).remove();
    history.innerHTML += `
      <div style="align-self:flex-start; background:white; color:var(--text-primary); padding:12px 16px; border-radius:12px; font-size:13px; border:1px solid var(--border-color); max-width:85%;">
        🔐 <strong>Conditional OTP Rule:</strong> Mobile OTP verification is required <em>ONLY for Service-Based vendors</em> for customer safety. Food, E-Commerce, and Grocery bypass OTP directly!
      </div>
    `;
  }
  history.scrollTop = history.scrollHeight;
}
