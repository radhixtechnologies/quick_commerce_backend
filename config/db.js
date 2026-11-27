const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let isConnected = false;

// In-memory clean dataset: Admin accounts kept for portal login; all business data is dynamic
const memoryStore = {
  users: [
    { id: 1, name: 'Super Administrator', email: 'superadmin@quickcommerce.com', phone: '+919999900001', role: 'super_admin', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' },
    { id: 2, name: 'Operations Admin', email: 'admin@quickcommerce.com', phone: '+919999900002', role: 'admin', status: 'active', password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW' }
  ],
  vendors: [],
  otps: [],
  delivery_boys: [],
  categories: [
    // 1. FOOD CATEGORIES
    { id: 1, name: 'North Indian & Meals', slug: 'north-indian-meals', module_type: 'food', is_active: 1, sort_order: 1, icon_url: '🍲', description: 'Curries, biryanis, gravies and thalis' },
    { id: 2, name: 'Fast Food, Burgers & Pizza', slug: 'fast-food-pizza', module_type: 'food', is_active: 1, sort_order: 2, icon_url: '🍔', description: 'Burgers, cheesy pizzas, wraps and fries' },
    { id: 3, name: 'Bakery, Cakes & Desserts', slug: 'bakery-cakes-desserts', module_type: 'food', is_active: 1, sort_order: 3, icon_url: '🎂', description: 'Fresh birthday cakes, pastries and brownies' },

    // 2. E-COMMERCE CATEGORIES
    { id: 4, name: 'Fashion & Apparel', slug: 'fashion-apparel', module_type: 'ecommerce', is_active: 1, sort_order: 4, icon_url: '👕', description: "Men's, women's, footwear and clothing accessories" },
    { id: 5, name: 'Electronics & Mobile Gadgets', slug: 'electronics-gadgets', module_type: 'ecommerce', is_active: 1, sort_order: 5, icon_url: '📱', description: 'Smartwatches, headphones, chargers and powerbanks' },
    { id: 6, name: 'Home & Kitchen Essentials', slug: 'home-kitchen', module_type: 'ecommerce', is_active: 1, sort_order: 6, icon_url: '🍳', description: 'Cookware, storage, home decor and bedding' },
    { id: 7, name: 'Beauty & Personal Care', slug: 'beauty-personal-care', module_type: 'ecommerce', is_active: 1, sort_order: 7, icon_url: '💄', description: 'Skincare, perfumes, hair styling and grooming' },

    // 3. SERVICE BASED (URBAN CLAP STYLE)
    { id: 8, name: 'Home Cleaning & Pest Control', slug: 'home-cleaning-pest-control', module_type: 'services', is_active: 1, sort_order: 8, icon_url: '🧹', description: 'Full home deep cleaning, kitchen, bathroom & pest control' },
    { id: 9, name: 'Electrician, Plumber & Carpenter', slug: 'electrician-plumber-carpenter', module_type: 'services', is_active: 1, sort_order: 9, icon_url: '🔧', description: 'Doorstep wiring repairs, plumbing fixes and woodwork' },
    { id: 10, name: 'AC & Appliance Repair', slug: 'ac-appliance-repair', module_type: 'services', is_active: 1, sort_order: 10, icon_url: '❄️', description: 'AC servicing, gas refill, washing machine and RO service' },
    { id: 11, name: 'Salon & Spa for Men & Women', slug: 'salon-spa-grooming', module_type: 'services', is_active: 1, sort_order: 11, icon_url: '💇', description: 'Haircut, facial, waxing, cleanup and body massage' },

    // 4. GROCERY CATEGORIES
    { id: 12, name: 'Fruits & Vegetables', slug: 'fruits-vegetables', module_type: 'grocery', is_active: 1, sort_order: 12, icon_url: '🥦', description: 'Farm fresh green veggies and organic juicy fruits' },
    { id: 13, name: 'Dairy, Bread & Eggs', slug: 'dairy-bread-eggs', module_type: 'grocery', is_active: 1, sort_order: 13, icon_url: '🥛', description: 'Farm milk, butter, paneer, brown bread and eggs' },
    { id: 14, name: 'Atta, Rice, Oil & Dals', slug: 'atta-rice-oil-dals', module_type: 'grocery', is_active: 1, sort_order: 14, icon_url: '🌾', description: 'Chakki fresh atta, aged basmati, pulses and cooking oils' },
    { id: 15, name: 'Snacks & Beverages', slug: 'snacks-beverages', module_type: 'grocery', is_active: 1, sort_order: 15, icon_url: '🥤', description: 'Chips, namkeen, cold drinks, juices and cookies' }
  ],
  subcategories: [
    // Subcategories for Food
    { id: 1, category_id: 1, name: 'Main Course Curries & Dal', slug: 'main-course-curries', is_active: 1, sort_order: 1 },
    { id: 2, category_id: 1, name: 'Biryani, Pulao & Rice', slug: 'biryani-pulao-rice', is_active: 1, sort_order: 2 },
    { id: 3, category_id: 1, name: 'Tandoori Kebabs & Starters', slug: 'tandoori-kebabs', is_active: 1, sort_order: 3 },
    { id: 4, category_id: 2, name: 'Crispy Burgers & Wraps', slug: 'crispy-burgers-wraps', is_active: 1, sort_order: 1 },
    { id: 5, category_id: 2, name: 'Cheesy Gourmet Pizzas', slug: 'cheesy-pizzas', is_active: 1, sort_order: 2 },
    { id: 6, category_id: 2, name: 'Fries & Sides', slug: 'fries-sides', is_active: 1, sort_order: 3 },
    { id: 7, category_id: 3, name: 'Birthday & Custom Cakes', slug: 'birthday-cakes', is_active: 1, sort_order: 1 },
    { id: 8, category_id: 3, name: 'Pastries & Cheesecakes', slug: 'pastries-cheesecakes', is_active: 1, sort_order: 2 },

    // Subcategories for E-commerce
    { id: 9, category_id: 4, name: "Men's Casual & Formal Wear", slug: 'mens-wear', is_active: 1, sort_order: 1 },
    { id: 10, category_id: 4, name: "Women's Ethnic & Western", slug: 'womens-wear', is_active: 1, sort_order: 2 },
    { id: 11, category_id: 4, name: 'Footwear & Sneakers', slug: 'footwear-sneakers', is_active: 1, sort_order: 3 },
    { id: 12, category_id: 5, name: 'Smartwatches & Fitness Trackers', slug: 'smartwatches', is_active: 1, sort_order: 1 },
    { id: 13, category_id: 5, name: 'Wireless Earbuds & Headphones', slug: 'earbuds-headphones', is_active: 1, sort_order: 2 },
    { id: 14, category_id: 5, name: 'Fast Chargers & Cables', slug: 'chargers-cables', is_active: 1, sort_order: 3 },
    { id: 15, category_id: 6, name: 'Cookware & Kitchen Utensils', slug: 'cookware-kitchen', is_active: 1, sort_order: 1 },
    { id: 16, category_id: 6, name: 'Home Decor & Lighting', slug: 'home-decor-lighting', is_active: 1, sort_order: 2 },
    { id: 17, category_id: 7, name: 'Skincare & Sunscreen', slug: 'skincare-sunscreen', is_active: 1, sort_order: 1 },
    { id: 18, category_id: 7, name: 'Hair Care & Fragrances', slug: 'haircare-fragrances', is_active: 1, sort_order: 2 },

    // Subcategories for Services (Urban Clap Style)
    { id: 19, category_id: 8, name: 'Full Home Deep Cleaning', slug: 'full-home-deep-cleaning', is_active: 1, sort_order: 1 },
    { id: 20, category_id: 8, name: 'Kitchen & Bathroom Cleaning', slug: 'kitchen-bathroom-cleaning', is_active: 1, sort_order: 2 },
    { id: 21, category_id: 8, name: 'Pest & Termite Control Treatment', slug: 'pest-control', is_active: 1, sort_order: 3 },
    { id: 22, category_id: 9, name: 'Electrician & Wiring Repair', slug: 'electrician-services', is_active: 1, sort_order: 1 },
    { id: 23, category_id: 9, name: 'Plumbing & Water Leakage Fixes', slug: 'plumbing-services', is_active: 1, sort_order: 2 },
    { id: 24, category_id: 9, name: 'Carpenter & Furniture Assembly', slug: 'carpenter-services', is_active: 1, sort_order: 3 },
    { id: 25, category_id: 10, name: 'AC Foam Jet Service & Gas Charging', slug: 'ac-service-repair', is_active: 1, sort_order: 1 },
    { id: 26, category_id: 10, name: 'Washing Machine & RO Purifier Repair', slug: 'washing-machine-ro-repair', is_active: 1, sort_order: 2 },
    { id: 27, category_id: 11, name: "Men's Grooming, Haircut & Beard", slug: 'mens-salon-grooming', is_active: 1, sort_order: 1 },
    { id: 28, category_id: 11, name: "Women's Salon, Waxing & Facial", slug: 'womens-salon-facial', is_active: 1, sort_order: 2 },
    { id: 29, category_id: 11, name: 'Therapeutic Body Massage & Spa', slug: 'body-massage-spa', is_active: 1, sort_order: 3 },

    // Subcategories for Grocery
    { id: 30, category_id: 12, name: 'Fresh Farm Vegetables', slug: 'fresh-vegetables', is_active: 1, sort_order: 1 },
    { id: 31, category_id: 12, name: 'Fresh Organic Fruits', slug: 'fresh-fruits', is_active: 1, sort_order: 2 },
    { id: 32, category_id: 13, name: 'Pasteurized Full Cream Milk', slug: 'milk-cream', is_active: 1, sort_order: 1 },
    { id: 33, category_id: 13, name: 'Fresh Paneer, Butter & Cheese', slug: 'paneer-butter-cheese', is_active: 1, sort_order: 2 },
    { id: 34, category_id: 14, name: 'Chakki Fresh Atta & Grains', slug: 'atta-flours', is_active: 1, sort_order: 1 },
    { id: 35, category_id: 14, name: 'Basmati Rice & Cooking Oils', slug: 'rice-oils', is_active: 1, sort_order: 2 },
    { id: 36, category_id: 15, name: 'Chips, Namkeen & Savouries', slug: 'chips-namkeen', is_active: 1, sort_order: 1 },
    { id: 37, category_id: 15, name: 'Juices, Sodas & Energy Drinks', slug: 'cold-drinks-juices', is_active: 1, sort_order: 2 }
  ],
  products: [],
  ai_settings: {
    enabled_categories: ['food', 'ecommerce', 'service_based', 'grocery'],
    monthly_quota_per_vendor: 50,
    model: 'gemini-1.5-flash',
    features: {
      image_enhancement: true,
      promo_video: true,
      partner_support_chat: true
    }
  },
  delivery_charge_slabs: [
    { id: 1, min_distance_km: 0.0, max_distance_km: 3.0, charge: 20.0, is_available: 1, title: '0 - 3 KM (Ultra-fast)', sort_order: 1 },
    { id: 2, min_distance_km: 3.01, max_distance_km: 5.0, charge: 30.0, is_available: 1, title: '3 - 5 KM (Local Hub)', sort_order: 2 },
    { id: 3, min_distance_km: 5.01, max_distance_km: 7.0, charge: 40.0, is_available: 1, title: '5 - 7 KM (City Reach)', sort_order: 3 },
    { id: 4, min_distance_km: 7.01, max_distance_km: 10.0, charge: 50.0, is_available: 1, title: '7 - 10 KM (Extended Area)', sort_order: 4 },
    { id: 5, min_distance_km: 10.01, max_distance_km: 99.0, charge: 0.0, is_available: 0, title: '10 KM+ (Not Available)', sort_order: 5 }
  ],
  orders: [],
  coupons: [
    { id: 1, code: 'WELCOME50', title: 'Flat 50% Off First Order', discount_type: 'percentage', discount_value: 50.0, min_order_amount: 149.0, max_discount_amount: 100.0, usage_limit_total: 5000, used_count: 0, is_active: 1, valid_until: '2027-12-31' },
    { id: 2, code: 'QUICK30', title: 'Flat ₹30 Instant Cashback', discount_type: 'fixed', discount_value: 30.0, min_order_amount: 199.0, max_discount_amount: 30.0, usage_limit_total: 10000, used_count: 0, is_active: 1, valid_until: '2027-12-31' },
    { id: 3, code: 'FREESHIP', title: 'Free Delivery Above ₹199', discount_type: 'percentage', discount_value: 100.0, min_order_amount: 199.0, max_discount_amount: 50.0, usage_limit_total: 2000, used_count: 0, is_active: 1, valid_until: '2027-12-31' }
  ],
  banners: [
    { id: 1, title: '10-Minute Grocery Delivery Guaranteed!', banner_type: 'home', image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', is_active: 1, sort_order: 1 }
  ],
  notifications: [],
  settings: {
    app_name: 'Quick Commerce Multi-Vendor',
    free_delivery_threshold: '299.00',
    default_delivery_charge: '25.00',
    max_delivery_radius_km: '10.00',
    rider_dispatch_countdown_sec: '30',
    auto_assign_delivery_boy: 'true',
    default_commission_rate: '15.00',
    platform_fee: '5.00',
    tax_percentage: '5.00',
    cod_enabled: 'true',
    online_payment_enabled: 'true'
  }
};

let reconnectTimer = null;

async function initDB() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'quick_commerce_db',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0
    });

    const conn = await pool.getConnection();
    isConnected = true;
    console.log('✅ Connected to MySQL Database [quick_commerce_db] successfully.');
    conn.release();
    await ensureLongTextImageColumns();

    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️ MySQL Connection note: ${err.message}`);
    console.log('ℹ️ Running in resilient Dual-Mode: Using active high-speed memory store initialized with slide-exact quick commerce data.');
    console.log('ℹ️ Server will auto-connect to MySQL as soon as MySQL service is started.');

    if (!reconnectTimer) {
      reconnectTimer = setInterval(async () => {
        try {
          if (!isConnected && pool) {
            const conn = await pool.getConnection();
            isConnected = true;
            console.log('✅ MySQL Database [quick_commerce_db] is now online & connected!');
            conn.release();
            clearInterval(reconnectTimer);
            reconnectTimer = null;
          }
        } catch (e) {
          // Still waiting for MySQL to start
        }
      }, 5000);
    }
  }
}

// Ensure image/media URL columns can store persistent data URLs (base64) without truncation
async function ensureLongTextImageColumns() {
  if (!pool) return;
  const alters = [
    'ALTER TABLE vendors MODIFY COLUMN logo_url LONGTEXT DEFAULT NULL, MODIFY COLUMN cover_image_url LONGTEXT DEFAULT NULL',
    'ALTER TABLE products MODIFY COLUMN image_url LONGTEXT DEFAULT NULL, MODIFY COLUMN raw_image_url LONGTEXT DEFAULT NULL, MODIFY COLUMN ai_generated_image_url LONGTEXT DEFAULT NULL',
    'ALTER TABLE categories MODIFY COLUMN image_url LONGTEXT DEFAULT NULL',
    'ALTER TABLE banners MODIFY COLUMN image_url LONGTEXT NOT NULL'
  ];
  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (_) {
      // Ignore if column already altered or table absent
    }
  }
}

// Unified query wrapper
async function query(sql, params = []) {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('MySQL query error, checking fallback:', err.message);
      throw err;
    }
  }

  // Graceful Mock Query simulation for instant zero-dependency testing
  return mockQuery(sql, params);
}

function mockQuery(sql, params) {
  const s = sql.trim().toLowerCase();

  if (s.startsWith('select')) {
    if (s.includes('from users')) return memoryStore.users;
    if (s.includes('from vendors')) return memoryStore.vendors;
    if (s.includes('from delivery_boys')) return memoryStore.delivery_boys;
    if (s.includes('from categories')) return memoryStore.categories;
    if (s.includes('from subcategories')) return memoryStore.subcategories || [];
    if (s.includes('from products')) return memoryStore.products;
    if (s.includes('from delivery_charge_slabs')) return memoryStore.delivery_charge_slabs;
    if (s.includes('from orders')) return memoryStore.orders;
    if (s.includes('from coupons')) return memoryStore.coupons;
    if (s.includes('from banners')) return memoryStore.banners;
    if (s.includes('from notifications')) return memoryStore.notifications;
    if (s.includes('from otps')) return memoryStore.otps || [];
    return [];
  }

  return { insertId: Date.now(), affectedRows: 1 };
}

initDB();

module.exports = {
  pool,
  query,
  isConnected: () => isConnected,
  memoryStore
};
