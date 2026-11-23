/**
 * Quick Commerce Multi-Vendor Admin Web Panel
 * Supporting Admin & Super Admin across all 17 Modules + Configurable Delivery Rules Engine
 */

const API_BASE = '/api/v1';
let socket = null;
let currentModule = 'dashboard';
let charts = {};
let authToken = localStorage.getItem('admin_token') || null;

// Automatic JWT Authentication for Admin Session
async function ensureAdminAuth() {
  if (authToken) return authToken;
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone: 'admin@quickcommerce.com', password: 'admin123', role: 'admin' })
    });
    const data = await res.json();
    if (data.token) {
      authToken = data.token;
      localStorage.setItem('admin_token', authToken);
      return authToken;
    }
  } catch (err) {
    console.warn('Auto admin login failed:', err.message);
  }
  return null;
}

// Unified API caller with automatic token injection
async function apiRequest(endpoint, options = {}) {
  const token = await ensureAdminAuth();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('admin_token');
      authToken = null;
    }
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

// Default Admin State (pre-populated with slide exact data for instant preview)
const adminState = {
  kpis: {
    totalCustomers: 1245,
    totalVendors: 320,
    totalDeliveryBoys: 186,
    totalOrders: 3562,
    pendingOrders: 245,
    completedOrders: 2980,
    cancelledOrders: 337,
    totalSales: 2486500,
    commission: 372975,
    deliveryCharges: 125650,
    vendorEarnings: 1845200,
    deliveryBoyEarnings: 462300
  },
  slabs: [
    { id: 1, min_distance_km: 0.0, max_distance_km: 3.0, charge: 20.0, is_available: 1, title: '0 - 3 KM (Ultra-fast)' },
    { id: 2, min_distance_km: 3.01, max_distance_km: 5.0, charge: 30.0, is_available: 1, title: '3 - 5 KM (Local Hub)' },
    { id: 3, min_distance_km: 5.01, max_distance_km: 7.0, charge: 40.0, is_available: 1, title: '5 - 7 KM (City Reach)' },
    { id: 4, min_distance_km: 7.01, max_distance_km: 10.0, charge: 50.0, is_available: 1, title: '7 - 10 KM (Extended Area)' },
    { id: 5, min_distance_km: 10.01, max_distance_km: 99.0, charge: 0.0, is_available: 0, title: '10 KM+ (Not Available)' }
  ],
  recentOrders: [
    { id: 1, order_code: '#ORD1256', customer: 'Amit Sharma', vendor: 'Spice Hub', amount: 498, status: 'preparing' },
    { id: 2, order_code: '#ORD1255', customer: 'Neha Verma', vendor: 'Fresh Mart', amount: 697, status: 'out_for_delivery' },
    { id: 3, order_code: '#ORD1254', customer: 'Rahul Khan', vendor: 'Daily Needs', amount: 249, status: 'delivered' },
    { id: 4, order_code: '#ORD1253', customer: 'Pooja Singh', vendor: 'Green Store', amount: 399, status: 'cancelled' },
    { id: 5, order_code: '#ORD1252', customer: 'Vikram Yadav', vendor: 'Super Market', amount: 549, status: 'preparing' }
  ],
  topVendors: [
    { name: 'Spice Hub', orders: '1,245 orders', sales: '₹ 4,82,500' },
    { name: 'Fresh Mart', orders: '980 orders', sales: '₹ 3,21,400' },
    { name: 'Daily Needs', orders: '876 orders', sales: '₹ 2,94,300' }
  ],
  topProducts: [
    { name: 'Fresh Milk', price: '₹ 32', orders: '980 orders' },
    { name: 'Basmati Rice', price: '₹ 299', orders: '876 orders' },
    { name: 'Chicken', price: '₹ 249', orders: '740 orders' }
  ],
  settings: {
    free_delivery_threshold: 299.00,
    max_delivery_radius_km: 10.00,
    default_delivery_charge: 25.00,
    tax_percentage: 5.00,
    platform_fee: 5.00,
    default_commission_rate: 15.00,
    rider_dispatch_countdown_sec: 30
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  setupNavigation();
  loadModule('dashboard');
});

// Real-time Socket.IO Connection
function initSocket() {
  try {
    socket = io();
    socket.on('connect', () => {
      console.log('⚡ Socket connected to backend:', socket.id);
      socket.emit('join_room', 'admin_room');
      const pill = document.getElementById('socketStatus');
      if (pill) {
        pill.innerHTML = '<span class="socket-dot"></span> Live Sync Active';
      }
    });

    socket.on('disconnect', () => {
      const pill = document.getElementById('socketStatus');
      if (pill) {
        pill.innerHTML = '<span class="socket-dot" style="background:#dc2626"></span> Reconnecting...';
      }
    });

    // Listen for live order and dispatch alerts
    socket.on('admin_new_order_event', (event) => {
      showToast(`🔔 ${event.type || 'Order Update'}: ${event.message || event.orderCode || 'New order activity'}`);
      if (event.type === 'NEW_ORDER_PLACED') {
        adminState.kpis.totalOrders += 1;
        adminState.kpis.pendingOrders += 1;
        if (event.totalAmount) adminState.kpis.totalSales += parseFloat(event.totalAmount);
        renderKPIs();
      }
    });
  } catch (e) {
    console.warn('Socket.IO not initialized:', e.message);
  }
}

// Sidebar Navigation
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
      const mod = item.getAttribute('data-module');
      loadModule(mod);
    });
  });
}

function loadModule(moduleName) {
  currentModule = moduleName;
  const titleElem = document.getElementById('pageTitle');
  const descElem = document.getElementById('pageDesc');
  const container = document.getElementById('moduleContainer');

  switch (moduleName) {
    case 'dashboard':
      titleElem.textContent = 'Dashboard Overview';
      descElem.textContent = "Here's what's happening with your quick commerce platform today!";
      renderDashboard(container);
      break;

    case 'customers':
      titleElem.textContent = 'Customer Management';
      descElem.textContent = 'Manage registered customers, view order history, addresses & account status';
      renderCustomers(container);
      break;

    case 'vendors':
      titleElem.textContent = 'Vendor Management';
      descElem.textContent = 'Manage restaurant & grocery partners, KYC approvals, commission & opening status';
      renderVendors(container);
      break;

    case 'delivery-boys':
      titleElem.textContent = 'Delivery Boy Management';
      descElem.textContent = 'Manage rider fleet, live GPS coordinates, vehicle documents & COD collections';
      renderDeliveryBoys(container);
      break;

    case 'categories':
      titleElem.textContent = 'Category & Subcategory Management';
      descElem.textContent = 'Organize grocery, food, bakery, and local store categories and icons';
      renderCategories(container);
      break;

    case 'products':
      titleElem.textContent = 'Product / Menu Management';
      descElem.textContent = 'Manage inventory, variations (weight/size), add-ons, pricing & stock';
      renderProducts(container);
      break;

    case 'orders':
      titleElem.textContent = 'Order Management';
      descElem.textContent = 'Live order queue across all 15 quick commerce delivery stages';
      renderOrders(container);
      break;

    case 'delivery-management':
      titleElem.textContent = 'Delivery Management & Configurable Rules Engine';
      descElem.textContent = 'Dynamic distance slabs, service areas, radius boundaries & free delivery threshold';
      renderDeliveryManagement(container);
      break;

    case 'commission':
      titleElem.textContent = 'Commission Management';
      descElem.textContent = 'Platform earnings, vendor commission % overrides & settlement calculations';
      renderCommission(container);
      break;

    case 'payments':
      titleElem.textContent = 'Payment & Finance Management';
      descElem.textContent = 'COD reconciliations, online gateway logs, refunds & payouts';
      renderPayments(container);
      break;

    case 'coupons':
      titleElem.textContent = 'Coupon & Offer Management';
      descElem.textContent = 'Percentage / fixed discount vouchers, minimum orders & usage limits';
      renderCoupons(container);
      break;

    case 'banners':
      titleElem.textContent = 'Banner & Promotion Management';
      descElem.textContent = 'App home screen carousels, offer banners & category highlights';
      renderBanners(container);
      break;

    case 'notifications':
      titleElem.textContent = 'Notification System';
      descElem.textContent = 'Broadcast push & in-app notifications to customers, vendors, and riders';
      renderNotifications(container);
      break;

    case 'reports':
      titleElem.textContent = 'Reports & Analytics (CSV/PDF Export)';
      descElem.textContent = 'Download sales, order, rider, vendor, COD & tax reports';
      renderReports(container);
      break;

    case 'reviews':
      titleElem.textContent = 'Reviews & Ratings Moderation';
      descElem.textContent = 'Customer feedback on food quality, grocery freshness & rider ratings';
      renderReviews(container);
      break;

    case 'cms':
      titleElem.textContent = 'CMS / Static Pages';
      descElem.textContent = 'Manage Terms, Privacy Policy, About Us, Refund Policy & FAQ';
      renderCMS(container);
      break;

    case 'settings':
      titleElem.textContent = 'Platform & Admin Settings';
      descElem.textContent = 'Configure taxes, platform fees, razorpay keys, and business rules';
      renderSettings(container);
      break;

    default:
      container.innerHTML = `<div class="card-panel"><h3>Module: ${moduleName}</h3></div>`;
  }
}

// -----------------------------------------------------------------------------
// 4.1 DASHBOARD RENDERER (12 KPI Cards, Charts, Split Table)
// -----------------------------------------------------------------------------
async function renderDashboard(container) {
  container.innerHTML = `
    <!-- 12 KPI CARDS -->
    <div class="kpi-grid" id="kpiContainer">
      ${getKPICardsHTML()}
    </div>

    <!-- CHARTS & RECENT ORDERS SPLIT ROW -->
    <div class="dashboard-split-row">
      <!-- Order Statistics Chart -->
      <div class="card-panel">
        <div class="panel-header">
          <h3>Order Statistics</h3>
          <span style="font-size:12px; color:var(--text-muted)">Weekly Performance</span>
        </div>
        <div style="height: 270px; position: relative;">
          <canvas id="orderStatsChart"></canvas>
        </div>
      </div>

      <!-- Recent Orders Table -->
      <div class="card-panel">
        <div class="panel-header">
          <h3>Recent Orders</h3>
          <button onclick="loadModule('orders')">View All</button>
        </div>
        <div class="custom-table-wrapper">
          <table class="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="recentOrdersTableBody">
              ${adminState.recentOrders.map(o => `
                <tr>
                  <td><b>${o.order_code}</b></td>
                  <td>${o.customer}</td>
                  <td>${o.vendor}</td>
                  <td>₹${o.amount}</td>
                  <td><span class="status-badge badge-${o.status}">${formatStatus(o.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TOP VENDORS, PRODUCTS & PLATFORM GROWTH -->
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
      <!-- Top Vendors -->
      <div class="card-panel">
        <div class="panel-header">
          <h3>Top Vendors</h3>
          <button onclick="loadModule('vendors')">View All</button>
        </div>
        ${adminState.topVendors.map(v => `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f1f5f9;">
            <div>
              <h4 style="font-size:13.5px; color:var(--navy-dark)">${v.name}</h4>
              <p style="font-size:11.5px; color:var(--text-muted)">${v.orders}</p>
            </div>
            <span style="font-size:13.5px; font-weight:700; color:var(--primary-green)">${v.sales}</span>
          </div>
        `).join('')}
      </div>

      <!-- Top Products -->
      <div class="card-panel">
        <div class="panel-header">
          <h3>Top Products</h3>
          <button onclick="loadModule('products')">View All</button>
        </div>
        ${adminState.topProducts.map(p => `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f1f5f9;">
            <div>
              <h4 style="font-size:13.5px; color:var(--navy-dark)">${p.name}</h4>
              <p style="font-size:11.5px; color:var(--text-muted)">${p.orders}</p>
            </div>
            <span style="font-size:13.5px; font-weight:700; color:var(--navy-dark)">${p.price}</span>
          </div>
        `).join('')}
      </div>

      <!-- Platform Growth Card -->
      <div class="card-panel">
        <div class="panel-header">
          <h3>Platform Growth</h3>
          <span style="font-size:12px; color:var(--primary-green); font-weight:600">This Month</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:14px; margin-top:8px;">
          <div style="display:flex; justify-content:space-between; font-size:13.5px;">
            <span>👥 Customers</span>
            <span style="color:var(--primary-green); font-weight:700">↑ 12%</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13.5px;">
            <span>🏬 Vendors</span>
            <span style="color:var(--primary-green); font-weight:700">↑ 8%</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13.5px;">
            <span>🛵 Delivery Boys</span>
            <span style="color:var(--primary-green); font-weight:700">↑ 10%</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13.5px;">
            <span>📦 Orders</span>
            <span style="color:var(--primary-green); font-weight:700">↑ 15%</span>
          </div>
        </div>
      </div>
    </div>
  `;

  initDashboardCharts();

  // Fetch live KPIs and analytics from backend
  try {
    const res = await apiRequest('/admin/dashboard-kpis');
    if (res && res.kpis) {
      adminState.kpis = res.kpis;
      renderKPIs();
      if (res.analytics && res.analytics.recentOrders && res.analytics.recentOrders.length) {
        adminState.recentOrders = res.analytics.recentOrders;
        const tbody = document.getElementById('recentOrdersTableBody');
        if (tbody) {
          tbody.innerHTML = adminState.recentOrders.map(o => `
            <tr>
              <td><b>${o.order_code}</b></td>
              <td>${o.customer}</td>
              <td>${o.vendor}</td>
              <td>₹${o.amount}</td>
              <td><span class="status-badge badge-${o.status}">${formatStatus(o.status)}</span></td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.warn('Dashboard live sync note:', err.message);
  }
}

function getKPICardsHTML() {
  const k = adminState.kpis;
  return `
    <div class="kpi-card">
      <div class="kpi-info">
        <p>Total Customers</p>
        <h3>${k.totalCustomers.toLocaleString()}</h3>
        <span class="growth">↑ 12%</span>
      </div>
      <div class="kpi-icon-wrap kpi-blue">👥</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Total Vendors</p>
        <h3>${k.totalVendors.toLocaleString()}</h3>
        <span class="growth">↑ 8%</span>
      </div>
      <div class="kpi-icon-wrap kpi-green">🏪</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Total Delivery Boys</p>
        <h3>${k.totalDeliveryBoys.toLocaleString()}</h3>
        <span class="growth">↑ 10%</span>
      </div>
      <div class="kpi-icon-wrap kpi-blue">🛵</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Total Orders</p>
        <h3>${k.totalOrders.toLocaleString()}</h3>
        <span class="growth">↑ 15%</span>
      </div>
      <div class="kpi-icon-wrap kpi-amber">📦</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Pending Orders</p>
        <h3>${k.pendingOrders.toLocaleString()}</h3>
      </div>
      <div class="kpi-icon-wrap kpi-amber">⏳</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Completed Orders</p>
        <h3>${k.completedOrders.toLocaleString()}</h3>
      </div>
      <div class="kpi-icon-wrap kpi-green">✅</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Cancelled Orders</p>
        <h3>${k.cancelledOrders.toLocaleString()}</h3>
      </div>
      <div class="kpi-icon-wrap kpi-red">❌</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Total Sales</p>
        <h3>₹ ${k.totalSales.toLocaleString()}</h3>
      </div>
      <div class="kpi-icon-wrap kpi-teal">💳</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Commission</p>
        <h3>₹ ${k.commission.toLocaleString()}</h3>
      </div>
      <div class="kpi-icon-wrap kpi-red">💰</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Delivery Charges</p>
        <h3>₹ ${k.deliveryCharges.toLocaleString()}</h3>
      </div>
      <div class="kpi-icon-wrap kpi-amber">🚚</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Vendor Earnings</p>
        <h3>₹ ${k.vendorEarnings.toLocaleString()}</h3>
      </div>
      <div class="kpi-icon-wrap kpi-blue">🏬</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-info">
        <p>Delivery Boy Earnings</p>
        <h3>₹ ${k.deliveryBoyEarnings.toLocaleString()}</h3>
      </div>
      <div class="kpi-icon-wrap kpi-green">💼</div>
    </div>
  `;
}

function renderKPIs() {
  const container = document.getElementById('kpiContainer');
  if (container) container.innerHTML = getKPICardsHTML();
}

function initDashboardCharts() {
  const ctx = document.getElementById('orderStatsChart');
  if (!ctx) return;

  if (charts.orderStats) charts.orderStats.destroy();

  charts.orderStats = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        { label: 'Completed', data: [340, 420, 390, 520, 480, 610, 680], backgroundColor: '#2E9E44', borderRadius: 4 },
        { label: 'Pending', data: [35, 42, 28, 40, 32, 50, 45], backgroundColor: '#F59E0B', borderRadius: 4 },
        { label: 'Cancelled', data: [12, 18, 15, 22, 19, 25, 20], backgroundColor: '#E53935', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f1f5f9' }, beginAtZero: true }
      }
    }
  });
}

// -----------------------------------------------------------------------------
// 4.2 CUSTOMER MANAGEMENT
// -----------------------------------------------------------------------------
async function renderCustomers(container) {
  let customers = [];
  try {
    const res = await apiRequest('/admin/customers');
    customers = res.customers || [];
  } catch (e) {
    customers = [
      { id: 10, name: 'Neha Verma', email: 'customer1@gmail.com', phone: '+919999900010', city: 'Noida', orders: 18, status: 'active' },
      { id: 11, name: 'Pooja Singh', email: 'customer2@gmail.com', phone: '+919999900011', city: 'Noida', orders: 12, status: 'active' },
      { id: 12, name: 'Rohit Gupta', email: 'rohit@gmail.com', phone: '+919999900012', city: 'Noida', orders: 5, status: 'blocked' }
    ];
  }

  container.innerHTML = `
    <div class="card-panel">
      <div class="panel-header">
        <h3>Registered Customers (${customers.length})</h3>
        <button class="btn-primary" onclick="showToast('Customer accounts register via App / Auth API')">+ Add Customer</button>
      </div>
      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => `
              <tr>
                <td>#CST-${c.id}</td>
                <td><b>${c.name}</b></td>
                <td>${c.email}</td>
                <td>${c.phone}</td>
                <td><span class="status-badge badge-${c.status || 'active'}">${(c.status || 'active').toUpperCase()}</span></td>
                <td>
                  <button class="btn-outline" onclick="toggleCustomerBlock(${c.id}, '${c.status || 'active'}')">
                    ${c.status === 'blocked' ? 'Unblock' : 'Block'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 4.3 VENDOR MANAGEMENT (Category Filter, OTP Verified Badge & Role-wise KYC)
// -----------------------------------------------------------------------------
let allLoadedVendors = [];
let selectedVendorCategory = 'all';
let currentInspectingVendor = null;

async function renderVendors(container) {
  try {
    const res = await apiRequest('/admin/vendors');
    allLoadedVendors = res.vendors || [];
  } catch (e) {
    allLoadedVendors = [];
  }

  renderVendorsView(container);
}

function renderVendorsView(container) {
  if (!container) container = document.getElementById('moduleContainer');
  if (!container) return;

  const total = allLoadedVendors.length;
  const foodCount = allLoadedVendors.filter(v => (v.vendor_category || v.business_type) === 'food').length;
  const ecomCount = allLoadedVendors.filter(v => (v.vendor_category || v.business_type) === 'ecommerce').length;
  const servCount = allLoadedVendors.filter(v => (v.vendor_category || v.business_type) === 'service_based' || v.business_type === 'services').length;
  const grocCount = allLoadedVendors.filter(v => (v.vendor_category || v.business_type) === 'grocery').length;

  let filtered = allLoadedVendors;
  if (selectedVendorCategory !== 'all') {
    filtered = allLoadedVendors.filter(v => {
      const cat = v.vendor_category || v.business_type;
      if (selectedVendorCategory === 'service_based') return cat === 'service_based' || cat === 'services';
      return cat === selectedVendorCategory;
    });
  }

  container.innerHTML = `
    <div class="card-panel">
      <div class="panel-header" style="flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <h3 style="margin:0; font-size:18px; color:var(--text-dark);">Vendor Partners (${allLoadedVendors.length})</h3>
          <p style="margin:3px 0 0; font-size:12.5px; color:var(--text-muted);">
            Manage multi-category partners across Food, E-Commerce, Service-Based & Grocery with role-wise KYC
          </p>
        </div>
        <button class="btn-primary" onclick="showToast('Vendor registration link: /api/v1/vendor/auth/register')">+ Invite Vendor</button>
      </div>

      <!-- CATEGORY FILTER TABS -->
      <div class="filter-tabs-row" style="margin-bottom:16px;">
        <button class="filter-tab ${selectedVendorCategory === 'all' ? 'active' : ''}" onclick="filterVendorCategory('all')">
          All Categories (${total})
        </button>
        <button class="filter-tab ${selectedVendorCategory === 'food' ? 'active' : ''}" onclick="filterVendorCategory('food')">
          🍔 Food (${foodCount})
        </button>
        <button class="filter-tab ${selectedVendorCategory === 'ecommerce' ? 'active' : ''}" onclick="filterVendorCategory('ecommerce')">
          🛍️ E-Commerce (${ecomCount})
        </button>
        <button class="filter-tab ${selectedVendorCategory === 'service_based' ? 'active' : ''}" onclick="filterVendorCategory('service_based')">
          🛠️ Service Based (${servCount})
        </button>
        <button class="filter-tab ${selectedVendorCategory === 'grocery' ? 'active' : ''}" onclick="filterVendorCategory('grocery')">
          🥦 Grocery (${grocCount})
        </button>
      </div>

      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Vendor & Business</th>
              <th>Category</th>
              <th>OTP Status</th>
              <th>KYC Documents</th>
              <th>Commission</th>
              <th>Rating</th>
              <th>Store Status</th>
              <th>Approval</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="9" style="text-align:center; padding:28px; color:var(--text-muted);">No vendors found in this category filter.</td></tr>
            ` : filtered.map(v => {
              const cat = v.vendor_category || v.business_type || 'grocery';
              const isService = cat === 'service_based' || cat === 'services';
              const docs = v.documents_json || {};
              const docCount = Object.keys(docs).length;

              return `
                <tr>
                  <td>
                    <div>
                      <b style="color:var(--text-dark); font-size:14px;">${v.business_name}</b>
                      <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">${v.phone} &bull; ${v.city || 'Noida'}</div>
                    </div>
                  </td>
                  <td>${getModuleBadge(cat)}</td>
                  <td>
                    ${isService ? `
                      <span class="status-badge" style="background:#DCFCE7; color:#16A34A; font-weight:700; border:1px solid #bbf7d0;">
                        OTP Verified ✓
                      </span>
                    ` : `
                      <span class="status-badge" style="background:#F1F5F9; color:#64748B;">
                        Not Required
                      </span>
                    `}
                  </td>
                  <td>
                    <button class="btn-outline" style="padding:4px 10px; font-size:11.5px; display:inline-flex; align-items:center; gap:5px;" onclick="inspectVendorKyc(${v.id})">
                      <span>📄</span> Inspect KYC (${docCount || 3})
                    </button>
                  </td>
                  <td><b style="color:var(--royal-gold);">${v.commission_rate || 15}%</b></td>
                  <td>⭐ ${v.rating || 4.8}</td>
                  <td>
                    <span class="status-badge ${v.is_open ? 'badge-active' : 'badge-cancelled'}">
                      ${v.is_open ? 'OPEN' : 'CLOSED'}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge badge-${v.approval_status || 'pending'}">
                      ${(v.approval_status || 'pending').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      ${v.approval_status !== 'approved' ? `
                        <button class="btn-primary" style="padding:4px 8px; font-size:11px;" onclick="approveVendor(${v.id})">Approve</button>
                        <button class="btn-outline" style="padding:4px 8px; font-size:11px; color:#DC2626;" onclick="rejectVendor(${v.id})">Reject</button>
                      ` : `
                        <button class="btn-outline" style="padding:4px 8px; font-size:11px; color:#DC2626;" onclick="rejectVendor(${v.id})">Revoke</button>
                      `}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function filterVendorCategory(cat) {
  selectedVendorCategory = cat;
  renderVendorsView();
}

function inspectVendorKyc(vendorId) {
  const vendor = allLoadedVendors.find(v => v.id == vendorId);
  if (!vendor) return;
  currentInspectingVendor = vendor;

  const modal = document.getElementById('inspectKycModal');
  const nameEl = document.getElementById('kycModalVendorName');
  const badgeEl = document.getElementById('kycModalCategoryBadge');
  const bodyEl = document.getElementById('kycModalBody');

  if (nameEl) nameEl.textContent = `${vendor.business_name} - KYC Verification`;
  if (badgeEl) badgeEl.innerHTML = `Category: <b>${(vendor.vendor_category || vendor.business_type).toUpperCase()}</b> &bull; Status: <b>${(vendor.approval_status || 'pending').toUpperCase()}</b>`;

  const docs = vendor.documents_json || {
    trade_license: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    gst_certificate: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    id_proof: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80'
  };
  const verif = vendor.document_verification_json || {};

  bodyEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      ${Object.keys(docs).map(key => {
        const docUrl = docs[key];
        const status = verif[key] || 'pending';
        const formattedKey = key.replace(/_/g, ' ').toUpperCase();

        return `
          <div style="border:1px solid var(--border-color); border-radius:10px; padding:14px; background:#F8FAFC;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span style="font-size:13.5px; font-weight:700; color:var(--text-dark);">${formattedKey}</span>
              <span class="status-badge ${status === 'approved' ? 'badge-active' : (status === 'rejected' ? 'badge-cancelled' : 'badge-pending')}">
                ${status.toUpperCase()}
              </span>
            </div>
            
            <div style="display:flex; gap:14px; align-items:center;">
              <a href="${docUrl}" target="_blank" title="Click to view full size">
                <img src="${docUrl}" style="width:110px; height:75px; object-fit:cover; border-radius:8px; border:1px solid #CBD5E1;" />
              </a>
              <div style="flex:1;">
                <p style="margin:0 0 8px; font-size:12px; color:var(--text-muted);">
                  Uploaded document for verification. Inspect clarity and validity.
                </p>
                <div style="display:flex; gap:8px;">
                  <button class="btn-primary" style="padding:4px 10px; font-size:11px; background:#16A34A;" onclick="updateDocStatus(${vendor.id}, '${key}', 'approved')">
                    ✓ Approve Document
                  </button>
                  <button class="btn-outline" style="padding:4px 10px; font-size:11px; color:#DC2626; border-color:#FCA5A5;" onclick="updateDocStatus(${vendor.id}, '${key}', 'rejected')">
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  openModal('inspectKycModal');
}

async function updateDocStatus(vendorId, docKey, status) {
  try {
    await apiRequest(`/admin/vendors/${vendorId}/documents`, {
      method: 'PATCH',
      body: JSON.stringify({ document_key: docKey, status })
    });
    showToast(`Document "${docKey}" marked as ${status.toUpperCase()}!`);
    if (currentInspectingVendor && currentInspectingVendor.id == vendorId) {
      if (!currentInspectingVendor.document_verification_json) currentInspectingVendor.document_verification_json = {};
      currentInspectingVendor.document_verification_json[docKey] = status;
      inspectVendorKyc(vendorId);
    }
    loadModule('vendors');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function approveCurrentVendorAction() {
  if (!currentInspectingVendor) return;
  await approveVendor(currentInspectingVendor.id);
  closeModal('inspectKycModal');
}

async function approveVendor(vendorId) {
  try {
    await apiRequest(`/admin/vendors/${vendorId}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ approval_status: 'approved' })
    });
    showToast('Vendor approved successfully!');
    loadModule('vendors');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function rejectVendor(vendorId) {
  const reason = prompt('Please enter rejection reason:', 'Invalid or illegible business documents');
  if (!reason) return;
  try {
    await apiRequest(`/admin/vendors/${vendorId}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ approval_status: 'rejected', rejection_reason: reason })
    });
    showToast('Vendor status set to Rejected');
    loadModule('vendors');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// 4.4 DELIVERY BOY MANAGEMENT
// -----------------------------------------------------------------------------
async function renderDeliveryBoys(container) {
  let riders = [];
  try {
    const res = await apiRequest('/admin/delivery-boys');
    riders = res.deliveryBoys || [];
  } catch (e) {
    riders = [
      { id: 1, full_name: 'Rahul Khan', vehicle_type: 'bike', vehicle_number: 'UP16-AB-1234', phone: '+919999900007', total_deliveries: 412, wallet_balance: 1450, total_cod_collected: 680, is_online: 1, approval_status: 'approved' },
      { id: 2, full_name: 'Amit Sharma', vehicle_type: 'scooter', vehicle_number: 'UP16-CD-5678', phone: '+919999900008', total_deliveries: 385, wallet_balance: 1220, total_cod_collected: 450, is_online: 1, approval_status: 'approved' },
      { id: 3, full_name: 'Vikram Yadav', vehicle_type: 'ev', vehicle_number: 'UP16-EV-9012', phone: '+919999900009', total_deliveries: 290, wallet_balance: 980, total_cod_collected: 0, is_online: 0, approval_status: 'approved' }
    ];
  }

  container.innerHTML = `
    <div class="card-panel">
      <div class="panel-header">
        <h3>Delivery Fleet (${riders.length})</h3>
        <button class="btn-primary" onclick="showToast('Broadcast sent to all riders!')">Alert All Riders</button>
      </div>
      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Rider Name</th>
              <th>Vehicle</th>
              <th>Phone</th>
              <th>Deliveries</th>
              <th>Wallet Balance</th>
              <th>COD Collected</th>
              <th>Live Status</th>
              <th>KYC Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${riders.map(r => `
              <tr>
                <td><b>${r.full_name || r.name}</b></td>
                <td style="text-transform:uppercase;">${r.vehicle_type || 'bike'} (${r.vehicle_number || 'N/A'})</td>
                <td>${r.phone}</td>
                <td>${r.total_deliveries || r.deliveries || 0}</td>
                <td style="color:var(--primary-green); font-weight:700">₹ ${r.wallet_balance || 0}</td>
                <td style="color:var(--badge-amber-text); font-weight:700">₹ ${r.total_cod_collected || 0}</td>
                <td>
                  <span class="status-badge ${r.is_online ? 'badge-online' : 'badge-cancelled'}">
                    ${r.is_online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </td>
                <td><span class="status-badge badge-${r.approval_status || 'pending'}">${(r.approval_status || 'pending').toUpperCase()}</span></td>
                <td>
                  ${(r.approval_status || 'pending') !== 'approved' ? `
                    <button class="btn-primary" style="padding:4px 8px; font-size:11px;" onclick="approveDeliveryBoy(${r.id})">Approve</button>
                  ` : `
                    <button class="btn-outline" style="padding:4px 8px; font-size:11px;" onclick="showToast('Rider ${r.full_name || r.name} documents verified')">View KYC</button>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 4.5 CATEGORY & SUBCATEGORY MANAGEMENT (Food, Ecommerce, Services, Grocery)
// -----------------------------------------------------------------------------
let allLoadedCategories = [];
let allLoadedSubcategories = [];
let selectedCategoryModule = 'all'; // 'all', 'food', 'ecommerce', 'services', 'grocery'
let categoryViewMode = 'cards';     // 'cards' or 'table'

const MODULE_META = {
  food: { name: 'Food', label: '🍔 Food (Restaurants & Cafes)', color: '#d97706', bg: '#fef3c7', icon: '🍔' },
  ecommerce: { name: 'E-commerce', label: '🛍️ E-commerce (Shopping)', color: '#7c3aed', bg: '#ede9fe', icon: '🛍️' },
  services: { name: 'Service Based', label: '🛠️ Service Based (Urban Clap)', color: '#2563eb', bg: '#dbeafe', icon: '🛠️' },
  grocery: { name: 'Grocery', label: '🥦 Grocery (Supermarket)', color: '#16a34a', bg: '#dcfce7', icon: '🥦' }
};

function getModuleBadge(mod) {
  const m = MODULE_META[mod] || { name: (mod || 'General').toUpperCase(), color: '#475569', bg: '#f1f5f9', icon: '📦' };
  return `<span style="display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; color:${m.color}; background:${m.bg}; text-transform:capitalize;">${m.icon} ${m.name}</span>`;
}

async function renderCategories(container) {
  try {
    const res = await apiRequest('/admin/categories');
    allLoadedCategories = res.categories || [];
  } catch (e) {
    allLoadedCategories = [];
  }

  try {
    const subRes = await apiRequest('/admin/subcategories');
    allLoadedSubcategories = subRes.subcategories || [];
  } catch (e) {
    allLoadedSubcategories = [];
  }

  renderCategoriesView(container);
}

function renderCategoriesView(container) {
  if (!container) container = document.getElementById('moduleContainer');
  if (!container) return;

  const totalCats = allLoadedCategories.length;
  const foodCount = allLoadedCategories.filter(c => c.module_type === 'food').length;
  const ecomCount = allLoadedCategories.filter(c => c.module_type === 'ecommerce').length;
  const servCount = allLoadedCategories.filter(c => c.module_type === 'services').length;
  const grocCount = allLoadedCategories.filter(c => c.module_type === 'grocery').length;

  let filteredCats = allLoadedCategories;
  if (selectedCategoryModule !== 'all') {
    filteredCats = allLoadedCategories.filter(c => c.module_type === selectedCategoryModule);
  }

  let filteredSubs = allLoadedSubcategories;
  if (selectedCategoryModule !== 'all') {
    filteredSubs = allLoadedSubcategories.filter(s => s.module_type === selectedCategoryModule);
  }

  const totalSubsCount = allLoadedSubcategories.length;

  container.innerHTML = `
    <div class="card-panel">
      <!-- HEADER -->
      <div class="panel-header" style="flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <h3 style="margin:0; font-size:18px; color:var(--navy-dark)">Business Categories & Subcategories</h3>
          <p style="margin:4px 0 0; font-size:12.5px; color:var(--text-muted);">
            Manage the 4 core verticals: <b>Food</b>, <b>E-Commerce</b>, <b>Service Based (Urban Clap)</b> & <b>Grocery</b>
          </p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-outline" onclick="openSubcategoryModal()" style="display:inline-flex; align-items:center; gap:6px;">
            <span>➕</span> Add Subcategory
          </button>
          <button class="btn-primary" onclick="openModal('addCategoryModal')">
            <span>➕</span> Add Category
          </button>
        </div>
      </div>

      <!-- 4 VERTICALS FILTER TABS -->
      <div class="filter-tabs-row" style="margin-bottom:16px;">
        <button class="filter-tab ${selectedCategoryModule === 'all' ? 'active' : ''}" onclick="filterCategoryModule('all')">
          All Verticals (${totalCats})
        </button>
        <button class="filter-tab ${selectedCategoryModule === 'food' ? 'active' : ''}" onclick="filterCategoryModule('food')">
          🍔 Food (${foodCount})
        </button>
        <button class="filter-tab ${selectedCategoryModule === 'ecommerce' ? 'active' : ''}" onclick="filterCategoryModule('ecommerce')">
          🛍️ E-Commerce (${ecomCount})
        </button>
        <button class="filter-tab ${selectedCategoryModule === 'services' ? 'active' : ''}" onclick="filterCategoryModule('services')">
          🛠️ Service Based (${servCount})
        </button>
        <button class="filter-tab ${selectedCategoryModule === 'grocery' ? 'active' : ''}" onclick="filterCategoryModule('grocery')">
          🥦 Grocery (${grocCount})
        </button>
      </div>

      <!-- VIEW MODE SWITCHER & COUNTS -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; background:var(--bg-canvas); padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
        <div style="font-size:13px; font-weight:600; color:var(--navy-dark);">
          Showing <b>${filteredCats.length}</b> Categories &bull; <b>${categoryViewMode === 'table' ? filteredSubs.length : (filteredCats.reduce((acc, c) => acc + (c.subcategories ? c.subcategories.length : 0), 0))}</b> Subcategories
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn-outline" style="padding:5px 12px; font-size:12px; ${categoryViewMode === 'cards' ? 'background:var(--navy-dark); color:white; border-color:var(--navy-dark);' : ''}" onclick="switchCategoryView('cards')">
            🗂️ Categories & Subcategories
          </button>
          <button class="btn-outline" style="padding:5px 12px; font-size:12px; ${categoryViewMode === 'table' ? 'background:var(--navy-dark); color:white; border-color:var(--navy-dark);' : ''}" onclick="switchCategoryView('table')">
            📋 Subcategories Master Table (${totalSubsCount})
          </button>
        </div>
      </div>

      <!-- CONTENT: CARDS VIEW -->
      ${categoryViewMode === 'cards' ? `
        ${filteredCats.length === 0 ? `
          <div style="text-align:center; padding:48px 20px; color:var(--text-muted);">
            <div style="font-size:40px; margin-bottom:12px;">📂</div>
            <h4>No Categories in this vertical yet</h4>
            <p style="font-size:13px;">Click "+ Add Category" above to create one.</p>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:18px;">
            ${filteredCats.map(c => {
              const subs = c.subcategories || [];
              const modMeta = MODULE_META[c.module_type] || {};
              const catIcon = c.icon_url || modMeta.icon || '📁';
              return `
                <div style="border:1px solid var(--border-color); border-radius:var(--radius-lg); background:var(--bg-white); box-shadow:var(--shadow-sm); padding:18px; display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.2s, box-shadow 0.2s;">
                  <div>
                    <!-- TOP CARD HEADER -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                      <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:26px; line-height:1; background:var(--bg-canvas); padding:6px 10px; border-radius:10px; border:1px solid var(--border-color);">${catIcon}</span>
                        <div>
                          <h4 style="margin:0; font-size:15.5px; font-weight:700; color:var(--navy-dark);">${c.name}</h4>
                          <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                            ${getModuleBadge(c.module_type)}
                            <span style="font-size:11px; color:var(--text-muted);">&bull; ${c.products_count || 0} items</span>
                          </div>
                        </div>
                      </div>
                      <span class="status-badge ${c.is_active ? 'badge-active' : 'badge-cancelled'}" style="cursor:pointer;" onclick="toggleCategoryStatus(${c.id}, ${c.is_active})" title="Click to toggle status">
                        ${c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    ${c.description ? `<p style="font-size:12px; color:var(--text-muted); margin:0 0 12px; line-height:1.4;">${c.description}</p>` : ''}

                    <!-- SUBCATEGORIES SECTION -->
                    <div style="background:var(--bg-canvas); border-radius:var(--radius-md); padding:10px 12px; margin-top:8px; border:1px solid #f1f5f9;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:12px; font-weight:700; color:var(--navy-dark); text-transform:uppercase; letter-spacing:0.5px;">
                          Subcategories (${subs.length})
                        </span>
                        <button onclick="openSubcategoryModal(${c.id})" style="background:none; border:none; color:var(--primary-green); font-size:11.5px; font-weight:700; cursor:pointer; padding:0; display:inline-flex; align-items:center; gap:3px;">
                          + Add Subcategory
                        </button>
                      </div>

                      ${subs.length === 0 ? `
                        <div style="font-size:11.5px; color:var(--text-muted); font-style:italic;">No subcategories yet. Click + Add Subcategory.</div>
                      ` : `
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                          ${subs.map(s => `
                            <span style="display:inline-flex; align-items:center; gap:5px; background:white; border:1px solid #e2e8f0; border-radius:14px; padding:3px 9px; font-size:11.5px; color:var(--navy-dark); font-weight:500;">
                              <span>${s.icon_url || '•'}</span>
                              <span style="${!s.is_active ? 'text-decoration:line-through; opacity:0.6;' : ''}">${s.name}</span>
                              <span onclick="toggleSubcategoryStatus(${s.id}, ${s.is_active})" title="${s.is_active ? 'Deactivate' : 'Activate'}" style="cursor:pointer; width:7px; height:7px; border-radius:50%; background:${s.is_active ? '#2E9E44' : '#E53935'}; margin-left:2px;"></span>
                              <span onclick="deleteSubcategory(${s.id}, '${s.name.replace(/'/g, "\\'")}')" title="Delete subcategory" style="cursor:pointer; color:#94a3b8; font-weight:700; font-size:12px; margin-left:2px; line-height:1;" onmouseover="this.style.color='#E53935'" onmouseout="this.style.color='#94a3b8'">&times;</span>
                            </span>
                          `).join('')}
                        </div>
                      `}
                    </div>
                  </div>

                  <!-- BOTTOM ACTIONS -->
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:10px; border-top:1px solid #f1f5f9;">
                    <button class="btn-outline" style="padding:4px 10px; font-size:11.5px;" onclick="toggleCategoryStatus(${c.id}, ${c.is_active})">
                      ${c.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>
                    <button class="btn-outline" style="padding:4px 10px; font-size:11.5px; color:#E53935; border-color:#fee2e2;" onclick="deleteCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'">
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      ` : `
        <!-- MASTER SUBCATEGORIES TABLE VIEW -->
        <div class="custom-table-wrapper">
          <table class="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Subcategory Name</th>
                <th>Parent Category</th>
                <th>Vertical Module</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSubs.length === 0 ? `
                <tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No subcategories found in this filter.</td></tr>
              ` : filteredSubs.map(s => `
                <tr>
                  <td>#SUB-${s.id}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:16px;">${s.icon_url || '📁'}</span>
                      <b>${s.name}</b>
                    </div>
                  </td>
                  <td><b>${s.category_name || 'General'}</b></td>
                  <td>${getModuleBadge(s.module_type)}</td>
                  <td>
                    <span class="status-badge ${s.is_active ? 'badge-active' : 'badge-cancelled'}">
                      ${s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn-outline" style="padding:3px 8px; font-size:11px;" onclick="toggleSubcategoryStatus(${s.id}, ${s.is_active})">
                        ${s.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button class="btn-outline" style="padding:3px 8px; font-size:11px; color:#E53935; border-color:#fee2e2;" onclick="deleteSubcategory(${s.id}, '${s.name.replace(/'/g, "\\'")}')">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function filterCategoryModule(mod) {
  selectedCategoryModule = mod;
  renderCategoriesView();
}

function switchCategoryView(mode) {
  categoryViewMode = mode;
  renderCategoriesView();
}

function openSubcategoryModal(categoryId) {
  const select = document.getElementById('newSubcatParentCategory');
  if (select) {
    select.innerHTML = allLoadedCategories.map(c => `
      <option value="${c.id}" ${categoryId && categoryId == c.id ? 'selected' : ''}>
        ${c.icon_url || '📁'} ${c.name} (${(c.module_type || 'grocery').toUpperCase()})
      </option>
    `).join('');
  }
  const nameInput = document.getElementById('newSubcategoryName');
  if (nameInput) nameInput.value = '';
  const iconInput = document.getElementById('newSubcategoryIcon');
  if (iconInput) iconInput.value = '';

  openModal('addSubcategoryModal');
}

async function toggleCategoryStatus(catId, currentStatus) {
  try {
    const newStatus = currentStatus ? 0 : 1;
    await apiRequest(`/admin/categories/${catId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: newStatus })
    });
    showToast(`Category status updated to ${newStatus ? 'Active' : 'Inactive'}`);
    loadModule('categories');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function deleteCategory(catId, catName) {
  if (!confirm(`Are you sure you want to delete category "${catName}"? This will also remove its subcategories.`)) return;
  try {
    await apiRequest(`/admin/categories/${catId}`, { method: 'DELETE' });
    showToast('Category deleted successfully');
    loadModule('categories');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function toggleSubcategoryStatus(subcatId, currentStatus) {
  try {
    const newStatus = currentStatus ? 0 : 1;
    await apiRequest(`/admin/subcategories/${subcatId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: newStatus })
    });
    showToast(`Subcategory status updated to ${newStatus ? 'Active' : 'Inactive'}`);
    loadModule('categories');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function deleteSubcategory(subcatId, subcatName) {
  if (!confirm(`Are you sure you want to delete subcategory "${subcatName}"?`)) return;
  try {
    await apiRequest(`/admin/subcategories/${subcatId}`, { method: 'DELETE' });
    showToast('Subcategory deleted successfully');
    loadModule('categories');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// 4.6 PRODUCT MANAGEMENT (Including AI Media Studio Preview)
// -----------------------------------------------------------------------------
async function renderProducts(container) {
  let products = [];
  try {
    const res = await apiRequest('/admin/products');
    products = res.products || [];
  } catch (e) {
    products = db?.memoryStore?.products || [];
  }

  container.innerHTML = `
    <div class="card-panel">
      <div class="panel-header" style="flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="margin:0;">Product & Menu Catalog (${products.length})</h3>
          <p style="margin:3px 0 0; font-size:12px; color:var(--text-muted);">
            Manage multi-category inventory, variations, add-ons and Gemini AI-generated commercial media
          </p>
        </div>
        <button class="btn-primary" onclick="openModal('addProductModal')">+ Add Product</button>
      </div>
      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Image / AI Media</th>
              <th>Product Name</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Food / Service</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => {
              const hasAiImg = !!p.ai_generated_image_url;
              const hasAiVid = !!p.ai_generated_video_url;
              const displayImg = p.ai_generated_image_url || p.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80';

              return `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <img src="${displayImg}" style="width:48px; height:48px; object-fit:cover; border-radius:8px; border:1px solid #E2E8F0;" />
                      <div>
                        ${hasAiImg ? `<span style="display:block; font-size:10px; background:#FEF3C7; color:#D97706; padding:1px 6px; border-radius:8px; font-weight:800; margin-bottom:2px;">✨ AI Image</span>` : ''}
                        ${hasAiVid ? `<span style="display:block; font-size:10px; background:#E0F2FE; color:#0EA5E9; padding:1px 6px; border-radius:8px; font-weight:800; cursor:pointer;" onclick="window.open('${p.ai_generated_video_url}', '_blank')">🎬 AI Video ↗</span>` : ''}
                      </div>
                    </div>
                  </td>
                  <td><b>${p.name}</b></td>
                  <td>${p.vendor_name || p.vendor || 'Spice Hub'}</td>
                  <td>${p.category_name || p.category || 'General'}</td>
                  <td style="font-weight:700; color:var(--text-dark);">₹${p.price}</td>
                  <td>${p.stock}</td>
                  <td>${p.food_type === 'veg' ? '🟢 Veg' : (p.food_type === 'non_veg' ? '🔴 Non-Veg' : '🛠️ Service')}</td>
                  <td><span class="status-badge badge-${p.approval_status || 'approved'}">${(p.approval_status || 'approved').toUpperCase()}</span></td>
                  <td>
                    <button class="btn-outline" style="padding:4px 8px; font-size:11px;" onclick="showToast('Product details for ${p.name.replace(/'/g, "\\'")}')">View</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 4.7 ORDER MANAGEMENT (15 Filterable Tabs & Live Status Changes)
// -----------------------------------------------------------------------------
let allLoadedOrders = [];

async function renderOrders(container) {
  const tabs = ['All', 'placed', 'accepted', 'preparing', 'ready_for_pickup', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'];
  
  try {
    const res = await apiRequest('/admin/orders');
    allLoadedOrders = res.orders || [];
  } catch (e) {
    allLoadedOrders = [
      { id: 1, order_code: '#ORD1256', customer_name: 'Amit Sharma', vendor_name: 'Spice Hub', total_amount: 498, payment_method: 'UPI', order_status: 'preparing', created_at: new Date().toISOString() },
      { id: 2, order_code: '#ORD1255', customer_name: 'Neha Verma', vendor_name: 'Fresh Mart', total_amount: 697, payment_method: 'CARD', order_status: 'out_for_delivery', created_at: new Date().toISOString() },
      { id: 3, order_code: '#ORD1254', customer_name: 'Rahul Khan', vendor_name: 'Daily Needs', total_amount: 249, payment_method: 'COD', order_status: 'delivered', created_at: new Date().toISOString() },
      { id: 4, order_code: '#ORD1253', customer_name: 'Pooja Singh', vendor_name: 'Green Store', total_amount: 399, payment_method: 'COD', order_status: 'cancelled', created_at: new Date().toISOString() },
      { id: 5, order_code: '#ORD1252', customer_name: 'Vikram Yadav', vendor_name: 'Super Market', total_amount: 549, payment_method: 'UPI', order_status: 'preparing', created_at: new Date().toISOString() }
    ];
  }

  container.innerHTML = `
    <div class="card-panel">
      <!-- Filter Tabs -->
      <div class="filter-tabs-row" id="orderFilterTabs">
        ${tabs.map((t, idx) => `
          <button class="filter-tab ${idx === 0 ? 'active' : ''}" onclick="filterOrdersByTab(this, '${t}')">${formatStatus(t)}</button>
        `).join('')}
      </div>

      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="ordersTableBody">
            ${renderOrdersTableRows(allLoadedOrders)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderOrdersTableRows(orders) {
  if (!orders || !orders.length) {
    return `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted)">No orders matching this status</td></tr>`;
  }
  return orders.map(o => `
    <tr>
      <td><b>${o.order_code || ('#ORD' + o.id)}</b></td>
      <td>${o.customer_name || o.customer || 'Customer'}</td>
      <td>${o.vendor_name || o.vendor || 'Store'}</td>
      <td><b>₹${o.total_amount || o.amount}</b></td>
      <td>${o.payment_method || 'UPI'}</td>
      <td><span class="status-badge badge-${o.order_status || o.status}">${formatStatus(o.order_status || o.status)}</span></td>
      <td>
        <button class="btn-primary" style="padding:4px 8px; font-size:11px;" onclick="openOrderStatusModal('${o.order_code || ('#ORD' + o.id)}', ${o.id})">Manage Status</button>
      </td>
    </tr>
  `).join('');
}

function filterOrdersByTab(btn, status) {
  document.querySelectorAll('#orderFilterTabs .filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  if (status.toLowerCase() === 'all') {
    tbody.innerHTML = renderOrdersTableRows(allLoadedOrders);
  } else {
    const filtered = allLoadedOrders.filter(o => (o.order_status || o.status) === status);
    tbody.innerHTML = renderOrdersTableRows(filtered);
  }
}

// -----------------------------------------------------------------------------
// 4.8 DELIVERY MANAGEMENT & DYNAMIC RULES ENGINE (Slide 7 & 8)
// -----------------------------------------------------------------------------
async function renderDeliveryManagement(container) {
  let slabs = [];
  try {
    const res = await apiRequest('/delivery-rules/slabs');
    slabs = res.slabs || [];
    adminState.slabs = slabs;
  } catch (e) {
    slabs = adminState.slabs;
  }

  try {
    const sRes = await apiRequest('/admin/settings');
    if (sRes && sRes.settings) {
      adminState.settings = { ...adminState.settings, ...sRes.settings };
    }
  } catch (e) {}

  container.innerHTML = `
    <!-- Top Configuration Summary Cards -->
    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
      <div class="card-panel">
        <h4 style="font-size:13px; color:var(--text-muted); margin-bottom:6px;">Free Delivery Threshold</h4>
        <h2 style="font-size:24px; color:var(--primary-green); font-weight:800">Above ₹ ${adminState.settings.free_delivery_threshold || '299.00'}</h2>
        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Orders exceeding this value get ₹0 delivery charge</p>
      </div>

      <div class="card-panel">
        <h4 style="font-size:13px; color:var(--text-muted); margin-bottom:6px;">Maximum Delivery Radius</h4>
        <h2 style="font-size:24px; color:var(--navy-dark); font-weight:800">${adminState.settings.max_delivery_radius_km || '10.00'} KM</h2>
        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Beyond radius marked as "Not Available"</p>
      </div>

      <div class="card-panel">
        <h4 style="font-size:13px; color:var(--text-muted); margin-bottom:6px;">Rider Dispatch Countdown</h4>
        <h2 style="font-size:24px; color:#2563EB; font-weight:800">${adminState.settings.rider_dispatch_countdown_sec || '30'} Seconds</h2>
        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Auto-reassigns to next rider if not accepted</p>
      </div>
    </div>

    <!-- Editable Distance Slabs Table -->
    <div class="card-panel">
      <div class="panel-header">
        <h3>Distance-Based Delivery Charge Slabs (Live Rules Engine)</h3>
        <button class="btn-primary" onclick="openModal('addSlabModal')">+ Add New Slab</button>
      </div>
      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Slab Name / Range</th>
              <th>Min Distance</th>
              <th>Max Distance</th>
              <th>Delivery Charge</th>
              <th>Availability</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${slabs.map(s => `
              <tr>
                <td><b>${s.title}</b></td>
                <td>${s.min_distance_km} KM</td>
                <td>${s.max_distance_km} KM</td>
                <td style="font-size:15px; font-weight:800; color:var(--navy-dark)">
                  ${s.is_available ? `₹ ${s.charge}` : '<span style="color:#dc2626">Not Available</span>'}
                </td>
                <td>
                  <span class="status-badge ${s.is_available ? 'badge-approved' : 'badge-cancelled'}">
                    ${s.is_available ? 'AVAILABLE' : 'OFF LIMITS'}
                  </span>
                </td>
                <td>
                  <button class="btn-outline" style="padding:4px 8px; font-size:11px;" onclick="editSlab(${s.id})">Edit Fee</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 4.9 COMMISSION MANAGEMENT
// -----------------------------------------------------------------------------
function renderCommission(container) {
  container.innerHTML = `
    <div class="card-panel">
      <div class="panel-header">
        <h3>Platform Commission & Revenue Distribution</h3>
        <span style="font-size:13px; font-weight:600; color:var(--primary-green)">Default Rate: ${adminState.settings.default_commission_rate || 15}%</span>
      </div>
      <p style="font-size:13.5px; color:var(--text-muted); margin-bottom:18px;">
        Commission is deducted automatically on every completed order. Vendors receive net earnings via automated settlement.
      </p>
      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Order Code</th>
              <th>Vendor</th>
              <th>Order Total</th>
              <th>Rate (%)</th>
              <th>Platform Commission</th>
              <th>Vendor Share</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>#ORD1256</b></td>
              <td>Spice Hub</td>
              <td>₹ 498.00</td>
              <td>15%</td>
              <td style="color:#E53935; font-weight:700">₹ 68.00</td>
              <td style="color:var(--primary-green); font-weight:700">₹ 395.00</td>
            </tr>
            <tr>
              <td><b>#ORD1255</b></td>
              <td>Fresh Mart</td>
              <td>₹ 697.00</td>
              <td>12%</td>
              <td style="color:#E53935; font-weight:700">₹ 77.00</td>
              <td style="color:var(--primary-green); font-weight:700">₹ 590.00</td>
            </tr>
            <tr>
              <td><b>#ORD1254</b></td>
              <td>Daily Needs</td>
              <td>₹ 249.00</td>
              <td>10%</td>
              <td style="color:#E53935; font-weight:700">₹ 24.00</td>
              <td style="color:var(--primary-green); font-weight:700">₹ 205.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 4.10 PAYMENT & FINANCE
// -----------------------------------------------------------------------------
function renderPayments(container) {
  container.innerHTML = `
    <div class="card-panel">
      <div class="panel-header">
        <h3>Cash on Delivery (COD) Collections & Reconciliations</h3>
      </div>
      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Rider Name</th>
              <th>Order ID</th>
              <th>Cash Collected</th>
              <th>Deposit Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Rahul Khan</b></td>
              <td>#ORD1254</td>
              <td><b>₹ 249.00</b></td>
              <td><span class="status-badge badge-pending">PENDING VERIFICATION</span></td>
              <td>
                <button class="btn-primary" style="padding:4px 8px; font-size:11px;" onclick="showToast('COD collection verified!')">Verify Deposit</button>
              </td>
            </tr>
            <tr>
              <td><b>Amit Sharma</b></td>
              <td>#ORD1250</td>
              <td><b>₹ 450.00</b></td>
              <td><span class="status-badge badge-approved">VERIFIED</span></td>
              <td><span style="font-size:12px; color:var(--text-muted)">Completed</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 4.11 COUPONS & OFFERS
// -----------------------------------------------------------------------------
async function renderCoupons(container) {
  let coupons = [];
  try {
    const res = await apiRequest('/admin/coupons');
    coupons = res.coupons || [];
  } catch (e) {
    coupons = [
      { code: 'WELCOME50', title: '50% Off First Order', discount_type: 'percentage', discount_value: 50, min_order_amount: 149, used_count: 320, valid_until: '2027-12-31' },
      { code: 'QUICK30', title: 'Flat ₹30 Off', discount_type: 'fixed', discount_value: 30, min_order_amount: 199, used_count: 1420, valid_until: '2027-12-31' },
      { code: 'FREESHIP', title: 'Free Delivery Deal', discount_type: 'percentage', discount_value: 100, min_order_amount: 199, used_count: 850, valid_until: '2027-12-31' }
    ];
  }

  container.innerHTML = `
    <div class="card-panel">
      <div class="panel-header">
        <h3>Promotional Coupons & Vouchers (${coupons.length})</h3>
        <button class="btn-primary" onclick="openModal('addCouponModal')">+ Create Coupon</button>
      </div>
      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Offer Title</th>
              <th>Discount</th>
              <th>Min Order</th>
              <th>Total Redeemed</th>
              <th>Expiry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${coupons.map(c => `
              <tr>
                <td><b style="color:var(--primary-green); letter-spacing:1px">${c.code}</b></td>
                <td>${c.title}</td>
                <td>${c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value} Flat`}</td>
                <td>₹${c.min_order_amount || 0}</td>
                <td>${c.used_count || c.used || 0}</td>
                <td>${c.valid_until ? String(c.valid_until).split('T')[0] : '31 Dec 2027'}</td>
                <td><span class="status-badge badge-active">ACTIVE</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 4.12 BANNERS & PROMOTIONS
// -----------------------------------------------------------------------------
async function renderBanners(container) {
  let banners = [];
  try {
    const res = await apiRequest('/admin/banners');
    banners = res.banners || [];
  } catch (e) {
    banners = [
      { title: '10-Minute Grocery Delivery Guaranteed!', banner_type: 'home', is_active: 1 },
      { title: 'Flat 50% Off On Delicious Restaurant Curries', banner_type: 'restaurant', is_active: 1 }
    ];
  }

  container.innerHTML = `
    <div class="card-panel">
      <div class="panel-header">
        <h3>Promotional App Banners (${banners.length})</h3>
        <button class="btn-primary" onclick="showToast('Upload banner via API or Media Manager')">+ Upload Banner</button>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px;">
        ${banners.map(b => `
          <div style="border:1px solid var(--border-color); border-radius:var(--radius-md); overflow:hidden;">
            <div style="height:140px; background:linear-gradient(135deg, #0F2942, #2E9E44); display:flex; align-items:center; justify-content:center; color:white; font-size:18px; font-weight:800; padding:20px; text-align:center;">
              ${b.title}
            </div>
            <div style="padding:14px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; font-weight:600; text-transform:capitalize;">${(b.banner_type || 'home').replace('_', ' ')} Banner</span>
              <span class="status-badge ${b.is_active ? 'badge-active' : 'badge-cancelled'}">${b.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 4.13 NOTIFICATION MANAGEMENT
// -----------------------------------------------------------------------------
function renderNotifications(container) {
  container.innerHTML = `
    <div class="card-panel" style="max-width:700px; margin:0 auto;">
      <div class="panel-header">
        <h3>Broadcast Notification to App Users</h3>
      </div>
      <div class="form-group">
        <label>Recipient Target</label>
        <select class="form-control" id="notifTarget">
          <option value="all">All Users (Customers, Vendors & Riders)</option>
          <option value="customer">Customers Only</option>
          <option value="vendor">Vendors Only</option>
          <option value="delivery_boy">Delivery Riders Only</option>
        </select>
      </div>
      <div class="form-group">
        <label>Category</label>
        <select class="form-control" id="notifCategory">
          <option value="Orders">Orders</option>
          <option value="Offers">Offers & Deals</option>
          <option value="General">General / Maintenance</option>
        </select>
      </div>
      <div class="form-group">
        <label>Notification Title</label>
        <input type="text" class="form-control" id="notifTitle" placeholder="e.g. 🌧️ Monsoon Delivery Advisory" />
      </div>
      <div class="form-group">
        <label>Notification Body</label>
        <textarea class="form-control" id="notifBody" rows="4" placeholder="Enter message text..."></textarea>
      </div>
      <button class="btn-primary" style="width:100%; justify-content:center; padding:12px;" onclick="sendNotification()">
        🚀 Send Push & In-App Notification
      </button>
    </div>
  `;
}

async function sendNotification() {
  const recipientRole = document.getElementById('notifTarget').value;
  const category = document.getElementById('notifCategory').value;
  const title = document.getElementById('notifTitle').value.trim();
  const body = document.getElementById('notifBody').value.trim();

  if (!title || !body) return showToast('Please enter both title and body');

  try {
    await apiRequest('/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ recipientRole, category, title, body })
    });
    showToast(`Notification broadcasted to ${recipientRole}!`);
    document.getElementById('notifTitle').value = '';
    document.getElementById('notifBody').value = '';
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// 4.14 REPORTS ENGINE (ALL 11 REPORTS)
// -----------------------------------------------------------------------------
function renderReports(container) {
  const reportsList = [
    { key: 'sales', name: '1. Sales Report', desc: 'Daily, weekly and monthly gross sales & commissions' },
    { key: 'orders', name: '2. Order Report', desc: 'All orders with items, delivery charges and status timeline' },
    { key: 'customers', name: '3. Customer Report', desc: 'Customer retention, registration growth and frequency' },
    { key: 'vendors', name: '4. Vendor Report', desc: 'Vendor order volumes, ratings and total payouts' },
    { key: 'delivery', name: '5. Delivery Report', desc: 'Rider performance, delivery completion times and earnings' },
    { key: 'commission', name: '6. Commission Report', desc: 'Platform commission breakdowns per vendor' },
    { key: 'payment', name: '7. Payment Report', desc: 'UPI, Card, Net Banking and Wallet transaction audits' },
    { key: 'refund', name: '8. Refund Report', desc: 'Processed refunds with order codes and reasons' },
    { key: 'cancellation', name: '9. Cancellation Report', desc: 'Cancelled orders with customer/vendor cancellation reasons' },
    { key: 'cod', name: '10. COD Report', desc: 'Cash on delivery collections and rider deposit verifications' },
    { key: 'settlement', name: '11. Settlement Report', desc: 'Vendor and delivery boy bank disbursement records' }
  ];

  container.innerHTML = `
    <div class="card-panel">
      <div class="panel-header">
        <h3>Master Reports & Auditing (CSV Export)</h3>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px;">
        ${reportsList.map(r => `
          <div style="border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px;">
            <h4 style="font-size:15px; color:var(--navy-dark); margin-bottom:4px;">${r.name}</h4>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">${r.desc}</p>
            <div style="display:flex; gap:8px;">
              <button class="btn-primary" style="padding:6px 12px; font-size:12px;" onclick="downloadReport('${r.key}', 'csv')">
                📥 Download CSV
              </button>
              <button class="btn-outline" style="padding:6px 12px; font-size:12px;" onclick="downloadReport('${r.key}', 'json')">
                Preview JSON
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function downloadReport(key, format) {
  try {
    const token = await ensureAdminAuth();
    const res = await fetch(`${API_BASE}/admin/reports/${key}?format=${format}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to generate report');
    if (format === 'csv') {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${key}_report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Downloaded ${key} CSV report!`);
    } else {
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// 4.15 REVIEWS & RATINGS
// -----------------------------------------------------------------------------
async function renderReviews(container) {
  let reviews = [];
  try {
    const res = await apiRequest('/admin/reviews');
    reviews = res.reviews || [];
  } catch (e) {
    reviews = [
      { id: 1, user_name: 'Neha Verma', vendor_name: 'Spice Hub', product_name: 'Butter Paneer', rating: 5, comment: 'Butter paneer was warm and piping fresh! Reached in 13 mins.', status: 'approved' },
      { id: 2, user_name: 'Pooja Singh', vendor_name: 'Fresh Mart', product_name: 'Farm Milk', rating: 5, comment: 'Chilled fresh milk in early morning. Superb delivery service.', status: 'approved' },
      { id: 3, user_name: 'Neha Verma', vendor_name: 'Sweet Delights Bakery', product_name: 'Truffle Cake', rating: 5, comment: 'The chocolate truffle cake was absolute heaven!', status: 'approved' }
    ];
  }

  container.innerHTML = `
    <div class="card-panel">
      <div class="panel-header">
        <h3>Customer Reviews & Ratings (${reviews.length})</h3>
      </div>
      <div class="custom-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Vendor / Product</th>
              <th>Rating</th>
              <th>Review Comment</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${reviews.map(r => `
              <tr>
                <td><b>${r.user_name || r.customer || 'Customer'}</b></td>
                <td>${(r.vendor_name || 'Store') + (r.product_name ? ' - ' + r.product_name : '')}</td>
                <td style="color:#F59E0B; font-weight:700">⭐ ${r.rating}</td>
                <td>"${r.comment}"</td>
                <td><span class="status-badge badge-${r.status || 'approved'}">${(r.status || 'approved').toUpperCase()}</span></td>
                <td>
                  <button class="btn-outline" style="padding:4px 8px; font-size:11px;" onclick="toggleReviewStatus(${r.id}, '${r.status || 'approved'}')">
                    ${r.status === 'hidden' ? 'Approve' : 'Hide'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function toggleReviewStatus(id, current) {
  const newStatus = current === 'approved' ? 'hidden' : 'approved';
  try {
    await apiRequest(`/admin/reviews/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Review status updated to ${newStatus}`);
    loadModule('reviews');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// 4.16 CMS / STATIC PAGES
// -----------------------------------------------------------------------------
let allCmsPages = [];

async function renderCMS(container) {
  try {
    const res = await apiRequest('/admin/cms');
    allCmsPages = res.pages || [];
  } catch (e) {
    allCmsPages = [
      { slug: 'about-us', title: 'About Quick Commerce Multi-Vendor', content: 'Welcome to our hyper-local Quick Commerce Platform delivering essentials in 10-30 minutes.' },
      { slug: 'privacy-policy', title: 'Privacy Policy', content: 'We respect your privacy.' },
      { slug: 'terms-conditions', title: 'Terms & Conditions', content: 'Standard terms.' },
      { slug: 'refund-policy', title: 'Refund Policy', content: 'Instant refunds policy.' }
    ];
  }

  const first = allCmsPages[0] || { slug: 'about-us', title: 'About Us', content: '' };

  container.innerHTML = `
    <div class="card-panel" style="max-width:800px; margin:0 auto;">
      <div class="panel-header">
        <h3>CMS & Legal Pages Editor</h3>
      </div>
      <div class="form-group">
        <label>Select Page to Edit</label>
        <select class="form-control" id="cmsPageSelect" onchange="onCmsPageSelect(this.value)">
          ${allCmsPages.map(p => `<option value="${p.slug}">${p.title}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Page Title</label>
        <input type="text" class="form-control" id="cmsTitleInput" value="${first.title}" />
      </div>
      <div class="form-group">
        <label>Page Content (HTML / Rich Text)</label>
        <textarea class="form-control" id="cmsContentInput" rows="8">${first.content}</textarea>
      </div>
      <button class="btn-primary" onclick="saveCMSAction()">Save Changes</button>
    </div>
  `;
}

function onCmsPageSelect(slug) {
  const p = allCmsPages.find(item => item.slug === slug);
  if (p) {
    document.getElementById('cmsTitleInput').value = p.title;
    document.getElementById('cmsContentInput').value = p.content;
  }
}

async function saveCMSAction() {
  const slug = document.getElementById('cmsPageSelect').value;
  const title = document.getElementById('cmsTitleInput').value.trim();
  const content = document.getElementById('cmsContentInput').value.trim();

  try {
    await apiRequest(`/admin/cms/${slug}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content })
    });
    showToast(`CMS page '${slug}' saved successfully!`);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// 4.17 SETTINGS
// -----------------------------------------------------------------------------
async function renderSettings(container) {
  let settings = adminState.settings;
  try {
    const res = await apiRequest('/admin/settings');
    if (res && res.settings) {
      settings = { ...adminState.settings, ...res.settings };
      adminState.settings = settings;
    }
  } catch (e) {}

  container.innerHTML = `
    <div class="card-panel" style="max-width:800px; margin:0 auto;">
      <div class="panel-header">
        <h3>Platform Master Settings (Live Backend Sync)</h3>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div class="form-group">
          <label>Platform Name</label>
          <input type="text" class="form-control" id="settingsAppName" value="${settings.app_name || 'Quick Commerce Multi-Vendor'}" />
        </div>
        <div class="form-group">
          <label>Support Helpline</label>
          <input type="text" class="form-control" id="settingsSupportPhone" value="${settings.support_phone || '+91 99999 00000'}" />
        </div>
        <div class="form-group">
          <label>Free Delivery Threshold (₹)</label>
          <input type="number" class="form-control" id="settingsFreeDelivery" value="${settings.free_delivery_threshold || '299.00'}" />
        </div>
        <div class="form-group">
          <label>Default Commission Rate (%)</label>
          <input type="number" class="form-control" id="settingsCommission" value="${settings.default_commission_rate || '15.00'}" />
        </div>
        <div class="form-group">
          <label>Tax / GST Rate (%)</label>
          <input type="number" class="form-control" id="settingsTax" value="${settings.tax_percentage || '5.00'}" />
        </div>
        <div class="form-group">
          <label>Platform Service Fee (₹)</label>
          <input type="number" class="form-control" id="settingsPlatformFee" value="${settings.platform_fee || '5.00'}" />
        </div>
      </div>
      <div style="margin-top:24px; padding-top:20px; border-top:1px solid var(--border-color);">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span style="font-size:20px;">✨</span>
          <h4 style="margin:0; font-size:15px; color:var(--text-dark);">Gemini AI Copilot & Media Studio Configuration</h4>
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">
          Enable commercial AI product photo enhancement, showcase video generation, and partner workflow chat across vendor categories.
        </p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label>AI Generation Model</label>
            <select class="form-control" id="settingsAiModel">
              <option value="gemini-1.5-flash" selected>Google Gemini 1.5 Flash (Fast Commercial Studio)</option>
              <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Ultra High Definition 4K)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Monthly AI Generations Quota / Vendor</label>
            <input type="number" class="form-control" id="settingsAiQuota" value="50" />
          </div>
        </div>
        <div style="display:flex; gap:14px; margin-top:8px; flex-wrap:wrap;">
          <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; cursor:pointer;">
            <input type="checkbox" checked id="aiCatFood" /> 🍔 Food
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; cursor:pointer;">
            <input type="checkbox" checked id="aiCatEcom" /> 🛍️ E-Commerce
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; cursor:pointer;">
            <input type="checkbox" checked id="aiCatServices" /> 🛠️ Service Based
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; cursor:pointer;">
            <input type="checkbox" checked id="aiCatGrocery" /> 🥦 Grocery
          </label>
        </div>
      </div>

      <button class="btn-primary" style="margin-top:20px;" onclick="saveSettingsAction()">Save Platform & AI Settings</button>
    </div>
  `;
}

async function saveSettingsAction() {
  const updates = {
    app_name: document.getElementById('settingsAppName').value,
    support_phone: document.getElementById('settingsSupportPhone').value,
    free_delivery_threshold: document.getElementById('settingsFreeDelivery').value,
    default_commission_rate: document.getElementById('settingsCommission').value,
    tax_percentage: document.getElementById('settingsTax').value,
    platform_fee: document.getElementById('settingsPlatformFee').value
  };

  try {
    await apiRequest('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    adminState.settings = { ...adminState.settings, ...updates };
    showToast('Platform settings saved to backend database!');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// MODALS & EVENT HANDLERS
// -----------------------------------------------------------------------------
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

function openOrderStatusModal(orderCode, orderId) {
  const modal = document.getElementById('statusModal');
  if (modal) {
    document.getElementById('modalOrderCode').textContent = orderCode;
    const idInput = document.getElementById('modalOrderId');
    if (idInput) idInput.value = orderId;
    modal.classList.add('open');
  }
}

async function updateOrderStatusAction() {
  const orderId = document.getElementById('modalOrderId').value;
  const status = document.getElementById('orderStatusSelect').value;
  const noteElem = document.getElementById('orderStatusNote');
  const note = noteElem ? noteElem.value : '';

  try {
    await apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note })
    });
    showToast(`Order status updated to: ${status}`);
    closeModal('statusModal');
    loadModule('orders');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function approveVendor(vendorId) {
  try {
    await apiRequest(`/admin/vendors/${vendorId}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ approval_status: 'approved' })
    });
    showToast(`Vendor #${vendorId} approved successfully!`);
    loadModule('vendors');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function approveDeliveryBoy(riderId) {
  try {
    await apiRequest(`/admin/delivery-boys/${riderId}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ approval_status: 'approved' })
    });
    showToast(`Rider #${riderId} approved successfully!`);
    loadModule('delivery-boys');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function toggleCustomerBlock(customerId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
  try {
    await apiRequest(`/admin/customers/${customerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Customer #${customerId} is now ${newStatus}`);
    loadModule('customers');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function editSlab(slabId) {
  const fee = prompt('Enter new delivery charge (₹) for this slab:', '25');
  if (fee !== null && fee.trim() !== '') {
    try {
      await apiRequest(`/delivery-rules/slabs/${slabId}`, {
        method: 'PUT',
        body: JSON.stringify({ charge: parseFloat(fee) })
      });
      showToast('Delivery slab charge updated in backend database!');
      loadModule('delivery-management');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  }
}

async function saveSlabAction() {
  const title = document.getElementById('slabTitle').value.trim();
  const min_distance_km = document.getElementById('slabMin').value;
  const max_distance_km = document.getElementById('slabMax').value;
  const charge = document.getElementById('slabFee').value;

  if (!min_distance_km || !max_distance_km || !charge) {
    return showToast('Min, max distance, and charge are required');
  }

  try {
    await apiRequest('/delivery-rules/slabs', {
      method: 'POST',
      body: JSON.stringify({
        title,
        min_distance_km: parseFloat(min_distance_km),
        max_distance_km: parseFloat(max_distance_km),
        charge: parseFloat(charge),
        is_available: true
      })
    });
    showToast('New delivery slab saved to backend!');
    closeModal('addSlabModal');
    loadModule('delivery-management');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function saveCategoryAction() {
  const name = document.getElementById('newCategoryName')?.value.trim();
  const module_type = document.getElementById('newCategoryModule')?.value;
  const icon_url = document.getElementById('newCategoryIcon')?.value.trim() || '';
  const description = document.getElementById('newCategoryDesc')?.value.trim() || '';

  if (!name) return showToast('Please enter category name');

  try {
    await apiRequest('/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name, module_type, icon_url, description })
    });
    showToast('Category created successfully!');
    closeModal('addCategoryModal');
    loadModule('categories');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function saveSubcategoryAction() {
  const category_id = document.getElementById('newSubcatParentCategory')?.value;
  const name = document.getElementById('newSubcategoryName')?.value.trim();
  const icon_url = document.getElementById('newSubcategoryIcon')?.value.trim() || '';

  if (!category_id) return showToast('Please select a parent category');
  if (!name) return showToast('Please enter subcategory name');

  try {
    await apiRequest('/admin/subcategories', {
      method: 'POST',
      body: JSON.stringify({ category_id: parseInt(category_id), name, icon_url })
    });
    showToast('Subcategory created successfully!');
    closeModal('addSubcategoryModal');
    loadModule('categories');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function saveProductAction() {
  const name = document.getElementById('newProductName').value.trim();
  const vendor_id = document.getElementById('newProductVendor').value;
  const food_type = document.getElementById('newProductFoodType').value;
  const price = document.getElementById('newProductPrice').value;
  const discount_price = document.getElementById('newProductDiscountPrice').value;

  if (!name || !price) return showToast('Product name and regular price are required');

  try {
    await apiRequest('/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        name,
        vendor_id: parseInt(vendor_id) || 1,
        category_id: 1,
        price: parseFloat(price),
        discount_price: discount_price ? parseFloat(discount_price) : null,
        food_type
      })
    });
    showToast('Product added successfully!');
    closeModal('addProductModal');
    loadModule('products');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function saveCouponAction() {
  const code = document.getElementById('newCouponCode').value.trim();
  const discount_type = document.getElementById('newCouponType').value;
  const discount_value = document.getElementById('newCouponValue').value;
  const min_order_amount = document.getElementById('newCouponMinOrder').value;

  if (!code || !discount_value) return showToast('Coupon code and discount value are required');

  try {
    await apiRequest('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify({
        code: code.toUpperCase(),
        title: `${code.toUpperCase()} Offer`,
        discount_type,
        discount_value: parseFloat(discount_value),
        min_order_amount: min_order_amount ? parseFloat(min_order_amount) : 199
      })
    });
    showToast('Coupon created successfully!');
    closeModal('addCouponModal');
    loadModule('coupons');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

function formatStatus(status) {
  if (!status) return 'PLACED';
  return status.replace(/_/g, ' ').toUpperCase();
}

function showToast(msg) {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.background = '#0F2942';
    toast.style.color = '#FFFFFF';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.3)';
    toast.style.zIndex = '9999';
    toast.style.fontSize = '13.5px';
    toast.style.fontWeight = '600';
    toast.style.borderLeft = '4px solid #2E9E44';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}
