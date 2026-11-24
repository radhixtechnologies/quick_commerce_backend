const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let isConnected = false;

// Comprehensive Seed Store for Super App (Customer, Vendor & Delivery ecosystems)
const memoryStore = {
  users: [
    {
      id: 1,
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      phone: '+919876543210',
      role: 'customer',
      status: 'active',
      password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW'
    },
    {
      id: 2,
      name: 'Super Administrator',
      email: 'admin@superapp.com',
      phone: '+919999900001',
      role: 'admin',
      status: 'active',
      password_hash: '$2b$10$wU05Uls02P8Q9aL7Qc4LKeFqT41M0e7kUo52/zS09GzXqQhD2s2qW'
    }
  ],

  vendors: [
    {
      id: 1,
      user_id: 101,
      business_name: 'Spice Symphony Gourmet Kitchen',
      owner_name: 'Vikram Seth',
      email: 'contact@spicesymphony.com',
      phone: '+919811223344',
      vendor_category: 'food',
      description: 'North Indian delicacies, Biryanis, and chef specials delivered steaming hot.',
      rating: 4.8,
      total_reviews: 420,
      is_open: 1,
      approval_status: 'approved',
      city: 'Delhi NCR',
      address: 'Sector 62, Noida, UP',
      kyc_doc_type: 'FSSAI License',
      kyc_doc_url: '/uploads/sample-fssai.png',
      is_otp_verified: 1,
      created_at: new Date('2026-01-10')
    },
    {
      id: 2,
      user_id: 102,
      business_name: 'SpeedyMart Quick Grocery',
      owner_name: 'Priya Verma',
      email: 'support@speedymart.com',
      phone: '+919822334455',
      vendor_category: 'grocery',
      description: '10-minute fresh groceries, organic dairy, farm produce and daily essentials.',
      rating: 4.9,
      total_reviews: 860,
      is_open: 1,
      approval_status: 'approved',
      city: 'Delhi NCR',
      address: 'Indirapuram, Ghaziabad, UP',
      kyc_doc_type: 'Trade License',
      kyc_doc_url: '/uploads/sample-trade.png',
      is_otp_verified: 1,
      created_at: new Date('2026-01-12')
    },
    {
      id: 3,
      user_id: 103,
      business_name: 'UrbanPro Expert Home Services',
      owner_name: 'Amitabh Sen',
      email: 'service@urbanpro.com',
      phone: '+919833445566',
      vendor_category: 'services',
      description: 'Certified technicians for AC repair, deep home cleaning, electrical & plumbing.',
      rating: 4.9,
      total_reviews: 640,
      is_open: 1,
      approval_status: 'approved',
      city: 'Delhi NCR',
      address: 'Cyber Hub, Gurugram, HR',
      kyc_doc_type: 'Skill Certification',
      kyc_doc_url: '/uploads/sample-skill.png',
      is_otp_verified: 1,
      created_at: new Date('2026-01-15')
    },
    {
      id: 4,
      user_id: 104,
      business_name: 'SuperFleet Rides & Cabs',
      owner_name: 'Rajesh Yadav',
      email: 'partner@superfleet.com',
      phone: '+919844556677',
      vendor_category: 'rides',
      description: 'Fast doorstep bike, auto and premium cab pickups with zero surge pricing.',
      rating: 4.7,
      total_reviews: 1250,
      is_open: 1,
      approval_status: 'approved',
      city: 'Delhi NCR',
      address: 'Connaught Place, New Delhi',
      kyc_doc_type: 'Commercial RC',
      kyc_doc_url: '/uploads/sample-rc.png',
      is_otp_verified: 1,
      created_at: new Date('2026-01-18')
    },
    {
      id: 5,
      user_id: 105,
      business_name: 'TrendVault Lifestyle & Electronics',
      owner_name: 'Kavita Menon',
      email: 'sales@trendvault.com',
      phone: '+919855667788',
      vendor_category: 'ecommerce',
      description: 'Smart gadgets, Bluetooth audio, phone accessories and trendy lifestyle wear.',
      rating: 4.6,
      total_reviews: 310,
      is_open: 1,
      approval_status: 'approved',
      city: 'Delhi NCR',
      address: 'Okhla Phase III, New Delhi',
      kyc_doc_type: 'GSTIN Certificate',
      kyc_doc_url: '/uploads/sample-gst.png',
      is_otp_verified: 1,
      created_at: new Date('2026-01-20')
    },
    {
      id: 6,
      user_id: 106,
      business_name: 'Apothecary 24x7 Meds & Pharmacy',
      owner_name: 'Dr. Suresh Reddy',
      email: 'orders@apothecary24.com',
      phone: '+919866778899',
      vendor_category: 'medicine',
      description: 'Licensed retail pharmacy with fast prescription verification & genuine medicines.',
      rating: 4.9,
      total_reviews: 780,
      is_open: 1,
      approval_status: 'approved',
      city: 'Delhi NCR',
      address: 'South Extension, New Delhi',
      kyc_doc_type: 'Drug License',
      kyc_doc_url: '/uploads/sample-drug.png',
      is_otp_verified: 1,
      created_at: new Date('2026-01-22')
    }
  ],

  delivery_boys: [
    {
      id: 1,
      user_id: 201,
      full_name: 'Ajay Kumar',
      phone: '+919877001122',
      email: 'ajay.rider@superapp.com',
      vehicle_type: 'bike',
      vehicle_number: 'DL-01-AB-1234',
      is_online: 1,
      approval_status: 'approved',
      current_latitude: 28.628,
      current_longitude: 77.365,
      rating: 4.95,
      total_deliveries: 1420,
      wallet_balance: 3850.00
    },
    {
      id: 2,
      user_id: 202,
      full_name: 'Mohit Rawat',
      phone: '+919877003344',
      email: 'mohit.rider@superapp.com',
      vehicle_type: 'ev',
      vehicle_number: 'UP-16-EV-9876',
      is_online: 1,
      approval_status: 'approved',
      current_latitude: 28.535,
      current_longitude: 77.391,
      rating: 4.88,
      total_deliveries: 950,
      wallet_balance: 2420.00
    }
  ],

  categories: [
    { id: 1, name: 'Food & Dining', slug: 'food-delivery', module_type: 'food', icon_url: '🍲', description: 'Gourmet restaurant meals, fresh combos, and beverages' },
    { id: 2, name: 'Fresh Groceries', slug: 'grocery', module_type: 'grocery', icon_url: '🛒', description: 'Farm-fresh fruits, veggies, milk, bread & daily pantry essentials' },
    { id: 3, name: 'Home Services', slug: 'home-services', module_type: 'services', icon_url: '🧹', description: 'AC repair, deep home cleaning, electrician, salon & spa' },
    { id: 4, name: 'Rides & Cabs', slug: 'rides', module_type: 'rides', icon_url: '🚗', description: 'Bikes, auto-rickshaws, and comfortable AC cab bookings' },
    { id: 5, name: 'E-commerce Shopping', slug: 'ecommerce', module_type: 'ecommerce', icon_url: '🛍️', description: 'Fashion, gadgets, accessories, personal care & home decor' },
    { id: 6, name: 'Medicine & Health', slug: 'medicine', module_type: 'medicine', icon_url: '💊', description: 'Prescription medicines, wellness supplements & first aid' }
  ],

  services: [
    {
      id: 'food',
      name: 'Food Delivery',
      slug: 'food',
      description: 'Order from 2,500+ curated restaurants, cloud kitchens & cafes.',
      deliveryModes: ['Quick Delivery (20-35 mins)', 'Scheduled Meal Slots'],
      popularItems: ['Biryani Bowls', 'Wood-fired Pizza', 'Healthy Salads', 'Cold Pressed Juices'],
      stats: '15,000+ daily orders'
    },
    {
      id: 'grocery',
      name: 'Quick Commerce Grocery',
      slug: 'grocery',
      description: 'Over 8,000 pantry items delivered in 10-15 minutes guaranteed.',
      deliveryModes: ['Instant 10-15 min dispatch', 'Morning / Evening Slots'],
      popularItems: ['Organic Veggies', 'A2 Milk', 'Chakki Atta', 'Snacks & Ice Creams'],
      stats: '45,000+ daily items'
    },
    {
      id: 'services',
      name: 'Home Services & Repairs',
      slug: 'services',
      description: 'Background-verified professionals for salon, cleaning, plumbing & AC fixes.',
      deliveryModes: ['Instant (under 60 mins)', 'Custom Date & Slot'],
      popularItems: ['AC Jet Wash', 'Deep Bathroom Cleaning', 'Women Salon at Home', 'Water Leakage Repair'],
      stats: '98.6% customer rating'
    },
    {
      id: 'rides',
      name: 'Quick Rides & Cabs',
      slug: 'rides',
      description: 'Doorstep bike taxi, auto, and sanitized cabs with transparent pricing.',
      deliveryModes: ['Instant Booking (3 mins)', 'Scheduled Airport / Outstation'],
      popularItems: ['Quick Bike Taxi', 'Auto Ride', 'City Hatchback', 'Sedan / SUV'],
      stats: '500+ active drivers'
    },
    {
      id: 'ecommerce',
      name: 'E-commerce Shopping',
      slug: 'ecommerce',
      description: 'Top local & national brands in fashion, electronics, and lifestyle items.',
      deliveryModes: ['Same-Day Super Fast', 'Standard 24-hr Shipping'],
      popularItems: ['Wireless Earbuds', 'Smartwatches', 'Casual Sneakers', 'Kitchen Utensils'],
      stats: '12,000+ products'
    },
    {
      id: 'medicine',
      name: 'Pharmacy & Medicine',
      slug: 'medicine',
      description: 'Upload doctor prescription or order OTC healthcare products safely.',
      deliveryModes: ['Express 30-min Rx', 'Scheduled Monthly Refill'],
      popularItems: ['Pain Relief & Fever', 'Diabetes Care', 'Baby Care & Diapers', 'Daily Vitamins & Zinc'],
      stats: '100% genuine meds'
    }
  ],

  orders: [
    {
      id: 1001,
      order_code: 'ORD-98214',
      customer_id: 1,
      customer_name: 'Rahul Sharma',
      customer_phone: '+919876543210',
      vendor_id: 2,
      vendor_name: 'SpeedyMart Quick Grocery',
      service_type: 'grocery',
      delivery_type: 'quick',
      scheduled_at: null,
      status: 'out_for_delivery',
      items: [
        { name: 'Organic Milk 1L', quantity: 2, price: 68 },
        { name: 'Brown Bread', quantity: 1, price: 45 },
        { name: 'Farm Eggs (Pack of 6)', quantity: 1, price: 55 }
      ],
      total_amount: 236.00,
      delivery_otp: '4892',
      pickup_photo: '/uploads/sample-pickup.jpg',
      delivery_photo: null,
      delivery_boy: {
        id: 1,
        name: 'Ajay Kumar',
        phone: '+919877001122',
        vehicle_type: 'bike'
      },
      timeline: [
        { status: 'placed', time: '14:20' },
        { status: 'accepted', time: '14:22' },
        { status: 'picked_up', time: '14:28', photo: '/uploads/sample-pickup.jpg' },
        { status: 'out_for_delivery', time: '14:30' }
      ],
      created_at: new Date()
    }
  ],

  contacts: [],
  otps: []
};

// Initialize DB or fallback
async function initDB() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'superapp_commerce_db',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const conn = await pool.getConnection();
    isConnected = true;
    console.log('✅ Connected to MySQL Database successfully.');
    conn.release();
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️ MySQL not reachable (${err.message}). Using resilient active in-memory store.`);
  }
}

async function query(sql, params = []) {
  if (isConnected && pool) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }
  // If MySQL is not running, callers operate against memoryStore
  return null;
}

module.exports = {
  initDB,
  isConnected: () => isConnected,
  query,
  memoryStore
};
